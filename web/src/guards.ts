import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import type { Role } from '@shared/roles';
import { sessionQueryOptions, type SignedInStudent } from './api/session';

interface GuardArgs {
  context: { queryClient: QueryClient };
}

// Reads the session through the Query client with a fresh probe on every
// guarded navigation: a role change or revocation takes effect on the next
// request (§5.3), so a cached session must never admit anyone. Concurrent
// callers still share the one in-flight request.
export async function requireSession({ context }: GuardArgs): Promise<{ student: SignedInStudent }> {
  const session = await context.queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 });
  if (!session.authenticated) throw redirect({ to: '/sign-in' });
  return { student: session.student };
}

// requireSession first, then the role check: a student without one of the
// roles returns to `/` (§3.5.1). Takes a list because the moderation routes
// admit both PEER_MODERATOR and ADMIN (§5.3).
export async function requireRole(
  { context }: GuardArgs,
  ...roles: Array<Role>
): Promise<{ student: SignedInStudent }> {
  const { student } = await requireSession({ context });
  if (!roles.includes(student.role)) throw redirect({ to: '/' });
  return { student };
}

// The signed-out pages (`/sign-in`, `/sign-up`): a signed-in visitor goes to
// `/` instead (§3.5.1).
export async function requireSignedOut({ context }: GuardArgs): Promise<void> {
  const session = await context.queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 });
  if (session.authenticated) throw redirect({ to: '/' });
}
