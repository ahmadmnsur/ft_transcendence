import type { ReportReason as SchemaReportReason, ReportState } from '../generated/prisma/client';
import type { ReportReason, ResolvedState } from '../shared/reports';

// §3.2: the shared mirror and schema enum agree; the Terms are coupled to
// these reasons too (ADR-0011 d4).
type SameValues<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const reasonsAgree: SameValues<ReportReason, SchemaReportReason> = true;

// §4.3.18: every state but OPEN is terminal.
export const resolvedStatesAgree: SameValues<ResolvedState, Exclude<ReportState, 'OPEN'>> = true;
