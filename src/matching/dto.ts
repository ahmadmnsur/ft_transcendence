import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PAGING } from '../shared/limits';
import { QueryInteger } from '../students/dto';

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
