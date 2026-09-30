import { useId } from 'react';

export interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  // Replaces the percentage, on screen and for screen readers, with the
  // quantity itself, such as "240 / 250 XP".
  valueText?: string;
  showValue?: boolean;
  className?: string;
}

export function ProgressBar({ value, max, label, valueText, showValue = true, className = '' }: ProgressBarProps): React.JSX.Element {
  const labelId = useId();
  // A value worked out from an unknown total, such as an upload whose size the
  // browser cannot report, is NaN; it shows as no progress rather than NaN%.
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const clamped = Number.isFinite(value) ? Math.min(Math.max(value, 0), safeMax) : 0;
  const percent = Math.round((clamped / safeMax) * 100);
  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <div className="flex items-baseline justify-between gap-2">
        <p id={labelId} className="truncate text-sm font-medium text-ink">
          {label}
        </p>
        {showValue ? <p className="shrink-0 text-xs tabular-nums text-ink-muted">{valueText ?? `${percent}%`}</p> : null}
      </div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuetext={valueText}
        className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className="h-full w-full origin-left rounded-full bg-primary-600 motion-safe:transition-transform motion-safe:duration-200"
          style={{ transform: `scaleX(${clamped / safeMax})` }}
        />
      </div>
    </div>
  );
}
