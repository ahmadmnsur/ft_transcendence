import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper, type SortingState } from '@tanstack/react-table';
import { LIMITS, PAGING, isValidSearchQuery } from '@shared/limits';
import { isUuid } from '@shared/uuid';
import {
  skillsQueryOptions,
  studentSearchQueryOptions,
  type SearchOrder,
  type SearchSort,
  type SkillView,
  type StudentRef,
  type StudentSearchItem,
} from '../api/profile';
import { Avatar, Banner, Button, DataTable, PersonName, RoleLabel, Select, TextField } from '../design';
import { useI18n } from '../i18n/context';
import { isolate } from '../i18n/text';
import { PageTitle } from '../layout';
import { failureCode } from '../profile/failure';

// `/students`' search params: the applied filters, the sort and the page. An
// absent one is its default, so the address stays short.
export interface StudentsSearch {
  q?: string;
  teaches?: string;
  wants?: string;
  hasGoal?: boolean;
  sort?: SearchSort;
  order?: SearchOrder;
  page?: number;
}

const SORTS: readonly SearchSort[] = ['name', 'xp', 'joined'];
const ORDERS: readonly SearchOrder[] = ['asc', 'desc'];

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

// The API checks a Skill id with the same function (`src/shared/uuid.ts`).
function uuid(value: unknown): string | undefined {
  return typeof value === 'string' && isUuid(value) ? value : undefined;
}

// §3.5.2: a value the API would refuse is dropped here, so an edited address
// never sends a failing request and the console stays clean. The router reads
// `?q=42` as a number, so a number comes back as text.
export function parseStudentsSearch(search: Record<string, unknown>): StudentsSearch {
  const q = typeof search.q === 'string' || typeof search.q === 'number' ? String(search.q).trim() : '';
  const page = search.page;
  return {
    q: q !== '' && isValidSearchQuery(q) ? q : undefined,
    teaches: uuid(search.teaches),
    wants: uuid(search.wants),
    hasGoal: typeof search.hasGoal === 'boolean' ? search.hasGoal : undefined,
    sort: pick(search.sort, SORTS),
    order: pick(search.order, ORDERS),
    page: typeof page === 'number' && Number.isSafeInteger(page) && page > 1 ? page : undefined,
  };
}

// The default sort, name A to Z, is left out of the address.
function sortParams(sort: SearchSort, order: SearchOrder): Pick<StudentsSearch, 'sort' | 'order'> {
  return sort === 'name' && order === 'asc' ? { sort: undefined, order: undefined } : { sort, order };
}

const NO_FILTERS = { q: undefined, teaches: undefined, wants: undefined, hasGoal: undefined } as const;

type Filters = Pick<StudentsSearch, 'q' | 'teaches' | 'wants' | 'hasGoal'>;

