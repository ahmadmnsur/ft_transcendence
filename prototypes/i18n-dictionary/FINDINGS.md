# A typed dictionary for the SPA's text: prototype

Built 2026-10-14 for
[Settle the translation library and how text is keyed](https://github.com/ahmadmnsur/ft_transcendence/issues/144),
to check what a typed dictionary over `Intl` can make `tsc` reject before the decision relies on it.
It is a throwaway: no provider, no switcher and no `<html lang dir>`. The French and Arabic lines are
samples written to exercise the types, not reviewed translations. The library comparison it builds
on is [Find which translation library fits the SPA](https://github.com/ahmadmnsur/ft_transcendence/issues/149)
(findings on `research/i18n-library`); section 12 there sketches the same idea in about 45 lines.

## Versions

TypeScript 5.9.3, React and React DOM 19.3.0, `@types/react` and `@types/react-dom` 19.3.0: the
versions `web/package-lock.json` locks at `3c67770`. `tsconfig.json` has `web/tsconfig.app.json`'s
compiler options, without its `paths`, `types` and `tsBuildInfoFile`. Run on Node 22.22.1. Vite was
not run here; #149 built a typed dictionary with Vite 8.3.1 and `@vitejs/plugin-react` 6.1.1.

## Files

- `src/i18n/types.ts`: the plural forms each language writes, and the types that derive what French
  and Arabic must contain from the English file.
- `src/i18n/en.ts`, `fr.ts`, `ar.ts`: the three files. English is `as const satisfies EnGroup`;
  French and Arabic are `as const satisfies Catalogue<'fr', typeof en>` (or `'ar'`), plus one line
  that rejects placeholders English does not have.
- `src/i18n/text.tsx`: `format` (fills a text, a plural or a text with plural parts, and returns a
  React node), `formatText` (the same as a string, for `alt`, `title`, `aria-label` and `<option>`),
  and `over` (French or Arabic laid over English).
- `src/i18n/language.ts`: the first-visit rule and the direction table.
- `src/codes.ts`: a stand-in for `src/shared/codes.ts`, with three codes.
- `src/use.tsx`: call sites, as a component would write them.

`types.ts`, `text.tsx` and `language.ts` are 150 lines together, comments included.

## How to run

```sh
cd prototypes/i18n-dictionary
npm ci
npm run check    # tsc on the files as they are: passes
npm run cases    # 20 edits, each checked against tsc, each file restored afterwards
npm run output   # compiles src/ and prints the rendered texts
npm run scale    # tsc's check time on the small set and on 1,500 texts per language
```

## What `tsc` rejects

`npm run cases` makes one edit at a time, runs `tsc -p .`, and restores the file. It prints the
first error of each run; the table names every file that failed. All 20 behaved as listed:

| Edit | `tsc` |
| --- | --- |
| French lacks a text English has (`inbox.title`) | fails, TS2741 |
| Arabic lacks the plural form `few` | fails, TS2741 |
| French lacks the plural form `many` | fails, TS2741 |
| French writes `{nom}` where English has `{name}` | fails, TS2322 |
| French adds a placeholder English lacks (`{foo}`) | fails, TS2322, naming `foo` |
| Arabic adds a placeholder inside one plural form (`{who}`) | fails, TS2322, naming `who` |
| French has a key English lacks | fails, TS2353 |
| English gains a text that French and Arabic lack | fails, TS2741 in both |
| `codes.ts` gains a code that has no English text | fails, TS1360 |
| English has text for a code that does not exist | fails, TS2353 in English, TS2741 in French and Arabic |
| French lacks a form in one part of a two-number sentence | fails, TS2741 |
| Arabic drops `{skill}` from a two-number sentence | fails, TS2322 |
| Arabic writes its `two` form without `{count}` | passes, as intended |
| A call leaves out a placeholder's value | fails, TS2345 |
| A call names a value the text does not have (`nom`) | fails, TS2353 |
| A call passes a string as `count` | fails, TS2322 |
| A call leaves out the second number of a two-number sentence | fails, TS2345 |
| A component renders a text with placeholders without filling it | fails, TS2322 |
| A component renders a plural without filling it | fails, TS2322 |
| A component uses a key English does not have | fails, TS2339 |

A form may leave out `{count}`, since Arabic writes one and two in words (`رسالة واحدة`, `رسالتان`).
Every other placeholder of the English text must appear in every form.

## What it renders

`npm run output`, through `react-dom/server`:

```text
0 | en 0 unread messages | fr 0 message non lu | ar لا رسائل غير مقروءة
1 | en 1 unread message | fr 1 message non lu | ar رسالة واحدة غير مقروءة
2 | en 2 unread messages | fr 2 messages non lus | ar رسالتان غير مقروءتين
3 | en 3 unread messages | fr 3 messages non lus | ar 3 رسائل غير مقروءة
11 | en 11 unread messages | fr 11 messages non lus | ar 11 رسالة غير مقروءة
100 | en 100 unread messages | fr 100 messages non lus | ar 100 رسالة غير مقروءة
1000000 | en 1,000,000 unread messages | fr 1 000 000 de messages non lus | ar 1,000,000 رسالة غير مقروءة
```

French counts 0 as `one`, and 1,000,000 takes `many`. `{count}` goes through
`Intl.NumberFormat` with the bare language tag, so `ar` prints Western digits; which digits Arabic
uses is [Settle how Arabic looks: mirroring, font, digits and dates](https://github.com/ahmadmnsur/ft_transcendence/issues/146)'s.

A name, and the insight sentence of `docs/spec.md` §13.3, which has two numbers:

```text
رسالة جديدة من <bdi>Ahmad</bdi>
Ahmad vous a envoyé un message
12 Students want to learn <bdi>C++</bdi>; only 1 can teach it.
1 étudiant veut apprendre <bdi>C++</bdi> ; seulement 3 peuvent l’enseigner.
طالبان يريدان تعلّم <bdi>C++</bdi>، ولا يعلّمها إلا 11.
```

The second line is `formatText`'s plain string. The two-number sentence is one message: its `text`
orders the parts, and each part is written once per plural form, chosen by its own number.

The first-visit rule, as `(stored choice, browser languages) -> language`:

```text
null ["de-DE","de","fr-FR","fr"] -> fr
null ["fr-CA"] -> fr
null ["de-DE","es"] -> en
null [] -> en
null ["AR-lb","en-US"] -> ar
"ar" ["fr-FR"] -> ar
"de" ["fr-FR"] -> fr
```

A French file with `inbox.title` and the whole `nav` group deleted, laid over English, shows
`Inbox | Privacy Policy | Ahmad vous a envoyé un message`: the missing texts come from English, the
rest stays French. `tsc` rejects such a file; this is what `vite dev`, which does not type-check,
would show.

## How long `tsc` takes

`npm run scale` copies the prototype and adds 1,500 texts per language: 1,200 plain texts (a third
with two placeholders), 240 plurals and 60 two-number sentences. On this machine:

| Set | Instantiations | Check time | Total |
| --- | --- | --- | --- |
| the prototype's own | 5,817 | 0.49 s | 1.69 s |
| 1,500 texts per language | 225,999 | 2.13 s | 3.65 s |

No error, and no "excessively deep" instantiation. A second run gave 1.76 s of check time.

## What this does not show

- Nothing ran in a browser, and Vite did not run.
- The provider, the switcher, `<html lang dir>` and the `localStorage` read and write are not
  built. `language.ts` takes the stored value and the browser's list as arguments.
- `Intl.Locale.prototype.getTextInfo()` is not used: TypeScript 5.9.3's libraries do not declare it
  (#149, section 12), so `language.ts` keeps its own direction table.
- A plain text that needs a literal `{` would be read as a placeholder. No text written so far has
  one.
