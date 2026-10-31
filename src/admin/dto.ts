import { IsIn, IsOptional, IsString } from 'class-validator';
import { Trimmed } from '../auth/dto';
import { PageQueryDto } from '../core/paging';
import { ROLES, type Role } from '../shared/roles';
import { STUDENT_STATUSES, type StudentStatus } from '../shared/student-status';
import { IsValidSearchQueryDto, SEARCH_ORDERS, type SearchOrder } from '../students/dto';


export const USER_SORTS = ['name', 'email'] as const;
export type UserSort = (typeof USER_SORTS)[number];

export class AdminStudentsQueryDto extends PageQueryDto {
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

export class ChangeRoleDto {
  @IsIn(ROLES)
  role!: Role;
}
