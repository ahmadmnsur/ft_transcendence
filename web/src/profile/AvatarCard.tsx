import { useEffect, useRef, useState } from 'react';
import { LIMITS } from '@shared/limits';
import { Avatar, Banner, Button, Card, FileDrop, Modal } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from './failure';
import { PendingCardBody } from './PendingCardBody';
import { revealClass, useDisclosure } from './SettingRow';
import type { ProfileTarget } from './target';

type Status = { kind: 'saved' } | { kind: 'removed' } | { kind: 'failed'; code: unknown };

export function AvatarCard({ target }: { target: ProfileTarget }): React.JSX.Element {
  const { t, errorText } = useI18n();
  const copy = target.voice === 'own' ? t.profile.avatar : { ...t.profile.avatar, ...t.admin.cards.avatar };
  const profile = target.profile;
  const [upload, setUpload] = useState<{ file: File; progress: number } | null>(null);
  const [refused, setRefused] = useState<{ file: File; code: unknown } | null>(null);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const disclosure = useDisclosure();

  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  if (profile === undefined) {
    return (
      <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
        <PendingCardBody failed={target.failed} reserveClassName="min-h-40" />
      </Card>
    );
  }

  const avatarUrl = profile.avatarUrl;

  async function start(file: File): Promise<void> {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRefused(null);
    setStatus(undefined);
    setUpload({ file, progress: 0 });
    try {
      const saved = await target.api.uploadAvatar(file, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (controllerRef.current === controller) setUpload({ file, progress });
        },
      });
      if (controllerRef.current !== controller) return;
      await target.apply({ avatarUrl: saved.avatarUrl });
      disclosure.hide(false);
      setStatus({ kind: 'saved' });
    } catch (error) {
      if (controller.signal.aborted) {
        target.reread();
        return;
      }
      if (controllerRef.current === controller) setRefused({ file, code: failureCode(error) });
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setUpload(null);
      }
    }
  }

  function onPick(file: File | null): void {
    if (file !== null) {
      void start(file);
      return;
    }
    const controller = controllerRef.current;
    controllerRef.current = null;
    controller?.abort();
    setUpload(null);
    setRefused(null);
  }

  function onCancel(): void {
    onPick(null);
    disclosure.hide();
  }

  function onPanelKeyDown(event: React.KeyboardEvent): void {
    if (event.key !== 'Escape' || event.nativeEvent.isComposing) return;
    if (event.target instanceof Element && event.target.closest('dialog') !== null) return;
    event.preventDefault();
    onCancel();
  }

  async function onRemove(): Promise<void> {
    if (removing) return;
    setRemoving(true);
    try {
      await target.api.deleteAvatar();
      await target.apply({ avatarUrl: null });
      setStatus({ kind: 'removed' });
    } catch (error) {
      setStatus({ kind: 'failed', code: failureCode(error) });
    } finally {
      setRemoving(false);
      setConfirming(false);
    }
  }

  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
      <div className="flex min-w-0 flex-col gap-4">
        {status !== undefined ? (
          <div ref={statusRef} tabIndex={-1} className="rounded-lg focus-ring">
            {status.kind === 'failed' ? (
              <Banner tone="danger" title={errorText(status.code)} />
            ) : (
              <Banner tone="success" title={status.kind === 'saved' ? copy.saved : copy.removed} />
            )}
          </div>
        ) : null}
        <div className={`flex min-w-0 flex-wrap gap-4 ${disclosure.open ? 'items-start' : 'items-center'}`}>
          <Avatar src={avatarUrl} alt={avatarUrl === null ? copy.defaultAlt : copy.currentAlt} size="xl" loading="eager" />
          {disclosure.open ? (
            <div
              ref={(node) => {
                disclosure.panelRef.current = node;
              }}
              onKeyDown={onPanelKeyDown}
              className={`flex min-w-0 flex-1 basis-64 flex-col gap-3 ${revealClass}`}
            >
              <FileDrop
                label={copy.fileLabel}
                accept={[...LIMITS.avatar.mimeTypes]}
                maxBytes={LIMITS.avatar.maxBytes}
                value={upload?.file ?? refused?.file ?? null}
                onChange={onPick}
                error={refused === null ? undefined : errorText(refused.code)}
                progress={upload?.progress}
              />
              <Button variant="secondary" className="self-start" onClick={onCancel}>
                {copy.cancel}
              </Button>
            </div>
          ) : (
            <div className="flex min-w-0 flex-wrap gap-2">
              <Button
                ref={disclosure.triggerRef}
                variant="secondary"
                onClick={() => {
                  setStatus(undefined);
                  disclosure.show();
                }}
              >
                {avatarUrl === null ? copy.upload : copy.change}
              </Button>
              {avatarUrl !== null ? (
                <Button
                  variant="danger-ghost"
                  onClick={() => {
                    setStatus(undefined);
                    setConfirming(true);
                  }}
                >
                  {copy.remove}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
      <Modal
        open={confirming}
        size="sm"
        title={copy.confirmTitle}
        description={copy.confirmBody}
        onClose={() => {
          if (!removing) setConfirming(false);
        }}
        initialFocusRef={keepRef}
        footer={
          <>
            <Button
              ref={keepRef}
              variant="secondary"
              onClick={() => {
                if (!removing) setConfirming(false);
              }}
            >
              {copy.cancel}
            </Button>
            <Button variant="danger" loading={removing} onClick={() => void onRemove()}>
              {removing ? copy.removing : copy.confirm}
            </Button>
          </>
        }
      />
    </Card>
  );
}
