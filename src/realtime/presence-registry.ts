import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PresenceReader } from '../core/presence-reader';
import type { RevokeTarget } from '../core/realtime-publisher';

export const PRESENCE_GRACE_MS = 20_000;

export type PresenceTransition = { studentId: string; online: boolean };

export type PresenceListener = (transition: PresenceTransition) => void;

@Injectable()
export class PresenceRegistry extends PresenceReader implements OnModuleDestroy {
  private readonly bindings = new Map<string, { studentId: string; sessionHash: string }>();
  private readonly present = new Map<string, Set<string>>();
  private readonly grace = new Map<string, NodeJS.Timeout>();
  private listener: PresenceListener | null = null;
  private destroyed = false;

  setListener(listener: PresenceListener): void {
    this.listener = listener;
  }

  register(socketId: string, studentId: string, sessionHash: string): void {
    this.bindings.set(socketId, { studentId, sessionHash });
  }

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
      clearTimeout(timer);
      this.grace.delete(binding.studentId);
      return;
    }
    this.notify(binding.studentId, true);
  }

  disconnect(socketId: string): void {
    const binding = this.bindings.get(socketId);
    if (binding === undefined) return;
    this.bindings.delete(socketId);
    const sockets = this.present.get(binding.studentId);
    if (sockets === undefined || !sockets.delete(socketId)) return;
    if (sockets.size > 0) return;
    this.present.delete(binding.studentId);
    if (this.destroyed) return;
    const { studentId } = binding;
    const timer = setTimeout(() => {
      this.grace.delete(studentId);
      if ((this.present.get(studentId)?.size ?? 0) > 0) return;
      this.notify(studentId, false);
    }, PRESENCE_GRACE_MS);
    timer.unref();
    this.grace.set(studentId, timer);
  }

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

  override isOnline(studentId: string): boolean {
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
    if (this.destroyed) return;
    this.listener?.({ studentId, online });
  }
}
