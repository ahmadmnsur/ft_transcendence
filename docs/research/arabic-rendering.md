# How Arabic and French text render in the PeerConnect SPA

Researched and checked 2026-10-13 for
[#141](https://github.com/ahmadmnsur/ft_transcendence/issues/141). Built from:

- the SPA on `origin/main` at `0d20fcb` (2026-10-12): `web/src/design/tokens.css`,
  `web/src/index.css`, `web/index.html`, every `.ts`, `.tsx` and `.css` file under `web/src`
  (scanned), and `proxy/templates/default.conf.template` (the CSP). Versions from
  `web/package-lock.json`: Tailwind CSS 4.3.3, Vite 8.3.1, React 19.3.0;
- CLDR at its release tags, from
  [`release-36`](https://github.com/unicode-org/cldr/tree/release-36) to
  [`release-48-2`](https://github.com/unicode-org/cldr/tree/release-48-2) (the latest final
  release, 2026-03-17) and `release-49-beta3`: `common/main/ar.xml`, `ar_LB.xml`, `ar_EG.xml`,
  `ar_SA.xml`, `ar_AE.xml`, `ar_MA.xml`, `fr.xml`, `root.xml`,
  `common/supplemental/numberingSystems.xml` and `supplementalData.xml`; the CLDR commit that
  changed the Arabic default
  ([`c149724`](https://github.com/unicode-org/cldr/commit/c14972450980b430f0105999610a377e0ed5e994));
  and the LDML specification (UTS #35) in `docs/ldml/` at `release-48-2`;
- the ICU each runtime ships: Node's `process.versions`; Chrome 154's ICU
  ([`chromium/deps/icu` at `6ebb40c`](https://chromium.googlesource.com/chromium/deps/icu/+/6ebb40c594776cc2c21ea14df85a2a89a328b364),
  pinned by Chromium's
  [`DEPS` at `154.0.8037.97`](https://github.com/chromium/chromium/blob/154.0.8037.97/DEPS#L2430-L2431));
  Firefox's `intl/icu` at
  [`FIREFOX_157_0_RELEASE`](https://github.com/mozilla-firefox/firefox/tree/FIREFOX_157_0_RELEASE/intl/icu)
  and at the ESR tags 128.9, 140.9.1 and 153.4; Apple's ICU
  ([`apple-oss-distributions/ICU`](https://github.com/apple-oss-distributions/ICU)) at the commits
  that Apple's `distribution-macOS` tags `macos-145`, `macos-156`, `macos-261` and `macos-265` point to;
- the specifications, at fixed commits of their source repositories: ECMA-402
  ([`tc39/ecma402` at `730ca2b`](https://github.com/tc39/ecma402/tree/730ca2b88c305862db7be2f83c510dcca33ab48c),
  2026-10-12); CSS Text 3, CSS Text 4 and CSS Fonts 4
  ([`csswg-drafts` at `5033732`](https://github.com/w3c/csswg-drafts/tree/50337328484f7fcdd9ab6fe9ded6011815b1707e),
  2026-10-10, the commit the #140 findings used); the W3C *Arabic & Persian Layout Requirements*
  and its gap analysis
  ([`w3c/alreq` at `670d38e`](https://github.com/w3c/alreq/tree/670d38e72099e2bee6fc17a7e9d02b1aab932d77),
  2026-08-09); UAX #14
  [revision 55](https://www.unicode.org/reports/tr14/tr14-55.html) (Unicode 17.0.0), and
  [`LineBreak.txt`](https://www.unicode.org/Public/17.0.0/ucd/LineBreak.txt) and
  [`SpecialCasing.txt`](https://www.unicode.org/Public/17.0.0/ucd/SpecialCasing.txt) at 17.0.0;
- browser engine source: Chromium at
  [`154.0.8037.97`](https://github.com/chromium/chromium/tree/154.0.8037.97), Firefox at
  [`FIREFOX_157_0_RELEASE`](https://github.com/mozilla-firefox/firefox/tree/FIREFOX_157_0_RELEASE),
  and [WebKit `main` at `963125d`](https://github.com/WebKit/WebKit/tree/963125d1f1440dca433af8e41e3530abd975dd10)
  (2026-10-12, the commit the #140 findings used);
- first-party font lists, read 2026-10-13: Microsoft's
  [Windows 11 font list](https://learn.microsoft.com/en-us/typography/fonts/windows_11_font_list),
  [Windows 10 font list](https://learn.microsoft.com/en-us/typography/fonts/windows_10_font_list)
  and the [Segoe UI](https://learn.microsoft.com/en-us/typography/font-list/segoe-ui),
  [Arial](https://learn.microsoft.com/en-us/typography/font-list/arial) and
  [Tahoma](https://learn.microsoft.com/en-us/typography/font-list/tahoma) pages; Apple's
  [*Fonts included with macOS Tahoe*](https://support.apple.com/en-us/122869) (published
  2025-09-15) and [Apple's fonts page for developers](https://developer.apple.com/fonts/); the fonts
  installed on the Linux machine that ran the experiments (`fc-list :lang=ar`, `fc-match`);
- candidate fonts from
  [`google/fonts` at `6692879`](https://github.com/google/fonts/tree/66928797f271fed5ee428544e7229685e2d90127)
  (2026-10-12): each family's `METADATA.pb`, `OFL.txt` and font files; Google Fonts' own subset
  definitions ([`googlefonts/nam-files` at `2a68014`](https://github.com/googlefonts/nam-files/tree/2a68014b16056e965c18fd47de1f3fde9a5b0095/Lib/gfsubsets/data));
  the [SIL Open Font License 1.1](https://openfontlicense.org/documents/OFL.txt) and its
  [FAQ, version 1.1-update7](https://openfontlicense.org/ofl-faq/) (November 2023);
- French usage: the Office québécois de la langue française,
  [*Espacement avant et après les signes de ponctuation et les symboles*](https://vitrinelinguistique.oqlf.gouv.qc.ca/22039/la-typographie/espacement/espacement-avant-et-apres-les-signes-de-ponctuation-et-les-symboles)
  (last updated 2024), and the Académie française,
  [*Questions de langue*](https://www.academie-francaise.fr/questions-de-langue), both read
  2026-10-13;
- the library source and docs at release tags:
  [`vite` v8.3.1](https://github.com/vitejs/vite/tree/v8.3.1) and
  [`tailwindcss` v4.3.3](https://github.com/tailwindlabs/tailwindcss/tree/v4.3.3); MDN's browser
  support data, [`browser-compat-data` v8.1.5](https://github.com/mdn/browser-compat-data/tree/v8.1.5);
- experiments run on 2026-10-13 in **Node 22.22.1** (ICU 78.2, CLDR 48.0), **Chrome
  154.0.8037.97** and **Firefox 157.0**, both headless on Ubuntu 26.04.1 LTS. A throwaway app with
  the SPA's locked versions renders the SPA's real `tokens.css`, `index.css` and `design/` folder,
  copied unchanged from `0d20fcb`, with Arabic and French samples. A second throwaway app bundles an
  Arabic font with Vite under the SPA's own CSP. See
  [How the experiments were run](#how-the-experiments-were-run).

These are facts only. Each finding says what it rules in or out. **No choice for PeerConnect is
made here**; that choice belongs to [#146](https://github.com/ahmadmnsur/ft_transcendence/issues/146)
("Settle how Arabic looks: mirroring, font, digits and dates"). Layout mirroring was
[#140](https://github.com/ahmadmnsur/ft_transcendence/issues/140)'s question and is not repeated
here; see the
[#140 findings](https://github.com/ahmadmnsur/ft_transcendence/blob/research/rtl-mirroring/docs/research/rtl-mirroring.md).
**Safari, macOS and Windows were not run**: their facts come from first-party font lists and from
source, and say so. Every claim says whether it was read in source, read in a spec or the docs, or
run, and where.

> **Corrected 2026-10-13** after Ahmad's
> [review of `56f3ea2`](https://github.com/ahmadmnsur/ft_transcendence/issues/141#issuecomment-6149195105):
> only Linux was run, and there no family in the stack covers Arabic. On macOS, which face draws
> Arabic is CoreText's choice, and Apple lists SF Arabic as part of the system font. `truncate` also
> cuts the top and bottom of vowel marks. A `unicode-range` font is fetched by any page that shows a
> character in its range. Smaller corrections in the Short answer and sections 1, 2, 5, 6 and 7.

## Question

How do Arabic and French text look in PeerConnect without extra work, and what would change that?
Covered: whether the system font stack in `tokens.css` shows Arabic well in Chrome, Firefox and
Safari on Linux, Windows and macOS, and which font could be bundled, under which licence, at what
size and what Vite does with it; which digits `Intl.NumberFormat` and `Intl.DateTimeFormat` give for
`ar`, `ar-LB` and `fr`, what `-u-nu-latn` changes, and CLDR's default numbering system per release;
what dates look like in English, French and Arabic; which typographic styles the SPA uses and what
they do to Arabic; and what the SPA's styles and `Intl` do to French text.

## Short answer

- **Fonts.** **Run on Linux:** no family the stack names covers Arabic, so Arabic is drawn by a
  fallback font that each browser picks. Both browsers drew it with
  Noto Sans Arabic, and the letters joined correctly. But `font-medium` gave the Regular face in both
  browsers, `font-semibold` gave a **fake bold** in Chrome (the Regular face thickened) and the real
  Bold face in Firefox, `italic` gave a slanted Regular face in both, and `tabular-nums` did not make
  the Arabic-Indic digits equal width. **Read, not run:** on Windows the stack names Segoe UI, which
  Microsoft lists with Arabic. On macOS, which face draws Arabic is CoreText's choice, and Apple
  lists SF Arabic as part of the system font, so the stack's first family may cover Arabic there.
  Firefox names Geeza Pro for Arabic, while Safari and Chrome leave the choice to CoreText.
- **A bundled font.** Eight Arabic families on Google Fonts were measured. All are under the SIL
  Open Font License 1.1, and two declare a Reserved Font Name. A variable font is one file; a
  static family needs one file per weight. Subset to Arabic and Latin and limited to the weights the
  SPA uses (400, 500 and 600), a family weighs 35–174 kB: Readex Pro 35 kB, Cairo 40 kB, Vazirmatn
  55 kB, Rubik 61 kB and Noto Sans Arabic 102 kB in one file each; Tajawal 52 kB in three files
  (700 stands in for 600), Almarai 94 kB in two (400 and 700) and IBM Plex Sans Arabic 174 kB in
  three. Vite emits each as a file with a hashed name. With `unicode-range` set to Arabic, a page
  fetches it only when it shows an Arabic character; in the run, only the Arabic page did. A font
  under 4 KiB would be inlined as `data:`, which the SPA's CSP blocks with a console error.
- **Digits.** Since **CLDR 46** (2024-10-24), plain `ar` defaults to Western digits (`1,234`),
  while `ar-LB`, `ar-EG`, `ar-SA` and 18 other Arabic locales keep Arabic-Indic digits (`١٬٢٣٤`).
  Node 22.22.1, Chrome 154 and Firefox 157 all ship CLDR 48 and gave the same French and Arabic
  strings (651 of the 657 values compared were identical).
  `-u-nu-latn` switches `ar-LB` to Western digits and also to `1.234,5` separators. Older runtimes
  differ: Firefox ESR 128 (CLDR 43) and the ICU in Apple's `macos-145` tag (CLDR 44) give
  Arabic-Indic digits for `ar` (read, not run).
- **Dates.** All three languages use the Gregorian calendar. Arabic numeric dates carry invisible
  right-to-left marks (U+200F). With Western digits, they show in day, month, year order only inside
  a right-to-left box: in a `dir="ltr"` box, `ar` printed 5 January 2026 as `52026/1/`. The `ar-LB`
  dates, with Arabic-Indic digits, kept their order in both boxes. `ar` and `ar-LB` use different
  month names (`أكتوبر` against `تشرين الأول`).
- **Styles.** Both browsers ignore `letter-spacing` between Arabic letters, as CSS Text 3 requires
  when a browser cannot stretch the joins, so `tracking-wide` and `tracking-tight` do nothing to an
  Arabic word. `uppercase` does nothing to
  Arabic. With vowel marks, glyphs at `text-2xl` and `text-3xl` reach up into the line above.
  `truncate` cut slivers of about one device pixel off the edges of Arabic button labels, and on a
  label with vowel marks, the top and bottom of the marks.
- **French.** `Intl` writes `1 234,5` with a narrow no-break space (U+202F) and `42 %` with a
  no-break space (U+00A0). `uppercase` keeps the accents (`ÉLÈVE`). Neither browser adds the French
  space before `: ; ! ?`, and neither supports `text-autospace: punctuation`. With a plain space
  typed before them, both browsers broke the line just before the mark at more than half the widths
  tried. With U+00A0 or U+202F they did not, except where the word and its mark did not fit the
  box.

## 1. The system font stack and Arabic

### What the stack is

- **Read:** `tokens.css:74` sets `--font-sans: system-ui, -apple-system, 'Segoe UI', Roboto,
  'Helvetica Neue', Arial, sans-serif`, and `:73` says *"Type runs on the system stack; nothing is
  downloaded."* Tailwind's preflight gives `html` the font `--default-font-family`
  ([`preflight.css` L33–34](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/preflight.css#L33-L34)),
  which is `--font-sans`
  ([`theme.css` L494](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/theme.css#L494)).
  **Run:** the built CSS has `html,:host{…font-family:var(--default-font-family,…)}` and
  `--default-font-family:var(--font-sans)`.
- **`system-ui` is the platform's own UI font** and may depend on the content language
  ([CSS Fonts 4 L607–631](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-fonts-4/Overview.bs#L607-L631)).
  When no family in the list has a glyph for a character, the browser picks a fallback font itself
  ([L4349–4400](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-fonts-4/Overview.bs#L4349-L4400)).

### Linux (run, Chrome 154 and Firefox 157, Ubuntu 26.04.1)

`fc-list :lang=ar` lists Noto Sans Arabic, Noto Naskh Arabic, Noto Kufi Arabic and Noto Nastaliq
Urdu (Regular and Bold only, from the `fonts-noto-core` 20201225 package; Noto Sans Arabic's file
says version 2.005), plus DejaVu Sans and DejaVu Sans Mono. The installed Noto Sans Arabic has
**no Latin letters**.

How each browser's choice was read: Chrome through the DevTools protocol
(`CSS.getPlatformFontsForNode`, which names the face and its PostScript name); Firefox by matching
the text's width, to 0.001 px, against the same text set in each installed candidate family by name.

| Sample (in `lang="ar" dir="rtl"`, 16 px) | Chrome 154 | Firefox 157 |
| --- | --- | --- |
| Arabic, normal weight | Noto Sans Arabic Regular (space glyphs from Noto Sans) | width of Noto Sans Arabic Regular |
| Arabic, `font-medium` (500) | Noto Sans Arabic **Regular** | width of **Regular** |
| Arabic, `font-semibold` (600) and `font-bold` (700) | Noto Sans Arabic **Regular**, thickened (fake bold) | width of the real **Bold** face |
| Arabic, `italic` | Regular, slanted (fake italic) | Regular width, slanted |
| Arabic in a `lang="en"` box, no `lang` of its own | Noto Sans Arabic | Noto Sans Arabic |
| Latin text and digits | Noto Sans | Noto Sans |
| Arabic in `font-mono` (`legal/markdown.tsx:24`) | DejaVu Sans Mono: each letter fills one fixed-width cell, joined by long strokes | no candidate matched |

- **Fake bold in Chrome (read):** when no listed family has the glyph, Chromium on Linux asks
  fontconfig for a fallback font without the weight. If the face it gets is not bold and the weight
  asked for is 600 or more, Chromium thickens it
  ([`font_cache_linux.cc` L79–134](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/fonts/linux/font_cache_linux.cc#L79-L134)).
  **Run:** naming `"Noto Sans Arabic"` directly with `font-semibold` gave the real Bold face
  (PostScript name `NotoSansArabic-Bold`) in Chrome too, 243.4 px wide against 222.1 px for the
  fake bold. Checked by eye: the fake bold is thicker than Regular but narrower than the real Bold.
- **500 gives Regular in both:** only 400 and 700 are installed, and CSS Fonts 4 tries lighter faces
  before heavier ones for a weight between 400 and 500
  ([L4596](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-fonts-4/Overview.bs#L4596)).
- **Digits:** in this Noto Sans Arabic 2.005, the ten Arabic-Indic digits have ten different widths
  (280–583 font units, read with fontTools), and the font has no `tnum` feature. **Run:** `١١١١١`
  measured 22.4 px and `٨٨٨٨٨` 46.1 px, with or without `tabular-nums`, in both browsers. The SPA uses
  `tabular-nums` at `DataTable.tsx:205`, `FileDrop.tsx:289`, `Pagination.tsx:60` and
  `ProgressBar.tsx:27`. (Google Fonts' newer Noto Sans Arabic 2.012 has equal-width digits and a
  `tnum` feature; section 2.)
- **Desktop session not run:** these runs were headless. In this machine's desktop session GNOME's
  interface font is Ubuntu Sans 11, which has no Arabic glyphs (it is not in `fc-list :lang=ar`).

### Windows (read, not run)

- **The fonts:** Microsoft lists Segoe UI (Light, Semilight, Regular, Semibold, Bold and Black, each
  with an italic), Arial and Tahoma among the fonts shipped with Windows 11 and Windows 10. The
  Segoe UI page says it *"supports … Arabic"* and lists the script tag `'Arab'`; the Arial and
  Tahoma pages list `'Arab'` too. Arabic Typesetting, Sakkal Majalla, Simplified Arabic and others
  are in the optional *Arabic Script Supplemental Fonts* package (Feature on Demand). The pages do
  not say which Segoe UI weights carry Arabic glyphs.
- **Chrome:** `system-ui` is Windows' menu font
  ([`font_cache_skia_win.cc` L130–131](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/fonts/win/font_cache_skia_win.cc#L130-L131)),
  and the stack names `'Segoe UI'` anyway. Chrome's own fallback list for Arabic is Tahoma, then
  Segoe UI
  ([`font_fallback_win.cc` L130, L236](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/fonts/win/font_fallback_win.cc#L130)),
  and Courier New for Arabic in a monospace font
  ([L111–116](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/fonts/win/font_fallback_win.cc#L111-L116)).
- **Firefox:** `system-ui` is the menu font
  ([`gfxPlatformFontList.cpp` L2219–2245](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_157_0_RELEASE/gfx/thebes/gfxPlatformFontList.cpp#L2219-L2245));
  `sans-serif` for Arabic is *"Segoe UI, Tahoma, Arial"*
  ([`all.js` L2067](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_157_0_RELEASE/modules/libpref/init/all.js#L2067)),
  and its common fallback font for Arabic is Arial
  ([`gfxWindowsPlatform.cpp` L606–608](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_157_0_RELEASE/gfx/thebes/gfxWindowsPlatform.cpp#L606-L608)).

### macOS (read, not run)

- **The fonts:** Apple's macOS Tahoe list includes Arabic families such as Geeza Pro (Regular,
  Bold), Al Nile, Baghdad, Damascus (five weights), Kigelia Arabic and Myriad Arabic. It does not
  list the San Francisco system fonts. Apple's developer page says SF Pro covers *"Latin, Greek, and
  Cyrillic scripts"*, and lists **SF Arabic** among the *"extensions to the Apple system font"*,
  with *"nine weights"*.
- **Safari:** `system-ui` is `CTFontCreateUIFontForLanguage(kCTFontUIFontSystem, size, locale)`,
  CoreText's UI font for the element's language, and fallback follows CoreText's cascade list for
  that language
  ([`SystemFontDatabaseCoreText.cpp` L52–63, L169–183](https://github.com/WebKit/WebKit/blob/963125d1f1440dca433af8e41e3530abd975dd10/Source/WebCore/platform/graphics/cocoa/SystemFontDatabaseCoreText.cpp#L52-L63)).
  Since Apple lists SF Arabic as an extension of the system font (above), the stack's first family
  may cover Arabic itself on a Mac. Which face CoreText actually picks is not published, and it was
  not run.
- **Chrome:** `system-ui` is CoreText's UI font with no language
  ([`font_matcher_mac.mm` L545](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/fonts/mac/font_matcher_mac.mm#L540-L545)),
  and missing glyphs come from CoreText's substitution
  ([`font_cache_mac.mm` L127–149](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/fonts/mac/font_cache_mac.mm#L127-L149)).
- **Firefox:** `system-ui` is the system font, and a source comment says it does not yet ask for a
  font per language
  ([`gfxPlatformFontList.cpp` L2222–2223](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_157_0_RELEASE/gfx/thebes/gfxPlatformFontList.cpp#L2222-L2223)).
  `sans-serif` for Arabic is Geeza Pro
  ([`all.js` L2338](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_157_0_RELEASE/modules/libpref/init/all.js#L2338)),
  and so is its fallback for Arabic
  ([`gfxPlatformMac.cpp` L222–223](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_157_0_RELEASE/gfx/thebes/gfxPlatformMac.cpp#L222-L223)).
  Apple lists Geeza Pro in two weights only.

Rules in: the system stack as a way to show correctly joined Arabic on Linux (run). Rules out:
expecting the same Arabic face, or real 500 and 600 weights, in every browser and system. On Linux
Chrome fakes the bold and both browsers drop 500 to Regular (run). On macOS, Firefox names Geeza
Pro while Safari and Chrome leave the choice to CoreText, and Apple lists SF Arabic as part of the
system font (read). Not confirmed: Windows and macOS, and Linux machines without an Arabic font
installed.

## 2. A bundled Arabic font: candidates, licences, sizes and Vite

### What the records already say

- ADR-0018 d5: *"nothing loaded from another server: fonts, icons and scripts are bundled"*.
  `docs/spec.md` §3.5.3: *"a type scale on the system font stack (no web font is downloaded —
  ADR-0018 d5)"*. The Privacy Policy (`docs/legal/privacy-policy.md:179`): *"PeerConnect loads no
  fonts, scripts, images or other content from other websites"*. A bundled font file is fetched
  from PeerConnect's own origin. (These are the records' words, quoted; nothing here changes them.)
- The CSP sent by `proxy/templates/default.conf.template:18` (and `docs/spec.md` §3.10) has
  `font-src 'self'`.

### The candidates

How they were found: a search of the `google/fonts` repository for `subsets: "arabic"` returned 60
families (a search can miss files); 29 of them list the category `SANS_SERIF`. The table measures
eight of those: two well-known families (Noto Sans Arabic, IBM Plex Sans Arabic) and six others
with several weights. It is a sample, not a ranking. Sizes are bytes, measured with fontTools 4.66.1
at `6692879`. *Arabic + Latin* keeps the code points of Google Fonts' own `arabic` (1,511)
and `latin` (235) subset files plus U+202F, U+200F and U+2009, with fontTools' default layout
features plus `tnum`, `lnum` and `pnum`, hinting kept. The SPA uses weights 400 (normal), 500
(`font-medium`) and 600 (`font-semibold`), and no `font-bold`.

| Family (version) | Weights in the files | woff2, whole file | woff2, Arabic + Latin | woff2, Arabic only | Notes (read in the files) |
| --- | --- | --- | --- | --- | --- |
| [Noto Sans Arabic](https://github.com/google/fonts/tree/66928797f271fed5ee428544e7229685e2d90127/ofl/notosansarabic) (2.012) | variable, 100–900, width 62.5–100 | 361,724 | 343,200 | 279,044 | **101,864** limited to weights 400–600 and width 100; has U+202F; Arabic-Indic digits all 572 units wide, `tnum` present; tall line metrics (ascent 1.374 em, descent 0.738 em) |
| [IBM Plex Sans Arabic](https://github.com/google/fonts/tree/66928797f271fed5ee428544e7229685e2d90127/ofl/ibmplexsansarabic) (1.101) | static 100–700, one file each | 71,604 (400) · 75,432 (500) · 75,892 (600) | 55,412 · 59,080 · 59,516 (**174,008** for 400+500+600) | 38,644 · 41,072 · 41,268 | **Reserved Font Name "Plex"**; no U+202F; digits of different widths, no `tnum` |
| [Cairo](https://github.com/google/fonts/tree/66928797f271fed5ee428544e7229685e2d90127/ofl/cairo) (3.130) | variable, 200–1000, slant −11–11 | 176,964 | 116,664 | 58,172 | **40,000** limited to 400–600, slant 0; no U+202F, no `tnum` |
| [Tajawal](https://github.com/google/fonts/tree/66928797f271fed5ee428544e7229685e2d90127/ofl/tajawal) (1.700) | static 200, 300, 400, 500, 700, 800, 900 (**no 600**) | 20,788 (400) · 20,692 (500) · 20,980 (700) | 17,568 · 17,044 · 17,444 | 8,440 · 8,332 · 8,516 | no U+066B or U+066C (the Arabic decimal and thousands separators that `ar-LB` numbers use); `font-semibold` would get the 700 file (CSS Fonts 4 L4601) |
| [Vazirmatn](https://github.com/google/fonts/tree/66928797f271fed5ee428544e7229685e2d90127/ofl/vazirmatn) (33.003) | variable, 100–900 | 110,888 | 76,596 | 44,308 | 54,608 limited to 400–600; has U+202F and `tnum` |
| [Rubik](https://github.com/google/fonts/tree/66928797f271fed5ee428544e7229685e2d90127/ofl/rubik) (2.300) | variable, 300–900, plus an italic file | 112,508 | 64,224 | 30,876 | 60,744 limited to 400–600; also Hebrew and Cyrillic; no U+202F |
| [Readex Pro](https://github.com/google/fonts/tree/66928797f271fed5ee428544e7229685e2d90127/ofl/readexpro) (1.205) | variable, 160–700, `HEXP` 0–100 | 122,348 | 81,600 | 36,820 | 35,268 limited to 400–600; **Reserved Font Name "RevReading Lexend"**; no U+202F |
| [Almarai](https://github.com/google/fonts/tree/66928797f271fed5ee428544e7229685e2d90127/ofl/almarai) (1.10) | static 300, 400, 700, 800 (**no 500, no 600**) | 49,264 (400) · 50,524 (700) | 46,360 · 47,664 | 31,032 · 32,184 | no `œ`, `Œ`, `Ÿ`; no U+202F |

All eight cover the 36 basic Arabic letters, the eight vowel marks (U+064B–U+0652), the
Arabic-Indic digits, the Arabic comma and question mark, and all 32 accented French letters except
where noted. For scale, **run:** the SPA's own `vite build` at `0d20fcb` emits 377.63 kB of
JavaScript (120.92 kB gzip) and 28.98 kB of CSS (6.51 kB gzip). woff2 files are already compressed.

### Licence (read)

- **All eight are under the SIL Open Font License 1.1** (`license: "OFL"` in each `METADATA.pb`,
  and each `OFL.txt`). The OFL allows bundling with software *"provided that each copy contains the
  above copyright notice and this license"*, as a file or in the font's metadata
  ([`OFL.txt` L56–61](https://github.com/google/fonts/blob/66928797f271fed5ee428544e7229685e2d90127/ofl/notosansarabic/OFL.txt#L56-L61)).
- **Subsetting makes a Modified Version.** A Modified Version is any derivative made *"by
  adding to, deleting, or substituting … or by changing formats"*
  ([L39–42](https://github.com/google/fonts/blob/66928797f271fed5ee428544e7229685e2d90127/ofl/notosansarabic/OFL.txt#L39-L42)),
  and the FAQ answers *"Is subsetting a webfont considered modification? Yes."* (entry 2.6).
  A Modified Version may not use a Reserved Font Name as *"the primary font name as presented to
  the users"*
  ([L63–66](https://github.com/google/fonts/blob/66928797f271fed5ee428544e7229685e2d90127/ofl/notosansarabic/OFL.txt#L63-L66)).
  IBM Plex Sans Arabic reserves "Plex"
  ([`OFL.txt` L1](https://github.com/google/fonts/blob/66928797f271fed5ee428544e7229685e2d90127/ofl/ibmplexsansarabic/OFL.txt#L1));
  Readex Pro reserves "RevReading Lexend"
  ([`OFL.txt` L1](https://github.com/google/fonts/blob/66928797f271fed5ee428544e7229685e2d90127/ofl/readexpro/OFL.txt#L1)).
  The other six declare none.
- FAQ entries 2.2 and 2.2.1: a WOFF or WOFF2 conversion is not a modification *"only if the original
  font data remains unchanged except for WOFF compression"* and the font's metadata is kept.
- **Run:** fontTools' subsetter, with its defaults, kept the font's name records 0–6 (record 0 is
  the copyright notice) and dropped records 13 and 14, the licence text and its URL.

### What Vite 8.3.1 does with the file (run and read)

- **Run:** a throwaway app with the SPA's plugins and an `@font-face` pointing at the 101,864-byte
  Noto Sans Arabic subset. `vite build` emitted `dist/assets/noto-sans-arabic-400-600-BsCkxzSK.woff2`,
  a file name with a content hash. It rewrote the CSS to
  `url(/assets/noto-sans-arabic-400-600-BsCkxzSK.woff2)`. It added no `<link rel="preload">`.
- **Read:** a referenced file smaller than `build.assetsInlineLimit` is inlined as a base64 `data:`
  URL. The default is 4096 bytes
  ([`constants.ts` L213](https://github.com/vitejs/vite/blob/v8.3.1/packages/vite/src/node/constants.ts#L213),
  [`asset.ts` L730–759](https://github.com/vitejs/vite/blob/v8.3.1/packages/vite/src/node/plugins/asset.ts#L730-L759),
  [docs L91–96](https://github.com/vitejs/vite/blob/v8.3.1/docs/config/build-options.md#L91-L96)).
  `woff2` is one of the file types Vite treats as an asset
  ([`constants.ts` L179](https://github.com/vitejs/vite/blob/v8.3.1/packages/vite/src/node/constants.ts#L179)).
- **Run, served with the SPA's exact CSP header:**

  | Build | Page text | Chrome 154 | Firefox 157 |
  | --- | --- | --- | --- |
  | hashed file, `unicode-range` limited to Arabic | English | no font request | no font request |
  | | French | no font request | no font request |
  | | Arabic | one request; the bundled face drew the Arabic (CDP: "web font") | one request; widths changed with the face |
  | the same font forced inline (`assetsInlineLimit` raised) | every page | **CSP refused the `data:` font, console error** | **CSP refused the `data:` font, console error** |

  With the bundled variable font, 400, 500 and 600 gave three different widths in both browsers
  (222.1, 228.4 and 235.4 px in Chrome), so all three weights were real. The browser fetches a
  `unicode-range` face only for code points in its range
  ([CSS Fonts 4 L3464–3469](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-fonts-4/Overview.bs#L3464-L3469)).
  The subject requires a console with no warnings or errors (`document/en.subject.md:318`).

Rules in: a same-origin woff2 file under the current CSP, with a `unicode-range` that covers Arabic
alone. It is fetched by any page that shows a character in its `unicode-range`, so an English or
French page with an Arabic display name, Post or Direct Message on it fetches it too
(`PersonName.tsx:11` shows a name as written); in the run, only the Arabic page did, since the
English and French pages had no Arabic on them. Rules out: a font inlined as `data:` under the current
`font-src 'self'`. Rules out, for a subset: keeping the names "Plex" or "RevReading Lexend".

## 3. Digits: CLDR's default and what `Intl` gives

### CLDR's default numbering system, per release (read)

UTS #35 says `<defaultNumberingSystem>` *"indicates which numbering system should be used"*
([`tr35-numbers.md` L158–164](https://github.com/unicode-org/cldr/blob/release-48-2/docs/ldml/tr35-numbers.md#L158-L164)),
and gives `ar-u-nu-latn` as the way to *"select Arabic language using western digits 0-9"*
([L191](https://github.com/unicode-org/cldr/blob/release-48-2/docs/ldml/tr35-numbers.md#L191)).
`↑↑↑` in the source files means "inherit from the parent locale"
([`tr35.md` L2068–2077](https://github.com/unicode-org/cldr/blob/release-48-2/docs/ldml/tr35.md#L2068-L2077));
the parent of `ar` is `root`, whose default is `latn`
([`root.xml` L3479](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/root.xml#L3479)).
`arab` is `٠١٢٣٤٥٦٧٨٩` and `latn` is `0123456789`
([`numberingSystems.xml` L13, L58](https://github.com/unicode-org/cldr/blob/release-48-2/common/supplemental/numberingSystems.xml#L13)).

| CLDR release | `ar` | `ar_LB`, `ar_EG`, `ar_SA` | `ar_AE` | `ar_MA` | `fr` |
| --- | --- | --- | --- | --- | --- |
| 36 – 39 | `arab` | `arab` | `arab` | `latn` | `latn` |
| 40 – 43 | `arab` | `arab` | `latn` | `latn` | `latn` |
| 44 – 45 | `arab` | inherit (so `arab`) | `latn` | `latn` | inherit (`latn`) |
| **46** – 48.2, and 49 beta 3 | **inherit, so `latn`** ([46](https://github.com/unicode-org/cldr/blob/release-46/common/main/ar.xml#L6005), [48.2](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/ar.xml#L6099-L6102)) | `arab` ([`ar_LB.xml` L114](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/ar_LB.xml#L114)) | inherit (`latn`) | inherit (`latn`) | inherit (`latn`) |

- **The change:** commit
  [`c149724`](https://github.com/unicode-org/cldr/commit/c14972450980b430f0105999610a377e0ed5e994)
  (2024-05-01, [PR #3678](https://github.com/unicode-org/cldr/pull/3678), ticket CLDR-17553),
  *"Change default numbering system for ar.xml to latn"*, first released in CLDR 46 (2024-10-24).
  It set `arab` explicitly in 21 country locales: BH, DJ, EG, ER, IL, IQ, JO, KM, KW, **LB**, MR,
  OM, PS, QA, SA, SD, SO, SS, SY, TD and YE. AE, DZ, EH, LY, MA and TN now inherit `latn`. The
  [CLDR 46 release note](https://github.com/unicode-org/cldr/blob/release-48-2/docs/site/downloads/cldr-46.md)
  does not mention it (searched for "Arabic" and "numbering").
- `ar.xml` still lists `arab` as its `native` system
  ([L6102](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/ar.xml#L6102)).
- The W3C task force describes the regional split: European digits in *"Western Arabic-speaking
  countries; e.g. Algeria or Morocco"*, Arabic-Indic in *"Eastern Arabic-speaking countries; e.g.
  Egypt, Saudi Arabia, Iraq"*
  ([alreq L1405, L1439](https://github.com/w3c/alreq/blob/670d38e72099e2bee6fc17a7e9d02b1aab932d77/index.html#L1356-L1473)).
  Its gap analysis adds that there is *"a considerable diverging trend from these recommendations
  observable on the web, digital products, and in user-generated content"*
  ([gap analysis L433](https://github.com/w3c/alreq/blob/670d38e72099e2bee6fc17a7e9d02b1aab932d77/gap-analysis/index.html#L428-L436)).

### Which CLDR each runtime ships (read)

| Runtime | ICU | CLDR | Default for `ar` | Source |
| --- | --- | --- | --- | --- |
| Node 22.22.1 | 78.2 | 48.0 | `latn` (run) | `process.versions` |
| Chrome 154.0.8037.97 | 78.2 | 48 | `latn` (run) | [`icuver.txt`](https://chromium.googlesource.com/chromium/deps/icu/+/6ebb40c594776cc2c21ea14df85a2a89a328b364/source/data/misc/icuver.txt); its list of local patches names no Arabic or numbering change |
| Firefox 157.0 | 78.3 | 48 | `latn` (run) | [`icuver.txt`](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_157_0_RELEASE/intl/icu/source/data/misc/icuver.txt) |
| Firefox ESR 153.4 / 140.9.1 / 128.9 | 78.3 / 77.1 / 73.1 | 48 / 47 / **43** | `latn` / `latn` / **`arab`** | `icuver.txt` at each ESR release tag |
| Safari: Apple's ICU in tag `macos-265` / `macos-261` / `macos-156` / `macos-145` | 78.1 / 76.1 / 76.1 / 74.1 | 48 / 46 / 46 / **44** | `latn` / `latn` / `latn` / **`arab`** | Apple's `ar.txt`, e.g. [`default{"latn"}` at `b7321cf`](https://github.com/apple-oss-distributions/ICU/blob/b7321cfa96c67c5985d04e0ae7fa0f5a95e29ba7/icu/icu4c/source/data/locales/ar.txt#L41) and [`default{"arab"}` at `c9f69ca`](https://github.com/apple-oss-distributions/ICU/blob/c9f69cae28475b0a32288a48fe223d07b1be4fd3/icuSources/data/locales/ar.txt#L24) |

On Apple platforms JavaScriptCore links the system ICU (`-licucore`,
[`Base.xcconfig` L167](https://github.com/WebKit/WebKit/blob/963125d1f1440dca433af8e41e3530abd975dd10/Source/JavaScriptCore/Configurations/Base.xcconfig#L167)),
so Safari's digits follow the ICU of the macOS it runs on. The tag names are Apple's
(`macos-265` and so on); Safari was not run.

### What `Intl` gives (run: Node 22.22.1, Chrome 154, Firefox 157, identical)

Invisible marks are written as code points.

| Locale tag | Digits | 1234567.89 | 0.42 as a percent | −42 |
| --- | --- | --- | --- | --- |
| `ar` | `latn` | `1,234,567.89` | `42` U+200E `%` U+200E | U+200E `-42` |
| `ar-LB` | `arab` | `١٬٢٣٤٬٥٦٧٫٨٩` (U+066C, U+066B) | `٤٢٪` U+061C | U+061C `-٤٢` |
| `ar-u-nu-latn` | `latn` | same as `ar` | same as `ar` | same as `ar` |
| `ar-LB-u-nu-latn` | `latn` | **`1.234.567,89`** | `42` U+200E `%` U+200E | U+200E `-42` |
| `ar-EG`, `ar-SA` | `arab` | as `ar-LB` | as `ar-LB` | as `ar-LB` |
| `ar-AE` | `latn` | `1,234,567.89` | as `ar` | as `ar` |
| `ar-MA` | `latn` | `1.234.567,89` | as `ar` | as `ar` |
| `fr` | `latn` | `1` U+202F `234` U+202F `567,89` | `42` U+00A0 `%` | `-42` |
| `fr-u-nu-arab` | `arab` | `١٬٢٣٤٬٥٦٧٫٨٩` | `٤٢٪` U+061C | U+061C `-٤٢` |

- **What `-u-nu-latn` changes:** on `ar` (CLDR 48), nothing, because `latn` is already the default.
  On `ar-LB` it changes the digits and the separators: `ar_LB.xml` defines its own `latn` symbols,
  `,` for decimals and `.` for groups
  ([L115–117](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/ar_LB.xml#L115-L117)).
  It also changes the digits in dates and times (section 4), not the month names.
- **The rules (ECMA-402, read):** `nu` is the one extension key for `NumberFormat`, and the
  `numberingSystem` option maps to it
  ([`numberformat.html` L238–240](https://github.com/tc39/ecma402/blob/730ca2b88c305862db7be2f83c510dcca33ab48c/spec/numberformat.html#L238-L240));
  `DateTimeFormat` reads `ca`, `hc` and `nu`
  ([`datetimeformat.html` L199–205](https://github.com/tc39/ecma402/blob/730ca2b88c305862db7be2f83c510dcca33ab48c/spec/datetimeformat.html#L199-L205)).
  `ResolveLocale` starts from the locale's first listed value, takes a supported `-u-nu-` value,
  then lets a supported option win
  ([`negotiation.html` L255–283](https://github.com/tc39/ecma402/blob/730ca2b88c305862db7be2f83c510dcca33ab48c/spec/negotiation.html#L255-L283)).
  `arab` (U+0660–U+0669) is in the table of required numbering systems
  ([L889–911](https://github.com/tc39/ecma402/blob/730ca2b88c305862db7be2f83c510dcca33ab48c/spec/numberformat.html#L889-L911)).
- **Run, both browsers and Node:** `new Intl.NumberFormat('ar-u-nu-arab', { numberingSystem: 'latn' })`
  gave Western digits. `{ numberingSystem: 'latn' }` on `ar` resolved to the locale `ar`, while the
  tag `ar-u-nu-latn` resolved to `ar-u-nu-latn`. An unknown value (`ar-u-nu-foo`) was ignored.
  `Number.prototype.toLocaleString` gave the same results as `Intl.NumberFormat`.
- **Run:** French and Arabic both group four-digit numbers: `fr` gives `1` U+202F `254`, `ar` gives
  `1,254`. `{ useGrouping: false }` gives `1254`.

Rules in: either digit style, by the tag passed to `Intl` (`ar` against `ar-LB`) or by `-u-nu-` or
the `numberingSystem` option. Rules out: assuming that plain `ar` gives the same digits in every
browser. Firefox ESR 128, and Safari with the ICU of Apple's `macos-145` tag, give Arabic-Indic
digits (read); current Chrome, Firefox and Node give Western digits (run).

## 4. Dates in English, French and Arabic

**Run, identical in Node 22.22.1, Chrome 154 and Firefox 157,** for 2026-10-13 14:05 UTC and
2026-01-05 09:07 UTC, with `timeZone: 'UTC'`. RLM is U+200F.

| Style | `en` | `en-GB` | `fr` | `ar` | `ar-LB` |
| --- | --- | --- | --- | --- | --- |
| `short`, 5 Jan | `1/5/26` | `05/01/2026` | `05/01/2026` | `5`RLM`/1`RLM`/2026` | `٥`RLM`/١`RLM`/٢٠٢٦` |
| `medium`, 5 Jan | `Jan 5, 2026` | `5 Jan 2026` | `5 janv. 2026` | `05`RLM`/01`RLM`/2026` | `٠٥`RLM`/٠١`RLM`/٢٠٢٦` |
| `long` | `October 13, 2026` | `13 October 2026` | `13 octobre 2026` | `13 أكتوبر 2026` | `١٣ تشرين الأول ٢٠٢٦` |
| `full` | `Tuesday, October 13, 2026` | `Tuesday, 13 October 2026` | `mardi 13 octobre 2026` | `الثلاثاء، 13 أكتوبر 2026` | `الثلاثاء، ١٣ تشرين الأول ٢٠٢٦` |
| time, `short` | `2:05 PM` | `14:05` | `14:05` | `2:05 م` | `٢:٠٥ م` |
| hour cycle | `h12` | `h23` | `h23` | `h12` | `h12` |
| relative, −3 days | `3 days ago` | `3 days ago` | `il y a 3 jours` | `قبل 3 أيام` | `قبل ٣ أيام` |

- **Calendar:** `gregory` for every locale above, and for `ar-SA` and `ar-EG`. CLDR lists Gregorian
  first for Lebanon and for the default region `001`
  ([`supplementalData.xml` L4671–4672](https://github.com/unicode-org/cldr/blob/release-48-2/common/supplemental/supplementalData.xml#L4671-L4672)).
  **Run:** `ar-LB-u-ca-islamic` gives the Hijri date `٣ جمادى الأولى ١٤٤٨ هـ`.
- **Month names:** `ar` uses `يناير … أكتوبر … ديسمبر`
  ([`ar.xml` L1764–1775](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/ar.xml#L1764-L1775));
  `ar-LB` uses `كانون الثاني، شباط، آذار، نيسان، أيار، حزيران، تموز، آب، أيلول، تشرين الأول، تشرين الثاني، كانون الأول`
  ([`ar_LB.xml` L51–62](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/ar_LB.xml#L51-L62)).
  `ar-LB-u-nu-latn` keeps the `ar-LB` month names with Western digits: `13 تشرين الأول 2026`.
  French month and weekday names are lower case (`octobre`, `mardi`); the medium style abbreviates
  with a full stop (`janv.`, `oct.`).
- **Patterns:** Arabic `short` is `d‏/M‏/y` and `medium` is `dd‏/MM‏/y`, with RLM after the day and
  after the month
  ([`ar.xml` L2044–2050](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/ar.xml#L2030-L2076));
  `full` puts an Arabic comma (U+060C) after the weekday; times are `h:mm a`. French `short` is
  `dd/MM/y` and `full` is `EEEE d MMMM y`
  ([`fr.xml` L3197–3217](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/fr.xml#L3197-L3217)).
  Date with time: `fr` gives `mardi 13 octobre 2026 à 14:05`, `ar` gives `… في 2:05 م`.
- **How Arabic numeric dates display (run, Chrome and Firefox, screenshots checked by eye):**
  - In a right-to-left box, `5`RLM`/1`RLM`/2026` shows as `2026/1/5` when read left to right, which
    is day, month, year read right to left.
  - In a **`dir="ltr"` box** (for example a chart box set to `dir="ltr"`, one of the options in the
    #140 findings), the same `ar` string shows as **`52026/1/`**. The medium style shows as
    `052026/01/`, and the long `13 أكتوبر 2026` shows as `13 2026 أكتوبر`.
  - The `ar-LB` strings, with Arabic-Indic digits, kept the same order in both boxes (`٢٠٢٦/١/٥`).
- **English:** `en` resolves to American patterns (month first, 12-hour). `en-GB` is day first and
  24-hour. **Run:** only in English 12-hour times did the runtimes differ: Node puts U+202F before
  `PM`, Chrome and Firefox put a plain space.

Rules in: any of these patterns for #146 to choose from, and `-u-ca-` for another calendar.
Rules out: showing `ar` numeric dates inside a left-to-right box without isolating them.

## 5. The SPA's typographic styles on Arabic text

### What `web/src` uses at `0d20fcb` (read, token scan)

| Style | Where | What it does to Arabic (run, Chrome 154 and Firefox 157) |
| --- | --- | --- |
| `uppercase` | `DataTable.tsx:164` (header cell), `:173` (sort button) | nothing: Arabic has no case. French: `COMPÉTENCE`, `ÉLÈVE INSCRIT À` |
| `tracking-wide` (0.025em) | `DataTable.tsx:164` | nothing between Arabic letters; applied at spaces only |
| `tracking-tight` (−0.025em) | `legal/markdown.tsx:138` (the `h1`) | same: nothing between Arabic letters |
| `font-semibold` (600) | 18 lines, among them `Banner.tsx:40`, `Card.tsx:18`, `Modal.tsx:124`, `RoleLabel.tsx:8`, `DataTable.tsx:164`, `layout.tsx:19`, `legal/markdown.tsx:27` (`strong`), `:107`, `:136`–`:140` | Linux: fake bold in Chrome, real Bold in Firefox (section 1) |
| `font-medium` (500) | 13 lines, among them `buttonClasses.ts:26` (every Button), `field.tsx:58` (error text), `:92` (field label), `Tabs.tsx:75`, `SkillChip.tsx:28`, `ProgressBar.tsx:24` | Linux: Regular in both (section 1) |
| `italic` | `legal/markdown.tsx:33` (`*emphasis*`) | the Regular face slanted, in both |
| `leading-relaxed` (1.625) | `legal/markdown.tsx:103` (tables), `:213` (the article) | room for marks (below) |
| `text-xs` … `text-3xl` with their own line heights | `tokens.css:80–93`, used 47 times | below |
| `truncate` (`overflow: hidden`) | `Button.tsx:51`, `ProgressBar.tsx:24` | cut slivers about one device pixel wide off Arabic button labels, and the top and bottom of vowel marks (below) |
| `whitespace-nowrap` | `DataTable.tsx:164` | header stays on one line |
| `tabular-nums` | `DataTable.tsx:205`, `FileDrop.tsx:289`, `Pagination.tsx:60`, `ProgressBar.tsx:27` | no effect on Arabic-Indic digits with the installed Linux font (section 1) |
| `font-mono` | `legal/markdown.tsx:24` (inline code) | DejaVu Sans Mono on Linux (section 1) |

No other case, tracking, leading, style or line-clamp utility appears. `lowercase` appears only in
two comments in `legal/parse.ts`.

### Letter spacing

- **Spec:** CSS Text 3 calls Arabic a cursive script that does *"not admit gaps between their
  letters"*
  ([L7556–7571](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-text-3/Overview.bs#L7556-L7571)).
  A browser may turn letter spacing into cursive elongation. If it cannot do that *"without
  breaking its cursive connections, it must not apply spacing"* between that script's letters, and
  *"Authors should avoid applying 'letter-spacing' to cursive scripts unless they are prepared to
  accept non-interoperable results"*
  ([L6510–6591](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-text-3/Overview.bs#L6510-L6591);
  the same text in CSS Text 4,
  [L10356–10436](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-text-4/Overview.bs#L10356-L10436)).
  alreq: *"Moving two joined characters closer to or further from each other creates undesirable
  results"*
  ([L1141–1145](https://github.com/w3c/alreq/blob/670d38e72099e2bee6fc17a7e9d02b1aab932d77/index.html#L1141-L1145)),
  and Arabic stretching *"[does] not correspond to letter-spacing in non-cursive scripts"*
  ([L1820–1836](https://github.com/w3c/alreq/blob/670d38e72099e2bee6fc17a7e9d02b1aab932d77/index.html#L1820-L1836)).
- **Run (16 px text, widths in px, the same in both browsers to 0.05 px):**

  | `letter-spacing` | `المستخدمين` (one word) | `اسم المهارة` (two words) | `étudiants` |
  | --- | --- | --- | --- |
  | 0 | 81.55 | 71.2 | 70.97 |
  | 0.025em (`tracking-wide`, 0.4 px) | 81.55 | 71.6 | 74.57 |
  | −0.025em (`tracking-tight`) | 81.55 | 70.8 | 67.37 |
  | 0.1em | 81.55 | 72.8 | 85.37 |
  | 8px | 81.55 | 79.2 | 142.97 |

  The Arabic word never changed width; the two-word phrase grew by one step, at the space. The
  French word grew by nine steps, one per letter. Screenshots show the Arabic joins intact.
- **Read, why:** Chromium skips letter spacing for characters in a cursive script except spaces,
  behind a runtime flag with status `stable`
  ([`shape_result_spacing.cc` L118–128](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/fonts/shaping/shape_result_spacing.cc#L118-L128),
  [`shape_result.cc` L975–990](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/fonts/shaping/shape_result.cc#L975-L990),
  [`runtime_enabled_features.json5` L3575–3576](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/runtime_enabled_features.json5#L3575-L3576)).
  Firefox skips it for cursive-script characters
  ([`nsTextFrame.cpp` L4196–4214](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_157_0_RELEASE/layout/generic/nsTextFrame.cpp#L4196-L4214)).
- **Safari (read, not run):** WebKit adds letter spacing to every glyph that has an advance
  ([`ComplexTextController.cpp` L812–817](https://github.com/WebKit/WebKit/blob/963125d1f1440dca433af8e41e3530abd975dd10/Source/WebCore/platform/graphics/ComplexTextController.cpp#L812-L817)).
  No cursive-script exception was found in that file, `WidthIterator.cpp` or `FontCascade.cpp`
  (searched for "cursive" and "Arabic").

### Upper case

- **Spec:** `uppercase` *"Puts all letters in uppercase"*, with Unicode's full case mappings and
  the content language's own rules from `SpecialCasing.txt`
  ([CSS Text 3 L710, L913–924](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-text-3/Overview.bs#L913-L924)),
  and it *"must not affect the content of a plain text copy & paste operation"*
  ([L644](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-text-3/Overview.bs#L644)).
  `SpecialCasing.txt` 17.0.0 has language rules for Lithuanian, Turkish and Azeri only. The alreq
  gap analysis marks *"Case & other character transforms"* as not applicable to Arabic
  ([L276–277](https://github.com/w3c/alreq/blob/670d38e72099e2bee6fc17a7e9d02b1aab932d77/gap-analysis/index.html#L276-L277)).
- **Run, both browsers (`innerText` returns the transformed text):** Arabic came back unchanged.

### Bold and italic

- Section 1 has what each browser drew. CSS Fonts 4 lets browsers synthesize bold and oblique faces
  ([L1016–1020, L1338–1342](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-fonts-4/Overview.bs#L1016-L1020)).
  It notes that *"Fonts that support a mixture of scripts will sometimes omit specific scripts, such
  as Arabic, from the set of glyphs supported in the italic face"*
  ([L1356–1366](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-fonts-4/Overview.bs#L1356-L1366)).
- The alreq task force's open issue [#93](https://github.com/w3c/alreq/issues/93) (2017) says
  *"using slanted text is not a traditional way of emphasis/quotation/etc, but a half-baked
  borrowing from Latin-script Italic/Oblique methods"*. Issue
  [#218](https://github.com/w3c/alreq/issues/218) (2020) says some schools of Arabic typography
  slant italic text to the left, and CSS has no control for the slant's direction. Both browsers
  slanted the Arabic to the right (run, by eye).
- alreq at `670d38e` says nothing about bold.

### Line heights and vowel marks

- **The line heights (read):** `tokens.css:80–93`. Line height divided by font size:
  `text-xs` 12/16 px (1.33), `text-sm` 14/20 (1.43), `text-base` 16/24 (1.5), `text-lg` 18/24 (1.33),
  `text-xl` 21.6/28 (1.30), `text-2xl` 25.9/32 (1.23), `text-3xl` 31.1/36 (1.16). The page default
  is 1.5 (`preflight.css` L30); `leading-relaxed` is 1.625
  ([`theme.css` L394](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/theme.css#L394)).
  alreq: *"Arabic ascenders and descenders extend much further than those of the Latin script"*
  ([L1846–1848](https://github.com/w3c/alreq/blob/670d38e72099e2bee6fc17a7e9d02b1aab932d77/index.html#L1846-L1848)).
  The installed Noto Sans Arabic declares an ascent of 1.374 em and a descent of 0.738 em; Noto
  Sans declares 1.069 and 0.293.
- **Run:** in both browsers every paragraph was exactly *lines × line height* tall, so line boxes
  did not grow. How far the glyphs reached past their own line box, in px (positive means outside;
  ink from canvas `measureText` with the element's font, the baseline from a marker element):

  | Size | Plain Arabic (`لإلغاء آخر طلب صداقة اضغط هنا`), above / below | Arabic with vowel marks, above / below | French with `É Ç Ÿ g j p q y`, above / below |
  | --- | --- | --- | --- |
  | `text-xs` | inside / 1 | 3–3.1 / 2–2.2 | 0–0.5 / inside |
  | `text-sm` | inside / inside | 3.5–3.6 / 1–1.5 | 0 / inside |
  | `text-base` | inside / inside | 2.1–3 / 0–1.3 | inside / inside |
  | `text-lg` | inside / 0 | 5.6–6.5 / 2.5–2.8 | inside / inside |
  | `text-xl` | inside / 0 | 6.5–7 / 2.8–3 | 0 / inside |
  | `text-2xl` | inside / 1–3 | 6.6–9 / 4–6 | inside / 0–1 |
  | `text-3xl` | inside / 2–3 | 10–11 / 6–7.4 | 0–1 / 1 |

  A range covers both browsers. "Inside" means the glyphs stayed within the line box.
- **Seen in screenshots (both browsers, line boxes shaded):** with vowel marks at `text-2xl` and
  `text-3xl`, the shadda and kasra over a lām (a tall letter) in line 2 sit inside line 1's band,
  between two words of line 1, so they look like part of the wrong line. At `text-sm` with marks, and for the
  plain Arabic `h1` at `text-3xl` (the legal page title style), nothing touched.
- **`truncate` (run):** each Arabic Button label was screenshotted with `overflow: hidden` (as built)
  and with `overflow: visible`. In Chrome, the `sm`, `md` and `lg` labels differed by 4–10 device
  pixels at the left and right ends of the text (glyph ink past the text's edge); in Firefox the
  `sm` and `md` labels differed by 1–3 and the `lg` label not at all. In both, the label with vowel
  marks (`إِلْغَاء`) also lost the top row of the sukūn and the bottom row of the kasra (22–25 device
  pixels). The French label and the Arabic ProgressBar label were identical in both. At scale 2,
  one device pixel is half a CSS pixel.

Rules in: `uppercase` and `tracking-*` classes on shared components that also show French, since
they change nothing in Arabic in Chrome and Firefox (run). Rules out, for vowel-marked Arabic at
`text-2xl` and `text-3xl`: assuming the token line heights keep each line's marks inside its line.
Not confirmed: Safari's letter spacing on Arabic (source says it is applied).

## 6. French text

### What `Intl` writes (run, Node, Chrome and Firefox identical)

- **Numbers:** `1` U+202F `234` U+202F `567,89`. `fr.xml` sets the group separator to U+202F and the
  decimal to `,`
  ([L7896–7898](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/fr.xml#L7896-L7898)).
  The percent pattern is `#,##0` U+00A0 `%`
  ([L8060](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/fr.xml#L8060)),
  so `42` U+00A0 `%`. Compact: `13` U+00A0 `k`. Units: `1,5` U+202F `Mo` and `512` U+202F `ko`
  for megabytes and kilobytes.
- **Four-digit numbers are grouped:** `1` U+202F `254`. CLDR's root sets `minimumGroupingDigits` to
  1 and `fr` inherits it
  ([`root.xml` L3483](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/root.xml#L3483),
  [`fr.xml` L7808](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/fr.xml#L7808)).
  The Académie française: *"on sépare les milliers par une espace insécable dans les nombres
  exprimant une quantité"*, but *"dans les nombres ayant fonction de numérotage (pages, dates,
  articles de code), les chiffres ne sont jamais séparés"*.
- **Dates:** section 4.
- **The SPA today (read):** `web/src` at `0d20fcb` calls no `Intl` formatter and no
  `toLocaleString`. It writes numbers in English form by hand: `${percent}%` in
  `ProgressBar.tsx:27`, `${step}%` in `FileDrop.tsx:218`, and `formatBytes` (`FileDrop.tsx:70–73`),
  which writes `B`, `KB` and `MB` with a decimal point from `toFixed(1)`. `Pagination.tsx:61`
  writes `Page {safePage} of {count}`.

### Upper case and accents

- **Run, both browsers, `lang="fr"`:** `élève à côté, œuvre, ça, être, Ève, île, naïve, aÿ, straße, ﬁn`
  became `ÉLÈVE À CÔTÉ, ŒUVRE, ÇA, ÊTRE, ÈVE, ÎLE, NAÏVE, AŸ, STRASSE, FIN`. Accents and the cedilla
  stay; `ß` becomes `SS` and the `ﬁ` ligature `FI` (Unicode's full case mappings). For comparison,
  `lang="tr"` turned `istanbul` into `İSTANBUL`.
- The Académie française: *"On veille donc, en bonne typographie, à utiliser systématiquement les
  capitales accentuées, y compris la préposition À"*.
- `uppercase` with `tracking-wide` in `DataTable.tsx:164` spaces the French letters by 0.3 px each:
  0.025em of `text-xs`, which is 12 px (`tokens.css:80`). Section 5's 0.4 px is its 16 px probe.

### Spaces before `: ; ! ?` and inside « »

- **The rules (two traditions):**
  - **Québec, first-party:** the OQLF puts a no-break space before `:`, `%` and `»` and after `«`,
    and *"opte pour l’absence d’espace devant le point-virgule, le point d’exclamation et le point
    d’interrogation"*. Its table gives *"Pas d’espace ou une espace fine"* before `; ! ?`.
  - **France, not from a primary source:** the reference is the Imprimerie nationale's *Lexique des
    règles typographiques*, a printed book that was not available to read. Its rules are known here
    only as quoted by the Unicode UDHR project's
    [notes on French](https://web.archive.org/web/20201112013601/http://unicode.org/udhr/n/notes_fra.html),
    the page CSS Text 4 links to: *espace fine insécable* before `; ! ?`, *espace mots insécable*
    before `:` and inside `« »`.
  - Unicode: *"When NARROW NO-BREAK SPACE occurs in French text, it should be interpreted as an
    “espace fine insécable”"* ([UAX #14 rev. 55, GL](https://www.unicode.org/reports/tr14/tr14-55.html#GL)).
- **Browsers add nothing.** CSS Text 4's `text-autospace: punctuation` would insert U+202F and
  U+00A0 where French typography requires them
  ([L10587–10592](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-text-4/Overview.bs#L10587-L10592)).
  **Run:** `CSS.supports('text-autospace', 'punctuation')` is `false` in Chrome 154 and Firefox
  157. MDN's data lists no browser support for that value
  ([`text-autospace.json`](https://github.com/mdn/browser-compat-data/blob/v8.1.5/css/properties/text-autospace.json)).
- **Line breaks (run).** The sample `Bonjour ! Ça va ? Oui : merci ; à bientôt « ami » ! Ok ?` was
  set at every box width from 40 to 400 px. A line was counted as wrong if it began with `: ; ! ? »`
  or ended with `«`:

  | Space typed before the mark | SPA's `overflow-wrap: break-word` (`tokens.css:155`) | `overflow-wrap: normal` |
  | --- | --- | --- |
  | U+0020 (normal space) | wrong at 201 of the 361 widths (Chrome) and 202 (Firefox), from 40 to 391 px | wrong at 181 (Chrome) and 182 (Firefox) |
  | U+00A0 (no-break space) | wrong only at 41–68 px, where `Bonjour !` did not fit the box | never |
  | U+202F (narrow no-break space) | wrong only at 40–67 px, likewise | never |

  UAX #14 says not to break before `!` and `?` (class EX) or before `;` and `:` (class IS), *"even
  after spaces"* ([LB13](https://www.unicode.org/reports/tr14/tr14-55.html#LB13),
  [LB15d](https://www.unicode.org/reports/tr14/tr14-55.html#LB15d)). CSS Text 3 calls UAX #14 a
  baseline *"expected to be further tailored"*
  ([L3355–3357](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-text-3/Overview.bs#L3355-L3357)),
  but requires the no-break class GL (U+00A0 and U+202F) to be honoured
  ([L4854–4863](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-text-3/Overview.bs#L4854-L4863)).
- **Widths (run, Linux, 16 px Noto Sans):** U+202F is 2.66 px wide, U+00A0 4.17 px. Noto Sans has
  a U+202F glyph. Of the eight candidate fonts, only Noto Sans Arabic and Vazirmatn have one, and
  Google Fonts' `latin` subset file does not list U+202F
  ([`latin_unique-glyphs.nam`](https://github.com/googlefonts/nam-files/blob/2a68014b16056e965c18fd47de1f3fde9a5b0095/Lib/gfsubsets/data/latin_unique-glyphs.nam)).
  A font without the glyph sends that one character to a fallback font.

Rules in: U+00A0 and U+202F, typed into the French texts or produced by `Intl`, to keep marks with
their word (run). Rules out: relying on the browser to add French spaces, and relying on a plain
space to keep `! ? : ;` on the same line (run).

## 7. Chrome, Firefox and Safari

Run, Chrome 154 and Firefox 157 on Linux. They agreed on every formatted French and Arabic
string, every letter-spacing width, every case result, every line-break count to within one width,
and the bundled-font loading. They differed in:

| What | Chrome 154 | Firefox 157 |
| --- | --- | --- |
| Arabic at `font-semibold` with no Arabic font in the stack | Regular face thickened (fake bold) | real Bold face |
| `truncate` on the `sm`, `md`, `lg` Arabic Button labels | 10, 4 and 5 device pixels differed (`hidden` against `visible`) | 1, 3 and 0 |
| `text-autospace: insert` | not supported | supported (neither supports `punctuation`) |

Safari was not run. From source and Apple's data: its `Intl` digits follow the macOS ICU
(section 3), its `system-ui` uses CoreText's cascade list for the element's language (section 1), and
its letter spacing has no cursive-script exception in the files read (section 5).

## What this leaves open

- **Safari, macOS and Windows were not run.** Not confirmed: which face draws Arabic there; whether
  every Segoe UI weight has Arabic glyphs; Safari's letter spacing on Arabic; and whether Segoe UI
  and SF Pro have a U+202F glyph.
- **Linux without an Arabic font** (a minimal install), and a desktop session with GNOME's Ubuntu
  Sans as `system-ui`, were not run.
- **Brave was not run** (it is one of the two claimed browsers; Chrome's engine).
- **Arabic readers did not judge the screenshots.** "Reads badly" is measured here as clipping,
  overlap and fake faces, not by reading tests.
- **Only eight Google Fonts families** were measured. Fonts outside Google Fonts, and other subset
  choices (Arabic only, no hinting), were not compared for rendering.
- **France's typographic rules** come from a quotation of the Imprimerie nationale's book, not from
  the book.
- **Real PeerConnect strings** were not tested: no French or Arabic translation exists yet.
- **Recharts** text (axis numbers, dates in tick labels) was not rendered with Arabic digits or dates.

## How the experiments were run

In a scratch directory outside the repository, on Node 22.22.1 and npm 9.2.0, on Ubuntu 26.04.1 LTS
with `fonts-noto-core` 20201225-2build1 and `fonts-dejavu-core` 2.37-8build1:

- **`Intl` probes.** One script ran the same calls (`NumberFormat` with decimal, percent, compact
  and unit styles; `DateTimeFormat` with every `dateStyle` and `timeStyle`, `formatToParts`,
  `resolvedOptions`; `RelativeTimeFormat`; `Intl.Locale` methods) for `ar`, `ar-LB`, `ar-EG`,
  `ar-SA`, `ar-AE`, `ar-MA`, `fr`, `en`, `en-GB` and the `-u-nu-` variants. It ran in Node and, through
  `puppeteer-core` 25.13.0, inside each browser page. Invisible characters were written out as code
  points before comparing. 651 of 657 values matched in all three. The six that did not: the space
  before `PM` in English times (Node U+202F, the browsers U+0020; two values); the calendars listed
  by `Intl.Locale('ar').getCalendars()` and `Intl.Locale('ar-LB').getCalendars()` (Firefox leaves
  out `islamic`); and `getWeekInfo()` for `ar-LB` and `fr` (the browsers leave out `minimalDays`).
  No formatted French or Arabic string differed.
- **The gallery app.** Its packages are the install made for the #140 findings: `npm ci` from a copy
  of `web/package.json` and `web/package-lock.json`, plus Recharts 3.10.1, which these pages do not
  import. `tokens.css`, `index.css`, `design/` and `legal/` were copied unchanged from `0d20fcb`. A gallery
  page set `<html lang dir>` from the URL, as the SPA would, and rendered Arabic and French samples:
  every weight and `italic`; each style the token scan found; every text size, single-line and
  wrapped, with and without vowel marks; the SPA's `Button`, `ProgressBar` and `DataTable` with
  Arabic and French labels; letter-spacing probes; case probes; digit-width probes; a French
  line-break box; and `Intl` output in right-to-left and left-to-right boxes. `tsc -b` passed;
  `vite build` was served with `vite preview`.
- **Browsers.** `puppeteer-core` 25.13.0 drove the installed Chrome 154.0.8037.97 and Firefox 157.0
  (snap package, profile kept under the snap's own directory and deleted afterwards), both headless,
  at 1200 × 900 and device scale 2 or 3. Chrome's faces came from the DevTools protocol
  (`CSS.getPlatformFontsForNode`). Firefox's came from text widths, compared to 0.001 px with the
  same text set in each installed candidate family. Measurements used `getComputedStyle`,
  `Range.getBoundingClientRect`, `innerText`, `CSS.supports` and canvas `measureText`. Each section
  was saved as a screenshot and checked by eye; line boxes were shaded for the line-height checks.
  The `truncate` check compared pixel by pixel two screenshots of the same region, with
  `overflow: hidden` and with `overflow: visible`.
- **Fonts.** Each candidate's files and `OFL.txt` were fetched from `google/fonts` at `6692879`, each
  family in its own directory. fontTools 4.66.1 (with brotli 1.2.0) read the version, metrics,
  character map and layout features. It wrote woff2 files: whole, subset to Google Fonts' `arabic`
  and `latin` lists (plus U+202F, U+200F, U+2009), Arabic only, and, for variable fonts, limited to
  weights 400–600 with other axes at their defaults before subsetting. Sizes are the bytes written.
- **The bundled-font app.** A second throwaway app with the SPA's plugins and `tokens.css` added one
  `@font-face` (the 101,864-byte Noto Sans Arabic file, `font-weight: 400 600`, `unicode-range` on
  the Arabic blocks) in front of the system stack. It was built twice: as is, and with
  `build.assetsInlineLimit` raised so the font was inlined. Both builds were served with the
  `Content-Security-Policy` header copied from `proxy/templates/default.conf.template:18`, and loaded
  with English, French and Arabic text while font requests and console messages were recorded.
- **Baseline size.** `vite build` of the SPA itself at `0d20fcb` (with `src/shared` for the
  `@shared` alias and `docs/legal` for the legal check).
- **Static checks.** A token scanner over `web/src` (it splits each line into tokens and strips
  variant prefixes, as in the #140 findings) listed every case, tracking, leading, weight, style,
  truncation, numeric and size utility. `grep` found every `Intl`, `toLocaleString`, `%` and byte
  format. CLDR files were fetched per release tag and searched for `defaultNumberingSystem`; the
  commits that touched `ar_LB.xml` were listed from the repository's history.

## Primary sources

CLDR: `common/main/ar.xml` at
[`release-45`](https://github.com/unicode-org/cldr/blob/release-45/common/main/ar.xml#L6003),
[`release-46`](https://github.com/unicode-org/cldr/blob/release-46/common/main/ar.xml#L6005) and
[`release-48-2`](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/ar.xml) ·
[`ar_LB.xml`](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/ar_LB.xml) ·
[`fr.xml`](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/fr.xml) ·
[`root.xml`](https://github.com/unicode-org/cldr/blob/release-48-2/common/main/root.xml) ·
[`numberingSystems.xml`](https://github.com/unicode-org/cldr/blob/release-48-2/common/supplemental/numberingSystems.xml) ·
[`supplementalData.xml`](https://github.com/unicode-org/cldr/blob/release-48-2/common/supplemental/supplementalData.xml) ·
[commit `c149724`](https://github.com/unicode-org/cldr/commit/c14972450980b430f0105999610a377e0ed5e994) ·
[PR #3678](https://github.com/unicode-org/cldr/pull/3678) ·
[CLDR 46 release note](https://github.com/unicode-org/cldr/blob/release-48-2/docs/site/downloads/cldr-46.md) ·
UTS #35 [`tr35.md`](https://github.com/unicode-org/cldr/blob/release-48-2/docs/ldml/tr35.md) and
[`tr35-numbers.md`](https://github.com/unicode-org/cldr/blob/release-48-2/docs/ldml/tr35-numbers.md)

ICU as shipped:
[Chrome 154 `icuver.txt`](https://chromium.googlesource.com/chromium/deps/icu/+/6ebb40c594776cc2c21ea14df85a2a89a328b364/source/data/misc/icuver.txt) and
[`README.chromium`](https://chromium.googlesource.com/chromium/deps/icu/+/6ebb40c594776cc2c21ea14df85a2a89a328b364/README.chromium) ·
[Firefox 157 `icuver.txt`](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_157_0_RELEASE/intl/icu/source/data/misc/icuver.txt),
ESR [153.4](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_153_4_0esr_RELEASE/intl/icu/source/data/misc/icuver.txt),
[140.9.1](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_140_9_1esr_RELEASE/intl/icu/source/data/misc/icuver.txt),
[128.9](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_128_9_0esr_RELEASE/intl/icu/source/data/misc/icuver.txt) ·
Apple ICU at
[`b7321cf`](https://github.com/apple-oss-distributions/ICU/tree/b7321cfa96c67c5985d04e0ae7fa0f5a95e29ba7) (`macos-265`),
[`9e80977`](https://github.com/apple-oss-distributions/ICU/tree/9e80977766f830c93e3cdae3d5628997e1a61b63) (`macos-261`),
[`86abee3`](https://github.com/apple-oss-distributions/ICU/tree/86abee34b1ba209ab286020ed49cf6029e94c503) (`macos-156`),
[`c9f69ca`](https://github.com/apple-oss-distributions/ICU/tree/c9f69cae28475b0a32288a48fe223d07b1be4fd3) (`macos-145`), from
[`distribution-macOS`](https://github.com/apple-oss-distributions/distribution-macOS)

ECMA-402 at `730ca2b`:
[`negotiation.html`](https://github.com/tc39/ecma402/blob/730ca2b88c305862db7be2f83c510dcca33ab48c/spec/negotiation.html) ·
[`numberformat.html`](https://github.com/tc39/ecma402/blob/730ca2b88c305862db7be2f83c510dcca33ab48c/spec/numberformat.html) ·
[`datetimeformat.html`](https://github.com/tc39/ecma402/blob/730ca2b88c305862db7be2f83c510dcca33ab48c/spec/datetimeformat.html)

Specs, `csswg-drafts` at `5033732`:
[CSS Text 3](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-text-3/Overview.bs) ·
[CSS Text 4](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-text-4/Overview.bs) ·
[CSS Fonts 4](https://github.com/w3c/csswg-drafts/blob/50337328484f7fcdd9ab6fe9ded6011815b1707e/css-fonts-4/Overview.bs);
alreq at `670d38e`:
[`index.html`](https://github.com/w3c/alreq/blob/670d38e72099e2bee6fc17a7e9d02b1aab932d77/index.html) ·
[`gap-analysis/index.html`](https://github.com/w3c/alreq/blob/670d38e72099e2bee6fc17a7e9d02b1aab932d77/gap-analysis/index.html) ·
issues [#93](https://github.com/w3c/alreq/issues/93), [#218](https://github.com/w3c/alreq/issues/218);
Unicode: [UAX #14 revision 55](https://www.unicode.org/reports/tr14/tr14-55.html) ·
[`LineBreak.txt` 17.0.0](https://www.unicode.org/Public/17.0.0/ucd/LineBreak.txt) ·
[`SpecialCasing.txt` 17.0.0](https://www.unicode.org/Public/17.0.0/ucd/SpecialCasing.txt)

Chromium `154.0.8037.97`:
[`linux/font_cache_linux.cc`](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/fonts/linux/font_cache_linux.cc) ·
[`win/font_fallback_win.cc`](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/fonts/win/font_fallback_win.cc) ·
[`win/font_cache_skia_win.cc`](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/fonts/win/font_cache_skia_win.cc) ·
[`mac/font_matcher_mac.mm`](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/fonts/mac/font_matcher_mac.mm) ·
[`mac/font_cache_mac.mm`](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/fonts/mac/font_cache_mac.mm) ·
[`shaping/shape_result_spacing.cc`](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/fonts/shaping/shape_result_spacing.cc) ·
[`shaping/shape_result.cc`](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/fonts/shaping/shape_result.cc) ·
[`runtime_enabled_features.json5`](https://github.com/chromium/chromium/blob/154.0.8037.97/third_party/blink/renderer/platform/runtime_enabled_features.json5)

Firefox `FIREFOX_157_0_RELEASE`:
[`modules/libpref/init/all.js`](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_157_0_RELEASE/modules/libpref/init/all.js) ·
[`gfx/thebes/gfxPlatformFontList.cpp`](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_157_0_RELEASE/gfx/thebes/gfxPlatformFontList.cpp) ·
[`gfx/thebes/gfxPlatformMac.cpp`](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_157_0_RELEASE/gfx/thebes/gfxPlatformMac.cpp) ·
[`gfx/thebes/gfxWindowsPlatform.cpp`](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_157_0_RELEASE/gfx/thebes/gfxWindowsPlatform.cpp) ·
[`layout/generic/nsTextFrame.cpp`](https://github.com/mozilla-firefox/firefox/blob/FIREFOX_157_0_RELEASE/layout/generic/nsTextFrame.cpp)

WebKit at `963125d`:
[`SystemFontDatabaseCoreText.cpp`](https://github.com/WebKit/WebKit/blob/963125d1f1440dca433af8e41e3530abd975dd10/Source/WebCore/platform/graphics/cocoa/SystemFontDatabaseCoreText.cpp) ·
[`ComplexTextController.cpp`](https://github.com/WebKit/WebKit/blob/963125d1f1440dca433af8e41e3530abd975dd10/Source/WebCore/platform/graphics/ComplexTextController.cpp) ·
[`JavaScriptCore/Configurations/Base.xcconfig`](https://github.com/WebKit/WebKit/blob/963125d1f1440dca433af8e41e3530abd975dd10/Source/JavaScriptCore/Configurations/Base.xcconfig)

Font lists, read 2026-10-13:
[Windows 11 font list](https://learn.microsoft.com/en-us/typography/fonts/windows_11_font_list) ·
[Windows 10 font list](https://learn.microsoft.com/en-us/typography/fonts/windows_10_font_list) ·
[Segoe UI](https://learn.microsoft.com/en-us/typography/font-list/segoe-ui) ·
[Arial](https://learn.microsoft.com/en-us/typography/font-list/arial) ·
[Tahoma](https://learn.microsoft.com/en-us/typography/font-list/tahoma) ·
[Fonts included with macOS Tahoe](https://support.apple.com/en-us/122869) ·
[Apple fonts for developers](https://developer.apple.com/fonts/)

Fonts and licences: [`google/fonts` at `6692879`](https://github.com/google/fonts/tree/66928797f271fed5ee428544e7229685e2d90127/ofl)
(`notosansarabic`, `ibmplexsansarabic`, `cairo`, `tajawal`, `vazirmatn`, `rubik`, `readexpro`,
`almarai`: `METADATA.pb`, `OFL.txt`, font files) ·
[`googlefonts/nam-files` at `2a68014`](https://github.com/googlefonts/nam-files/tree/2a68014b16056e965c18fd47de1f3fde9a5b0095/Lib/gfsubsets/data) ·
[SIL OFL 1.1](https://openfontlicense.org/documents/OFL.txt) ·
[OFL-FAQ 1.1-update7](https://openfontlicense.org/ofl-faq/)

French usage, read 2026-10-13:
[OQLF, espacement](https://vitrinelinguistique.oqlf.gouv.qc.ca/22039/la-typographie/espacement/espacement-avant-et-apres-les-signes-de-ponctuation-et-les-symboles) ·
[Académie française, *Questions de langue*](https://www.academie-francaise.fr/questions-de-langue);
not a primary source:
[Unicode UDHR notes on French](https://web.archive.org/web/20201112013601/http://unicode.org/udhr/n/notes_fra.html)
(quoting the Imprimerie nationale's *Lexique*)

Libraries: Vite v8.3.1
[`constants.ts`](https://github.com/vitejs/vite/blob/v8.3.1/packages/vite/src/node/constants.ts) ·
[`plugins/asset.ts`](https://github.com/vitejs/vite/blob/v8.3.1/packages/vite/src/node/plugins/asset.ts) ·
[`docs/config/build-options.md`](https://github.com/vitejs/vite/blob/v8.3.1/docs/config/build-options.md);
Tailwind CSS v4.3.3
[`theme.css`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/theme.css) ·
[`preflight.css`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/preflight.css);
MDN [`browser-compat-data` v8.1.5](https://github.com/mdn/browser-compat-data/tree/v8.1.5)

PeerConnect: `document/en.subject.md:318`, `:526`, `:554`–`:572`; `docs/spec.md` §3.5.3, §3.8.2,
§3.10; ADR-0018 d5; `docs/legal/privacy-policy.md:179`; `web/src` and `web/package-lock.json` at
`0d20fcb`; `proxy/templates/default.conf.template`; the
[#140 findings](https://github.com/ahmadmnsur/ft_transcendence/blob/research/rtl-mirroring/docs/research/rtl-mirroring.md).
