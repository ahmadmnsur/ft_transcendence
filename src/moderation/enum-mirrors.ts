import type { ReportReason as SchemaReportReason } from '../generated/prisma/client';
import type { ReportReason } from '../shared/reports';

// §3.2: the shared mirror and schema enum agree; the Terms are coupled to
// these reasons too (ADR-0011 d4).
type SameValues<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const reasonsAgree: SameValues<ReportReason, SchemaReportReason> = true;
