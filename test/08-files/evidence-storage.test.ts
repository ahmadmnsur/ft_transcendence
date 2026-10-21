import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { SupabaseStorageClient } from '../../src/core/supabase-storage';
import { TEST_BUCKETS } from '../../src/files/buckets';
import { useHarness } from '../harness/app';
import { eventually, makeValidPdf, makePng, putEvidence } from '../harness/files';
import { startNginx, type NginxHarness } from '../harness/nginx';
import { reviewedMatch, type ReviewedMatch } from '../harness/reviews';

const harness = useHarness();
let nginx: NginxHarness;

beforeAll(async () => {
  nginx = await startNginx(harness.port);
}, 30_000);

afterAll(async () => {
  await nginx?.stop();
});

async function fileNames(): Promise<Set<string>> {
  return new Set((await harness.app.get(SupabaseStorageClient).listAll(TEST_BUCKETS.evidence)).map((file) => file.name));
}

async function evidenceToken(pair: ReviewedMatch): Promise<string | null> {
  const row = await harness.app.get(PrismaService).evidence.findUnique({
    where: { reviewId: pair.reviewId },
    select: { token: true },
  });
  return row?.token ?? null;
}

async function upload(pair: ReviewedMatch, bytes: Buffer): Promise<string> {
  const saved = await putEvidence(nginx.baseUrl, pair.mentee.cookie, pair.reviewId, bytes, {
    filename: 'board.png',
    contentType: 'image/png',
  });
  expect(saved.body.ok).toBe(true);
  return saved.body.data.token;
}

// §16.3 row 8's Storage checks 1 and 2 for Evidence (ADR-0016 d1's note of
// 2026-10-05), on the suite's own bucket (§16.2). Checks 3 and 4 cover both
// buckets in avatar-storage.test.ts. A file is checked by its name, never by
// a count: the bucket keeps the files of earlier tests.
describe('Evidence files in Storage', () => {
  it('(1) deletes the old file after a replace, and the file after a delete', async () => {
    const pair = await reviewedMatch(harness.app);
    const oldToken = await upload(pair, makePng());
    const newToken = await upload(pair, makePng({ width: 8, height: 8 }));
    expect(newToken).not.toBe(oldToken);
    expect(await evidenceToken(pair)).toBe(newToken);
    // The replaced file goes after commit, without holding the response (§3.7).
    await eventually(async () => {
      const names = await fileNames();
      expect(names.has(oldToken)).toBe(false);
      expect(names.has(newToken)).toBe(true);
    });

    const removed = await harness
      .delete(`/api/reviews/${pair.reviewId}/evidence`)
      .set('Cookie', pair.mentee.cookie)
      .send({});
    expect(removed.body).toEqual({ ok: true, data: {} });
    expect(await evidenceToken(pair)).toBeNull();
    await eventually(async () => {
      expect((await fileNames()).has(newToken)).toBe(false);
    });
  });

  it('(2) deletes its new file at once when an error inside the save refuses it', async () => {
    const prisma = harness.app.get(PrismaService);
    const pair = await reviewedMatch(harness.app);
    const before = await fileNames();
    harness.barriers.arm('evidence-save');
    // `then` sends the request now; it waits at the barrier until released.
    const pending = putEvidence(nginx.baseUrl, pair.mentee.cookie, pair.reviewId, await makeValidPdf()).then(
      (response) => response,
    );
    await harness.barriers.waitFor('evidence-save', 1);
    // While the first attempt is held after its reads: the Mentee is
    // suspended, and a row written beside it makes that attempt's write
    // conflict, so the retry reads the suspension and is refused.
    const conflicting = randomUUID();
    await prisma.student.update({ where: { id: pair.mentee.id }, data: { suspendedAt: new Date() } });
    await prisma.evidence.create({
      data: {
        reviewId: pair.reviewId,
        token: conflicting,
        mime: 'application/pdf',
        size: 1,
        filename: 'evidence.pdf',
        uploadedAt: new Date(),
      },
    });
    harness.barriers.release('evidence-save');
    harness.barriers.disarm('evidence-save');
    const response = await pending;
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      ok: false,
      error: { code: 'unauthenticated', message: 'You need to sign in.' },
    });
    expect(await evidenceToken(pair)).toBe(conflicting);
    expect([...(await fileNames())].filter((name) => !before.has(name))).toEqual([]);
  });

  it('(2) deletes its new file at once when the 30-minute rule stops the save, and keeps the old one', async () => {
    const pair = await reviewedMatch(harness.app);
    const oldToken = await upload(pair, makePng());
    const before = await fileNames();
    harness.barriers.arm('evidence-save');
    // `then` sends the request now; it waits at the barrier until released.
    const pending = putEvidence(nginx.baseUrl, pair.mentee.cookie, pair.reviewId, await makeValidPdf()).then(
      (response) => response,
    );
    await harness.barriers.waitFor('evidence-save', 1);
    // The save is held inside its transaction while the clock moves.
    harness.clock.advance(31 * 60 * 1000);
    harness.barriers.release('evidence-save');
    harness.barriers.disarm('evidence-save');
    const response = await pending;
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      ok: false,
      error: { code: 'internal_error', message: 'Something went wrong.' },
    });
    expect(await evidenceToken(pair)).toBe(oldToken);
    const after = await fileNames();
    expect(after.has(oldToken)).toBe(true);
    expect([...after].filter((name) => !before.has(name))).toEqual([]);
  });
});
