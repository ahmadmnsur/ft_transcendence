import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { PresenceAudience } from '../realtime/presence-audience';
import { acceptedFriendsOf } from './accepted-friends';

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
