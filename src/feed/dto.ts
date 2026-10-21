import { IsString, ValidateIf } from 'class-validator';

export class PostsQueryDto {
  @ValidateIf((_dto, value) => value !== undefined)
  @IsString()
  cursor?: string;
}
