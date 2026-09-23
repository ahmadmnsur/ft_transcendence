# Prisma, and a schema gate that reviews rather than authors

The subject asks only for "an ORM for the database" (`document/en.subject.md:516`) — a single
bullet, no sub-bullets, worth one point. Any ORM earns it. So this ADR is not really about
which ORM is best; it is about **which ORM makes three developers writing migrations in
parallel survive six weeks**, because that is the constraint that actually binds.

Recorded because the choice is expensive to reverse once entities exist, and because picking
**Prisma** for a NestJS project is mildly surprising — NestJS's own documentation leans on
TypeORM, so a future reader will assume we defaulted without thinking. We didn't.

## The decisions

1. **Prisma is the ORM.** `DATABASE_URL` from ADR-0004 decision 9 is already exactly what it
   needs, and ADR-0004 decision 11's boot sequence — healthcheck, migrate, idempotent seed —
   maps onto `prisma migrate deploy` followed by the seed with no amendment.

2. **The single `schema.prisma` file is the reason, not a cost we accepted.** Three developers
   working in vertical slices will change schema constantly. With entities distributed beside
   their modules (TypeORM, MikroORM), two developers can add conflicting columns or foreign
   keys in separate files and **nothing surfaces the conflict until migrations run in order**.
   With one schema file, the same collision is an ordinary git merge conflict caught before
   merge. **Loud conflicts beat silent ones**, and a gate whose job is to stop three people
   breaking migrations is far cheaper to hold when there is exactly one file to read.

   > **Tightened 2026-09-20 — "an ordinary git merge conflict" overclaims what git guarantees.**
   > Git conflicts on overlapping (or near-overlapping) line ranges, not on schema meaning. Two
   > developers each editing the *same* model, in nearby lines, produce a real conflict marker.
   > Two developers editing *different* models in different parts of the same file can merge
   > cleanly with no marker at all, even though the result may be semantically conflicting —
   > duplicate names, contradictory relations — a defect `prisma generate`/`migrate dev` catches,
   > not git. **The accurate claim**: one schema file centralizes every edit into a single diff,
   > so the schema's global state is visible in one place at review time, and a conflicting edit
   > is far more likely to collide or be spotted than when it sits in a separate entity file no
   > one but its two editors reads together. It does not *guarantee* a git-level conflict. This
   > also qualifies this decision's later 2026-09-20 annotation below, whose closing clause ("a
   > conflict is git's problem before it is Prisma's") should be read with the same qualification
   > — its point about Prisma's own multi-file option is otherwise unaffected.

   > **Tightened 2026-09-20 — the TypeORM/MikroORM comparison overclaims universality too.**
   > "Nothing surfaces the conflict until migrations run" holds only when the two conflicting
   > edits land in *different* entity files — which per-module entity layout makes likely but
   > does not guarantee: two changes to the *same* entity, in the *same* file, produce an
   > ordinary git conflict there too, exactly as in the single-file case above. **The real
   > comparison is architectural, not absolute**: distributed ORM metadata *can* spread schema
   > ownership across many files, so a conflicting edit *can* land somewhere git never compares
   > it against; one schema file *cannot* — every edit, on every model, always lands in the same
   > diff. That is why this decision prefers central visibility for something whose correctness
   > is global, not because TypeORM/MikroORM are claimed to hide every conflict, always.

   > **Clarified 2026-09-20 — this is a choice against Prisma's own multi-file schema too, not
   > only against TypeORM/MikroORM's per-module entities.** Prisma has supported splitting
   > `schema.prisma` into a folder of `.prisma` files since **6.7.0** (GA; preview from 5.15), and
   > the locked version (decision 6) carries it forward. That feature still merges every file into
   > one schema before `migrate dev` validates it — so two developers editing *different* files to
   > add conflicting columns or foreign keys would **not** produce a git merge conflict, only a
   > Prisma validation error at generate/migrate time. That is exactly the silent-until-migration
   > failure mode this decision rejects TypeORM and MikroORM for. **One `schema.prisma` file is
   > not something Prisma requires** — multi-file is a supported, GA alternative — **it is the
   > property this decision wants**: every schema edit lands in one diff, so a conflict is git's
   > problem before it is Prisma's.

   > **Superseded 2026-09-20 — read this as decision 2's current rationale.** The plain prose
   > above predates the three annotations that follow it and should not be read as the operative
   > claim on its own; the annotations remain as the detailed reasoning, this paragraph is the
   > short version. **One `schema.prisma` file centralizes every schema edit into one globally
   > reviewable diff.** It increases the visibility of cross-slice schema changes and makes
   > overlapping edits more likely to collide during a git merge — it does not guarantee git will
   > catch every conflicting change, since git compares line ranges, not schema meaning, and
   > Prisma validation remains necessary for semantic conflicts. The comparison to TypeORM and
   > MikroORM is architectural, not absolute: their per-module entity files *can* spread schema
   > ownership so a conflicting edit lands somewhere git never compares it against; this project's
   > one file cannot let that happen. That is why it is chosen — not because distributed entities
   > are claimed to universally hide every conflict until migration time.

