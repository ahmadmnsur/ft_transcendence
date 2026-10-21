import { Controller, Get, Req, Res, StreamableFile } from '@nestjs/common';
import type { Request, Response } from 'express';
import { requestActor, requestRole } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { FilesService } from './files.service';

// `inline; filename="<name>"` (§6.3). A header carries printable ASCII only,
// so a name with anything else, or with `"` or `\`, is written as RFC 6266
// writes it: a quoted name with each such character as `_`, then the whole
// name in UTF-8 as `filename*`, which browsers read first.
function inlineDisposition(filename: string): string {
  const fallback = filename.replace(/[^ -~]|["\\]/gu, '_');
  if (fallback === filename) return `inline; filename="${filename}"`;
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

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

  // `GET /api/files/evidence/:token`: shown in the page, a PDF in its
  // `<iframe>` (§9.7), under its sanitised name, with the row's canonical
  // type and `nosniff`. Revalidated on every use: who may read it can change.
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
