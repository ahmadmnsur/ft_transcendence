import { Injectable } from '@nestjs/common';

export abstract class PresenceReader {
  abstract isOnline(studentId: string): boolean;
}

@Injectable()
export class OfflinePresenceReader extends PresenceReader {
  isOnline(): boolean {
    return false;
  }
}
