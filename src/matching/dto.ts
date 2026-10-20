import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PAGING } from '../shared/limits';
import { QueryInteger } from '../students/dto';

// Distinctness is a domain refusal, rather than a shape error (§8.6).
export class HandMadeMatchDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsUUID('all', { each: true })
  studentIds!: [string, string];
}

// `GET /api/matches?page&pageSize` (§6.6; paging §6.0.1). An absent field
// keeps its default; the global pipe refuses an unknown parameter.
export class MatchHistoryQueryDto {
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
