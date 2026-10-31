import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FortyTwoClient } from './forty-two-client';
import { FortyTwoController } from './forty-two.controller';
import { FortyTwoService } from './forty-two.service';
import { OAuthAttemptStore } from './oauth-attempt-store';
import { PasswordChangeLock } from './password-change';
import { SessionController } from './session.controller';

@Module({
  controllers: [AuthController, SessionController, FortyTwoController],
  providers: [AuthService, PasswordChangeLock, OAuthAttemptStore, FortyTwoClient, FortyTwoService],
})
export class AuthModule {}
