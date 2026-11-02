import { useEffect, useRef, useState } from 'react';
import { displayNameInvalidReason, isValidEmail, normalizeEmail, LIMITS, type InvalidReason } from '@shared/limits';
import { ApiRefusalError } from '../api/client';
import { Banner, Button, Card, TextField } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from './failure';
import { PendingCardBody } from './PendingCardBody';
import type { ProfileTarget } from './target';
import { useUnsavedChanges } from './unsaved';

type Status = { kind: 'saved' } | { kind: 'nothingToSave' } | { kind: 'failed'; code: unknown };

export function ProfileDetailsCard({ target }: { target: ProfileTarget }): React.JSX.Element {
  const { t, format, errorText } = useI18n();
  const copy = target.voice === 'own' ? t.profile.details : { ...t.profile.details, ...t.admin.cards.details };
  const profile = target.profile;
  const [draft, setDraft] = useState<{ displayName: string; email: string } | null>(null);
  const [nameError, setNameError] = useState<InvalidReason | undefined>(undefined);
  const [emailError, setEmailError] = useState<'invalid' | 'email_unavailable' | undefined>(undefined);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const dirty =
    draft !== null &&
    profile !== undefined &&
    (draft.displayName.trim() !== profile.displayName || normalizeEmail(draft.email) !== profile.email);
  useUnsavedChanges(dirty);

  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  if (profile === undefined) {
    return (
      <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
        <PendingCardBody failed={target.failed} reserveClassName="min-h-64" />
      </Card>
    );
  }

  const displayName = draft?.displayName ?? profile.displayName;
  const email = draft?.email ?? profile.email;
  const savedName = profile.displayName;
  const savedEmail = profile.email;

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending) return;
    const nextNameError = displayNameInvalidReason(displayName);
    const nextEmailError = isValidEmail(email) ? undefined : 'invalid';
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
    if (patch.displayName === undefined && patch.email === undefined) {
      setDraft(null);
      setStatus({ kind: 'nothingToSave' });
      return;
    }
    setPending(true);
    try {
      const updated = await target.api.updateDetails(patch);
      await target.apply({ displayName: updated.displayName, email: updated.email });
      setDraft(null);
      setStatus({ kind: 'saved' });
    } catch (error) {
      if (error instanceof ApiRefusalError && error.code === 'email_unavailable') {
        setEmailError('email_unavailable');
        emailRef.current?.focus();
        return;
      }
      setStatus({ kind: 'failed', code: failureCode(error) });
    } finally {
      setPending(false);
    }
  }

  function onDiscard(): void {
    if (pending) return;
    setDraft(null);
    setNameError(undefined);
    setEmailError(undefined);
    setStatus(undefined);
    nameRef.current?.focus();
  }

  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-4">
        {status !== undefined ? (
          <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
            {status.kind === 'saved' ? (
              <Banner tone="success" title={copy.saved} />
            ) : status.kind === 'nothingToSave' ? (
              <Banner tone="info" title={copy.nothingToSave} />
            ) : (
              <Banner tone="danger" title={errorText(status.code)} />
            )}
          </div>
        ) : null}
        <TextField
          ref={nameRef}
          className="max-w-md"
          label={copy.displayNameLabel}
          hint={format(copy.displayNameHint, {
            count: LIMITS.displayName.maxChars,
            minChars: LIMITS.displayName.minChars,
          })}
          type="text"
          autoComplete="nickname"
          maxChars={LIMITS.displayName.maxChars}
          value={displayName}
          onChange={(event) => setDraft({ displayName: event.target.value, email })}
          error={
            nameError === undefined
              ? undefined
              : nameError === 'emoji'
                ? copy.displayNameEmoji
                : format(copy.displayNameInvalid, {
                    count: LIMITS.displayName.maxChars,
                    minChars: LIMITS.displayName.minChars,
                  })
          }
        />
        <TextField
          ref={emailRef}
          className="max-w-md"
          label={copy.emailLabel}
          hint={copy.emailHint}
          type="email"
          autoComplete="email"
          maxChars={LIMITS.email.maxChars}
          value={email}
          onChange={(event) => setDraft({ displayName, email: event.target.value })}
          error={
            emailError === undefined ? undefined : emailError === 'invalid' ? copy.emailInvalid : errorText(emailError)
          }
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button type="submit" variant={dirty ? 'primary' : 'secondary'} aria-disabled={!dirty || undefined} loading={pending}>
            {pending ? copy.saving : copy.save}
          </Button>
          {dirty ? (
            <>
              <Button variant="secondary" aria-disabled={pending || undefined} onClick={onDiscard}>
                {copy.discard}
              </Button>
              <p className="text-sm text-ink-muted">{copy.unsaved}</p>
            </>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