// The filters apply together on Search. The form stays mounted across
// searches, so a search never destroys the control the keyboard is on. When
// the applied filters change from outside it — the browser's Back and Forward,
// or the empty state's Clear filters — it adopts them during render, below.
function FiltersForm({
  applied,
  skills,
  catalogueFailed,
  onRetryCatalogue,
  nameRef,
  onApply,
}: {
  applied: Filters;
  skills: SkillView[];
  catalogueFailed: boolean;
  onRetryCatalogue: () => void;
  nameRef: React.RefObject<HTMLInputElement | null>;
  onApply: (filters: Filters) => void;
}): React.JSX.Element {
  const { t, format } = useI18n();
  const copy = t.people.search;
  const [q, setQ] = useState(applied.q ?? '');
  const [teaches, setTeaches] = useState(applied.teaches ?? '');
  const [wants, setWants] = useState(applied.wants ?? '');
  const [goal, setGoal] = useState(applied.hasGoal === undefined ? '' : String(applied.hasGoal));
  const [qInvalid, setQInvalid] = useState(false);
  const [lastApplied, setLastApplied] = useState(() => JSON.stringify(applied));

  // Adjusting state when a prop changes: filters that arrived from outside the
  // form replace what the fields show, during render rather than in an effect.
  const appliedKey = JSON.stringify(applied);
  if (appliedKey !== lastApplied) {
    setLastApplied(appliedKey);
    setQ(applied.q ?? '');
    setTeaches(applied.teaches ?? '');
    setWants(applied.wants ?? '');
    setGoal(applied.hasGoal === undefined ? '' : String(applied.hasGoal));
    setQInvalid(false);
  }

  function onSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (!isValidSearchQuery(q)) {
      setQInvalid(true);
      nameRef.current?.focus();
      return;
    }
    const term = q.trim();
    onApply({
      q: term === '' ? undefined : term,
      teaches: teaches === '' ? undefined : teaches,
      wants: wants === '' ? undefined : wants,
      hasGoal: goal === '' ? undefined : goal === 'true',
    });
  }

  function onClear(): void {
    setQ('');
    setTeaches('');
    setWants('');
    setGoal('');
    setQInvalid(false);
    onApply(NO_FILTERS);
  }

  const skillOptions = skills.map((skill) => (
    <option key={skill.id} value={skill.id}>
      {isolate(skill.name)}
    </option>
  ));

  return (
    <form
      role="search"
      aria-label={copy.filtersLabel}
      noValidate
      onSubmit={onSubmit}
      className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <TextField
        ref={nameRef}
        type="search"
        label={copy.nameLabel}
        value={q}
        error={qInvalid ? format(copy.nameInvalid, { count: LIMITS.searchQuery.maxChars }) : undefined}
        onChange={(event) => {
          setQ(event.target.value);
          if (qInvalid) setQInvalid(!isValidSearchQuery(event.target.value));
        }}
      />
      <Select label={copy.teachesLabel} value={teaches} onChange={(event) => setTeaches(event.target.value)}>
        <option value="">{copy.anySkill}</option>
        {skillOptions}
      </Select>
      <Select label={copy.wantsLabel} value={wants} onChange={(event) => setWants(event.target.value)}>
        <option value="">{copy.anySkill}</option>
        {skillOptions}
      </Select>
      <Select label={copy.goalLabel} value={goal} onChange={(event) => setGoal(event.target.value)}>
        <option value="">{copy.goalAny}</option>
        <option value="true">{copy.goalYes}</option>
        <option value="false">{copy.goalNo}</option>
      </Select>
      {catalogueFailed ? (
        // §6.15: without the catalogue the Skill filters offer no Skill, so the
        // form shows the generic sentence and one retry for the catalogue read.
        <div className="flex min-w-0 flex-col gap-3 sm:col-span-2 lg:col-span-4">
          <Banner tone="danger" title={t.errors.unknown} />
          <Button type="button" variant="secondary" className="self-start" onClick={onRetryCatalogue}>
            {copy.retry}
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit">{copy.submit}</Button>
        <Button type="button" variant="secondary" onClick={onClear}>
          {copy.clear}
        </Button>
      </div>
    </form>
  );
}

// The name links to the profile; an Admin carries the Admin label (§12.8).
// Removed Students never reach the results (§4.6), but the tombstone rule
// still holds through PersonName.
function NameCell({ student }: { student: StudentRef }): React.JSX.Element {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Link
        to="/students/$studentId"
        params={{ studentId: student.id }}
        className="inline-flex min-w-0 items-center gap-2 rounded font-medium text-link underline-offset-2 hover:underline focus-ring"
      >
        <Avatar src={student.avatarUrl} alt="" size="xs" />
        <PersonName name={student.displayName} removed={student.removed} />
      </Link>
      {student.isAdmin && !student.removed ? <RoleLabel /> : null}
    </span>
  );
}

const column = createColumnHelper<StudentSearchItem>();

