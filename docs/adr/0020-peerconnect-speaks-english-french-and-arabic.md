# PeerConnect speaks English, French and Arabic, and its build refuses what is missing

On 2026-09-18 [Lock the claimed module list](https://github.com/ahmadmnsur/ft_transcendence/issues/7) left all of IV.2, *Accessibility and Internationalization*, out of
scope. The multi-language Minor's *"All user-facing text must be translatable"*
(`document/en.subject.md:562`) was *"not a task anyone owns but a tax every slice pays for the whole
project"*, and the right-to-left Minor (`:564`) *"is cheap only if multi-language is already in"*. On
2026-10-02 [Settle what the database stores in French and Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/95) kept the database free of any field per
language, and made names in any direction display safely (`PersonName`, `dir="auto"`) without
claiming either module.

On 2026-10-11 Hussein reported that Ahmad, as Product Owner, and Kamel, as Technical Lead, agreed
to claim two of IV.2's three modules: **the multi-language Minor** (`:554`-`:562`), in English,
French and Arabic, and **the right-to-left Minor** (`:564`-`:572`), in Arabic. Hussein drives the
work and owns both modules, and [Map: PeerConnect in English, French and Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/139) charted it the same day.
The claim goes from 18 points to 20. The bonus counts at most 5 points above 14 (`:1375`), so the
second point adds margin against a module that fails at evaluation, not score.

**The part a reader will ask about: the tax #7 named is still paid, and the compiler collects it.**
Every slice that shows text writes it in three languages, in the same PR. What keeps that from
going wrong unseen is the SPA's own build: `tsc -b` refuses a missing text, plural form or
placeholder, and a scanner refuses a left or right class. That build runs in CI and in every
`make up`, so what a slice forgets stops the next boot instead of reaching the screen. What the
build cannot see, such as English typed into a component, a poor translation or a script that
assumes left to right, is left to people: the PR's reviewer, Hussein's weekly proofreading and an
Arabic browser pass.

The shape we chose: **one typed dictionary in the SPA and no translation package; mirroring through
flow-relative classes only; and a build that refuses whatever is missing.**

Settled ticket by ticket on that map between 2026-10-11 and 2026-10-15. Three research tickets came
first: [Find which translation library fits the SPA](https://github.com/ahmadmnsur/ft_transcendence/issues/149), [Find what complete layout mirroring needs in the SPA](https://github.com/ahmadmnsur/ft_transcendence/issues/140) and
[Find how Arabic and French text render](https://github.com/ahmadmnsur/ft_transcendence/issues/141). Then five decision tickets, each a proposal of Hussein's:
[Settle what counts as user-facing text](https://github.com/ahmadmnsur/ft_transcendence/issues/142) and [Settle how the legal pages exist in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/143), approved by
Ahmad on 2026-10-13; [Settle the translation library and how text is keyed](https://github.com/ahmadmnsur/ft_transcendence/issues/144), approved by Ahmad on 2026-10-14;
and [Settle how each slice ships its text in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/145) and [Settle how Arabic looks: mirroring, font, digits and dates](https://github.com/ahmadmnsur/ft_transcendence/issues/146),
approved by Kamel in Ahmad's place on 2026-10-15. Each decision below is a summary. The rule itself
is in its ticket's proposal, as approved and with its dated notes, and in the ADR notes it names. A
later change annotates the proposal, the note and, where its summary no longer holds, this ADR.

## What this ADR changes in earlier records

Every change below is already written as a dated note where the old wording is read, added by the
ticket that settled it, so this ADR adds no rule to them. The list was checked against every ADR on
2026-10-15.

- **ADR-0004**: the legal pages' sign-off, due 2026-10-25 since ADR-0004's note of 2026-10-14,
  covers the English pages; their French and Arabic come later, on their own build ticket, and
  Ahmad signs them off before they merge. From [Settle how the legal pages exist in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/143).
- **ADR-0005**: decision 5's check by the gate holder covers the three versions of the Privacy
  Policy once the translations exist, and confirms that the French and the Arabic text moved. From
  [Settle how the legal pages exist in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/143).
- **ADR-0011**: decision 4's coupling of the Report reasons to the Terms holds in every language,
  and a PR that changes a reason changes all three versions of the Terms. From [Settle what counts as user-facing text](https://github.com/ahmadmnsur/ft_transcendence/issues/142) and
  [Settle how the legal pages exist in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/143).
- **ADR-0012**: decision 1's rule on rewording binds each translation of a Mission sentence, and the
  Arabic sentences fit any pair. From [Settle what counts as user-facing text](https://github.com/ahmadmnsur/ft_transcendence/issues/142).
- **ADR-0016**: decision 6's fifth check covers the three versions of each legal page, and a sixth
  check, *Three languages*, joins the template. From [Settle how the legal pages exist in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/143) and [Settle how each slice ships its text in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/145).
- **ADR-0018**: decision 9 (the Report reasons use each language's Terms), decision 14 (the English
  files stay the canonical text and gain translations, signed off on their own ticket) and
  decision 15 (once translated, a PR moves all three versions, with one date, and the places that
  write the rule move with the translations, `.coderabbit.yaml` included). From [Settle what counts as user-facing text](https://github.com/ahmadmnsur/ft_transcendence/issues/142),
  [Settle how the legal pages exist in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/143) and [Settle how each slice ships its text in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/145).

This ADR adds two notes, dated 2026-10-15:

- **ADR-0016**: decision 6's note of 2026-10-15 said that `docs/spec.md` §16.8 gains the *Three
  languages* box with the ticket that brings i18n into the spec's scope. It does, with this ADR.
- **ADR-0019**: *Not settled* named French and Arabic as the map's to claim. They are claimed here.

Unaffected:

- **ADR-0018 decision 5**: *"fonts, icons and scripts are bundled"*, and an interface preference may
  sit in the browser's storage. The Arabic font is bundled and served from PeerConnect's own origin
  (decision 8 here), and the language choice is such a preference (decision 6 here). The Privacy
  Policy already names both and does not move.
- **ADR-0016 decisions 7 and 8**: no test is added, since the compiler is the check (decision 3
  here), and CI stays advisory; the template's box asks for the build instead (decision 10 here).
- **ADR-0015**: the chart stays Recharts (its decision 7) and is indexed by Round (its decision 4).
  Its mirroring in Arabic (decision 7 here) is layout, which no decision of ADR-0015 rules on, and
  its insight sentences are translated as one message each (decision 4 here).
- **ADR-0014 and ADR-0019 decision 8**: the database stores nothing per language, as [Settle what the database stores in French and Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/95)
  settled. ADR-0003 decision 3's note already counts an Arabic letter's bytes in the password limit.
- **ADR-0001, ADR-0002, ADR-0006 to ADR-0010, ADR-0013 and ADR-0017**: their rules do not depend on
  the language a screen is shown in. The text they put on screen, such as the Score explanation,
  the Badges and `/rules`, is translated like the rest (decision 2 here).
- **`CONTEXT.md`**: no new term. Each term has had its French and its Arabic word since [Settle how each slice ships its text in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/145)
  (`24e42c7`).

## The decisions

1. **Two Minors are claimed, for 20 points, and the WCAG Major stays out.** The multi-language Minor
   in English, French and Arabic, and the right-to-left Minor in Arabic. English is the language the
   code is written in, and the fallback whenever a translation is missing. Only PeerConnect's own
   text is translated: text a person writes is stored and shown as written, the database stores
   nothing per language, and Skill names stay English in every language, product names (Docker,
   Git) and ordinary words (Networking, Security) alike. The WCAG 2.1 AA Major (`:552`) stays out for
   #7's reasons, and so do a fourth language and the README in French or Arabic, which the subject
   requires in English (`:1346`). Settled when [Map: PeerConnect in English, French and Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/139) was charted, 2026-10-11.

2. **Every text PeerConnect's own SPA shows, or gives to a screen reader, is translated, and all of
   it lives in the SPA** ([Settle what counts as user-facing text](https://github.com/ahmadmnsur/ft_transcendence/issues/142)). That covers every route, the Peer Moderator
   and Admin screens included; fixed text stored as codes (Missions, Badges, Report reasons and
   states, Match statuses, Role names, the Admin label, the insight sentences, the Score
   explanation); validation messages; headings, `aria-label`, `alt`, `title` and `placeholder`; the
   chart; `/rules`; and dates and times. **Never translated:** names (the product name, Skill names,
   display names), text for developers, the seed's written text, and what the browser or 42 draws.
   Every form sets `noValidate`, so every form error is PeerConnect's own text. **The API does not
   change:** it keeps its English `message`, which the SPA never shows, choosing its text by `code`
   from one typed map; and it keeps `"Former student"`, while the SPA renders its own tombstone from
   `removed`. ADR-0011 decision 4, ADR-0012 decision 1 and ADR-0018 decision 9 carry its notes.

3. **The SPA translates with a typed dictionary of its own, over `Intl`, and no translation
   package** ([Settle the translation library and how text is keyed](https://github.com/ahmadmnsur/ft_transcendence/issues/144), points 1 to 3, 7 and 8). Of the four options
   [Find which translation library fits the SPA](https://github.com/ahmadmnsur/ft_transcendence/issues/149) measured, it is the only one where `tsc -b` catches a missing
   Arabic plural form, and it adds under 1 kB gzip and logs nothing.
   - **The text** lives in `web/src/i18n/en/`, `fr/` and `ar/`, one `as const` file per area,
     keyed by area in camelCase, with camelCase placeholders. Text chosen by a code is keyed by the
     code and written `as const satisfies Record<Code, string>`. English is the source; each French
     and Arabic area file `satisfies` its English area, and each language's `index.ts` checks the
     whole language. All three languages are in the bundle, so switching never waits.
   - **The check** is the SPA build that CI and the Docker image already run: `tsc -b` rejects a
     missing text, plural form or placeholder, an empty text, and a value of the wrong kind, naming
     each by its key. A text that slips through, which only `vite dev` allows, shows in English, and
     nothing reaches the console. No test is added: ADR-0016 decision 7 holds.
   - **The legal pages' text stays outside the dictionary**, in their Markdown files (decision 9).

4. **A number, a name or a list in a sentence is written by `Intl` and isolated** ([Settle the translation library and how text is keyed](https://github.com/ahmadmnsur/ft_transcendence/issues/144),
   point 4; [Settle how Arabic looks: mirroring, font, digits and dates](https://github.com/ahmadmnsur/ft_transcendence/issues/146), points 2 and 10). A sentence is one message with
   placeholders, never pieces joined in code, written once per plural form: English `one` and
   `other`; French `one`, `many` and `other`; Arabic `zero`, `one`, `two`, `few`, `many` and
   `other`. Every number goes through `Intl.NumberFormat`, a percentage with `style: 'percent'`, a
   file size with `style: 'unit'`, and a limit named in a text is a placeholder filled from
   `LIMITS`. A list comes from `Intl.ListFormat`. Every value a message fills is isolated: in a
   `<bdi>` in markup, and between U+2068 and U+2069 in a plain string (`alt`, `title`,
   `aria-label`, `<option>`). A name goes through `PersonName` or its plain-text helper, never
   `displayName`, and a Skill name outside a message through `SkillName`, so `C++` never reads
   `++C`.

5. **The locale table is `en-GB`, `fr` and `ar-u-nu-arab`** ([Settle how Arabic looks: mirroring, font, digits and dates](https://github.com/ahmadmnsur/ft_transcendence/issues/146), point 6).
   Arabic writes Arabic-Indic digits, named in its tag so every browser agrees, and `ar`'s month
   names. English is day first and 24-hour, like French. A date is long, never numeric, and each
   language keeps its own clock: 24-hour in English and French, 12-hour in Arabic. Text a person
   types keeps the digits they typed.

6. **A first visit follows the browser, the person's choice is kept in the browser, and switching
   needs no reload** ([Settle the translation library and how text is keyed](https://github.com/ahmadmnsur/ft_transcendence/issues/144), points 5 and 6; [Settle how the legal pages exist in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/143), point
   6). A first visit takes the first of the browser's languages that is English, French or Arabic,
   by its language part, and English when none is. The choice is stored, under
   `peerconnect.language` in `localStorage`, only when the person picks a language; it belongs to
   the browser, not the account. `<html lang>` and `<html dir>` are set before the first render,
   and on each switch in the same update as the text (`:572`). The switcher is the design system's
   `Select`, at the end of the shared header, on every route, the four signed-out ones included.

   > **2026-10-25** (ADR-0018 d12's note of 2026-10-25): the signed-out pages are five, with the
   > landing page at `/`; the switcher ends its header too.

7. **The SPA mirrors through flow-relative classes only, and its build refuses a left or right
   class** ([Settle how Arabic looks: mirroring, font, digits and dates](https://github.com/ahmadmnsur/ft_transcendence/issues/146), points 1 to 4 and 11). `rtl:` and `ltr:` are used
   only where no flow-relative class exists, and never for content whose direction can differ from
   the page's. The scanner from [Find what complete layout mirroring needs in the SPA](https://github.com/ahmadmnsur/ft_transcendence/issues/140) moves into
   `web/` and runs in `npm --prefix web run build`, so CI and every `make up` stop on a physical
   class. The merged code's 15 physical uses, the `Tabs` arrow keys, the empty text fields, the
   table's scroll fade and the numbers written by hand change. Tables and the `/admin/analytics`
   chart run right to left in Arabic. Arrows flip, and every other icon stays as drawn. The page's
   own scroll bar stays where the browser draws it.

   The *"RTL-specific UI adjustments where needed"* (`:570`) are the ones [Settle how Arabic looks: mirroring, font, digits and dates](https://github.com/ahmadmnsur/ft_transcendence/issues/146)'s
   point 11 names, its points 2 to 4 and 8 to 10: the `ProgressBar`'s fill, the arrow keys, the
   empty fields, the table fade, the chart and the chevrons (all above); the legal lists and logins
   (decision 9); the Arabic text rules (decision 8); and the Skill names (decision 4). The font
   (decision 8) and the legal pages' date check (decision 9) are not among them.

8. **Arabic characters use a bundled Noto Sans Arabic, and four text rules hold** ([Settle how Arabic looks: mirroring, font, digits and dates](https://github.com/ahmadmnsur/ft_transcendence/issues/146), points 5
   and 9). One woff2 file of Noto Sans Arabic, cut to the Arabic blocks and to weights 400 to 600,
   is served from PeerConnect's own origin with a `unicode-range`, in front of the system stack that
   English and French keep. Its licence, the SIL Open Font License 1.1, ships beside it. The
   rules: PeerConnect's own Arabic carries no vowel marks; Arabic text gets no letter spacing;
   Arabic emphasis is bold, not italic; and French puts a no-break space before `: ; ! ?` and
   inside `« »`. `tsc` checks the vowel marks and the French spaces in the dictionary, and the legal
   check does in the legal files, where it also fails italic in an Arabic file.

   > **Refined 2026-10-18** by [Languages: the design system in French and Arabic, right to left](https://github.com/ahmadmnsur/ft_transcendence/issues/173),
   > its criterion 11: "bold" is weight 600 (`font-semibold`). The bundled font is cut to 400 to
   > 600, and 600 is the weight the SPA's bold text already uses, the legal pages' `**bold**`
   > included. Arabic emphasis is upright at 600.

9. **The legal pages stay in English until near the end, are then translated once, and the English
   stays canonical** ([Settle how the legal pages exist in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/143); [Settle how Arabic looks: mirroring, font, digits and dates](https://github.com/ahmadmnsur/ft_transcendence/issues/146), points 7 to 9). Until the
   translations merge, `/privacy` and `/terms` show the English text in every language, in an
   article with `lang="en"` and `dir="ltr"`. Hussein translates both pages once, on their own build
   ticket finished before [Pre-defense readiness](https://github.com/ahmadmnsur/ft_transcendence/issues/73), and Ahmad checks and signs off the French and the
   Arabic before they merge; [Legal pages sign-off](https://github.com/ahmadmnsur/ft_transcendence/issues/69) stays English only. Once translated, the
   three versions of a page are one document with one date, and the build fails when the three
   dates differ, comparing them as dates. In Arabic, lists and tables run right to left, the 42
   logins render as `<code dir="ltr">`, and numbers are Arabic-Indic except the name *42*.
   ADR-0018 decisions 14 and 15 carry its notes.

10. **Each slice ships its own text in all three languages, under one rule** ([Settle how each slice ships its text in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/145)).
    The rule is `CONTRIBUTING.md` → *Text ships in three languages*, with a sixth *Done* box, *Three
    languages*, which also asks for the SPA build, since CI stays advisory (ADR-0016 decision 6's
    note). Build tickets start now: until the foundation build ticket creates `web/src/i18n/`, a
    slice keeps its English in one object per area shaped like the dictionary, and whichever of the
    two merges second moves it and adds the French and the Arabic. `CONTEXT.md` gives each term one
    French and one Arabic word; French says *vous*, and Arabic is Modern Standard Arabic. Hussein
    proofreads after merge, at least once a week, with a last pass before [Pre-defense readiness](https://github.com/ahmadmnsur/ft_transcendence/issues/73), and the
    French and the Arabic of his own PRs are checked by their reviewer. Each open build ticket that
    shows text gets one criterion pointing at the rule. Once the legal pages are translated, the PR
    that adds the translations updates each place that names only the English files or checks only
    them, as ADR-0018 decision 15's note of 2026-10-15 lists.

## Considered options

- **Keeping IV.2 out of scope**, as [Lock the claimed module list](https://github.com/ahmadmnsur/ft_transcendence/issues/7) ruled: no slice pays the tax, and the claim
  stays at 18 with its exact margin of 18 − 4 = 14. The team agreed on 2026-10-11 to claim both,
  and this ADR's answer to the tax is the build that names what is owed.
- **A translation package** ([Settle the translation library and how text is keyed](https://github.com/ahmadmnsur/ft_transcendence/issues/144), point 1): react-intl, whose `tsc` check misses
  plural forms; i18next, which shows English when a French `many` text is missing, needs a mapped
  type before `tsc` checks French and Arabic keys, and adds 19.9 kB; and Lingui, which checks no
  French or Arabic text in `tsc` and calls `console.warn` in production.
- **Loading one language at a time** ([Settle the translation library and how text is keyed](https://github.com/ahmadmnsur/ft_transcendence/issues/144), point 2): it works, but switching would
  then wait and could fail, and need a loading state.
- **The legal pages in English for good, or translated now** ([Settle how the legal pages exist in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/143), point 1): English
  only costs least, but an evaluator using the Arabic interface would find English on the two pages
  they must open. Translating now would make every PR that changes personal data write legal French
  and Arabic, while the English pages changed three times between 2026-10-10 and 2026-10-12.
- **Build tickets that wait for the foundation, or slices that write English any way they like**
  ([Settle how each slice ships its text in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/145), point 1): the first puts one ticket in front of the rest of the
  project; the second leaves one late ticket to move every slice's text near the defense.
- **Hussein reviewing every PR that shows text, or one proofreading pass at the end** ([Settle how each slice ships its text in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/145),
  point 3): every slice would wait on him, or every error would stay until then.
- **Mirroring checked by review only, by a CI step of its own, or on the compiled CSS** ([Settle how Arabic looks: mirroring, font, digits and dates](https://github.com/ahmadmnsur/ft_transcendence/issues/146),
  point 1): review alone leaves one check that can be missed; a CI step is advisory and does not
  stop `make up`; and the compiled CSS cannot see `translate-x-` or `scale-x-`.
- **The chart left to right in every language** ([Settle how Arabic looks: mirroring, font, digits and dates](https://github.com/ahmadmnsur/ft_transcendence/issues/146), point 3): simpler, but the subject
  asks for *"complete layout mirroring"* (`:568`).
- **The system font stack alone, Cairo, or IBM Plex Sans Arabic** ([Settle how Arabic looks: mirroring, font, digits and dates](https://github.com/ahmadmnsur/ft_transcendence/issues/146), point 5): the stack
  alone gives a fake bold in Chrome on Linux, and may show no Arabic where no Arabic font is
  installed; Cairo's digits differ in width; Plex is three files, and a cut copy may not keep its
  Reserved Font Name.
- **Western digits, `ar-LB` or `en`** ([Settle how Arabic looks: mirroring, font, digits and dates](https://github.com/ahmadmnsur/ft_transcendence/issues/146), point 6), and a legal date check that
  writes the dates with `Intl` and compares the text (point 7), whose result would depend on the
  build's CLDR data.
- **A field per language in the database** ([Settle what the database stores in French and Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/95)): nothing only the backend
  holds needs one, since fixed text is stored as codes and rendered by the SPA.

## Consequences

- **Every slice that shows text pays the tax [Lock the claimed module list](https://github.com/ahmadmnsur/ft_transcendence/issues/7) named**, in the same PR,
  and `tsc` names each text it still owes.
- **What the build cannot see is left to people**: English typed into a component or left in a
  French or Arabic file, a name filled from `displayName`, a poor translation, a style object in a
  script, and JavaScript that assumes left to right. The PR's reviewer, Hussein's passes, and the
  Arabic pass that [Write the build tickets for French, Arabic and right-to-left](https://github.com/ahmadmnsur/ft_transcendence/issues/148) adds to [Browser pass, and the README's browser limitations](https://github.com/ahmadmnsur/ft_transcendence/issues/72) and
  [Pre-defense readiness](https://github.com/ahmadmnsur/ft_transcendence/issues/73) look for them.
- **The bundle carries all three languages**, and grows with the SPA's text; that size is not
  measured yet.
- **A page that shows an Arabic character fetches one font file**, about 100 kB as measured with
  its Latin glyphs, and smaller cut to Arabic alone. An English or French page showing an Arabic
  name fetches it too.

  > **Measured 2026-10-18** by [Languages: the design system in French and Arabic, right to left](https://github.com/ahmadmnsur/ft_transcendence/issues/173):
  > cut to Arabic alone, the file is 82,876 bytes. Firefox 157 fetches it on every English and
  > French page as well, because the language switcher on every page lists `العربية`; Chrome 155
  > fetches it only for a page that shows Arabic. `docs/spec.md` §3.5.3's note of this date says
  > why it stays so.
- **The legal translations land last**, near the end, and from then on a change to either page is
  written in three languages and checked by a member who did not write it.
- **The README's Modules section counts 20 points**, with both Minors ([README: the sections with no recorded owner](https://github.com/ahmadmnsur/ft_transcendence/issues/71)).
- **The spec and the build tickets follow.** [Write the ADR for French, Arabic and right-to-left, and update the spec](https://github.com/ahmadmnsur/ft_transcendence/issues/147) updates `docs/spec.md` in
  the same PR as this ADR, and [Write the build tickets for French, Arabic and right-to-left](https://github.com/ahmadmnsur/ft_transcendence/issues/148) opens the foundation, the
  tickets for the merged code that changes and the legal translations, and puts the criterion on
  every open build ticket that shows text.

  > **The build tickets followed, 2026-10-16.** [Write the build tickets for French, Arabic and right-to-left](https://github.com/ahmadmnsur/ft_transcendence/issues/148) opened the foundation,
  > [Languages foundation: the dictionary, the switcher and the locale table](https://github.com/ahmadmnsur/ft_transcendence/issues/171); the two for the merged
  > code, [Languages: the SPA shell in French and Arabic, right to left](https://github.com/ahmadmnsur/ft_transcendence/issues/172) and [Languages: the design system in French and Arabic, right to left](https://github.com/ahmadmnsur/ft_transcendence/issues/173);
  > and the legal translations, [Languages: the Privacy Policy and the Terms in French and Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/174). The twenty-five
  > open tickets that show text carry the criterion (decision 10), and so do the three new ones
  > that change the SPA's text; the legal translations follow their own rule (`CONTRIBUTING.md` →
  > *Text ships in three languages*).

## Not settled by this decision

- **How the evaluation shows both modules**: which accounts, which screens, and when the language
  is switched. It is [Map: PeerConnect in English, French and Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/139)'s *Not yet specified* item, and [Pre-defense readiness](https://github.com/ahmadmnsur/ft_transcendence/issues/73) is
  its likely home.

  > **Moved 2026-10-16** by [Write the build tickets for French, Arabic and right-to-left](https://github.com/ahmadmnsur/ft_transcendence/issues/148) to [Pre-defense readiness](https://github.com/ahmadmnsur/ft_transcendence/issues/73), its
  > criterion 10, where it is settled and rehearsed.
- **Browsers and systems the research did not run**: Safari and Brave in [Find what complete layout mirroring needs in the SPA](https://github.com/ahmadmnsur/ft_transcendence/issues/140), and
  Safari, macOS and Windows in [Find how Arabic and French text render](https://github.com/ahmadmnsur/ft_transcendence/issues/141). The browser pass runs Brave ([Browser pass, and the README's browser limitations](https://github.com/ahmadmnsur/ft_transcendence/issues/72)).
- **Two edge cases left to the foundation build ticket** from Ahmad's [approval](https://github.com/ahmadmnsur/ft_transcendence/issues/144#issuecomment-6177283292) of [Settle the translation library and how text is keyed](https://github.com/ahmadmnsur/ft_transcendence/issues/144):
  type-ahead in a `<select>` whose option starts with an isolated value, and a text made only of an
  uncommon space.

  > **Handed on 2026-10-16** to [Languages foundation: the dictionary, the switcher and the locale table](https://github.com/ahmadmnsur/ft_transcendence/issues/171), its criterion 11.

  > **Settled 2026-10-16** by that ticket: such a `<select>` loses type-ahead for that option,
  > since dropping the U+2068 mark would bring back `++C` in a right-to-left select. The blank check
  > covers every character `String.prototype.trim()` removes, and the overlay on English treats a
  > text that `trim()` empties as missing. The same approval's note on a value that is `undefined`
  > at run time is settled with them: it counts as absent, so its placeholder shows as written and
  > an `undefined` list item is left out.
- **The file sizes' `unitDisplay`**, which the design-system build ticket picks ([Settle how Arabic looks: mirroring, font, digits and dates](https://github.com/ahmadmnsur/ft_transcendence/issues/146), point
  2's note of 2026-10-15).

  > **Handed on 2026-10-16** to [Languages: the design system in French and Arabic, right to left](https://github.com/ahmadmnsur/ft_transcendence/issues/173), its criterion 3.

  > **Settled 2026-10-18** by that ticket: `short`. `FileDrop` writes a size with `style: 'unit'`
  > and `unitDisplay: 'short'`, in steps of 1,024 as before: *5 MB*, *5 Mo* and *٥ م.ب*. It
  > keeps the sizes as short as the English it replaces. A file under 1 kB reads *800 byte* in
  > English, as CLDR's `en-GB` writes it.
- **Which open build tickets show text**: [Write the build tickets for French, Arabic and right-to-left](https://github.com/ahmadmnsur/ft_transcendence/issues/148)'s call.

  > **Settled 2026-10-16** by that ticket: twenty-five, listed in its resolution and that list's
  > correction of the same day. The seed tickets, the `Post` schema, the live client reactions, the
  > README, the browser pass, Pre-defense readiness and the resets ticket show none of the SPA's
  > text, and the legal sign-off stays English only, its pages translated on their own ticket.
