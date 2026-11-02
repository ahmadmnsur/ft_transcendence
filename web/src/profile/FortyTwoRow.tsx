import { useEffect, useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LIMITS } from '@shared/limits';
import { disconnect42, start42 } from '../api/auth';
import { ME_QUERY_KEY, meQueryOptions, type OwnProfile } from '../api/profile';
import { Banner, Button, CheckIcon, PasswordField } from '../design';
import { useI18n } from '../i18n/context';
import { BRAND } from '../layout';
import { failureCode } from './failure';
import { currentPasswordError } from './passwords';
import { SettingRow, revealClass, useDisclosure } from './SettingRow';

type Status = { kind: 'disconnected' } | { kind: 'failed'; code: unknown };

export function FortyTwoRow({
  onAction,
  otherActive,
  onOpen,
  held,
  onBusyChange,
}: {
  onAction?: () => void;
  otherActive: boolean;
  onOpen: () => void;
  held: boolean;
  onBusyChange: (busy: boolean) => void;
}): React.JSX.Element {
  const { t, format, formatText, errorText } = useI18n();
  const copy = t.profile.fortyTwo;
  const queryClient = useQueryClient();
  const { data: me, isError } = useQuery(meQueryOptions());
  const titleId = useId();
  const introId = useId();
  const disclosure = useDisclosure();
  const [password, setPassword] = useState('');
  const [checked, setChecked] = useState(false);
  const [refused, setRefused] = useState(false);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [pending, setPending] = useState<'connect' | 'disconnect' | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const handOffTimerRef = useRef<number | undefined>(undefined);

  const passwordInvalid = format(t.auth.password.invalid, { count: LIMITS.password.minChars });
  const passwordError = currentPasswordError(password);

  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent): void {
      if (!event.persisted) return;
      window.clearTimeout(handOffTimerRef.current);
      setPending(null);
    }
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.clearTimeout(handOffTimerRef.current);
    };
  }, []);

  const yieldToOther = otherActive && disclosure.open && pending === null;
  useEffect(() => {
    if (!yieldToOther) return;
    setPassword('');
    setChecked(false);
    setRefused(false);
    setStatus(undefined);
    disclosure.hide(false);
  }, [yieldToOther]);

  const busy = pending !== null;
  useEffect(() => {
    if (!busy) return;
    onBusyChange(true);
    return () => onBusyChange(false);
  }, [busy]);

  function onShow(): void {
    if (held) return;
    setStatus(undefined);
    onOpen();
    disclosure.show();
  }

  function onCancel(): void {
    if (pending !== null) return;
    setPassword('');
    setChecked(false);
    setRefused(false);
    setStatus(undefined);
    disclosure.hide();
  }

  function onKeyDown(event: React.KeyboardEvent): void {
    if (event.key !== 'Escape' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    onCancel();
  }

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending !== null) return;
    setChecked(true);
    setRefused(false);
    setStatus(undefined);
    if (passwordError !== undefined) {
      passwordRef.current?.focus();
      return;
    }
    onAction?.();
    if (me === undefined) return;
    if (me.fortyTwoConnected) {
      const meId = me.id;
      setPending('disconnect');
      try {
        await disconnect42(password.trim());
        if (!mountedRef.current) {
          await queryClient.cancelQueries({ queryKey: ME_QUERY_KEY });
          void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
          return;
        }
        await queryClient.cancelQueries({ queryKey: ME_QUERY_KEY });
        queryClient.setQueryData<OwnProfile>(ME_QUERY_KEY, (cached) =>
          cached === undefined || cached.id !== meId
            ? cached
            : { ...cached, fortyTwoConnected: false },
        );
        if (mountedRef.current) {
          setPassword('');
          setChecked(false);
          setRefused(false);
          disclosure.hide(false);
          setStatus({ kind: 'disconnected' });
        }
      } catch (error) {
        const code = failureCode(error);
        if (code === 'password_incorrect') {
          if (mountedRef.current && passwordRef.current?.value === password) {
            setRefused(true);
            passwordRef.current.focus();
          }
        } else if (mountedRef.current) setStatus({ kind: 'failed', code });
        if (code === 'forty_two_not_connected') {
          if (mountedRef.current) {
            setPassword('');
            setChecked(false);
            setRefused(false);
            disclosure.hide(false);
          }
          await queryClient.cancelQueries({ queryKey: ME_QUERY_KEY });
          void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
        }
      } finally {
        setPending(null);
      }
      return;
    }
    setPending('connect');
    try {
      const { authorizeUrl } = await start42('link', password.trim());
      if (!mountedRef.current) return;
      window.location.assign(authorizeUrl);
      window.clearTimeout(handOffTimerRef.current);
      handOffTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) setPending(null);
      }, 5000);
    } catch (error) {
      if (!mountedRef.current) return;
      const code = failureCode(error);
      if (code === 'password_incorrect') {
        if (passwordRef.current?.value === password) {
          setRefused(true);
          passwordRef.current.focus();
        }
      } else setStatus({ kind: 'failed', code });
      if (code === 'forty_two_connected') {
        setPassword('');
        setChecked(false);
        setRefused(false);
        disclosure.hide(false);
        await queryClient.cancelQueries({ queryKey: ME_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      }
      setPending(null);
    }
  }

  const connected = me?.fortyTwoConnected === true;

  const statusSlot =
    status !== undefined ? (
      <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
        {status.kind === 'disconnected' ? (
          <Banner tone="success" title={copy.disconnectedNotice} />
        ) : (
          <Banner tone="danger" title={errorText(status.code)} />
        )}
      </div>
    ) : null;

  if (me === undefined) {
    return (
      <SettingRow title={copy.title} titleId={titleId} description={copy.subtitle}>
        {isError ? null : (
          <p aria-busy="true" className="text-sm text-ink-muted">
            {t.profile.me.loading}
          </p>
        )}
      </SettingRow>
    );
  }

  return (
    <SettingRow
      title={copy.title}
      titleId={titleId}
      description={connected ? copy.subtitleConnected : copy.subtitle}
      status={
        connected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-900">
            <CheckIcon size={14} aria-hidden="true" />
            {copy.connected}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-muted">
            {copy.notConnected}
          </span>
        )
      }
      action={
        disclosure.open ? null : (
          <Button ref={disclosure.triggerRef} variant="secondary" aria-disabled={held || undefined} onClick={onShow}>
            {connected ? copy.disconnect : copy.connect}
          </Button>
        )
      }
    >
      {disclosure.open ? null : statusSlot}
      {disclosure.open ? (
        <form
          ref={(node) => {
            disclosure.panelRef.current = node;
          }}
          aria-labelledby={titleId}
          onSubmit={(event) => void onSubmit(event)}
          onKeyDown={onKeyDown}
          noValidate
          className={`flex min-w-0 max-w-md flex-col gap-4 ${revealClass}`}
        >
          {statusSlot}
          <p id={introId} className="text-sm text-ink">
            {connected ? copy.disconnectIntro : formatText(copy.connectIntro, { brand: BRAND })}
          </p>
          <input
            type="text"
            autoComplete="username"
            value={me.email}
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          />
          <PasswordField
            ref={passwordRef}
            label={t.auth.passwordChange.currentLabel}
            {...t.auth.passwordChange.currentVisibility}
            autoComplete="current-password"
            maxBytes={LIMITS.password.maxBytes}
            aria-describedby={introId}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setRefused(false);
            }}
            error={
              checked && passwordError === 'empty'
                ? t.auth.passwordChange.currentEmpty
                : checked && passwordError === 'invalid'
                  ? passwordInvalid
                  : refused
                    ? `${errorText('password_incorrect')} ${formatText(copy.wrongPassword, { brand: BRAND })}`
                    : undefined
            }
          />
          <div className="flex flex-wrap gap-2">
            {connected ? (
              <Button type="submit" variant="danger" loading={pending === 'disconnect'}>
                {pending === 'disconnect' ? copy.disconnecting : copy.disconnect}
              </Button>
            ) : (
              <Button type="submit" loading={pending === 'connect'}>
                {pending === 'connect' ? copy.connecting : copy.continue}
              </Button>
            )}
            <Button variant="secondary" aria-disabled={pending !== null || undefined} onClick={onCancel}>
              {copy.cancel}
            </Button>
          </div>
        </form>
      ) : null}
    </SettingRow>
  );
}
