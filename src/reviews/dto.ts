import { Type } from 'class-transformer';
import { IsDefined, IsInt, IsObject, IsString, Max, Min, ValidateIf, ValidateNested } from 'class-validator';
import { sharedValidator, Trimmed } from '../auth/dto';
import { isValidText, LIMITS } from '../shared/limits';

const OutcomeText = sharedValidator('outcomeText', (text) => isValidText(text, LIMITS.learningOutcome, true));
const FeedbackText = sharedValidator('feedbackText', (text) =>
  isValidText(text, LIMITS.privateFeedback, true),
);
const TakeawayText = sharedValidator('takeawayText', (text) =>
  isValidText(text, LIMITS.publicTakeaway, false),
);

class LearningOutcomeDto {
  @IsString()
  @Trimmed()
  @OutcomeText()
  learned!: string;

  @IsString()
  @Trimmed()
  @OutcomeText()
  canNowDo!: string;
}

class PrivateFeedbackDto {
  @IsString()
  @Trimmed()
  @FeedbackText()
  answerUsefulness!: string;

  @IsString()
  @Trimmed()
  @FeedbackText()
  answerExplanation!: string;

  @ValidateIf((_dto, value) => value !== undefined)
  @IsInt()
  @Min(LIMITS.privateFeedback.ratingMin)
  @Max(LIMITS.privateFeedback.ratingMax)
  rating?: number;
}

export class SubmitReviewDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => LearningOutcomeDto)
  learningOutcome!: LearningOutcomeDto;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => PrivateFeedbackDto)
  privateFeedback!: PrivateFeedbackDto;

  @IsString()
  @Trimmed()
  @TakeawayText()
  publicTakeaway!: string;
}
