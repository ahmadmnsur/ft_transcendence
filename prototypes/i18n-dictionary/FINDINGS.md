# A typed dictionary for the SPA's text: prototype

Built 2026-10-14 for
[Settle the translation library and how text is keyed](https://github.com/ahmadmnsur/ft_transcendence/issues/144),
to check what a typed dictionary over `Intl` can make `tsc` reject before the decision relies on it.
It is a throwaway: no provider, no switcher and no `<html lang dir>`. The French and Arabic lines are
samples written to exercise the types, not reviewed translations. The library comparison it builds
on is [Find which translation library fits the SPA](https://github.com/ahmadmnsur/ft_transcendence/issues/149)
(findings on `research/i18n-library`); section 12 there sketches the same idea in about 45 lines.

> **Revised 2026-10-14 after [Ahmad's review](https://github.com/ahmadmnsur/ft_transcendence/issues/144#issuecomment-6175652455).**
> The first version is `c0fb5ce`. This one splits each language into area files, checks each whole
> language once in its `index.ts`, keeps code-keyed texts' literal types, requires `{count}` in
> every form that holds more than one number, rejects empty texts, non-camelCase placeholders and
> `undefined`, `null`, `false` or an array as a value, writes every number through
> `Intl.NumberFormat`, isolates every value, joins lists with `formatToParts`, and lays French and
> Arabic over English per form and per part. `npm run cases` now exits 1 when a case misbehaves or
> its edit changes nothing.

## Versions

TypeScript 5.9.3, React and React DOM 19.3.0, `@types/react` and `@types/react-dom` 19.3.0: the
versions `web/package-lock.json` locks at `3c67770`. `tsconfig.json` has `web/tsconfig.app.json`'s
compiler options, without its `paths`, `types` and `tsBuildInfoFile`. Run on Node 22.22.1 (ICU 78.2,
CLDR 48). `out/isolation.html` was opened in Google Chrome 154.0.8037.97 and Firefox 157.0 on
Linux. The size was measured with Vite 8.3.1 and `@vitejs/plugin-react` 6.1.1.

## Files

- `src/i18n/types.ts`: the plural forms each language writes, the forms that hold a single number,
  `Catalogue` (what a French or Arabic area must contain, derived from its English area) and
  `Checked` (every problem in a whole language, as a list of readable lines).
- `src/i18n/en/`, `fr/`, `ar/`: one file per area (`nav`, `inbox`, `errors`, `insights`, `matches`)
  and an `index.ts` that joins them. Every area file is `as const`. An English area `satisfies
  EnGroup`, and `errors.ts`, keyed by code, `satisfies Record<ErrorCode, string>`. A French or
  Arabic area `satisfies Catalogue<'fr', typeof <its English area>>`. Each `index.ts` holds one line,
  `Checked<…> = true`; English is checked against itself.
- `src/i18n/text.tsx`: `format` (a message as markup), `formatText` (the same as a string, for
  `alt`, `title`, `aria-label` and `<option>`), `list` and `listText` (a list as markup or as a
  string), and `over` (French or Arabic laid over English).
- `src/i18n/language.ts`: the first-visit rule, the direction table, and the locale each language
  gives `Intl`.
- `src/codes.ts`: a stand-in for `src/shared/codes.ts`, with three codes.
- `src/use.tsx`: call sites, as a component would write them.

`types.ts`, `text.tsx` and `language.ts` are 311 lines together, comments included.

## How to run

```sh
cd prototypes/i18n-dictionary
npm ci
npm run check    # tsc on the files as they are: passes
npm run cases    # 45 edits, each checked against tsc, each file restored afterwards
npm run output   # compiles src/ and prints the rendered texts; writes out/isolation.html
npm run scale    # tsc's check time on the small set and with 1,500 more texts per language
```

## What `tsc` rejects

`npm run cases` makes one edit at a time, runs `tsc -p .`, and restores the file. It lists every
error by file and code, and prints each `index.ts` check's problem list in full. All 45 behaved as
listed. In the table, `index.ts` is the language's `Checked` line.

| Edit | `tsc` fails in |
| --- | --- |
| French lacks a text English has (`inbox.title`) | `fr/inbox.ts` TS1360, `fr/index.ts` |
| French has a key English lacks | `fr/inbox.ts` TS2353, `fr/index.ts` |
| French writes a plural form it does not have (`two`) | `fr/inbox.ts` TS2353, `fr/index.ts` |
| English gains a text that French and Arabic lack | each language's `inbox.ts` TS1360 and `index.ts` |
| English deletes a text that French and Arabic still have | each language's `inbox.ts` TS2353 and `index.ts`, `use.tsx` TS2339 |
| A French area file without its `satisfies`, with a key English lacks | `fr/index.ts` |
| A French area file without `as const` | `fr/index.ts`: "not a literal type" for each text |
| An area left out of French's `index.ts` | `fr/index.ts`: "matches: missing" |
| Arabic lacks the plural form `few` | `ar/inbox.ts` TS2741, `ar/index.ts` |
| French lacks the plural form `many` | `fr/inbox.ts` TS2741, `fr/index.ts` |
| French lacks a form in one part of a two-number sentence | `fr/insights.ts` TS2741, `fr/index.ts` |
| French `one` without `{count}` | `fr/inbox.ts` TS2322, `fr/index.ts` |
| French `other` without `{count}` | `fr/inbox.ts` TS2322, `fr/index.ts` |
| Arabic `few` without `{count}` | `ar/inbox.ts` TS2322, `ar/index.ts` |
| English `one` without `{count}` | passes, as intended |
| Arabic `two` with `{count}` | passes, as intended |
| English `one` gains `{name}`, `other` lacks it | `en/index.ts`, every French and Arabic form, `use.tsx` TS2345 |
| French writes `{nom}` where English has `{name}` | `fr/inbox.ts` TS2322, `fr/index.ts` |
| French adds a placeholder English lacks (`{foo}`) | `fr/index.ts` |
| Arabic adds a placeholder inside one plural form (`{who}`) | `ar/index.ts` |
| Arabic drops `{skill}` from a two-number sentence | `ar/insights.ts` TS2322, `ar/index.ts` |
| English names a placeholder `{first-name}` | `en/index.ts`: "not a camelCase name", and French, Arabic and `use.tsx` |
| English gives a code-keyed text `{max}` | each language's `errors.ts` TS2322 and `index.ts`, `use.tsx` TS2322 (the lookup by code) |
| The code-keyed group without `as const` | `en/index.ts`: "not a literal type" for each text |
| French lacks a part of a two-number sentence | `fr/insights.ts` TS2741, `fr/index.ts` |
| English drops a part from its own text (`{supply}`) | `en/index.ts` |
| French has an empty text | `fr/index.ts` |
| French has a text of spaces only | `fr/index.ts` |
| French has an empty plural form | `fr/inbox.ts` TS2322, `fr/index.ts` |
| English has an empty text | `en/index.ts` |
| An English group has a key named `other` | `en/index.ts`: "a reserved name", and French and Arabic |
| An English group has a key named `text` | `en/index.ts`: "a reserved name", and French and Arabic |
| `codes.ts` gains a code that has no English text | `en/errors.ts` TS1360, `use.tsx` TS7053 |
| English has text for a code that does not exist | `en/errors.ts` TS2353, French and Arabic |
| A call leaves out a placeholder's value | `use.tsx` TS2345 |
| A call names a value the text does not have (`nom`) | `use.tsx` TS2353 |
| A call passes a string as `count` | `use.tsx` TS2322 |
| A call leaves out the second number of a two-number sentence | `use.tsx` TS2345 |
| A call passes `undefined` as a value | `use.tsx` TS2322 |
| A call passes `null` as a value | `use.tsx` TS2322 |
| A call passes `false` as a value | `use.tsx` TS2322 |
| A call passes an array, not joined by `list()` | `use.tsx` TS2322 |
| A component renders a text with placeholders without filling it | `use.tsx` TS2322 |
| A component renders a plural without filling it | `use.tsx` TS2322 |
| A component uses a key English does not have | `use.tsx` TS2339 |

A `Checked` line names each problem by its key, in one error per language. With `inbox.archived`
added to English only, French's and Arabic's `index.ts` each say `Type 'true' is not assignable to
type '"inbox.archived: missing."'`, beside their area file's TS1360. With 30 texts owed, the one
error lists them all under `--noErrorTruncation`; without it, `tsc` shortens the list to the first
seven, "... 22 more ..." and the last.

A form may leave out `{count}` only if it holds a single number: English `one`, and Arabic `zero`,
`one` and `two`, which may write the number in words (`رسالة واحدة`, `رسالتان`). French `one` holds
both 0 and 1, so it writes `{count}`. Every other placeholder of the message must appear in every
form, English's own included.

A message is told from a group by its exact keys: `one` and `other` is a plural, `text` and
`parts` is a sentence with two numbers. So no group may have a key named `text`, `parts`, `zero`,
`one`, `two`, `few`, `many` or `other`, and English's check rejects one. No code in
`src/shared/` and no enum value in `docs/spec.md` §4.2 is one of them.

## What it renders

`npm run output`, through `react-dom/server`.

**Plurals** (the `<bdi>` around each number left out here):

```text
0 | en 0 unread messages | fr 0 message non lu | ar لا رسائل غير مقروءة
1 | en 1 unread message | fr 1 message non lu | ar رسالة واحدة غير مقروءة
2 | en 2 unread messages | fr 2 messages non lus | ar رسالتان غير مقروءتين
3 | en 3 unread messages | fr 3 messages non lus | ar 3 رسائل غير مقروءة
11 | en 11 unread messages | fr 11 messages non lus | ar 11 رسالة غير مقروءة
100 | en 100 unread messages | fr 100 messages non lus | ar 100 رسالة غير مقروءة
1000000 | en 1,000,000 unread messages | fr 1 000 000 de messages non lus | ar 1,000,000 رسالة غير مقروءة
```

French counts 0 as `one`, and 1,000,000 takes `many`.

**A name, and the insight sentence of `docs/spec.md` §13.3**, which has two numbers. Every value is
in a `<bdi>`: a string or a number by `format`, and the name here because the caller passes one, as
`PersonName` is.

```text
رسالة جديدة من <bdi>Ahmad</bdi>
<bdi>12</bdi> Students want to learn <bdi>C++</bdi>; only <bdi>1</bdi> can teach it.
<bdi>1</bdi> étudiant veut apprendre <bdi>C++</bdi> ; seulement <bdi>3</bdi> peuvent l’enseigner.
طالبان يريدان تعلّم <bdi>C++</bdi>، ولا يعلّمها إلا <bdi>11</bdi>.
```

**A number in a placeholder other than `{count}`** goes through `Intl.NumberFormat` too:

```text
en Evidence files up to <bdi>1,234,567</bdi> KB.
fr Fichiers de preuve jusqu’à <bdi>1 234 567</bdi> Ko.
ar ملفات الدليل حتى <bdi>1,234,567</bdi> كيلوبايت.
```

`Intl` gets each language's locale from one table in `language.ts`. With the bare tag `ar`, CLDR 48
gives Western digits; which digits Arabic uses is
[Settle how Arabic looks: mirroring, font, digits and dates](https://github.com/ahmadmnsur/ft_transcendence/issues/146)'s,
set in that table.

**Plain strings** (`formatText`), with U+2068 and U+2069 shown as ⟨FSI⟩ and ⟨PDI⟩:

```text
رسالة جديدة من ⟨FSI⟩C++⟨PDI⟩
⟨FSI⟩Ahmad⟨PDI⟩ vous a envoyé un message
⟨FSI⟩3⟨PDI⟩ رسائل غير مقروءة
```

**Lists.** `Intl.ListFormat` alone, then `list()` and `listText()`, which build the list from
`formatToParts` and isolate each item:

```text
en Docker, Git, and C++
en <bdi>Docker</bdi>, <bdi>Git</bdi>, and <bdi>C++</bdi>
en ⟨FSI⟩Docker⟨PDI⟩, ⟨FSI⟩Git⟨PDI⟩, and ⟨FSI⟩C++⟨PDI⟩
fr Docker, Git et C++
fr <bdi>Docker</bdi>, <bdi>Git</bdi> et <bdi>C++</bdi>
fr ⟨FSI⟩Docker⟨PDI⟩, ⟨FSI⟩Git⟨PDI⟩ et ⟨FSI⟩C++⟨PDI⟩
ar Docker وGit وC++
ar <bdi>Docker</bdi> و<bdi>Git</bdi> و<bdi>C++</bdi>
ar ⟨FSI⟩Docker⟨PDI⟩ و⟨FSI⟩Git⟨PDI⟩ و⟨FSI⟩C++⟨PDI⟩
```

The output is `Intl.ListFormat`'s as it is: English puts a comma before "and", and Arabic joins
with "و" and no Arabic comma. An element item, such as a `SkillChip`, is kept as it is.

**In a browser.** `out/isolation.html` is a right-to-left Arabic page with each string twice: as it
was before (no isolation) and as `formatText`, `listText` and `list()` give it now. In Chrome 154
and Firefox 157, every string without isolation shows `++C`, in a `<p>` and in an `<option>`
alike, and every isolated one shows `C++`. `title` and `aria-label` were not checked: no tooltip was
opened and no screen reader was run.

**The first-visit rule**, as `(stored choice, browser languages) -> language`:

```text
null ["de-DE","de","fr-FR","fr"] -> fr
null ["fr-CA"] -> fr
null ["de-DE","es"] -> en
null [] -> en
null ["AR-lb","en-US"] -> ar
null ["ar-u-nu-latn"] -> ar
null ["zh-Hant"] -> en
null [""] -> en
null ["EN"] -> en
"ar" ["fr-FR"] -> ar
"de" ["fr-FR"] -> fr
```

**French with texts missing, laid over English.** `tsc` rejects every one of these files; this is
what `vite dev`, which does not type-check, would show. `over` follows English's shape:

```text
nav and inbox.title deleted: Privacy Policy | Inbox | Ahmad vous a envoyé un message
inbox.title empty: Inbox
unread.many deleted, 1,000,000: 1 000 000 messages non lus
unread.other deleted, 0 and 1,000,000: 0 unread messages / 1,000,000 unread messages
gapSome.parts.supply deleted: 1 Student wants to learn C++; only 3 can teach it.
gapSome.parts deleted: 1 Student wants to learn C++; only 3 can teach it.
gapSome.text empty: 1 Student wants to learn C++; only 3 can teach it.
gapSome.parts.demand.other deleted: 1 Student wants to learn C++; only 3 can teach it.
inbox.sentYou a plural, not a text: Ahmad sent you a message
the whole file missing: Inbox | 0 unread messages
Arabic unread.other deleted, 3: 3 unread messages
console.warn and console.error calls: 0
```

A missing or empty text shows in English, and a missing form uses that language's `other`. A
plural without `other`, or a two-number sentence missing its text, a part or a part's `other`,
shows whole in English, chosen by English's plural rules: French 0 is `one`, but the English shown
in its place reads "0 unread messages". Nothing throws. A placeholder with no value, which only an
untyped call could cause, shows as written, `{name}`.

## Size

Measured as #149 measured it: a Vite 8.3.1 production build of a small React app, with and without
the helpers (`format`, `formatText`, `list`, `listText`, `over`, `firstLanguage`) and one two-form
message. The helpers add 948 bytes of JavaScript gzip (67,661 → 68,609). The texts are not counted.

## How long `tsc` takes

`npm run scale` copies the prototype and adds an area of 1,500 texts to each language: 1,200 plain
texts (a third with two placeholders), 240 plurals and 60 two-number sentences. On this machine:

| Set | Instantiations | Check time | Total |
| --- | --- | --- | --- |
| the prototype's own | 13,071 | 0.66 s | 1.89 s |
| 1,500 more texts per language | 602,761 | 2.90 s | 4.28 s |

No error, and no "excessively deep" instantiation. Other runs gave 3.0 to 3.2 s of check time. With
three faults put deep in that area (an empty French text, a French `{zzz}`, an Arabic `many` without
`{count}`), `tsc` named all three by key.

## What this does not show

- Nothing ran through Vite's dev server, and the app shell was not built: no provider, no switcher,
  no `<html lang dir>`, no `localStorage` read or write. `language.ts` takes the stored value and the
  browser's list as arguments.
- `Intl.Locale.prototype.getTextInfo()` is not used: TypeScript 5.9.3's libraries do not declare it
  (#149, section 12), so `language.ts` keeps its own direction table.
- `tsc` does not see which value fills a name: `PersonName` in markup, #142's plain-text helper in
  a plain string. Nor does it see English left in a French or Arabic file, or a poor translation.
- A literal `{` followed by `}` is read as a placeholder, so a text cannot show braces; none needs
  to so far.

