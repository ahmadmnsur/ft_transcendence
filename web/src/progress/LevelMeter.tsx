import type { LevelProgress } from '../api/progress';
import { ProgressBar } from '../design';
import { useI18n } from '../i18n/context';

export function LevelMeter({ progress }: { progress: LevelProgress }): React.JSX.Element {
  const { t, format, formatText } = useI18n();
  const capped = progress.xpForNextLevel === null;
  return <div className="flex min-w-0 flex-col gap-2">
    <p className="text-sm text-ink-muted">{format(t.progress.totalXp, { xp: progress.xp })}</p>
    <ProgressBar
      label={formatText(t.progress.level, { level: progress.level })}
      value={capped ? 1 : progress.xpIntoLevel}
      max={progress.xpForNextLevel ?? 1}
      valueText={capped ? t.progress.cap : formatText(t.progress.levelProgress, { earned: progress.xpIntoLevel, needed: (progress.xpForNextLevel ?? 250), next: progress.level + 1 })}
      showValue={!capped}
    />
    {capped ? <p className="text-sm text-ink-muted">{t.progress.cap}</p> : null}
  </div>;
}
