// §7.6: who a Presence transition is broadcast to — a Student's accepted
// Friends, Removed excluded. The gateway asks for the recipients when it
// broadcasts, so a lookup that fails drops that one broadcast and nothing
// else. The `social` module, which owns `Friendship`, implements it
// (`FriendsPresenceAudience`).
export abstract class PresenceAudience {
  abstract recipients(studentId: string): Promise<readonly string[]>;
}
