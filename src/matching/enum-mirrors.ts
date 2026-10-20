import type { MatchStatus as SchemaMatchStatus, Mission as SchemaMission } from '../generated/prisma/client';
import type { MatchStatus, Mission } from '../shared/matches';

// The shared mirrors (§3.2) hold the same values as the schema's enums, so the
// SPA's texts keyed by code and the API's rows never disagree; `tsc` fails
// here when one side gains or loses a value. The round-robin order is the
// mirror's, which §8.10 fixes.
type SameValues<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const statusesAgree: SameValues<MatchStatus, SchemaMatchStatus> = true;
export const missionsAgree: SameValues<Mission, SchemaMission> = true;
