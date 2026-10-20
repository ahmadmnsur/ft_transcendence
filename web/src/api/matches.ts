import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query';
import { STANDING_STATUSES, type MatchRole, type MatchStatus, type Mission } from '@shared/matches';
import { apiFetch } from './client';
import type { SkillView, StudentRef } from './profile';
import { writeAsSignedIn } from './session';

// §6.6 and §6.13's Round and Match routes, with the exact wire shapes the API
// returns. Every time is an ISO 8601 timestamp.

// The frozen explanation (§4.3.11): FORWARD is what the Mentee gains, REVERSE
// what the Mentor gains, each by Skill name.
export interface CoverageView {
  forward: SkillView[];
  reverse: SkillView[];
}

// §6.6: one Match from one of its pair's side. `handMade` is true exactly
// when `compatibilityScore` is null.
export interface MatchView {
  id: string;
  roundNumber: number;
  status: MatchStatus;
  myRole: MatchRole;
  partner: StudentRef;
  compatibilityScore: number | null;
  handMade: boolean;
  goalBonusApplied: boolean;
  coverage: CoverageView;
  mission: Mission;
  iAccepted: boolean;
  partnerAccepted: boolean;
}

// §6.13: one Match with both participants named, for an Admin.
export interface AdminMatchView {
  id: string;
  roundNumber: number;
  status: MatchStatus;
  mentor: StudentRef;
  mentee: StudentRef;
  compatibilityScore: number | null;
  handMade: boolean;
  goalBonusApplied: boolean;
  coverage: CoverageView;
  mission: Mission;
  mentorAccepted: boolean;
  menteeAccepted: boolean;
  declinedBy: StudentRef | null;
}

export interface CurrentRound {
  round: { id: string; number: number; openedAt: string } | null;
}

export interface CurrentMatch {
  match: MatchView | null;
}

export interface MatchHistoryPage {
  items: MatchView[];
  total: number;
}

export interface OpenRoundResult {
  round: { id: string; number: number };
  matchCount: number;
  unmatched: StudentRef[];
}

export interface CloseRoundResult {
  roundId: string;
  lapsed: number;
}

export interface AdminRoundSummary {
  id: string;
  number: number;
  openedAt: string;
  closedAt: string | null;
  counts: Record<MatchStatus, number>;
}

export interface AdminRoundMatch {
  id: string;
  mentor: StudentRef;
  mentee: StudentRef;
  status: MatchStatus;
  compatibilityScore: number | null;
  handMade: boolean;
  mission: Mission;
}

// `unmatched` is derived for the open Round only, and null once it closed.
export interface AdminRoundDetail {
  round: { id: string; number: number; openedAt: string; closedAt: string | null };
  matches: AdminRoundMatch[];
  unmatched: StudentRef[] | null;
}

// Every key under ['matches'] is the signed-in Student's own Matches, and
// every key under ['admin'] an Admin's view, so one prefix reads a group again.
export const CURRENT_ROUND_QUERY_KEY = ['rounds', 'current'] as const;
export const CURRENT_MATCH_QUERY_KEY = ['matches', 'current'] as const;
const MATCHES_PREFIX = ['matches'] as const;
export const ADMIN_ROUNDS_QUERY_KEY = ['admin', 'rounds'] as const;
const ADMIN_PREFIX = ['admin'] as const;

function matchQueryKey(id: string): readonly ['matches', 'one', string] {
  return ['matches', 'one', id] as const;
}

function adminRoundQueryKey(id: string): readonly ['admin', 'rounds', string] {
  return ['admin', 'rounds', id] as const;
}

// Reads (§6.6, §6.13). An id goes in the path only once the page has checked
// its shape, so a malformed one never reaches the API (§3.5.2).
export async function fetchCurrentRound(): Promise<CurrentRound> {
  return apiFetch<CurrentRound>('/rounds/current');
}

export async function fetchCurrentMatch(): Promise<CurrentMatch> {
  return apiFetch<CurrentMatch>('/matches/current');
}

export async function fetchMatchHistory(page: number, pageSize: number): Promise<MatchHistoryPage> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return apiFetch<MatchHistoryPage>(`/matches?${query.toString()}`);
}

export async function fetchMatch(id: string): Promise<MatchView> {
  return apiFetch<MatchView>(`/matches/${encodeURIComponent(id)}`);
}

export async function fetchAdminRounds(): Promise<{ items: AdminRoundSummary[] }> {
  return apiFetch<{ items: AdminRoundSummary[] }>('/admin/rounds');
}

export async function fetchAdminRound(id: string): Promise<AdminRoundDetail> {
  return apiFetch<AdminRoundDetail>(`/admin/rounds/${encodeURIComponent(id)}`);
}

export async function fetchAdminMatch(id: string): Promise<AdminMatchView> {
  return apiFetch<AdminMatchView>(`/admin/matches/${encodeURIComponent(id)}`);
}

// No event tells a Student that their partner accepted or declined (§7.4), so
// these are read again whenever a screen opens or regains focus: the
// default stale time of zero. The live reactions to `round:opened`,
// `round:closed` and `match:ready` arrive with their own ticket (#61).
export function currentRoundQueryOptions() {
  return queryOptions({ queryKey: CURRENT_ROUND_QUERY_KEY, queryFn: fetchCurrentRound });
}

