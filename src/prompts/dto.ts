import { IsString, ValidateIf } from 'class-validator';
import { sharedValidator, Trimmed } from '../auth/dto';
import { isValidText, LIMITS } from '../shared/limits';

const Question = sharedValidator('promptQuestion', (value) => isValidText(value, LIMITS.promptQuestion, true));
const Answer = sharedValidator('promptAnswer', (value) => isValidText(value, LIMITS.promptAnswer, true));

export class PublishPromptDto {
  @IsString()
  @Trimmed()
  @Question()
  question!: string;
}

export class AnswerPromptDto {
  @IsString()
  @Trimmed()
  @Answer()
  body!: string;
}

export class AnswersQueryDto {
  @ValidateIf((_dto, value) => value !== undefined)
  @IsString()
  cursor?: string;
}
