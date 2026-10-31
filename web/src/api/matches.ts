import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query';
import { STANDING_STATUSES, type MatchRole, type MatchStatus, type Mission } from '@shared/matches';
import { apiFetch } from './client';
import type { SkillView, StudentRef } from './profile';
import type { ReviewDetail } from './reviews';
import { writeAsSignedIn } from './session';


export interface CoverageView {
  forward: SkillView[];
  reverse: SkillView[];
}

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
  streaksIncremented: number;
  streaksReset: number;
  consistentLearnerAwarded: number;
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

export interface AdminRoundDetail {
  round: { id: string; number: number; openedAt: string; closedAt: string | null };
  matches: AdminRoundMatch[];
  unmatched: StudentRef[] | null;
}

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

export type MatchDetailView = MatchView & ReviewDetail;
export type AdminMatchDetailView = AdminMatchView & ReviewDetail;

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

export async function fetchMatch(id: string): Promise<MatchDetailView> {
  return apiFetch<MatchDetailView>(`/matches/${encodeURIComponent(id)}`);
}

export async function fetchAdminRounds(): Promise<{ items: AdminRoundSummary[] }> {
  return apiFetch<{ items: AdminRoundSummary[] }>('/admin/rounds');
}

export async function fetchAdminRound(id: string): Promise<AdminRoundDetail> {
  return apiFetch<AdminRoundDetail>(`/admin/rounds/${encodeURIComponent(id)}`);
}

export async function fetchAdminMatch(id: string): Promise<AdminMatchDetailView> {
  return apiFetch<AdminMatchDetailView>(`/admin/matches/${encodeURIComponent(id)}`);
}

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

async function postAccept(id: string): Promise<MatchDetailView> {
  return apiFetch<MatchDetailView>(`/matches/${encodeURIComponent(id)}/accept`, { method: 'POST', body: {} });
}

async function postDecline(id: string): Promise<MatchDetailView> {
  return apiFetch<MatchDetailView>(`/matches/${encodeURIComponent(id)}/decline`, { method: 'POST', body: {} });
}

async function postOpenRound(): Promise<OpenRoundResult> {
  return apiFetch<OpenRoundResult>('/admin/rounds', { method: 'POST', body: {} });
}

async function postCloseRound(): Promise<CloseRoundResult> {
  return apiFetch<CloseRoundResult>('/admin/rounds/current/close', { method: 'POST', body: {} });
}

async function readAgain(queryClient: QueryClient, queryKey: readonly string[]): Promise<void> {
  await queryClient.cancelQueries({ queryKey });
  await queryClient.invalidateQueries({ queryKey });
}

export function readRoundViewsAgain(queryClient: QueryClient): void {
  void readAgain(queryClient, ADMIN_PREFIX);
  void readAgain(queryClient, CURRENT_ROUND_QUERY_KEY);
  void readAgain(queryClient, MATCHES_PREFIX);
}

export function readMatchesAgain(queryClient: QueryClient): void {
  void readAgain(queryClient, MATCHES_PREFIX);
}

function matchWrite(
  queryClient: QueryClient,
  send: () => Promise<MatchDetailView>,
): Promise<MatchDetailView | undefined> {
  let written: MatchDetailView | undefined;
  return writeAsSignedIn(
    queryClient,
    send,
    async (match) => {
      written = match;
      await queryClient.cancelQueries({ queryKey: MATCHES_PREFIX });
      queryClient.setQueryData<MatchDetailView>(matchQueryKey(match.id), match);
      const standing: readonly MatchStatus[] = STANDING_STATUSES;
      queryClient.setQueryData<CurrentMatch>(CURRENT_MATCH_QUERY_KEY, (previous) =>
        previous?.match?.id === match.id ? { match: standing.includes(match.status) ? match : null } : previous,
      );
      void queryClient.invalidateQueries({ queryKey: MATCHES_PREFIX });
    },
    () => void readAgain(queryClient, MATCHES_PREFIX),
  ).then(() => written);
}

export function acceptMatch(queryClient: QueryClient, id: string): Promise<MatchDetailView | undefined> {
  return matchWrite(queryClient, () => postAccept(id));
}

export function declineMatch(queryClient: QueryClient, id: string): Promise<MatchDetailView | undefined> {
  return matchWrite(queryClient, () => postDecline(id));
}

function roundWrite<T>(queryClient: QueryClient, send: () => Promise<T>): Promise<T | undefined> {
  let result: T | undefined;
  return writeAsSignedIn(
    queryClient,
    send,
    async (value) => {
      result = value;
      readRoundViewsAgain(queryClient);
    },
    () => readRoundViewsAgain(queryClient),
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
