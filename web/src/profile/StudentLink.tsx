import { Link } from '@tanstack/react-router';
import type { StudentRef } from '../api/profile';
import { Avatar, PersonName, RoleLabel } from '../design';

// A Student wherever a list names one (§6.0.1): their avatar and name, linked
// to their profile, and the Admin label (§12.8). A Removed Student shows the
// tombstone and the default avatar. The name wraps anywhere, since a list
// outside a table has no cell to wrap a long name for it.
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
