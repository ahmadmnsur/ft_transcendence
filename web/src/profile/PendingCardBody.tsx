import { useI18n } from '../i18n/context';

export function PendingCardBody({
  failed,
  reserveClassName,
}: {
  failed: boolean;
  reserveClassName: string;
}): React.JSX.Element | null {
  const { t } = useI18n();
  if (failed) return null;
  return (
    <div aria-busy="true" className={`flex ${reserveClassName} items-center justify-center text-sm text-ink-muted`}>
      {t.profile.me.loading}
    </div>
  );
}
