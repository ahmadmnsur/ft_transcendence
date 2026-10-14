import { Injectable } from '@nestjs/common';
import { Clock } from './clock';

// §5.5: the throttle. In-memory only, never persisted, never logged; at most
// 10,000 keys, oldest evicted; lost on restart. Enforced at the HTTP
// boundary, never inside a service: the service tells the boundary whether a
// refusal counts (a `CountedRefusal`), and the boundary settles the slot.
//
// A slot is reserved synchronously before any credential check, so parallel
// requests cannot all slip past: counted attempts in the window plus
// in-flight reservations reaching 5 refuses the next one before it checks
// anything. The slot is settled exactly once afterwards — a counted refusal
// turns it into a counted attempt, anything else releases it — with the
// release in a `finally`, so no path leaks a slot.
const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 5;
const MAX_KEYS = 10_000;

export type ThrottleSlot = { key: string; settled: boolean };

type Bucket = { counted: number[]; inflight: number };

@Injectable()
export class ThrottleStore {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly clock: Clock) {}

  // The key: client address + "|" + normalised email, never the address
  // alone (§5.5). The address is the `X-Real-IP` value, or the empty string
  // when absent; `req.ip` and `trust proxy` are unused (M9).
  static key(clientAddress: string, normalisedEmail: string): string {
    return `${clientAddress}|${normalisedEmail}`;
  }

  static clientAddress(header: string | string[] | undefined): string {
    return typeof header === 'string' ? header : '';
  }

  // Takes an in-flight slot, or null when 5 counted attempts are inside the
  // window: the attempt is refused before any credential check and is itself
  // not counted.
  reserve(key: string): ThrottleSlot | null {
    const now = this.clock.now().getTime();
    let bucket = this.buckets.get(key);
    if (bucket === undefined) {
      bucket = { counted: [], inflight: 0 };
      this.buckets.set(key, bucket);
    } else {
      bucket.counted = bucket.counted.filter((at) => at > now - WINDOW_MS);
    }
    if (bucket.counted.length + bucket.inflight >= LIMIT) return null;
    bucket.inflight += 1;
    // Refresh recency so the eviction below drops the oldest key.
    this.buckets.delete(key);
    this.buckets.set(key, bucket);
    while (this.buckets.size > MAX_KEYS) {
      const oldest = this.buckets.keys().next();
      if (oldest.done === true) break;
      this.buckets.delete(oldest.value);
    }
    return { key, settled: false };
  }

  // Records a counted refusal against the slot's key. Idempotent with
  // `release`: the slot settles exactly once.
  settleCounted(slot: ThrottleSlot): void {
    if (slot.settled) return;
    slot.settled = true;
    const bucket = this.buckets.get(slot.key);
    if (bucket === undefined) return;
    bucket.inflight = Math.max(0, bucket.inflight - 1);
    bucket.counted.push(this.clock.now().getTime());
  }

  // Frees the slot without counting anything. Idempotent with
  // `settleCounted`; empty buckets are dropped.
  release(slot: ThrottleSlot): void {
    if (slot.settled) return;
    slot.settled = true;
    const bucket = this.buckets.get(slot.key);
    if (bucket === undefined) return;
    bucket.inflight = Math.max(0, bucket.inflight - 1);
    if (bucket.inflight === 0 && bucket.counted.length === 0) this.buckets.delete(slot.key);
  }
}
