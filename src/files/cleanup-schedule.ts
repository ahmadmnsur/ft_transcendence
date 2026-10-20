import { Injectable, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { AppLogger, errorFields } from '../core/logger';
import { FileCleanup } from './cleanup';

const HOUR_MS = 60 * 60 * 1000;

// §9.8: the cleanup runs when the `api` starts and every hour while it runs.
// The start's run is not awaited, so it never holds up or stops the boot, and
// a failed run is only logged and waits for the next. Only AppModule
// provides this: the seed's context never runs it, and the test harness
// replaces it, since there `08-files` calls the cleanup itself (§16.2).
@Injectable()
export class FileCleanupSchedule implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly cleanup: FileCleanup,
    private readonly logger: AppLogger,
  ) {}

  onApplicationBootstrap(): void {
    void this.runOnce();
    this.timer = setInterval(() => void this.runOnce(), HOUR_MS);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
  }

  // A run still going an hour later is left to finish; the next waits.
  private async runOnce(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      // §3.9: one line, and only for a run that deleted a file.
      const deleted = (await this.cleanup.run()).filter((result) => result.deleted > 0);
      if (deleted.length > 0) this.logger.entry('log', { message: 'file cleanup', deleted });
    } catch (err) {
      // errorFields carries a StorageError's call and status as `reason`.
      this.logger.entry('error', { operation: 'file-cleanup', ...errorFields(err) });
    } finally {
      this.running = false;
    }
  }
}
