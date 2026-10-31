import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { SESSION_QUERY_KEY, type SessionValue } from '../api/session';
import { Button, Modal } from '../design';
import { useI18n } from '../i18n/context';

type Report = (key: string, dirty: boolean) => void;

const UnsavedContext = createContext<Report | null>(null);

export function UnsavedChangesGuard({ children }: { children: ReactNode }): React.JSX.Element {
  const { t } = useI18n();
  const copy = t.profile.me;
  const [dirtyKeys, setDirtyKeys] = useState<ReadonlySet<string>>(() => new Set());
  const stayRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const report = useCallback<Report>((key, dirty) => {
    setDirtyKeys((previous) => {
      if (previous.has(key) === dirty) return previous;
      const next = new Set(previous);
      if (dirty) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  const dirty = dirtyKeys.size > 0;
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) =>
      dirty &&
      current.pathname !== next.pathname &&
      queryClient.getQueryData<SessionValue>(SESSION_QUERY_KEY)?.authenticated === true,
    enableBeforeUnload: dirty,
    withResolver: true,
  });

  return (
    <UnsavedContext.Provider value={report}>
      {children}
      <Modal
        open={blocker.status === 'blocked'}
        size="sm"
        title={copy.leaveTitle}
        description={copy.leaveBody}
        onClose={() => blocker.reset?.()}
        initialFocusRef={stayRef}
        footer={
          <>
            <Button ref={stayRef} variant="secondary" onClick={() => blocker.reset?.()}>
              {copy.stay}
            </Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>
              {copy.leave}
            </Button>
          </>
        }
      />
    </UnsavedContext.Provider>
  );
}

export function useUnsavedChanges(dirty: boolean): void {
  const report = useContext(UnsavedContext);
  const key = useId();
  useEffect(() => {
    report?.(key, dirty);
  }, [report, key, dirty]);
  useEffect(() => () => report?.(key, false), [report, key]);
}
