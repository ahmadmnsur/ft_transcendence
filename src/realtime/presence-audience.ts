import { Injectable } from '@nestjs/common';

// §7.6: who a Presence transition is broadcast to — a Student's accepted
// Friends, Removed excluded. The gateway asks for the recipients when it
// broadcasts, so a lookup that fails drops that one broadcast and nothing
// else. The Friends ticket (#46) binds the real lookup over `Friendship`.
export abstract class PresenceAudience {
  abstract recipients(studentId: string): Promise<readonly string[]>;
}

// Until `Friendship` exists, every transition has no recipients.
@Injectable()
export class EmptyPresenceAudience extends PresenceAudience {
  async recipients(): Promise<readonly string[]> {
    return [];
  }
}
