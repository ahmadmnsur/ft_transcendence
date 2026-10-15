import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FortyTwoClient } from './forty-two-client';
import { FortyTwoController } from './forty-two.controller';
import { FortyTwoService } from './forty-two.service';
import { OAuthAttemptStore } from './oauth-attempt-store';
import { PasswordChangeLock } from './password-change';
import { SessionController } from './session.controller';

// §3.4's `auth` module: `Session`, the OAuth attempt store, the password
// check, the four account routes, the session route and §5.6's 42 transport.
@Module({
  controllers: [AuthController, SessionController, FortyTwoController],
  providers: [AuthService, PasswordChangeLock, OAuthAttemptStore, FortyTwoClient, FortyTwoService],
})
export class AuthModule {}
