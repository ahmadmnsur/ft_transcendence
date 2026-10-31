import { Controller, Get, Req, Res, StreamableFile } from '@nestjs/common';
import type { Request, Response } from 'express';
import { requestActor, requestRole } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { FilesService } from './files.service';

function inlineDisposition(filename: string): string {
  const fallback = filename.replace(/[^ -~]|["\\]/gu, '_');
  if (fallback === filename) return `inline; filename="${filename}"`;
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

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

  @Get('evidence/:token')
  async evidence(
    @UuidParam('token') token: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.files.readEvidence(requestActor(request), requestRole(request), token);
    response.setHeader('Content-Disposition', inlineDisposition(file.filename));
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'private, no-cache');
    return new StreamableFile(file.bytes, { type: file.mime, length: file.bytes.length });
  }
}
