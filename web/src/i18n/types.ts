// The plural forms each language writes (CLDR 48, Intl.PluralRules).
export interface PluralForms {
  en: 'one' | 'other';
  fr: 'one' | 'many' | 'other';
  ar: 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
}
export type Language = keyof PluralForms;

// The forms that hold a single number, and so may write it in words and
// leave out {count}. French `one` holds both 0 and 1, so it writes {count}.
interface SingleNumber {
  en: 'one';
  fr: never;
  ar: 'zero' | 'one' | 'two';
}

// '{name} sent {count}' -> 'name' | 'count'
export type Placeholders<S> = S extends `${string}{${infer P}}${infer Rest}` ? P | Placeholders<Rest> : never;

// English shapes: a text, a plural chosen by {count}, or a text whose named
// parts are plurals chosen by their own number (two counts in one sentence).
export type EnPlural = { one: string; other: string };
export type EnParts = { text: string; parts: Record<string, EnPlural> };
export type EnGroup = { [key: string]: string | EnPlural | EnParts | EnGroup };

// A message is told from a group by its exact keys, as over() does at run
// time, so a group never uses these as keys.
type Reserved = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other' | 'text' | 'parts';
type Exactly<T, K> = [keyof T] extends [K] ? ([K] extends [keyof T] ? true : false) : false;
export type IsPlural<T> = T extends string ? false : Exactly<T, 'one' | 'other'>;
export type IsParts<T> = T extends string ? false : Exactly<T, 'text' | 'parts'>;
export type TextOf<T> = T extends { text: infer S } ? S : never;
export type PartsOf<T> = T extends { parts: infer P } ? P : never;
export type Forms<T> = T[keyof T];

type UnionToIntersection<U> = (U extends unknown ? (u: U) => void : never) extends (i: infer I) => void ? I : never;

// A text that contains every placeholder in P.
type Containing<P extends string> = [P] extends [never]
  ? string
  : UnionToIntersection<P extends string ? `${string}{${P}}${string}` : never>;

// What one form of a plural must contain: every placeholder of the English
// forms, and {count} unless the form holds a single number.
type MessageNames<E> = Exclude<Placeholders<Forms<E>>, 'count'>;
type Needs<L extends Language, F, E> = MessageNames<E> | (F extends SingleNumber[L] ? never : 'count');
type PluralFor<L extends Language, E> = { [F in PluralForms[L]]: Containing<Needs<L, F, E>> };
type PartNames<E> = keyof PartsOf<E> & string;

// What French or Arabic must write, derived from the English area. Each area
// file is `as const satisfies` this, so tsc points at the line.
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

// Everything a language must get right, as one union of readable problems.
// Each language's index.ts holds `Checked<…> = true` once, so an area file
// that forgets its `satisfies` is still checked.
type Lower = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
type Alnum = Lower | Uppercase<Lower> | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type AlnumTail<S> = S extends `${infer C}${infer R}` ? (C extends Alnum ? AlnumTail<R> : false) : true;
type CamelCase<S> = S extends `${Lower}${infer R}` ? AlnumTail<R> : false;
type BadName<P> = P extends string ? (CamelCase<P> extends true ? never : P) : never;

// Every character String.prototype.trim() removes, one by one.
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

// A text with nothing to read: empty, or only white space.
type Blank<S> = S extends '' ? true : S extends `${Whitespace}${infer R}` ? Blank<R> : false;

// The vowel marks U+064B to U+0652, which PeerConnect's own Arabic never
// carries: no fatha, damma, kasra, tanween, shadda or sukun.
type VowelMark = '\u064b' | '\u064c' | '\u064d' | '\u064e' | '\u064f' | '\u0650' | '\u0651' | '\u0652';
type HasVowelMark<S> = S extends `${string}${VowelMark}${string}` ? true : false;

// French writes U+202F before `; ! ?`, and U+00A0 before `:` and inside
// `« »`. A plain U+0020 there is the mistake this rejects.
type BeforeMark = ':' | ';' | '!' | '?' | '»';
type PlainFrenchSpace<S> = S extends `${string} ${BeforeMark}${string}`
  ? true
  : S extends `${string}« ${string}`
    ? true
    : false;

type Join<P extends string, K> = P extends '' ? `${K & string}` : `${P}.${K & string}`;

// `string`, or a text built with an expression (`Se connecter${string}`), has
// no fixed characters to check: only a fixed text gives {} no key it lacks.
type TextProblems<L extends Language, T, Need extends string, Allowed extends string, Path extends string> = T extends string
  ? {} extends Record<T, unknown>
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

// Each problem rebuilt as a new string, so tsc prints the list, not a type's name.
type Listed<P> = P extends string ? `${P}.` : never;

// English is checked against itself: Checked<'en', typeof en, typeof en>.
export type Checked<L extends Language, T, E> = [GroupProblems<L, T, E, ''>] extends [never]
  ? true
  : Listed<GroupProblems<L, T, E, ''>>;