3. **Kamel (Technical Lead) holds the schema gate; Ahmad deputises past 24 hours.**
   `document/en.subject.md:179`-`:187` puts "Defines technical architecture" and "Reviews
   critical code changes" under Technical Lead. The apparent conflict with ADR-0004 decision
   12, which already makes Kamel the week-1 infrastructure gate, resolves on phasing: **the two
   gates are sequential, not concurrent.** In week 1 nobody writes schema, because every
   feature slice is still waiting on the single command to work. The deputy matters as much as
   the holder — a single gate with no fallback is not a gate, it is a stall.

4. **The developer authors the migration; the gate holder reviews it.** This is the decision
   most likely to be quietly reversed under deadline pressure, so the reason is recorded: the
   map settled at charting that **each developer owns their feature DB-through-UI**. A gate
   that takes schema authorship away leaves them owning schema-through-UI — a different
   division of work than the one the team agreed and will be asked to explain at evaluation
   (`:243`-`:249`). The gate exists to stop *bad or conflicting* schema, which review achieves;
   centralising *authorship* additionally creates a work queue and buys nothing.

5. **The gate is scoped to `prisma/**`, and general review is round-robin.** Schema correctness
   is global — one bad migration breaks everyone. A React component is local. Routing every PR
   through one person costs the project its only Technical Lead and produces a review record of
   one person reviewing and never being reviewed, where `:187` puts "Participate in code
   reviews" under **Developers**, plural.

   > **Superseded 2026-09-20 — read this as decision 5's current rule: the gate is scoped to
   > `prisma/**` and the root `prisma.config.ts`; general review is round-robin.**
   > Prisma ORM 7 Config selects the schema entry point, migration storage/discovery, the
   > datasource used by migration commands, and the command run by `prisma db seed`. Leaving that
   > root file outside the gate would let a change redirect or disable the same shared
   > schema/migration/seed mechanisms decision 6 protects merely because the Config lives outside
   > `prisma/`. Kamel remains the reviewer, Ahmad still deputises after 24 hours, developers still
   > author their own changes, and every PR outside these two Prisma surfaces remains round-robin.

   > **One check added 2026-09-23 by ADR-0018 d15; the scope is unchanged.** When a PR inside the
   > gate changes what personal data is stored, the gate holder also confirms that
   > `docs/legal/privacy-policy.md` moved in the same PR. The gate still covers only `prisma/**`
   > and the root `prisma.config.ts`; a personal-data change outside those paths, such as a new
   > visibility rule, is caught by the PR template's Done box rather than by widening the gate.

