import type { MatchStatus as SchemaMatchStatus, Mission as SchemaMission } from '../generated/prisma/client';
import type { MatchStatus, Mission } from '../shared/matches';

type SameValues<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const statusesAgree: SameValues<MatchStatus, SchemaMatchStatus> = true;
export const missionsAgree: SameValues<Mission, SchemaMission> = true;
