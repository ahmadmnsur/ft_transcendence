import { crc32, deflateSync } from 'node:zlib';
import { encode as encodeJpeg } from 'jpeg-js';
import { PDFDocument } from 'pdf-lib';
import request from 'supertest';
import { AppConfig } from '../../src/core/app-config';


const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

export function makePng(
  options: { width?: number; height?: number; size?: number; depth?: number } = {},
): Buffer {
  const width = options.width ?? 4;
  const height = options.height ?? 4;
  const depth = options.depth ?? 8;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
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

export function makePngWithSecondHeader(width: number, height: number): Buffer {
  const second = makePng({ width, height });
  return Buffer.concat([makePng().subarray(0, 33), second.subarray(8)]);
}

export function makePngWithBadCrc(): Buffer {
  const png = makePng({ size: 256 });
  png[png.length - 13] ^= 0xff;
  return png;
}

export function makePngWithFullEnd(): Buffer {
  const png = makePng();
  return Buffer.concat([png.subarray(0, png.length - 12), pngChunk('IEND', Buffer.from([0]))]);
}

export function makeJpegWithoutScan(): Buffer {
  const image = makeJpeg();
  const scan = image.indexOf(Buffer.from([0xff, 0xda]));
  return Buffer.concat([image.subarray(0, scan), Buffer.from([0xff, 0xd9])]);
}

export function makeJpegWithMalformedApp1(): Buffer {
  const image = makeJpegWithoutScan();
  const app0End = 4 + image.readUInt16BE(4);
  const stray = Buffer.from([0x00, 0xe1, 0x00, 0x02]);
  return Buffer.concat([image.subarray(0, app0End), stray, image.subarray(app0End)]);
}

export function makeJpegWithEmptyScan(): Buffer {
  const image = makeJpegWithoutScan();
  const scan = Buffer.from([0xff, 0xda, 0x00, 0x06, 0x00, 0x00, 0x3f, 0x00]);
  return Buffer.concat([image.subarray(0, image.length - 2), scan, Buffer.from([0xff, 0xd9])]);
}

export function makePalettePng(depth: number, entries: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = depth;
  header[9] = 3;
  const pixels = deflateSync(Buffer.alloc(2));
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('PLTE', Buffer.alloc(3 * entries)),
    pngChunk('IDAT', pixels),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

export function makePngWithoutChecksum(): Buffer {
  const pixels = deflateSync(Buffer.alloc((4 * 4 + 1) * 4));
  const start = makePng().subarray(0, 33);
  const cut = pngChunk('IDAT', pixels.subarray(0, pixels.length - 4));
  return Buffer.concat([start, cut, pngChunk('IEND', Buffer.alloc(0))]);
}

export function makePngWithBadImageData(): Buffer {
  const start = makePng().subarray(0, 33);
  return Buffer.concat([start, pngChunk('IDAT', Buffer.alloc(16, 0x41)), pngChunk('IEND', Buffer.alloc(0))]);
}

export function makePdf(): Buffer {
  return Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n', 'latin1');
}

export async function makeValidPdf(options: { size?: number; pages?: number } = {}): Promise<Buffer> {
  const build = async (padding: number): Promise<Buffer> => {
    const doc = await PDFDocument.create();
    for (let page = 0; page < (options.pages ?? 1); page += 1) doc.addPage([200, 200]);
    if (padding > 0) doc.context.register(doc.context.stream(new Uint8Array(padding)));
    return Buffer.from(await doc.save({ useObjectStreams: false, addDefaultPage: false }));
  };
  let pdf = await build(0);
  if (options.size === undefined) return pdf;
  let padding = options.size - pdf.length;
  for (let tries = 0; tries < 5 && pdf.length !== options.size; tries += 1) {
    pdf = await build(padding);
    padding += options.size - pdf.length;
  }
  if (pdf.length !== options.size) throw new Error('makeValidPdf: this size cannot be padded to.');
  return pdf;
}

export type UploadOptions = {
  filename?: string;
  contentType?: string;
  origin?: string | null;
  csrf?: string | null;
};

function putFile(
  baseUrl: string,
  path: string,
  cookie: string,
  bytes: Buffer,
  options: UploadOptions,
  defaults: { filename: string; contentType: string },
) {
  let upload = request(baseUrl).put(path).set('Cookie', cookie);
  const origin = options.origin === undefined ? new AppConfig().publicOrigin : options.origin;
  if (origin !== null) upload = upload.set('Origin', origin);
  const csrf = options.csrf === undefined ? '1' : options.csrf;
  if (csrf !== null) upload = upload.set('X-PeerConnect-CSRF', csrf);
  return upload.attach('file', bytes, {
    filename: options.filename ?? defaults.filename,
    contentType: options.contentType ?? defaults.contentType,
  });
}

export function putAvatar(baseUrl: string, cookie: string, bytes: Buffer, options: UploadOptions = {}) {
  return putFile(baseUrl, '/api/me/avatar', cookie, bytes, options, {
    filename: 'avatar.png',
    contentType: 'image/png',
  });
}

export function putStudentAvatar(
  baseUrl: string,
  cookie: string,
  studentId: string,
  bytes: Buffer,
  options: UploadOptions = {},
) {
  return putFile(baseUrl, `/api/admin/students/${studentId}/avatar`, cookie, bytes, options, {
    filename: 'avatar.png',
    contentType: 'image/png',
  });
}

export function putEvidence(
  baseUrl: string,
  cookie: string,
  reviewId: string,
  bytes: Buffer,
  options: UploadOptions = {},
) {
  return putFile(baseUrl, `/api/reviews/${reviewId}/evidence`, cookie, bytes, options, {
    filename: 'evidence.pdf',
    contentType: 'application/pdf',
  });
}

export function tokenOf(avatarUrl: string): string {
  const token = avatarUrl.split('/').pop();
  if (token === undefined || token === '') throw new Error('tokenOf: no token in the URL.');
  return token;
}

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
