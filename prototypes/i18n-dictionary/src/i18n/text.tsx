import { Fragment, type ReactNode } from 'react';
import type en from './en';
import type { EnParts, EnPlural, Language, Placeholders } from './types';

// What components see: plain texts are strings and render as they are. A text
// with placeholders, a plural or a text with plural parts is an opaque value
// that only format() can turn into something to render.
declare const filled: unique symbol;
export type Template<V> = { readonly [filled]: V };

type ValuesOf<E> = E extends EnParts
  ? { [P in Exclude<Placeholders<E['text']>, keyof E['parts']>]: ReactNode } & { [P in keyof E['parts']]: number } & {
      [P in Exclude<Placeholders<E['parts'][keyof E['parts']][keyof EnPlural]>, 'count'>]: ReactNode;
    }
  : E extends EnPlural
    ? { count: number } & { [P in Exclude<Placeholders<E[keyof E]>, 'count'>]: ReactNode }
    : E extends string
      ? { [P in Placeholders<E>]: ReactNode }
      : never;

export type Messages<E = typeof en> = {
  readonly [K in keyof E]: E[K] extends string
    ? [Placeholders<E[K]>] extends [never]
      ? string
      : Template<ValuesOf<E[K]>>
    : E[K] extends EnPlural | EnParts
      ? Template<ValuesOf<E[K]>>
      : Messages<E[K]>;
};

type Raw = string | Partial<Record<Intl.LDMLPluralRule, string>> | { text: string; parts: Record<string, Partial<Record<Intl.LDMLPluralRule, string>>> };

function choose(lang: Language, forms: Partial<Record<Intl.LDMLPluralRule, string>>, n: number): string {
  const text = forms[new Intl.PluralRules(lang).select(n)] ?? forms.other ?? '';
  return text.replaceAll('{count}', new Intl.NumberFormat(lang).format(n));
}

function fill(text: string, values: Record<string, ReactNode>): ReactNode {
  return text.split(/\{(\w+)\}/).map((part, i) => <Fragment key={i}>{i % 2 === 1 ? values[part] : part}</Fragment>);
}

export function format<V>(lang: Language, message: Template<V>, values: V): ReactNode {
  const raw = message as unknown as Raw;
  const v = values as Record<string, ReactNode>;
  if (typeof raw === 'string') return fill(raw, v);
  if ('text' in raw && typeof raw.text === 'string') {
    const parts = raw.parts as Record<string, Partial<Record<Intl.LDMLPluralRule, string>>>;
    const resolved: Record<string, ReactNode> = { ...v };
    for (const name of Object.keys(parts)) resolved[name] = fill(choose(lang, parts[name]!, v[name] as number), v);
    return fill(raw.text, resolved);
  }
  return fill(choose(lang, raw as Partial<Record<Intl.LDMLPluralRule, string>>, v.count as number), v);
}

// The same, as a plain string, where markup cannot go (alt, title,
// aria-label, <option>): every value must be a string or a number.
type Plain<V> = { [K in keyof V]: V[K] extends number ? number : string };
export function formatText<V>(lang: Language, message: Template<V>, values: Plain<V>): string {
  const node = format(lang, message, values as unknown as V);
  const flat = (n: ReactNode): string =>
    Array.isArray(n) ? n.map(flat).join('') : typeof n === 'object' && n !== null && 'props' in n ? flat((n.props as { children?: ReactNode }).children) : n == null || typeof n === 'boolean' ? '' : String(n);
  return flat(node);
}

// French or Arabic laid over English: a text missing from the translation
// (possible only in `vite dev`, which does not type-check) shows in English.
export function over<T extends object>(base: T, top: object): T {
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(top)) {
    const b = (base as Record<string, unknown>)[k];
    const isGroup = (x: unknown) => typeof x === 'object' && x !== null && !('other' in x) && !('text' in x);
    out[k] = isGroup(v) && isGroup(b) ? over(b as object, v as object) : v;
  }
  return out as T;
}
