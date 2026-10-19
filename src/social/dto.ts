import { IsUUID } from 'class-validator';

// `POST /api/blocks` (§6.4). A missing or malformed id is the global pipe's
// `validation_failed`.
export class BlockStudentDto {
  @IsUUID()
  studentId!: string;
}
