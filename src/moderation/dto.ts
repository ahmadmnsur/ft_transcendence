import { IsIn, IsString, IsUUID, ValidateBy, ValidateIf } from 'class-validator';
import { sharedValidator, Trimmed } from '../auth/dto';
import type { ReportReason as PrismaReportReason } from '../generated/prisma/client';
import { isValidText, LIMITS } from '../shared/limits';
import { REPORT_REASONS, type ReportReason } from '../shared/reports';

// §4.2: a reason accepted by either end must also be storable by Prisma.
type Assert<T extends true> = T;
type ReportReasonParity = Assert<
  [ReportReason] extends [PrismaReportReason] ? [PrismaReportReason] extends [ReportReason] ? true : false : false
>;

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
