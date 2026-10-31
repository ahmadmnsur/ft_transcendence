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
import type { StudentStatus } from '../shared/student-status';
import { LearningGoalDto, SkillsDto, UpdateProfileDto } from '../students/dto';
import type { LearningGoalView } from '../students/views';
import { AdminUsersService } from './admin-users.service';
import { AdminStudentsQueryDto, ChangeRoleDto } from './dto';
import type { AdminStudentDetail, AdminStudentPage } from './views';

@Controller('admin/students')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  listUsers(@Query() query: AdminStudentsQueryDto, @Req() request: Request): Promise<AdminStudentPage> {
    return this.users.listUsers(requestActor(request), query);
  }

  @Get(':id')
  getUser(@UuidParam('id') id: string, @Req() request: Request): Promise<AdminStudentDetail> {
    return this.users.getUser(requestActor(request), id);
  }

  @Patch(':id')
  editUser(
    @UuidParam('id') id: string,
    @Body() dto: UpdateProfileDto,
    @Req() request: Request,
  ): Promise<AdminStudentDetail> {
    return this.users.editUser(requestActor(request), id, dto);
  }

  @Put(':id/skills')
  setSkills(
    @UuidParam('id') id: string,
    @Body() dto: SkillsDto,
    @Req() request: Request,
  ): Promise<{ goalCleared: boolean }> {
    return this.users.setSkills(requestActor(request), id, dto.teach, dto.learn);
  }

  @Put(':id/learning-goal')
  setLearningGoal(
    @UuidParam('id') id: string,
    @Body() dto: LearningGoalDto,
    @Req() request: Request,
  ): Promise<LearningGoalView> {
    return this.users.setLearningGoal(requestActor(request), id, dto.skillId, dto.text);
  }

  @Delete(':id/learning-goal')
  clearLearningGoal(@UuidParam('id') id: string, @Req() request: Request): Promise<Record<string, never>> {
    return this.users.clearLearningGoal(requestActor(request), id);
  }

  @Put(':id/avatar')
  @UseInterceptors(FileUpload(LIMITS.avatar.maxBytes))
  putAvatar(
    @UuidParam('id') id: string,
    @UploadedFile() file: UploadedPart | undefined,
    @Req() request: Request,
  ): Promise<{ avatarUrl: string | null }> {
    return this.users.putAvatar(requestActor(request), id, file);
  }

  @Delete(':id/avatar')
  deleteAvatar(@UuidParam('id') id: string, @Req() request: Request): Promise<Record<string, never>> {
    return this.users.deleteAvatar(requestActor(request), id);
  }

  @Post(':id/role')
  @HttpCode(200)
  changeRole(
    @UuidParam('id') id: string,
    @Body() dto: ChangeRoleDto,
    @Req() request: Request,
  ): Promise<{ role: Role }> {
    return this.users.changeRole(requestActor(request), id, dto.role);
  }

  @Post(':id/suspend')
  @HttpCode(200)
  suspend(@UuidParam('id') id: string, @Req() request: Request): Promise<{ status: StudentStatus }> {
    return this.users.suspend(requestActor(request), id);
  }

  @Post(':id/reinstate')
  @HttpCode(200)
  reinstate(@UuidParam('id') id: string, @Req() request: Request): Promise<{ status: StudentStatus }> {
    return this.users.reinstate(requestActor(request), id);
  }

  @Post(':id/remove')
  @HttpCode(200)
  remove(@UuidParam('id') id: string, @Req() request: Request): Promise<{ status: StudentStatus }> {
    return this.users.remove(requestActor(request), id);
  }
}
