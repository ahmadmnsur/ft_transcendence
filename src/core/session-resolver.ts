import { Injectable } from '@nestjs/common';
import type { Role } from '../shared/roles';
import { Clock } from './clock';
import { PrismaService } from './prisma.service';
import {
  SESSION_RENEW_AFTER_MS,
  SESSION_TTL_SECONDS,
  hashSessionToken,
  maxAgeUntil,
  serializeSessionCookie,
} from './session-cookie';
import { UnitOfWork } from './uow';

// What resolving a session reads: the role fresh on every request, so a role
// change takes effect on the next request with no session change (ADR-0003
// d5–d6). Email and display name come along in the same query: the session
// route and the password change's throttle key need them (§5.3).
export type ActiveSession = {
  studentId: string;
  sessionHash: string;
  role: Role;
  email: string;
  displayName: string;
  expiresAt: Date;
};

type SessionCookieSetter = { setHeader(name: string, value: string | string[]): unknown };

// One query, `Session` JOIN `Student`, `WHERE s.id = $1 AND s.expires_at >
// now`: resolving a session reads PeerConnect's tables only and never calls
// Supabase Auth (§5.3). Shared by the guard, the session route and the
// already-signed-in check.
@Injectable()
export class SessionResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  // The active session for a cookie token, or null for no row, an expired
  // row, a Suspended or a Removed Student.
  //
  // One `$queryRaw` JOIN, not `findFirst` plus `include`: Prisma runs the
  // latter as two statements, and §5.3 wants one query reading `student_id`,
  // the role and the flags. `$2` is the Clock's now, so expiry compares
  // against the same instant the caller reasons about.
  async resolveActive(token: string): Promise<ActiveSession | null> {
    if (token === '') return null;
    const now = this.clock.now();
    const rows = await this.prisma.$queryRaw<
      Array<{
        student_id: string;
        session_id: string;
        role: Role;
        email: string;
        display_name: string;
        expires_at: Date;
        suspended_at: Date | null;
        removed_at: Date | null;
      }>
    >`SELECT st."id" AS "student_id", s."id" AS "session_id", st."role", st."email",
            st."display_name", s."expires_at", st."suspended_at", st."removed_at"
       FROM "Session" s JOIN "Student" st ON st."id" = s."student_id"
      WHERE s."id" = ${hashSessionToken(token)} AND s."expires_at" > ${now}`;
    const row = rows[0];
    if (row === undefined) return null;
    if (row.suspended_at !== null || row.removed_at !== null) return null;
    return {
      studentId: row.student_id,
      sessionHash: row.session_id,
      role: row.role,
      email: row.email,
      displayName: row.display_name,
      expiresAt: row.expires_at,
    };
  }

  // Lazy renewal on any authenticated request, when `expires_at < now + 30
  // d − 1 h` (§5.2): one UPDATE through the Unit of Work, and the cookie is
  // re-set only when it affects exactly one row, so a renewal can never
  // resurrect a concurrently revoked session. Never fails the request. The
  // cookie keeps its token; only the expiry moves. The cookie's `Max-Age` is
  // derived from the `expires_at` the UPDATE wrote, not from a second clock
  // read.
  async renewIfStale(session: ActiveSession, token: string, response: SessionCookieSetter): Promise<void> {
    const now = this.clock.now();
    if (session.expiresAt.getTime() >= now.getTime() + SESSION_RENEW_AFTER_MS) return;
    const written = await this.uow.run('session-renewal', (tx, ctx) => {
      const expiresAt = new Date(ctx.now.getTime() + SESSION_TTL_SECONDS * 1000);
      return tx.session
        .updateMany({ where: { id: session.sessionHash }, data: { expiresAt } })
        .then((updated) => ({ updated: updated.count, expiresAt }));
    });
    if (written.updated === 1) {
      response.setHeader('Set-Cookie', serializeSessionCookie(token, maxAgeUntil(written.expiresAt, now)));
    }
  }
}