export function currentMatchQueryOptions() {
  return queryOptions({ queryKey: CURRENT_MATCH_QUERY_KEY, queryFn: fetchCurrentMatch });
}

export function matchHistoryQueryOptions(page: number, pageSize: number) {
  return queryOptions({
    queryKey: ['matches', 'history', page, pageSize] as const,
    queryFn: () => fetchMatchHistory(page, pageSize),
    placeholderData: keepPreviousData,
  });
}

export function matchQueryOptions(id: string) {
  return queryOptions({ queryKey: matchQueryKey(id), queryFn: () => fetchMatch(id) });
}

export function adminRoundsQueryOptions() {
  return queryOptions({ queryKey: ADMIN_ROUNDS_QUERY_KEY, queryFn: fetchAdminRounds });
}

export function adminRoundQueryOptions(id: string) {
  return queryOptions({ queryKey: adminRoundQueryKey(id), queryFn: () => fetchAdminRound(id) });
}

export function adminMatchQueryOptions(id: string) {
  return queryOptions({ queryKey: ['admin', 'matches', id] as const, queryFn: () => fetchAdminMatch(id) });
}

// Writes (§8.4, §8.5, §8.7). A refusal (`round_already_open`, `no_open_round`,
// `match_not_pending`, `match_not_in_progress`) is a typed 200 (§6.15).
async function postAccept(id: string): Promise<MatchView> {
  return apiFetch<MatchView>(`/matches/${encodeURIComponent(id)}/accept`, { method: 'POST', body: {} });
}

async function postDecline(id: string): Promise<MatchView> {
  return apiFetch<MatchView>(`/matches/${encodeURIComponent(id)}/decline`, { method: 'POST', body: {} });
}

async function postOpenRound(): Promise<OpenRoundResult> {
  return apiFetch<OpenRoundResult>('/admin/rounds', { method: 'POST', body: {} });
}

async function postCloseRound(): Promise<CloseRoundResult> {
  return apiFetch<CloseRoundResult>('/admin/rounds/current/close', { method: 'POST', body: {} });
}

// Cancels any read already in flight, which may have answered before the
// write, then reads the group again.
async function readAgain(queryClient: QueryClient, queryKey: readonly string[]): Promise<void> {
  await queryClient.cancelQueries({ queryKey });
  await queryClient.invalidateQueries({ queryKey });
}

// The Match as the write left it is shown at once — a declined one leaves the
// current Match, which holds only a standing one (§6.6) — then every view of
// the Student's Matches is read again: the current Match, the history and the
// detail all show its status. A failure reads them again too, since the
// partner or a Round close may have moved it first, and is rethrown for the
// screen to show. An answer that arrives after another Student signed in
// reaches none of the cache (`writeAsSignedIn`).
function matchWrite(queryClient: QueryClient, send: () => Promise<MatchView>): Promise<MatchView | undefined> {
  let written: MatchView | undefined;
  return writeAsSignedIn(
    queryClient,
    send,
    async (match) => {
      written = match;
      await queryClient.cancelQueries({ queryKey: MATCHES_PREFIX });
      queryClient.setQueryData<MatchView>(matchQueryKey(match.id), match);
      const standing: readonly MatchStatus[] = STANDING_STATUSES;
      queryClient.setQueryData<CurrentMatch>(CURRENT_MATCH_QUERY_KEY, (previous) =>
        previous?.match?.id === match.id ? { match: standing.includes(match.status) ? match : null } : previous,
      );
      void queryClient.invalidateQueries({ queryKey: MATCHES_PREFIX });
    },
    () => void readAgain(queryClient, MATCHES_PREFIX),
  ).then(() => written);
}

export function acceptMatch(queryClient: QueryClient, id: string): Promise<MatchView | undefined> {
  return matchWrite(queryClient, () => postAccept(id));
}

export function declineMatch(queryClient: QueryClient, id: string): Promise<MatchView | undefined> {
  return matchWrite(queryClient, () => postDecline(id));
}

// Opening or closing a Round changes every Round view and the current Round,
// so all of them are read again, whether the write succeeded or was refused
// (another Admin may have opened or closed it first).
function roundWrite<T>(queryClient: QueryClient, send: () => Promise<T>): Promise<T | undefined> {
  let result: T | undefined;
  const reread = (): void => {
    void readAgain(queryClient, ADMIN_PREFIX);
    void readAgain(queryClient, CURRENT_ROUND_QUERY_KEY);
    void readAgain(queryClient, MATCHES_PREFIX);
  };
  return writeAsSignedIn(
    queryClient,
    send,
    async (value) => {
      result = value;
      reread();
    },
    reread,
  ).then(() => result);
}

export function openRound(queryClient: QueryClient): Promise<OpenRoundResult | undefined> {
  return roundWrite(queryClient, postOpenRound);
}

export function closeRound(queryClient: QueryClient): Promise<CloseRoundResult | undefined> {
  return roundWrite(queryClient, postCloseRound);
}

export function createHandMadeMatch(
  queryClient: QueryClient,
  studentIds: [string, string],
): Promise<AdminMatchView | undefined> {
  return roundWrite(queryClient, () =>
    apiFetch<AdminMatchView>('/admin/rounds/current/matches', { method: 'POST', body: { studentIds } }),
  );
}
