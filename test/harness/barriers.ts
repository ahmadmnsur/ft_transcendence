import { CheckpointHook } from '../../src/core/uow';

type Release = () => void;
type Reject = (reason: Error) => void;
type HeldArrival = { resolve: Release; reject: Reject };
type ArrivedWatcher = { count: number; resolve: () => void };

// One named checkpoint. It holds the first arrival of an armed name until the
// test releases it; a retried attempt (attempt > 1) passes straight through, so
// the barrier never holds the same operation twice (§3.6.4).
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

  // Releases the arrival at `index`, counting the ones still held (it shifts
  // after each release). Throws when no arrival is held there.
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

  // Rejects every held arrival, so a run a finished test left held stops at its
  // pause instead of continuing into the next test (see reset()).
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

  // Stops holding new arrivals at the named barrier; ones already held stay
  // until released, so a test disarms when it releases its staged arrival
  // and everything after passes straight through.
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

  // Reject instead of release: a rejected run throws inside its transaction and
  // rolls back, and since that is not a write conflict the Unit of Work never
  // retries it; a service paused outside a transaction stops at its pause.
  reset(): void {
    for (const barrier of this.barriers.values()) barrier.rejectAll();
    this.barriers.clear();
  }
}
