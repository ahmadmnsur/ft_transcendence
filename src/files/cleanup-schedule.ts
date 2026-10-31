import { Injectable, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { AppLogger, errorFields } from '../core/logger';
import { FileCleanup } from './cleanup';

const HOUR_MS = 60 * 60 * 1000;

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

  private async runOnce(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const deleted = (await this.cleanup.run()).filter((result) => result.deleted > 0);
      if (deleted.length > 0) this.logger.entry('log', { message: 'file cleanup', deleted });
    } catch (err) {
      this.logger.entry('error', { operation: 'file-cleanup', ...errorFields(err) });
    } finally {
      this.running = false;
    }
  }
}
