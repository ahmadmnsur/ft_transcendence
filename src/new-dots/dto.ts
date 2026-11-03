import { IsIn, IsUUID, ValidateBy, ValidateIf } from 'class-validator';

export const OPENED_PAGES = ['messages', 'match', 'friends', 'prompts', 'reports', 'feed', 'feedback'] as const;

export type OpenedPage = (typeof OPENED_PAGES)[number];

function FeedbackMatch(): PropertyDecorator {
  return ValidateBy({
    name: 'feedbackMatch',
    validator: {
      validate(_value: unknown, args): boolean {
        return (args?.object as OpenedPageDto).page === 'feedback';
      },
    },
  });
}

export class OpenedPageDto {
  @IsIn(OPENED_PAGES)
  page!: OpenedPage;

  @ValidateIf((_dto, value) => value !== undefined)
  @IsUUID()
  @FeedbackMatch()
  matchId?: string;
}
