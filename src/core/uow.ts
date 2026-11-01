import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { Clock } from './clock';
import { ConcurrencyExhausted, Refusal, type RefusalSpec } from './errors';
import { AppLogger, errorFields } from './logger';
import { PrismaService } from './prisma.service';

export type PrismaTx = Prisma.TransactionClient;

export type TxContext = {
  now: Date;
  checkpoint(name: string): Promise<void>;
  afterCommit(effect: () => void): void;
};

export type Operation = {
  name: string;
  uniqueRefusals?: Readonly<Record<string, RefusalSpec>>;
  retryUniqueOn?: readonly string[];
};

@Injectable()
export class CheckpointHook {
  async reach(_name: string, _attempt: number): Promise<void> {}
}

export class NestedTransactionError extends Error {}

const MAX_ATTEMPTS = 10;
const LIMITS = { maxWait: 5000, timeout: 15000 };

type DriverCause = { originalCode?: string; constraint?: { index?: string } };

function driverCause(err: unknown): DriverCause | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const e = err as { name?: unknown; cause?: unknown; meta?: { driverAdapterError?: unknown } };
  if (e.name === 'DriverAdapterError' && typeof e.cause === 'object' && e.cause !== null) {
    return e.cause as DriverCause;
  }
  return e.meta === undefined ? undefined : driverCause(e.meta.driverAdapterError);
}

function isWriteConflict(err: unknown): boolean {
  if ((err as { code?: unknown } | null)?.code === 'P2034') return true;
  const sqlState = driverCause(err)?.originalCode;
  return sqlState === '40001' || sqlState === '40P01';
}

function uniqueViolation(err: unknown): string | null {
  const cause = driverCause(err);
  return cause?.originalCode === '23505' ? (cause.constraint?.index ?? null) : null;
}

function backoff(attempt: number): Promise<void> {
  const ms = (5 + Math.random() * 20) * attempt;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class UnitOfWork {
  private readonly active = new AsyncLocalStorage<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
    private readonly checkpoints: CheckpointHook,
    private readonly logger: AppLogger,
  ) {}

  async run<T>(
    operation: string | Operation,
    work: (tx: PrismaTx, ctx: TxContext) => Promise<T>,
  ): Promise<T> {
    const op = typeof operation === 'string' ? { name: operation } : operation;
    this.refuseNesting(op.name);
    for (let attempt = 1; ; attempt++) {
      const effects: Array<() => void> = [];
      const ctx: TxContext = {
        now: this.clock.now(),
        checkpoint: (name) => this.checkpoints.reach(name, attempt),
        afterCommit: (effect) => {
          effects.push(effect);
        },
      };
      let result: T;
      try {
        result = await this.active.run(op.name, () =>
          this.prisma.$transaction((tx) => work(tx, ctx), {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            ...LIMITS,
          }),
        );
      } catch (err) {
        const constraint = uniqueViolation(err);
        const retry =
          isWriteConflict(err) || (constraint !== null && op.retryUniqueOn?.includes(constraint) === true);
        if (retry) {
          if (attempt === MAX_ATTEMPTS) throw new ConcurrencyExhausted(op.name);
          await backoff(attempt);
          continue;
        }
        const refusal = constraint === null ? undefined : op.uniqueRefusals?.[constraint];
        if (refusal !== undefined) throw new Refusal(refusal.code, refusal.message);
        throw err;
      }
      this.flush(op.name, effects);
      return result;
    }
  }

  async readOnly<T>(work: (tx: PrismaTx) => Promise<T>): Promise<T> {
    this.refuseNesting('readOnly');
    return this.active.run('readOnly', () =>
      this.prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SET TRANSACTION READ ONLY`;
          return work(tx);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, ...LIMITS },
      ),
    );
  }

  private refuseNesting(name: string): void {
    const outer = this.active.getStore();
    if (outer !== undefined) throw new NestedTransactionError(`${name} nested inside ${outer}`);
  }

  private flush(operation: string, effects: Array<() => void>): void {
    const report = (err: unknown): void => {
      try {
        this.logger.entry('error', { operation, afterCommit: true, ...errorFields(err) });
      } catch {
      }
    };
    for (const effect of effects) {
      try {
        const result: unknown = effect();
        if (result instanceof Promise) result.catch(report);
      } catch (err) {
        report(err);
      }
    }
  }
}
