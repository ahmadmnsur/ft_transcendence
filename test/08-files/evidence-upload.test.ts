import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/core/prisma.service';
import { MatchingService } from '../../src/matching/matching.service';
import { StudentsService } from '../../src/students/students.service';
import { useHarness } from '../harness/app';
import { createTestAccount, openTestSession } from '../harness/accounts';
import {
  makeValidPdf,
  makeJpeg,
  makePdf,
  makePng,
  putEvidence,
  type UploadOptions,
} from '../harness/files';
import { startNginx, type NginxHarness } from '../harness/nginx';
import { reviewedMatch, type ReviewedMatch } from '../harness/reviews';

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

const CAP = 5_242_880;
// Past Multer's limit, the cap + 1 byte, and under nginx's 6 MiB.
const PAST_MULTER = 5.5 * 1024 * 1024;

function refusal(code: string, message: string): unknown {
  return { ok: false, error: { code, message } };
}

const TOO_LARGE = refusal('file_too_large', 'This file is too large.');
const TYPE_NOT_ALLOWED = refusal('file_type_not_allowed', 'This type of file is not allowed.');
const INVALID = refusal('file_invalid', "This file can't be read.");
const CSRF_REJECTED = refusal('csrf_rejected', 'The request was refused.');
const FORBIDDEN = refusal('forbidden', 'You are not allowed to do this.');
const UNAUTHENTICATED = refusal('unauthenticated', 'You need to sign in.');

function upload(pair: ReviewedMatch, cookie: string, bytes: Buffer, options: UploadOptions = {}) {
  return putEvidence(nginx.baseUrl, cookie, pair.reviewId, bytes, options);
}

function remove(pair: ReviewedMatch, cookie: string) {
  return harness.delete(`/api/reviews/${pair.reviewId}/evidence`).set('Cookie', cookie).send({});
}

// The file as `GET /api/files/evidence/:token` sends it to `cookie`.
function readEvidence(token: string, cookie: string) {
  return harness.get(`/api/files/evidence/${token}`).set('Cookie', cookie).responseType('blob');
}

// The Evidence metadata the Mentee's Match detail carries (§9.3).
async function evidenceOf(pair: ReviewedMatch): Promise<unknown> {
  const detail = await harness.get(`/api/matches/${pair.matchId}`).set('Cookie', pair.mentee.cookie);
  expect(detail.status).toBe(200);
  return detail.body.data.review.evidence;
}

