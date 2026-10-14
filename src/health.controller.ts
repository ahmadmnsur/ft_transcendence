import { Controller, Get } from '@nestjs/common';
import { Public } from './core/session.guard';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
