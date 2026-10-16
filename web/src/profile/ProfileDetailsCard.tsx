import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isValidDisplayName, isValidEmail, normalizeEmail, LIMITS } from '@shared/limits';
import { ApiProtocolError, ApiRefusalError } from '../api/client';
import { SESSION_QUERY_KEY } from '../api/session';
import { ME_QUERY_KEY, meQueryOptions, updateProfile, type OwnProfile } from '../api/profile';
import { Banner, Button, Card, TextField, type BannerTone } from '../design';
import { formatText, profileCopy, profileErrorMessage } from './messages';

const copy = profileCopy.details;

interface Status {
  tone: BannerTone;
  title: string;
}

function failureMessage(error: unknown): string {
  if (error instanceof ApiRefusalError) return profileErrorMessage(error.code);
  if (error instanceof ApiProtocolError) return profileErrorMessage(error.code);
  return profileErrorMessage(undefined);
}

// §6.2: display name and email, prefilled from `GET /api/me`, with only the
// fields that changed sent. The client pre-checks the same shared limits
// the server enforces (§3.5.2), and `email_unavailable` answers on the
// email field itself. A save updates the own-profile query and invalidates
// the session query, because the header shows the display name.
export function ProfileDetailsCard(): React.JSX.Element | null {
  const queryClient = useQueryClient();
  const { data: me } = useQuery(meQueryOptions());
  // Null while the Student has not edited anything: the fields follow the
  // server then, so a refetch never overwrites what they are typing.
  const [draft, setDraft] = useState<{ displayName: string; email: string } | null>(null);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // The status slot renders only while there is a message; once it renders,
  // focus moves to it, as with the field errors above.
  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  // The profile is not loaded yet; the card appears with its values filled.
  if (me === undefined) return null;

  const displayName = draft?.displayName ?? me.displayName;
  const email = draft?.email ?? me.email;
  // Read outside the handler: the narrowing of `me` does not reach a
  // function declaration, and only the changed fields are sent.
  const savedName = me.displayName;
  const savedEmail = me.email;

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const nextNameError = isValidDisplayName(displayName)
      ? undefined
      : formatText(copy.displayNameInvalid, LIMITS.displayName);
    const nextEmailError = isValidEmail(email) ? undefined : copy.emailInvalid;
    setNameError(nextNameError);
    setEmailError(nextEmailError);
    setStatus(undefined);
    if (nextNameError !== undefined) {
      nameRef.current?.focus();
      return;
    }
    if (nextEmailError !== undefined) {
      emailRef.current?.focus();
      return;
    }
    const trimmedName = displayName.trim();
    const normalizedEmail = normalizeEmail(email);
    const patch: { displayName?: string; email?: string } = {};
    if (trimmedName !== savedName) patch.displayName = trimmedName;
    if (normalizedEmail !== savedEmail) patch.email = normalizedEmail;
    setPending(true);
    try {
      const updated = await updateProfile(patch);
      // The answer is the full `GET /api/me` shape (§6.2), so the cached
      // read takes it as is. The session query is invalidated on top: the
      // header shows the display name.
      queryClient.setQueryData<OwnProfile>(ME_QUERY_KEY, updated);
      void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      setDraft(null);
      setStatus({ tone: 'success', title: copy.saved });
    } catch (error) {
      // A refusal lands on the email field it is about; anything else sums
      // up in the status Banner.
      if (error instanceof ApiRefusalError && error.code === 'email_unavailable') {
        setEmailError(profileErrorMessage(error.code));
        emailRef.current?.focus();
        return;
      }
      setStatus({ tone: 'danger', title: failureMessage(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card title={copy.title} subtitle={copy.subtitle}>
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-4">
        {status !== undefined ? (
          <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
            <Banner tone={status.tone} title={status.title} />
          </div>
        ) : null}
        <TextField
          ref={nameRef}
          label={copy.displayNameLabel}
          hint={formatText(copy.displayNameHint, LIMITS.displayName)}
          type="text"
          autoComplete="nickname"
          value={displayName}
          onChange={(event) => setDraft({ displayName: event.target.value, email })}
          error={nameError}
        />
        <TextField
          ref={emailRef}
          label={copy.emailLabel}
          hint={copy.emailHint}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setDraft({ displayName, email: event.target.value })}
          error={emailError}
        />
        <Button type="submit" loading={pending} className="self-start">
          {pending ? copy.saving : copy.save}
        </Button>
      </form>
    </Card>
  );
}
