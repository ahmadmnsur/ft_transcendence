import { useId, type ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Text, Tooltip, XAxis, YAxis, type TooltipContentProps,
} from 'recharts';
import type { Analytics } from '../api/analytics';
import { useI18n } from '../i18n/context';
import { direction } from '../i18n/language';
import { isolate } from '../i18n/text';

type Row = { label: string; value: number | null; demand?: number; supply?: number };
type Series = { key: 'value'; name: string; color: string };

const PRIMARY = 'var(--color-primary-700)';
const INK = 'var(--color-ink-muted)';
const LINE = 'var(--color-line)';

function CategoryTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }): React.JSX.Element {
  return <Text x={x} y={(y ?? 0) + 8} width={96} verticalAnchor="start" textAnchor="middle"
    direction="ltr" style={{ fontSize: 12, fill: INK }}>{isolate(payload?.value ?? '')}</Text>;
}

function ChartFrame({ title, description, xTitle, yTitle, count, legend, children, headingLevel = 2 }: {
  title: string; description?: ReactNode; xTitle: string; yTitle: string; count: number;
  legend: Series[]; children: ReactNode; headingLevel?: 2 | 3;
}): React.JSX.Element {
  const { language } = useI18n();
  const caption = useId();
  const Heading = `h${headingLevel}` as const;
  return (
    <figure aria-labelledby={caption} className="min-w-0 border-t border-line pt-5">
      <figcaption id={caption} className="mb-4 flex flex-col gap-1">
        <Heading className="text-base font-semibold text-ink">{title}</Heading>
        {description ? <p className="max-w-prose text-sm leading-relaxed text-ink-muted">{description}</p> : null}
      </figcaption>
      <p className={`mb-1 text-xs text-ink-muted ${language === 'ar' ? 'text-end' : 'text-start'}`} dir="ltr">
        <bdi>{yTitle}</bdi>
      </p>
      <div className="overflow-x-auto rounded focus-ring" tabIndex={0} role="region" aria-label={title}>
        {/* SVG coordinates stay physical; each axis and text direction is explicit. */}
        <div dir="ltr" style={{ minWidth: Math.max(320, count * 112 + 104), height: 352 }}>
          {children}
        </div>
      </div>
      <p className="mt-1 text-center text-xs text-ink-muted">{xTitle}</p>
      <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-ink-muted" dir={direction[language]}>
        {legend.map((series) => <li key={series.key} className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-3 shrink-0" style={{ backgroundColor: series.color }} />
          <span>{series.name}</span>
        </li>)}
      </ul>
    </figure>
  );
}

function ChartTooltip({ active, payload, percent = false }: Partial<TooltipContentProps<number, string>> & {
  percent?: boolean;
}): React.JSX.Element | null {
  const { language, t, formatNumber } = useI18n();
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  return (
    <div dir={direction[language]} className="max-w-64 rounded-lg border border-line bg-surface p-3 text-sm text-ink shadow-sm">
      <p className="mb-2 font-semibold"><bdi>{row.label}</bdi></p>
      {percent && row.value === null ? <p>{t.analytics.emptyRound}</p> : (
        <dl className="flex flex-col gap-1">
          {payload.map((entry) => <div key={String(entry.dataKey)} className="flex justify-between gap-4">
            <dt>{entry.name}</dt>
            <dd className="font-medium tabular-nums"><bdi>{formatNumber(Number(entry.value), percent
              ? { style: 'percent', maximumFractionDigits: 0 } : undefined)}</bdi></dd>
          </div>)}
          {row.demand !== undefined && row.supply !== undefined ? <>
            <div className="flex justify-between gap-4"><dt>{t.analytics.demand}</dt><dd className="tabular-nums"><bdi>{formatNumber(row.demand)}</bdi></dd></div>
            <div className="flex justify-between gap-4"><dt>{t.analytics.supply}</dt><dd className="tabular-nums"><bdi>{formatNumber(row.supply)}</bdi></dd></div>
          </> : null}
        </dl>
      )}
    </div>
  );
}

