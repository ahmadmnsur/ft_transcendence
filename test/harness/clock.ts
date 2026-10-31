import { Clock } from '../../src/core/clock';

export class TestClock extends Clock {
  private offsetMs = 0;
  private stoppedAt: number | null = null;

  now(): Date {
    return new Date(this.stoppedAt ?? Date.now() + this.offsetMs);
  }

  advance(ms: number): void {
    if (this.stoppedAt === null) this.offsetMs += ms;
    else this.stoppedAt += ms;
  }

  stopAt(at: Date): void {
    this.stoppedAt = at.getTime();
  }

  reset(): void {
    this.offsetMs = 0;
    this.stoppedAt = null;
  }
}
