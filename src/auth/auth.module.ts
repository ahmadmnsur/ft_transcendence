import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordChangeLock } from './password-change';
import { SessionController } from './session.controller';

// §3.4's `auth` module: `Session`, the password check, and the four account
// routes plus the session route.
@Module({
  controllers: [AuthController, SessionController],
  providers: [AuthService, PasswordChangeLock],
})
export class AuthModule {}
