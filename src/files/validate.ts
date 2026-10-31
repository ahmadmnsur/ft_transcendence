import { crc32, inflateSync } from 'node:zlib';
import { decode as decodeJpeg } from 'jpeg-js';
import { PNG } from 'pngjs';
import { LIMITS } from '../shared/limits';
import { pdfPageCount } from './pdf-check';
import { fileInvalid, fileTooLarge, fileTypeNotAllowed } from './refusals';


export type UploadedPart = { buffer: Buffer; originalname: string; mimetype: string };

export type ImageType = 'image/png' | 'image/jpeg';

export type ValidatedImage = { bytes: Buffer; mime: ImageType; size: number };

export type EvidenceType = (typeof LIMITS.evidence.mimeTypes)[number];

export type ValidatedEvidence = { bytes: Buffer; mime: EvidenceType; size: number; filename: string };

type Format = 'png' | 'jpeg' | 'pdf';

const FORMATS = {
  png: { type: 'image/png', extensions: ['png'] },
  jpeg: { type: 'image/jpeg', extensions: ['jpg', 'jpeg'] },
  pdf: { type: 'application/pdf', extensions: ['pdf'] },
} as const satisfies Record<Format, { type: string; extensions: readonly string[] }>;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_START = Buffer.from([0xff, 0xd8, 0xff]);
const PDF_START = Buffer.from('%PDF-', 'latin1');

const PDF_END = Buffer.from('%%EOF', 'latin1');
const PDF_END_WINDOW = 1024;

const PNG_MAX_SIDE = 4096;
const JPEG_MAX_MEGAPIXELS = 17;

const PNG_COLOR_TYPES: Partial<Record<number, { channels: number; depths: readonly number[] }>> = {
  0: { channels: 1, depths: [1, 2, 4, 8, 16] },
  2: { channels: 3, depths: [8, 16] },
  3: { channels: 1, depths: [1, 2, 4, 8] },
  4: { channels: 2, depths: [8, 16] },
  6: { channels: 4, depths: [8, 16] },
};

const ADAM7_PASSES: readonly (readonly [number, number, number, number])[] = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
];

const JPEG_SEGMENTS_BEFORE_SCAN: readonly number[] = [0xc0, 0xc1, 0xc2, 0xc4, 0xdb, 0xdd, 0xfe];

function startsWith(bytes: Buffer, prefix: Buffer): boolean {
  return bytes.length >= prefix.length && bytes.subarray(0, prefix.length).equals(prefix);
}

function detectFormat(bytes: Buffer): Format | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return 'png';
  if (startsWith(bytes, JPEG_START)) return 'jpeg';
  if (startsWith(bytes, PDF_START)) return 'pdf';
  return null;
}

type PngHeader = {
  width: number;
  height: number;
  depth: number;
  colorType: number;
  channels: number;
  interlaced: boolean;
};

function checkPngHeader(data: Buffer): PngHeader {
  if (data.length !== 13) throw fileInvalid();
  const width = data.readUInt32BE(0);
  const height = data.readUInt32BE(4);
  if (width === 0 || height === 0 || width > PNG_MAX_SIDE || height > PNG_MAX_SIDE) {
    throw fileInvalid();
  }
  const color = PNG_COLOR_TYPES[data[9]];
  if (color === undefined || !color.depths.includes(data[8])) throw fileInvalid();
  if (data[10] !== 0 || data[11] !== 0 || data[12] > 1) throw fileInvalid();
  return {
    width,
    height,
    depth: data[8],
    colorType: data[9],
    channels: color.channels,
    interlaced: data[12] === 1,
  };
}

function pngDataSize(header: PngHeader): number {
  const rows = (width: number, height: number): number => {
    if (width <= 0 || height <= 0) return 0;
    return (Math.ceil((width * header.channels * header.depth) / 8) + 1) * height;
  };
  if (!header.interlaced) return rows(header.width, header.height);
  return ADAM7_PASSES.reduce(
    (size, [x, y, across, down]) =>
      size + rows(Math.ceil((header.width - x) / across), Math.ceil((header.height - y) / down)),
    0,
  );
}

