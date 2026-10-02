import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './core/configure-app';
import { assertEnvOrExit } from './core/env';
import { AppLogger, errorFields } from './core/logger';

// Node's default report prints the message, which can embed argument values
// (§3.9); log it the filter's way, then exit as Node would.
function exitOnUncaught(kind: string): (err: unknown) => void {
  const logger = new AppLogger();
  return (err: unknown): void => {
    logger.entry('error', { [kind]: true, ...errorFields(err) });
    process.exit(1);
  };
}

process.on('uncaughtException', exitOnUncaught('uncaughtException'));
process.on('unhandledRejection', exitOnUncaught('unhandledRejection'));

async function bootstrap(): Promise<void> {
  assertEnvOrExit(process.env);
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  configureApp(app);
  await app.listen(3000, '0.0.0.0');
}

void bootstrap();
