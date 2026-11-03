import { IsIn, IsUUID, ValidateBy, ValidateIf } from 'class-validator';
import { NEW_DOT_KEYS, type NewDotKey } from '../shared/new-dots';

function OnlyWithFeedbackPage(): PropertyDecorator {
  return ValidateBy({
    name: 'onlyWithFeedbackPage',
    validator: {
      validate(_value: unknown, args): boolean {
        return (args?.object as OpenedPageDto).page === 'feedback';
      },
    },
  });
}

export class OpenedPageDto {
  @IsIn(NEW_DOT_KEYS)
  page!: NewDotKey;

  @ValidateIf((_dto, value) => value !== undefined)
  @IsUUID()
  @OnlyWithFeedbackPage()
  matchId?: string;
}