6. **Three rules on migrations, which live in `CONTRIBUTING.md` and the PR template, not only
   here.** They must be visible at the moment someone is about to break them:
   - **A merged migration is immutable.** Prisma checksums applied migrations in
     `_prisma_migrations`; editing one already on `main` breaks every other developer's
     database with a checksum mismatch. Fix forward.
   - **Rebase onto `main` before merging, and regenerate if `schema.prisma` moved underneath.**
     Prisma orders migrations by timestamp directory, not merge order, so parallel work can
     produce a history that applies in one order locally and another on a fresh clone.
   - **The seed is gated too.** ADR-0004 decision 11 puts an idempotent seed on the boot path;
     it is shared contention exactly like the schema.

   > **Tightened 2026-09-20 — "breaks every other developer's database" describes a blocked
   > migration command or a prompted destructive reset, not silent data corruption.** Prisma
   > computes a checksum of each migration's SQL at apply time and stores it in
   > `_prisma_migrations`. Editing a migration already recorded there changes that checksum, and
   > Prisma detects the drift and refuses to proceed: `migrate dev` (interactive, local) prompts
   > to **reset the database** — discarding local data — to reconcile it, and `migrate deploy`
   > (non-interactive, production/CI) errors out and blocks the deploy rather than applying
   > anything. The practical effect the original wording names is real — a teammate either loses
   > their local database to a forced reset or has their deploy blocked — it just isn't silent
   > corruption. The rule is unchanged: fix forward with a new migration, never edit one already
   > on `main`.

   > **Locked 2026-09-20 — this decision's ordering explanation and workflow target Prisma ORM
   > major version 7.** `package.json` must constrain `prisma` and `@prisma/client` to the Prisma
   > ORM 7 major (`^7`, the current GA line per Prisma's own release-status page) — a semver range,
   > not an exact-version pin; no exact patch/minor is fixed here, and none should be invented
   > without evidence. The "timestamp directory, not merge order"
   > explanation above, and the rebase-then-regenerate workflow below, are both version 7's model:
   > migrations are timestamped SQL directories, applied in name order. **Prisma ORM 8** (GA
   > expected October 2026, RC at the time of this note) replaces that with a graph-based model —
   > each migration records the contract versions it starts and ends at, parallel branches are
   > reconciled with explicit "merge migrations," and neither this decision's ordering claim nor
   > its regenerate workflow describes that model. `prisma migrate dev` and `prisma migrate
   > deploy` (decision 1) are unaffected by this lock; only the migration-ordering internals this
   > decision depends on differ across the major-version boundary.

   > **Corrected 2026-09-21 — “current GA line” is no longer the operative description.** Read
   > that clause as **the supported Prisma ORM 7 major deliberately locked by this project
   > (`^7`)**. Prisma ORM 8 is the current release candidate while Prisma ORM 7 remains fully
   > supported. The project still targets Prisma 7, the dependency range remains `^7`, and no
   > exact patch or minor is selected.

   > **Clarified 2026-09-20 — "regenerate" scopes to your own branch's still-unapplied migration,
   > never one already on `main`.** Read in isolation, the rebase rule above could be misread as
   > licensing an edit, deletion or regeneration of a migration someone else already merged. It
   > does not: the immutability rule directly above it is unconditional, rebase or no rebase. What
   > "regenerate" names is narrower — after rebasing onto a `schema.prisma` that moved underneath
   > you, your branch's own migration, not yet applied on `main` and not yet merged, may be
   > discarded and recreated (`npx prisma migrate dev`) so its timestamp and contents sit correctly
   > on top of the rebased schema. The same clarification is added in `CONTRIBUTING.md` and the PR
   > template, per this decision's own rule that these rules live there too.

   > **Tightened 2026-09-20 — the ordering claim is accurate for the locked version; what needed
   > sharpening was "applies in one order locally and another on a fresh clone."** Prisma's own
   > migration-graph documentation confirms decision 6's core claim for the locked v7 (see the
   > version-lock note above): migrations are timestamped SQL directories, applied in
   > deterministic name order. What that sentence describes imprecisely is *why* two environments
   > could diverge: given an *identical* set of migration directories, a fresh clone and an
   > existing checkout apply them in the same order — they never disagree on that. What actually
   > differs is *which* migrations a given database already has recorded as applied. Two branches
   > generate migrations from different schema states at different times; if the later-authored
   > one merges first, and the earlier-authored one then merges carrying an **older** timestamp
   > than one already applied elsewhere, `migrate deploy` on a database that already holds the
   > newer migration is now asked to apply an out-of-order predecessor. That is precisely the
   > divergence the rebase-and-regenerate rule above prevents, by giving the later merge a fresh,
   > later timestamp before it lands.

7. **Trunk-based branching, `<type>/<slice>-<short>`, squash-merge, PRs mandatory by
   convention.** The repository is private under a personal free account, so branch protection
   is probably unavailable and **no rule here is enforced by the platform**. That is accepted:
   the PR history's real job is evidence. `:243`-`:249` says the team will be asked how work was
   divided and how each member contributed, and a PR trail is the artifact that answers it
   without the evaluator taking anyone's word. Squash-merge preserves the PR author, so
   contribution stays visible — **paired work needs `Co-authored-by:` trailers** or the second
   person disappears from a rejection criterion.

   > **Corrected 2026-09-20 — this account is not on GitHub's Free plan, and branch protection is
   > available now.** `gh api user` reports the repository owner's account plan as **Pro**, not
   > Free (verified 2026-09-20). GitHub restricts private-repository branch protection, for a
   > personal account, to Pro, Team and Enterprise Cloud — a Free personal account cannot protect
   > a private repo's branches at all, but a Pro one can. **"Probably unavailable" was wrong; the
   > mechanism decisions 5 and 7 describe as unenforced can be turned on today.** This corrects the
   > premise only. Nothing here decides to enable it — that stays open, and until someone does,
   > every rule in this decision remains a convention the three developers keep, not one GitHub
   > enforces.

   > **Annotated 2026-09-20 — the `Co-authored-by:` requirement is retired.** Both surfaces that
   > carried it are gone: the PR template's checkbox and the `CONTRIBUTING.md` → *Branching*
   > bullet. **Nothing replaced either.** The reasoning above is kept as the record of why the rule
   > existed. ⚠️ **Squash-merge still keeps only the PR author and `:306`-`:312` still grades
   > contribution from all members**, so that exposure now rests on the PR trail alone — which is
   > what this decision argued the trail was for, but it is no longer checked at merge time.

