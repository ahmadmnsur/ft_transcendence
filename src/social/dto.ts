import { IsUUID } from 'class-validator';

export class BlockStudentDto {
  @IsUUID()
  studentId!: string;
}

export class FriendRequestDto {
  @IsUUID()
  studentId!: string;
}
