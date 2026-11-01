import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LIMITS, isValidPassword } from '@shared/limits';
import { disconnect42, start42 } from '../api/auth';
import { ME_QUERY_KEY, meQueryOptions, type OwnProfile } from '../api/profile';
import { Banner, Button, Card, PasswordField } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from './failure';
import { PendingCardBody } from './PendingCardBody';

type Status = { kind: 'disconnected' } | { kind: 'failed'; code: unknown };

export function FortyTwoCard({
  onAction,
}: {
  onAction?: () => void;
}): React.JSX.Element {
  const { t, format, errorText } = useI18n();
  const copy = t.profile.fortyTwo;
  const queryClient = useQueryClient();
  const { data: me, isError } = useQuery(meQueryOptions());
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<'empty' | 'invalid' | undefined>(undefined);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [pending, setPending] = useState<'connect' | 'disconnect' | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const handOffTimerRef = useRef<number | undefined>(undefined);

  const passwordInvalid = format(t.auth.password.invalid, {
    minChars: LIMITS.password.minChars,
    maxBytes: LIMITS.password.maxBytes,
  });

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

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending !== null) return;
    const nextPasswordError: 'empty' | 'invalid' | undefined =
      password === '' ? 'empty' : isValidPassword(password) ? undefined : 'invalid';
    setPasswordError(nextPasswordError);
    setStatus(undefined);
    if (nextPasswordError !== undefined) {
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
          setStatus({ kind: 'disconnected' });
        }
      } catch (error) {
        const code = failureCode(error);
        if (mountedRef.current) setStatus({ kind: 'failed', code });
        if (code === 'forty_two_not_connected') {
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
      setStatus({ kind: 'failed', code });
      if (code === 'forty_two_connected') {
        await queryClient.cancelQueries({ queryKey: ME_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
      }
      setPending(null);
    }
  }

  if (me === undefined) {
    return (
      <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
        <PendingCardBody failed={isError} reserveClassName="min-h-64" />
      </Card>
    );
  }

  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex min-w-0 flex-col gap-4">
        {status !== undefined ? (
          <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
            {status.kind === 'disconnected' ? (
              <Banner tone="success" title={copy.disconnectedNotice} />
            ) : (
              <Banner tone="danger" title={errorText(status.code)} />
            )}
          </div>
        ) : null}
        <input
          type="text"
          autoComplete="username"
          value={me.email}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
        <p className="text-sm text-ink-muted">{me.fortyTwoConnected ? copy.connected : copy.notConnected}</p>
        <PasswordField
          ref={passwordRef}
          label={t.auth.passwordChange.currentLabel}
          {...t.auth.passwordVisibility}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={
            passwordError === undefined
              ? undefined
              : passwordError === 'empty'
                ? t.auth.passwordChange.currentEmpty
                : passwordInvalid
          }
        />
        {me.fortyTwoConnected ? (
          <Button
            type="submit"
            loading={pending === 'disconnect'}
            aria-disabled={pending === 'connect' || undefined}
            className="w-full"
          >
            {pending === 'disconnect' ? copy.disconnecting : copy.disconnect}
          </Button>
        ) : (
          <Button
            type="submit"
            loading={pending === 'connect'}
            aria-disabled={pending === 'disconnect' || undefined}
            className="w-full"
          >
            {pending === 'connect' ? copy.connecting : copy.connect}
          </Button>
        )}
      </form>
    </Card>
  );
}
