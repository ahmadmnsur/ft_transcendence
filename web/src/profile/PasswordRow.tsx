import { useEffect, useId, useRef, useState } from 'react';
import { LIMITS } from '@shared/limits';
import { ApiRefusalError } from '../api/client';
import { changePassword, setPasswordAfter42, start42 } from '../api/auth';
import { fetchSession } from '../api/session';
import { Banner, Button, PasswordField } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from './failure';
import { currentPasswordError, newPasswordErrors } from './passwords';
import { SettingRow, revealClass, useDisclosure } from './SettingRow';

type SignedOutNotice = 'password-changed' | 'password-change-unknown';

function recoveryDeadline(confirmedAt: number): Date {
  const end = new Date(confirmedAt + 9 * 60_000);
  end.setSeconds(0, 0);
  return end;
}

export function PasswordRow({
  username,
  onSignedOut,
  recovery,
  confirmedAt,
  onConfirmedEnd,
  onAction,
  otherActive,
  onOpen,
  held,
  onBusyChange,
}: {
  username: string;
  onSignedOut: (notice: SignedOutNotice) => Promise<void>;
  recovery: boolean;
  confirmedAt: number | null;
  onConfirmedEnd: () => void;
  onAction?: () => void;
  otherActive: boolean;
  onOpen: () => void;
  held: boolean;
  onBusyChange: (busy: boolean) => void;
}): React.JSX.Element {
  const { t, format, formatText, formatTime, errorText } = useI18n();
  const copy = t.auth.passwordChange;
  const recoveryCopy = t.profile.confirm42;
  const titleId = useId();
  const disclosure = useDisclosure();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checked, setChecked] = useState(false);
  const [currentRefused, setCurrentRefused] = useState(false);
  const [status, setStatus] = useState<{ code: unknown } | undefined>(undefined);
  const [pending, setPending] = useState<'change' | 'confirm' | 'set' | null>(null);
  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const handOffTimerRef = useRef<number | undefined>(undefined);
  const recovering = recovery && confirmedAt !== null;

  const passwordInvalid = format(t.auth.password.invalid, { count: LIMITS.password.minChars });
  const currentError = currentPasswordError(currentPassword);
  const { newError, confirmError } = newPasswordErrors(newPassword, confirmPassword);

  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (!recovering) return;
    noticeRef.current?.focus();
    onOpen();
  }, [recovering]);

  const yieldToOther = otherActive && (disclosure.open || recovering) && pending === null;
  useEffect(() => {
    if (!yieldToOther) return;
    resetFields();
    setStatus(undefined);
    if (recovering) onConfirmedEnd();
    disclosure.hide(false);
  }, [yieldToOther]);

  const busy = pending !== null;
  useEffect(() => {
    if (!busy) return;
    onBusyChange(true);
    return () => onBusyChange(false);
  }, [busy]);

  useEffect(() => {
    mountedRef.current = true;
    function onPageShow(event: PageTransitionEvent): void {
      if (!event.persisted) return;
      window.clearTimeout(handOffTimerRef.current);
      setPending(null);
    }
    window.addEventListener('pageshow', onPageShow);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('pageshow', onPageShow);
      window.clearTimeout(handOffTimerRef.current);
    };
  }, []);

  function resetFields(): void {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChecked(false);
    setCurrentRefused(false);
  }

  function onShow(): void {
    if (held) return;
    setStatus(undefined);
    onOpen();
    disclosure.show();
  }

  function onCancel(): void {
    if (pending !== null) return;
    resetFields();
    setStatus(undefined);
    disclosure.hide();
  }

  function onRecoveryCancel(): void {
    if (pending !== null) return;
    resetFields();
    setStatus(undefined);
    onConfirmedEnd();
    disclosure.hide();
  }

  function onEscape(event: React.KeyboardEvent, cancel: () => void): void {
    if (event.key !== 'Escape' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    cancel();
  }

  async function settleFailure(error: unknown): Promise<'signed-out' | 'signed-in'> {
    let signedOut = true;
    try {
      signedOut = !(await fetchSession()).authenticated;
    } catch {
      signedOut = false;
    }
    if (signedOut) {
      await onSignedOut('password-change-unknown');
      return 'signed-out';
    }
    setStatus({ code: failureCode(error) });
    return 'signed-in';
  }

  async function onChangeSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending !== null) return;
    setChecked(true);
    setStatus(undefined);
    if (currentError !== undefined) {
      currentRef.current?.focus();
      return;
    }
    if (newError !== undefined) {
      newRef.current?.focus();
      return;
    }
    if (confirmError) {
      confirmRef.current?.focus();
      return;
    }
    setCurrentRefused(false);
    setPending('change');
    try {
      await changePassword({ currentPassword: currentPassword.trim(), newPassword: newPassword.trim() });
      await onSignedOut('password-changed');
    } catch (error) {
      if (error instanceof ApiRefusalError) {
        if (error.code === 'password_incorrect') {
          if (currentRef.current?.value === currentPassword) {
            setCurrentRefused(true);
            currentRef.current.focus();
          }
        } else setStatus({ code: error.code });
        return;
      }
      await settleFailure(error);
    } finally {
      if (mountedRef.current) setPending(null);
    }
  }

  async function onConfirmStart(): Promise<void> {
    if (pending !== null) return;
    setStatus(undefined);
    onAction?.();
    setPending('confirm');
    try {
      const { authorizeUrl } = await start42('confirm');
      if (!mountedRef.current) return;
      window.location.assign(authorizeUrl);
      window.clearTimeout(handOffTimerRef.current);
      handOffTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) setPending(null);
      }, 5000);
    } catch (error) {
      if (!mountedRef.current) return;
      setStatus({ code: failureCode(error) });
      setPending(null);
    }
  }

  async function onRecoverySubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending !== null) return;
    setChecked(true);
    setStatus(undefined);
    if (newError !== undefined) {
      newRef.current?.focus();
      return;
    }
    if (confirmError) {
      confirmRef.current?.focus();
      return;
    }
    setPending('set');
    try {
      await setPasswordAfter42(newPassword.trim());
      await onSignedOut('password-changed');
    } catch (error) {
      let signedIn = true;
      if (error instanceof ApiRefusalError && error.code === 'confirmation_required') {
        setStatus({ code: error.code });
      } else {
        signedIn = (await settleFailure(error)) === 'signed-in';
      }
      if (signedIn && mountedRef.current) {
        resetFields();
        onConfirmedEnd();
        disclosure.show(false);
      }
    } finally {
      if (mountedRef.current) setPending(null);
    }
  }

  const statusSlot =
    status !== undefined ? (
      <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
        <Banner tone="danger" title={errorText(status.code)} />
      </div>
    ) : null;

  const usernameField = (
    <input
      type="text"
      autoComplete="username"
      value={username}
      readOnly
      tabIndex={-1}
      aria-hidden="true"
      className="sr-only"
    />
  );

  const newPasswordFields = (
    <>
      <PasswordField
        ref={newRef}
        label={copy.newLabel}
        hint={format(t.auth.password.hint, { count: LIMITS.password.minChars })}
        {...copy.newVisibility}
        autoComplete="new-password"
        maxBytes={LIMITS.password.maxBytes}
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        error={
          !checked || newError === undefined
            ? undefined
            : newError === 'emoji'
              ? t.auth.password.emoji
              : passwordInvalid
        }
      />
      <PasswordField
        ref={confirmRef}
        label={copy.confirmLabel}
        {...copy.confirmVisibility}
        autoComplete="new-password"
        maxBytes={LIMITS.password.maxBytes}
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        error={checked && confirmError ? copy.confirmInvalid : undefined}
      />
    </>
  );

  const formClass = `flex min-w-0 max-w-md flex-col gap-4 ${revealClass}`;

  return (
    <SettingRow
      title={copy.rowTitle}
      titleId={titleId}
      description={copy.cardSubtitle}
      action={
        disclosure.open || recovering ? null : (
          <Button ref={disclosure.triggerRef} variant="secondary" aria-disabled={held || undefined} onClick={onShow}>
            {copy.cardTitle}
          </Button>
        )
      }
    >
      {recovering ? (
        <form
          aria-labelledby={titleId}
          onSubmit={(event) => void onRecoverySubmit(event)}
          onKeyDown={(event) => onEscape(event, onRecoveryCancel)}
          noValidate
          className={formClass}
        >
          {statusSlot}
          <div ref={noticeRef} tabIndex={-1} className="rounded-lg focus-ring">
            <Banner
              tone="success"
              title={formatText(recoveryCopy.confirmedNotice, { time: formatTime(recoveryDeadline(confirmedAt)) })}
            />
          </div>
          {usernameField}
          {newPasswordFields}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={pending === 'set'}>
              {pending === 'set' ? recoveryCopy.submitting : recoveryCopy.submit}
            </Button>
            <Button variant="secondary" aria-disabled={pending !== null || undefined} onClick={onRecoveryCancel}>
              {recoveryCopy.cancel}
            </Button>
          </div>
        </form>
      ) : disclosure.open ? (
        <form
          ref={(node) => {
            disclosure.panelRef.current = node;
          }}
          aria-labelledby={titleId}
          onSubmit={(event) => void onChangeSubmit(event)}
          onKeyDown={(event) => onEscape(event, onCancel)}
          noValidate
          className={formClass}
        >
          {statusSlot}
          {usernameField}
          <div className="flex min-w-0 flex-col gap-2">
            <PasswordField
              ref={currentRef}
              label={copy.currentLabel}
              {...copy.currentVisibility}
              autoComplete="current-password"
              maxBytes={LIMITS.password.maxBytes}
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                setCurrentRefused(false);
              }}
              error={
                checked && currentError === 'empty'
                  ? copy.currentEmpty
                  : checked && currentError === 'invalid'
                    ? passwordInvalid
                    : currentRefused
                      ? errorText('password_incorrect')
                      : undefined
              }
            />
            {recovery ? (
              <p className="text-sm text-ink-muted text-pretty">
                {format(recoveryCopy.prompt, {
                  action: (
                    <button
                      type="button"
                      aria-disabled={pending !== null || undefined}
                      aria-busy={pending === 'confirm' || undefined}
                      onClick={() => void onConfirmStart()}
                      className="rounded font-medium text-link underline underline-offset-2 focus-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
                    >
                      {pending === 'confirm' ? recoveryCopy.confirming : recoveryCopy.confirm}
                    </button>
                  ),
                })}
              </p>
            ) : null}
          </div>
          {newPasswordFields}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={pending === 'change'}>
              {pending === 'change' ? copy.submitting : copy.submit}
            </Button>
            <Button variant="secondary" aria-disabled={pending !== null || undefined} onClick={onCancel}>
              {copy.cancel}
            </Button>
          </div>
        </form>
      ) : null}
    </SettingRow>
  );
}
