import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { createHandMadeMatch } from '../api/matches';
import type { StudentRef } from '../api/profile';
import { Banner, Button, Select } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';

type Notice = { matchId: string } | { code: unknown };

// Mounted with the Round's key by UnmatchedCard: moving to a different Round
// starts a fresh selection. Refetched candidates may invalidate either choice.
export function HandMadeMatchForm({ students }: { students: StudentRef[] }): React.JSX.Element {
  const { t, personNameText, errorText } = useI18n();
  const copy = t.matching.handMade;
  const client = useQueryClient();
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice>();
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFirst((id) => (students.some((student) => student.id === id) ? id : ''));
    setSecond((id) => (students.some((student) => student.id === id) ? id : ''));
  }, [students]);
  useEffect(() => {
    if (notice !== undefined) noticeRef.current?.focus();
  }, [notice]);

  const valid = first !== second && [first, second].every((id) => students.some((student) => student.id === id));
  async function submit(): Promise<void> {
    if (pending || !valid) return;
    setPending(true);
    setNotice(undefined);
    try {
      const result = await createHandMadeMatch(client, [first, second]);
      if (result !== undefined) {
        setFirst('');
        setSecond('');
        setNotice({ matchId: result.id });
      }
    } catch (error) {
      setNotice({ code: failureCode(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {students.length >= 2 ? (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex min-w-0 flex-col gap-3 rounded-lg border border-line p-3"
        >
          <p className="text-sm text-ink-muted">{copy.description}</p>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <Select label={copy.first} value={first} disabled={pending} onChange={(event) => setFirst(event.target.value)}>
              <option value="">{copy.choose}</option>
              {students.filter((student) => student.id !== second).map((student) => (
                <option key={student.id} value={student.id}>
                  {personNameText(student.displayName, student.removed)}
                </option>
              ))}
            </Select>
            <Select label={copy.second} value={second} disabled={pending} onChange={(event) => setSecond(event.target.value)}>
              <option value="">{copy.choose}</option>
              {students.filter((student) => student.id !== first).map((student) => (
                <option key={student.id} value={student.id}>
                  {personNameText(student.displayName, student.removed)}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" loading={pending} aria-disabled={!valid || pending} className="self-start">
            {pending ? copy.creating : copy.create}
          </Button>
        </form>
      ) : null}
      <div ref={noticeRef} tabIndex={-1} className="rounded-lg focus-ring">
        {notice === undefined ? null : 'code' in notice ? (
          <Banner tone="danger" title={errorText(notice.code)} />
        ) : (
          <Banner
            tone="success"
            title={copy.created}
            body={
              <Link
                to="/admin/matches/$matchId"
                params={{ matchId: notice.matchId }}
                className="rounded text-link underline underline-offset-2 focus-ring"
              >
                {copy.view}
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
