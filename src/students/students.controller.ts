import { Body, Controller, Delete, Get, Patch, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { requestActor } from '../core/session.guard';
import { UuidParam } from '../core/uuid-param';
import { LearningGoalDto, SkillsDto, UpdateProfileDto } from './dto';
import { StudentsService } from './students.service';
import type { LearningGoalView, OwnProfile, PublicProfile, SkillView } from './views';

// §3.4: controllers are thin — parse, validate the DTO, take the actor with
// `requestActor`, call ONE service method, and return its value. The global
// interceptor wraps it in the §3.8 envelope. Every route needs a session: the
// global SessionGuard already enforces it, so none is marked `@Public` (§5.3).
@Controller()
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  // `GET /api/skills` (§6.2): the whole catalogue, by name.
  @Get('skills')
  listSkills(@Req() request: Request): Promise<{ items: SkillView[] }> {
    return this.students.listSkills(requestActor(request));
  }

  // `GET /api/me` (§6.2): own profile; the only route that returns the email.
  @Get('me')
  getOwnProfile(@Req() request: Request): Promise<OwnProfile> {
    return this.students.getOwnProfile(requestActor(request));
  }

  // `GET /api/students/:id` (§6.2). A malformed id is 400 (`UuidParam`); an
  // unknown id is 404. Never an email, for any viewer (§4.6).
  @Get('students/:id')
  getProfile(@UuidParam('id') id: string, @Req() request: Request): Promise<PublicProfile> {
    return this.students.getProfile(requestActor(request), id);
  }

  // `PATCH /api/me` (§6.2): display name and/or email.
  @Patch('me')
  updateOwnProfile(@Body() dto: UpdateProfileDto, @Req() request: Request): Promise<OwnProfile> {
    return this.students.updateOwnProfile(requestActor(request), dto);
  }

  // `PUT /api/me/skills` (§6.2): replace both lists, keeping kept rows.
  @Put('me/skills')
  setSkills(@Body() dto: SkillsDto, @Req() request: Request): Promise<{ goalCleared: boolean }> {
    return this.students.setSkills(requestActor(request), dto.teach, dto.learn);
  }

  // `PUT /api/me/learning-goal` (§6.2).
  @Put('me/learning-goal')
  setLearningGoal(@Body() dto: LearningGoalDto, @Req() request: Request): Promise<LearningGoalView> {
    return this.students.setLearningGoal(requestActor(request), dto.skillId, dto.text);
  }

  // `DELETE /api/me/learning-goal` (§6.2): clears both columns.
  @Delete('me/learning-goal')
  clearLearningGoal(@Req() request: Request): Promise<Record<string, never>> {
    return this.students.clearLearningGoal(requestActor(request));
  }
}
