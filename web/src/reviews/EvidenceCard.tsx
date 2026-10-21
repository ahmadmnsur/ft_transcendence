import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LIMITS } from '@shared/limits';
import { adminMatchQueryOptions, matchQueryOptions } from '../api/matches';
import { deleteEvidence, evidenceUrl, uploadEvidence, type EvidenceView } from '../api/reviews';
import { Banner, Card, FileDrop, type StoredFile } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';

export interface EvidenceCardProps {
  matchId: string;
  reviewId: string;
  evidence: EvidenceView | null;
  // Whether the reader is this Review's Mentee, who alone writes it (§9.4).
  editable: boolean;
}

// §9.4, §9.7: the Review's one Evidence file, under its Learning Outcome.
// The Mentee uploads, replaces and deletes it in FileDrop; the Mentor and
// Admins see it read-only.
export function EvidenceCard(props: EvidenceCardProps): React.JSX.Element {
  return props.editable ? <EvidenceEditor {...props} /> : <EvidenceReader evidence={props.evidence} />;
}

// What the status Banner says, kept as what happened rather than as a text,
// so it follows a language switch.
type Status = { kind: 'saved' } | { kind: 'removed' } | { kind: 'failed'; code: unknown };

// A picked file is uploaded at once through XMLHttpRequest, with FileDrop's
// progress bar. FileDrop has already checked the size, extension and declared
// type against the shared limits (§9.5); the server still decides, and a
// refusal shows on the field while the saved Evidence stays. FileDrop shows
// the saved file with its preview, and asks before deleting it.
function EvidenceEditor({ matchId, reviewId, evidence }: EvidenceCardProps): React.JSX.Element {
  const { t, errorText } = useI18n();
  const copy = t.reviews.evidence;
  const queryClient = useQueryClient();
  // The file being uploaded and how much of it is sent.
  const [upload, setUpload] = useState<{ file: File; progress: number } | null>(null);
  // A file the server refused, kept in the field beside the refusal's sentence.
  const [refused, setRefused] = useState<{ file: File; code: unknown } | null>(null);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  // The upload in flight, so a new pick or a removal can stop it: two
  // uploads at once would leave whichever commits last.
  const controllerRef = useRef<AbortController | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // The status slot renders only while there is a message; once it renders,
  // focus moves to it, as on the other cards.
  useEffect(() => {
    if (status !== undefined) statusRef.current?.focus();
  }, [status]);

  // The Match detail takes the new Evidence at once; an Admin's view of the
  // Match is read again on its next visit.
  async function applyEvidence(next: EvidenceView | null): Promise<void> {
    const { queryKey } = matchQueryOptions(matchId);
    await queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData(queryKey, (current) =>
      current === undefined || current.review === null
        ? current
        : { ...current, review: { ...current.review, evidence: next } },
    );
    queryClient.removeQueries({ queryKey: adminMatchQueryOptions(matchId).queryKey });
  }

  async function start(file: File): Promise<void> {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRefused(null);
    setStatus(undefined);
    setUpload({ file, progress: 0 });
    try {
      const saved = await uploadEvidence(reviewId, file, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (controllerRef.current === controller) setUpload({ file, progress });
        },
      });
      if (controllerRef.current !== controller) return;
      await applyEvidence(saved);
      setStatus({ kind: 'saved' });
    } catch (error) {
      // A stopped upload may still have been saved once its body was sent,
      // so the Match is read again rather than guessed.
      if (controller.signal.aborted) {
        void queryClient.invalidateQueries({ queryKey: matchQueryOptions(matchId).queryKey });
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

  async function remove(): Promise<void> {
    setStatus(undefined);
    try {
      await deleteEvidence(reviewId);
      await applyEvidence(null);
      setStatus({ kind: 'removed' });
    } catch (error) {
      setStatus({ kind: 'failed', code: failureCode(error) });
    }
  }

  // FileDrop hands a file that passed its checks, or null. Null on a picked
  // file, uploading or refused, empties the field and stops its upload; on
  // the saved file, which FileDrop has confirmed, it deletes the Evidence.
  function onChange(file: File | null): void {
    if (file !== null) {
      void start(file);
      return;
    }
    if (upload !== null || refused !== null) {
      const controller = controllerRef.current;
      controllerRef.current = null;
      controller?.abort();
      setUpload(null);
      setRefused(null);
      return;
    }
    void remove();
  }

  const stored: StoredFile | null =
    evidence === null
      ? null
      : { name: evidence.filename, type: evidence.mime, size: evidence.size, previewUrl: evidenceUrl(evidence.token) };

  return (
    <Card headingLevel={2} title={copy.title} subtitle={copy.menteeSubtitle}>
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
        <FileDrop
          label={copy.fileLabel}
          accept={[...LIMITS.evidence.mimeTypes]}
          maxBytes={LIMITS.evidence.maxBytes}
          value={upload?.file ?? refused?.file ?? stored}
          onChange={onChange}
          error={refused === null ? undefined : errorText(refused.code)}
          progress={upload?.progress}
        />
      </div>
    </Card>
  );
}

// The Mentor's and Admins' view (§9.7): an image as `<img>`, a PDF in a
// same-origin `<iframe>`, each with a download link.
function EvidenceReader({ evidence }: { evidence: EvidenceView | null }): React.JSX.Element {
  const { t, format, formatText } = useI18n();
  const copy = t.reviews.evidence;
  if (evidence === null) {
    return (
      <Card headingLevel={2} title={copy.title} subtitle={copy.readerSubtitle}>
        <p className="text-sm text-ink-muted">{copy.none}</p>
      </Card>
    );
  }
  const url = evidenceUrl(evidence.token);
  const preview = formatText(t.design.fileDrop.preview, { fileName: evidence.filename });
  return (
    <Card headingLevel={2} title={copy.title} subtitle={copy.readerSubtitle}>
      <div className="flex min-w-0 flex-col gap-2">
        {evidence.mime === 'application/pdf' ? (
          <iframe src={url} title={preview} className="h-96 w-full rounded-lg border border-line bg-surface-muted" />
        ) : (
          <img
            src={url}
            alt={preview}
            className="max-h-96 max-w-full self-start rounded-lg border border-line bg-surface-muted object-contain"
          />
        )}
        <a
          href={url}
          download={evidence.filename}
          className="self-start text-sm font-semibold text-link underline underline-offset-2 focus-ring wrap-anywhere"
        >
          {format(t.design.fileDrop.download, { fileName: evidence.filename })}
        </a>
      </div>
    </Card>
  );
}
