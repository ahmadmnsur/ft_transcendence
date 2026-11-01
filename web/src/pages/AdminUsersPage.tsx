import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper, type SortingState } from '@tanstack/react-table';
import { LIMITS, PAGING, isValidSearchQuery } from '@shared/limits';
import { ROLES, type Role } from '@shared/roles';
import { STUDENT_STATUSES, type StudentStatus } from '@shared/student-status';
import { adminStudentsQueryOptions, type AdminStudentRow, type UserSort } from '../api/admin-students';
import type { SearchOrder } from '../api/profile';
import { Avatar, Button, DataTable, PersonName, Select, TextField } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { failureCode } from '../profile/failure';

export interface AdminUsersSearch {
  q?: string;
  role?: Role;
  status?: StudentStatus;
  sort?: UserSort;
  order?: SearchOrder;
  page?: number;
}

const SORTS: readonly UserSort[] = ['name', 'email'];
const ORDERS: readonly SearchOrder[] = ['asc', 'desc'];

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

export function parseAdminUsersSearch(search: Record<string, unknown>): AdminUsersSearch {
  const q = typeof search.q === 'string' || typeof search.q === 'number' ? String(search.q).trim() : '';
  const page = search.page;
  return {
    q: q !== '' && isValidSearchQuery(q) ? q : undefined,
    role: pick(search.role, ROLES),
    status: pick(search.status, STUDENT_STATUSES),
    sort: pick(search.sort, SORTS),
    order: pick(search.order, ORDERS),
    page: typeof page === 'number' && Number.isSafeInteger(page) && page > 1 ? page : undefined,
  };
}

type Filters = Pick<AdminUsersSearch, 'q' | 'role' | 'status'>;

const NO_FILTERS = { q: undefined, role: undefined, status: undefined } as const;

function FiltersForm({
  applied,
  queryRef,
  onApply,
}: {
  applied: Filters;
  queryRef: React.RefObject<HTMLInputElement | null>;
  onApply: (filters: Filters) => void;
}): React.JSX.Element {
  const { t, format } = useI18n();
  const copy = t.admin.users;
  const [q, setQ] = useState(applied.q ?? '');
  const [role, setRole] = useState<string>(applied.role ?? '');
  const [status, setStatus] = useState<string>(applied.status ?? '');
  const [qInvalid, setQInvalid] = useState(false);
  const [lastApplied, setLastApplied] = useState(() => JSON.stringify(applied));

  const appliedKey = JSON.stringify(applied);
  if (appliedKey !== lastApplied) {
    setLastApplied(appliedKey);
    setQ(applied.q ?? '');
    setRole(applied.role ?? '');
    setStatus(applied.status ?? '');
    setQInvalid(false);
  }

  function onSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (!isValidSearchQuery(q)) {
      setQInvalid(true);
      queryRef.current?.focus();
      return;
    }
    const term = q.trim();
    onApply({
      q: term === '' ? undefined : term,
      role: pick(role, ROLES),
      status: pick(status, STUDENT_STATUSES),
    });
  }

  function onClear(): void {
    setQ('');
    setRole('');
    setStatus('');
    setQInvalid(false);
    onApply(NO_FILTERS);
  }

  return (
    <form
      role="search"
      aria-label={copy.filtersLabel}
      noValidate
      onSubmit={onSubmit}
      className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-3"
    >
      <TextField
        ref={queryRef}
        type="search"
        label={copy.queryLabel}
        value={q}
        error={qInvalid ? format(copy.queryInvalid, { count: LIMITS.searchQuery.maxChars }) : undefined}
        onChange={(event) => {
          setQ(event.target.value);
          if (qInvalid) setQInvalid(!isValidSearchQuery(event.target.value));
        }}
      />
      <Select
        label={copy.roleLabel}
        options={[{ value: '', label: copy.anyRole, separator: true }, ...ROLES.map((item) => ({ value: item, label: t.admin.roles[item] }))]}
        value={role}
        onValueChange={setRole}
      />
      <Select
        label={copy.statusLabel}
        options={[{ value: '', label: copy.anyStatus, separator: true }, ...STUDENT_STATUSES.map((item) => ({ value: item, label: t.admin.statuses[item] }))]}
        value={status}
        onValueChange={setStatus}
      />
      <div className="flex flex-wrap gap-2 sm:col-span-3">
        <Button type="submit">{copy.submit}</Button>
        <Button type="button" variant="secondary" onClick={onClear}>
          {copy.clear}
        </Button>
      </div>
    </form>
  );
}

