# Which translation library fits the PeerConnect SPA

Researched and checked 2026-10-12 for
[#149](https://github.com/ahmadmnsur/ft_transcendence/issues/149). Built from:

- the library source at release tags:
  [`i18next` v26.4.4](https://github.com/i18next/i18next/tree/v26.4.4) (2026-10-12),
  [`react-i18next` v17.0.16](https://github.com/i18next/react-i18next/tree/v17.0.16) (2026-10-06),
  [`i18next-browser-languagedetector` v8.2.1](https://github.com/i18next/i18next-browser-languagedetector/tree/v8.2.1)
  (2026-02-12);
  the FormatJS monorepo at [`react-intl@12.1.4`](https://github.com/formatjs/formatjs/tree/react-intl%4012.1.4)
  (commit `2a07f47`, 2026-10-05; the same commit is tagged `@formatjs/intl@6.1.3`,
  `intl-messageformat@12.1.3`, `@formatjs/unplugin@1.2.13` and `babel-plugin-formatjs@13.0.7`);
  [`lingui/js-lingui` v6.9.1](https://github.com/lingui/js-lingui/tree/v6.9.1) (2026-10-09);
  [`vitejs/vite-plugin-react` `plugin-react@6.1.1`](https://github.com/vitejs/vite-plugin-react/tree/plugin-react%406.1.1)
  (2026-08-28), the version `web/package-lock.json` installs;
- the official docs, read at their source: the FormatJS docs at the `react-intl@12.1.4` tag, the
  Lingui docs at `v6.9.1`, the i18next docs
  ([`i18next-gitbook` at `ea65e20`](https://github.com/i18next/i18next-gitbook/tree/ea65e2028dc163c08cbf0c1660c8c96d35a9d5cf))
  and the react-i18next docs
  ([`react-i18next-gitbook` at `0c8bde5`](https://github.com/i18next/react-i18next-gitbook/tree/0c8bde5e765949e45e2ae6a9af27dcffd1c57eda)),
  both read on 2026-10-12, and the
  [`i18next-cli` v1.75.2 README](https://github.com/i18next/i18next-cli/blob/v1.75.2/README.md);
- the npm registry on 2026-10-12 (`npm view <pkg> version time license peerDependencies engines`);
- CLDR `plurals.xml` at [`release-37`](https://github.com/unicode-org/cldr/blob/release-37/common/supplemental/plurals.xml),
  [`release-38`](https://github.com/unicode-org/cldr/blob/release-38/common/supplemental/plurals.xml) and
  [`release-48`](https://github.com/unicode-org/cldr/blob/release-48/common/supplemental/plurals.xml)
  (the latest final release), and `Intl.PluralRules` in Node 22.22.1 (ICU 78.2, CLDR 48.0);
- the TypeScript `lib` files at [`v5.9.3`](https://github.com/microsoft/TypeScript/tree/v5.9.3/src/lib);
- MDN's browser support data, [`browser-compat-data` v8.1.5](https://github.com/mdn/browser-compat-data/tree/v8.1.5/javascript/builtins/Intl);
- six throwaway apps built on 2026-10-12, one per option plus a baseline, all with the SPA's locked
  versions (Vite 8.3.1, `@vitejs/plugin-react` 6.1.1, React 19.3.0, `@tanstack/react-router`
  1.170.41, TypeScript 5.9.3, the SPA's `tsconfig.app.json` settings) on Node 22.22.1. Each has an
  en/fr/ar catalogue, a plural, `PersonName` inside a sentence and a language switch. They were
  type-checked with `tsc -b`, built with `vite build`, and grepped. Runtime behaviour was checked
  in Node with `react-dom/server`, in development and production mode. See
  [How the experiments were run](#how-the-experiments-were-run).

These are facts only. Each finding says which options it rules in or out. **No choice for
PeerConnect is made here**; that choice belongs to
[#144](https://github.com/ahmadmnsur/ft_transcendence/issues/144) ("Settle the translation library
and how text is keyed"). No browser was opened: every claim about the browser console comes from
reading the source, or from running the library in Node, and says which. Code that was read but not
run says so.

The four options:

- **i18next**: `i18next` with `react-i18next`.
- **react-intl**: FormatJS's `react-intl`, with its CLI and build plugin where they are named.
- **Lingui**: `@lingui/core` and `@lingui/react`, with `@lingui/vite-plugin` and `@lingui/cli`.
- **Typed dictionary**: TypeScript objects in the repo, read through a small helper over `Intl`.

## Question

Which way of translating the SPA's text fits PeerConnect: react-i18next, FormatJS (react-intl),
Lingui, or a small typed dictionary over `Intl` kept in the repo? Compared on: the SPA's React 19,
Vite 8 and TanStack Router; plurals in Arabic and French; a missing key failing `tsc -b`; switching
language and `<html lang dir>` without a reload; a clean browser console; loading one language at a
time and bundle size; a React element inside a translated sentence; plus the CSP, detection and
fallback, and maintenance.

## Short answer

All four built and type-checked in a Vite 8 + React 19 + TanStack Router app. `@vitejs/plugin-react`
6 **no longer uses Babel**: it transforms JSX with Oxc, which Vite 8 has built in. That matters only
for Lingui, whose macros need a transform: Lingui 6.9 does it natively with
`lingui({ macroTransform: true })` (a prebuilt Rust binary), and that worked in build and dev.
react-intl needs **no** transform when every message has an `id`; its optional `@formatjs/unplugin`
uses `oxc-parser`, not Babel, and also worked. No option uses `eval` or `new Function`, so the CSP
without `'unsafe-eval'` is not a problem for any of them. Measured over a baseline app, the added
JavaScript is about **0.9 kB** gzip for the typed dictionary, **3.8 kB** for Lingui, **7.4 kB** for
react-intl with precompiled messages (14.6 kB without), and **19.9 kB** for i18next. Every option
selects plurals through `Intl.PluralRules`, and in CLDR 38 and later **French has a `many` form**
(1,000,000 → `many`). When a French `many` text is missing, react-intl and Lingui use `other`, but
**i18next shows the English text** instead. On typing, i18next and Lingui check keys against one
language only; react-intl's flat catalogue lets `satisfies` check French and Arabic; the typed
dictionary can check every key and every plural form of every language in `tsc -b`. In the console,
i18next 26 prints nothing by default (the support notice of 25.8–25.10 is gone), react-intl prints
`console.error` for a missing message in development only, and **Lingui prints `console.warn` in
production** for a message id missing from the loaded catalogue, unless a `missing` handler is set.
Only i18next has a direction helper (`i18n.dir()`); with every option our code sets
`<html lang dir>`.

## 1. React 19, Vite 8 and TanStack Router

### What `@vitejs/plugin-react` 6 transforms with

- **Oxc, not Babel.** Version 6.0.0 (2026-03-12) removed Babel: *"Vite 8+ can handle React Refresh
  Transform by Oxc and doesn't need Babel for it … babel is no longer a dependency of this
  plugin"*
  ([`CHANGELOG.md` L67–75](https://github.com/vitejs/vite-plugin-react/blob/plugin-react%406.1.1/packages/plugin-react/CHANGELOG.md#L67-L75)).
  In 6.1.1 the plugin only sets Vite's `oxc.jsx` options
  ([`src/index.ts` L98–130](https://github.com/vitejs/vite-plugin-react/blob/plugin-react%406.1.1/packages/plugin-react/src/index.ts#L98-L130)).
- **Babel is a separate plugin now.** A project that needs a Babel plugin adds
  `@rolldown/plugin-babel` next to `react()`
  ([README L115–138](https://github.com/vitejs/vite-plugin-react/blob/plugin-react%406.1.1/packages/plugin-react/README.md#L115-L138)).
  `plugin-react` 6.1.1 (and 6.1.2) list it as an optional peer, `^0.1.7 || ^0.2.0`; the latest is
  0.2.4 (2026-09-07), with peers `vite ^8.0.0` and `@babel/core ^7.29.0 || ^8.0.0-rc.1` (npm,
  2026-10-12).

Rules in: every option that needs no Babel plugin. Rules out: nothing by itself, since each option
that needs a transform has a non-Babel path (below).

### Peer dependencies (npm registry, 2026-10-12)

| Package | Version | Peer dependencies |
| --- | --- | --- |
| `i18next` | 26.4.4 | `typescript ^5 \|\| ^6 \|\| ^7` (optional) |
| `react-i18next` | 17.0.16 | `react >= 16.8.0`, `i18next >= 26.2.0`, `typescript` (optional) |
| `react-intl` | 12.1.4 | `react >=18.0.0`, `@types/react >=18.0.0`; docs ask for TypeScript 5.4+ ([`react-intl.mdx` L256–262](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/react-intl.mdx#L256-L262)) |
| `@formatjs/unplugin` | 1.2.13 | `vite >=5` (and other bundlers) |
| `@lingui/react` | 6.9.1 | `react ^16.14.0 \|\| ^17 \|\| ^18 \|\| ^19`; engines `node >=22.19.0` |
| `@lingui/vite-plugin` | 6.9.1 | `vite ^6.3.0 \|\| ^7 \|\| ^8`; optional `@babel/core`, `@rolldown/plugin-babel`, `@lingui/babel-plugin-lingui-macro` |
| Typed dictionary | – | none |

`npm ls --all` showed no unmet or invalid peer in any experiment; the only unmet entries were other
platforms' optional native binaries.

### What each option needs under Vite 8 + `plugin-react` 6

- **i18next**: nothing. It is plain runtime code; there is no macro or id plugin.
- **react-intl**: nothing, **if every message has an explicit `id`**. Without an `id`,
  `formatMessage` throws *"An `id` must be provided"*
  ([`intl/message.ts` L141–151](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/packages/intl/message.ts#L141-L151));
  the build plugins exist to generate ids from `defaultMessage`, remove `description`, and
  precompile messages ([`bundler-plugins.mdx` L36–81](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/guides/bundler-plugins.mdx#L36-L81)).
  For those jobs `@formatjs/unplugin` *"provides the same transformations as babel-plugin-formatjs
  … without requiring Babel"*, using `oxc-parser` and `magic-string`
  ([`unplugin.mdx` L1–10](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/tooling/unplugin.mdx#L1-L10)).
  **Run:** with `formatjs({ idInterpolationPattern, ast: true })` before `react()`, `vite build`
  passed, the built code had `defaultMessage:[{type:0,value:"Inbox"}]` and no `description`; the
  same build without the plugin kept the `description` string. `babel-plugin-formatjs` 13.0.7 would
  need `@rolldown/plugin-babel` (not run).
  `@formatjs/swc-plugin` is old (1.5.23, 2024-11-04) and is for an SWC pipeline, which the SPA does
  not use.
- **Lingui**: its macros (`t`, `<Trans>`, `<Plural>`) must be transformed. Three ways:
  1. **`lingui({ macroTransform: true })`**: the Vite plugin transforms macros itself through
     `@lingui/native-tools` (*"Rust + SWC"*), so *"you don't need a separate Babel or SWC plugin"*;
     it is off by default and *"will become the default in the next major release"*
     ([`ref/vite-plugin.md` L27–38, L62–94](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/ref/vite-plugin.md#L62-L94),
     [`vite-plugin/src/index.ts` L85–133](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/vite-plugin/src/index.ts#L85-L133)).
     Prebuilt binaries exist for macOS, Linux (glibc and musl), Windows and Android; *"There is no
     WASM fallback"* ([`ref/vite-plugin.md` L88–90](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/ref/vite-plugin.md#L88-L90);
     `@lingui/native-tools` 0.1.6 optional dependencies on npm). **Run:** `vite build` passed and
     `vite` dev served `App.tsx` with the macros replaced by `Trans` calls with ids.
  2. `@rolldown/plugin-babel` with `linguiTransformerBabelPreset()`
     ([`installation.mdx` L240–256](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/installation.mdx#L240-L256)).
     Not run.
  3. `@vitejs/plugin-react-swc` with `@lingui/swc-plugin` 6.7.1. This replaces the SPA's React
     plugin. Not run.

  `lingui extract` (a CLI step, not part of Vite) still parses with Babel by default
  ([`ref/vite-plugin.md` L92–94](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/ref/vite-plugin.md#L92-L94));
  `@lingui/cli` depends on `@babel/core` itself, and the extract ran without extra setup.
- **Typed dictionary**: nothing.

Rules in: all four. Rules out: Lingui *without* one of the three transforms above, and the Babel
setup Lingui's installation page still shows for the older `plugin-react`
([`installation.mdx` L173](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/installation.mdx#L173)).

### TanStack Router

None of the four options touches the router. All four apps used `@tanstack/react-router` 1.170.41
with its `Register` declaration, and `tsc -b` and `vite build` passed. The language is not part of
the URL in any of them.

## 2. Plurals

### What CLDR gives

- **Arabic has six forms**: `zero` (0), `one` (1), `two` (2), `few` (3–10 after `% 100`), `many`
  (11–99 after `% 100`), `other`
  ([`plurals.xml` release-48 L241–248](https://github.com/unicode-org/cldr/blob/release-48/common/supplemental/plurals.xml#L241-L248)).
- **French has `one`, `many` and `other`.** `many` covers whole millions and large exponents: *"e =
  0 and i != 0 and i % 1000000 = 0 and v = 0 or e != 0..5"*
  ([release-48 L118–122](https://github.com/unicode-org/cldr/blob/release-48/common/supplemental/plurals.xml#L118-L122)).
  French had only `one` and `other` in CLDR 37
  ([release-37 L25–28](https://github.com/unicode-org/cldr/blob/release-37/common/supplemental/plurals.xml#L25-L28))
  and gained `many` in CLDR 38
  ([release-38 L116–120](https://github.com/unicode-org/cldr/blob/release-38/common/supplemental/plurals.xml#L116-L120)).
  French `one` is `i = 0,1`, so 0 is `one`.
- **Run** in Node 22.22.1 (CLDR 48.0): `new Intl.PluralRules('fr')` lists `many, one, other`;
  `select(1000000)` and `select(2000000)` give `many`, `select(1000001)` gives `other`, `select(0)`
  gives `one`. `new Intl.PluralRules('ar')` gives `zero, one, two, few, many, other` for 0, 1, 2, 3,
  11, 100.

### How each option writes and selects them

| Option | How plural text is written | How a form is chosen | French 1,000,000 with no `many` text |
| --- | --- | --- | --- |
| i18next | one key per form: `unread_one`, `unread_many`, `unread_other` ([plurals docs L9–10](https://github.com/i18next/i18next-gitbook/blob/ea65e2028dc163c08cbf0c1660c8c96d35a9d5cf/translation-function/plurals.md#L9-L10)); `_zero` is also tried when `count === 0` ([L35](https://github.com/i18next/i18next-gitbook/blob/ea65e2028dc163c08cbf0c1660c8c96d35a9d5cf/translation-function/plurals.md#L35)) | `Intl.PluralRules(lng).select(count)` gives the suffix ([`PluralResolver.js` L36–61, L83–92](https://github.com/i18next/i18next/blob/v26.4.4/src/PluralResolver.js#L36-L92)) | **English text**: it tries `unread_many`, then `unread`, then moves to the fallback language ([`Translator.js` L490–566](https://github.com/i18next/i18next/blob/v26.4.4/src/Translator.js#L490-L566)). **Run:** `1000000 unread messages` on a French page |
| react-intl | ICU inside one message: `{count, plural, one {…} many {…} other {…}}` | `=N` first, then `Intl.PluralRules`, then `other` ([`formatters.ts` L298–324](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/packages/intl-messageformat/formatters.ts#L298-L324)) | `other`. **Run:** `1 000 000 messages non lus` |
| Lingui | ICU, written in code with `<Plural value one other />` or `plural()` ([`macro.mdx` L165–200, L760–800](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/ref/macro.mdx#L760-L800)); translators add Arabic and French forms in the `.po` file | exact value, then `Intl.PluralRules`, then `other` ([`core/src/formats.ts` L128–147](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/core/src/formats.ts#L128-L147)) | `other`. **Run:** `1 000 000 messages non lus` |
| Typed dictionary | an object per message, e.g. `{ one, many, other }`, typed with `Intl.LDMLPluralRule` | our code calls `Intl.PluralRules` | whatever our code does; the types can make the form required (section 3) |

All four printed the right Arabic form for 0, 1, 2, 3, 11 and 100 in Node, and the French `many`
text for 1,000,000 when it was present. One difference in the output: react-intl's and Lingui's `#`
formats the number with `Intl.NumberFormat` (`1 000 000`), while i18next's `{{count}}` inserted
`1000000` as it is. i18next has a `number` formatter, `{{count, number}}`, built on
`Intl.NumberFormat` ([`Formatter.js` L86–88](https://github.com/i18next/i18next/blob/v26.4.4/src/Formatter.js#L86-L88));
not run.

Rules in: all four for Arabic's six forms. Rules out: relying on i18next to fall back to `other` in
the same language; it falls back to the next language.

## 3. A missing key failing `tsc -b`

Two different checks matter: **(a)** a key used in code exists in the base language, and **(b)**
every language has every key. All results below are from `tsc -b` runs unless marked.

### i18next

- **(a) yes.** `CustomTypeOptions.resources` is declared with the English object
  ([`typescript/options.d.ts` L3–28](https://github.com/i18next/i18next/blob/v26.4.4/typescript/options.d.ts#L3-L28)).
  The docs import resources *"for the default language, only"*
  ([TypeScript docs L46](https://github.com/i18next/i18next-gitbook/blob/ea65e2028dc163c08cbf0c1660c8c96d35a9d5cf/overview/typescript.md#L46)).
  **Run:** `t('inbox.nope')` failed with TS2345. `t('inbox.unread', { count })` passed: the types
  strip the plural suffixes ([`typescript/t.d.ts` L50–56](https://github.com/i18next/i18next/blob/v26.4.4/typescript/t.d.ts#L50-L56)).
- **(b) no, by default.** **Run:** deleting `title` from the French file still passed.
- **A plain `satisfies typeof en` does not fit.** **Run:** a correct French file failed it with
  TS2353, because French has `unread_many` and English does not. Arabic has four more suffixes, so
  it fails for the same reason (not run for Arabic).
- **What did work. Run:** a mapped type that drops the `_zero` … `_other` suffix from each key
  before comparing passed the full Arabic file and failed a French file missing `title`. It does
  not check that each language has its own plural forms.
- **Separate CI step:** `i18next-cli status` *"Exits with a non-zero status code when translations
  are missing"* ([README L274–278](https://github.com/i18next/i18next-cli/blob/v1.75.2/README.md#L274-L278)).
  Read, not run.

### react-intl

- **(a) yes, when opted in.** Declaring `FormatjsIntl.Message { ids: keyof typeof en }`
  ([`react-intl.mdx` L264–286](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/react-intl.mdx#L264-L286))
  makes an unknown id fail. **Run:** `<FormattedMessage id="inbox.nope" />` failed with TS2769.
- **(b) partly built in.** Once ids are declared, `IntlProvider`'s `messages` prop is typed
  `Record<MessageIds, string> | Record<MessageIds, MessageFormatElement[]>`
  ([`intl/types.ts` L68–72, L97–104](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/packages/intl/types.ts#L97-L104)).
  **Run:** passing a French object that lacks an id **failed** `tsc -b`; passing the same object
  typed as `Record<string, string>` **passed**. So it depends on how the catalogue reaches the
  provider.
- **`satisfies` works.** The catalogue is flat and the plural forms live inside the message text, so
  every language has the same keys. **Run:** `fr satisfies Record<keyof typeof en, string>` failed
  with TS1360 when a key was missing.
- **Not checked by `tsc -b`:** the ICU text. **Run:** `<FormattedMessage id="inbox.unread" />` with
  no `count` passed. React Intl 12 can type message arguments through
  `FormatjsIntl.MessageArguments`
  ([`api.mdx` L653–701](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/react-intl/api.mdx#L653-L701));
  not run.
- **Separate CI step.** `formatjs verify --source-locale en --missing-keys` and
  `--structural-equality` ([`cli.mdx` L451–493](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/tooling/cli.mdx#L451-L493)).
  **Run:** exit 1 for a French file missing `inbox.title`; exit 1 for an Arabic message whose
  `{name}` was renamed.

### Lingui

- **(a) not by default.** Messages are written as source text in code and get generated ids; the
  type checker sees no catalogue. Typed ids are opt-in by augmenting `Register.messageIds`, usually
  from the English JSON catalogue, which checks ids against that one catalogue
  ([`typed-message-ids.md` L8–26](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/guides/typed-message-ids.md#L8-L26)).
  The default `.po` format cannot be imported as a type; the docs mention a generated `.d.ts`
  ([L50](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/guides/typed-message-ids.md#L50)).
  Not run.
- **(b) a build or CLI step, never `tsc -b`.** **Run**, with one French text left empty:
  - Vite plugin `failOnMissing: true` (or `"catalog"`) made `vite build` fail with *"Missing 1
    translation(s)"* ([`index.ts` L172–198](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/vite-plugin/src/index.ts#L172-L198));
    `tsc -b` before it passed;
  - `lingui compile --strict`, `lingui check missing` and `lingui check missing --mode catalog` each
    exited 1 ([`ref/cli.md` L201–205, L266–303](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/ref/cli.md#L266-L303)).
  - `lingui check sync` fails when catalogues are out of date with the code (same page); not run.

### Typed dictionary

- **(a) and (b) yes.** **Run:** each language file ends with `satisfies Catalogue<'fr'>` (and so
  on). A French file missing `sentYou` failed with TS1360. With the plural type written per
  language (`ar: 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'`), an Arabic message missing
  `few` failed with TS2741.
- **Not checked:** placeholder names inside a string. **Run:** French `{nom}` instead of `{name}`
  passed.

### Plural completeness, for every option

**Run:** an Arabic plural with only `one` and `other` passed `lingui check missing` (exit 0),
`lingui compile --strict` (exit 0) and `formatjs verify --missing-keys --structural-equality` (exit
0). Only the typed dictionary's per-language plural type caught a missing Arabic form.
`i18next-cli status` was not run on this case.

Rules in: the typed dictionary and react-intl for checks (a) and (b) inside `tsc -b`. Rules out:
i18next and Lingui for check (b) inside `tsc -b` without extra code; both have a CLI or build check.

## 4. Switching language and `<html lang dir>` without a reload

The subject's RTL module asks for *"Seamless switching between LTR and RTL"*
(`document/en.subject.md:572`). Every option switches without a reload:

- **i18next.** `i18n.changeLanguage(lng)` loads what is missing, then emits `languageChanged`
  ([`i18next.js` L340–404](https://github.com/i18next/i18next/blob/v26.4.4/src/i18next.js#L340-L404)).
  `react-i18next` re-renders on that event by default, `bindI18n: 'languageChanged'`
  ([`defaults.js` L3–15](https://github.com/i18next/react-i18next/blob/v17.0.16/src/defaults.js#L3-L15)).
  **Direction:** `i18n.dir(lng)` returns `'rtl'` or `'ltr'`. It uses `Intl.Locale`'s
  `getTextInfo()` when the browser has it, else a built-in list that includes `ar`
  ([`i18next.js` L568–651](https://github.com/i18next/i18next/blob/v26.4.4/src/i18next.js#L568-L651)).
  **Run:** `dir('ar')` gave `rtl`, `dir('fr')` gave `ltr`. It does **not** write to `<html>`; our
  code does.
- **react-intl.** Pass new `locale` and `messages` props to `IntlProvider`. It builds a new `intl`
  object when its config changes
  ([`provider.tsx` L58–60](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/packages/react-intl/components/provider.tsx#L58-L60)).
  No direction helper: `react-intl` and `@formatjs/intl` contain no `rtl` (searched).
- **Lingui.** `i18n.loadAndActivate({ locale, messages })` or `i18n.activate()` emit `change`
  ([`core/src/i18n.ts` L190–209](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/core/src/i18n.ts#L190-L209));
  `I18nProvider` listens with `useSyncExternalStore`
  ([`I18nProvider.tsx` L60–113](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/react/src/I18nProvider.tsx#L60-L113)).
  No direction helper (searched).
- **Typed dictionary.** React state or context, written by us. Direction comes from our own map or
  from `new Intl.Locale(lang).getTextInfo().direction` (section 12).

In all four experiments the switch function set `document.documentElement.lang` and `.dir` by hand.

Rules in: all four. Rules out: expecting any library to set `<html dir>` by itself.

## 5. A clean browser console

The subject: *"No warnings or errors should appear in the browser console"*
(`document/en.subject.md:318`). What each option logs, read in the source and run in Node (not
observed in a browser):

### i18next 26.4.4 and react-i18next 17.0.16

- **Default: nothing.** The logger sends `log` and `warn` only when `debug: true`; `error` always
  goes out ([`logger.js` L36–61](https://github.com/i18next/i18next/blob/v26.4.4/src/logger.js#L36-L61)).
  `debug` defaults to `false`
  ([configuration options L15](https://github.com/i18next/i18next-gitbook/blob/ea65e2028dc163c08cbf0c1660c8c96d35a9d5cf/overview/configuration-options.md#L15)).
  The only `error` call in `src/` is *"No Intl support, please use an Intl polyfill!"*
  ([`PluralResolver.js` L47–53](https://github.com/i18next/i18next/blob/v26.4.4/src/PluralResolver.js#L47-L53)).
  Missing keys are logged at `log`/`warn` level, so only in debug mode.
- **react-i18next** sends its warnings through i18next's logger as debug-only
  ([`utils.js` L2–20](https://github.com/i18next/react-i18next/blob/v17.0.16/src/utils.js#L2-L20)).
  It calls `console.warn` directly only when no i18next instance is found
  ([`useTranslation.js` L39–43](https://github.com/i18next/react-i18next/blob/v17.0.16/src/useTranslation.js#L39-L43)).
- **The support notice is gone.** i18next 25.8.0 (2026-01-20) added a `console.info` support notice
  on init, turned off with `showSupportNotice: false`
  ([`CHANGELOG.md` L267–270](https://github.com/i18next/i18next/blob/v26.4.4/CHANGELOG.md#L267-L270));
  25.10.10 hid it when `NODE_ENV=production`
  ([L139–141](https://github.com/i18next/i18next/blob/v26.4.4/CHANGELOG.md#L139-L141)); 26.0.0
  (2026-03-28) removed it and the option
  ([L110–118](https://github.com/i18next/i18next/blob/v26.4.4/CHANGELOG.md#L110-L118)). No notice
  code is left in v26.4.4's `src/` (searched). Versions 25.8.0 to 25.10.x print it in development.
- **Run:** zero console calls in development and in production mode, including a missing key and
  `<Trans>` inside `I18nextProvider`.

### react-intl 12.1.4

- **Development: `console.error` for a missing message.** The default `onError` calls
  `console.error`, and `onWarn` calls `console.warn`, only when `process.env.NODE_ENV !==
  'production'` ([`intl/utils.ts` L44–80](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/packages/intl/utils.ts#L44-L80)).
  A message missing for a locale other than `defaultLocale` raises `MISSING_TRANSLATION` **even when
  a `defaultMessage` is shown**
  ([`intl/message.ts` L177–214](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/packages/intl/message.ts#L177-L214)).
  A locale without `Intl` data raises `MissingDataError`
  ([`create-intl.ts` L68–98](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/packages/intl/create-intl.ts#L68-L98)).
- **Production: nothing.** **Run:** two `console.error` calls in development, none in production
  mode. The built bundle had the same `console.*` calls as the baseline app (11 `error`, 2 `warn`,
  all from React and TanStack Router), so Vite removed the default handlers' calls.
- **Redirect:** pass `onError` and `onWarn` to `IntlProvider`. **Run:** a custom `onError` received
  `MISSING_TRANSLATION` and nothing reached the console.

### Lingui 6.9.1

- **Production: `console.warn` for an id that is not in the loaded catalogue.** In production there
  is no runtime message compiler (it is set only in development,
  [`core/src/i18n.ts` L112–114](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/core/src/i18n.ts#L109-L121)),
  so a missing id falls through to *"Uncompiled message detected!"*
  ([L242–276](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/core/src/i18n.ts#L242-L276)).
  **Run:** two warnings in production mode, none in development; the string is in the built
  bundle. This happens when code has a message that was not extracted into the catalogue.
- **Silence it:** `setupI18n({ missing })` returns that text instead and skips the warning
  ([L249–252](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/core/src/i18n.ts#L249-L252)).
  **Run:** `[fr:newMessageId]`, no console call. `lingui check sync` in CI is the documented check
  for stale catalogues (section 3).
- **Development only:** `activate()` on a locale whose messages are not loaded warns
  ([L199–204](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/core/src/i18n.ts#L199-L204));
  `I18nProvider` logs with `console.log` when no locale is active, only if `NODE_ENV ===
  "development"` ([`I18nProvider.tsx` L115–121](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/react/src/I18nProvider.tsx#L115-L121)).
- **Always, on misuse of `<Trans>`:** `console.error` for both `render` and `component`, a bad
  `component`, or an element index the translation does not declare
  ([`TransNoContext.tsx` L81–98](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/react/src/TransNoContext.tsx#L81-L98),
  [`format.tsx` L52–72](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/react/src/format.tsx#L52-L72)).
  These are in the production bundle (grep).
- **Terminal, not browser:** `linguiTransformerBabelPreset()` prints a notice at build time unless
  `LINGUI_SUPPRESS_BABEL_WARNING=1`
  ([`linguiTransformerPreset.ts` L48–55](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/vite-plugin/src/linguiTransformerPreset.ts#L48-L55)).

### Typed dictionary

Logs only what our code logs.

### React's own development warnings

**Run** in Node with `react-dom/server` in development mode: no React warning from `<Trans>`
(react-i18next), `<FormattedMessage>` with an element value, or Lingui's `<Trans>`. This does not
cover a client render with effects in a browser.

Rules in: i18next 26 and the typed dictionary as silent by default; react-intl as silent in
production. Rules out: Lingui in production without a `missing` handler or a catalogue that always
matches the code; i18next 25.8 to 25.10.x without `showSupportNotice: false`.

## 6. Loading one language at a time, and bundle size

### Loading

Each experiment kept English in the main chunk (Lingui: its own chunk) and loaded French or Arabic
with a dynamic `import()` when chosen. `vite build` made one chunk per language for every option
(0.2–0.6 kB each).

- **i18next:** `import()` then `i18n.addResourceBundle(lng, 'translation', …)` before
  `changeLanguage` (run). Backend plugins can do the same; not run.
- **react-intl:** `messages` is a prop; `import()` and pass the result (run).
- **Lingui:** `` import(`./locales/${locale}/messages.po`) `` then `i18n.loadAndActivate`; the Vite
  plugin compiles the `.po` file on import
  ([`ref/vite-plugin.md` L40–60](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/ref/vite-plugin.md#L40-L60);
  run).
- **Typed dictionary:** `import('./fr')` (run).

### Size

Measured, not quoted: `vite build` output for the main chunk, minified, and gzip as Vite reports it.
The "added" columns are the growth over the baseline app (same React, router and component, English
text written inline), so they include each option's English catalogue and glue code.

| App | Main chunk | gzip | Added | Added gzip |
| --- | --- | --- | --- | --- |
| Baseline, no translation | 294.76 kB | 95.09 kB | – | – |
| Typed dictionary | 297.04 kB | 96.03 kB | +2.28 kB | +0.94 kB |
| Lingui 6.9.1 (`@lingui/core` + `@lingui/react`) | 304.42 kB | 98.93 kB | +9.66 kB | +3.84 kB |
| react-intl 12.1.4, precompiled AST, parser removed, `@formatjs/unplugin` | 319.73 kB | 102.46 kB | +24.97 kB | +7.37 kB |
| react-intl 12.1.4, string messages | 345.73 kB | 109.71 kB | +50.97 kB | +14.62 kB |
| i18next 26.4.4 + react-i18next 17.0.16 | 355.69 kB | 115.02 kB | +60.93 kB | +19.93 kB |
| … plus `i18next-browser-languagedetector` 8.2.1 | 362.55 kB | 117.05 kB | +67.79 kB | +21.96 kB |

The smaller react-intl row needs every message compiled to AST with `formatjs compile --ast` and
Vite's `resolve.alias` from `@formatjs/icu-messageformat-parser` to its `no-parser.js` entry
([`advanced-usage.mdx` L21](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/guides/advanced-usage.mdx#L21),
[`performance.mdx` L39](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/guides/performance.mdx#L39)).
Any message left as a string then throws at run time, by design. Lingui ships no parser in
production because its catalogues are compiled when Vite imports them.

Rules in: all four for one language at a time. Size orders them dictionary < Lingui < react-intl
< i18next.

## 7. A React element inside a translated sentence

Target: "{name} sent you a message", with the name rendered as `<PersonName name=… />`
(a `<bdi>`).
**Run** for each: the Arabic sentence rendered `أرسل لك <bdi>Ahmad</bdi> رسالة`, with the element in
the place the translation chose.

- **i18next:** `<Trans i18nKey="inbox.sentYou" components={{ name: <PersonName name={n} /> }} />`
  with the text `<name/> sent you a message`. Named components are documented
  ([Trans docs L54, L134–149](https://github.com/i18next/react-i18next-gitbook/blob/0c8bde5e765949e45e2ae6a9af27dcffd1c57eda/latest/trans-component.md#L134-L149));
  names of self-closing HTML tags such as `img` are reserved.
- **react-intl:** `<FormattedMessage id="inbox.sentYou" values={{ name: <PersonName name={n} /> }} />`
  with the text `{name} sent you a message`. Tags like `<b>…</b>` take a function instead
  ([`components.mdx` L580, L679](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/react-intl/components.mdx#L679)).
- **Lingui:** in code, `<Trans><PersonName name={n} /> sent you a message</Trans>`; the catalogue
  holds `<0/> sent you a message`. Names instead of numbers need `macro.jsxPlaceholderAttribute` or
  `jsxPlaceholderDefaults`
  ([`macro.mdx` L742–753](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/ref/macro.mdx#L742-L753)).
- **Typed dictionary:** our helper splits the text on `{name}` and puts the element in its place
  (the sketch in section 12).

Rules in: all four.

## 8. CSP and same-origin loading

Production CSP: `script-src 'self'` with no `'unsafe-eval'`, and `connect-src 'self'`
(`docs/spec.md` §3.10).

- **No `eval` or `new Function` anywhere.** Searched in the runtime source: `i18next/src`,
  `react-i18next/src`, `@formatjs/intl`, `intl-messageformat`, `icu-messageformat-parser`,
  `react-intl`, `@lingui/core`, `@lingui/react`, `@lingui/message-utils`: none. **Run:** none in
  any built bundle of the six apps.
- **Runtime parsing is not code generation.** react-intl parses ICU strings at run time with a
  parser unless messages are precompiled; Lingui's development build compiles messages at run time
  ([`i18n.ts` L112–114](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/core/src/i18n.ts#L109-L121));
  both build data structures, not functions. The CSP is not set in the dev overlay anyway
  (`docs/spec.md` §3.10).
- **Same origin.** In all four, catalogues became Vite chunks under `/assets/`, fetched by
  `import()` from the same origin. None needs a hosted service. Optional hosted pieces exist and are
  not needed: the i18next docs point to Locize, a hosted translation service
  ([fallback docs L224](https://github.com/i18next/i18next-gitbook/blob/ea65e2028dc163c08cbf0c1660c8c96d35a9d5cf/principles/fallback.md#L224));
  Lingui has `@lingui/remote-loader` for remote catalogues.

Rules in: all four. Rules out: wiring any hosted translation service or backend to another origin.

## 9. Detection and the `localStorage` preference

The rule to fit: the choice is kept in `localStorage`; a first visit uses the browser's language
when it is `en`, `fr` or `ar`, else English. Not designed here.

- **i18next + `i18next-browser-languagedetector` 8.2.1.** Default order `querystring`, `cookie`,
  `localStorage`, `sessionStorage`, `navigator`, `htmlTag`; default `caches: ['localStorage']` under
  the key `i18nextLng` ([`index.js` L20–36](https://github.com/i18next/i18next-browser-languagedetector/blob/v8.2.1/src/index.js#L20-L36)).
  `navigator` returns the **whole** `navigator.languages` list
  ([`navigator.js` L4–24](https://github.com/i18next/i18next-browser-languagedetector/blob/v8.2.1/src/browserLookups/navigator.js#L4-L24)),
  and i18next picks the first supported entry, then tries the language part (`fr-CA` → `fr`), then
  `fallbackLng` ([`LanguageUtils.js` L67–112](https://github.com/i18next/i18next/blob/v26.4.4/src/LanguageUtils.js#L67-L112)).
  So a browser set to German then French gets French. With the default `caches`, the detected
  language is written to `localStorage` on every language change, including the first detection
  ([`i18next.js` L383](https://github.com/i18next/i18next/blob/v26.4.4/src/i18next.js#L383)),
  not only on a user's choice; `caches: []` turns that off. Read, not run in a browser; the
  detector adds 6.86 kB (2.03 kB gzip, measured).
- **react-intl:** no detector. Our code reads `localStorage` and `navigator`.
- **Lingui + `@lingui/detect-locale` 6.9.1:** `detect(fromStorage(key), fromNavigator(), fallback)`
  returns the first non-empty result
  ([`index.ts` L12–20](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/detect-locale/src/index.ts#L12-L20));
  `fromNavigator()` returns `navigator.language` only
  ([`fromNavigator.ts` L7–12](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/detect-locale/src/detectors/fromNavigator.ts#L7-L12)).
  It does not check the result against the supported list, so `de-DE` or `fr-CA` comes back as it
  is and our code maps it.
- **Typed dictionary:** our code, as for react-intl.

Rules in: all four; the rule is a few lines with any of them. Rules out: the i18next detector's
defaults as they are, if only an explicit choice may be stored.

## 10. Fallback to English when a key is missing at run time

**Run** in Node, French page, `title` missing from French:

- **i18next:** `fallbackLng: 'en'` gave `Inbox`. A key missing in every language shows the key
  (`inbox.nope`). The fallback works per key and per plural form (section 2).
- **react-intl:** no fallback language. Without a `defaultMessage` it showed the id
  (`"inbox.title"`); with `defaultMessage: 'Inbox'` it showed `Inbox`
  ([`message.ts` L177–214](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/packages/intl/message.ts#L177-L214)).
  Passing `{ ...en, ...fr }` as `messages` gave `Inbox` and raised no error.
- **Lingui:** the Vite plugin filled the empty French text with the English source when it compiled
  the catalogue (the French chunk held `"Gp4Yi6":["Inbox"]`). `fallbackLocales` sets the order;
  by default it follows CLDR parent locales
  ([`ref/conf.md` L167–176](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/ref/conf.md#L167-L176)).
  An id missing from the compiled catalogue shows the id, and warns in production (section 5).
- **Typed dictionary:** `fr[key] ?? en[key]`, or nothing at all when `satisfies` already forces
  every key.

Rules in: all four. react-intl needs `defaultMessage` or merged catalogues for English to appear.

## 11. Maintenance

From the npm registry on 2026-10-12.

| Package | Latest | Released | Licence | React stated | Majors since 2025 | Releases, 2025-10-12 to 2026-10-12 |
| --- | --- | --- | --- | --- | --- | --- |
| `i18next` | 26.4.4 | 2026-10-12 | MIT | – | 25.0.0 (2025-04-15), 26.0.0 (2026-03-28) | 66 |
| `react-i18next` | 17.0.16 | 2026-10-06 | MIT | peer `>= 16.8.0`; React 19 fixes in the changelog, e.g. 16.3.4 ([`CHANGELOG.md` L162–164](https://github.com/i18next/react-i18next/blob/v17.0.16/CHANGELOG.md#L162-L164)) | 16.0.0 (2025-09-26), 17.0.0 (2026-03-27) | 54 |
| `react-intl` | 12.1.4 | 2026-10-05 | BSD-3-Clause | peer `>=18.0.0`; v8 required React 19, 10.1.14 allowed 18 again ([`upgrade-guide-8.x.mdx` L3–11](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/react-intl/upgrade-guide-8.x.mdx#L3-L11)) | 8 (2025-12-15), 9 and 10 (2026-03-16), 11 and 12 (2026-09-15) | 57 |
| `@lingui/core`, `@lingui/react` | 6.9.1 | 2026-10-09 | MIT | peer up to `^19.0.0`; React 19 support since 5.1.0, 2024-12-06 ([`CHANGELOG.md` L329–333](https://github.com/lingui/js-lingui/blob/v6.9.1/CHANGELOG.md#L329-L333)) | 6.0.0 (2026-04-22) | 23 |
| Typed dictionary | – | – | ours | – | – | – |

Other facts:

- `@formatjs/intl` and `@formatjs/icu-messageformat-parser` are MIT; `intl-messageformat` is
  BSD-3-Clause. *"React Intl 11 was an unstable transition release"*
  ([`upgrade-guide-12.x.mdx` L3](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/react-intl/upgrade-guide-12.x.mdx#L1-L5)).
- `formatjs compile` runs only through native bindings, with *"no JavaScript compiler fallback"*
  ([`cli.mdx` L45–67](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/tooling/cli.mdx#L45-L67)).
  `@formatjs/cli` 6.16.34 ships bindings for Linux x64 and arm64 (glibc and musl), macOS arm64 and
  Windows x64; there is none for macOS on Intel (npm `optionalDependencies`).
- `@lingui/*` 6.9.1 need Node `>=22.19.0`. The SPA is built on `node:22-alpine`
  (`proxy/Dockerfile:1`). `@lingui/cli` pulls `pseudolocale` 3.1.0, which declares Node `>=24`;
  **run:** npm printed `EBADENGINE` on Node 22.22.1 and installed anyway.
- i18next's typing needs TypeScript 5, 6 or 7 (optional peer); react-intl's needs 5.4 or newer.

## 12. The typed dictionary over `Intl`

### What browsers give for free

From MDN's browser-compat-data v8.1.5, first version with support:

| API | Chrome | Firefox | Safari |
| --- | --- | --- | --- |
| [`Intl.PluralRules`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/javascript/builtins/Intl/PluralRules.json), `select()` | 63 | 58 | 13 |
| `PluralRules.selectRange()` | 106 | 116 | 15.4 |
| [`Intl.NumberFormat`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/javascript/builtins/Intl/NumberFormat.json) / `formatToParts()` | 24 / 64 | 29 / 58 | 10 / 13 |
| [`Intl.DateTimeFormat`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/javascript/builtins/Intl/DateTimeFormat.json) / `formatToParts()` | 24 / 57 | 29 / 51 | 10 / 11 |
| [`Intl.ListFormat`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/javascript/builtins/Intl/ListFormat.json) | 72 | 78 | 14.1 |
| [`Intl.RelativeTimeFormat`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/javascript/builtins/Intl/RelativeTimeFormat.json) | 71 | 65 | 14 |
| [`Intl.Locale`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/javascript/builtins/Intl/Locale.json) / `getTextInfo()` | 74 / 130 | 75 / 153 | 14 / 17 |

So current Chrome, Firefox and Safari all have plural rules, number, date, list and relative-time
formatting, and a way to read a language's direction (`getTextInfo().direction`).

### What TypeScript 5.9's `lib: ["ES2022", "DOM", "DOM.Iterable"]` types

`ES2022` pulls in `es2017.intl` to `es2022.intl`
([`lib.es2022.d.ts` references](https://github.com/microsoft/TypeScript/blob/v5.9.3/src/lib/es2022.d.ts)). It types:

- `Intl.LDMLPluralRule` = `"zero" | "one" | "two" | "few" | "many" | "other"`, and
  `PluralRules.select(n): LDMLPluralRule`
  ([`es2018.intl.d.ts` L3, L27–30](https://github.com/microsoft/TypeScript/blob/v5.9.3/src/lib/es2018.intl.d.ts#L1-L30));
- `RelativeTimeFormat` and `Locale`
  ([`es2020.intl.d.ts` L128, L307](https://github.com/microsoft/TypeScript/blob/v5.9.3/src/lib/es2020.intl.d.ts#L128));
- `ListFormat` and `DateTimeFormat.formatRange`
  ([`es2021.intl.d.ts` L18, L73](https://github.com/microsoft/TypeScript/blob/v5.9.3/src/lib/es2021.intl.d.ts#L73));
- `Segmenter` ([`es2022.intl.d.ts` L19](https://github.com/microsoft/TypeScript/blob/v5.9.3/src/lib/es2022.intl.d.ts#L19)).

Not typed with this `lib`: `NumberFormat.formatRange` and newer `NumberFormat` options (they are in
`es2023.intl`); `PluralRules.selectRange` and `Intl.Locale.getTextInfo` appear in no 5.9.3 lib file
(searched); `esnext.intl` is empty in 5.9.3. Using `getTextInfo()` would need our own declaration.
**Run:** `Intl.LDMLPluralRule` and `Intl.PluralRules` type-checked in the dictionary app.

### What we would write ourselves

From the experiment (about 45 lines with the provider):

- plural selection: `Intl.PluralRules(lang).select(n)`, pick the form, format the number;
- placeholders: split the text on `{name}` and put strings or React elements in place;
- a context holding the language and its catalogue, the `import()` per language, and
  `<html lang dir>`;
- the catalogue types, including which plural forms each language must have.

Not provided: ICU `select` (e.g. by gender), nested plurals, escaping rules, a message extractor,
and any file format a translation tool reads; translators edit TypeScript files.

An illustration of the mechanism only, not a recommendation:

```tsx
interface PluralCategories {
  en: 'one' | 'other';
  fr: 'one' | 'many' | 'other';
  ar: 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
}
type Language = keyof PluralCategories;
type Plural<L extends Language> = L extends Language ? Record<PluralCategories[L], string> : never;
interface Catalogue<L extends Language> { inboxTitle: string; unread: Plural<L>; sentYou: string }

// fr.ts: a missing key or a missing plural form fails `tsc -b`.
export default {
  inboxTitle: 'Boîte de réception',
  unread: {
    one: '{count} message non lu',
    many: '{count} de messages non lus',
    other: '{count} messages non lus',
  },
  sentYou: '{name} vous a envoyé un message',
} satisfies Catalogue<'fr'>;

function plural(lang: Language, forms: Plural<Language>, count: number): string {
  const table = forms as Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
  const text = table[new Intl.PluralRules(lang).select(count)] ?? table.other;
  return text.replace('{count}', new Intl.NumberFormat(lang).format(count));
}

function fill(text: string, values: Record<string, ReactNode>): ReactNode {
  return text.split(/\{(\w+)\}/).map((part, i) => (
    <Fragment key={i}>{i % 2 === 1 ? values[part] : part}</Fragment>
  ));
}
// fill(m.sentYou, { name: <PersonName name={n} /> })
```

## Comparison

| | i18next + react-i18next | react-intl | Lingui | Typed dictionary |
| --- | --- | --- | --- | --- |
| Vite 8 + `plugin-react` 6 | nothing needed | nothing with explicit ids; `@formatjs/unplugin` works (run) | needs `macroTransform: true` (run), Babel or SWC | nothing needed |
| React 19 | peer `>=16.8` | peer `>=18` | peer up to `^19` | – |
| Arabic six forms | yes, one key per form | yes, ICU | yes, ICU | yes, our code |
| French `many` missing | **shows English** | uses `other` | uses `other` | our code; type can require it |
| (a) unknown key fails `tsc -b` | yes | yes, opt-in | no; opt-in typed ids | yes |
| (b) language missing a key fails `tsc -b` | no; mapped type needed | yes with `satisfies`, or via typed `IntlProvider` | no; `failOnMissing`, `compile --strict`, `check missing` | yes, and per plural form |
| CI check for (b) | `i18next-cli status` (read) | `formatjs verify` (run) | `lingui check missing` (run) | `tsc -b` |
| Switch without reload | `changeLanguage` | new props | `loadAndActivate` | our state |
| `dir` from the library | `i18n.dir()` | no | no | no |
| Console, development | silent unless `debug: true` | `console.error` on missing message | silent (logs only on misuse) | ours |
| Console, production | silent | silent | **`console.warn` on an id missing from the catalogue** | ours |
| Added size (gzip, measured) | 19.93 kB | 14.62 kB; 7.37 kB precompiled | 3.84 kB | 0.94 kB |
| One language at a time | yes | yes | yes | yes |
| Element in a sentence | `<Trans components>` | `values` | `<Trans>` children | our `fill` |
| `eval` / `new Function` | none | none | none | none |
| Detection helper | detector plugin (whole `navigator.languages`) | none | `@lingui/detect-locale` (`navigator.language`) | ours |
| Fallback to English | per key, `fallbackLng` | `defaultMessage` or merged catalogue | at compile time from the source | ours |
| Latest, licence | 26.4.4 / 17.0.16, MIT | 12.1.4, BSD-3-Clause | 6.9.1, MIT | – |

## What this leaves open

- **Nothing was observed in a browser.** Console claims come from the source and from Node with
  `react-dom/server`; a client render (effects, `useSyncExternalStore`, Suspense) was not checked.
  The browser pass in the spec (§16.7) would confirm.
- Lingui's macros through `@rolldown/plugin-babel`, Lingui through `@vitejs/plugin-react-swc` with
  `@lingui/swc-plugin`, and `babel-plugin-formatjs` through `@rolldown/plugin-babel` were not run.
- Whether `@lingui/native-tools` 0.1.6 loads on `node:22-alpine` (musl) inside the project's Docker
  build. The musl binary exists on npm; it was run only on glibc Linux.
- `i18next-cli status` was not run; whether it reports a missing plural form for one language (e.g.
  `_many` in French only) is not confirmed.
- Lingui's typed message ids (`Register.messageIds`) and react-intl 12's
  `FormatjsIntl.MessageArguments` were read, not run.
- Whether `i18n.dir()` gets `getTextInfo()` from the browser or uses its list was not checked in a
  browser; both give `rtl` for `ar`.
- Sizes are for these small apps. Each catalogue grows with the text, and the gzip numbers are
  Vite's own report of the main chunk, not a separate measure of each library.

## How the experiments were run

In separate folders under a scratch directory, one per option, each with the SPA's `tsconfig`
settings and exact versions (`react` 19.3.0, `vite` 8.3.1, `@vitejs/plugin-react` 6.1.1,
`@tanstack/react-router` 1.170.41, `typescript` 5.9.3). Node 22.22.1, npm 9.2.0.

- `npm install`, then `npm run build` (`tsc -b && vite build`) per app: baseline, i18next,
  react-intl, react-intl with precompiled AST and `@formatjs/unplugin`, Lingui, typed dictionary.
- Type checks: a key or file edited, `npx tsc -b`, the edit undone.
- `grep` of `dist/assets/*.js` for `new Function`, `eval(` and `console.*`.
- `npx formatjs verify --source-locale en --missing-keys [--structural-equality] lang/*.json`;
  `npx formatjs compile lang/<l>.json --ast --format simple --out-file compiled/<l>.json`.
- `npx lingui extract`; `npx lingui check missing [--mode catalog]`; `npx lingui compile --strict`;
  `vite build` with `failOnMissing: true` and `"catalog"`; `vite` dev with the modules fetched over
  HTTP.
- Node scripts that imported each library from its app folder and rendered with `react-dom/server`,
  once with `NODE_ENV` unset and once with `NODE_ENV=production`, counting every `console.*` call.

## Primary sources

i18next v26.4.4:
[`src/logger.js`](https://github.com/i18next/i18next/blob/v26.4.4/src/logger.js) ·
[`src/PluralResolver.js`](https://github.com/i18next/i18next/blob/v26.4.4/src/PluralResolver.js) ·
[`src/Translator.js`](https://github.com/i18next/i18next/blob/v26.4.4/src/Translator.js) ·
[`src/i18next.js`](https://github.com/i18next/i18next/blob/v26.4.4/src/i18next.js) ·
[`src/LanguageUtils.js`](https://github.com/i18next/i18next/blob/v26.4.4/src/LanguageUtils.js) ·
[`src/Formatter.js`](https://github.com/i18next/i18next/blob/v26.4.4/src/Formatter.js) ·
[`typescript/options.d.ts`](https://github.com/i18next/i18next/blob/v26.4.4/typescript/options.d.ts) ·
[`typescript/t.d.ts`](https://github.com/i18next/i18next/blob/v26.4.4/typescript/t.d.ts) ·
[`CHANGELOG.md`](https://github.com/i18next/i18next/blob/v26.4.4/CHANGELOG.md)

react-i18next v17.0.16:
[`src/utils.js`](https://github.com/i18next/react-i18next/blob/v17.0.16/src/utils.js) ·
[`src/useTranslation.js`](https://github.com/i18next/react-i18next/blob/v17.0.16/src/useTranslation.js) ·
[`src/defaults.js`](https://github.com/i18next/react-i18next/blob/v17.0.16/src/defaults.js) ·
[`src/TransWithoutContext.js`](https://github.com/i18next/react-i18next/blob/v17.0.16/src/TransWithoutContext.js) ·
[`CHANGELOG.md`](https://github.com/i18next/react-i18next/blob/v17.0.16/CHANGELOG.md)

i18next-browser-languagedetector v8.2.1:
[`src/index.js`](https://github.com/i18next/i18next-browser-languagedetector/blob/v8.2.1/src/index.js) ·
[`src/browserLookups/navigator.js`](https://github.com/i18next/i18next-browser-languagedetector/blob/v8.2.1/src/browserLookups/navigator.js) ·
[`src/browserLookups/localStorage.js`](https://github.com/i18next/i18next-browser-languagedetector/blob/v8.2.1/src/browserLookups/localStorage.js)

i18next docs (`i18next-gitbook` `ea65e20`, read 2026-10-12):
[Plurals](https://www.i18next.com/translation-function/plurals) ·
[TypeScript](https://www.i18next.com/overview/typescript) ·
[Configuration options](https://www.i18next.com/overview/configuration-options) ·
[Fallback](https://www.i18next.com/principles/fallback);
react-i18next docs (`react-i18next-gitbook` `0c8bde5`):
[Trans component](https://react.i18next.com/latest/trans-component);
[`i18next-cli` v1.75.2 README](https://github.com/i18next/i18next-cli/blob/v1.75.2/README.md)

FormatJS at `react-intl@12.1.4`:
[`packages/intl/utils.ts`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/packages/intl/utils.ts) ·
[`packages/intl/message.ts`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/packages/intl/message.ts) ·
[`packages/intl/create-intl.ts`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/packages/intl/create-intl.ts) ·
[`packages/intl/types.ts`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/packages/intl/types.ts) ·
[`packages/intl-messageformat/formatters.ts`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/packages/intl-messageformat/formatters.ts) ·
[`packages/react-intl/components/provider.tsx`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/packages/react-intl/components/provider.tsx) ·
[`packages/unplugin/README.md`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/packages/unplugin/README.md);
docs, read at the same tag and live at `formatjs.github.io/docs`:
[`react-intl.mdx`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/react-intl.mdx) ·
[`react-intl/api.mdx`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/react-intl/api.mdx) ·
[`react-intl/components.mdx`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/react-intl/components.mdx) ·
[`upgrade-guide-8.x.mdx`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/react-intl/upgrade-guide-8.x.mdx) ·
[`upgrade-guide-12.x.mdx`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/react-intl/upgrade-guide-12.x.mdx) ·
[`tooling/cli.mdx`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/tooling/cli.mdx) ·
[`tooling/unplugin.mdx`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/tooling/unplugin.mdx) ·
[`guides/bundler-plugins.mdx`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/guides/bundler-plugins.mdx) ·
[`guides/advanced-usage.mdx`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/guides/advanced-usage.mdx) ·
[`guides/performance.mdx`](https://github.com/formatjs/formatjs/blob/react-intl%4012.1.4/docs/src/docs/guides/performance.mdx)

Lingui v6.9.1:
[`packages/vite-plugin/src/index.ts`](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/vite-plugin/src/index.ts) ·
[`packages/vite-plugin/src/linguiTransformerPreset.ts`](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/vite-plugin/src/linguiTransformerPreset.ts) ·
[`packages/core/src/i18n.ts`](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/core/src/i18n.ts) ·
[`packages/core/src/formats.ts`](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/core/src/formats.ts) ·
[`packages/core/src/interpolate.ts`](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/core/src/interpolate.ts) ·
[`packages/react/src/I18nProvider.tsx`](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/react/src/I18nProvider.tsx) ·
[`packages/react/src/TransNoContext.tsx`](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/react/src/TransNoContext.tsx) ·
[`packages/react/src/format.tsx`](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/react/src/format.tsx) ·
[`packages/detect-locale/src/index.ts`](https://github.com/lingui/js-lingui/blob/v6.9.1/packages/detect-locale/src/index.ts) ·
[`CHANGELOG.md`](https://github.com/lingui/js-lingui/blob/v6.9.1/CHANGELOG.md);
docs, read at the same tag and live at `lingui.dev`:
[`installation.mdx`](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/installation.mdx) ·
[`ref/vite-plugin.md`](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/ref/vite-plugin.md) ·
[`ref/cli.md`](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/ref/cli.md) ·
[`ref/conf.md`](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/ref/conf.md) ·
[`ref/macro.mdx`](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/ref/macro.mdx) ·
[`ref/locale-detector.md`](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/ref/locale-detector.md) ·
[`guides/typed-message-ids.md`](https://github.com/lingui/js-lingui/blob/v6.9.1/website/docs/guides/typed-message-ids.md)

`@vitejs/plugin-react` 6.1.1:
[`src/index.ts`](https://github.com/vitejs/vite-plugin-react/blob/plugin-react%406.1.1/packages/plugin-react/src/index.ts) ·
[`README.md`](https://github.com/vitejs/vite-plugin-react/blob/plugin-react%406.1.1/packages/plugin-react/README.md) ·
[`CHANGELOG.md`](https://github.com/vitejs/vite-plugin-react/blob/plugin-react%406.1.1/packages/plugin-react/CHANGELOG.md)

CLDR: [`plurals.xml` release-48](https://github.com/unicode-org/cldr/blob/release-48/common/supplemental/plurals.xml) ·
[release-38](https://github.com/unicode-org/cldr/blob/release-38/common/supplemental/plurals.xml) ·
[release-37](https://github.com/unicode-org/cldr/blob/release-37/common/supplemental/plurals.xml)

TypeScript v5.9.3: [`src/lib/es2018.intl.d.ts`](https://github.com/microsoft/TypeScript/blob/v5.9.3/src/lib/es2018.intl.d.ts) ·
[`es2020.intl.d.ts`](https://github.com/microsoft/TypeScript/blob/v5.9.3/src/lib/es2020.intl.d.ts) ·
[`es2021.intl.d.ts`](https://github.com/microsoft/TypeScript/blob/v5.9.3/src/lib/es2021.intl.d.ts) ·
[`es2022.intl.d.ts`](https://github.com/microsoft/TypeScript/blob/v5.9.3/src/lib/es2022.intl.d.ts) ·
[`es2023.intl.d.ts`](https://github.com/microsoft/TypeScript/blob/v5.9.3/src/lib/es2023.intl.d.ts) ·
[`esnext.intl.d.ts`](https://github.com/microsoft/TypeScript/blob/v5.9.3/src/lib/esnext.intl.d.ts)

MDN browser-compat-data v8.1.5: [`javascript/builtins/Intl/`](https://github.com/mdn/browser-compat-data/tree/v8.1.5/javascript/builtins/Intl)

npm registry, queried 2026-10-12: `i18next`, `react-i18next`, `i18next-browser-languagedetector`,
`i18next-cli`, `react-intl`, `@formatjs/intl`, `intl-messageformat`, `@formatjs/cli`,
`@formatjs/unplugin`, `babel-plugin-formatjs`, `@formatjs/swc-plugin`, `@lingui/core`,
`@lingui/react`, `@lingui/cli`, `@lingui/vite-plugin`, `@lingui/swc-plugin`,
`@lingui/native-tools`, `@lingui/detect-locale`, `@vitejs/plugin-react`, `@rolldown/plugin-babel`.

PeerConnect: `document/en.subject.md:318`, `:572`; `docs/spec.md` §3.10; `web/package.json`;
`web/tsconfig.app.json`; `proxy/Dockerfile:1`.
