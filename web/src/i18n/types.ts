export interface PluralForms {
  en: 'one' | 'other';
  fr: 'one' | 'many' | 'other';
  ar: 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
}
export type Language = keyof PluralForms;

interface SingleNumber {
  en: 'one';
  fr: never;
  ar: 'zero' | 'one' | 'two';
}

export type Placeholders<S> = S extends `${string}{${infer P}}${infer Rest}` ? P | Placeholders<Rest> : never;

export type EnPlural = { one: string; other: string };
export type EnParts = { text: string; parts: Record<string, EnPlural> };
export type EnGroup = { [key: string]: string | EnPlural | EnParts | EnGroup };

type Reserved = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other' | 'text' | 'parts';
type Exactly<T, K> = [keyof T] extends [K] ? ([K] extends [keyof T] ? true : false) : false;
export type IsPlural<T> = T extends string ? false : Exactly<T, 'one' | 'other'>;
export type IsParts<T> = T extends string ? false : Exactly<T, 'text' | 'parts'>;
export type TextOf<T> = T extends { text: infer S } ? S : never;
export type PartsOf<T> = T extends { parts: infer P } ? P : never;
export type Forms<T> = T[keyof T];

type UnionToIntersection<U> = (U extends unknown ? (u: U) => void : never) extends (i: infer I) => void ? I : never;

type Containing<P extends string> = [P] extends [never]
  ? string
  : UnionToIntersection<P extends string ? `${string}{${P}}${string}` : never>;

type MessageNames<E> = Exclude<Placeholders<Forms<E>>, 'count'>;
type Needs<L extends Language, F, E> = MessageNames<E> | (F extends SingleNumber[L] ? never : 'count');
type PluralFor<L extends Language, E> = { [F in PluralForms[L]]: Containing<Needs<L, F, E>> };
type PartNames<E> = keyof PartsOf<E> & string;

export type Catalogue<L extends Language, E> = {
  [K in keyof E]: E[K] extends string
    ? Containing<Placeholders<E[K]>>
    : IsParts<E[K]> extends true
      ? {
          text: Containing<Placeholders<TextOf<E[K]>> | PartNames<E[K]>>;
          parts: { [N in keyof PartsOf<E[K]>]: PluralFor<L, PartsOf<E[K]>[N]> };
        }
      : IsPlural<E[K]> extends true
        ? PluralFor<L, E[K]>
        : Catalogue<L, E[K]>;
};

type Lower = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
type Alnum = Lower | Uppercase<Lower> | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type AlnumTail<S> = S extends `${infer C}${infer R}` ? (C extends Alnum ? AlnumTail<R> : false) : true;
type CamelCase<S> = S extends `${Lower}${infer R}` ? AlnumTail<R> : false;
type BadName<P> = P extends string ? (CamelCase<P> extends true ? never : P) : never;

type Whitespace =
  | '\u0009'
  | '\u000a'
  | '\u000b'
  | '\u000c'
  | '\u000d'
  | '\u0020'
  | '\u00a0'
  | '\u1680'
  | '\u2000'
  | '\u2001'
  | '\u2002'
  | '\u2003'
  | '\u2004'
  | '\u2005'
  | '\u2006'
  | '\u2007'
  | '\u2008'
  | '\u2009'
  | '\u200a'
  | '\u2028'
  | '\u2029'
  | '\u202f'
  | '\u205f'
  | '\u3000'
  | '\ufeff';

type Blank<S> = S extends '' ? true : S extends `${Whitespace}${infer R}` ? Blank<R> : false;

type VowelMark = '\u064b' | '\u064c' | '\u064d' | '\u064e' | '\u064f' | '\u0650' | '\u0651' | '\u0652';
type HasVowelMark<S> = S extends `${string}${VowelMark}${string}` ? true : false;

type BeforeMark = ':' | ';' | '!' | '?' | '»';
type PlainFrenchSpace<S> = S extends `${string} ${BeforeMark}${string}`
  ? true
  : S extends `${string}« ${string}`
    ? true
    : false;

type Join<P extends string, K> = P extends '' ? `${K & string}` : `${P}.${K & string}`;

type TextProblems<L extends Language, T, Need extends string, Allowed extends string, Path extends string> = T extends string
  ? { [K in keyof Object]?: never } extends Record<T, unknown>
    ? `${Path}: not a literal type (write as const)`
    :
        | (Blank<T> extends true ? `${Path}: empty` : never)
        | `${Path}: {${Exclude<Need, Placeholders<T>>}} missing`
        | `${Path}: {${Exclude<Placeholders<T>, Allowed>}} not in English`
        | `${Path}: {${BadName<Placeholders<T>>}} not a camelCase name`
        | (L extends 'ar' ? (HasVowelMark<T> extends true ? `${Path}: a vowel mark (U+064B-U+0652)` : never) : never)
        | (L extends 'fr'
            ? PlainFrenchSpace<T> extends true
              ? `${Path}: a plain space before : ; ! ? » or after «`
              : never
            : never)
  : `${Path}: should be a text`;

type KeyProblems<T, E, Path extends string> =
  | `${Join<Path, Exclude<keyof E, keyof T>>}: missing`
  | `${Join<Path, Exclude<keyof T, keyof E>>}: not in English`;

type FormProblems<L extends Language, T, E, Path extends string> = T extends string
  ? `${Path}: should be a plural`
  :
      | `${Join<Path, Exclude<PluralForms[L], keyof T>>}: missing`
      | `${Join<Path, Exclude<keyof T, PluralForms[L]>>}: not a form ${L} writes`
      | {
          [F in keyof T & PluralForms[L]]: TextProblems<L, T[F], Needs<L, F, E>, MessageNames<E> | 'count', Join<Path, F>>;
        }[keyof T & PluralForms[L]];

type PartsProblems<L extends Language, T, E, Path extends string> = T extends string
  ? `${Path}: should be a text with parts`
  :
      | KeyProblems<T, E, Path>
      | ('text' extends keyof T
          ? TextProblems<L, T['text'], Placeholders<TextOf<E>> | PartNames<E>, Placeholders<TextOf<E>> | PartNames<E>, Join<Path, 'text'>>
          : never)
      | ('parts' extends keyof T ? PartFormsProblems<L, T['parts'], PartsOf<E>, Join<Path, 'parts'>> : never);

type PartFormsProblems<L extends Language, T, E, Path extends string> =
  | KeyProblems<T, E, Path>
  | { [N in keyof T & keyof E]: FormProblems<L, T[N], E[N], Join<Path, N>> }[keyof T & keyof E];

type GroupProblems<L extends Language, T, E, Path extends string> = T extends string
  ? `${Path}: should be a group`
  :
      | KeyProblems<T, E, Path>
      | (L extends 'en' ? `${Join<Path, keyof E & Reserved>}: a reserved name, not a key` : never)
      | { [K in keyof T & keyof E]: ProblemsAt<L, T[K], E[K], Join<Path, K>> }[keyof T & keyof E];

type ProblemsAt<L extends Language, T, E, Path extends string> = E extends string
  ? TextProblems<L, T, Placeholders<E>, Placeholders<E>, Path>
  : IsPlural<E> extends true
    ? FormProblems<L, T, E, Path>
    : IsParts<E> extends true
      ? PartsProblems<L, T, E, Path>
      : GroupProblems<L, T, E, Path>;

type Listed<P> = P extends string ? `${P}.` : never;

export type Checked<L extends Language, T, E> = [GroupProblems<L, T, E, ''>] extends [never]
  ? true
  : Listed<GroupProblems<L, T, E, ''>>;
