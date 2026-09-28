import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex min-w-0 flex-col items-center px-4 py-10 text-center">
      <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
        {icon}
      </span>
      <p className="mt-3 max-w-md text-base font-semibold text-neutral-900">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-neutral-700">{description}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
