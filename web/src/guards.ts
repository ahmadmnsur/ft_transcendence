import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import type { Role } from '@shared/roles';
import { sessionQueryOptions, type SignedInStudent } from './api/session';

interface GuardArgs {
  context: { queryClient: QueryClient };
}

export async function requireSession({ context }: GuardArgs): Promise<{ student: SignedInStudent }> {
  const session = await context.queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 });
  if (!session.authenticated) throw redirect({ to: '/sign-in' });
  return { student: session.student };
}

export async function readSession({ context }: GuardArgs): Promise<void> {
  await context.queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 });
}

const LEGAL_SESSION_WAIT_MS = 1000;

export async function readSessionIfUp({ context }: GuardArgs): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const read = context.queryClient
    .fetchQuery({ ...sessionQueryOptions(), staleTime: 0, retry: false })
    .catch(() => undefined);
  const capped = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, LEGAL_SESSION_WAIT_MS);
  });
  await Promise.race([read, capped]);
  clearTimeout(timer);
}

export async function requireRole(
  { context }: GuardArgs,
  ...roles: Array<Role>
): Promise<{ student: SignedInStudent }> {
  const { student } = await requireSession({ context });
  if (!roles.includes(student.role)) throw redirect({ to: '/' });
  return { student };
}

export async function requireSignedOut({ context }: GuardArgs): Promise<void> {
  const session = await context.queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 });
  if (session.authenticated) throw redirect({ to: '/' });
}
