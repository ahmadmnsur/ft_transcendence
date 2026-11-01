import type { ReportReason as SchemaReportReason, ReportState } from '../generated/prisma/client';
import type { ReportReason, ResolvedState } from '../shared/reports';

type SameValues<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const reasonsAgree: SameValues<ReportReason, SchemaReportReason> = true;

export const resolvedStatesAgree: SameValues<ResolvedState, Exclude<ReportState, 'OPEN'>> = true;
