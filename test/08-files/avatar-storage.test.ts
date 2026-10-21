import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppConfig } from '../../src/core/app-config';
import { PrismaService } from '../../src/core/prisma.service';
import { SupabaseStorageClient } from '../../src/core/supabase-storage';
import { BUCKET_SETTINGS, FILE_KINDS, TEST_BUCKETS, ensureBuckets, type FileBuckets } from '../../src/files/buckets';
import { CLEANUP_MIN_AGE_MS, FileCleanup } from '../../src/files/cleanup';
import { useHarness } from '../harness/app';
import { createTestAccount } from '../harness/accounts';
import { eventually, makeValidPdf, makePdf, makePng, putAvatar, putEvidence, tokenOf } from '../harness/files';
import { startNginx, type NginxHarness } from '../harness/nginx';
import { reviewedMatch } from '../harness/reviews';

const harness = useHarness();
let nginx: NginxHarness;

beforeAll(async () => {
  nginx = await startNginx(harness.port);
}, 30_000);

afterAll(async () => {
  await nginx?.stop();
});

const BUCKET = TEST_BUCKETS.avatars;

function storage(): SupabaseStorageClient {
  return harness.app.get(SupabaseStorageClient);
}

async function fileNames(): Promise<Set<string>> {
  return new Set((await storage().listAll(BUCKET)).map((file) => file.name));
}

async function avatarToken(studentId: string): Promise<string | null> {
  const row = await harness.app.get(PrismaService).avatar.findUnique({
    where: { studentId },
    select: { token: true },
  });
  return row?.token ?? null;
}

