import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';
import { ModerationQueue } from '../moderation/ModerationQueue';

export function ModerationPage(): React.JSX.Element {
  const { t } = useI18n();
  const copy = t.moderation;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageTitle name={copy.peerTitle} />
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold">{copy.peerTitle}</h1>
        <p className="text-sm text-ink-muted">{copy.peerIntro}</p>
      </div>
      <ModerationQueue admin={false} />
    </div>
  );
}
