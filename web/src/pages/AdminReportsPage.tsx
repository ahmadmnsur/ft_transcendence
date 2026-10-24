import { useNavigate, useSearch } from '@tanstack/react-router';
import { Tabs } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { parsePageSearch } from '../search';
import { ModerationQueue } from '../moderation/ModerationQueue';
import { ResolvedAudit } from '../moderation/ResolvedAudit';

// `/admin/reports`' search params: the tab, and the resolved audit's page.
// An absent one is its default, so the address stays short.
export interface AdminReportsSearch {
  view?: 'resolved';
  page?: number;
}

// §3.5.2: a value the API would refuse is dropped here, so an edited address
// never sends a failing request. Only the resolved audit is paged.
export function parseAdminReportsSearch(search: Record<string, unknown>): AdminReportsSearch {
  return search.view === 'resolved' ? { view: 'resolved', ...parsePageSearch(search) } : {};
}

// `/admin/reports` (§3.5.1): the open queue with reporters, and the resolved
// audit (§12.4, §12.6).
export function AdminReportsPage(): React.JSX.Element {
  const { t } = useI18n();
  const copy = t.moderation;
  const search = useSearch({ from: '/admin/reports' });
  const navigate = useNavigate({ from: '/admin/reports' });
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageTitle name={copy.adminTitle} />
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold">{copy.adminTitle}</h1>
        <p className="text-sm text-ink-muted">{copy.adminIntro}</p>
      </div>
      <Tabs
        label={copy.tabsLabel}
        value={search.view ?? 'open'}
        onValueChange={(id) => void navigate({ search: id === 'resolved' ? { view: 'resolved' } : {} })}
        items={[
          { id: 'open', label: copy.openTab, content: <ModerationQueue admin /> },
          {
            id: 'resolved',
            label: copy.resolvedTab,
            content: (
              <ResolvedAudit
                page={search.page ?? 1}
                onPageChange={(page) => void navigate({ search: { view: 'resolved', page: page > 1 ? page : undefined } })}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