8. **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`), satisfying `:310`'s "clear
   commit messages describing the changes" with no tooling.

## Considered options

**TypeORM** (rejected, decision 2). The NestJS-idiomatic choice, and entities beside their
modules match the vertical-slice division beautifully — which is exactly the trap. The division
it flatters is the one that hides schema collisions until migration time.

**Prisma's own multi-file schema** (`prismaSchemaFolder`, GA since 6.7.0) **(added 2026-09-20,
rejected, decision 2).** Splitting `schema.prisma` into a folder does not give this decision what
it wants: every file is merged before validation, so two developers editing different files can
still produce a conflicting schema that only fails at `migrate dev`, not at git merge. The single
file is chosen for what it guarantees, not because Prisma offers no alternative.

**Kamel authors every migration** (rejected, decision 4). The intuitive reading of "gated
through a single owner", and it contradicts the vertical-slice division already settled.

**Kamel as sole reviewer of everything** (rejected, decision 5). One person on the critical path
of every slice, at three developers and six weeks.

**Rewriting the existing commit history** to manufacture contributions from all three members
(rejected). The eight planning commits genuinely were one person's work, and `:243`-`:249` asks
the team to explain how work was divided — the honest answer is available and the fabricated one
is fragile.

## Consequences

- **Prisma 7 (decision 6's lock) sets implementation constraints the technical specification must
  satisfy, beyond the version number itself** *(added 2026-09-20, evidenced against Prisma's
  official v7 docs and v6→v7 upgrade guide)*. Recorded here as constraints for `/to-spec` to carry
  forward, not as instructions for how to satisfy them:
  - **Client generator**: `provider = "prisma-client"`, not the deprecated `prisma-client-js`,
    with an explicit `output` path — v7 no longer generates into `node_modules` by default, so
    every import of the client changes with it.
  - **Prisma 7 removed automatic client generation from `migrate dev`.** Development workflows
    must run `npx prisma generate` explicitly after schema changes when the generated client needs
    updating. Migration creation/application, client generation and seeding remain separate steps.
  - **For this project's direct PostgreSQL deployment, constructing `PrismaClient` requires a
    driver adapter.** `@prisma/adapter-pg` must be passed to `new PrismaClient({ adapter })`; a
    bare `PrismaClient()` against Postgres, valid before v7, no longer works. (The `datasource`
    connection string used by the CLI for migrations is unaffected — this requirement is about
    the application's runtime client, not the migration engine's connection.) This is a general
    v7 requirement, not something specific to Prisma Accelerate or any managed offering; this
    project uses neither.
  - **`prisma-client` defaults to ESM output, but CommonJS remains available.** The generator
    supports `moduleFormat = "cjs"` to produce a CommonJS client instead of the default ESM —
    relevant precisely because NestJS is CommonJS by default. Which module format the client
    uses, and whether the rest of the backend moves to ESM or stays CommonJS, is a technical-spec
    decision this ADR does not make; recorded here only so `/to-spec` doesn't design around an
    ESM requirement that isn't actually unavoidable.

    > **Corrected 2026-09-21 — ESM is not an unconditional default.** `prisma-client` is
    > ESM-first, but CommonJS remains available. The generator supports `moduleFormat = "esm"`
    > or `"cjs"`; when not specified, the module format is inferred from the environment. The
    > ESM-versus-CommonJS choice remains open for `/to-spec #1`.

    > **Operative wording, 2026-09-21 — this supersedes the historical “defaults to ESM” clause
    > above.** **`prisma-client` is ESM-first, but CommonJS remains available. The generator
    > supports `moduleFormat = "esm"` or `"cjs"`; when unspecified, the module format is inferred
    > from the environment.** `/to-spec #1` must choose the format; this ADR forces neither.
  - **This project needs a Prisma Config file at the project root (`prisma.config.ts`), and it
    must explicitly load the environment variables it uses.** Not a Prisma-wide mandate — a
    config file isn't required for every Prisma project — but this one needs it: `DATABASE_URL`
    resolution and the seed script path both move into it in v7. The schema `datasource` fields
    `url` and `shadowDatabaseUrl` move into Prisma Config as `datasource.url` and
    `datasource.shadowDatabaseUrl`; `directUrl` is removed rather than moved, and a former direct
    connection string used by CLI commands belongs in Config's `datasource.url`. The Config must
    load its own environment explicitly (for example `import "dotenv/config"`), not rely on
    unspecified implicit `.env` discovery.

    **The filename `prisma.config.ts` is this project's deliberate choice, not whatever a
    scaffolding tool defaults to.** **Prisma 7.10+** searches for `prisma7.config.*` first and
    falls back to an existing `prisma.config.*`; a fresh `prisma init` against this locked `^7`
    range can generate either name depending on the installed minor version — `prisma7.config.ts`
    is the current default for new projects — and the CLI discovers either one. `/to-spec` must
    create and use `prisma.config.ts` specifically, not simply keep whatever filename `prisma
    init` happens to scaffold.

    **The file does not exist in this repository yet** (no `package.json`, no `schema.prisma`
    either — verified 2026-09-20); `/to-spec` must create it, under that filename, with that
    explicit loading behavior.
  - **Prisma 7 removed automatic seeding from `migrate dev`/`migrate reset`.** In Prisma 6 and
    earlier, both commands ran the seed script automatically after applying migrations; v7
    removed this outright, and seeding now happens only via an explicit `npx prisma db seed`.
    This does not change decision 1's boot sequence — `migrate deploy` never auto-seeded, in any
    version, so its "`migrate deploy` followed by the seed" shape was already the two-step
    workflow v7 requires. It matters for the **local dev workflow** in `CONTRIBUTING.md`: `npx
    prisma migrate dev` no longer seeds a fresh local database on its own, where pre-v7 habit
    would expect it to.
  - **Node.js `^20.19.0`, `^22.12.0` or `^24.0.0`; TypeScript 5.4+.** Whichever base image
    ADR-0004 chooses for `api` must satisfy this — that choice belongs to ADR-0004 and is not
    repeated or re-decided here.
