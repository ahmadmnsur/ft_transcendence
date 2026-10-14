// The plural forms each language must write (CLDR 48, Intl.PluralRules).
export interface PluralForms {
  en: 'one' | 'other';
  fr: 'one' | 'many' | 'other';
  ar: 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
}
export type Language = keyof PluralForms;

// '{name} sent {count}' -> 'name' | 'count'
export type Placeholders<S> = S extends `${string}{${infer P}}${infer Rest}` ? P | Placeholders<Rest> : never;

// English shapes: a text, a plural chosen by {count}, or a text whose named
// parts are plurals chosen by their own number (two counts in one sentence).
export type EnPlural = { one: string; other: string };
export type EnParts = { text: string; parts: Record<string, EnPlural> };
export type EnGroup = { [key: string]: string | EnPlural | EnParts | EnGroup };

type UnionToIntersection<U> = (U extends unknown ? (u: U) => void : never) extends (i: infer I) => void ? I : never;

// A translation must contain every placeholder the English text has.
type Containing<P extends string> = [P] extends [never]
  ? string
  : UnionToIntersection<P extends string ? `${string}{${P}}${string}` : never>;

type PluralFor<L extends Language, E extends EnPlural> = Record<
  PluralForms[L],
  Containing<Exclude<Placeholders<E[keyof E]>, 'count'>>
>;

// What French or Arabic must write, derived from the English file.
export type Catalogue<L extends Language, E> = {
  [K in keyof E]: E[K] extends string
    ? Containing<Placeholders<E[K]>>
    : E[K] extends EnParts
      ? { text: Containing<Placeholders<E[K]['text']>>; parts: { [N in keyof E[K]['parts']]: PluralFor<L, E[K]['parts'][N]> } }
      : E[K] extends EnPlural
        ? PluralFor<L, E[K]>
        : Catalogue<L, E[K]>;
};

// Placeholders a translation has that English does not: must be never.
type Leaves<T> = T extends string ? T : T extends object ? { [K in keyof T]: Leaves<T[K]> }[keyof T] : never;
export type ExtraPlaceholders<T, E> = {
  [K in keyof T & keyof E]: T[K] extends string
    ? Exclude<Placeholders<T[K]>, Placeholders<E[K]>>
    : E[K] extends EnPlural
      ? Exclude<Placeholders<Leaves<T[K]>>, Placeholders<Leaves<E[K]>> | 'count'>
      : E[K] extends EnParts
        ? Exclude<Placeholders<Leaves<T[K]>>, Placeholders<Leaves<E[K]>> | 'count'>
        : ExtraPlaceholders<T[K], E[K]>;
}[keyof T & keyof E];
export type NoExtra<T, E> = [ExtraPlaceholders<T, E>] extends [never] ? true : { extra: ExtraPlaceholders<T, E> };
