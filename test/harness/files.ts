import { crc32, deflateSync } from 'node:zlib';
import { encode as encodeJpeg } from 'jpeg-js';
import request from 'supertest';
import { AppConfig } from '../../src/core/app-config';

// What the file checks share (§16.3 rows 4 and 8): test files built in code,
// so no binary fixture is committed, and the upload as the SPA sends it.

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

// A valid RGBA PNG. With `size`, a private ancillary chunk, which readers
// skip, pads it to exactly that many bytes. With `depth`, `IHDR` gives that
// bit depth, and the pixel data fits it; RGBA allows only 8 and 16.
export function makePng(
  options: { width?: number; height?: number; size?: number; depth?: number } = {},
): Buffer {
  const width = options.width ?? 4;
  const height = options.height ?? 4;
  const depth = options.depth ?? 8;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  // RGBA; compression, filter and interlace methods 0.
  header[8] = depth;
  header[9] = 6;
  const pixels = deflateSync(Buffer.alloc((Math.ceil((width * 4 * depth) / 8) + 1) * height));
  const head = Buffer.concat([PNG_SIGNATURE, pngChunk('IHDR', header), pngChunk('IDAT', pixels)]);
  const end = pngChunk('IEND', Buffer.alloc(0));
  if (options.size === undefined) return Buffer.concat([head, end]);
  const fill = options.size - head.length - end.length - 12;
  if (fill < 0) throw new Error('makePng: the size is below a bare PNG.');
  return Buffer.concat([head, pngChunk('prVt', Buffer.alloc(fill, 0x2a)), end]);
}

// A valid 8 × 8 baseline JPEG. With `size`, comment segments after the start
// marker, which decoders skip, pad it to exactly that many bytes.
export function makeJpeg(size?: number): Buffer {
  const image = encodeJpeg({ data: Buffer.alloc(8 * 8 * 4, 0x80), width: 8, height: 8 }, 80).data;
  if (size === undefined) return image;
  const parts = [image.subarray(0, 2)];
  let total = image.length;
  while (total < size) {
    const room = Math.min(65533, size - total - 4);
    if (room < 0) throw new Error('makeJpeg: this size cannot be padded to.');
    const segment = Buffer.alloc(4 + room, 0x20);
    segment[0] = 0xff;
    segment[1] = 0xfe;
    segment.writeUInt16BE(room + 2, 2);
    parts.push(segment);
    total += segment.length;
  }
  parts.push(image.subarray(2));
  return Buffer.concat(parts);
}

// A valid PNG with a second `IHDR` giving other sides, and pixel data for
// those: pngjs alone would decode it at the second one's size.
export function makePngWithSecondHeader(width: number, height: number): Buffer {
  const second = makePng({ width, height });
  // The signature (8) and the first `IHDR` (25), then the second PNG from
  // its `IHDR` on.
  return Buffer.concat([makePng().subarray(0, 33), second.subarray(8)]);
}

// A valid PNG whose private ancillary chunk has a wrong CRC, which pngjs
// alone skips unchecked.
export function makePngWithBadCrc(): Buffer {
  const png = makePng({ size: 256 });
  // The padding chunk's CRC ends just before `IEND`, the last 12 bytes.
  png[png.length - 13] ^= 0xff;
  return png;
}

// A valid PNG whose `IEND` holds one byte, with its CRC correct; `IEND`
// must be empty.
export function makePngWithFullEnd(): Buffer {
  const png = makePng();
  // `IEND` is the last 12 bytes.
  return Buffer.concat([png.subarray(0, png.length - 12), pngChunk('IEND', Buffer.from([0]))]);
}

// A valid JPEG cut before its first scan (`FF DA`) and ended with `FF D9`,
// which jpeg-js alone decodes as a blank image.
export function makeJpegWithoutScan(): Buffer {
  const image = makeJpeg();
  const scan = image.indexOf(Buffer.from([0xff, 0xda]));
  return Buffer.concat([image.subarray(0, scan), Buffer.from([0xff, 0xd9])]);
}

