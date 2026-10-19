import { Injectable } from '@nestjs/common';

// §7.6: what a read of Presence answers, such as `online` in GET
// /api/friends. A port, like RealtimePublisher, so the `social` module never
// depends on the socket gateway: the app binds the realtime module's
// registry, and the seed's plain `CoreModule` keeps the offline reader below.
export abstract class PresenceReader {
  abstract isOnline(studentId: string): boolean;
}

// No socket ever reaches the seed, so everyone reads offline there, as after a
// restart (ADR-0003 Consequences).
@Injectable()
export class OfflinePresenceReader extends PresenceReader {
  isOnline(): boolean {
    return false;
  }
}
