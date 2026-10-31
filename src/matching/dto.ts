import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';
export { PageQueryDto as MatchHistoryQueryDto } from '../core/paging';

export class HandMadeMatchDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsUUID('all', { each: true })
  studentIds!: [string, string];
}