// §16.3 row 8, Evidence: exact byte caps, server-side byte validation, type
// spoofing, reads and writes anchored to the owning Review's Match, a failed
// replacement left atomic, and the upload CSRF gate.
describe('Evidence acceptance through nginx', () => {
  it('stores a PDF, a PNG and a JPEG of exactly 5,242,880 bytes', async () => {
    const pair = await reviewedMatch(harness.app);
    for (const [bytes, filename, mime] of [
      [await makeValidPdf({ size: CAP }), 'exact.pdf', 'application/pdf'],
      [makePng({ size: CAP }), 'exact.png', 'image/png'],
      [makeJpeg(CAP), 'exact.jpg', 'image/jpeg'],
    ] as const) {
      expect(bytes.length).toBe(CAP);
      const saved = await upload(pair, pair.mentee.cookie, bytes, { filename, contentType: mime });
      expect(saved.status).toBe(200);
      expect(saved.body).toEqual({
        ok: true,
        data: { token: expect.any(String), mime, size: CAP, filename },
      });
      const read = await readEvidence(saved.body.data.token, pair.mentee.cookie);
      expect(read.status).toBe(200);
      expect(read.headers['content-type']).toBe(mime);
      expect(Buffer.compare(read.body as Buffer, bytes)).toBe(0);
    }
    // Three 5 MiB files through nginx and back.
  }, 20_000);

  it('refuses one byte over the cap with file_too_large from the API, not an nginx 413', async () => {
    const pair = await reviewedMatch(harness.app);
    for (const bytes of [await makeValidPdf({ size: CAP + 1 }), makePng({ size: CAP + 1 }), makeJpeg(CAP + 1)]) {
      const saved = await upload(pair, pair.mentee.cookie, bytes, { filename: 'over', contentType: 'application/octet-stream' });
      expect(saved.status).toBe(200);
      expect(saved.body).toEqual(TOO_LARGE);
    }
    expect(await evidenceOf(pair)).toBeNull();
  });

  it("answers a file past Multer's own limit the same way", async () => {
    const pair = await reviewedMatch(harness.app);
    const saved = await upload(pair, pair.mentee.cookie, await makeValidPdf({ size: PAST_MULTER }));
    expect(saved.status).toBe(200);
    expect(saved.body).toEqual(TOO_LARGE);
    expect(await evidenceOf(pair)).toBeNull();
  });

  const refused: Array<[string, () => Promise<Buffer>, string, string, unknown]> = [
    ['an empty file', async () => Buffer.alloc(0), 'evidence.pdf', 'application/pdf', INVALID],
    ['bytes of no accepted format', async () => Buffer.from('GIF89a no Evidence'), 'evidence.pdf', 'application/pdf', TYPE_NOT_ALLOWED],
    ['a truncated PDF', async () => (await makeValidPdf({ size: 4096 })).subarray(0, 2048), 'evidence.pdf', 'application/pdf', INVALID],
    ['a PDF cut short and given a new end', async () => {
      const pdf = await makeValidPdf();
      return Buffer.concat([pdf.subarray(0, pdf.length >> 1), Buffer.from('\n%%EOF\n')]);
    }, 'evidence.pdf', 'application/pdf', INVALID],
    ['a PDF header and end around no document', async () => Buffer.from('%PDF-1.7\nno objects here\n%%EOF\n'), 'evidence.pdf', 'application/pdf', INVALID],
    ['a PDF whose end is more than 1024 bytes from the last byte', async () => {
      return Buffer.concat([await makeValidPdf(), Buffer.alloc(1025, 0x20)]);
    }, 'evidence.pdf', 'application/pdf', INVALID],
    ['a PDF with an invalid object', async () => {
      const pdf = (await makeValidPdf()).toString('latin1');
      return Buffer.from(pdf.replace('/Type /Page\n', '/Type /Page ) ]\n'), 'latin1');
    }, 'evidence.pdf', 'application/pdf', INVALID],
    ['a PDF with no page', async () => makeValidPdf({ pages: 0 }), 'evidence.pdf', 'application/pdf', INVALID],
    ['a PDF with no catalog', async () => makePdf(), 'evidence.pdf', 'application/pdf', INVALID],
    ['a malformed PNG', async () => Buffer.concat([makePng().subarray(0, 8), Buffer.alloc(64, 0x41)]), 'evidence.png', 'image/png', INVALID],
    ['a truncated JPEG', async () => makeJpeg().subarray(0, 300), 'evidence.jpg', 'image/jpeg', INVALID],
    ['an extension-spoofed PDF', async () => makeValidPdf(), 'evidence.png', 'application/octet-stream', TYPE_NOT_ALLOWED],
    ['a Content-Type-spoofed PDF', async () => makeValidPdf(), 'evidence.pdf', 'image/png', TYPE_NOT_ALLOWED],
    ['a PNG named as a PDF', async () => makePng(), 'evidence.pdf', 'application/octet-stream', TYPE_NOT_ALLOWED],
  ];

  it.each(refused)('refuses %s and stores nothing', async (_name, bytes, filename, contentType, expected) => {
    const pair = await reviewedMatch(harness.app);
    const saved = await upload(pair, pair.mentee.cookie, await bytes(), { filename, contentType });
    expect(saved.status).toBe(200);
    expect(saved.body).toEqual(expected);
    expect(await evidenceOf(pair)).toBeNull();
  });

  // The upload sends a line break and `"` escaped, as a browser does, and
  // Multer turns them back (§9.5 step 6). Outside §16.3's list because it
  // fails silently: a garbled or unescapable name breaks only some names.
  it('keeps the sanitised file name, and serves the file inline under it', async () => {
    const pair = await reviewedMatch(harness.app);
    const pdf = await makeValidPdf();
    const long = `${'a'.repeat(300)}.pdf`;
    for (const [sent, kept, disposition] of [
      ['notes/week 3.pdf', 'week 3.pdf', 'inline; filename="week 3.pdf"'],
      ['week\n3.pdf', 'week3.pdf', 'inline; filename="week3.pdf"'],
      [' \r\n ', 'evidence.pdf', 'inline; filename="evidence.pdf"'],
      [long, `${'a'.repeat(251)}.pdf`, `inline; filename="${'a'.repeat(251)}.pdf"`],
      ['été "1".pdf', 'été "1".pdf', `inline; filename="_t_ _1_.pdf"; filename*=UTF-8''%C3%A9t%C3%A9%20%221%22.pdf`],
      ['تقرير.pdf', 'تقرير.pdf', `inline; filename="_____.pdf"; filename*=UTF-8''${encodeURIComponent('تقرير')}.pdf`],
    ]) {
      const saved = await upload(pair, pair.mentee.cookie, pdf, { filename: sent });
      expect(saved.body).toMatchObject({ ok: true, data: { filename: kept } });
      const read = await readEvidence(saved.body.data.token, pair.mentor.cookie);
      expect(read.status).toBe(200);
      expect(read.headers['content-disposition']).toBe(disposition);
    }
  });

  it('anchors reads to the Match of the Evidence, never another Match or a role short of Admin', async () => {
    const prisma = harness.app.get(PrismaService);
    const pair = await reviewedMatch(harness.app);
    const saved = await upload(pair, pair.mentee.cookie, await makeValidPdf());
    const token: string = saved.body.data.token;

    // A Student paired with the uploader in another Match, an earlier closed Round.
    const other = await createTestAccount(harness.app);
    const earlier = await prisma.round.create({ data: { closedAt: new Date() } });
    await prisma.match.create({
      data: {
        roundId: earlier.id,
        mentorId: other.id,
        menteeId: pair.mentee.id,
        status: 'COMPLETED',
        mission: 'ADVICE',
        goalBonusApplied: false,
      },
    });
    expect((await readEvidence(token, other.cookie)).status).toBe(403);

    // A Peer Moderator outside the pair reads nothing; the Mentor made one
    // still reads as a member of the pair.
    const moderator = await createTestAccount(harness.app);
    await prisma.student.update({ where: { id: moderator.id }, data: { role: 'PEER_MODERATOR' } });
    const outside = await readEvidence(token, moderator.cookie);
    expect(outside.status).toBe(403);
    expect(JSON.parse(String(outside.body))).toEqual(FORBIDDEN);
    await prisma.student.update({ where: { id: pair.mentor.id }, data: { role: 'PEER_MODERATOR' } });
    expect((await readEvidence(token, pair.mentor.cookie)).status).toBe(200);

    const unknown = await readEvidence('0199a000-0000-7000-8000-000000000000', pair.mentee.cookie);
    expect(unknown.status).toBe(404);
  });

  it('lets only the Mentee write, after COMPLETED and beside a later Match, and refuses others before parsing', async () => {
    const pair = await reviewedMatch(harness.app);
    // Each body here would otherwise be refused file_too_large, so a 403
    // shows the pre-check ran before Multer.
    const big = await makeValidPdf({ size: PAST_MULTER });
    for (const cookie of [pair.mentor.cookie, pair.admin.cookie]) {
      const put = await upload(pair, cookie, big);
      expect(put.status).toBe(403);
      expect(put.body).toEqual(FORBIDDEN);
      const deleted = await remove(pair, cookie);
      expect(deleted.status).toBe(403);
      expect(deleted.body).toEqual(FORBIDDEN);
    }
    const unknownReview = await putEvidence(nginx.baseUrl, pair.mentee.cookie, '0199a000-0000-7000-8000-000000000000', big);
    expect(unknownReview.status).toBe(403);
    // nginx admits a large body only on an upload route with a hex id, so
    // this one goes to the API directly.
    const malformed = await putEvidence(harness.baseUrl, pair.mentee.cookie, 'not-a-uuid', makePng());
    expect(malformed.status).toBe(400);

    // The Round closes, and in a later one an Admin pairs the Mentee with a
    // new partner by hand; the COMPLETED Match's Mentee still writes its
    // Evidence, and the later Match is irrelevant (§9.4).
    const matching = harness.app.get(MatchingService);
    const admin = { studentId: pair.admin.id, sessionHash: null };
    await matching.closeRound(admin);
    await matching.openRound(admin);
    const partner = await createTestAccount(harness.app);
    const docker = await harness.app.get(PrismaService).skill.findFirstOrThrow({ where: { name: 'Docker' } });
    await harness.app.get(StudentsService).setSkills({ studentId: partner.id, sessionHash: null }, [docker.id], []);
    const later = await matching.createHandMadeMatch(admin, [partner.id, pair.mentee.id]);
    expect(later.id).not.toBe(pair.matchId);
    const saved = await upload(pair, pair.mentee.cookie, await makeValidPdf());
    expect(saved.status).toBe(200);
    expect(saved.body.ok).toBe(true);
    expect((await evidenceOf(pair)) as { token: string }).toMatchObject({ token: saved.body.data.token });
    // Four bodies over 5 MiB and two Rounds.
  }, 20_000);

  it('keeps the path for a Mentee promoted to Admin after the Review', async () => {
    const pair = await reviewedMatch(harness.app);
    // Through the Users table's role change (§12.7), which keeps sessions.
    const promoted = await harness.post(`/api/admin/students/${pair.mentee.id}/role`).set('Cookie', pair.admin.cookie).send({ role: 'ADMIN' });
    expect(promoted.body).toEqual({ ok: true, data: { role: 'ADMIN' } });
    const saved = await upload(pair, pair.mentee.cookie, makePng(), { filename: 'board.png', contentType: 'image/png' });
    expect(saved.status).toBe(200);
    expect(saved.body.ok).toBe(true);
    const removed = await remove(pair, pair.mentee.cookie);
    expect(removed.body).toEqual({ ok: true, data: {} });
  });

  // Outside §16.3's list because it fails silently: a delete retried after a
  // lost reply or a second click would answer an error no demo shows.
  it('deletes idempotently', async () => {
    const pair = await reviewedMatch(harness.app);
    await upload(pair, pair.mentee.cookie, await makeValidPdf());
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const removed = await remove(pair, pair.mentee.cookie);
      expect(removed.status).toBe(200);
      expect(removed.body).toEqual({ ok: true, data: {} });
      expect(await evidenceOf(pair)).toBeNull();
    }
  });

  // Through the Users table's own routes (§12.7), as an Admin uses them.
  it('pauses the path under Suspension and ends it at Removal, keeping the Evidence both times', async () => {
    const pair = await reviewedMatch(harness.app);
    const pdf = await makeValidPdf();
    const saved = await upload(pair, pair.mentee.cookie, pdf);
    let token: string = saved.body.data.token;
    const kept = async (): Promise<void> => {
      const read = await readEvidence(token, pair.mentor.cookie);
      expect(read.status).toBe(200);
      expect(Buffer.compare(read.body as Buffer, pdf)).toBe(0);
      // The row stays on the Match, as its Mentor reads it (§9.3).
      const detail = await harness.get(`/api/matches/${pair.matchId}`).set('Cookie', pair.mentor.cookie);
      expect(detail.body.data.review.evidence).toMatchObject({ token });
    };
    const sanction = (action: 'suspend' | 'reinstate' | 'remove') =>
      harness.post(`/api/admin/students/${pair.mentee.id}/${action}`).set('Cookie', pair.admin.cookie).send({});

    expect((await sanction('suspend')).body).toEqual({ ok: true, data: { status: 'SUSPENDED' } });
    const suspendedPut = await upload(pair, pair.mentee.cookie, makePng(), { filename: 'b.png', contentType: 'image/png' });
    expect(suspendedPut.status).toBe(401);
    expect(suspendedPut.body).toEqual(UNAUTHENTICATED);
    expect((await remove(pair, pair.mentee.cookie)).status).toBe(401);
    await kept();

    // Reinstatement restores the path. The Suspension deleted every session,
    // so the Mentee signs in again.
    expect((await sanction('reinstate')).body).toEqual({ ok: true, data: { status: 'ACTIVE' } });
    const cookie = await openTestSession(harness.app, pair.mentee);
    const reinstated = await upload(pair, cookie, pdf);
    expect(reinstated.status).toBe(200);
    expect(reinstated.body.ok).toBe(true);
    token = reinstated.body.data.token;

    expect((await sanction('remove')).body).toEqual({ ok: true, data: { status: 'REMOVED' } });
    expect((await upload(pair, cookie, pdf)).status).toBe(401);
    expect((await remove(pair, cookie)).status).toBe(401);
    await kept();
    expect((await readEvidence(token, pair.admin.cookie)).status).toBe(200);
  });

  it('leaves the old row and its file when a replacement is refused', async () => {
    const pair = await reviewedMatch(harness.app);
    const pdf = await makeValidPdf();
    const first = await upload(pair, pair.mentee.cookie, pdf, { filename: 'notes.pdf' });
    const metadata = { token: first.body.data.token, mime: 'application/pdf', size: pdf.length, filename: 'notes.pdf' };

    const second = await upload(pair, pair.mentee.cookie, pdf.subarray(0, pdf.length >> 1), { filename: 'cut.pdf' });
    expect(second.body).toEqual(INVALID);
    expect(await evidenceOf(pair)).toEqual(metadata);
    const read = await readEvidence(metadata.token, pair.mentee.cookie);
    expect(Buffer.compare(read.body as Buffer, pdf)).toBe(0);
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
    const pair = await reviewedMatch(harness.app);
    const saved = await upload(pair, pair.mentee.cookie, await makeValidPdf({ size: PAST_MULTER }), gate);
    expect(saved.status).toBe(403);
    expect(saved.body).toEqual(CSRF_REJECTED);
    expect(await evidenceOf(pair)).toBeNull();
  });
});
