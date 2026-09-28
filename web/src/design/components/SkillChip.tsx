import type { HTMLAttributes } from 'react';
import { CloseIcon } from '../icons/CloseIcon';

export interface SkillChipProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  variant: 'teach' | 'learn';
  onRemove?: () => void;
}

const tones: Record<SkillChipProps['variant'], string> = {
  teach: 'bg-primary-100 text-primary-900',
  learn: 'bg-neutral-100 text-neutral-800',
};

export function SkillChip({ name, variant, onRemove, className = '', ...rest }: SkillChipProps): React.JSX.Element {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full py-1 pl-3 pr-1 text-sm font-medium ${tones[variant]} ${className}`.trim()}
      {...rest}
    >
      <span className="truncate">{name}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1"
        >
          <CloseIcon size={14} />
        </button>
      ) : (
        <span className="w-1 shrink-0" aria-hidden="true" />
      )}
    </span>
  );
}
