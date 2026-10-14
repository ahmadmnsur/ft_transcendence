import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './core/configure-app';
import { assertEnvOrExit } from './core/env';
import { exitOnUncaught } from './core/logger';

process.on('uncaughtException', exitOnUncaught('uncaughtException'));
process.on('unhandledRejection', exitOnUncaught('unhandledRejection'));

async function bootstrap(): Promise<void> {
  assertEnvOrExit(process.env);
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  configureApp(app);
  await app.listen(3000, '0.0.0.0');
}

void bootstrap();