// A JPEG with no scan whose APP0 is followed by `00 E1 00 02`, which jpeg-js
// takes for a phone's malformed APP1 and steps over.
export function makeJpegWithMalformedApp1(): Buffer {
  const image = makeJpegWithoutScan();
  // `FF D8`, then APP0: its marker (2) and its length, which counts itself.
  const app0End = 4 + image.readUInt16BE(4);
  const stray = Buffer.from([0x00, 0xe1, 0x00, 0x02]);
  return Buffer.concat([image.subarray(0, app0End), stray, image.subarray(app0End)]);
}

// A JPEG whose scan header names no component and is followed by no scan
// data, which jpeg-js decodes as a blank image.
export function makeJpegWithEmptyScan(): Buffer {
  const image = makeJpegWithoutScan();
  // Before `FF D9`: a scan header of length 6, naming 0 components.
  const scan = Buffer.from([0xff, 0xda, 0x00, 0x06, 0x00, 0x00, 0x3f, 0x00]);
  return Buffer.concat([image.subarray(0, image.length - 2), scan, Buffer.from([0xff, 0xd9])]);
}

// A 1 × 1 palette PNG of this bit depth whose `PLTE` has this many entries,
// its one pixel index 0; a palette may have at most 2 ** depth entries.
export function makePalettePng(depth: number, entries: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = depth;
  header[9] = 3;
  // The one row: its filter byte, then the pixel.
  const pixels = deflateSync(Buffer.alloc(2));
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('PLTE', Buffer.alloc(3 * entries)),
    pngChunk('IDAT', pixels),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// A 4 × 4 RGBA PNG whose `IDAT`, its CRC correct, stops before the 4-byte
// checksum that ends its zlib stream.
export function makePngWithoutChecksum(): Buffer {
  const pixels = deflateSync(Buffer.alloc((4 * 4 + 1) * 4));
  // The signature (8) and `IHDR` (25), then that `IDAT` and `IEND`.
  const start = makePng().subarray(0, 33);
  const cut = pngChunk('IDAT', pixels.subarray(0, pixels.length - 4));
  return Buffer.concat([start, cut, pngChunk('IEND', Buffer.alloc(0))]);
}

// A PNG whose `IDAT`, its CRC correct, holds bytes that are no zlib stream,
// so only decoding the image data refuses it.
export function makePngWithBadImageData(): Buffer {
  // The signature (8) and `IHDR` (25), then that `IDAT` and `IEND`.
  const start = makePng().subarray(0, 33);
  return Buffer.concat([start, pngChunk('IDAT', Buffer.alloc(16, 0x41)), pngChunk('IEND', Buffer.alloc(0))]);
}

// A one-page PDF's opening and end, enough for the format check: an Avatar
// that is a PDF is refused before any PDF parsing (§9.5 step 3).
export function makePdf(): Buffer {
  return Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n', 'latin1');
}

export type UploadOptions = {
  filename?: string;
  contentType?: string;
  // `null` leaves the header out.
  origin?: string | null;
  csrf?: string | null;
};

// `PUT /api/me/avatar` as the SPA sends it: the session cookie, Origin,
// `X-PeerConnect-CSRF: 1` and one `file` part (§3.5.2, §5.4).
export function putAvatar(baseUrl: string, cookie: string, bytes: Buffer, options: UploadOptions = {}) {
  let upload = request(baseUrl).put('/api/me/avatar').set('Cookie', cookie);
  const origin = options.origin === undefined ? new AppConfig().publicOrigin : options.origin;
  if (origin !== null) upload = upload.set('Origin', origin);
  const csrf = options.csrf === undefined ? '1' : options.csrf;
  if (csrf !== null) upload = upload.set('X-PeerConnect-CSRF', csrf);
  return upload.attach('file', bytes, {
    filename: options.filename ?? 'avatar.png',
    contentType: options.contentType ?? 'image/png',
  });
}

// The token an `avatarUrl` names (`/api/files/avatars/<token>`).
export function tokenOf(avatarUrl: string): string {
  const token = avatarUrl.split('/').pop();
  if (token === undefined || token === '') throw new Error('tokenOf: no token in the URL.');
  return token;
}

// Waits until `check` stops throwing, for what runs after commit without
// holding the response, such as deleting a replaced file (§3.7).
export async function eventually(check: () => Promise<void>, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      await check();
      return;
    } catch (err) {
      if (Date.now() > deadline) throw err;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}
