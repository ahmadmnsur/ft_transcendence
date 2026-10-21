import { crc32, inflateSync } from 'node:zlib';
import { decode as decodeJpeg } from 'jpeg-js';
import { PDFDocument } from 'pdf-lib';
import { PNG } from 'pngjs';
import { LIMITS } from '../shared/limits';
import { fileInvalid, fileTooLarge, fileTypeNotAllowed } from './refusals';

// §9.5: the file acceptance contract, a pure function of the bytes and of
// what the client claimed (ADR-0009 d5). Every refusal comes before the
// upload to Storage.

// What Multer hands over for the one `file` part.
export type UploadedPart = { buffer: Buffer; originalname: string; mimetype: string };

export type ImageType = 'image/png' | 'image/jpeg';

// The validated file: its bytes, its canonical type and its length, all from
// the bytes, never from client metadata (step 6).
export type ValidatedImage = { bytes: Buffer; mime: ImageType; size: number };

export type EvidenceType = (typeof LIMITS.evidence.mimeTypes)[number];

// Validated Evidence carries its sanitised name too (step 6).
export type ValidatedEvidence = { bytes: Buffer; mime: EvidenceType; size: number; filename: string };

type Format = 'png' | 'jpeg' | 'pdf';

// Each format's canonical type and the extensions that may name it.
const FORMATS = {
  png: { type: 'image/png', extensions: ['png'] },
  jpeg: { type: 'image/jpeg', extensions: ['jpg', 'jpeg'] },
  pdf: { type: 'application/pdf', extensions: ['pdf'] },
} as const satisfies Record<Format, { type: string; extensions: readonly string[] }>;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_START = Buffer.from([0xff, 0xd8, 0xff]);
const PDF_START = Buffer.from('%PDF-', 'latin1');

const PDF_END = Buffer.from('%%EOF', 'latin1');
// How far from the end a PDF's `%%EOF` may sit.
const PDF_END_WINDOW = 1024;

const PNG_MAX_SIDE = 4096;
const JPEG_MAX_MEGAPIXELS = 17;

// Each PNG color type's channels and the bit depths it allows (the PNG
// spec's `IHDR`): grey, RGB, palette, grey with alpha, RGBA.
const PNG_COLOR_TYPES: Partial<Record<number, { channels: number; depths: readonly number[] }>> = {
  0: { channels: 1, depths: [1, 2, 4, 8, 16] },
  2: { channels: 3, depths: [8, 16] },
  3: { channels: 1, depths: [1, 2, 4, 8] },
  4: { channels: 2, depths: [8, 16] },
  6: { channels: 4, depths: [8, 16] },
};

// Adam7's seven passes over an interlaced PNG: each one's first column and
// first row, then its steps across and down.
const ADAM7_PASSES: readonly (readonly [number, number, number, number])[] = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
];

// The segments jpeg-js reads before a scan besides APP0–APP15, each with a
// two-byte length that counts itself: SOF0–SOF2, DHT, DQT, DRI and COM.
const JPEG_SEGMENTS_BEFORE_SCAN: readonly number[] = [0xc0, 0xc1, 0xc2, 0xc4, 0xdb, 0xdd, 0xfe];

function startsWith(bytes: Buffer, prefix: Buffer): boolean {
  return bytes.length >= prefix.length && bytes.subarray(0, prefix.length).equals(prefix);
}

// Step 3: the format the bytes start with, or null for any other.
function detectFormat(bytes: Buffer): Format | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return 'png';
  if (startsWith(bytes, JPEG_START)) return 'jpeg';
  if (startsWith(bytes, PDF_START)) return 'pdf';
  return null;
}

// What a checked `IHDR` says.
type PngHeader = {
  width: number;
  height: number;
  depth: number;
  colorType: number;
  channels: number;
  interlaced: boolean;
};

// `IHDR`'s data: 13 bytes, the width and the height each 1–4096, a bit
// depth its color type allows, compression and filter methods 0, and
// interlace method 0 or 1.
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

// The bytes a PNG's image data inflates to: each row is a filter byte and
// its packed pixels; an interlaced image has the rows of Adam7's seven
// passes, a pass with no pixel having none.
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

