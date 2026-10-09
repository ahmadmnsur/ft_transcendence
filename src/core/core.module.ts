import { Global, Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppConfig } from './app-config';
import { Clock, SystemClock } from './clock';
import { ConfigController } from './config.controller';
import { JsonMutationGuard, UploadCsrfGuard } from './csrf.guards';
import { EnvelopeInterceptor } from './envelope';
import { ApiExceptionFilter } from './exception.filter';
import { AppLogger } from './logger';
import { PrismaService } from './prisma.service';
import { NoopRealtimePublisher, RealtimePublisher } from './realtime-publisher';
import { CheckpointHook, UnitOfWork } from './uow';

// The machinery every slice uses. Global, so a slice's module injects these
// without importing it.
@Global()
@Module({
  controllers: [ConfigController],
  providers: [
    AppConfig,
    AppLogger,
    PrismaService,
    UnitOfWork,
    CheckpointHook,
    { provide: Clock, useClass: SystemClock },
    { provide: RealtimePublisher, useClass: NoopRealtimePublisher },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_GUARD, useClass: JsonMutationGuard },
    { provide: APP_GUARD, useClass: UploadCsrfGuard },
  ],
  exports: [AppConfig, AppLogger, PrismaService, UnitOfWork, CheckpointHook, Clock, RealtimePublisher],
})
export class CoreModule {}