// §6.2, §3.5.1: the Advanced search. Filters, sort and page live in the
// address; the search term travels in the query string, never in a path
// (§19 item 19).
export function StudentsPage(): React.JSX.Element {
  const { t, format, formatNumber, list, errorText } = useI18n();
  const copy = t.people.search;
  const search = useSearch({ from: '/students' });
  const navigate = useNavigate({ from: '/students' });
  // The form stays mounted, so this ref reaches the Name field from both the
  // form (focus on an invalid term) and the empty state (focus after Clear).
  const nameRef = useRef<HTMLInputElement>(null);
  const sort = search.sort ?? 'name';
  const order = search.order ?? 'asc';
  const page = search.page ?? 1;
  const filters: Filters = { q: search.q, teaches: search.teaches, wants: search.wants, hasGoal: search.hasGoal };
  const results = useQuery(
    studentSearchQueryOptions({ ...filters, sort, order, page, pageSize: PAGING.defaultPageSize }),
  );
  const catalogue = useQuery(skillsQueryOptions());
  const filtered = Object.values(filters).some((value) => value !== undefined);

  function go(next: StudentsSearch): void {
    void navigate({ search: (previous) => ({ ...previous, ...next }) });
  }

  // A new filter or sort starts again from page 1.
  function applyFilters(next: Filters): void {
    go({ ...next, page: undefined });
  }

  function applySort(nextSort: SearchSort, nextOrder: SearchOrder): void {
    go({ ...sortParams(nextSort, nextOrder), page: undefined });
  }

  // The Name and XP headers sort too. Joined has no column, so the headers
  // show no sort while it applies; a third press on a header clears its sort
  // back to the default.
  const sorting: SortingState = sort === 'joined' ? [] : [{ id: sort, desc: order === 'desc' }];
  function onSortingChange(next: SortingState): void {
    const first = next[0];
    if (first === undefined) applySort('name', 'asc');
    else applySort(first.id === 'xp' ? 'xp' : 'name', first.desc ? 'desc' : 'asc');
  }

  const columns = useMemo(() => {
    const skillList = (skills: SkillView[]): React.ReactNode =>
      skills.length === 0 ? (
        <span className="text-ink-muted">{copy.noSkills}</span>
      ) : (
        list(skills.map((skill) => skill.name))
      );
    return [
      column.accessor((row) => row.student.displayName, {
        id: 'name',
        header: copy.columns.name,
        cell: ({ row }) => <NameCell student={row.original.student} />,
      }),
      column.display({
        id: 'teaches',
        header: copy.columns.teaches,
        cell: ({ row }) => skillList(row.original.skills.teach),
      }),
      column.display({
        id: 'wants',
        header: copy.columns.wants,
        cell: ({ row }) => skillList(row.original.skills.learn),
      }),
      column.accessor('level', {
        header: copy.columns.level,
        enableSorting: false,
        meta: { align: 'end' },
        cell: (info) => formatNumber(info.getValue()),
      }),
      column.accessor('xp', {
        header: copy.columns.xp,
        meta: { align: 'end' },
        cell: (info) => formatNumber(info.getValue()),
      }),
    ];
  }, [copy, formatNumber, list]);

  const loading = results.isPending || results.isPlaceholderData;

  return (
    <>
      <PageTitle name={copy.title} />
      <div className="flex min-w-0 flex-col gap-6">
        <h1 className="text-2xl font-semibold text-ink">{copy.title}</h1>
        <FiltersForm
          applied={filters}
          skills={catalogue.data?.items ?? []}
          catalogueFailed={catalogue.isError && catalogue.data === undefined}
          onRetryCatalogue={() => void catalogue.refetch()}
          nameRef={nameRef}
          onApply={applyFilters}
        />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p aria-live="polite" className="text-sm text-ink-muted">
            {results.data !== undefined && !loading ? format(copy.count, { count: results.data.total }) : null}
          </p>
          <Select
            label={copy.sortLabel}
            value={`${sort}:${order}`}
            onChange={(event) => {
              const [nextSort, nextOrder] = event.target.value.split(':');
              applySort(pick(nextSort, SORTS) ?? 'name', pick(nextOrder, ORDERS) ?? 'asc');
            }}
            className="w-64"
          >
            <option value="name:asc">{copy.sort.nameAsc}</option>
            <option value="name:desc">{copy.sort.nameDesc}</option>
            <option value="xp:desc">{copy.sort.xpDesc}</option>
            <option value="xp:asc">{copy.sort.xpAsc}</option>
            <option value="joined:desc">{copy.sort.joinedDesc}</option>
            <option value="joined:asc">{copy.sort.joinedAsc}</option>
          </Select>
        </div>
        <DataTable
          data={results.data?.items ?? []}
          columns={columns}
          getRowId={(row) => row.student.id}
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
                  nameRef.current?.focus();
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
