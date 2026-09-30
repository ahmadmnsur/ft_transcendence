import type { ReactNode } from 'react';
import { AlertIcon } from '../icons/AlertIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { CloseIcon } from '../icons/CloseIcon';
import { InfoIcon } from '../icons/InfoIcon';
import { IconButton } from './IconButton';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

// A warning or danger Banner is an alert, read out as soon as it appears. An
// info or success Banner is a status, which screen readers only read when it
// appears inside a live region already on the page; a screen that shows one in
// answer to an action puts it in such a region, for example role="status".
export interface BannerProps {
  tone: BannerTone;
  title: string;
  body?: ReactNode;
  // The caller hides the banner and, if focus was on its dismiss button,
  // moves focus somewhere sensible, since that button goes with it.
  onDismiss?: () => void;
  className?: string;
}

const tones: Record<BannerTone, { wrap: string; icon: ReactNode }> = {
  info: { wrap: 'bg-primary-50 text-primary-900', icon: <InfoIcon size={18} /> },
  success: { wrap: 'bg-success-100 text-success-900', icon: <CheckIcon size={18} /> },
  warning: { wrap: 'bg-warning-100 text-warning-900', icon: <AlertIcon size={18} /> },
  danger: { wrap: 'bg-danger-100 text-danger-900', icon: <AlertIcon size={18} /> },
};

export function Banner({ tone, title, body, onDismiss, className = '' }: BannerProps): React.JSX.Element {
  const { wrap, icon } = tones[tone];
  const alert = tone === 'warning' || tone === 'danger';
  return (
    <div role={alert ? 'alert' : 'status'} className={`flex min-w-0 items-start gap-3 rounded-lg px-3 py-2.5 text-sm ${wrap} ${className}`.trim()}>
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {body != null ? <div className="mt-0.5">{body}</div> : null}
      </div>
      {onDismiss ? (
        <IconButton label={`Dismiss ${title}`} size="xs" tone="inherit" onClick={onDismiss}>
          <CloseIcon size={16} />
        </IconButton>
      ) : null}
    </div>
  );
}
