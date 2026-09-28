import { useId } from 'react';

export interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  showValue?: boolean;
}

export function ProgressBar({ value, max, label, showValue = true }: ProgressBarProps): React.JSX.Element {
  const labelId = useId();
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <p id={labelId} className="truncate text-sm font-medium text-neutral-800">
          {label}
        </p>
        {showValue ? <p className="shrink-0 text-xs tabular-nums text-neutral-700">{percent}%</p> : null}
      </div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-200"
      >
        <div
          className="h-full w-full origin-left rounded-full bg-primary-600 transition-transform duration-200"
          style={{ transform: `scaleX(${clamped / safeMax})` }}
        />
      </div>
    </div>
  );
}
