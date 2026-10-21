import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';
export { PageQueryDto as MatchHistoryQueryDto } from '../core/paging';

// Distinctness is a domain refusal, rather than a shape error (§8.6).
export class HandMadeMatchDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsUUID('all', { each: true })
  studentIds!: [string, string];
}
