import type { ReactNode } from 'react';
import { AlertIcon } from '../icons/AlertIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { CloseIcon } from '../icons/CloseIcon';
import { InfoIcon } from '../icons/InfoIcon';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

export interface BannerProps {
  tone: BannerTone;
  title: string;
  body?: string;
  onDismiss?: () => void;
}

const tones: Record<BannerTone, { wrap: string; icon: ReactNode }> = {
  info: { wrap: 'bg-primary-50 text-primary-900', icon: <InfoIcon size={18} /> },
  success: { wrap: 'bg-success-100 text-success-900', icon: <CheckIcon size={18} /> },
  warning: { wrap: 'bg-warning-100 text-warning-900', icon: <AlertIcon size={18} /> },
  danger: { wrap: 'bg-danger-100 text-danger-900', icon: <AlertIcon size={18} /> },
};

export function Banner({ tone, title, body, onDismiss }: BannerProps): React.JSX.Element {
  const { wrap, icon } = tones[tone];
  const alert = tone === 'warning' || tone === 'danger';
  return (
    <div role={alert ? 'alert' : 'status'} className={`flex min-w-0 items-start gap-3 rounded-lg px-3 py-2.5 text-sm ${wrap}`}>
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {body ? <p className="mt-0.5">{body}</p> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          <CloseIcon size={16} />
        </button>
      ) : null}
    </div>
  );
}
