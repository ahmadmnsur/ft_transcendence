import type { ComponentProps } from 'react';
import { CloseIcon } from '../icons/CloseIcon';
import { useI18n } from '../../i18n/context';
import { IconButton } from './IconButton';
import { SkillName } from './SkillName';

export interface SkillChipProps extends Omit<ComponentProps<'span'>, 'children'> {
  name: string;
  variant: 'teach' | 'learn';
  // The caller removes the chip and moves focus to a neighbour, since the
  // button that was pressed goes with it.
  onRemove?: () => void;
}

// Teach is filled and learn is outlined, so the two read apart without colour.
// Screen readers hear the difference too.
const tones: Record<SkillChipProps['variant'], string> = {
  teach: 'border-transparent bg-primary-100 text-primary-900',
  learn: 'border-line-strong bg-surface text-ink',
};

export function SkillChip({ name, variant, onRemove, className = '', ...rest }: SkillChipProps): React.JSX.Element {
  const { t, format, formatText } = useI18n();
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border py-0.75 ps-3 pe-1 text-sm font-medium ${tones[variant]} ${className}`.trim()}
      {...rest}
    >
      <span className="min-w-0 wrap-anywhere">
        <span className="sr-only">{format(t.design.skillChip[variant], { skill: <SkillName name={name} /> })}</span>
        <SkillName name={name} aria-hidden="true" />
      </span>
      {onRemove ? (
        // The negative margin keeps a chip with a remove button as tall as one without.
        <IconButton label={formatText(t.design.skillChip.remove, { skill: name })} size="xs" tone="inherit" onClick={onRemove} className="-my-0.5">
          <CloseIcon size={14} />
        </IconButton>
      ) : (
        <span className="w-2 shrink-0" aria-hidden="true" />
      )}
    </span>
  );
}
