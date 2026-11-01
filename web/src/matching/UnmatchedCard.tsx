import type { StudentRef } from '../api/profile';
import { AlertIcon, Button, Card, EmptyState } from '../design';
import { useI18n } from '../i18n/context';
import { failureCode } from '../profile/failure';
import { StudentLink } from '../profile/StudentLink';
import { HandMadeMatchForm } from './HandMadeMatchForm';
import { candidateReferences } from './candidate-references';

export function UnmatchedCard({
  students,
  roundId,
  error,
  onRetry,
}: {
  students: StudentRef[] | undefined;
  roundId: string;
  error?: unknown;
  onRetry?: () => void;
}): React.JSX.Element {
  const { t, errorText } = useI18n();
  const copy = t.matching.unmatched;
  const references = candidateReferences(students ?? []);
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
          <li key={student.id} className="flex min-w-0 flex-wrap items-center gap-2 py-2">
            <StudentLink student={student} />
            <bdi dir="ltr" className="font-mono text-xs text-ink-muted">{references.get(student.id)}</bdi>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <Card title={copy.title} subtitle={copy.subtitle} headingLevel={2}>
      <div className="flex min-w-0 flex-col gap-3">
        {students !== undefined ? <HandMadeMatchForm key={roundId} students={students} references={references} /> : null}
        {body}
      </div>
    </Card>
  );
}
