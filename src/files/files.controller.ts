import { Controller, Get, Req, Res, StreamableFile } from '@nestjs/common';
import type { Request, Response } from 'express';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { FilesService } from './files.service';

// §6.3's file routes. Not `@Public`: the global SessionGuard answers 401
// when signed out (§5.3). A malformed token is 400 (`UuidParam`).
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  // `GET /api/files/avatars/:token`: the row's canonical type, `nosniff`
  // (§3.10) and a day's private cache, since a replaced avatar gets a new
  // token and so a new URL (§4.3.3).
  @Get('avatars/:token')
  async avatar(
    @UuidParam('token') token: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.files.readAvatar(requestActor(request), token);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'private, max-age=86400, immutable');
    return new StreamableFile(file.bytes, { type: file.mime, length: file.bytes.length });
  }
}
