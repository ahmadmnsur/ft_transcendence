import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
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
import { AvatarsService } from './avatars.service';
import { LearningGoalDto, SearchStudentsQueryDto, SkillsDto, UpdateProfileDto } from './dto';
import { StudentsService } from './students.service';
import type {
  LearningGoalView,
  OwnProfile,
  PublicProfile,
  SkillView,
  StudentSearchPage,
} from './views';

@Controller()
export class StudentsController {
  constructor(
    private readonly students: StudentsService,
    private readonly avatars: AvatarsService,
  ) {}

  @Get('skills')
  listSkills(@Req() request: Request): Promise<{ items: SkillView[] }> {
    return this.students.listSkills(requestActor(request));
  }

  @Get('me')
  getOwnProfile(@Req() request: Request): Promise<OwnProfile> {
    return this.students.getOwnProfile(requestActor(request));
  }

  @Get('students')
  search(@Query() query: SearchStudentsQueryDto, @Req() request: Request): Promise<StudentSearchPage> {
    return this.students.search(requestActor(request), query);
  }

  @Get('students/:id')
  getProfile(@UuidParam('id') id: string, @Req() request: Request): Promise<PublicProfile> {
    return this.students.getProfile(requestActor(request), id);
  }

  @Patch('me')
  updateOwnProfile(@Body() dto: UpdateProfileDto, @Req() request: Request): Promise<OwnProfile> {
    return this.students.updateOwnProfile(requestActor(request), dto);
  }

  @Put('me/skills')
  setSkills(@Body() dto: SkillsDto, @Req() request: Request): Promise<{ goalCleared: boolean }> {
    return this.students.setSkills(requestActor(request), dto.teach, dto.learn);
  }

  @Put('me/learning-goal')
  setLearningGoal(@Body() dto: LearningGoalDto, @Req() request: Request): Promise<LearningGoalView> {
    return this.students.setLearningGoal(requestActor(request), dto.skillId, dto.text);
  }

  @Delete('me/learning-goal')
  clearLearningGoal(@Req() request: Request): Promise<Record<string, never>> {
    return this.students.clearLearningGoal(requestActor(request));
  }

  @Put('me/avatar')
  @UseInterceptors(FileUpload(LIMITS.avatar.maxBytes))
  putAvatar(
    @UploadedFile() file: UploadedPart | undefined,
    @Req() request: Request,
  ): Promise<{ avatarUrl: string | null }> {
    return this.avatars.putAvatar(requestActor(request), file);
  }

  @Delete('me/avatar')
  deleteAvatar(@Req() request: Request): Promise<Record<string, never>> {
    return this.avatars.deleteAvatar(requestActor(request));
  }
}
