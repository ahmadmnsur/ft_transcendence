import { Fragment, type ReactElement, type ReactNode } from 'react';
import { locale } from './language';
import type { Forms, IsParts, IsPlural, Language, PartsOf, Placeholders, TextOf } from './types';

export type Value = string | number | ReactElement;

declare const filled: unique symbol;
export type Template<V> = { readonly [filled]: (values: V) => V };

type ValuesOf<E> =
  IsParts<E> extends true
    ? { [P in Exclude<Placeholders<TextOf<E>>, keyof PartsOf<E>>]: Value } & { [P in keyof PartsOf<E>]: number } & {
        [P in Exclude<Placeholders<Forms<Forms<PartsOf<E>>>>, 'count'>]: Value;
      }
    : IsPlural<E> extends true
      ? { count: number } & { [P in Exclude<Placeholders<Forms<E>>, 'count'>]: Value }
      : { [P in Placeholders<E>]: Value };

export type Messages<E> = {
  readonly [K in keyof E]: E[K] extends string
    ? [Placeholders<E[K]>] extends [never]
      ? string
      : Template<ValuesOf<E[K]>>
    : IsPlural<E[K]> extends true
      ? Template<ValuesOf<E[K]>>
      : IsParts<E[K]> extends true
        ? Template<ValuesOf<E[K]>>
        : Messages<E[K]>;
};

type Plural = Partial<Record<Intl.LDMLPluralRule, string>>;
type Raw = string | Plural | { text: string; parts: Record<string, Plural> };

const shownIn = Symbol('language');

function memo<T>(make: (tag: string) => T): (lang: Language) => T {
  const made = new Map<Language, T>();
  return (lang) => made.get(lang) ?? made.set(lang, make(locale[lang])).get(lang)!;
}
const plurals = memo((tag) => new Intl.PluralRules(tag));
const numbers = memo((tag) => new Intl.NumberFormat(tag));
export type ListOptions = { type?: 'conjunction' | 'disjunction' };
const lists = {
  conjunction: memo((tag) => new Intl.ListFormat(tag, { type: 'conjunction' })),
  disjunction: memo((tag) => new Intl.ListFormat(tag, { type: 'disjunction' })),
};
const dates = memo((tag) => new Intl.DateTimeFormat(tag, { dateStyle: 'long' }));
const times = memo((tag) => new Intl.DateTimeFormat(tag, { timeStyle: 'short' }));
const moments = memo((tag) => new Intl.DateTimeFormat(tag, { dateStyle: 'long', timeStyle: 'short' }));

const placeholder = /\{([a-z][A-Za-z0-9]*)\}/;

type Piece = string | { value: unknown };
const value = (lang: Language, v: unknown): unknown => (typeof v === 'number' ? numbers(lang).format(v) : v);
const choose = (lang: Language, forms: Plural, n: number): string => forms[plurals(lang).select(n)] || forms.other || '';

function pieces(lang: Language, raw: Raw, values: Record<string, unknown>): Piece[] {
  const own = (raw as { [shownIn]?: Language })[shownIn] ?? lang;
  const expand = (text: string, vals: Record<string, unknown>, parts?: Record<string, Plural>): Piece[] =>
    text.split(placeholder).flatMap((piece, i): Piece[] => {
      if (i % 2 === 0) return piece === '' ? [] : [piece];
      const v = vals[piece];
      if (v === undefined) return [`{${piece}}`];
      const part = parts?.[piece];
      if (part) return expand(choose(own, part, v as number), { ...vals, count: v });
      return [{ value: value(own, v) }];
    });
  if (typeof raw === 'string') return expand(raw, values);
  if ('parts' in raw && typeof raw.text === 'string') return expand(raw.text, values, raw.parts as Record<string, Plural>);
  return expand(choose(own, raw as Plural, values.count as number), values);
}

export const isolate = (text: string): string => `\u2068${text}\u2069`;

const markup = (all: Piece[]): ReactElement => (
  <>
    {all.map((p, i): ReactNode =>
      typeof p === 'string' ? (
        <Fragment key={i}>{p}</Fragment>
      ) : typeof p.value === 'string' ? (
        <bdi key={i}>{p.value}</bdi>
      ) : (
        <Fragment key={i}>{p.value as ReactNode}</Fragment>
      ),
    )}
  </>
);
const plain = (all: Piece[]): string => all.map((p) => (typeof p === 'string' ? p : isolate(String(p.value)))).join('');

export function format<V>(lang: Language, message: Template<V>, values: V): ReactElement {
  return markup(pieces(lang, message as unknown as Raw, values as Record<string, unknown>));
}

export type Plain<V> = { [K in keyof V]: V[K] extends number ? number : string | number };
export function formatText<V>(lang: Language, message: Template<V>, values: Plain<V>): string {
  return plain(pieces(lang, message as unknown as Raw, values as Record<string, unknown>));
}

function listPieces(lang: Language, items: readonly unknown[], type: 'conjunction' | 'disjunction' = 'conjunction'): Piece[] {
  const kept = items.filter((item) => item !== undefined);
  return lists[type](lang)
    .formatToParts(kept.map((_, i) => String(i)))
    .map((p) => (p.type === 'element' ? { value: value(lang, kept[Number(p.value)]) } : p.value));
}
export const list = (lang: Language, items: readonly Value[], options?: ListOptions): ReactElement =>
  markup(listPieces(lang, items, options?.type));
export const listText = (lang: Language, items: readonly (string | number)[], options?: ListOptions): string =>
  plain(listPieces(lang, items, options?.type));

export function formatNumber(lang: Language, value: number, options?: Intl.NumberFormatOptions): string {
  return options === undefined ? numbers(lang).format(value) : new Intl.NumberFormat(locale[lang], options).format(value);
}
export const formatDate = (lang: Language, date: Date | number): string => dates(lang).format(date);
export const formatTime = (lang: Language, date: Date | number): string => times(lang).format(date);
export const formatDateTime = (lang: Language, date: Date | number): string => moments(lang).format(date);

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
const isText = (x: unknown): x is string => typeof x === 'string' && x.trim() !== '';
const keysAre = (x: object, ...keys: string[]): boolean => {
  const own = Object.keys(x).sort();
  return own.length === keys.length && keys.every((k, i) => k === own[i]);
};

function forms(top: unknown): Plural | undefined {
  if (!isObject(top)) return undefined;
  const kept: Plural = Object.fromEntries(Object.entries(top).filter(([, v]) => isText(v)));
  return kept.other ? kept : undefined;
}

export function over<T extends object>(base: T, top: unknown): T {
  const out: Record<string, unknown> = {};
  for (const [k, b] of Object.entries(base) as [string, unknown][]) {
    const t = isObject(top) ? top[k] : undefined;
    if (typeof b === 'string') out[k] = isText(t) ? t : b;
    else if (isObject(b) && keysAre(b, 'one', 'other')) out[k] = forms(t) ?? { ...b, [shownIn]: 'en' };
    else if (isObject(b) && keysAre(b, 'parts', 'text')) {
      const names = Object.keys(b.parts as object);
      const parts = isObject(t) && isObject(t.parts) ? names.map((n) => [n, forms((t.parts as Record<string, unknown>)[n])]) : [];
      const whole = isObject(t) && isText(t.text) && parts.length === names.length && parts.every(([, f]) => f);
      out[k] = whole ? { text: t.text, parts: Object.fromEntries(parts) } : { ...b, [shownIn]: 'en' };
    } else out[k] = over(b as object, t);
  }
  return out as T;
}


