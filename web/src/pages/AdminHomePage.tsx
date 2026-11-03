import { Link } from '@tanstack/react-router';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { NewDot, useNewDotLabel } from '../design';
import { useNewDots } from '../newDots/useNewDots';

export function AdminHomePage(): React.JSX.Element {
  const dots = useNewDots();
  const newDotLabel = useNewDotLabel();
  const { t } = useI18n();
  const copy = t.admin.home;
  const tools = [
    { to: '/admin/rounds', title: t.matching.rounds.title, description: copy.rounds },
    { to: '/admin/prompts', title: t.prompts.adminTitle, description: copy.prompts },
    { to: '/admin/users', title: t.admin.users.title, description: copy.users },
    { to: '/admin/reports', title: t.moderation.adminTitle, description: copy.reports },
    { to: '/admin/analytics', title: t.analytics.title, description: copy.analytics },
  ] as const;
  return (
    <>
      <PageTitle name={copy.title} />
      <div className="flex min-w-0 flex-col gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-ink">{copy.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{copy.description}</p>
        </div>
        <ul className="grid min-w-0 gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <li key={tool.to} className="min-w-0">
              <Link
                to={tool.to}
                className="flex h-full flex-col gap-1 rounded-xl border border-line bg-surface p-4 shadow-sm transition-colors duration-150 hover:border-line-strong hover:bg-surface-muted focus-ring sm:p-5"
              >
                <h2 aria-label={tool.to === '/admin/reports' && dots.reports ? newDotLabel(tool.title) : undefined} className="text-base font-semibold text-link">
                  {tool.title}
                  {tool.to === '/admin/reports' && dots.reports ? <NewDot /> : null}
                </h2>
                <p className="text-sm text-ink-muted">{tool.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
