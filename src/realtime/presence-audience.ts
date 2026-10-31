export abstract class PresenceAudience {
  abstract recipients(studentId: string): Promise<readonly string[]>;
}
