import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { SupabaseStorageClient } from '../../src/core/supabase-storage';
import { TEST_BUCKETS } from '../../src/files/buckets';
import { useHarness } from '../harness/app';
import { createTestAccount } from '../harness/accounts';
import {
  makeJpeg,
  makeJpegWithoutScan,
  makePdf,
  makePng,
  makePngWithBadCrc,
  makePngWithSecondHeader,
  putAvatar,
  tokenOf,
} from '../harness/files';
import { startNginx, type NginxHarness } from '../harness/nginx';

const harness = useHarness();
let nginx: NginxHarness;

// §16.3 row 8 runs through nginx with the production `api.conf`, so an
// upload crosses the same body limit as in production (§16.2).
beforeAll(async () => {
  nginx = await startNginx(harness.port);
}, 30_000);

afterAll(async () => {
  await nginx?.stop();
});

const CAP = 2_097_152;

function refusal(code: string, message: string): unknown {
  return { ok: false, error: { code, message } };
}

const TOO_LARGE = refusal('file_too_large', 'This file is too large.');
const TYPE_NOT_ALLOWED = refusal('file_type_not_allowed', 'This type of file is not allowed.');
const INVALID = refusal('file_invalid', "This file can't be read.");
const CSRF_REJECTED = refusal('csrf_rejected', 'The request was refused.');

async function avatarRow(studentId: string): Promise<{ token: string; mime: string; size: number } | null> {
  return harness.app.get(PrismaService).avatar.findUnique({
    where: { studentId },
    select: { token: true, mime: true, size: true },
  });
}

// §16.3 row 8: exact byte caps, server-side byte validation, type spoofing,
// Avatar PDFs, a failed replacement left atomic, and the upload CSRF gate.
describe('avatar acceptance through nginx', () => {
  it('stores an Avatar of exactly 2,097,152 bytes, PNG or JPEG', async () => {
    const storage = harness.app.get(SupabaseStorageClient);
    for (const [bytes, filename, contentType] of [
      [makePng({ size: CAP }), 'exact.png', 'image/png'],
      [makeJpeg(CAP), 'exact.jpg', 'image/jpeg'],
    ] as const) {
      const account = await createTestAccount(harness.app);
      expect(bytes.length).toBe(CAP);
      const upload = await putAvatar(nginx.baseUrl, account.cookie, bytes, { filename, contentType });
      expect(upload.status).toBe(200);
      expect(upload.body.ok).toBe(true);
      const token = tokenOf(upload.body.data.avatarUrl);
      expect(await avatarRow(account.id)).toEqual({ token, mime: contentType, size: CAP });
      const stored = await storage.download(TEST_BUCKETS.avatars, token);
      expect(Buffer.compare(stored, bytes)).toBe(0);
    }
  });

  it('refuses one byte over the cap with file_too_large from the API, not an nginx 413', async () => {
    const account = await createTestAccount(harness.app);
    const upload = await putAvatar(nginx.baseUrl, account.cookie, makePng({ size: CAP + 1 }));
    expect(upload.status).toBe(200);
    expect(upload.body).toEqual(TOO_LARGE);
    expect(await avatarRow(account.id)).toBeNull();
  });

  it("answers a file past Multer's own limit the same way", async () => {
    const account = await createTestAccount(harness.app);
    const upload = await putAvatar(nginx.baseUrl, account.cookie, makePng({ size: 3 * 1024 * 1024 }));
    expect(upload.status).toBe(200);
    expect(upload.body).toEqual(TOO_LARGE);
    expect(await avatarRow(account.id)).toBeNull();
  });

  const refused: Array<[string, () => Buffer, string, string, unknown]> = [
    ['an empty file', () => Buffer.alloc(0), 'avatar.png', 'image/png', INVALID],
    ['bytes of no accepted format', () => Buffer.from('GIF89a not an avatar'), 'avatar.png', 'image/png', TYPE_NOT_ALLOWED],
    ['a malformed PNG', () => Buffer.concat([makePng().subarray(0, 8), Buffer.alloc(64, 0x41)]), 'avatar.png', 'image/png', INVALID],
    ['a truncated PNG', () => makePng({ size: 4096 }).subarray(0, 2048), 'avatar.png', 'image/png', INVALID],
    ['a PNG wider than 4096', () => makePng({ width: 4097, height: 1 }), 'avatar.png', 'image/png', INVALID],
    ['a PNG with a second IHDR', () => makePngWithSecondHeader(8192, 1), 'avatar.png', 'image/png', INVALID],
    ['a PNG with a wrong chunk CRC', () => makePngWithBadCrc(), 'avatar.png', 'image/png', INVALID],
    ['a truncated JPEG', () => makeJpeg().subarray(0, 300), 'avatar.jpg', 'image/jpeg', INVALID],
    ['a JPEG with no scan', () => makeJpegWithoutScan(), 'avatar.jpg', 'image/jpeg', INVALID],
    ['an extension-spoofed PNG', () => makePng(), 'avatar.jpg', 'application/octet-stream', TYPE_NOT_ALLOWED],
    ['a Content-Type-spoofed PNG', () => makePng(), 'avatar.png', 'image/jpeg', TYPE_NOT_ALLOWED],
    ['a PDF', () => makePdf(), 'avatar.pdf', 'application/pdf', TYPE_NOT_ALLOWED],
  ];

  it.each(refused)('refuses %s and stores nothing', async (_name, bytes, filename, contentType, expected) => {
    const account = await createTestAccount(harness.app);
    const upload = await putAvatar(nginx.baseUrl, account.cookie, bytes(), { filename, contentType });
    expect(upload.status).toBe(200);
    expect(upload.body).toEqual(expected);
    expect(await avatarRow(account.id)).toBeNull();
  });

  it('leaves the old row and its file when a replacement is refused', async () => {
    const storage = harness.app.get(SupabaseStorageClient);
    const account = await createTestAccount(harness.app);
    const png = makePng();
    const first = await putAvatar(nginx.baseUrl, account.cookie, png);
    expect(first.body.ok).toBe(true);
    const token = tokenOf(first.body.data.avatarUrl);

    const second = await putAvatar(nginx.baseUrl, account.cookie, makePdf(), {
      filename: 'avatar.pdf',
      contentType: 'application/pdf',
    });
    expect(second.body).toEqual(TYPE_NOT_ALLOWED);
    expect(await avatarRow(account.id)).toEqual({ token, mime: 'image/png', size: png.length });
    expect(Buffer.compare(await storage.download(TEST_BUCKETS.avatars, token), png)).toBe(0);
  });

  // §5.4: the gate runs before Multer. Each body here would otherwise be
  // refused file_too_large, so a 403 shows nothing parsed it.
  const badGates: Array<[string, { origin?: string | null; csrf?: string | null }]> = [
    ['no Origin', { origin: null }],
    ['a null Origin', { origin: 'null' }],
    ['another Origin', { origin: 'https://evil.example' }],
    ['no X-PeerConnect-CSRF', { csrf: null }],
    ['X-PeerConnect-CSRF other than 1', { csrf: '0' }],
  ];

  it.each(badGates)('refuses an upload with %s, 403 before any parsing', async (_name, gate) => {
    const account = await createTestAccount(harness.app);
    const upload = await putAvatar(nginx.baseUrl, account.cookie, makePng({ size: 3 * 1024 * 1024 }), gate);
    expect(upload.status).toBe(403);
    expect(upload.body).toEqual(CSRF_REJECTED);
    expect(await avatarRow(account.id)).toBeNull();
  });
});
