import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CoreModule } from './core/core.module';
import { HealthController } from './health.controller';
import { StudentsModule } from './students/students.module';

@Module({
  imports: [CoreModule.forApp(), AuthModule, StudentsModule],
  controllers: [HealthController],
})
export class AppModule {}
