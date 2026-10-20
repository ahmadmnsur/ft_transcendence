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

// §6.2's DTOs validate §6.0.3 through the shared validators, so the client
// pre-check and the server enforce the same limits. The display-name and email
// validators, the trim transform and the validator factory are the auth DTOs',
// reused rather than copied.

// The Learning Goal sentence has no auth validator of its own: build one from
// `isValidLearningGoalText` exactly as the auth module builds its own.
export const IsValidLearningGoalTextDto = sharedValidator(
  'isValidLearningGoalText',
  isValidLearningGoalText,
);

// Search `q` is 0–60 characters after trimming (§6.0.3), checked by the same
// function as the client's pre-check.
export const IsValidSearchQueryDto = sharedValidator('isValidSearchQuery', isValidSearchQuery);

// A Skill id in the search's query string, checked by the same function as the
// SPA's search params.
export const IsUuidDto = sharedValidator('isUuid', isUuid);

export class UpdateProfileDto {
  // Both optional: a body with neither returns the unchanged profile. An
  // absent field is skipped, while a present `null` fails `@IsString` and is a
  // 400 `validation_failed`, never a 500 (§6.15).
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
  // Each list is 0–15 distinct catalogue ids; a Skill may be on both (§6.0.3,
  // §6.2). Errors here are the global pipe's `validation_failed`.
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

// A query string carries only strings. These turn exactly `true`/`false` and a
// run of digits into their values; anything else is left as it came, so the
// validators below refuse it as `validation_failed`.
function QueryBoolean(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  );
}

export function QueryInteger(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^[0-9]+$/.test(value) ? Number(value) : value,
  );
}

// `GET /api/students` (§6.2; paging §6.0.1). Every field is optional; an absent one
// keeps its default. The global pipe refuses an unknown parameter, and a
// repeated one arrives as an array and fails its validator.
export class SearchStudentsQueryDto {
  // Absent, or empty after trimming, is no name filter (§6.0.3).
  @IsOptional()
  @IsString()
  @Trimmed()
  @IsValidSearchQueryDto()
  q?: string;

  // A Skill id each. An id outside the catalogue matches nobody.
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
