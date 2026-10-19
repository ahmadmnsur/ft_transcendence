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
// skip, pads it to exactly that many bytes.
export function makePng(options: { width?: number; height?: number; size?: number } = {}): Buffer {
  const width = options.width ?? 4;
  const height = options.height ?? 4;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  // 8-bit RGBA; compression, filter and interlace methods 0.
  header[8] = 8;
  header[9] = 6;
  const pixels = deflateSync(Buffer.alloc((width * 4 + 1) * height));
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
