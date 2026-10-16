import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsString, IsUUID, ValidateIf } from 'class-validator';
import {
  IsValidDisplayNameDto,
  IsValidEmailDto,
  sharedValidator,
  Trimmed,
} from '../auth/dto';
import { LIMITS, isValidLearningGoalText, normalizeEmail } from '../shared/limits';

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
