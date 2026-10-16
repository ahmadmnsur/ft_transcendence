import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateBy,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { IsValidDisplayNameDto, IsValidEmailDto } from '../auth/dto';
import { LIMITS, isValidLearningGoalText, normalizeEmail } from '../shared/limits';

// §6.2's DTOs validate §6.0.3 through the shared validators, so the client
// pre-check and the server enforce the same limits. The display-name and email
// validators are the auth DTOs', reused rather than copied.

// The global pipe transforms before it validates (`transform: true`), so
// validation sees the trimmed value and the service receives it.
function Trimmed(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}

// The Learning Goal sentence has no auth validator to reuse: a small shared
// validator over `isValidLearningGoalText` (§6.0.3).
const learningGoalTextConstraint: ValidatorConstraintInterface = {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidLearningGoalText(value);
  },
};

export function IsValidLearningGoalTextDto(): PropertyDecorator {
  return ValidateBy({ name: 'isValidLearningGoalText', validator: learningGoalTextConstraint });
}

export class UpdateProfileDto {
  // Both optional: a body with neither returns the unchanged profile.
  @IsOptional()
  @IsString()
  @Trimmed()
  @IsValidDisplayNameDto()
  displayName?: string;

  @IsOptional()
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
