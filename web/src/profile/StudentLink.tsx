import { Link } from '@tanstack/react-router';
import type { StudentRef } from '../api/profile';
import { Avatar, PersonName, RoleLabel } from '../design';

export function StudentLink({ student }: { student: StudentRef }): React.JSX.Element {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Link
        to="/students/$studentId"
        params={{ studentId: student.id }}
        className="inline-flex min-w-0 items-center gap-2 rounded font-medium text-link underline-offset-2 hover:underline focus-ring wrap-anywhere"
      >
        <Avatar src={student.removed ? null : student.avatarUrl} alt="" size="xs" />
        <PersonName name={student.displayName} removed={student.removed} />
      </Link>
      {student.isAdmin && !student.removed ? <RoleLabel /> : null}
    </span>
  );
}
