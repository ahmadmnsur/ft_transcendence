import type { EarnResult } from '../api/progress';
import { Card } from '../design';
import { useI18n } from '../i18n/context';
import { LevelMeter } from './LevelMeter';

export function EarnPanel({ earned, title }: { earned: EarnResult; title: string }): React.JSX.Element {
  const { t, format } = useI18n();
  return <Card title={title} headingLevel={2} role="status">
    <div className="flex flex-col gap-4">
      <p className="font-semibold text-ink">{format(t.progress.earned, { xp: earned.xpAwarded })}</p>
      <LevelMeter progress={earned} />
      {earned.badgesAwarded.length > 0 ? <div>
        <h3 className="font-semibold">{t.progress.newlyAwarded}</h3>
        <ul className="mt-2 flex flex-col gap-1">{earned.badgesAwarded.map((badge) => <li key={badge}>{t.progress.badgeNames[badge]}</li>)}</ul>
      </div> : null}
    </div>
  </Card>;
}
