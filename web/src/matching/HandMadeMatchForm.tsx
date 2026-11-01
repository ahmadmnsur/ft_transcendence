import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { createHandMadeMatch } from '../api/matches';
import type { StudentRef } from '../api/profile';
import { Banner, Button, Select } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';

type Notice = { matchId: string } | { code: unknown };

export function HandMadeMatchForm({ students, references }: {
  students: StudentRef[];
  references: ReadonlyMap<string, string>;
}): React.JSX.Element {
  const { t, formatText, personNameValue, errorText } = useI18n();
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
  function optionsWithout(other: string): { value: string; label: string }[] {
    return students
      .filter((student) => student.id !== other)
      .map((student) => ({
        value: student.id,
        label: formatText(copy.studentOption, {
          name: personNameValue(student.displayName, student.removed),
          reference: references.get(student.id) ?? student.id,
        }),
      }));
  }
  function selectedProfile(id: string): React.ReactNode {
    if (!students.some((student) => student.id === id)) return null;
    return (
      <Link
        to="/students/$studentId"
        params={{ studentId: id }}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start rounded text-sm text-link underline underline-offset-2 focus-ring"
      >
        {copy.viewProfile}
      </Link>
    );
  }
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
          <p className="text-sm text-ink-muted">{copy.identify}</p>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2">
              <Select
                label={copy.first}
                options={optionsWithout(second)}
                value={first}
                disabled={pending}
                onValueChange={setFirst}
                placeholder={copy.choose}
                searchable
                searchPlaceholder={copy.search}
              />
              {selectedProfile(first)}
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Select
                label={copy.second}
                options={optionsWithout(first)}
                value={second}
                disabled={pending}
                onValueChange={setSecond}
                placeholder={copy.choose}
                searchable
                searchPlaceholder={copy.search}
              />
              {selectedProfile(second)}
            </div>
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
