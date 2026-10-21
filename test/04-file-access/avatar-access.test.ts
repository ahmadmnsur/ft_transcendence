import { describe, expect, it } from 'vitest';
import { useHarness } from '../harness/app';
import { createTestAccount } from '../harness/accounts';
import { makePng, putAvatar } from '../harness/files';

const harness = useHarness();

// §16.3 row 4, the avatar half: an avatar URL answers 401 signed out and
// 200 to any signed-in Student. Evidence's half is evidence-access.test.ts.
describe('avatar file access', () => {
  it('is 401 signed out and 200 with the file to any signed-in Student', async () => {
    const owner = await createTestAccount(harness.app);
    const other = await createTestAccount(harness.app);
    const png = makePng();
    const upload = await putAvatar(harness.baseUrl, owner.cookie, png);
    expect(upload.status).toBe(200);
    expect(upload.body.ok).toBe(true);
    const avatarUrl: string = upload.body.data.avatarUrl;
    expect(avatarUrl).toMatch(/^\/api\/files\/avatars\/[0-9a-f-]{36}$/);

    const signedOut = await harness.get(avatarUrl);
    expect(signedOut.status).toBe(401);
    expect(signedOut.body).toEqual({
      ok: false,
      error: { code: 'unauthenticated', message: 'You need to sign in.' },
    });

    for (const viewer of [other, owner]) {
      const read = await harness.get(avatarUrl).set('Cookie', viewer.cookie).responseType('blob');
      expect(read.status).toBe(200);
      expect(read.headers['content-type']).toBe('image/png');
      expect(read.headers['x-content-type-options']).toBe('nosniff');
      expect(read.headers['cache-control']).toBe('private, max-age=86400, immutable');
      expect(Buffer.compare(read.body as Buffer, png)).toBe(0);
    }
  });
});
