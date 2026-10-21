import type { Badge } from '../api/progress';
import { useI18n } from '../i18n/context';
import { PageTitle } from '../layout';

const BADGES: Badge[] = ['FIRST_MENTOR', 'KNOWLEDGE_SHARER', 'CONSISTENT_LEARNER'];

export function RulesPage(): React.JSX.Element {
  const { t, format, formatNumber } = useI18n();
  const copy = t.progress.rules;
  return <article className="mx-auto flex w-full max-w-2xl flex-col gap-8">
    <PageTitle name={copy.title} />
    <h1 className="text-2xl font-semibold text-ink">{copy.title}</h1>
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{copy.xpHeading}</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-start text-sm">
          <thead><tr className="border-b border-line">
            {[copy.event, copy.mentor, copy.mentee].map((label) => <th key={label} scope="col" className="p-3 text-start font-semibold">{label}</th>)}
          </tr></thead>
          <tbody>
            <tr className="border-b border-line"><th scope="row" className="p-3 text-start font-normal">{copy.review}</th><td className="p-3 tabular-nums">{format(copy.award, { xp: 80 })}</td><td className="p-3 tabular-nums">{format(copy.award, { xp: 120 })}</td></tr>
            <tr className="border-b border-line"><th scope="row" className="p-3 text-start font-normal">{copy.answer}</th><td className="p-3">{copy.noAward}</td><td className="p-3 tabular-nums">{format(copy.award, { xp: 20 })}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm leading-relaxed">{format(copy.onlyThese, { matchXp: 80, reviewXp: 40 })}</p>
      <p className="text-sm leading-relaxed">{copy.permanent}</p>
    </section>
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{copy.levelsHeading}</h2>
      <p className="text-sm leading-relaxed">{format(copy.levelsIntro, { startLevel: 1, step: 250, maxLevel: 10, cap: 2250 })}</p>
      <table className="w-full border-collapse text-start text-sm tabular-nums">
        <thead><tr className="border-b border-line"><th scope="col" className="p-3 text-start">{copy.levelColumn}</th><th scope="col" className="p-3 text-start">{copy.bandColumn}</th></tr></thead>
        <tbody>{Array.from({ length: 10 }, (_, i) => <tr key={i} className="border-b border-line">
          <th scope="row" className="p-3 text-start font-normal">{formatNumber(i + 1)}</th>
          <td className="p-3">{i === 9 ? format(copy.terminalBand, { min: 2250 }) : format(copy.band, { min: i * 250, max: (i + 1) * 250 - 1 })}</td>
        </tr>)}</tbody>
      </table>
    </section>
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{copy.badgesHeading}</h2>
      <dl className="flex flex-col gap-4">{BADGES.map((badge) => <div key={badge}>
        <dt className="font-semibold">{t.progress.badgeNames[badge]}</dt>
        <dd className="mt-1 text-sm leading-relaxed">{t.progress.badgeConditions[badge]}</dd>
      </div>)}</dl>
      <p className="text-sm leading-relaxed text-ink-muted">{copy.streakTiming}</p>
    </section>
  </article>;
}
