import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps): React.JSX.Element {
  return (
    <div className={`flex min-w-0 flex-col items-center px-4 py-10 text-center ${className}`.trim()}>
      <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
        {icon}
      </span>
      <p className="mt-3 max-w-md text-base font-semibold text-ink wrap-anywhere">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-ink-muted wrap-anywhere">{description}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
