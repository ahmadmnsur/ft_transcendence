import type { StudentRef } from '../api/profile';
import { AlertIcon, Button, Card, EmptyState } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { StudentLink } from '../profile/StudentLink';
import { HandMadeMatchForm } from './HandMadeMatchForm';

// §8.9: the open Round's unmatched Students, which the API derives when read
// and never stores. On `/admin/rounds` and on the open Round's own page.
export function UnmatchedCard({
  students,
  roundId,
  error,
  onRetry,
}: {
  // Undefined while the Round's read is pending.
  students: StudentRef[] | undefined;
  roundId: string;
  error?: unknown;
  onRetry?: () => void;
}): React.JSX.Element {
  const { t, errorText } = useI18n();
  const copy = t.matching.unmatched;
  let body: React.ReactNode;
  if (students === undefined) {
    body =
      error !== undefined && error !== null ? (
        <EmptyState
          icon={<AlertIcon size={24} />}
          title={errorText(failureCode(error))}
          action={
            onRetry ? (
              <Button variant="secondary" onClick={onRetry}>
                {t.matching.match.retry}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <p aria-busy="true" className="text-sm text-ink-muted">
          {copy.loading}
        </p>
      );
  } else if (students.length === 0) {
    body = <p className="text-sm text-ink-muted">{copy.empty}</p>;
  } else {
    body = (
      <ul className="flex min-w-0 flex-col divide-y divide-line">
        {students.map((student) => (
          <li key={student.id} className="py-2">
            <StudentLink student={student} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
      <div className="flex min-w-0 flex-col gap-3">
        {students !== undefined ? <HandMadeMatchForm key={roundId} students={students} /> : null}
        {body}
      </div>
    </Card>
  );
}
