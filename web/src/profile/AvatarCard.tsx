import { useEffect, useRef, useState } from 'react';
import { LIMITS } from '@shared/limits';
import { Avatar, Banner, Button, Card, FileDrop, Modal } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from './failure';
import { PendingCardBody } from './PendingCardBody';
import type { ProfileTarget } from './target';

// What the status Banner says, kept as what happened rather than as a text,
// so it follows a language switch.
type Status = { kind: 'saved' } | { kind: 'removed' } | { kind: 'failed'; code: unknown };

// §6.3, §9.6, §9.7: the avatar on `/me`, and on the Users table's detail
// (§6.12). A picked file is uploaded at once
// through XMLHttpRequest, with FileDrop's preview and progress bar. FileDrop
// has already checked the size, extension and declared type against the
// shared limits (§9.5); the server still decides, and a refusal shows on the
// field. The saved avatar shows beside it, and removing it asks first.
export function AvatarCard({ target }: { target: ProfileTarget }): React.JSX.Element {
  const { t, errorText } = useI18n();
  const copy = target.voice === 'own' ? t.profile.avatar : { ...t.profile.avatar, ...t.admin.cards.avatar };
  const profile = target.profile;
  // The file being uploaded and how much of it is sent.
  const [upload, setUpload] = useState<{ file: File; progress: number } | null>(null);
  // A file the server refused, kept in the field beside the refusal's sentence.
  const [refused, setRefused] = useState<{ file: File; code: unknown } | null>(null);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  // The upload in flight, so a new pick or a removal can stop it: two
  // uploads at once would leave whichever commits last.
  const controllerRef = useRef<AbortController | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  // The status slot renders only while there is a message; once it renders,
  // focus moves to it, as on the other cards.
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
      // The cached profile takes the new URL at once; the target refreshes
      // the header, the public profile and the search pages, which show it.
      await target.apply({ avatarUrl: saved.avatarUrl });
      setStatus({ kind: 'saved' });
    } catch (error) {
      // A stopped upload may still have been saved once its body was sent,
      // so the profile is read again rather than guessed.
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

  // FileDrop hands a file that passed its checks, or null when the picked
  // file is removed from the field, which stops its upload.
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
        <div className="flex min-w-0 flex-wrap items-start gap-4">
          <Avatar src={avatarUrl} alt={avatarUrl === null ? copy.defaultAlt : copy.currentAlt} size="xl" loading="eager" />
          <FileDrop
            className="min-w-0 flex-1 basis-64"
            label={copy.fileLabel}
            accept={[...LIMITS.avatar.mimeTypes]}
            maxBytes={LIMITS.avatar.maxBytes}
            value={upload?.file ?? refused?.file ?? null}
            onChange={onPick}
            error={refused === null ? undefined : errorText(refused.code)}
            progress={upload?.progress}
          />
        </div>
        {avatarUrl !== null && upload === null ? (
          <Button
            variant="danger-ghost"
            size="sm"
            className="self-start"
            onClick={() => {
              setStatus(undefined);
              setConfirming(true);
            }}
          >
            {copy.remove}
          </Button>
        ) : null}
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
