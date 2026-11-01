import { CheckpointHook } from '../../src/core/uow';

type Release = () => void;
type Reject = (reason: Error) => void;
type HeldArrival = { resolve: Release; reject: Reject };
type ArrivedWatcher = { count: number; resolve: () => void };

class Barrier {
  armed = false;
  private readonly held: HeldArrival[] = [];
  private readonly watchers: ArrivedWatcher[] = [];

  constructor(private readonly name: string) {}

  hold(): Promise<void> {
    return new Promise((resolveHold, rejectHold) => {
      this.held.push({ resolve: resolveHold, reject: rejectHold });
      this.notify();
    });
  }

  waitFor(count: number): Promise<void> {
    if (this.held.length >= count) return Promise.resolve();
    return new Promise((resolveArrival) => {
      this.watchers.push({ count, resolve: resolveArrival });
    });
  }

  releaseOne(): void {
    this.releaseAt(0);
  }

  releaseAt(index: number): void {
    if (index < 0 || index >= this.held.length) {
      throw new Error(
        `No arrival held at barrier "${this.name}" index ${index} (${this.held.length} held).`,
      );
    }
    this.held.splice(index, 1)[0]?.resolve();
  }

  releaseAll(): void {
    for (const arrival of this.held.splice(0, this.held.length)) arrival.resolve();
  }

  rejectAll(): void {
    for (const arrival of this.held.splice(0, this.held.length)) {
      arrival.reject(
        new Error(`Barrier "${this.name}" still held this arrival when the test ended.`),
      );
    }
  }

  get arrived(): number {
    return this.held.length;
  }

  private notify(): void {
    for (let i = this.watchers.length - 1; i >= 0; i--) {
      const watcher = this.watchers[i];
      if (watcher !== undefined && this.held.length >= watcher.count) {
        this.watchers.splice(i, 1);
        watcher.resolve();
      }
    }
  }
}

export class BarrierRegistry extends CheckpointHook {
  private readonly barriers = new Map<string, Barrier>();

  private barrier(name: string): Barrier {
    let barrier = this.barriers.get(name);
    if (barrier === undefined) {
      barrier = new Barrier(name);
      this.barriers.set(name, barrier);
    }
    return barrier;
  }

  arm(name: string): void {
    this.barrier(name).armed = true;
  }

  disarm(name: string): void {
    const barrier = this.barriers.get(name);
    if (barrier !== undefined) barrier.armed = false;
  }

  isArmed(name: string): boolean {
    return this.barriers.get(name)?.armed ?? false;
  }

  arrived(name: string): number {
    return this.barriers.get(name)?.arrived ?? 0;
  }

  waitFor(name: string, count: number): Promise<void> {
    return this.barrier(name).waitFor(count);
  }

  release(name: string): void {
    this.barrier(name).releaseOne();
  }

  releaseAt(name: string, index: number): void {
    this.barrier(name).releaseAt(index);
  }

  releaseAll(name: string): void {
    this.barriers.get(name)?.releaseAll();
  }

  async reach(name: string, attempt: number): Promise<void> {
    const barrier = this.barriers.get(name);
    if (barrier === undefined || !barrier.armed || attempt > 1) return;
    await barrier.hold();
  }

  reset(): void {
    for (const barrier of this.barriers.values()) barrier.rejectAll();
    this.barriers.clear();
  }
}
