import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isValidDisplayName, isValidEmail, normalizeEmail, LIMITS } from '@shared/limits';
import { ApiRefusalError } from '../api/client';
import { SESSION_QUERY_KEY } from '../api/session';
import { ME_QUERY_KEY, meQueryOptions, studentQueryKey, updateProfile, type OwnProfile } from '../api/profile';
import { Banner, Button, Card, TextField, type BannerTone } from '../design';
import { formatCount, profileCopy, profileErrorMessage, profileFailureMessage } from './messages';
import { PendingCardBody } from './PendingCardBody';

const copy = profileCopy.details;

interface Status {
  tone: BannerTone;
  title: string;
}

// §6.2: display name and email, prefilled from `GET /api/me`, with only the
// fields that changed sent. The client pre-checks the same shared limits
// the server enforces (§3.5.2), and `email_unavailable` answers on the
// email field itself. A save updates the own-profile query and invalidates
// the session query, because the header shows the display name.
export function ProfileDetailsCard(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: me, isError } = useQuery(meQueryOptions());
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

  // §6.2: the card shell shows at once. While the profile read is pending the
  // body says so and reserves the loaded height, so the password card below
  // barely moves; a failed read leaves the body empty, since `/me` shows the
  // failure once above the cards.
  if (me === undefined) {
    return (
      <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
        <PendingCardBody failed={isError} reserveClassName="min-h-64" />
      </Card>
    );
  }

  const displayName = draft?.displayName ?? me.displayName;
  const email = draft?.email ?? me.email;
  // Read outside the handler: the narrowing of `me` does not reach a
  // function declaration, and only the changed fields are sent.
  const savedName = me.displayName;
  const savedEmail = me.email;
  const meId = me.id;

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const nextNameError = isValidDisplayName(displayName)
      ? undefined
      : formatCount(copy.displayNameInvalid, LIMITS.displayName.maxChars, LIMITS.displayName);
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
    // Nothing differs from the stored values: no request, and the status
    // Banner says so instead of claiming an update.
    if (patch.displayName === undefined && patch.email === undefined) {
      setStatus({ tone: 'info', title: copy.nothingToSave });
      return;
    }
    setPending(true);
    try {
      const updated = await updateProfile(patch);
      // A `GET /api/me` still in flight read the profile before this write;
      // cancelling it keeps its older answer from landing over this one.
      await queryClient.cancelQueries({ queryKey: ME_QUERY_KEY });
      // The answer is the full `GET /api/me` shape (§6.2), so the cached
      // read takes it as is. The session query is invalidated on top: the
      // header shows the display name. The own public profile is dropped, not
      // just invalidated: an inactive query would render the old values until
      // its background refetch returns, so the next visit must load afresh.
      queryClient.setQueryData<OwnProfile>(ME_QUERY_KEY, updated);
      void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      queryClient.removeQueries({ queryKey: studentQueryKey(meId) });
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
      setStatus({ tone: 'danger', title: profileFailureMessage(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-4">
        {status !== undefined ? (
          <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
            <Banner tone={status.tone} title={status.title} />
          </div>
        ) : null}
        <TextField
          ref={nameRef}
          label={copy.displayNameLabel}
          hint={formatCount(copy.displayNameHint, LIMITS.displayName.maxChars, LIMITS.displayName)}
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