function checkPng(bytes: Buffer): void {
  let at = PNG_SIGNATURE.length;
  let header: PngHeader | null = null;
  let palette = false;
  let imageData: 'before' | 'in' | 'after' = 'before';
  const compressed: Buffer[] = [];
  let type = '';
  while (type !== 'IEND') {
    if (bytes.length - at < 12) throw fileInvalid();
    const end = at + 12 + bytes.readUInt32BE(at);
    if (end > bytes.length) throw fileInvalid();
    if (crc32(bytes.subarray(at + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) throw fileInvalid();
    type = bytes.toString('latin1', at + 4, at + 8);
    const data = bytes.subarray(at + 8, end - 4);
    if (!/^[A-Za-z]{4}$/.test(type) || (type === 'IHDR') !== (at === PNG_SIGNATURE.length)) {
      throw fileInvalid();
    }
    if (type === 'IHDR') header = checkPngHeader(data);
    if (type === 'PLTE') {
      const entries = data.length / 3;
      const grey = header?.colorType === 0 || header?.colorType === 4;
      const max = header?.colorType === 3 ? 2 ** header.depth : 256;
      if (palette || imageData !== 'before' || grey || !Number.isInteger(entries)) throw fileInvalid();
      if (entries < 1 || entries > max) throw fileInvalid();
      palette = true;
    }
    if (type === 'IDAT') {
      if (imageData === 'after') throw fileInvalid();
      imageData = 'in';
      compressed.push(data);
    } else if (imageData === 'in') {
      imageData = 'after';
    }
    if (type === 'IEND' && (data.length > 0 || imageData === 'before')) throw fileInvalid();
    at = end;
  }
  if (header === null) throw fileInvalid();
  const size = pngDataSize(header);
  let inflated: Buffer;
  try {
    inflated = inflateSync(Buffer.concat(compressed), { maxOutputLength: size });
  } catch {
    throw fileInvalid();
  }
  if (inflated.length !== size) throw fileInvalid();
  try {
    PNG.sync.read(bytes);
  } catch {
    throw fileInvalid();
  }
}

function reachesScan(bytes: Buffer): boolean {
  let at = 2;
  while (at + 3 < bytes.length && bytes[at] === 0xff) {
    const code = bytes[at + 1];
    if (code === 0xda) {
      const components = bytes[at + 4];
      return components >= 1 && components <= 4 && bytes.readUInt16BE(at + 2) === 6 + 2 * components;
    }
    if (code === 0xff) {
      at += 1;
    } else if ((code >= 0xe0 && code <= 0xef) || JPEG_SEGMENTS_BEFORE_SCAN.includes(code)) {
      at += 2 + bytes.readUInt16BE(at + 2);
    } else {
      return false;
    }
  }
  return false;
}

function checkJpeg(bytes: Buffer): void {
  if (bytes.length < 4 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) {
    throw fileInvalid();
  }
  if (!reachesScan(bytes)) throw fileInvalid();
  try {
    decodeJpeg(bytes, { maxResolutionInMP: JPEG_MAX_MEGAPIXELS, useTArray: true });
  } catch {
    throw fileInvalid();
  }
}

async function checkPdf(bytes: Buffer): Promise<void> {
  if (!bytes.subarray(Math.max(0, bytes.length - PDF_END_WINDOW)).includes(PDF_END)) throw fileInvalid();
  if ((await pdfPageCount(bytes)) < 1) throw fileInvalid();
}

function checkClaims(part: UploadedPart, format: Format): void {
  const dot = part.originalname.lastIndexOf('.');
  const extension = dot > 0 ? part.originalname.slice(dot + 1).toLowerCase() : '';
  const extensions: readonly string[] = FORMATS[format].extensions;
  if (extension !== '' && !extensions.includes(extension)) throw fileTypeNotAllowed();
  const type = part.mimetype.split(';')[0].trim().toLowerCase();
  if (type !== '' && type !== 'application/octet-stream' && type !== FORMATS[format].type) {
    throw fileTypeNotAllowed();
  }
}

const IMAGE_CHECKS: Record<'png' | 'jpeg', (bytes: Buffer) => void> = { png: checkPng, jpeg: checkJpeg };

export function validateAvatar(part: UploadedPart): ValidatedImage {
  const bytes = part.buffer;
  if (bytes.length > LIMITS.avatar.maxBytes) throw fileTooLarge();
  if (bytes.length === 0) throw fileInvalid();
  const format = detectFormat(bytes);
  if (format !== 'png' && format !== 'jpeg') throw fileTypeNotAllowed();
  IMAGE_CHECKS[format](bytes);
  checkClaims(part, format);
  return { bytes, mime: FORMATS[format].type, size: bytes.length };
}

const CONTROL_CHARACTERS = /\p{Cc}/gu;

function evidenceFilename(originalName: string, format: Format): string {
  const separator = Math.max(originalName.lastIndexOf('/'), originalName.lastIndexOf('\\'));
  const name = originalName.slice(separator + 1).replace(CONTROL_CHARACTERS, '').trim();
  if (name === '') return `evidence.${FORMATS[format].extensions[0]}`;
  const characters = [...name];
  const max = LIMITS.evidence.filenameMaxChars;
  if (characters.length <= max) return name;
  const dot = characters.lastIndexOf('.');
  const extension = dot > 0 ? characters.slice(dot) : [];
  return [...characters.slice(0, max - extension.length), ...extension].join('');
}

export async function validateEvidence(part: UploadedPart): Promise<ValidatedEvidence> {
  const bytes = part.buffer;
  if (bytes.length > LIMITS.evidence.maxBytes) throw fileTooLarge();
  if (bytes.length === 0) throw fileInvalid();
  const format = detectFormat(bytes);
  if (format === null) throw fileTypeNotAllowed();
  if (format === 'pdf') await checkPdf(bytes);
  else IMAGE_CHECKS[format](bytes);
  checkClaims(part, format);
  return {
    bytes,
    mime: FORMATS[format].type,
    size: bytes.length,
    filename: evidenceFilename(part.originalname, format),
  };
}
