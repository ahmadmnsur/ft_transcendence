import { IsIn, IsString, IsUUID, ValidateBy, ValidateIf } from 'class-validator';
import { sharedValidator, Trimmed } from '../auth/dto';
import { isValidText, LIMITS } from '../shared/limits';
import {
  POST_GROUP_ACTIONS,
  REPORT_REASONS,
  STUDENT_GROUP_ACTIONS,
  type PostGroupAction,
  type ReportReason,
  type StudentGroupAction,
} from '../shared/reports';

const ReportText = sharedValidator('reportText', (value) => isValidText(value, LIMITS.reportText, true));

function ExactlyOneTarget(): PropertyDecorator {
  return ValidateBy({
    name: 'exactlyOneReportTarget',
    validator: {
      validate(_value: unknown, args): boolean {
        const dto = args?.object as { postId?: unknown; studentId?: unknown };
        return (dto.postId !== undefined) !== (dto.studentId !== undefined);
      },
    },
  });
}

export class FileReportDto {
  @ValidateIf((_dto, value) => value !== undefined)
  @IsUUID()
  postId?: string;

  @ValidateIf((_dto, value) => value !== undefined)
  @IsUUID()
  studentId?: string;

  // §12.2: validate the pair even when neither optional id is present.
  @ExactlyOneTarget()
  @IsIn(REPORT_REASONS)
  reason!: ReportReason;

  @ValidateIf((_dto, value) => value !== undefined)
  @IsString()
  @Trimmed()
  @ReportText()
  text?: string;
}

// §12.5's bodies: each group kind takes its own two actions.
export class ResolvePostGroupDto {
  @IsIn(POST_GROUP_ACTIONS)
  action!: PostGroupAction;
}

export class ResolveStudentGroupDto {
  @IsIn(STUDENT_GROUP_ACTIONS)
  action!: StudentGroupAction;
}
