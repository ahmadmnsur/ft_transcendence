import { useI18n } from '../i18n/context';

// §7.6: a Friend's Presence, as a word beside a dot. The word carries the
// meaning, so the dot is hidden from screen readers and colour is never the
// only sign.
export function OnlineStatus({ online }: { online: boolean }): React.JSX.Element {
  const { t } = useI18n();
  const copy = t.social.presence;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${online ? 'bg-success-500' : 'bg-neutral-400'}`}
      />
      {online ? copy.online : copy.offline}
    </span>
  );
}
