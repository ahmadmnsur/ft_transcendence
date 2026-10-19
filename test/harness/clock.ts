import { Clock } from '../../src/core/clock';

// The application's clock in the suite: real time, moved by a test that must
// not wait, such as `08-files`'s 30-minute rule and cleanup checks (§16.3).
// The harness binds it in place of SystemClock and sets it back to real
// time before every test.
export class TestClock extends Clock {
  private offsetMs = 0;
  // A stopped clock's reading, or null while it runs with real time.
  private stoppedAt: number | null = null;

  now(): Date {
    return new Date(this.stoppedAt ?? Date.now() + this.offsetMs);
  }

  advance(ms: number): void {
    if (this.stoppedAt === null) this.offsetMs += ms;
    else this.stoppedAt += ms;
  }

  // Stops the clock at `at`: `now()` reads exactly `at` until it is moved
  // again or reset.
  stopAt(at: Date): void {
    this.stoppedAt = at.getTime();
  }

  reset(): void {
    this.offsetMs = 0;
    this.stoppedAt = null;
  }
}
