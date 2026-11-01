import { QueryInteger } from '../core/paging';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  IsValidDisplayNameDto,
  IsValidEmailDto,
  sharedValidator,
  Trimmed,
} from '../auth/dto';
import {
  LIMITS,
  PAGING,
  isValidLearningGoalText,
  isValidSearchQuery,
  normalizeEmail,
} from '../shared/limits';
import { isUuid } from '../shared/uuid';


export const IsValidLearningGoalTextDto = sharedValidator(
  'isValidLearningGoalText',
  isValidLearningGoalText,
);

export const IsValidSearchQueryDto = sharedValidator('isValidSearchQuery', isValidSearchQuery);

export const IsUuidDto = sharedValidator('isUuid', isUuid);

export class UpdateProfileDto {
  @ValidateIf((_dto, value) => value !== undefined)
  @IsString()
  @Trimmed()
  @IsValidDisplayNameDto()
  displayName?: string;

  @ValidateIf((_dto, value) => value !== undefined)
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  )
  @IsValidEmailDto()
  email?: string;
}

export class SkillsDto {
  @IsArray()
  @ArrayMaxSize(LIMITS.skillList.maxItems)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  teach!: string[];

  @IsArray()
  @ArrayMaxSize(LIMITS.skillList.maxItems)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  learn!: string[];
}

export class LearningGoalDto {
  @IsUUID()
  skillId!: string;

  @IsString()
  @Trimmed()
  @IsValidLearningGoalTextDto()
  text!: string;
}

export const SEARCH_SORTS = ['name', 'xp', 'joined'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];
export const SEARCH_ORDERS = ['asc', 'desc'] as const;
export type SearchOrder = (typeof SEARCH_ORDERS)[number];

function QueryBoolean(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  );
}

export class SearchStudentsQueryDto {
  @IsOptional()
  @IsString()
  @Trimmed()
  @IsValidSearchQueryDto()
  q?: string;

  @IsOptional()
  @IsUuidDto()
  teaches?: string;

  @IsOptional()
  @IsUuidDto()
  wants?: string;

  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  hasGoal?: boolean;

  @IsOptional()
  @IsIn(SEARCH_SORTS)
  sort: SearchSort = 'name';

  @IsOptional()
  @IsIn(SEARCH_ORDERS)
  order: SearchOrder = 'asc';

  @IsOptional()
  @QueryInteger()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @QueryInteger()
  @IsInt()
  @Min(1)
  @Max(PAGING.maxPageSize)
  pageSize: number = PAGING.defaultPageSize;
}