- **`schema.prisma` becomes the most contended file in the repository**, touched by nearly every
  slice. That is the intended trade: contention that git surfaces, rather than contention that
  surfaces at runtime.

  > **Clarified 2026-09-20 — “contention that git surfaces” does not mean Git reliably detects
  > schema conflicts.** The intended trade is that every schema change is centralized and globally
  > reviewable in one diff; Git conflict detection and Prisma validation remain separate safeguards.
  > Git detects overlapping line-range edits, while semantic conflicts can merge cleanly and still
  > require Prisma validation. The deliberate contention, centralization, and global visibility are
  > unchanged.
- **`CONTRIBUTING.md` and `.github/pull_request_template.md` now exist** and are where decisions
  6, 7 and 8 actually live. This ADR records *why*; those files are *what someone reads at the
  keyboard*.
- **The repository currently fails `:306`-`:312`, a rejection criterion.** All commits are by one
  author, and the other two developers are not collaborators on the repository at all. Provisioning
  that access is tracked separately and is the most urgent item this decision surfaced.
- **Nothing here is enforced by GitHub.** Every rule is a convention three people keep. If branch
  protection turns out to be available, decisions 5 and 7 are the ones to enforce first.

  > **Corrected 2026-09-20 — the "if" is resolved; branch protection is available, not yet
  > enabled.** See decision 7's correction: the account is GitHub Pro, and Pro supports branch
  > protection on a private repository owned by a personal account. Enabling it remains a decision
  > nobody has made. Until it is, this bullet's first sentence still holds: nothing here is
  > enforced by GitHub.

## Not settled by this decision

> **Forward pointer, added 2026-09-20.** All three items below are owned by
> [#28](https://github.com/ahmadmnsur/ft_transcendence/issues/28), *Settle repository governance*,
> and are blocked on [#16](https://github.com/ahmadmnsur/ft_transcendence/issues/16): `CODEOWNERS`
> auto-request has nobody to request from while the collaborator list holds one person. That ticket
> carries a fourth question, **record propagation**, which is **not** residue of this decision and
> is now **settled** — the rule lives in root `AGENTS.md`, in `docs/agents/issue-tracker.md`
> → *Record propagation*, and in `CONTRIBUTING.md` → *Records move together*, which is decision 6's
> own rule about where rules live applied to records.

- **Whether `CODEOWNERS` auto-request works on this plan.** Add it; treat it as a convenience, and
  never as the mechanism.
- **Migration naming beyond `<slice>_<change>`**, and whether migrations are ever squashed before
  defense.
- **What happens to a long-lived branch that falls far behind** — the rebase rule assumes branches
  stay short, which decision 7 intends but does not enforce.
