import { describe, expect, it } from 'vitest';
import { useHarness } from '../harness/app';
import { createTestAccount } from '../harness/accounts';
import { makeValidPdf, putEvidence } from '../harness/files';
import { reviewedMatch } from '../harness/reviews';

const harness = useHarness();

// §16.3 row 4, the Evidence half: an Evidence URL answers 401 signed out,
// 403 to a Student outside the pair, and 200 with the file to the pair and
// an Admin (§6.3).
describe('Evidence file access', () => {
  it('is 401 signed out, 403 to an unrelated Student, and 200 to the pair and an Admin', async () => {
    const pair = await reviewedMatch(harness.app);
    const unrelated = await createTestAccount(harness.app);
    const pdf = await makeValidPdf();
    const upload = await putEvidence(harness.baseUrl, pair.mentee.cookie, pair.reviewId, pdf, {
      filename: 'notes.pdf',
    });
    expect(upload.status).toBe(200);
    const url = `/api/files/evidence/${upload.body.data.token}`;

    const signedOut = await harness.get(url);
    expect(signedOut.status).toBe(401);
    expect(signedOut.body).toEqual({
      ok: false,
      error: { code: 'unauthenticated', message: 'You need to sign in.' },
    });

    const outside = await harness.get(url).set('Cookie', unrelated.cookie);
    expect(outside.status).toBe(403);
    expect(outside.body).toEqual({
      ok: false,
      error: { code: 'forbidden', message: 'You are not allowed to do this.' },
    });

    for (const viewer of [pair.mentee, pair.mentor, pair.admin]) {
      const read = await harness.get(url).set('Cookie', viewer.cookie).responseType('blob');
      expect(read.status).toBe(200);
      expect(read.headers['content-type']).toBe('application/pdf');
      expect(read.headers['content-disposition']).toBe('inline; filename="notes.pdf"');
      expect(read.headers['x-content-type-options']).toBe('nosniff');
      expect(read.headers['cache-control']).toBe('private, no-cache');
      expect(Buffer.compare(read.body as Buffer, pdf)).toBe(0);
    }
  });
});
