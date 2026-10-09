import { CheckpointHook } from '../../src/core/uow';

type Release = () => void;
type ArrivedWatcher = { count: number; resolve: () => void };

// One named checkpoint. It holds the first arrival of an armed name until the
// test releases it; a retried attempt (attempt > 1) passes straight through, so
// the barrier never holds the same operation twice (§3.6.4).
class Barrier {
  armed = false;
  private readonly held: Release[] = [];
  private readonly watchers: ArrivedWatcher[] = [];

  constructor(private readonly name: string) {}

  hold(): Promise<void> {
    return new Promise((resolveHold) => {
      this.held.push(resolveHold);
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

  // Releases the arrival at `index`, counting the ones still held (it shifts
  // after each release). Throws when no arrival is held there.
  releaseAt(index: number): void {
    if (index < 0 || index >= this.held.length) {
      throw new Error(
        `No arrival held at barrier "${this.name}" index ${index} (${this.held.length} held).`,
      );
    }
    this.held.splice(index, 1)[0]?.();
  }

  releaseAll(): void {
    for (const release of this.held.splice(0, this.held.length)) release();
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

// The test side of the Unit of Work's `checkpoint` seam (§3.6.4). An unarmed
// name is a no-op; an armed name holds first arrivals so a test can stage two
// operations after their reads and before their writes, then release them.
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

  isArmed(name: string): boolean {
    return this.barriers.get(name)?.armed ?? false;
  }

  arrived(name: string): number {
    return this.barriers.get(name)?.arrived ?? 0;
  }

  // Resolves once `count` first arrivals are held at the named barrier.
  waitFor(name: string, count: number): Promise<void> {
    return this.barrier(name).waitFor(count);
  }

  // Releases the oldest held arrival. Throws when none is held.
  release(name: string): void {
    this.barrier(name).releaseOne();
  }

  // Releases the held arrival at `index`, which counts the arrivals still held (it shifts after each release).
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

  // Drops every barrier and releases whatever it still holds, so one test can
  // never leave another blocked.
  reset(): void {
    for (const barrier of this.barriers.values()) barrier.releaseAll();
    this.barriers.clear();
  }
}
