import { IsUUID } from 'class-validator';

// `POST /api/blocks` (§6.4). A missing or malformed id is the global pipe's
// `validation_failed`.
export class BlockStudentDto {
  @IsUUID()
  studentId!: string;
}

// `POST /api/friends/requests` (§6.4), validated the same way.
export class FriendRequestDto {
  @IsUUID()
  studentId!: string;
}
