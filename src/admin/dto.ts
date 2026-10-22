import { IsIn, IsOptional, IsString } from 'class-validator';
import { Trimmed } from '../auth/dto';
import { PageQueryDto } from '../core/paging';
import { ROLES, type Role } from '../shared/roles';
import { STUDENT_STATUSES, type StudentStatus } from '../shared/student-status';
import { IsValidSearchQueryDto, SEARCH_ORDERS, type SearchOrder } from '../students/dto';

// §6.12's DTOs. The edits reuse §6.2's own (`UpdateProfileDto`, `SkillsDto`,
// `LearningGoalDto`), since an Admin edits exactly what the Student could.

export const USER_SORTS = ['name', 'email'] as const;
export type UserSort = (typeof USER_SORTS)[number];

// `GET /api/admin/students` (§6.12; paging §6.0.1, from PageQueryDto). Every
// field is optional; an absent one keeps its default. The global pipe refuses
// an unknown parameter, and a repeated one arrives as an array and fails its
// validator.
export class AdminStudentsQueryDto extends PageQueryDto {
  // Absent, or empty after trimming, is no filter; 0–60 characters after
  // trimming, as Advanced search's (§6.0.3).
  @IsOptional()
  @IsString()
  @Trimmed()
  @IsValidSearchQueryDto()
  q?: string;

  @IsOptional()
  @IsIn(ROLES)
  role?: Role;

  @IsOptional()
  @IsIn(STUDENT_STATUSES)
  status?: StudentStatus;

  @IsOptional()
  @IsIn(USER_SORTS)
  sort: UserSort = 'name';

  @IsOptional()
  @IsIn(SEARCH_ORDERS)
  order: SearchOrder = 'asc';
}

// `POST /api/admin/students/:id/role` (§12.7).
export class ChangeRoleDto {
  @IsIn(ROLES)
  role!: Role;
}
