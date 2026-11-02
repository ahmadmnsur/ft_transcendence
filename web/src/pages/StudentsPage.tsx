import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
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
  type StudentSearchItem,
} from '../api/profile';
import { Banner, Button, DataTable, Select, TextField } from '../design';
import { useI18n } from '../i18n/context';
import { isolate } from '../i18n/text';
import { PageTitle } from '../layout';
import { failureCode } from '../profile/failure';
import { StudentLink } from '../profile/StudentLink';

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

function uuid(value: unknown): string | undefined {
  return typeof value === 'string' && isUuid(value) ? value : undefined;
}

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

function sortParams(sort: SearchSort, order: SearchOrder): Pick<StudentsSearch, 'sort' | 'order'> {
  return sort === 'name' && order === 'asc' ? { sort: undefined, order: undefined } : { sort, order };
}

const NO_FILTERS = { q: undefined, teaches: undefined, wants: undefined, hasGoal: undefined } as const;

type Filters = Pick<StudentsSearch, 'q' | 'teaches' | 'wants' | 'hasGoal'>;

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

  const skillOptions = [{ value: '', label: copy.anySkill, separator: true }, ...skills.map((skill) => ({ value: skill.id, label: isolate(skill.name) }))];

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
        maxChars={LIMITS.searchQuery.maxChars}
        value={q}
        error={qInvalid ? format(copy.nameInvalid, { count: LIMITS.searchQuery.maxChars }) : undefined}
        onChange={(event) => {
          setQ(event.target.value);
          if (qInvalid) setQInvalid(!isValidSearchQuery(event.target.value));
        }}
      />
      <Select
        label={copy.teachesLabel}
        options={skillOptions}
        value={teaches}
        onValueChange={setTeaches}
        placeholder={copy.anySkill}
        searchable
        searchPlaceholder={copy.skillSearch}
      />
      <Select
        label={copy.wantsLabel}
        options={skillOptions}
        value={wants}
        onValueChange={setWants}
        placeholder={copy.anySkill}
        searchable
        searchPlaceholder={copy.skillSearch}
      />
      <Select
        label={copy.goalLabel}
        options={[
          { value: '', label: copy.goalAny, separator: true },
          { value: 'true', label: copy.goalYes },
          { value: 'false', label: copy.goalNo },
        ]}
        value={goal}
        onValueChange={setGoal}
      />
      {catalogueFailed ? (
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

const column = createColumnHelper<StudentSearchItem>();

export function StudentsPage(): React.JSX.Element {
  const { t, format, formatNumber, list, errorText } = useI18n();
  const copy = t.people.search;
  const search = useSearch({ from: '/students' });
  const navigate = useNavigate({ from: '/students' });
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

  function applyFilters(next: Filters): void {
    go({ ...next, page: undefined });
  }

  function applySort(nextSort: SearchSort, nextOrder: SearchOrder): void {
    go({ ...sortParams(nextSort, nextOrder), page: undefined });
  }

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
        cell: ({ row }) => <StudentLink student={row.original.student} />,
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
            options={[
              { value: 'name:asc', label: copy.sort.nameAsc },
              { value: 'name:desc', label: copy.sort.nameDesc },
              { value: 'xp:desc', label: copy.sort.xpDesc },
              { value: 'xp:asc', label: copy.sort.xpAsc },
              { value: 'joined:desc', label: copy.sort.joinedDesc },
              { value: 'joined:asc', label: copy.sort.joinedAsc },
            ]}
            value={`${sort}:${order}`}
            onValueChange={(next) => {
              const [nextSort, nextOrder] = next.split(':');
              applySort(pick(nextSort, SORTS) ?? 'name', pick(nextOrder, ORDERS) ?? 'asc');
            }}
            className="w-64"
          />
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
