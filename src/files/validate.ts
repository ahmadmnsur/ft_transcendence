import { decode as decodeJpeg } from 'jpeg-js';
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

const PNG_MAX_SIDE = 4096;
const JPEG_MAX_MEGAPIXELS = 17;

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

// Step 4 for a PNG: `IHDR` first, each side 1–4096, then a full pngjs read,
// which checks every chunk's CRC and requires `IEND`.
function checkPng(bytes: Buffer): void {
  // The signature (8), IHDR's length (4) and type (4), then width and height.
  if (bytes.length < 24 || bytes.toString('latin1', 12, 16) !== 'IHDR') throw fileInvalid();
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width === 0 || height === 0 || width > PNG_MAX_SIDE || height > PNG_MAX_SIDE) {
    throw fileInvalid();
  }
  try {
    PNG.sync.read(bytes);
  } catch {
    throw fileInvalid();
  }
}

// Step 4 for a JPEG: it ends with `FF D9`, then a full jpeg-js decode capped
// at 17 megapixels.
function checkJpeg(bytes: Buffer): void {
  if (bytes.length < 4 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) {
    throw fileInvalid();
  }
  try {
    decodeJpeg(bytes, { maxResolutionInMP: JPEG_MAX_MEGAPIXELS, useTArray: true });
  } catch {
    throw fileInvalid();
  }
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
