# What complete layout mirroring needs in the PeerConnect SPA

Researched and checked 2026-10-12 for
[#140](https://github.com/ahmadmnsur/ft_transcendence/issues/140). Built from:

- the SPA on `origin/main` at `0d20fcb` (2026-10-12): every file in `web/src/design/components` and
  `web/src/design/icons`, plus `web/src/layout.tsx`, `web/src/legal/markdown.tsx`,
  `web/src/index.css` and `web/src/design/tokens.css`. Versions from `web/package-lock.json`:
  Tailwind CSS 4.3.3, Vite 8.3.1 (with Lightning CSS 1.33.0), React 19.3.0,
  `@tanstack/react-table` 8.21.3;
- the library source at release tags:
  [`tailwindcss` v4.3.3](https://github.com/tailwindlabs/tailwindcss/tree/v4.3.3) (2026-07-15),
  [`vite` v8.3.1](https://github.com/vitejs/vite/tree/v8.3.1),
  [`lightningcss` v1.33.0](https://github.com/parcel-bundler/lightningcss/tree/v1.33.0),
  [`recharts` v3.10.1](https://github.com/recharts/recharts/tree/v3.10.1) (2026-07-25),
  [`@tanstack/table` v8.21.3](https://github.com/TanStack/table/tree/v8.21.3), and
  [WebKit `main` at `963125d`](https://github.com/WebKit/WebKit/tree/963125d1f1440dca433af8e41e3530abd975dd10)
  (2026-10-12) for one Safari question;
- the official docs, read at their source: the Tailwind docs
  ([`tailwindcss.com` at `7f92c22`](https://github.com/tailwindlabs/tailwindcss.com/tree/7f92c2213315c195dae583d68752da4042da3ade),
  2026-09-09), the Vite docs at `v8.3.1`, and the TanStack Table guides at `v8.21.3`;
- the specs, at fixed commits of their source repositories: CSS Logical Properties 1, CSS Writing
  Modes 4, CSS Transforms 1, CSSOM View 1, CSS Overflow 3 and Selectors 4
  ([`csswg-drafts` at `5033732`](https://github.com/w3c/csswg-drafts/tree/50337328484f7fcdd9ab6fe9ded6011815b1707e),
  2026-10-10); the HTML Standard
  ([`whatwg/html` at `86190a4`](https://github.com/whatwg/html/tree/86190a4d7c155a668ae547d2b207916ed4643084),
  2026-10-12); the SVG 2 text chapter
  ([`svgwg` at `47e645e`](https://github.com/w3c/svgwg/tree/47e645ef7cb61490e6975ddbcfa1997c9e972cc3),
  2026-10-07); the WAI-ARIA Authoring Practices
  ([`aria-practices` at `0f765e4`](https://github.com/w3c/aria-practices/tree/0f765e4dc33e966026114ac12a8380db1de3b787),
  2026-09-30);
- first-party design guidance, read 2026-10-12: Material Design 3,
  [*Bidirectionality & RTL*](https://m3.material.io/foundations/layout/understanding-layout/bidirectionality-rtl);
  Material Design 2, [*Bidirectionality*](https://m2.material.io/design/usability/bidirectionality.html)
  (the page says *"Material 2 is no longer maintained"*); Apple Human Interface Guidelines,
  [*Right to left*](https://developer.apple.com/design/human-interface-guidelines/right-to-left).
  Both Material pages need JavaScript, so they were rendered in Chrome and their text read; the
  Apple page was read from its JSON data;
- MDN's browser support data,
  [`browser-compat-data` v8.1.5](https://github.com/mdn/browser-compat-data/tree/v8.1.5);
- experiments run on 2026-10-12: a throwaway app with the SPA's locked versions (from the SPA's own
  lockfile) plus Recharts 3.10.1, on Node 22.22.1. It renders the SPA's real `design/` and `legal/`
  folders, copied unchanged from `0d20fcb`, and switches `<html dir>` at run time. It was measured
  in **Chrome 154.0.8037.97** and **Firefox 157.0**, both headless on Linux. See
  [How the experiments were run](#how-the-experiments-were-run).

**Recharts is not installed in the SPA yet.** `docs/spec.md` §3.3 says *"Recharts 3"* (ADR-0015 d7).
This file reads and runs 3.10.1, the latest 3.x on npm on 2026-10-12.

These are facts only. Each finding says what it rules in or out. **No choice for PeerConnect is made
here**; that choice belongs to [#146](https://github.com/ahmadmnsur/ft_transcendence/issues/146)
("Settle how Arabic looks: mirroring, font, digits and dates"). Fonts, digits, dates and upper-case
styles are [#141](https://github.com/ahmadmnsur/ft_transcendence/issues/141)'s question and are not
covered here. **Safari and Brave were not run** (see [section 9](#9-chrome-firefox-safari-and-brave)).
Every claim says whether it was read in source, read in a spec or the docs, or run, and in which
browser.

## Question

What does *"complete layout mirroring (not just text direction)"* (`document/en.subject.md:568`)
take in the SPA, as built and as `docs/spec.md` §3.5 specifies it? Covered: Tailwind v4's logical
utilities and its `rtl:` and `ltr:` variants, and how to catch a physical class; which icons in
`web/src/design/icons` must flip; every component in `web/src/design/components`, native form
controls and scroll bars; the Recharts chart on `/admin/analytics` (ADR-0015) and TanStack Table;
differences between Chrome, Firefox and Safari; and what changes when `<html dir>` changes at run
time (*"Seamless switching between LTR and RTL"*, `:572`).

## Short answer

Setting `dir="rtl"` on `<html>` already mirrors most of the SPA, because flex rows, tables, list
markers and most Tailwind spacing follow the direction. A switch at run time gave **exactly the same
layout as a fresh RTL load** in Chrome and Firefox, with no reload. What does not mirror falls into
four groups:

1. **15 physical classes on 12 lines** in `web/src` (`pl-6`, `text-left`, `right-px`,
   `origin-left`…), plus two pieces of JavaScript that assume left-to-right (the table's scroll
   fade and the Tabs arrow keys). Each was seen wrong in RTL.
2. **Icons:** no icon flips at `0d20fcb`. The guidance flips the Pagination chevrons and keeps
   the check mark, the search glass and the signs.
3. **The chart:** Recharts has no direction setting. Under `dir="rtl"` its Y-axis numbers are drawn
   across the axis line, and its legend icons touch their text.
4. **Tailwind's `rtl:` and `ltr:` variants** follow an ancestor's `dir` attribute, not each element's
   own direction. In the production build, Vite 8 rewrites `:dir(rtl)` into a list of `:lang(…)`
   tests, so they also follow `lang`. Flow-relative utilities (`ms-`, `ps-`, `inset-s-`,
   `text-start`) have neither problem.

Chrome and Firefox behaved the same in every measured behaviour but two: the side of an empty
`TextArea`'s Arabic placeholder, and whether a `scroll` event fires when the direction changes.
Safari and Brave were not run.

## 1. Physical classes and direction-bound code in `web/src` at `0d20fcb`

### The count

**Run** with a token scanner over `web/src` (it splits each line into tokens, strips variant prefixes
such as `focus:`, and matches every left/right utility family in Tailwind 4.3.3). On `origin/main`
at `0d20fcb` there are **15 physical utility classes on 12 lines**. Both commits of 2026-10-11
(`592bf58`, `15d3b47`) had the same 15. The ticket counted 10 on 2026-10-11. How that count was made
was not recorded, so the difference is not explained here.

| File:line | Class | What it does | What was seen in RTL (run, Chrome and Firefox) |
| --- | --- | --- | --- |
| `design/components/Checkbox.tsx:25` | `pl-6` | indents the hint under the label | hint sits under the checkbox, not under the label text |
| `design/components/DataTable.tsx:150` | `text-left` | aligns the whole table | cell text stays left while the columns mirror |
| `design/components/DataTable.tsx:164` | `text-right` | header of an `align: 'end'` column | header is on the other side from its numbers (below) |
| `design/components/DataTable.tsx:205` | `text-right` | cell of an `align: 'end'` column | numbers stay right |
| `design/components/DataTable.tsx:238` | `right-px` | places the "more columns" fade | fade stays on the right |
| `design/components/DataTable.tsx:238` | `rounded-r-lg` | rounds the fade's corners | rounding stays on the right |
| `design/components/DataTable.tsx:238` | `bg-linear-to-l` | fade gradient direction | gradient still fades toward the left |
| `design/components/ProgressBar.tsx:39` | `origin-left` | scale origin of the fill | bar fills from the left |
| `design/components/SkillChip.tsx:28` | `pl-3` | wider padding before the name | wide gap lands at the remove-button side |
| `design/components/SkillChip.tsx:28` | `pr-1` | narrow padding after the name | name touches the chip's right edge |
| `layout.tsx:46` | `focus:left-4` | places the skip link | skip link appears top-left |
| `legal/markdown.tsx:65` | `pl-6` | indents the nested list | nested items lose their indent |
| `legal/markdown.tsx:103` | `text-left` | aligns legal tables | columns mirror, text stays left |
| `legal/markdown.tsx:183` | `pl-6` | room for bullets | bullets hang outside the text column on the right |
| `legal/markdown.tsx:191` | `pl-6` | room for numbers | numbers hang outside the text column on the right |

No CSS file in `web/src` uses a physical property (`margin-left`, `left:`, `text-align`, `float`).
`web/index.html` has `<html lang="en">` and no `dir` attribute.

### Direction-bound code that is not a class

- `DataTable.tsx:128` computes `moreToRight` from `scrollLeft + clientWidth < scrollWidth`. In RTL,
  `scrollLeft` is 0 at the start and negative toward the left
  ([CSSOM View L270–272](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/cssom-view-1/Overview.bs#L270-L272)).
  **Run:** at the start (0) and at the far end (−502 px in Chrome, −552 px in Firefox), the fade
  stayed on the right in both browsers. It never hid.
- `Tabs.tsx:39–44` maps `ArrowRight` to the next tab in DOM order. **Run:** in RTL, ArrowRight moved
  focus to the tab on the **left** (Chrome and Firefox). In LTR it moved right.
- `ProgressBar.tsx:40` sets `transform: scaleX(…)` inline, with the `origin-left` class above.
- `Modal.tsx:17` is a comment that suggests `className="mr-auto"` for a destructive footer action.
  Tailwind reads source files as plain text
  ([docs L18](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/detecting-classes-in-source-files.mdx#L18)),
  and **run:** this comment alone puts `.mr-auto{margin-right:auto}` into the built CSS.
- `DataTable.tsx:23` names the option `align?: 'end'`, but the comment says it "right-aligns", and
  `:164` and `:205` implement it with `text-right`.

### Already direction-safe

`TextField.tsx:14` and `TextArea.tsx:14` set `dir="auto"`. `PersonName.tsx:11` wraps names in
`<bdi>`. Every other spacing class in `web/src` is either symmetric (`px-`, `mx-`, `inset-x-`,
`gap-`) or already logical in Tailwind 4 (next section).

Rules in: a change list of 15 classes, 2 JavaScript spots and 1 comment. Rules out: treating `dir`
on `<html>` alone as complete mirroring for the SPA as built.

## 2. Tailwind v4.3.3: logical utilities, `rtl:` and `ltr:`

### The flow-relative utilities

Read in [`utilities.ts`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/utilities.ts).
**Run:** the ones compiled with the locked Tailwind (`ms-`, `me-`, `ps-`, `pe-`, `inset-s-`,
`inset-e-`, `text-start`, `text-end`, `rounded-s-`, `rounded-e-`, `border-s`, `border-e`,
`float-start`, `scroll-ms-`) emitted the property shown.

| Physical | Flow-relative | CSS it emits | Source |
| --- | --- | --- | --- |
| `ml-*`, `mr-*` | `ms-*`, `me-*` | `margin-inline-start/end` | [L896–913](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/utilities.ts#L896-L913) |
| `pl-*`, `pr-*` | `ps-*`, `pe-*` | `padding-inline-start/end` | [L3935–3949](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/utilities.ts#L3935-L3949) |
| `left-*`, `right-*` | `inset-s-*`, `inset-e-*` | `inset-inline-start/end` | [L632–652](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/utilities.ts#L632-L652) |
| `text-left`, `text-right` | `text-start`, `text-end` | `text-align: start/end` | [L3951–3956](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/utilities.ts#L3951-L3956) |
| `rounded-l/r-*`, `rounded-tl/tr/bl/br-*` | `rounded-s/e-*`, `rounded-ss/se/es/ee-*` | `border-start-start-radius`… | [L2368–2384](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/utilities.ts#L2368-L2384) |
| `border-l/r-*` | `border-s/e-*` | `border-inline-start/end-*` | [L2529–2543](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/utilities.ts#L2529-L2543) |
| `float-left/right`, `clear-left/right` | `float-start/end`, `clear-start/end` | `float: inline-start`… | [L877–889](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/utilities.ts#L877-L889) |
| `scroll-ml/mr-*`, `scroll-pl/pr-*` | `scroll-ms/me-*`, `scroll-ps/pe-*` | `scroll-margin-inline-*`… | [L1875–1918](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/utilities.ts#L1875-L1918) |

- **`start-*` and `end-*` are deprecated.** Tailwind 4.2.0 (2026-02-18) added `inset-s-*` and
  `inset-e-*` and deprecated `start-*` and `end-*`
  ([`CHANGELOG.md` L181, L203](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/CHANGELOG.md#L168-L203));
  4.2.3 rewrites them when canonicalizing
  ([L141–142](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/CHANGELOG.md#L141-L142)). They
  still work from a compatibility file
  ([`compat/legacy-utilities.ts` L116–160](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/compat/legacy-utilities.ts#L116-L160)).
  **Run:** `start-4` and `inset-s-4` gave the same `inset-inline-start`. The ticket's `start-` and
  `end-` are therefore `inset-s-` and `inset-e-` in 4.3.3.
- **Already logical in v4:** every `x` and `y` utility (`px-`, `mx-`, `inset-x-`, `scroll-px-`) since
  4.0.0-alpha.31
  ([L1135](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/CHANGELOG.md#L1135)), plus
  `space-x-*`, which sets `margin-inline-start/end`
  ([L2132–2163](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/utilities.ts#L2132-L2163)),
  and `divide-x-*`, which sets `border-inline-*-width`
  ([L2593–2612](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/utilities.ts#L2593-L2612)).
  **Run:** `space-x-4`'s first child had `margin-right: 16px` in LTR and `margin-left: 16px` in RTL.
- **No flow-relative form exists for:** `origin-*`
  ([L1309–1323](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/utilities.ts#L1309-L1323)),
  because CSS `transform-origin` only has `left`, `center`, `right`, `top` and `bottom`
  ([CSS Transforms 1 L420–421](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-transforms-1/Overview.bs#L420-L421));
  `bg-linear-to-l/r` and the other gradient directions
  ([L2724–2733](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/utilities.ts#L2724-L2733));
  and `translate-x-*` and `scale-x-*`. These need an `rtl:` variant (below). **Run:** compiled,
  `rtl:origin-right` gave `transform-origin: 100%` and `-scale-x-100` gave `scale: -1 1`.
- **How the browser maps them.** A flow-relative property and its physical twin share one computed
  value, mapped with *"the element's own computed writing mode"*
  ([CSS Logical 1 L378–388](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-logical-1/Overview.bs#L378-L388)).
  **Run:** inside a `dir="ltr"` box on an RTL page, `ms-4` gave `margin-left: 16px`. Each element
  follows its own direction.
- **Tailwind's own docs** describe `ms-`/`me-`, `ps-`/`pe-`, `inset-s-`/`inset-e-` and
  `text-start`/`text-end` as mapping *"to either the left or right side based on the text direction"*
  ([padding L160–162](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/padding.mdx#L160-L162),
  [margin L255–257](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/margin.mdx#L255-L257),
  [top/right/bottom/left L204–206](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/top-right-bottom-left.mdx#L204-L206),
  [text-align L130–132](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/text-align.mdx#L130-L132)).

Physical class in the SPA, and the class that compiles to its flow-relative twin (**run**):
`pl-6` → `ps-6`; `pl-3 pr-1` → `ps-3 pe-1`; `text-left`/`text-right` → `text-start`/`text-end`;
`right-px` → `inset-e-px`; `focus:left-4` → `focus:inset-s-4`; `rounded-r-lg` → `rounded-e-lg`;
`bg-linear-to-l` and `origin-left` have no twin.

### The `rtl:` and `ltr:` variants

- **Source:** `rtl` is `&:where(:dir(rtl), [dir="rtl"], [dir="rtl"] *)` and `ltr` is the same with
  `ltr` ([`variants.ts` L1196–1197](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/variants.ts#L1196-L1197)),
  as the docs list
  ([L2445–2507](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/hover-focus-and-other-states.mdx#L2445-L2507)).
  The docs add that these variants are only useful when a site supports both directions.
- **`[dir="rtl"] *` matches every descendant of an RTL element**, whatever that descendant's own
  direction. `:dir()` follows each element's resolved direction, including `dir="auto"`
  ([Selectors 4 L2543–2551](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/selectors-4/Overview.bs#L2543-L2551)).
  When `rtl:` and `ltr:` both match, the one later in the CSS wins. **Run:** the emitted CSS has
  `ltr:` rules before `rtl:` rules, so `rtl:` wins.

### The production build turns `:dir()` into `:lang()`

- **Run:** `vite build` with the SPA's settings emitted
  `.rtl\:…:where(:is(:lang(ae),:lang(ar),:lang(arc),…,:lang(yi)),[dir=rtl],[dir=rtl] *)` and
  `.ltr\:…:where(:not(:lang(ae),…,:lang(yi)),[dir=ltr],[dir=ltr] *)`. The built CSS had **0**
  `:dir(` and 57 `:lang(`.
- **Which step does it.** Tailwind's own optimizer leaves `:dir()` alone: it excludes
  `Features.DirSelector` and `Features.LogicalProperties`
  ([`@tailwindcss-node/src/optimize.ts` L46–53](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/@tailwindcss-node/src/optimize.ts#L46-L53)).
  Vite then minifies CSS with Lightning CSS and passes `build.cssTarget` as its targets
  ([`plugins/css.ts` L2328–2333](https://github.com/vitejs/vite/blob/v8.3.1/packages/vite/src/node/plugins/css.ts#L2328-L2333)).
  `cssTarget` defaults to `build.target`
  ([`build.ts` L502–507](https://github.com/vitejs/vite/blob/v8.3.1/packages/vite/src/node/build.ts#L502-L507)),
  which defaults to `['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4']`
  ([`constants.ts` L86–92](https://github.com/vitejs/vite/blob/v8.3.1/packages/vite/src/node/constants.ts#L86-L92);
  [docs L5–15, L119–138](https://github.com/vitejs/vite/blob/v8.3.1/docs/config/build-options.md#L5-L15)).
  Chrome supports `:dir()` from 120
  ([BCD `css/selectors/dir.json`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/css/selectors/dir.json)),
  so Lightning CSS lowers it with a fixed list of 19 right-to-left language codes
  ([`selector.rs` L2112–2115, L2210–2229](https://github.com/parcel-bundler/lightningcss/blob/v1.33.0/src/selector.rs#L2210-L2229)).
- **Run:** with `build.cssMinify: false`, or with a `cssTarget` of `chrome120`/`edge120`, the output
  kept `:dir(rtl)`. The **dev server** (`vite`) also kept `:dir()`, so dev and production differ.

What each variant applied to, with `rtl:` painting red and `ltr:` painting blue. Same result in
Chrome 154 and Firefox 157:

| Element | Its own direction | Production build (`:lang()`) | Dev server, or `chrome120` target (`:dir()`) |
| --- | --- | --- | --- |
| **LTR page** (`<html lang="en" dir="ltr">`) | | | |
| `<p dir="auto">` with Arabic text | rtl | `ltr:` | `rtl:` |
| `<input dir="auto">` with an Arabic value | rtl | `ltr:` | `rtl:` |
| `<span lang="ar">`, no `dir` | ltr | `rtl:` | `ltr:` |
| inside `<div dir="rtl">` | rtl | `rtl:` | `rtl:` |
| **RTL page** (`<html lang="ar" dir="rtl">`) | | | |
| inside `<div dir="ltr">` | ltr | `rtl:` | `rtl:` |
| `<p dir="auto">` with English text | ltr | `rtl:` | `rtl:` |
| `<input dir="auto">`, English value or empty | ltr | `rtl:` | `rtl:` |

Rules in: flow-relative utilities, which follow each element's own direction in every build; and
`rtl:`/`ltr:` for the page-level cases that have no flow-relative utility (`origin-`, gradients,
`-scale-x-100`). Rules out: relying on `rtl:`/`ltr:` for content whose direction differs from the
page's (user text with `dir="auto"`, `<bdi>` names, English inside Arabic). Rules out: assuming the
production build behaves like the dev server for `rtl:`/`ltr:`, unless `build.cssTarget` is raised.

### How a physical class can be caught

- **Tailwind has no switch for it.** The v3 `corePlugins` option *"is no longer supported in v4"*
  ([upgrade guide L805](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/upgrade-guide.mdx#L805)).
- **`@source not inline()` stops a class from being generated**
  ([docs L304–312](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/detecting-classes-in-source-files.mdx#L304-L312)).
  **Run:** with `@source not inline("pr-7")`, an element with `pr-7` got `padding-right: 0px`, and
  `vite build` printed nothing about it. The class is silently dropped, not reported. Brace patterns
  such as `{ml,mr}-{0..96}` are documented; whether they can cover arbitrary values (`ml-[3px]`) was
  not run.
- **A text scan sees what Tailwind sees.** Tailwind finds classes as plain-text tokens and cannot
  read classes built by concatenation
  ([docs L18–20, L67](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/detecting-classes-in-source-files.mdx#L18-L20)),
  so every class that produces CSS is written out in a source file. **Run:** the experiment's token
  scanner found the 15 classes above. It must strip variant prefixes (`focus:left-4`), a leading `-`
  or `!`, and must skip prose words like `right-aligned` in comments. A comment that holds a real
  class (`mr-auto` at `Modal.tsx:17`) generates CSS.
- **A text scan does not see** the JavaScript in section 1 (`scrollLeft` math, arrow keys, inline
  `scaleX`), nor Recharts' inline styles (section 6).
- **Existing shapes in the repo:** `web/vite.config.ts` L14–37 already fails `vite build` from a
  project plugin (the legal-file check); `.github/workflows/ci.yml` L23 runs `npm --prefix web run
  build`; `.github/workflows/no-bot-text.yml` already runs a `grep` check on every PR.

## 3. Icons

Read: the 18 icons in `web/src/design/icons` (all drawn on one 24-unit grid, `IconBase.tsx`).
**Run:** under RTL, all 18 have `transform: none` and `scale: none` in both browsers. **No icon flips
at `0d20fcb`**, and `IconBase` has no direction prop. **Run:** a wrapper with `rtl:-scale-x-100` did flip
(`scale: -1 1` in RTL, `none` in LTR).

What the first-party guides say:

- **Apple HIG:** flip next/previous buttons *"that let people access items in an ordered list"*;
  flip icons that show forward or backward motion; flip controls *"that show progress"*; *"Don't flip
  logos or universal signs and marks … like the checkmark"*; *"avoid flipping interface icons that
  depict real-world objects"* unless they show direction; a magnifying glass keeps its design.
- **Material 2:** *"Icons that communicate direction, like arrows, are mirrored"*; *"Icons that don't
  communicate direction, such as a camera"* are not; the search icon's handle is at the bottom right
  *"because the majority of users are right-handed … such icons should not be mirrored"*; a
  *"circular refresh or progress indicator with an arrow pointing clockwise should not be
  mirrored"*.
- **Material 3:** *"Back and forward icons are mirrored in RTL"*; *"Send buttons are mirrored"*;
  *"Help icons are mirrored in some RTL languages, like Urdu and Persian"*; *"Circular progress
  indicators move clockwise"*.

| Icon | Drawing | Same when flipped? | Used in (`0d20fcb`) | What the guides say |
| --- | --- | --- | --- | --- |
| `ChevronLeftIcon` | chevron pointing left | no | Pagination "previous" (`Pagination.tsx:57`) | flip (Apple: next/previous; Material: arrows, back/forward) |
| `ChevronRightIcon` | chevron pointing right | no | Pagination "next" (`Pagination.tsx:85`) | flip (same) |
| `CheckIcon` | check mark | no | Banner, success | do not flip (Apple: universal mark, *"like the checkmark"*) |
| `SearchIcon` | glass, handle bottom-right | no | DataTable empty state, not-found page | do not flip (Material 2: right-hand handle; Apple: magnifying glass keeps its design) |
| `FileIcon` | page, folded corner top-right | no | FileDrop | a real-world object with no direction: not flipped by the general rules; neither guide names it |
| `FlagIcon` | pole left, flag pointing right | no | not used yet | same general rule; neither guide names a flag |
| `MessageIcon` | speech bubble, tail bottom-left | no | not used yet | neither guide names speech bubbles (not confirmed) |
| `InfoIcon` | "i" in a circle | almost (the foot of the "i" points left) | Banner, info | a universal sign (Apple) |
| `AlertIcon` | "!" in a triangle | yes | Banner, DataTable error, error page | a universal sign; flipping changes nothing |
| `CloseIcon` | × | yes | Banner, Modal, FileDrop, SkillChip | flipping changes nothing |
| `ChevronDownIcon` | chevron pointing down | yes | not used yet | vertical |
| `SortIcon`, `SortAscIcon`, `SortDescIcon` | vertical arrows | yes | DataTable headers | vertical |
| `UploadIcon` | tray and up arrow | yes | FileDrop | vertical |
| `StarIcon`, `TrophyIcon`, `UserIcon` | star, cup, person | yes | not used yet | flipping changes nothing |

Not an icon file, but drawn in the design system: the `Button` spinner (`Button.tsx:13–19`) turns
with `animate-spin`, which is `rotate(360deg)`
([`theme.css` L438–447](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/theme.css#L438-L447)).
That is clockwise in both directions, which is what Material 2 and 3 describe for circular
indicators.

**Run, RTL, both browsers:** Pagination's "Previous" button moved to the right and kept its
left-pointing chevron, so it points toward "Next". Page 1 moved to the right end.

Rules in: flipping the two chevrons (or choosing the icon by direction), and leaving the check, search
and sign icons as they are. Not settled by the guides: `MessageIcon`, `FlagIcon`, `FileIcon`.

## 4. Every component in `web/src/design/components`, plus the layout and legal renderer

**Run** in Chrome 154 and Firefox 157, after a run-time switch to RTL and on a fresh RTL load (same
results). "Mirrors" means the left-right order was reversed as a whole.

| Component | In RTL (run) | Why | Guidance |
| --- | --- | --- | --- |
| `Avatar` | unchanged | no direction-bound style | – |
| `Banner` | mirrors: icon on the right, dismiss on the left | flex row | – |
| `Button` / `buttonClasses` | unchanged; text and spinner order mirrors | `gap-2` flex; spinner turns clockwise | Material: circular indicators are not mirrored |
| `Card` | mirrors: title on the right, actions on the left | `justify-between` flex | – |
| `Checkbox` | box goes right of the label; **hint sits under the box**, 24 px off the label text | `pl-6` (`:25`) | Material 2: *"Checkbox appears to the right of text"* |
| `DataTable` | columns mirror (first column on the right); **cell text stays left**; **fade stays right** and never hides; an `align: 'end'` column's **header goes left while its numbers stay right** | `text-left` (`:150`), `text-right` (`:164`, `:205`) next to `justify-end` (`:173`, flow-relative); `right-px`… (`:238`); `scrollLeft` math (`:128`) | – |
| `EmptyState` | unchanged | centred column | – |
| `field.tsx` (`FieldShell`, `FieldMessages`, `controlClass`) | labels and messages align right | `px-3`, block layout, inherited `text-align: start` | – |
| `FileDrop` | mirrors: preview right, Replace/Remove left | flex row | – |
| `IconButton` | unchanged | symmetric sizes; the `title` tooltip is drawn by the browser | – |
| `Modal` | mirrors: Close button left of the title; footer buttons gather at the left, in reversed order | flex rows; native `<dialog>` centred by `m-auto` (`:118`) | Material 2: primary and secondary buttons mirror |
| `pages.ts` | – | no UI (page count only) | – |
| `Pagination` | order mirrors; **chevrons do not** | flex row; fixed icons (`:57`, `:85`) | Apple and Material: flip next/previous |
| `PersonName` | name isolated | `<bdi>` resolves its own direction ([HTML L14966–15020](https://github.com/whatwg/html/blob/86190a4d7c155a668ae547d2b207916ed4643084/source#L14966-L15020)) | – |
| `ProgressBar` | label and percent mirror; **bar fills from the left** | `origin-left` + inline `scaleX` (`:39–40`) | Apple: flip progress; Material 2: *"Progress bars fill in the same direction as content is read"*; Material 3: right to left *"for most RTL languages, except Hebrew"* |
| `RoleLabel` | unchanged | symmetric | – |
| `Select` | arrow moves to the left; text aligns right | native control, `direction: rtl` inherited | – |
| `SkillChip` | remove button moves to the left (end side); **padding is on the wrong sides** (12 px at the button, 4 px at the name) | `pl-3 pr-1` (`:28`) | Material 3: a chip's trailing icon sits at the end side |
| `Tabs` | tab order mirrors; **ArrowRight moves focus left** | `ArrowRight` → next index (`:39`) | APG Tabs: Right Arrow *"Moves focus to the next tab"*, no RTL rule ([L68–74](https://github.com/w3c/aria-practices/blob/0f765e4dc33e966026114ac12a8380db1de3b787/content/patterns/tabs/tabs-pattern.html#L68-L74)); Material 2: first tab aligned right in RTL |
| `TextArea` | **empty field stays LTR**; filled field follows its text | `dir="auto"` (`:14`) | see section 5 |
| `TextField` | **empty field stays LTR**; filled field follows its text | `dir="auto"` (`:14`) | see section 5 |
| `layout.tsx` header and footer | not rendered in the experiment; read: plain flex rows with `px-4`, no direction-bound class | – | – |
| `layout.tsx` skip link | appears **top-left** when focused | `focus:left-4` (`:46`) | – |
| `legal/markdown.tsx` | headings and paragraphs align right; **bullets and numbers hang outside the column on the right**; nested list not indented; table columns mirror, **cell text stays left** | `pl-6` (`:65`, `:183`, `:191`), `text-left` (`:103`) | – |

Seen in the experiment, but it is text direction rather than mirroring: English text shown in an RTL
page puts its final full stop at the left (`.Only friends see it`), and a Skill name like `C++`
shows as `++C` in `SkillChip` and in the chart. The map makes English the fallback for any missing
translation, and #146 already asks how Skill names are isolated.

## 5. Native form controls and scroll bars

### Text fields with `dir="auto"`

- **Spec:** for `dir="auto"` the browser takes the direction of the first strong character in the
  field's value. An **empty value gives `ltr`**: auto directionality returns null for an empty value,
  and the Auto state then returns `ltr`
  ([HTML L14966–14990, L15044–15062](https://github.com/whatwg/html/blob/86190a4d7c155a668ae547d2b207916ed4643084/source#L15044-L15062)).
  The spec calls the heuristic *"very crude"* and a *"last resort"*
  ([L14947–14953](https://github.com/whatwg/html/blob/86190a4d7c155a668ae547d2b207916ed4643084/source#L14947-L14953)).
  `textarea[dir=auto]` and `dir=auto` text inputs get `unicode-bidi: plaintext`
  ([L152522–152557](https://github.com/whatwg/html/blob/86190a4d7c155a668ae547d2b207916ed4643084/source#L152522-L152557)).
- **Run, RTL page:** an empty `TextField` and an empty `TextArea` both computed `direction: ltr`
  and did not match `:dir(rtl)`, in both browsers. A field holding `أحمد` computed `rtl`. A field
  holding an e-mail address computed `ltr`, which keeps `user@domain` in order (Material 3 asks for
  this).
- **Run, a browser difference:** the Arabic placeholder of the empty field was drawn on the
  **left** in Chrome for both `TextField` and `TextArea`. In Firefox it was on the left for
  `TextField` but on the **right** for `TextArea`.

### Other controls

- **`<select>`:** **run**, the arrow moved to the left in RTL in Chrome and Firefox. The open list is
  browser UI and was not checked.
- **Checkbox:** a native box placed by the flex row (section 4).
- **`<dialog>`:** centred by the page's own `m-auto`; nothing direction-bound.
- **PDF preview `<iframe>` (`FileDrop.tsx:311`):** the viewer is browser UI; not run.

### Scroll bars

- **Spec:** whether scroll bars sit on the start or end edge *"is UA defined"*, and *"may depend on …
  bidirectionality"*
  ([CSS Overflow 3 L915–922](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-overflow-3/Overview.bs#L915-L922)).
  The page's direction comes from `<body>` and sets the viewport's scrolling direction
  ([CSS Writing Modes 4 L2495–2530](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-writing-modes-4/Overview.bs#L2495-L2530)).
- **Run, Linux, browser UI in English:** in a scrolling box (`overflow-y: auto`), the vertical bar
  moved to the **left** in RTL in both browsers (`clientLeft` = border + 15 px in Chrome, + 12 px in
  Firefox). The **page's own** scroll bar stayed on the **right** in both.
- **Horizontal scrolling** (DataTable, the tab list, legal tables) starts at the right edge in RTL.
  `scrollLeft` runs from 0 to negative values (section 1).
- **Safari (read, not run):** WebKit places the vertical bar on the left from the content direction
  or from the system's UI direction, depending on an embedder setting whose default is *Content*,
  and never on the left on iOS
  ([`RenderLayerModelObject.cpp` L275–290](https://github.com/WebKit/WebKit/blob/963125d1f1440dca433af8e41e3530abd975dd10/Source/WebCore/rendering/RenderLayerModelObject.cpp#L275-L290),
  [`UnifiedWebPreferences.yaml` L6691–6695](https://github.com/WebKit/WebKit/blob/963125d1f1440dca433af8e41e3530abd975dd10/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml#L6691-L6695)).
  What Safari itself sets is not confirmed.

Rules out: expecting an empty `dir="auto"` field to align right on an Arabic page. Rules out:
expecting the page's own scroll bar to move to the left in Chrome or Firefox on Linux.

## 6. The Recharts chart on `/admin/analytics`

ADR-0015 d7 adds Recharts; `docs/spec.md` §13.4 asks for bar charts by Skill (negative gaps below
the axis), a bar chart for the open Round, one for closed outcomes, and the completion rate on a
Round-number axis with `connectNulls={false}`. The experiment drew a bar chart and a line chart of
that shape.

### What Recharts 3.10.1 offers

- **No direction setting.** The package contains no `rtl` option (searched). Its own docs say
  `textAnchor` *"does not affect RTL text behavior"*
  ([`Text.tsx` L104–114](https://github.com/recharts/recharts/blob/v3.10.1/src/component/Text.tsx#L104-L114)).
- **Mirroring is done with props:** `XAxis reversed` reverses the range
  ([`types.ts` L1008–1012](https://github.com/recharts/recharts/blob/v3.10.1/src/util/types.ts#L1008-L1012),
  [`combineAxisRangeWithReverse.ts` L4–15](https://github.com/recharts/recharts/blob/v3.10.1/src/state/selectors/combiners/combineAxisRangeWithReverse.ts#L4-L15)),
  and `YAxis orientation="right"` moves the axis
  ([`YAxis.tsx` L164–167](https://github.com/recharts/recharts/blob/v3.10.1/src/cartesian/YAxis.tsx#L164-L167)).
- **Tick labels** get `text-anchor="end"` on a left axis and `"start"` on a right axis, unless the
  axis is given its own `textAnchor`
  ([`CartesianAxis.tsx` L252–261, L419–422](https://github.com/recharts/recharts/blob/v3.10.1/src/cartesian/CartesianAxis.tsx#L252-L261)).
  In SVG 2, `start` and `end` depend on the inherited `direction`: with `rtl`, `end` puts the
  **left** side of the text at the anchor
  ([SVG 2 text L4596–4630](https://github.com/w3c/svgwg/blob/47e645ef7cb61490e6975ddbcfa1997c9e972cc3/master/text.html#L4596-L4630)).
- **Legend** items are inline-blocks with `marginRight: 10`, and each icon has `marginRight: 4`
  ([`DefaultLegendContent.tsx` L227–231](https://github.com/recharts/recharts/blob/v3.10.1/src/component/DefaultLegendContent.tsx#L227-L231)).
- **Tooltip** sits at the cursor plus an offset to the right, unless it would leave the chart;
  `reverseDirection.x` puts it on the left first
  ([`translate.ts` L36–85](https://github.com/recharts/recharts/blob/v3.10.1/src/util/tooltip/translate.ts#L36-L85),
  [`Tooltip.tsx` L218–221, L273](https://github.com/recharts/recharts/blob/v3.10.1/src/component/Tooltip.tsx#L218-L221)).
  Nothing reads the page's direction.
- **Keyboard** (`accessibilityLayer`, on by default): ArrowRight and ArrowLeft move along the data,
  multiplied by −1 when an `XAxis` is `reversed`
  ([`keyboardEventsMiddleware.ts` L55, L92–93](https://github.com/recharts/recharts/blob/v3.10.1/src/state/keyboardEventsMiddleware.ts#L92-L93),
  [`axisSelectors.ts` L2279–2297](https://github.com/recharts/recharts/blob/v3.10.1/src/state/selectors/axisSelectors.ts#L2279-L2297)).

### What happened under `dir="rtl"` (run, Chrome and Firefox)

- **Default chart:** nothing mirrored. The Y axis stayed left and `Docker` stayed the leftmost bar.
  The SVG inherited `direction: rtl`, and every **Y tick label was drawn across the axis line**
  (Chrome: the "12" ran from x = 57 to 75 over a line at x = 65; in LTR it ran from 39 to 57).
- **Mirrored with props** (`reversed`, `orientation="right"`): bars reversed, Y axis on the right,
  but the **labels again crossed the axis line**, from the other side.
- **`dir="ltr"` on the chart's box** inside the RTL page put the labels back on the correct side,
  in both browsers.
- **Legend:** the item order reversed and each icon moved right of its text, but the 4 px gap stayed
  on the icon's outer side, so **the icon touched its text** (gap 0 px).
- **Tooltip:** right of the cursor, as in LTR; it went left only near the chart's right edge.
- **Keyboard:** on the default chart, two ArrowRight presses gave `Git`, then `C++`, moving
  rightward. On the mirrored chart, two presses gave `Docker` both times; `Docker` is at the right
  edge there. Both follow the screen, not the reading order.
- **SVG text:** `C++` showed as `++C`. An HTML `<bdi>` cannot go inside SVG `<text>`.

### What the guides say about charts

- **Material 3:** *"Not all elements mirror with RTL languages. For example, graphs and charts
  maintain a LTR directionality for Persian and Urdu."* It says nothing about Arabic.
- **Material 2:** *"anything that relates to time should be depicted as moving from right to left"*.
- **Apple:** *"reverse a sequence of numerals if you use the sequence to communicate a specific
  order"*.

The guides leave the choice open for an Arabic Round axis. Rules in: an unmirrored chart forced to
`dir="ltr"`, or a chart mirrored with `reversed` and `orientation`. Either way the tick labels need
`dir="ltr"` on the box or explicit `textAnchor` values. Rules out: leaving the chart to inherit
`dir="rtl"` unchanged.

## 7. TanStack Table 8.21.3

- **Headless.** It renders nothing; `DataTable.tsx` writes the `<table>`. Columns appear in
  `columns` order, and the browser lays an HTML table out right to left under `dir="rtl"`. **Run:**
  the `Name` column moved to the right edge.
- **One RTL option:** `columnResizeDirection: 'ltr' | 'rtl'`, default `'ltr'`, which reverses the
  drag delta while resizing
  ([`ColumnSizing.ts` L35, L55, L252, L383](https://github.com/TanStack/table/blob/v8.21.3/packages/table-core/src/features/ColumnSizing.ts#L383);
  [guide L103–111](https://github.com/TanStack/table/blob/v8.21.3/docs/guide/column-sizing.md#L103-L111)).
  The SPA does not resize columns.
- **Pinning uses physical names:** `'left' | 'right'`
  ([`ColumnPinning.ts` L13](https://github.com/TanStack/table/blob/v8.21.3/packages/table-core/src/features/ColumnPinning.ts#L13)),
  and the guide uses `getStart`/`getAfter` as CSS `left`/`right` values
  ([guide L83–84](https://github.com/TanStack/table/blob/v8.21.3/docs/guide/column-pinning.md#L83-L84)).
  The SPA does not pin columns.
- **Sorting and pagination** have no direction. Everything direction-bound in the table is the SPA's
  own code (section 1).

Rules in: TanStack Table as it is. The RTL work sits in `DataTable.tsx`.

## 8. Switching LTR ↔ RTL without a reload

- **Our code sets `<html dir lang>`.** No translation library writes them (the #149 findings).
  CSS Writing Modes asks HTML authors to use `dir`, not the CSS `direction` property
  ([L237–240, L257–260](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-writing-modes-4/Overview.bs#L257-L260)),
  and so does HTML
  ([L15292–15295](https://github.com/whatwg/html/blob/86190a4d7c155a668ae547d2b207916ed4643084/source#L15292-L15295)).
- **What re-resolves by itself.** **Run** in Chrome and Firefox: the page was loaded in LTR, then
  switched to RTL by setting `document.documentElement.dir` and `lang` from React state, then back
  to LTR. All 465 values measured per state (Tailwind probes, components, charts and scroll bars)
  were **identical after the switch to a fresh RTL load**, and identical after switching back to
  the first LTR load. Nothing reloaded: one navigation entry, and a
  value set on `window` before the switch was still there. Logical properties, `:dir()`, `[dir]`,
  the lowered `:lang()` selectors, native controls, list markers and table column order all
  followed.
- **What does not re-resolve by itself (JavaScript):**
  - `DataTable`'s fade is React state computed in `measure()` on `scroll` and `ResizeObserver`
    (`DataTable.tsx:124–137`). **Run:** on the switch, a table scrolled to 120 px went back to 0 in
    both browsers. **Chrome fired one `scroll` event; Firefox fired none**; `ResizeObserver` fired in
    neither. So in Firefox `measure()` does not run again after the switch.
  - `Tabs` maps arrow keys without reading the direction (`Tabs.tsx:39–44`).
  - Recharts' `reversed`, `orientation`, `textAnchor`, legend `align` and tooltip
    `reverseDirection` are props. They change only when React renders the chart again with new
    values. **Run:** the mirrored chart, driven by React state, matched the fresh RTL load.
  - TanStack's `columnResizeDirection` is an option read when used.
- **The page's own scroll bar** did not move in either browser (section 5).
- **`lang` matters in production.** Because the build lowers `rtl:`/`ltr:` to `:lang()`
  (section 2), what those variants match depends on `lang` as well as `dir`. The experiment always
  set both together; `dir="rtl"` with a non-Arabic `lang` was not run.

## 9. Chrome, Firefox, Safari and Brave

The additional-browsers Minor is claimed with **Firefox and Brave**, Chrome being the baseline
(`docs/spec.md` §1.3, §16.7; ADR-0016 d9). ADR-0016 d9 rejected Firefox + Safari. Brave uses
Chrome's engine (Blink), but it is not installed here and was not run.

### Run: Chrome 154 and Firefox 157 (Linux, headless)

Same in both: every Tailwind probe, every `rtl:`/`ltr:` result, every component result, the chart
results, the Tabs keys, the table fade, the skip link, the empty `dir="auto"` fields computing
`ltr`, scroll boxes putting their bar on the left, and the page's scroll bar staying right.
Different:

| What | Chrome 154 | Firefox 157 |
| --- | --- | --- |
| Empty `TextArea`, Arabic placeholder | drawn on the left | drawn on the right |
| `scroll` event on a scrolled box when `<html dir>` changes | one event | none |
| Scroll bar width (classic bars) | 15 px | 12 px |
| Text widths | – | a few px different (fonts) |

### Read: support data (MDN browser-compat-data v8.1.5)

First version with support:

| Feature | Chrome | Firefox | Safari |
| --- | --- | --- | --- |
| [`margin-inline-start`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/css/properties/margin-inline-start.json) / [`padding-inline-start`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/css/properties/padding-inline-start.json) | 69 | 41 | 12.1 |
| [`margin-inline`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/css/properties/margin-inline.json) | 87 | 66 | 14.1 |
| [`inset-inline-start`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/css/properties/inset-inline-start.json) | 87 | 63 | 14.1 |
| [`border-inline-start`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/css/properties/border-inline-start.json) | 69 | 41 | 12.1 |
| [`border-start-start-radius`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/css/properties/border-start-start-radius.json) | 89 | 66 | 15 |
| [`text-align: start`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/css/properties/text-align.json) | 1 | 1 | 3.1 |
| [`float: inline-start`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/css/properties/float.json) | 118 | 55 | 15 |
| [`:dir()`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/css/selectors/dir.json) | 120 | 49 | 16.4 |
| [`dir` attribute](https://github.com/mdn/browser-compat-data/blob/v8.1.5/html/global_attributes.json) | 1 | 1 | ≤4 |
| [`<bdi>`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/html/elements/bdi.json) | 16 | 10 | 6 |
| [`unicode-bidi: plaintext`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/css/properties/unicode-bidi.json) | 48 | 50 | 11 |
| [`scale`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/css/properties/scale.json) (used by `-scale-x-100`) | 104 | 72 | 14.1 |
| [`scrollbar-color`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/css/properties/scrollbar-color.json) (set in `tokens.css`) | 121 | 64 | 26.2 |
| [`<dialog>`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/html/elements/dialog.json) | 37 | 98 | 15.4 |

- [`Element.scrollLeft`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/api/Element.json):
  Chrome uses the spec's negative values in RTL from version 86; before that it used 0 to a positive
  maximum. No such note for Firefox or Safari.
- Tailwind 4 states it *"depends on"* Chrome 111, Safari 16.4 and Firefox 128
  ([compatibility L8–12](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/compatibility.mdx#L8-L12)).
  Vite 8.3.1's default target is Chrome 111, Firefox 114 and Safari 16.4; the Chrome 111 entry is
  what lowers `:dir()` (section 2).

Rules in: logical properties and `:dir()` in every current version of the three browsers. Not
confirmed for Safari: placeholders, scroll bar side, the `scroll` event on a direction change, and
the chart's text anchoring.

## What this leaves open

- **Safari and WebKit were not run.** Playwright's WebKit 27.2 for Linux downloaded, but would not
  start: the host lacks system libraries (`libevent`, `libflite`, `libavif`, `libmanette`,
  gstreamer) that need administrator rights to install. Even when run, WebKit on Linux is not
  Safari. Safari facts here come from the support data and WebKit source only.
- **Brave was not run** (not installed). It is one of the two claimed browsers.
- **Only Linux, with an English browser UI.** Scroll bar sides on Windows and macOS, overlay scroll
  bars, and a browser whose own UI is in Arabic were not checked.
- **Labels stayed in English.** The gallery used the components' English text. Longer French or
  Arabic labels, and their wrapping, were not checked.
- **Not checked:** the open `<select>` list, `title` tooltips, the PDF preview `<iframe>`, touch
  (`pointer-coarse`) layouts, widths under 360 px, and screen readers.
- **`dir="rtl"` with a non-Arabic `lang`** was not run (section 8).
- **`@source not inline()` with arbitrary values** (`ml-[3px]`) was not run.
- **Icons the guides do not name:** speech bubble (`MessageIcon`), flag (`FlagIcon`) and document
  (`FileIcon`).
- **Recharts:** the tooltip's content in Arabic, and whether `dir="ltr"` on the chart box also fixes
  `C++`, were not measured.
- **The ticket's count of 10** physical classes on 2026-10-11 could not be reproduced (15 found).

## How the experiments were run

In a scratch directory outside the repository, on Node 22.22.1 and npm 9.2.0:

- **The app.** `npm ci` from a copy of `web/package.json` and `web/package-lock.json`, then
  `recharts@3.10.1` and `react-is@19.3.0` added with exact versions. The resulting lockfile is the
  SPA's lockfile plus Recharts' own dependencies; every SPA package kept its locked version. The
  SPA's `web/src/design/` and `web/src/legal/` were copied unchanged from `0d20fcb`. `index.css` was
  copied with one added line, `@source not inline("pr-7")`, for the test in section 2. A gallery
  page rendered: Tailwind probes in a 400 px box; `rtl:`/`ltr:` probes; every component; all 18
  icons; the legal renderer on a short Markdown sample; a scroll box; and three Recharts charts
  (default bar, bar mirrored with `reversed` and `orientation`, line with a `null` Round). A button
  and a `window` hook set `document.documentElement.dir` and `lang` from React state.
- **Builds.** `tsc` on the app passed. `vite build` with the SPA's plugins, plus two variants:
  `build.cssMinify: false`, and `build.cssTarget` with `chrome120`/`edge120`. They were served with
  `vite preview`; `vite` (dev) was served too.
- **Browsers.** `puppeteer-core` 25.13.0, kept in its own directory, drove the installed Chrome
  154.0.8037.97 (headless, with Puppeteer's default `--hide-scrollbars` removed) and Firefox 157.0
  (snap package, WebDriver BiDi, overlay scroll bars turned off). The viewport was 1100 × 900.
- **Sequence, per browser:** load in LTR and measure; switch to RTL at run time and measure; test
  Tabs keys, the table scroll at both ends, the skip link, chart hover and keyboard, and the open
  Modal; switch back and measure; reload with RTL from the start and measure. Measurements were
  `getComputedStyle`, `getBoundingClientRect`, text ranges and `matches(':dir(rtl)')`. Each section
  was also saved as a screenshot and checked by eye.
- **Extra checks:** a logical property inside a nested `dir="ltr"` box; which events fire on a
  scrolled table when the direction changes; the end-aligned header against its cells, with the
  column widened; the chart box set to `dir="ltr"`.
- **Static checks:** the token scanner over `web/src` at `0d20fcb`, `592bf58`, `15d3b47` and older
  commits; `grep` of the built CSS for `:dir(`, `:lang(` and each class; the locked Tailwind's
  `compile()` on the flow-relative replacement classes.

## Primary sources

Tailwind CSS v4.3.3:
[`src/variants.ts`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/variants.ts) ·
[`src/utilities.ts`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/utilities.ts) ·
[`src/compat/legacy-utilities.ts`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/compat/legacy-utilities.ts) ·
[`theme.css`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/theme.css) ·
[`@tailwindcss-node/src/optimize.ts`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/@tailwindcss-node/src/optimize.ts) ·
[`@tailwindcss-vite/src/index.ts`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/@tailwindcss-vite/src/index.ts) ·
[`CHANGELOG.md`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/CHANGELOG.md)

Tailwind docs (`tailwindcss.com` at `7f92c22`):
[states and variants](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/hover-focus-and-other-states.mdx) ·
[margin](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/margin.mdx) ·
[padding](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/padding.mdx) ·
[top/right/bottom/left](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/top-right-bottom-left.mdx) ·
[text-align](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/text-align.mdx) ·
[transform-origin](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/transform-origin.mdx) ·
[detecting classes](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/detecting-classes-in-source-files.mdx) ·
[upgrade guide](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/upgrade-guide.mdx) ·
[compatibility](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/compatibility.mdx)

Vite v8.3.1:
[`src/node/constants.ts`](https://github.com/vitejs/vite/blob/v8.3.1/packages/vite/src/node/constants.ts) ·
[`src/node/build.ts`](https://github.com/vitejs/vite/blob/v8.3.1/packages/vite/src/node/build.ts) ·
[`src/node/plugins/css.ts`](https://github.com/vitejs/vite/blob/v8.3.1/packages/vite/src/node/plugins/css.ts) ·
[`docs/config/build-options.md`](https://github.com/vitejs/vite/blob/v8.3.1/docs/config/build-options.md);
Lightning CSS v1.33.0: [`src/selector.rs`](https://github.com/parcel-bundler/lightningcss/blob/v1.33.0/src/selector.rs)

Recharts v3.10.1:
[`cartesian/CartesianAxis.tsx`](https://github.com/recharts/recharts/blob/v3.10.1/src/cartesian/CartesianAxis.tsx) ·
[`cartesian/YAxis.tsx`](https://github.com/recharts/recharts/blob/v3.10.1/src/cartesian/YAxis.tsx) ·
[`component/Text.tsx`](https://github.com/recharts/recharts/blob/v3.10.1/src/component/Text.tsx) ·
[`component/DefaultLegendContent.tsx`](https://github.com/recharts/recharts/blob/v3.10.1/src/component/DefaultLegendContent.tsx) ·
[`component/Tooltip.tsx`](https://github.com/recharts/recharts/blob/v3.10.1/src/component/Tooltip.tsx) ·
[`util/tooltip/translate.ts`](https://github.com/recharts/recharts/blob/v3.10.1/src/util/tooltip/translate.ts) ·
[`util/types.ts`](https://github.com/recharts/recharts/blob/v3.10.1/src/util/types.ts) ·
[`state/keyboardEventsMiddleware.ts`](https://github.com/recharts/recharts/blob/v3.10.1/src/state/keyboardEventsMiddleware.ts) ·
[`state/selectors/axisSelectors.ts`](https://github.com/recharts/recharts/blob/v3.10.1/src/state/selectors/axisSelectors.ts) ·
[`state/selectors/combiners/combineAxisRangeWithReverse.ts`](https://github.com/recharts/recharts/blob/v3.10.1/src/state/selectors/combiners/combineAxisRangeWithReverse.ts)

TanStack Table v8.21.3:
[`features/ColumnSizing.ts`](https://github.com/TanStack/table/blob/v8.21.3/packages/table-core/src/features/ColumnSizing.ts) ·
[`features/ColumnPinning.ts`](https://github.com/TanStack/table/blob/v8.21.3/packages/table-core/src/features/ColumnPinning.ts) ·
[column sizing guide](https://github.com/TanStack/table/blob/v8.21.3/docs/guide/column-sizing.md) ·
[column pinning guide](https://github.com/TanStack/table/blob/v8.21.3/docs/guide/column-pinning.md)

Specs, `csswg-drafts` at `5033732`:
[CSS Logical Properties 1](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-logical-1/Overview.bs) ·
[CSS Writing Modes 4](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-writing-modes-4/Overview.bs) ·
[CSS Transforms 1](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-transforms-1/Overview.bs) ·
[CSSOM View 1](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/cssom-view-1/Overview.bs) ·
[CSS Overflow 3](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-overflow-3/Overview.bs) ·
[Selectors 4](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/selectors-4/Overview.bs);
[HTML Standard `source` at `86190a4`](https://github.com/whatwg/html/blob/86190a4d7c155a668ae547d2b207916ed4643084/source);
[SVG 2 `master/text.html` at `47e645e`](https://github.com/w3c/svgwg/blob/47e645ef7cb61490e6975ddbcfa1997c9e972cc3/master/text.html);
[WAI-ARIA APG Tabs pattern at `0f765e4`](https://github.com/w3c/aria-practices/blob/0f765e4dc33e966026114ac12a8380db1de3b787/content/patterns/tabs/tabs-pattern.html)

WebKit at `963125d`:
[`RenderLayerModelObject.cpp`](https://github.com/WebKit/WebKit/blob/963125d1f1440dca433af8e41e3530abd975dd10/Source/WebCore/rendering/RenderLayerModelObject.cpp) ·
[`UnifiedWebPreferences.yaml`](https://github.com/WebKit/WebKit/blob/963125d1f1440dca433af8e41e3530abd975dd10/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml)

Design guidance, read 2026-10-12:
[Material Design 3, Bidirectionality & RTL](https://m3.material.io/foundations/layout/understanding-layout/bidirectionality-rtl) ·
[Material Design 2, Bidirectionality](https://m2.material.io/design/usability/bidirectionality.html) ·
[Apple HIG, Right to left](https://developer.apple.com/design/human-interface-guidelines/right-to-left)

MDN browser-compat-data v8.1.5: [`css/properties/`](https://github.com/mdn/browser-compat-data/tree/v8.1.5/css/properties) ·
[`css/selectors/dir.json`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/css/selectors/dir.json) ·
[`html/`](https://github.com/mdn/browser-compat-data/tree/v8.1.5/html) ·
[`api/Element.json`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/api/Element.json)

PeerConnect: `document/en.subject.md:564`–`:580`; `docs/spec.md` §1.3, §3.3, §3.5, §13.4, §16.7;
ADR-0015 d7; ADR-0016 d9; `web/package-lock.json`; `web/index.html`;
`web/vite.config.ts`; `.github/workflows/ci.yml`; `.github/workflows/no-bot-text.yml`; the
[#149 findings](https://github.com/ahmadmnsur/ft_transcendence/blob/research/i18n-library/docs/research/i18n-library.md).
