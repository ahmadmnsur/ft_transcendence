import { IsString, ValidateIf } from 'class-validator';

export class MessagesQueryDto {
  @ValidateIf((_dto, value) => value !== undefined)
  @IsString()
  cursor?: string;
}
