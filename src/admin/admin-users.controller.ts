import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { FileUpload } from '../files/upload.interceptor';
import type { UploadedPart } from '../files/validate';
import { LIMITS } from '../shared/limits';
import type { Role } from '../shared/roles';
import { LearningGoalDto, SkillsDto, UpdateProfileDto } from '../students/dto';
import type { LearningGoalView } from '../students/views';
import { AdminUsersService } from './admin-users.service';
import { AdminStudentsQueryDto, ChangeRoleDto } from './dto';
import type { AdminStudentDetail, AdminStudentPage } from './views';

// §6.12: the Users table and its actions. The global RolesGuard answers 403
// to anyone but an Admin on `/api/admin/*` (§5.3); every write re-reads the
// actor's role and flags inside its transaction all the same (§3.4). The
// avatar upload passes UploadCsrfGuard first, as the owner's does (§5.4).
@Controller('admin/students')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  // `GET /api/admin/students`: the search term stays in the query string,
  // which no log records (§3.9).
  @Get()
  listUsers(@Query() query: AdminStudentsQueryDto, @Req() request: Request): Promise<AdminStudentPage> {
    return this.users.listUsers(requestActor(request), query);
  }

  // `GET /api/admin/students/:id`: a malformed id is 400, an unknown one 404.
  @Get(':id')
  getUser(@UuidParam('id') id: string, @Req() request: Request): Promise<AdminStudentDetail> {
    return this.users.getUser(requestActor(request), id);
  }

  // `PATCH /api/admin/students/:id`: display name and/or email.
  @Patch(':id')
  editUser(
    @UuidParam('id') id: string,
    @Body() dto: UpdateProfileDto,
    @Req() request: Request,
  ): Promise<AdminStudentDetail> {
    return this.users.editUser(requestActor(request), id, dto);
  }

  // `PUT /api/admin/students/:id/skills`: both lists, as §6.2's own.
  @Put(':id/skills')
  setSkills(
    @UuidParam('id') id: string,
    @Body() dto: SkillsDto,
    @Req() request: Request,
  ): Promise<{ goalCleared: boolean }> {
    return this.users.setSkills(requestActor(request), id, dto.teach, dto.learn);
  }

  // `PUT /api/admin/students/:id/learning-goal`, as §6.2's own.
  @Put(':id/learning-goal')
  setLearningGoal(
    @UuidParam('id') id: string,
    @Body() dto: LearningGoalDto,
    @Req() request: Request,
  ): Promise<LearningGoalView> {
    return this.users.setLearningGoal(requestActor(request), id, dto.skillId, dto.text);
  }

  // `DELETE /api/admin/students/:id/learning-goal`: clears both columns.
  @Delete(':id/learning-goal')
  clearLearningGoal(@UuidParam('id') id: string, @Req() request: Request): Promise<Record<string, never>> {
    return this.users.clearLearningGoal(requestActor(request), id);
  }

  // `PUT /api/admin/students/:id/avatar`: multipart field `file`, read by
  // Multer only after the guards.
  @Put(':id/avatar')
  @UseInterceptors(FileUpload(LIMITS.avatar.maxBytes))
  putAvatar(
    @UuidParam('id') id: string,
    @UploadedFile() file: UploadedPart | undefined,
    @Req() request: Request,
  ): Promise<{ avatarUrl: string | null }> {
    return this.users.putAvatar(requestActor(request), id, file);
  }

  // `DELETE /api/admin/students/:id/avatar`: `{}`, idempotent.
  @Delete(':id/avatar')
  deleteAvatar(@UuidParam('id') id: string, @Req() request: Request): Promise<Record<string, never>> {
    return this.users.deleteAvatar(requestActor(request), id);
  }

  // `POST /api/admin/students/:id/role` (§12.7). 200: it creates nothing
  // (§3.8.2).
  @Post(':id/role')
  @HttpCode(200)
  changeRole(
    @UuidParam('id') id: string,
    @Body() dto: ChangeRoleDto,
    @Req() request: Request,
  ): Promise<{ role: Role }> {
    return this.users.changeRole(requestActor(request), id, dto.role);
  }
}
