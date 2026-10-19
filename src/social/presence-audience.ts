import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { PresenceAudience } from '../realtime/presence-audience';
import { acceptedFriendsOf } from './accepted-friends';

// §7.6: a Presence transition goes to the Student's accepted Friends, Removed
// excluded, read when it is broadcast. A pending request confers nothing
// (§11.1), so its other party is never told. The realtime module binds this
// lookup; it reads only `Friendship` and `Student`.
@Injectable()
export class FriendsPresenceAudience extends PresenceAudience {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async recipients(studentId: string): Promise<readonly string[]> {
    const rows = await this.prisma.student.findMany({ where: acceptedFriendsOf(studentId), select: { id: true } });
    return rows.map((row) => row.id);
  }
}
