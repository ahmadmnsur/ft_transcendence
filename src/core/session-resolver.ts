import { Injectable } from '@nestjs/common';
import type { Role } from '../shared/roles';
import { Clock } from './clock';
import { AppLogger, errorFields } from './logger';
import { PrismaService } from './prisma.service';
import {
  SESSION_RENEW_AFTER_MS,
  SESSION_TTL_SECONDS,
  hashSessionToken,
  maxAgeUntil,
  serializeSessionCookie,
} from './session-cookie';
import { UnitOfWork } from './uow';

export type ActiveSession = {
  studentId: string;
  sessionHash: string;
  role: Role;
  email: string;
  displayName: string;
  avatar: { token: string } | null;
  expiresAt: Date;
};

export type SessionCookieSetter = { setHeader(name: string, value: string | string[]): unknown };

@Injectable()
export class SessionResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly logger: AppLogger,
  ) {}

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
        avatar_token: string | null;
        expires_at: Date;
        suspended_at: Date | null;
        removed_at: Date | null;
      }>
    >`SELECT st."id" AS "student_id", s."id" AS "session_id", st."role", st."email",
            st."display_name", a."token" AS "avatar_token", s."expires_at",
            st."suspended_at", st."removed_at"
       FROM "Session" s JOIN "Student" st ON st."id" = s."student_id"
       LEFT JOIN "Avatar" a ON a."student_id" = st."id"
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
      avatar: row.avatar_token === null ? null : { token: row.avatar_token },
      expiresAt: row.expires_at,
    };
  }

  async renewIfStale(session: ActiveSession, token: string, response: SessionCookieSetter): Promise<void> {
    const now = this.clock.now();
    if (session.expiresAt.getTime() >= now.getTime() + SESSION_RENEW_AFTER_MS) return;
    let written: { updated: number; expiresAt: Date };
    try {
      written = await this.uow.run('session-renewal', (tx, ctx) => {
        const expiresAt = new Date(ctx.now.getTime() + SESSION_TTL_SECONDS * 1000);
        return tx.session
          .updateMany({ where: { id: session.sessionHash }, data: { expiresAt } })
          .then((updated) => ({ updated: updated.count, expiresAt }));
      });
    } catch (err) {
      this.logger.entry('error', { operation: 'session-renewal', ...errorFields(err) });
      return;
    }
    if (written.updated === 1) {
      response.setHeader('Set-Cookie', serializeSessionCookie(token, maxAgeUntil(written.expiresAt, now)));
    }
  }
}
