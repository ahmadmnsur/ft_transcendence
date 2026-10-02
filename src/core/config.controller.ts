import { Controller, Get } from '@nestjs/common';
import { AppConfig } from './app-config';

// GET /api/config, public (§6.1).
@Controller('config')
export class ConfigController {
  constructor(private readonly config: AppConfig) {}

  @Get()
  get(): { publicOrigin: string; oauth42Enabled: boolean } {
    return { publicOrigin: this.config.publicOrigin, oauth42Enabled: this.config.oauth42Enabled };
  }
}
