import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PAGING } from '../shared/limits';

export function QueryInteger(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^[0-9]+$/.test(value) ? Number(value) : value,
  );
}

export class PageQueryDto {
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
