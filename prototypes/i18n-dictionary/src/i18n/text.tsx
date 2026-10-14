import { Fragment, type ReactElement, type ReactNode } from 'react';
import { locale } from './language';
import type { Forms, IsParts, IsPlural, Language, PartsOf, Placeholders, TextOf } from './types';

// What fills a placeholder: a string, a number or an element. Never
// undefined, null, false or an array: a list is joined by list() first.
export type Value = string | number | ReactElement;

// What components see: plain texts are strings and render as they are. A text
// with placeholders, a plural or a text with plural parts is an opaque value
// that only format() or formatText() can turn into something to show.
declare const filled: unique symbol;
export type Template<V> = { readonly [filled]: V };

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

// Set by over() on an English message shown in place of a missing
// translation, so its plural is chosen by English rules.
const shownIn = Symbol('language');

function memo<T>(make: (tag: string) => T): (lang: Language) => T {
  const made = new Map<Language, T>();
  return (lang) => made.get(lang) ?? made.set(lang, make(locale[lang])).get(lang)!;
}
const plurals = memo((tag) => new Intl.PluralRules(tag));
const numbers = memo((tag) => new Intl.NumberFormat(tag));
const lists = memo((tag) => new Intl.ListFormat(tag, { type: 'conjunction' }));

// Placeholders are camelCase names, as types.ts requires. split() puts the
// text at even indexes and the names at odd ones.
const placeholder = /\{([a-z][A-Za-z0-9]*)\}/;

// A message as text and values; every number is already written by
// Intl.NumberFormat in the message's language.
type Piece = string | { value: unknown };
const value = (lang: Language, v: unknown): unknown => (typeof v === 'number' ? numbers(lang).format(v) : v);
const choose = (lang: Language, forms: Plural, n: number): string => forms[plurals(lang).select(n)] || forms.other || '';

function pieces(lang: Language, raw: Raw, values: Record<string, unknown>): Piece[] {
  const own = (raw as { [shownIn]?: Language })[shownIn] ?? lang;
  const expand = (text: string, vals: Record<string, unknown>, parts?: Record<string, Plural>): Piece[] =>
    text.split(placeholder).flatMap((piece, i): Piece[] => {
      if (i % 2 === 0) return piece === '' ? [] : [piece];
      const part = parts?.[piece];
      if (part) return expand(choose(own, part, vals[piece] as number), { ...vals, count: vals[piece] });
      // Only `vite dev` can get here without a value: the name shows as written.
      return piece in vals ? [{ value: value(own, vals[piece]) }] : [`{${piece}}`];
    });
  if (typeof raw === 'string') return expand(raw, values);
  if ('parts' in raw && typeof raw.text === 'string') return expand(raw.text, values, raw.parts as Record<string, Plural>);
  return expand(choose(own, raw as Plural, values.count as number), values);
}

// Every value is isolated, so a name or a Skill keeps its own direction. In
// markup a string goes in <bdi>, and an element stays as it is: PersonName
// and SkillChip are <bdi> already. In plain text, U+2068 and U+2069.
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
const plain = (all: Piece[]): string => all.map((p) => (typeof p === 'string' ? p : `⁨${String(p.value)}⁩`)).join('');

export function format<V>(lang: Language, message: Template<V>, values: V): ReactElement {
  return markup(pieces(lang, message as unknown as Raw, values as Record<string, unknown>));
}

// The same as a plain string, where markup cannot go (alt, title,
// aria-label, <option>). A name comes from #142's plain-text helper.
type Plain<V> = { [K in keyof V]: V[K] extends number ? number : string | number };
export function formatText<V>(lang: Language, message: Template<V>, values: Plain<V>): string {
  return plain(pieces(lang, message as unknown as Raw, values as Record<string, unknown>));
}

// A list fills one placeholder: Intl.ListFormat joins it in the current
// language, and each item is isolated like any other value.
function listPieces(lang: Language, items: readonly unknown[]): Piece[] {
  return lists(lang)
    .formatToParts(items.map((_, i) => String(i)))
    .map((p) => (p.type === 'element' ? { value: value(lang, items[Number(p.value)]) } : p.value));
}
export const list = (lang: Language, items: readonly Value[]): ReactElement => markup(listPieces(lang, items));
export const listText = (lang: Language, items: readonly (string | number)[]): string => plain(listPieces(lang, items));

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
const isText = (x: unknown): x is string => typeof x === 'string' && x !== '';
const keysAre = (x: object, ...keys: string[]): boolean => {
  const own = Object.keys(x).sort();
  return own.length === keys.length && keys.every((k, i) => k === own[i]);
};

// A translated plural keeps its non-empty forms, and is used only with `other`.
function forms(top: unknown): Plural | undefined {
  if (!isObject(top)) return undefined;
  const kept: Plural = Object.fromEntries(Object.entries(top).filter(([, v]) => isText(v)));
  return kept.other ? kept : undefined;
}

// French or Arabic laid over English, following English's shape. Only
// `vite dev`, which does not type-check, can need it: a missing or empty text
// shows in English, and a missing form uses that language's `other`. A plural
// without `other`, or a two-number sentence missing its text, a part or a
// part's `other`, shows whole in English. Nothing throws or logs.
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
