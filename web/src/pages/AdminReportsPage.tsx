import { useNavigate, useSearch } from '@tanstack/react-router';
import { Tabs } from '../design';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { parsePageSearch } from '../search';
import { ModerationQueue } from '../moderation/ModerationQueue';
import { ResolvedAudit } from '../moderation/ResolvedAudit';

export interface AdminReportsSearch {
  view?: 'resolved';
  page?: number;
}

export function parseAdminReportsSearch(search: Record<string, unknown>): AdminReportsSearch {
  return search.view === 'resolved' ? { view: 'resolved', ...parsePageSearch(search) } : {};
}

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
