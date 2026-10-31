import type { ComponentProps, ReactNode } from 'react';

export interface CardProps extends Omit<ComponentProps<'section'>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  actions?: ReactNode;
  children: ReactNode;
}

export function Card({ title, subtitle, headingLevel = 3, actions, children, className = '', ...rest }: CardProps): React.JSX.Element {
  const Heading = `h${headingLevel}` as const;
  return (
    <section className={`min-w-0 rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5 ${className}`.trim()} {...rest}>
      {title != null || subtitle != null || actions != null ? (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title != null ? <Heading className="text-base font-semibold text-ink">{title}</Heading> : null}
            {subtitle != null ? <p className="mt-0.5 text-sm text-ink-muted text-pretty">{subtitle}</p> : null}
          </div>
          {actions != null ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="min-w-0">{children}</div>
    </section>
  );
}