const column = createColumnHelper<AdminStudentRow>();

export function AdminUsersPage(): React.JSX.Element {
  const { t, format, errorText } = useI18n();
  const copy = t.admin.users;
  const search = useSearch({ from: '/admin/users' });
  const navigate = useNavigate({ from: '/admin/users' });
  const queryRef = useRef<HTMLInputElement>(null);
  const sort = search.sort ?? 'name';
  const order = search.order ?? 'asc';
  const page = search.page ?? 1;
  const filters: Filters = { q: search.q, role: search.role, status: search.status };
  const results = useQuery(
    adminStudentsQueryOptions({ ...filters, sort, order, page, pageSize: PAGING.defaultPageSize }),
  );
  const filtered = Object.values(filters).some((value) => value !== undefined);

  function go(next: AdminUsersSearch): void {
    void navigate({ search: (previous) => ({ ...previous, ...next }) });
  }

  function applyFilters(next: Filters): void {
    go({ ...next, page: undefined });
  }

  const sorting: SortingState = [{ id: sort, desc: order === 'desc' }];
  function onSortingChange(next: SortingState): void {
    const first = next[0];
    const nextSort: UserSort = first?.id === 'email' ? 'email' : 'name';
    const nextOrder: SearchOrder = first?.desc === true ? 'desc' : 'asc';
    const isDefault = first === undefined || (nextSort === 'name' && nextOrder === 'asc');
    go({ sort: isDefault ? undefined : nextSort, order: isDefault ? undefined : nextOrder, page: undefined });
  }

  const columns = useMemo(
    () => [
      column.accessor('displayName', {
        id: 'name',
        header: copy.columns.name,
        cell: ({ row }) => (
          <Link
            to="/admin/users/$studentId"
            params={{ studentId: row.original.id }}
            className="inline-flex min-w-0 items-center gap-2 rounded font-medium text-link underline-offset-2 hover:underline focus-ring wrap-anywhere"
          >
            <Avatar src={row.original.avatarUrl} alt="" size="xs" />
            <PersonName name={row.original.displayName} removed={false} />
          </Link>
        ),
      }),
      column.accessor('email', {
        header: copy.columns.email,
        cell: (info) => (
          <bdi dir="ltr" className="wrap-anywhere">
            {info.getValue()}
          </bdi>
        ),
      }),
      column.accessor('role', {
        header: copy.columns.role,
        enableSorting: false,
        cell: (info) => t.admin.roles[info.getValue()],
      }),
      column.accessor('status', {
        header: copy.columns.status,
        enableSorting: false,
        cell: (info) => t.admin.statuses[info.getValue()],
      }),
    ],
    [copy, t],
  );

  const loading = results.isPending || results.isPlaceholderData;

  return (
    <>
      <PageTitle name={copy.title} />
      <div className="flex min-w-0 flex-col gap-6">
        <h1 className="text-2xl font-semibold text-ink">{copy.title}</h1>
        <FiltersForm applied={filters} queryRef={queryRef} onApply={applyFilters} />
        <p aria-live="polite" className="text-sm text-ink-muted">
          {results.data !== undefined && !loading ? format(copy.count, { count: results.data.total }) : null}
        </p>
        <DataTable
          data={results.data?.items ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          total={results.data?.total ?? 0}
          page={page}
          pageSize={PAGING.defaultPageSize}
          sorting={sorting}
          onSortingChange={onSortingChange}
          onPageChange={(next) => go({ page: next > 1 ? next : undefined })}
          caption={copy.caption}
          emptyTitle={copy.emptyTitle}
          emptyDescription={copy.emptyDescription}
          emptyAction={
            filtered ? (
              <Button
                variant="secondary"
                onClick={() => {
                  applyFilters(NO_FILTERS);
                  queryRef.current?.focus();
                }}
              >
                {copy.clear}
              </Button>
            ) : undefined
          }
          loading={loading}
          error={results.isError ? errorText(failureCode(results.error)) : undefined}
          onRetry={() => void results.refetch()}
        />
      </div>
    </>
  );
}
