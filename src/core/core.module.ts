import { Global, Module, ValidationPipe } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { PresenceRegistry } from '../realtime/presence-registry';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { RealtimeModule } from '../realtime/realtime.module';
import { AppConfig } from './app-config';
import { Clock, SystemClock } from './clock';
import { ConfigController } from './config.controller';
import { JsonMutationGuard, UploadCsrfGuard } from './csrf.guards';
import { EnvelopeInterceptor } from './envelope';
import { ApiExceptionFilter } from './exception.filter';
import { AppLogger } from './logger';
import { OfflinePresenceReader, PresenceReader } from './presence-reader';
import { PrismaService } from './prisma.service';
import { NoopRealtimePublisher, RealtimePublisher } from './realtime-publisher';
import { RolesGuard } from './roles.guard';
import { SessionResolver } from './session-resolver';
import { SessionGuard } from './session.guard';
import { SupabaseAuthClient } from './supabase-auth';
import { SupabaseStorageClient } from './supabase-storage';
import { ThrottleStore } from './throttle';
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
    SupabaseAuthClient,
    SupabaseStorageClient,
    SessionResolver,
    ThrottleStore,
    { provide: Clock, useClass: SystemClock },
    { provide: RealtimePublisher, useClass: NoopRealtimePublisher },
    { provide: PresenceReader, useClass: OfflinePresenceReader },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_GUARD, useClass: JsonMutationGuard },
    { provide: APP_GUARD, useClass: UploadCsrfGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [
    AppConfig,
    AppLogger,
    PrismaService,
    UnitOfWork,
    CheckpointHook,
    Clock,
    PresenceReader,
    RealtimePublisher,
    SupabaseAuthClient,
    SupabaseStorageClient,
    SessionResolver,
    ThrottleStore,
  ],
})
export class CoreModule {
  // What the app imports: the socket gateway implements RealtimePublisher,
  // and the Presence registry implements PresenceReader. The dynamic
  // providers are inserted after the decorator's, so they replace the no-op
  // and the offline reader for every module that injects the ports —
  // AuthModule and SocialModule included — while a plain `imports:
  // [CoreModule]` (the seed) keeps both (§3.7, §7.4, §7.6).
  static forApp(): DynamicModule {
    return {
      module: CoreModule,
      imports: [RealtimeModule],
      providers: [
        { provide: RealtimePublisher, useExisting: RealtimeGateway },
        { provide: PresenceReader, useExisting: PresenceRegistry },
      ],
    };
  }
}