// Step 4 for a PNG. pngjs checks the CRC only of the chunks it reads, reads
// a second `IHDR` over the first and does not check how the critical chunks
// are laid out, so the chunks are walked first, against the PNG spec
// (§9.5's note of 2026-10-19): each one whole, its type four letters, its
// CRC correct; `IHDR` first and only there; at most one `PLTE`, before the
// image data and never for a grey image, of 1–256 entries and no more than
// a palette image's bit depth can index; the `IDAT`s in one run; then an
// empty `IEND`. pngjs's own inflate passes over a zlib error and decodes
// whatever its buffer held, so the image data is inflated here too, capped
// at the size `IHDR` implies, and must be a whole zlib stream of exactly
// that size. Then a full pngjs read, which requires `PLTE` for a palette
// image, checks each row's filter and refuses bytes after `IEND`.
function checkPng(bytes: Buffer): void {
  let at = PNG_SIGNATURE.length;
  let header: PngHeader | null = null;
  let palette = false;
  let imageData: 'before' | 'in' | 'after' = 'before';
  const compressed: Buffer[] = [];
  let type = '';
  while (type !== 'IEND') {
    // A chunk: its data's length (4), its type (4), the data, and a CRC (4)
    // of the type and the data.
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
      // A palette image's bit depth caps its entries.
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
  // Never so: the walk takes `IHDR` first.
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

// Whether a walk of a JPEG's segments, from just after `FF D8`, reaches a
// start of scan (`FF DA`) whose header names 1–4 components; jpeg-js
// decodes a JPEG with no scan, or a scan of no component, as a blank image
// (§9.5's note of 2026-10-19). The walk takes only the segments
// jpeg-js reads before a scan: a marker, `FF` and a code, after any `FF`
// fill bytes, then a two-byte length that counts itself. Anything else
// first, `FF D9`, another marker, a byte that is no marker or the end,
// finds no scan, even where jpeg-js would recover, as from a phone's
// malformed APP1.
function reachesScan(bytes: Buffer): boolean {
  let at = 2;
  while (at + 3 < bytes.length && bytes[at] === 0xff) {
    const code = bytes[at + 1];
    if (code === 0xda) {
      // The scan's header: its length (2), its component count (1), 2 bytes
      // for each of 1–4 components, then 3 more bytes.
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

// Step 4 for a JPEG: it ends with `FF D9` and has a scan, then a full
// jpeg-js decode capped at 17 megapixels.
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

// Step 4 for a PDF: `%%EOF` within its last 1024 bytes, then a full pdf-lib
// load that refuses an invalid object and writes nothing back, with at least
// one page. An encrypted PDF fails the load, which reads no password.
async function checkPdf(bytes: Buffer): Promise<void> {
  if (!bytes.subarray(Math.max(0, bytes.length - PDF_END_WINDOW)).includes(PDF_END)) throw fileInvalid();
  let pages: number;
  try {
    const document = await PDFDocument.load(bytes, { throwOnInvalidObject: true, updateMetadata: false });
    pages = document.getPageCount();
  } catch {
    throw fileInvalid();
  }
  if (pages < 1) throw fileInvalid();
}

// Step 5: a supplied extension and a part type other than
// `application/octet-stream` must both name the detected format; nothing is
// relabelled. A name with no extension claims nothing, as in the SPA's
// FileDrop. Busboy reports a part sent with no Content-Type as `text/plain`,
// which names no format, so such a part is refused too; a browser always
// sends one.
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

// Step 4 for each image format.
const IMAGE_CHECKS: Record<'png' | 'jpeg', (bytes: Buffer) => void> = { png: checkPng, jpeg: checkJpeg };

// The Avatar (§6.3, §9.5): PNG or JPEG, at most 2,097,152 bytes. The size
// comes first, so the service, not the parser, judges a boundary payload:
// exactly the cap is accepted. A PDF is Evidence's format, never an
// Avatar's.
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

// Step 6: the name Evidence keeps. The basename of the name the client sent,
// with its control characters removed and trimmed, at most 255 characters
// (code points, §6.0.3): a longer name loses the end of its stem and keeps
// its extension. Nothing left is `evidence.<ext>`.
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

// Evidence (§9.4, §9.5): PDF, PNG or JPEG, at most 5,242,880 bytes, judged in
// the order an avatar is. Its PNG and JPEG take the avatar's checks.
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
