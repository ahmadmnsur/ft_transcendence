import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { charLength, isValidText, LIMITS } from '@shared/limits';
import { REPORT_REASONS, type ReportReason, type ReportTarget } from '@shared/reports';
import type { StudentRef } from '../api/profile';
import { fileReport } from '../api/reports';
import { sessionQueryOptions } from '../api/session';
import { Banner, Button, Modal, Select, TextArea } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { BlockControl } from '../social/BlockControl';

type Props = { target: ReportTarget; student: StudentRef };

// Whether Report shows: to a signed-in Student, never on their own profile or
// Post, and never on a Removed Student's profile.
export function canReport(viewerId: string | null, target: ReportTarget, student: StudentRef): boolean {
  return viewerId !== null && viewerId !== student.id && !('studentId' in target && student.removed);
}

// §12.2: each opening is keyed to start a fresh form. The Modal stays mounted
// between openings so closing returns focus to Report: a native dialog restores
// focus on close, not on removal.
export function ReportControl({ target, student }: Props): React.JSX.Element | null {
  const { t } = useI18n();
  const { data: session } = useQuery(sessionQueryOptions());
  const [open, setOpen] = useState(false);
  const [openings, setOpenings] = useState(0);
  const viewerId = session?.authenticated === true ? session.student.id : null;
  if (!canReport(viewerId, target, student)) return null;

  return (
    <>
      <Button variant="secondary" size="sm" aria-haspopup="dialog" onClick={() => {
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
  const name = personNameValue(student.displayName, student.removed);
  const formId = useId();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [text, setText] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [received, setReceived] = useState(false);
  const [failure, setFailure] = useState<{ code: unknown } | undefined>(undefined);
  const pendingRef = useRef(false);
  const reasonRef = useRef<HTMLSelectElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const receiptRef = useRef<HTMLParagraphElement>(null);
  const trimmed = text.trim();
  const textValid = trimmed === '' || isValidText(trimmed, LIMITS.reportText, true);
  const textError = attempted && !textValid
    ? charLength(trimmed) > LIMITS.reportText.maxChars
      ? formatText(copy.textTooLong, { limit: LIMITS.reportText.maxChars })
      : copy.textInvalid
    : undefined;

  // ADR-0011 d12: focus the receipt so the reporter hears the whole promise.
  useEffect(() => {
    if (received) receiptRef.current?.focus();
  }, [received]);

  function close(): void {
    if (!pendingRef.current) onClose();
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

  return (
    <Modal
      open={open}
      title={formatText('postId' in target ? copy.postTitle : copy.studentTitle, { name })}
      onClose={close}
      initialFocusRef={reasonRef}
      footer={received ? (
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
          <div className="border-t border-line pt-4 empty:hidden"><BlockControl student={student} /></div>
        )}
      </div>
    </Modal>
  );
}