// §16.3 row 8's Storage checks (ADR-0016 d1's note of 2026-10-05), on the
// suite's own buckets (§16.2). A file is checked by its name, never by a
// count: the bucket keeps the files of earlier tests.
describe('avatar files in Storage', () => {
  it('(1) deletes the old file after a replace, and the file after a delete', async () => {
    const account = await createTestAccount(harness.app);
    const first = await putAvatar(nginx.baseUrl, account.cookie, makePng());
    const oldToken = tokenOf(first.body.data.avatarUrl);
    const second = await putAvatar(nginx.baseUrl, account.cookie, makePng({ width: 8, height: 8 }));
    const newToken = tokenOf(second.body.data.avatarUrl);
    expect(newToken).not.toBe(oldToken);
    expect(await avatarToken(account.id)).toBe(newToken);
    // The replaced file goes after commit, without holding the response (§3.7).
    await eventually(async () => {
      const names = await fileNames();
      expect(names.has(oldToken)).toBe(false);
      expect(names.has(newToken)).toBe(true);
    });

    const removed = await harness.delete('/api/me/avatar').set('Cookie', account.cookie).send({});
    expect(removed.body).toEqual({ ok: true, data: {} });
    expect(await avatarToken(account.id)).toBeNull();
    await eventually(async () => {
      expect((await fileNames()).has(newToken)).toBe(false);
    });
  });

  it('(2) deletes its new file at once when an error inside the save refuses it', async () => {
    const prisma = harness.app.get(PrismaService);
    const account = await createTestAccount(harness.app);
    const before = await fileNames();
    harness.barriers.arm('avatar-save');
    // `then` sends the request now; it waits at the barrier until released.
    const pending = putAvatar(nginx.baseUrl, account.cookie, makePng()).then((response) => response);
    await harness.barriers.waitFor('avatar-save', 1);
    // While the first attempt is held after its reads: the Student is
    // suspended, and a row written beside it makes that attempt's write
    // conflict, so the retry reads the suspension and is refused.
    const conflicting = randomUUID();
    await prisma.student.update({ where: { id: account.id }, data: { suspendedAt: new Date() } });
    await prisma.avatar.create({
      data: { studentId: account.id, token: conflicting, mime: 'image/png', size: 1, uploadedAt: new Date() },
    });
    harness.barriers.release('avatar-save');
    harness.barriers.disarm('avatar-save');
    const response = await pending;
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      ok: false,
      error: { code: 'unauthenticated', message: 'You need to sign in.' },
    });
    expect(await avatarToken(account.id)).toBe(conflicting);
    const added = [...(await fileNames())].filter((name) => !before.has(name));
    expect(added).toEqual([]);
  });

  it('(2) deletes its new file at once when the 30-minute rule stops the save, and keeps the old one', async () => {
    const account = await createTestAccount(harness.app);
    const first = await putAvatar(nginx.baseUrl, account.cookie, makePng());
    const oldToken = tokenOf(first.body.data.avatarUrl);
    const before = await fileNames();
    harness.barriers.arm('avatar-save');
    // `then` sends the request now; it waits at the barrier until released.
    const pending = putAvatar(nginx.baseUrl, account.cookie, makePng({ width: 8, height: 8 })).then(
      (response) => response,
    );
    await harness.barriers.waitFor('avatar-save', 1);
    // The save is held inside its transaction while the clock moves.
    harness.clock.advance(31 * 60 * 1000);
    harness.barriers.release('avatar-save');
    harness.barriers.disarm('avatar-save');
    const response = await pending;
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      ok: false,
      error: { code: 'internal_error', message: 'Something went wrong.' },
    });
    expect(await avatarToken(account.id)).toBe(oldToken);
    const after = await fileNames();
    expect(after.has(oldToken)).toBe(true);
    expect([...after].filter((name) => !before.has(name))).toEqual([]);
  });

  it('(3) deletes the files no row names once over an hour old, across pages, and keeps the rest', async () => {
    const account = await createTestAccount(harness.app);
    const named = tokenOf((await putAvatar(nginx.baseUrl, account.cookie, makePng())).body.data.avatarUrl);
    // Files no row names, older than the youngest below.
    for (let i = 0; i < 5; i += 1) {
      await storage().upload(BUCKET, randomUUID(), makePng(), 'image/png');
    }
    // Two Evidence files just as old, one a row names and one no row names.
    const pair = await reviewedMatch(harness.app);
    const namedEvidence: string = (
      await putEvidence(nginx.baseUrl, pair.mentee.cookie, pair.reviewId, await makeValidPdf())
    ).body.data.token;
    const strayEvidence = randomUUID();
    await storage().upload(TEST_BUCKETS.evidence, strayEvidence, makePdf(), 'application/pdf');
    // The newest file, which the clock below makes exactly an hour old.
    const youngest = randomUUID();
    await storage().upload(BUCKET, youngest, makePng(), 'image/png');
    const listed = await storage().listAll(BUCKET);
    const youngestAt = listed.find((file) => file.name === youngest)?.createdAt;
    if (youngestAt === undefined) throw new Error('the youngest file is not listed');
    harness.clock.stopAt(new Date(youngestAt.getTime() + CLEANUP_MIN_AGE_MS));

    // Two files a page, so the bucket takes several pages.
    expect(listed.length).toBeGreaterThanOrEqual(7);
    await harness.app.get(FileCleanup).run(2);

    const left = await fileNames();
    expect(left.has(named)).toBe(true);
    expect(left.has(youngest)).toBe(true);
    // Every file listed: gone exactly when no row names it and it is more
    // than an hour old, so a run that skipped a page fails here.
    for (const file of listed) {
      const stale = file.name !== named && file.createdAt.getTime() < youngestAt.getTime();
      expect(left.has(file.name)).toBe(!stale);
    }
    const evidenceLeft = new Set((await storage().listAll(TEST_BUCKETS.evidence)).map((file) => file.name));
    expect(evidenceLeft.has(namedEvidence)).toBe(true);
    expect(evidenceLeft.has(strayEvidence)).toBe(false);
  });

  it('(4) creates both buckets, private with their caps and types, and sets back changed settings', async () => {
    const client = storage();
    const prefix = `t08-${randomUUID().slice(0, 8)}`;
    // Names no bucket has yet, so the step meets them as on an empty Supabase.
    const buckets: FileBuckets = { avatars: `${prefix}-avatars`, evidence: `${prefix}-evidence` };
    try {
      expect(await ensureBuckets(client, buckets)).toEqual({
        created: [buckets.avatars, buckets.evidence],
        reset: [],
      });
      await expectBucketSettings(client, buckets);

      // One made public, the other given another cap and types: both set back.
      await client.updateBucket(buckets.avatars, { public: true, fileSizeLimit: 10, allowedMimeTypes: ['image/gif'] });
      await client.updateBucket(buckets.evidence, { public: false, fileSizeLimit: 1, allowedMimeTypes: ['application/pdf'] });
      expect(await ensureBuckets(client, buckets)).toEqual({
        created: [],
        reset: [buckets.avatars, buckets.evidence],
      });
      await expectBucketSettings(client, buckets);
      expect(await ensureBuckets(client, buckets)).toEqual({ created: [], reset: [] });
    } finally {
      for (const name of [buckets.avatars, buckets.evidence]) await deleteBucket(name);
    }
  });
});

// Removes an empty bucket this file made, so a run inside `make dev` leaves
// none behind. Best effort; nothing else in the suite deletes a bucket.
async function deleteBucket(name: string): Promise<void> {
  const config = new AppConfig();
  const key = config.supabaseSecretKey;
  try {
    const response = await fetch(
      `${config.supabaseUrl.replace(/\/$/, '')}/storage/v1/bucket/${encodeURIComponent(name)}`,
      { method: 'DELETE', headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    await response.body?.cancel();
  } catch {
    // Best effort.
  }
}

// Each bucket private, with its kind's cap and types (§9.8).
async function expectBucketSettings(client: SupabaseStorageClient, buckets: FileBuckets): Promise<void> {
  for (const kind of FILE_KINDS) {
    const settings = await client.getBucket(buckets[kind]);
    expect(settings?.public).toBe(false);
    expect(settings?.fileSizeLimit).toBe(BUCKET_SETTINGS[kind].fileSizeLimit);
    expect([...(settings?.allowedMimeTypes ?? [])].sort()).toEqual(
      [...BUCKET_SETTINGS[kind].allowedMimeTypes].sort(),
    );
  }
}
