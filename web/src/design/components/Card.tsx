import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Card({ title, subtitle, actions, children, className = '', ...rest }: CardProps): React.JSX.Element {
  return (
    <section
      className={`min-w-0 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5 ${className}`.trim()}
      {...rest}
    >
      {title || actions ? (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title ? <h3 className="text-base font-semibold text-neutral-900">{title}</h3> : null}
            {subtitle ? <p className="mt-0.5 text-sm text-neutral-700">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="min-w-0">{children}</div>
    </section>
  );
}