// XAxis.reversed drives both the visual order and Recharts' arrow navigation.
// The tooltip stays inside the view box and prefers its inside edge in Arabic.
export function AnalyticsBars({ title, description, rows, name, xTitle, unit }: {
  title: string; description?: ReactNode; rows: Row[]; name: string; xTitle: string; unit?: string;
}): React.JSX.Element {
  const { language, t, formatNumber } = useI18n();
  const rtl = language === 'ar';
  const series: Series[] = [{ key: 'value', name, color: PRIMARY }];
  return (
    <ChartFrame title={title} description={description} xTitle={xTitle} yTitle={unit ?? t.analytics.students}
      count={rows.length} legend={series}>
      {rows.length === 0 ? <p className="p-6 text-sm text-ink-muted" dir={direction[language]}>{t.analytics.noSkills}</p> : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} accessibilityLayer margin={{ top: 16, right: 24, bottom: 8, left: 24 }}>
            <CartesianGrid vertical={false} stroke={LINE} />
            <XAxis dataKey="label" reversed={rtl} interval={0} height={90} tick={<CategoryTick />}
              tickLine={false} stroke={INK} padding={{ left: 44, right: 44 }} />
            <YAxis orientation={rtl ? 'right' : 'left'} allowDecimals={false} width={56}
              tickFormatter={(value: number) => isolate(formatNumber(value))} tick={{ fill: INK, fontSize: 12 }}
              tickLine={false} axisLine={false} />
            <ReferenceLine y={0} stroke={INK} />
            <Tooltip content={<ChartTooltip />} reverseDirection={{ x: rtl }} isAnimationActive={false} />
            <Bar dataKey="value" name={name} fill={PRIMARY} maxBarSize={40} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}

export function CompletionChart({ rounds }: { rounds: Analytics['completion']['perRound'] }): React.JSX.Element {
  const { language, t, formatText, formatNumber } = useI18n();
  const copy = t.analytics;
  const rtl = language === 'ar';
  const rows = rounds.map((round) => ({ ...round, value: round.rate === null ? null : round.rate / 100,
    label: formatText(copy.roundNumber, { number: round.roundNumber }) }));
  return (
    <ChartFrame title={copy.perRound} xTitle={copy.round} yTitle={copy.rate} count={rows.length} headingLevel={3}
      legend={[{ key: 'value', name: copy.rate, color: PRIMARY }]}>
      {rows.length === 0 ? <p className="p-6 text-sm text-ink-muted" dir={direction[language]}>{copy.noClosedRounds}</p> : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} accessibilityLayer margin={{ top: 16, right: 24, bottom: 8, left: 24 }}>
            <CartesianGrid vertical={false} stroke={LINE} />
            <XAxis dataKey="roundNumber" reversed={rtl} interval={0} height={48} tickLine={false} stroke={INK}
              padding={{ left: 32, right: 32 }} tick={{ fontSize: 12, fill: INK }}
              tickFormatter={(value: number) => isolate(formatNumber(value))} />
            {/* CSS isolation avoids embedded bidi controls splitting Arabic digits around the percent sign. */}
            <YAxis orientation={rtl ? 'right' : 'left'} width={64} domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(value: number) => formatNumber(value, { style: 'percent', maximumFractionDigits: 0 })}
              tick={{ fill: INK, fontSize: 12, direction: rtl ? 'rtl' : 'ltr', unicodeBidi: 'isolate', textAnchor: 'end' }}
              tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip percent />} filterNull={false} reverseDirection={{ x: rtl }} isAnimationActive={false} />
            <Line dataKey="value" name={copy.rate} type="linear" stroke={PRIMARY} strokeWidth={2}
              dot={{ r: 4, fill: PRIMARY }} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}
