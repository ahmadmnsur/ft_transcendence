import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { charLength, isValidText, LIMITS } from '@shared/limits';
import { REPORT_REASONS, type ReportReason } from '@shared/reports';
import { addBlock, blocksQueryOptions } from '../api/blocks';
import { studentQueryKey, type StudentRef } from '../api/profile';
import { fileReport } from '../api/reports';
import { sessionQueryOptions } from '../api/session';
import { Banner, Button, Modal, Select, TextArea } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';

type Target = { postId: string } | { studentId: string };
type Props = { target: Target; student: StudentRef };
type BlockStatus = { kind: 'blocked' } | { kind: 'failed'; code: unknown };

// §12.2: each opening is keyed to start a fresh form. The Modal stays mounted
// between openings so closing returns focus to Report: a native dialog restores
// focus on close, not on removal.
export function ReportControl({ target, student }: Props): React.JSX.Element | null {
  const { t } = useI18n();
  const { data: session } = useQuery(sessionQueryOptions());
  const [open, setOpen] = useState(false);
  const [openings, setOpenings] = useState(0);
  const viewerId = session?.authenticated === true ? session.student.id : null;
  if (viewerId === null || viewerId === student.id || ('studentId' in target && student.removed)) return null;

  return (
    <>
      <Button variant="ghost" size="sm" aria-haspopup="dialog" onClick={() => {
        setOpenings((count) => count + 1);
        setOpen(true);
      }}>
        {t.reports.report}
      </Button>
      {openings === 0 ? null : (
        <ReportDialog key={openings} open={open} target={target} student={student} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function ReportDialog({ target, student, open, onClose }: Props & {
  open: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const { t, formatText, personNameValue, errorText } = useI18n();
  const copy = t.reports;
  const actions = t.social.actions;
  const profile = t.social.profile;
  const queryClient = useQueryClient();
  const blocks = useQuery({ ...blocksQueryOptions(), enabled: open && !student.removed });
  const blocked = blocks.data?.items.some((item) => item.student.id === student.id) ?? false;
  const name = personNameValue(student.displayName, student.removed);
  const formId = useId();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [text, setText] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [received, setReceived] = useState(false);
  const [failure, setFailure] = useState<{ code: unknown } | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [blockPending, setBlockPending] = useState(false);
  const [blockStatus, setBlockStatus] = useState<BlockStatus | undefined>(undefined);
  const pendingRef = useRef(false);
  const blockPendingRef = useRef(false);
  const reasonRef = useRef<HTMLSelectElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const receiptRef = useRef<HTMLParagraphElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const blockRef = useRef<HTMLButtonElement>(null);
  const blockStatusRef = useRef<HTMLDivElement>(null);
  const wasConfirming = useRef(false);
  const trimmed = text.trim();
  const textValid = trimmed === '' || isValidText(trimmed, LIMITS.reportText, true);
  const textError = attempted && !textValid
    ? charLength(trimmed) > LIMITS.reportText.maxChars
      ? formatText(copy.textTooLong, { limit: LIMITS.reportText.maxChars })
      : copy.textInvalid
    : undefined;

  // ADR-0011 d12: focus the receipt so the reporter hears the whole promise.
  useEffect(() => {
    if (received && !confirming) receiptRef.current?.focus();
  }, [received, confirming]);

  // ADR-0011 d13: confirmation replaces content inside the same dialog.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirming.current) blockRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  useEffect(() => {
    if (blockStatus !== undefined && !confirming) blockStatusRef.current?.focus();
  }, [blockStatus, confirming]);

  useEffect(() => {
    if (blocked) setConfirming(false);
  }, [blocked]);

  function close(): void {
    if (!pendingRef.current && !blockPendingRef.current) onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pendingRef.current) return;
    setAttempted(true);
    if (reason === '') {
      reasonRef.current?.focus();
      return;
    }
    if (!textValid) {
      textRef.current?.focus();
      return;
    }
    pendingRef.current = true;
    setPending(true);
    setFailure(undefined);
    try {
      await fileReport(target, reason, trimmed === '' ? undefined : trimmed);
      setReceived(true);
    } catch (error) {
      setFailure({ code: failureCode(error) });
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  async function onBlock(): Promise<void> {
    if (blockPendingRef.current) return;
    blockPendingRef.current = true;
    setBlockPending(true);
    try {
      await addBlock(queryClient, student.id);
      setBlockStatus({ kind: 'blocked' });
    } catch (error) {
      void queryClient.invalidateQueries({ queryKey: studentQueryKey(student.id) });
      setBlockStatus({ kind: 'failed', code: failureCode(error) });
    } finally {
      blockPendingRef.current = false;
      setBlockPending(false);
      setConfirming(false);
    }
  }

  return (
    <Modal
      open={open}
      title={confirming
        ? formatText(profile.confirmTitle, { name })
        : formatText('postId' in target ? copy.postTitle : copy.studentTitle, { name })}
      description={confirming ? formatText(profile.confirmBody, { name }) : undefined}
      onClose={close}
      initialFocusRef={confirming ? cancelRef : reasonRef}
      footer={confirming ? (
        <>
          <Button
            ref={cancelRef}
            variant="secondary"
            onClick={() => {
              if (!blockPendingRef.current) setConfirming(false);
            }}
          >
            {actions.cancel}
          </Button>
          <Button variant="danger" loading={blockPending} onClick={() => void onBlock()}>
            {blockPending ? actions.blocking : profile.confirm}
          </Button>
        </>
      ) : received ? (
        <Button variant="secondary" onClick={close}>{copy.close}</Button>
      ) : (
        <>
          <Button variant="secondary" onClick={close}>{copy.cancel}</Button>
          <Button type="submit" form={formId} loading={pending}>
            {pending ? copy.submitting : copy.submit}
          </Button>
        </>
      )}
    >
      {confirming ? null : (
        <div className="flex min-w-0 flex-col gap-4">
          {received ? (
            <p ref={receiptRef} tabIndex={-1} className="rounded text-sm text-ink focus-ring">
              {copy.received}
            </p>
          ) : (
            <form id={formId} noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
              {failure !== undefined ? <Banner tone="danger" title={errorText(failure.code)} /> : null}
              <Select
                ref={reasonRef}
                label={copy.reason}
                required
                value={reason}
                disabled={pending}
                onChange={(event) => setReason(event.target.value as ReportReason | '')}
                error={attempted && reason === '' ? copy.reasonRequired : undefined}
              >
                <option value="">{copy.chooseReason}</option>
                {REPORT_REASONS.map((code) => <option key={code} value={code}>{copy.reasons[code]}</option>)}
              </Select>
              <TextArea
                ref={textRef}
                label={copy.textLabel}
                value={text}
                disabled={pending}
                onChange={(event) => setText(event.target.value)}
                hint={formatText(copy.textHint, { limit: LIMITS.reportText.maxChars })}
                error={textError}
              />
              <p className="text-sm text-ink-muted">
                {'postId' in target ? copy.postNotice : formatText(copy.studentNotice, { name })}
              </p>
            </form>
          )}
          {student.removed ? null : (
            <div className="flex flex-col gap-3 border-t border-line pt-4">
              {blockStatus !== undefined ? (
                <div ref={blockStatusRef} tabIndex={-1} className="rounded-lg focus-ring">
                  {blockStatus.kind === 'failed' ? (
                    <Banner tone="danger" title={errorText(blockStatus.code)} />
                  ) : (
                    <Banner tone="success" title={formatText(actions.blocked, { name })} />
                  )}
                </div>
              ) : null}
              {blocked ? <p className="text-sm text-ink-muted">{profile.blockedNote}</p> : blocks.data === undefined ? (
                blocks.isError ? (
                  <>
                    <Banner tone="danger" title={errorText(failureCode(blocks.error))} />
                    <Button variant="secondary" size="sm" onClick={() => void blocks.refetch()}>
                      {actions.retry}
                    </Button>
                  </>
                ) : null
              ) : (
                <div>
                  <Button ref={blockRef} variant="danger-ghost" size="sm" disabled={pending} onClick={() => {
                    setBlockStatus(undefined);
                    setConfirming(true);
                  }}>
                    {formatText(copy.block, { name })}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
