import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { RevokeTarget } from '../core/realtime-publisher';

// §7.6: how long a Student stays online after their last socket goes, so a
// reload does not flicker them out to their friends. An engineering default
// (ADR-0003 Consequences).
export const PRESENCE_GRACE_MS = 20_000;

export type PresenceTransition = { studentId: string; online: boolean };

// Where a transition goes. The gateway sets one; the registry never depends
// on it, so registry and gateway form no cycle.
export type PresenceListener = (transition: PresenceTransition) => void;

// §7.6: the process-local registry — `studentId → Set<socketId>` for
// Presence, plus the socket bindings a forced disconnect needs. Never
// stored anywhere, and nothing records when anyone was last online: a
// restart reads everyone offline (ADR-0003 Consequences, `CONTEXT.md`).
@Injectable()
export class PresenceRegistry implements OnModuleDestroy {
  private readonly bindings = new Map<string, { studentId: string; sessionHash: string }>();
  private readonly present = new Map<string, Set<string>>();
  private readonly grace = new Map<string, NodeJS.Timeout>();
  private listener: PresenceListener | null = null;
  private destroyed = false;

  setListener(listener: PresenceListener): void {
    this.listener = listener;
  }

  // §7.2 step 3's first act, before the session re-read: the binding exists
  // even for a handshake that never activates, which is what lets a revoking
  // commit sweep a socket that registered after it.
  register(socketId: string, studentId: string, sessionHash: string): void {
    this.bindings.set(socketId, { studentId, sessionHash });
  }

  // The socket enters the Presence set here, after the re-read and the room
  // joins (§7.2 step 3). A socket the disconnect handler already removed (the
  // re-read was in flight) is skipped, so a dead socket id never holds its
  // Student online.
  activate(socketId: string): void {
    const binding = this.bindings.get(socketId);
    if (binding === undefined) return;
    const sockets = this.present.get(binding.studentId) ?? new Set<string>();
    if (sockets.has(socketId)) return;
    const wasOffline = sockets.size === 0;
    sockets.add(socketId);
    this.present.set(binding.studentId, sockets);
    if (!wasOffline) return;
    const timer = this.grace.get(binding.studentId);
    if (timer !== undefined) {
      // §7.6: a pending grace timer is cancelled instead, with no broadcast.
      clearTimeout(timer);
      this.grace.delete(binding.studentId);
      return;
    }
    this.notify(binding.studentId, true);
  }

  // A gone socket, for whatever reason — a dropped connection, a client
  // disconnect or §7.5's forced disconnect: all take this path.
  disconnect(socketId: string): void {
    const binding = this.bindings.get(socketId);
    if (binding === undefined) return;
    this.bindings.delete(socketId);
    const sockets = this.present.get(binding.studentId);
    if (sockets === undefined || !sockets.delete(socketId)) return;
    if (sockets.size > 0) return;
    this.present.delete(binding.studentId);
    // §7.6's grace timer needs a live app: the socket server is closed after
    // `onModuleDestroy`, so its disconnects start no timer once destroyed.
    if (this.destroyed) return;
    const { studentId } = binding;
    const timer = setTimeout(() => {
      this.grace.delete(studentId);
      if ((this.present.get(studentId)?.size ?? 0) > 0) return;
      this.notify(studentId, false);
    }, PRESENCE_GRACE_MS);
    // A pending grace window must never hold `app.close()` or a test process
    // open.
    timer.unref();
    this.grace.set(studentId, timer);
  }

  // Every socket of a revocation target, activated or not (§7.5): a handshake
  // that registers after this sweep is caught by §7.2's re-read, because the
  // revoking commit deleted the session row first.
  socketIds(target: RevokeTarget): string[] {
    const ids: string[] = [];
    for (const [socketId, binding] of this.bindings) {
      const matches =
        'studentId' in target
          ? binding.studentId === target.studentId
          : binding.sessionHash === target.sessionHash;
      if (matches) ids.push(socketId);
    }
    return ids;
  }

  // What GET /api/friends reads later (§7.6). True while a socket is present,
  // and still true while a grace timer is pending (§7.6's note of 2026-10-18):
  // friends were never told offline for that window, and a reconnect inside it
  // broadcasts nothing, so this is exactly what they were last told.
  isOnline(studentId: string): boolean {
    return (this.present.get(studentId)?.size ?? 0) > 0 || this.grace.has(studentId);
  }

  onModuleDestroy(): void {
    this.destroyed = true;
    for (const timer of this.grace.values()) clearTimeout(timer);
    this.grace.clear();
    this.present.clear();
    this.bindings.clear();
  }

  private notify(studentId: string, online: boolean): void {
    // After destruction nothing is told anything: the disconnects that the
    // socket server's own close causes start no timer, and nothing else may
    // reach the listener either.
    if (this.destroyed) return;
    this.listener?.({ studentId, online });
  }
}
