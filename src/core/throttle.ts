import { Injectable } from '@nestjs/common';
import { Clock } from './clock';

const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 5;
const MAX_KEYS = 10_000;

export type ThrottleSlot = { key: string; settled: boolean };

type Bucket = { counted: number[]; inflight: number };

@Injectable()
export class ThrottleStore {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly clock: Clock) {}

  static key(clientAddress: string, normalisedEmail: string): string {
    return `${clientAddress}|${normalisedEmail}`;
  }

  static clientAddress(header: string | string[] | undefined): string {
    return typeof header === 'string' ? header : '';
  }

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
    this.buckets.delete(key);
    this.buckets.set(key, bucket);
    while (this.buckets.size > MAX_KEYS) {
      const oldest = this.buckets.keys().next();
      if (oldest.done === true) break;
      this.buckets.delete(oldest.value);
    }
    return { key, settled: false };
  }

  settleCounted(slot: ThrottleSlot): void {
    if (slot.settled) return;
    slot.settled = true;
    const bucket = this.buckets.get(slot.key);
    if (bucket === undefined) return;
    bucket.inflight = Math.max(0, bucket.inflight - 1);
    bucket.counted.push(this.clock.now().getTime());
  }

  release(slot: ThrottleSlot): void {
    if (slot.settled) return;
    slot.settled = true;
    const bucket = this.buckets.get(slot.key);
    if (bucket === undefined) return;
    bucket.inflight = Math.max(0, bucket.inflight - 1);
    if (bucket.inflight === 0 && bucket.counted.length === 0) this.buckets.delete(slot.key);
  }
}
