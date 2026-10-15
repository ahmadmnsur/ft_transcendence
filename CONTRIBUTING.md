# Contributing to 42 PeerConnect

Three developers, six weeks, one database. This file is the short version of
[ADR-0005](docs/adr/0005-prisma-and-the-schema-gate.md), which records why each rule exists.

## Roles

|             | Role                         | Also                           |
| ----------- | ---------------------------- | ------------------------------ |
| **Ahmad**   | Product Owner · Scrum Master | Developer · schema-gate deputy |
| **Kamel**   | Technical Lead / Architect   | Developer · **schema gate**    |
| **Hussein** | Developer                    | —                              |

> **Updated 2026-10-09.** Fadel left the team on 2026-10-01, and Ahmad took his Scrum Master role.
> Hussein Dakdouk (`hdakdouk42`) joined as a Developer on 2026-10-04. The team is Ahmad, Kamel and
> Hussein.

## Branching

* Branch off `main`. Keep branches **short-lived** — the rebase rule below assumes it.
* Name them `<type>/<slice>-<short>`, e.g. `feat/matching-round-open`, `fix/session-expiry`.
* One PR per slice increment. **Squash-merge**; GitHub then deletes the branch (*Merging*, below).
* **One ticket, one branch.** Assign yourself on the issue before starting, and never mix two
  tickets on a branch.
* **The issue shows where the work stands.** Anyone opening it should see that without reading the
  branch. Update it when something changes, not after every push (the PR already shows each push):
  comment `Started on <branch>` when you start; edit the issue body when the work changes the
  ticket itself (a criterion, the scope, a blocker); and write `Closes #<n>` in the PR, which shows
  the PR on the issue and closes the issue on merge.

## Merging

**Squash and merge is the only merge button, and GitHub enforces it.** Merge commits and rebase
merging are turned off in the repository settings, and the head branch is deleted automatically
on merge (verified 2026-09-27). Every PR lands on `main` as exactly one commit.

* **`main` takes changes only through a PR, and GitHub enforces it.** A ruleset on `main` refuses
  a direct push, a force-push and deleting the branch, for everyone, admins included (since
  2026-09-27). Work on your own branch and open a PR. It requires no approving review; the review
  rule below is still ours to keep.
* **The PR title becomes that commit's subject, and the PR description becomes its body.**
  The branch's own commit messages (`wip`, `fix typo`) do not reach `main`; GitHub only adds a
  `Co-authored-by:` line for each other person who authored a branch commit. So the title follows
  Conventional Commits (CodeRabbit warns when it doesn't), and the description says what changed
  and why: it is the permanent record.

  > **Corrected 2026-10-15 — CodeRabbit warns about nothing.** Since 2026-10-11 it runs on its free
  > plan here, which writes a summary only: no line comments and no pre-merge checks, the title's
  > included ([#165](https://github.com/ahmadmnsur/ft_transcendence/issues/165)). The PR's reviewer
  > checks the title, since it becomes the commit subject on `main`.
* **No bot or AI text reaches `main`, and GitHub enforces it.** The *No bot or AI text* check
  (`.github/workflows/no-bot-text.yml`) fails a PR whose title or description carries a review
  bot's summary, a `Generated with` line or a `Co-authored-by:` line naming a bot or an AI tool,
  or that has a commit authored by a bot. A ruleset on `main` requires it to pass before merging
  (since 2026-09-27). Fix the description or drop the commit; editing re-runs it, and if an older
  failed run still blocks the merge, use *Re-run jobs* on it. Repository admins can bypass it,
  and GitHub asks them to confirm each time.
* **Rebasing your own branch is unaffected.** `git rebase main` before merging works as before;
  only the merge button changed. Push the rebased branch with `git push --force-with-lease`; never
  force-push `main` or someone else's branch.

## After a merge

**A merged branch is finished. Never push to it again.** `main` already holds its squashed
commit, so a later PR from the old branch would carry those commits a second time and can hit the
same merge conflicts again.

* **A bug in merged work gets a new branch off `main` and a new PR.** Title it `fix: …`; in the
  description, name the PR that introduced the bug (`Fixes a regression from #42`) and write
  `Closes #N` if an issue tracks it. Main then reads as the change, followed by its fix.
* **Need to look at the old branch?** The merged PR keeps every commit and comment, and has a
  **Restore branch** button. Your local copy is not touched by the auto-delete. Read it; don't
  build on it.
* **A merge broke `main` badly?** Click **Revert** on the merged PR. That opens a PR undoing the
  whole change; it needs its review like any other. Merge it, then redo the work on a new branch.
  **Never force-push `main`**: a revert is a new commit and keeps everyone else's clone intact.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`,
`docs:`, `test:`, `refactor:`. `document/en.subject.md:310` requires "clear commit messages
describing the changes", and it sits in the list that gets a project **rejected**.

## Review

* **Every PR needs one *completed* review from another member.** Requesting a reviewer is not a
  review — the box is ticked when the review has been given. Not enforced by GitHub — this
  repository is private on a free plan, so there is no branch protection. It is a convention the
  three of us keep, and the PR history is what we show an evaluator when asked how work was divided.

  > **Corrected 2026-09-20 — this account is not on the Free plan.** `gh api user` reports the
  > owning account's plan as **Pro**, which does support branch protection on a private repository
  > (Free personal accounts cannot; Pro, Team and Enterprise Cloud can). The mechanism is available;
  > nobody has turned it on. Until that happens, this rule is still a convention, not a
  > platform-enforced one. See ADR-0005 decision 7.

  > **Annotated 2026-09-27 — a PR is now required, a review is not.** A ruleset makes every change
  > to `main` go through a PR (*Merging*, above), but it asks for no approving review. This rule
  > is still a convention. See ADR-0005 decision 7.
* **PRs outside the Prisma gate: round-robin.** Anyone reviews anyone.
* **PRs touching `prisma/` or the root `prisma.config.ts`: Kamel reviews, always.** If he is blocked
  for more than 24 hours, **Ahmad** deputises. Ahmad also watches for the stall, which Fadel did
  until he left on 2026-10-01. If the change touches personal data, that review also confirms the
  Privacy Policy moved with it (*Personal data moves the Privacy Policy*, below). **A PR that adds a
  Prisma Config anywhere else is inside the gate too, and is refused:** Prisma 7.10+ would load a
  root `prisma7.config.*` or `.config/prisma7.*` in preference to `prisma.config.ts`, the only
  Config this project has, and every Prisma 7 release would load a root `prisma.config.js` in
  preference to it (ADR-0005 d5).

  > **Read off the file list, 2026-09-23** ([`docs/spec.md`](docs/spec.md) §3.2, M16). "Anywhere
  > else" is every path Prisma 7 can discover a Config at, which is three patterns: `/prisma.config*`,
  > `/prisma7.config*` and `/.config/prisma*` (each covers every extension and the `…/index.*`
  > directory form; `.config/prisma.*` and `.config/prisma.config.*` load once `prisma.config.ts` is
  > gone). A PR adding any file matching one, other than the root `prisma.config.ts`, is inside the
  > gate and refused.

  > **When Kamel authors a gated PR, Ahmad reviews it, 2026-09-24** ([`docs/spec.md`](docs/spec.md)
  > §17.2; ADR-0005 d3). Nobody reviews their own PR. The first such PR is Kamel's week-1
  > infrastructure PR: its boot command needs `prisma.config.ts`, `prisma/schema.prisma` (generator
  > and datasource, no feature table yet) and the seed entry `prisma/seed/main.ts`, all inside the
  > gate.

  > **Supabase's files join the gate, 2026-10-10** (ADR-0005 d5). Also inside it: `supabase/**`,
  > every `compose*.yaml` (the fallback's Auth settings are its `GOTRUE_*` lines), the Storage
  > buckets' settings (the seed's first step, already under `prisma/seed/**`) and the reset commands
  > under `prisma/reset/**`. Kamel reviews them as he reviews `prisma/`, with the same deputy.
  > **A PR that moves or renames a gated file updates this list, the PR template's and
  > `.coderabbit.yaml`'s in the same PR, and is gated itself.** The rules for the team project are in
  > *Supabase*, below.

## Schema changes — read this before touching `prisma/` or `prisma.config.ts`

**You write your own migration. Kamel reviews it.** You own your feature DB-through-UI; the
gate exists to catch bad or conflicting schema, not to take authorship away from you.

**You also author your own `prisma.config.ts` change; the gate holder reviews it.** Prisma 7 Config
selects the schema, migration path, migration datasource and seed command, so changing that root
file can affect the same shared mechanisms as changing `prisma/`. Files outside these two Prisma
surfaces and the seed (rule 3 below) remain round-robin.

> **Not only these, 2026-10-10:** `supabase/**`, the Compose files and the reset commands are inside
> the gate too (*Review*'s note of that date, above).

**`prisma` and `@prisma/client` are constrained to the `^7` major in `package.json` — don't let an
install pull Prisma 8.** (`^7` is a semver range, not an exact-version pin — no exact patch/minor
is fixed.) The rebase/regenerate workflow and migration-ordering model below are both version 7's;
Prisma 8 (GA expected October 2026) replaces them with a different, incompatible model.
*(ADR-0005 decision 6, locked 2026-09-20.)*

```bash
# 1. edit prisma/schema.prisma
# 2. create + apply the migration locally
npx prisma migrate dev --name <slice>_<change>
# 3. regenerate Prisma Client explicitly
npx prisma generate
# 4. commit schema.prisma AND the generated migration together
# 5. open a PR and request Kamel
```

> **Where and how these run, 2026-09-23** ([`docs/spec.md`](docs/spec.md) §15.5–§15.6, M16). `db`
> publishes no port and `DATABASE_URL` names the Compose host `db`, so the commands above cannot
> reach the database from your machine. Run them inside the dev overlay's `api` container, whose
> bind mount puts the migration and the client back in your working tree, and pin the Config as
> every Prisma invocation does:
>
> ```bash
> docker compose -f compose.yaml -f compose.dev.yaml exec api \
>   npx prisma migrate dev --config prisma.config.ts --name <slice>_<change>
> docker compose -f compose.yaml -f compose.dev.yaml exec api \
>   npx prisma generate --config prisma.config.ts
> ```
>
> The same holds for `npx prisma db seed` below (`make seed` wraps it). If `migrate dev` resets your
> database, the next boot re-seeds it: the seed treats its completion record over empty tables as
> stale (§14.9).

> **Read the generated SQL before step 4, 2026-09-24** ([`docs/spec.md`](docs/spec.md) §4.4,
> §17.2). Eight schema objects exist only as hand-written SQL, because Prisma cannot represent them:
> five `CHECK` constraints (`post_exactly_one_origin`, `report_exactly_one_target`,
> `report_no_self_student`, `report_state_attribution`, `private_feedback_rating_range`) and three
> indexes (`friendship_unordered_pair`, `round_single_open`, `match_pair_history`). When
> `migrate dev` emits a statement that drops or alters any of them, or drops and recreates an
> unchanged Report partial unique index (`report_one_per_reporter_post`,
> `report_one_per_reporter_student`), **delete that statement before committing**. Kamel checks for
> it at the gate, and test category 2 fails the suite if any of the ten is missing after
> `migrate deploy`, but getting the migration right is the author's job first.

> **Nine since 2026-10-02** ([`docs/spec.md`](docs/spec.md) §4.4; [ADR-0014](docs/adr/0014-the-entity-set-and-relations.md)'s
> *Consequences* count note). A ninth hand-written step, in the migration that creates `Student`,
> gives display names the same collation on every stack:
> `ALTER TABLE "Student" ALTER COLUMN display_name TYPE text COLLATE "und-x-icu";`. A later
> `ALTER COLUMN … TYPE` on `display_name` silently puts it back on the database's default, so delete
> one that `migrate dev` emits as well. Category 2 checks the ten named objects and the column's
> collation. The move to Supabase adds no step.

**`migrate dev` no longer runs `prisma generate`.** Prisma 7 keeps migration and client generation
as separate steps, so run the explicit generation command above after schema changes when the
generated client needs updating. *(ADR-0005 Consequences, added 2026-09-20.)*

**`migrate dev` no longer seeds your local database on its own.** Prisma 7 removed automatic
seeding from `migrate dev`/`migrate reset`; run `npx prisma db seed` explicitly if you want seed
data after the command above. *(ADR-0005 Consequences, added 2026-09-20.)*

### The three rules

1. **A merged migration is immutable — fix forward, never edit.**
   Prisma checksums applied migrations in `_prisma_migrations`. Editing one that is already on
   `main` breaks **every other developer's database** with a checksum mismatch. If it is wrong,
   write a new migration that corrects it.

   > **Tightened 2026-09-20 — concretely, that means `migrate dev` prompts a destructive reset,
   > or `migrate deploy` blocks the deploy.** Not silent corruption: Prisma detects the checksum
   > drift and refuses to proceed. Locally that means a prompt to **reset the database**
   > (discarding your data); in CI/production, `migrate deploy` errors out instead. See
   > ADR-0005 decision 6 for the full explanation.

   > **Corrected 2026-10-10 — `migrate deploy` does not error out.** It skips a migration whose name
   > is already applied, edited or not, and exits 0, so that database silently keeps the old version
   > (tested with Prisma 7.10.0; ADR-0005 decision 6). The rule stands, and matters more: fix forward.

2. **Rebase onto `main` before you merge. If `schema.prisma` moved underneath you, regenerate.**
   Prisma orders migrations by their timestamp directory, not by merge order. Two people working
   in parallel can produce a history that applies in one order on their laptops and a different
   order on a fresh clone. Rebasing is what keeps those two identical.

   > **Clarified 2026-09-20 — "regenerate" is your own unmerged migration, never one already on
   > `main`.** Rule 1 above is unconditional; rebasing creates no exception to it. What may be
   > discarded and recreated is the migration this branch produced and has not yet merged, so it
   > sits correctly on top of the rebased schema. See ADR-0005 decision 6.

   > **Tightened 2026-09-20 — the "different order" risk is about out-of-order timestamps against
   > already-applied history, not the same migrations applying differently in different places.**
   > An identical set of migration directories always applies in the same name-sorted order,
   > locally or on a fresh clone. What actually diverges is which migrations a given database has
   > already recorded as applied — rebasing before merging is what keeps a later merge's timestamp
   > later than whatever it followed. See ADR-0005 decision 6 for the full explanation.

3. **The seed is gated exactly like the schema.**
   `prisma/seed.ts` runs on every boot (ADR-0004 decision 11) and must stay **idempotent**. It is
   shared contention, so it goes through the same reviewer. **"The seed" is all of it, wherever it
   lives**: the entry `prisma.config.ts` registers, every module that exists only for the seed, and
   the **fixture module it seeds from**, whose Skill lists become the seeded catalogue. The
   application code it drives stays round-robin. A change to any of it also needs the clean-clone
   check below (ADR-0005 d6, ADR-0016 d5). **`/to-spec #1` fixes where the seed's code and the
   fixture module live, and those paths are listed here beside `prisma/**`**, so a PR touching
   one is inside the gate by its file list alone.

   > **Paths fixed 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](docs/spec.md) §3.2, M15). The seed
   > is `prisma/seed/**` — its entry `prisma/seed/main.ts`, which `prisma.config.ts` registers as
   > compiled `dist/prisma/seed/main.js`, every seed-only module, and the two seeded files in
   > `prisma/seed/assets/` — and the fixture module is `prisma/fixtures/**` (`cohort.ts`). **Both sit
   > inside `prisma/**`**, so the gate's file-list test needs no second pattern. `prisma/seed.ts`
   > above names the entry as it was imagined before this.

### Supabase

*Added 2026-10-10 (ADR-0005 d5).* The team project holds `main`'s data and the defense's, and its
settings live in its dashboard, where no PR shows them.

* **Test a migration on the local fallback only**: `make dev`, `make local` or `make test`. Never
  boot a branch carrying one with `make up` and the team `.env`: the team project would apply it
  before review, and if review then changes it, `migrate deploy` skips the merged version, whose
  name is already applied, so the team project silently keeps the old one. Migrations reach the
  team project only through `make up` on `main`.
* **Nothing links into Supabase's own schemas.** No foreign key or SQL into `auth` or `storage`:
  the test database has neither, and Supabase owns them.
* **The team project's settings are recorded in
  [`supabase/team-project.md`](supabase/team-project.md).** A new setting is a PR changing that
  file and, where it names one, the matching `GOTRUE_*` line in `compose.yaml`; Kamel changes the
  dashboard after it merges.
* **Nobody changes the team project by hand** (tables, rows, settings, Supabase Auth users), except
  the four cases that file lists, each Kamel's.

## Testing

**We test only what fails silently.** `document/en.subject.md` asks for no test suite anywhere, so
the suite is thin on purpose and stays that way — see
[ADR-0016](docs/adr/0016-a-thin-suite-over-what-fails-silently.md).

**Vitest, one runner, one command.** Integration tests against Supabase's own Postgres, Auth and
Storage in `make test`'s throwaway copy. No unit/integration/e2e pyramid, and no coverage target.

> **How it runs, updated 2026-10-04** ([ADR-0004](docs/adr/0004-deployment-shape.md) d8;
> [`docs/spec.md`](docs/spec.md) §16.2, §16.4). The command is `npx vitest run`; locally, run it as
> **`make test`**. That target starts a separate `peerconnect-test` copy of the local Supabase
> services from empty, runs a fresh `api` dev container, then removes its containers and volumes
> even if the suite fails. Run one copy at a time. The suite creates its own `<database>_test`
> database inside that copy and runs `prisma generate` first. The file-upload tests go through a
> real `nginx` using the repository's own `proxy/snippets/api.conf`. CI uses the same isolated copy
> for migration, seed and suite checks. *(Added 2026-10-13, from `docs/spec.md` §16.2:)* the
> harness's first step refuses any target but the local fallback, naming the variable and the host,
> never the password.

**The closed list of what is covered:**

1. **The matcher** — matching is atomic, so there is no correction window, and a regression shows
   up as pairs quietly never forming. Asserts C3, C4, C6 and C7 from
   `prototypes/compatibility-score/SUCCESS-CRITERIA.md`. **C1, C2 and C5 are not assertions** —
   they failed and ADR-0006 resolved them by decision. Also asserts no-repeats: a pair with a prior
   Match of any status, `DECLINED` and `TERMINATED_BY_ADMIN` included, is never proposed.

2. **The eight raw-SQL migration steps** — five `CHECK` constraints, two unique expression indexes
   and the non-unique no-repeats lookup index. If a migration stops creating one of the first seven,
   the database accepts bad data and says nothing; without the last, the no-repeats test silently
   becomes a scan. The Report checks cover its target, Student self-reporting, and
   state/attribution tuple.

   > **Also asserted, 2026-09-24** ([`docs/spec.md`](docs/spec.md) §4.4, §16.3). Both Report partial
   > unique indexes exist by name after `migrate deploy` — declared natively today, raw SQL if the
   > preview fallback is ever taken — so the category checks ten named objects, not eight.

   > **Nine steps, 2026-10-02** ([`docs/spec.md`](docs/spec.md) §4.4, §16.3; ADR-0016 d1). The
   > ninth sets `Student.display_name`'s collation to `und-x-icu`. Without it names fall back to the
   > database's default order, code point on the hosted project, and nothing says so, so the category
   > asserts the column's collation beside the ten named objects. With the preview fallback, the
   > raw steps are eleven.

3. **At most one standing Match per Student per Round** — the one invariant the schema cannot
   hold, violable through an Admin's hand-made Match. Two concurrent hand-made creations sharing a
   Student must admit exactly one Match and reject the other with nothing written.

4. **File access control** — signed out is 401, signed in as an unrelated Student is 403.

5. **Socket.IO origin admission** — with a real valid session, the Engine.IO gate accepts an
   exact `Origin === PUBLIC_ORIGIN` and rejects absent, `null` and mismatched origins. It also
   verifies that the browser connection is WebSocket-only and HTTP long-polling is unavailable.

6. **Reflection Prompt serialization** — exercises publication versus answer, two publications
   with equal timestamps, answer versus Round close, and duplicate/retried answers. It asserts one
   live Prompt by the durable, real-time-respecting publication order, no answer accepted after
   supersession, and at most one atomic Post + XP + Badge + qualifying-activity success. It also
   asserts that only the serialized Round-close transaction updates the stored Streak for the
   correct Round, skipping Suspended and Removed Students. A Student with an unreviewed Match but an
   accepted Prompt answer in that Round must increment rather than reset Streak; the paired case
   with no qualifying activity anywhere in the Round must reset it.

7. **Student lifecycle and Admin lockout invariants** — asserts that matching uses only active,
   non-`ADMIN` Students with a Skill; role and sanction changes serialize against Match creation;
   a hand-made Match serializes against Round close, so none commits into a closed Round;
   a Block serializes against a new Friendship request, so a Block and a Friendship row never
   coexist; Removed rows are view-only and keep their email unavailable; and concurrent Admin demotion,
   Suspension or Removal always leaves at least one active Admin.

8. **File acceptance, authorization and lifecycle** — through nginx, asserts exact byte caps and
   server-side byte validation; rejects type spoofing and Avatar PDFs; anchors Evidence reads and
   writes to the owning Review's Match; distinguishes pair-bound Peer Moderator access from role
   access; preserves Evidence through Suspension and Removal; keeps failed replacement atomic; and
   rejects upload mutations without the exact Origin and `X-PeerConnect-CSRF: 1` header.

   > **Made explicit 2026-09-24** ([`docs/spec.md`](docs/spec.md) §9.4, §16.3; ADR-0009 d5,
   > ADR-0016 d1). "The owning Review's Match" decides writes whatever the writer's current role:
   > a Mentee promoted to `ADMIN` after the Review still creates, replaces and deletes that Review's
   > Evidence, while the Mentor and every Admin outside the pair get 403.

   > **Four checks join, 2026-10-05** ([`docs/spec.md`](docs/spec.md) §9.8, §16.3; ADR-0016 d1).
   > Files live in Supabase Storage and their rows in Postgres, two stores no transaction covers:
   > after a replace or a delete the old file is gone; a save that fails before anything can commit,
   > a refusal or the 30-minute rule, leaves no new file; the cleanup deletes a file no row names
   > only once it is more than an hour old, across several pages, and never one a row names; and the
   > bucket step creates both buckets, private, and sets back one whose settings differ. The suite's
   > files go to buckets of its own, `test-avatars` and `test-evidence`, and the cleanup never runs
   > by itself in the harness.

9. **Review, XP and Badge transaction integrity** — asserts one atomic Review/status/Takeaway/
   Private Feedback/XP/Badge success under duplicate or retried submission; serial outcomes against
   Round close, Decline, Suspension and Removal; completion of a Match that predates promotion to
   Admin with the Admin still filtered; and cumulative XP plus exactly-once threshold Badges when
   valid Review and Prompt awards overlap for one Student. It also orders Suspension/Removal against
   Round close when qualifying activity already exists, and proves the Leaderboard's viewer-rank pin
   cannot reintroduce an Admin, Suspended Student or Removed Student. The same-Badge contention case
   must prove both distinct valid event records and XP increments commit exactly once, exactly one
   BadgeAward remains, and conflict recovery neither loses the threshold nor cancels valid XP. For
   promotion, it also proves retained XP still drives the ordinary profile Level and earned Badges
   remain normally available while only the Admin's Leaderboard row and personal-rank pin disappear.

   > **Corrected 2026-09-24** ([`docs/spec.md`](docs/spec.md) §10.4, §16.3; ADR-0016 d1). Two
   > *valid* events for one Student can't be made to contend for one Badge under `SERIALIZABLE`.
   > The only schedule close to it has a Student answer Prompt *n* while *n+1* is published and
   > answered. The test asserts what that schedule actually produces: the Prompt-*n* answer is
   > refused `prompt_not_live` and writes nothing, and the Prompt-*n+1* answer commits once with
   > +20 and exactly one Knowledge Sharer. The Review-plus-answer overlap above is unchanged.

10. **Report integrity, authorization and group serialization** — asserts the two target-specific
    uniqueness rules and Report CHECKs; one winner plus an `already reported` loser for two
    concurrent filings by the same reporter against the same target, with the winning row
    unmodified; one winner plus an `already resolved` loser for concurrent
    actions on the same open group; uniform terminal state and attribution; and the serial outcomes
    of filing against resolution or target Removal. Remove Post and Remove Student must each commit
    atomically with `ACTIONED` open reports, while Suspension leaves Student reports open. A Peer
    Moderator sees only eligible open Post groups, never reporter identity or resolved history, and
    one conflicting open reporter hides the whole group. A reported Admin cannot read or resolve
    their own Student/Post group or any open group/resolved batch containing a Report they filed;
    another Admin retains reporter-visible audit access. The action request must re-run
    session/current-role/sanction authorization after a stale queue read, and a Block create/remove
    race proves the conflict guard is evaluated at the action serialization point.

    > **Scope made explicit 2026-09-24** ([`docs/spec.md`](docs/spec.md) §12.5, §12.7, §16.3;
    > ADR-0011 d9–d10). The Admin guard above covers the queue read and the two resolve endpoints,
    > not Users-table sanctions. Remove Student actions **every** open report on its target, one the
    > removing Admin filed included, attributed to that Admin; the batch is then hidden from that
    > Admin's resolved audit and shown to another Admin with its reporters. The test asserts that
    > case.

11. **Name search** — `display_name_search`, the folded copy of the display name, agrees with
    `display_name` only because every path that writes a name saves both through `nameFields`. A
    path that skips the helper raises no error: the Student is simply not found under the new name.
    The category writes a name through sign-up, the Student's own edit and the Admin edit, and any
    path added later, and asserts that searching its plain form (`helene`, `احمد`, `فاطمه`) finds
    the Student, and that after a rename to a name whose folded form does not contain the old one,
    the old one no longer does. *(Added 2026-10-02; ADR-0016 d1, [`docs/spec.md`](docs/spec.md)
    §16.3.)*

12. **Sign-in** — Supabase Auth checks the password outside PeerConnect's transaction, and two of
    the decisions after it can go wrong behind a normal-looking answer. A Suspension or Removal is
    told only after the right password: a wrong one gets `password_incorrect`. A completed password
    change leaves no session the old password opened, in every order the test stages, the one
    between the change's first sign-out and Supabase's admin update included, held at the named
    pause outside a transaction. Two checks cover Sign in with 42, with only the two calls to 42
    replaced by a fixed answer: a 42 login finds its Student only by `forty_two_id`, even after an
    Admin edits emails; and a password is set without the current one only within a fresh Confirm
    with 42. *(Added 2026-10-04 and 2026-10-08; ADR-0016 d1, [`docs/spec.md`](docs/spec.md)
    §16.3.)*

**Adding a test outside that list needs an argument.** The rule is *does it fail silently?* —
anything the compiler or a demo step would catch is not tested. Twelve categories, closed until
someone argues a thirteenth. *(Ten until 2026-10-02, eleven until 2026-10-04; ADR-0016 d7.)*

**CI is advisory for the current repository setup.** Branch protection is unavailable on this
plan, so the workflow cannot block a merge. Its job is evidence for
`document/en.subject.md:243`-`:249`: a green check per PR is how an evaluator sees how work was
divided without taking our word for it. **It may become a required check if branch protection
becomes available** — ADR-0016 leaves that open by name, and ADR-0005 decision 7 lists it among the
first rules to enforce if it is.

> **Corrected 2026-09-20 — branch protection is not unavailable on this plan; it is simply not
> turned on.** The account is GitHub Pro, which supports branch protection on a private repository.
> CI's advisory status is unchanged by this correction — nobody has decided to make it a required
> check, and this paragraph does not decide that now. See ADR-0005 decision 7.

> **Annotated 2026-09-27 — one required check now exists, and it is not CI.** A ruleset on `main`
> requires *No bot or AI text* (*Merging*, above), a separate workflow that reads only the PR's
> title, description and commit authors. `ci.yml` is untouched by it and stays advisory.

## Done

**A ticket is done when its PR is merged with every box in the template ticked.** There is no
second definition — the template *is* the definition, so it cannot drift from the checklist beside
it, and it can be checked without asking anyone.

That means, every time: the suite green, the ticket's acceptance criteria met, **one completed
review**, and — if the PR touches `prisma/`, `prisma.config.ts`, the seed (rule 3 above), the
Compose files or a Dockerfile — **a clean-clone boot verified**.

> **Two more triggers, 2026-10-10** (ADR-0016 d5): `supabase/**`, except its Markdown files, and
> `.env.example`. Parts of both act only when a database volume is created, so a broken change
> can pass on your working stack and fail on a fresh clone.

> **"The suite green" starts with the first test, 2026-09-24** ([`docs/spec.md`](docs/spec.md)
> §16.8). `npx vitest run` exits 1 when there is no test file to run, so a PR that lands before the
> first `test/<NN>-<category>/*.test.ts` — the week-1 infrastructure PR among them — ticks that box
> *not applicable*. From the PR that adds the first test file it is required on every PR. Nobody
> sets Vitest's `passWithNoTests`: it would also let a broken test path pass as green. CI's own
> steps are added the same way, as their prerequisites land (§16.4).

If a change to an ADR, the project map, or a GitHub issue moves a rule, acceptance criterion,
scope, status, or resolved question, **the affected records moved together in the same task**.

If it changes what personal data is stored, who can see it, or how long it is kept, **the Privacy
Policy moved with it in the same PR** — see *Personal data moves the Privacy Policy* below.

If it adds or changes text the SPA shows, **that text is in English, French and Arabic in the same
PR, and the SPA build passes** — see *Text ships in three languages* below, which also says what a
slice does until `web/src/i18n/` exists.

### Records move together

**A settled decision is represented across three surfaces**: its **ADR** in `docs/adr/`, the
**GitHub issue that owns it**, and the **map**
([#1](https://github.com/ahmadmnsur/ft_transcendence/issues/1)). **Not every decision reaches all
three — synchronize the surfaces that exist rather than inventing one to match.** Three record
audits found the same miss — a correction lands on whichever surface the fixer was looking at and
stops there — so this is now a rule rather than a habit.

> Whenever an ADR, project-map entry, or GitHub issue changes a rule, acceptance criterion, scope,
> status, or resolved question represented on another record surface, **inspect and synchronize every
> applicable record surface that exists in the same task.**

It fires in **both directions**, in the same task. From an **ADR**, find the owning issue by searching
the issues for the ADR's filename — it is the ticket whose resolution comment records that ADR, and
the other hits are cross-references worth checking too. From an **issue**, its ADR is named in the
resolution comment, and any ADR still pointing at a question the issue has now settled needs a
forward pointer. Either way, fix the map's line if the change moved the decision's scope.

**Not done until it is synchronized.** A substantive change sitting on one surface only is not
done, whatever else the PR ticks.

**The loop closes after the merge.** Record edits posted to the map or an issue before their PR
merges (a rule, criterion, scope, status or resolved question moved) are marked *(uncommitted)*.
Once it merges, add `Landed on main at <sha>` beside them, naming the squash commit, so no record
keeps calling a change pending once it is on `main`. If the PR closes unmerged, annotate them as
withdrawn instead. Progress comments on a ticket (*Branching*, above) are not record edits and
need no such note.

**A wording or formatting edit that leaves the meaning intact fires none of this** — the threshold
is there so the rule stays worth keeping.

**Annotate, never rewrite.** These records are what we hand an evaluator, so a correction is
*added* where the stale claim is read and the original stays visible:

> **Corrected 2026-09-20 by ADR-0015 d9**: this read "no charts". `/admin/analytics` ships exactly
> one charted surface; the operational tables stay tables.

That already holds across ADR-0002 d6, ADR-0008 d10 and ADR-0010 d4, and it applies to issue bodies
and resolution comments the same way. The version with the `gh` commands is `AGENTS.md`
→ *Record propagation* and `docs/agents/issue-tracker.md`.

### Personal data moves the Privacy Policy

[`docs/legal/privacy-policy.md`](docs/legal/privacy-policy.md) is the data model told to the people
it describes, and `document/en.subject.md:336` rejects the project if it is inadequate. It goes
stale the first time someone adds a column. So:

* **A PR that changes what personal data is stored, who can see it, or how long it is kept updates
  the Privacy Policy in the same PR.** A new column holding something about a Student, a new
  surface showing it, and a new delete path all count.
* **A PR that changes a conduct rule or a sanction updates
  [`docs/legal/terms-of-service.md`](docs/legal/terms-of-service.md)** — including the Report
  reasons, which are the Terms' first three rules (ADR-0011 d4).
* **Kamel checks it on `prisma/` PRs**, as part of the schema gate. Everywhere else, the PR
  template's Done box is the check.

  > **On every gated PR, 2026-10-10:** the gate now also covers `supabase/**` and the Compose files
  > (*Review*, above), and the check comes with it.
* **The pages are corrected in place, not annotated.** They are user-facing text, not records an
  evaluator audits; update the *Last updated* date and let git keep the history.

The rules the pages already bind — one cookie, nothing fetched from third parties, no passwords or
request bodies in logs, and the rest — are in
[ADR-0018](docs/adr/0018-the-legal-pages-describe-the-model-as-built-and-bind-it.md).

### Text ships in three languages

PeerConnect claims the multi-language and right-to-left Minors
([#139](https://github.com/ahmadmnsur/ft_transcendence/issues/139)), so every text the SPA shows,
or gives to a screen reader, exists in English, French and Arabic. What counts, and what is never
translated (names, text for developers, the seed's text, what the browser or 42 draws), is settled
in [#142](https://github.com/ahmadmnsur/ft_transcendence/issues/142). The legal pages stay out of
the dictionary: they are Markdown files, translated on their own build ticket (ADR-0018 d14's note
of 2026-10-13). The rules below hold once the foundation build ticket has created `web/src/i18n/`;
*Before the foundation* says what a slice does until then, and which rules hold already. The
mechanism behind them, the dictionary, its checks and right to left, is
[`docs/spec.md`](docs/spec.md) §3.5.2 and §3.5.5, and the decisions are
[ADR-0020](docs/adr/0020-peerconnect-speaks-english-french-and-arabic.md).

* **The author writes all three languages, in the same PR.** Every text a PR adds or changes goes
  into the area file of the same name in `web/src/i18n/en/`, `fr/` and `ar/`, with each language's
  plural forms ([#144](https://github.com/ahmadmnsur/ft_transcendence/issues/144)). English is the
  source, and the fallback when a text is missing.
* **The SPA build is the check.** `npm --prefix web run build` runs `tsc -b`, which fails on a
  missing text, plural form or placeholder and names each by its key. CI runs it but is advisory
  (ADR-0016 d8), so the template's *Three languages* box asks for it too: a PR merged with it red
  stops `make up` for everyone who pulls `main`.
* **Use the domain's words.** Each term in `CONTEXT.md` has one French and one Arabic word beside
  it; write that word, never a synonym. A PR that adds a term to `CONTEXT.md` gives it both words.
* **One voice.** French says *vous*, and Arabic is Modern Standard Arabic. Both use the masculine as
  the generic form, rephrased to avoid gender where that is easy, never `étudiant·e` or `طالب/ة`.
  French capitalizes a term as English does (*un Match*, *le Tour 3*); Arabic has no capitals.
* **Nothing is joined or typed in code.** A sentence is one message with placeholders. Numbers,
  dates and lists are written by `Intl` in the current language, and a name goes through
  `PersonName` or its plain-text helper. Every form sets `noValidate`, so every form error is
  PeerConnect's own text. A text the SPA shows is read from the dictionary, never typed into a
  component: `tsc` cannot see that, so the PR's reviewer looks for it.
* **Before the foundation.** Until `web/src/i18n/` exists, a slice writes its text in English only,
  in one object per area, shaped like the dictionary: nested camelCase keys, a text chosen by a code
  keyed by that code, `{camelCase}` placeholders, and a count's text as its `one` and `other` forms.
  `authCopy` and its code map in `web/src/auth/messages.ts` are the model. Three rules hold already:
  the SPA build passes (*The SPA build is the check*), a PR that adds a term to `CONTEXT.md` gives
  it both words (*Use the domain's words*), and *Nothing is joined or typed in code*, with the
  object in the dictionary's place. Whichever of the slice and the foundation build ticket merges
  second moves the object into `web/src/i18n/` and adds its French and Arabic.
* **Hussein proofreads, after merge.** At least once a week while slices merge text, he reads what
  changed in `fr/` and `ar/` since his last pass and fixes it in one `fix:` PR, whose description
  names the last commit it read; the next pass starts after it. A last pass merges before
  Pre-defense readiness ([#73](https://github.com/ahmadmnsur/ft_transcendence/issues/73)). The
  French and the Arabic of Hussein's own PRs, those passes included, are checked by the PR's
  reviewer before merge.

### The clean-clone check

Run **each check independently from a separate fresh clone**. Do not run the two commands
back-to-back against the same working clone.

**A fresh clone is not a fresh database.** Compose groups containers and volumes by project
name, and every clone of this repository shares that name. So before each check, no container or
volume may remain under it, whether from the other check or from your working stack. Otherwise the
boot reuses a database that is already migrated and seeded, and proves nothing about starting from
empty. Clearing that state is not setup ([ADR-0016](docs/adr/0016-a-thin-suite-over-what-fails-silently.md)
d5).

> **The command and the pass line, 2026-09-24** ([`docs/spec.md`](docs/spec.md) §16.5, M20). Clear
> with **`make wipe`** (`docker compose down --volumes --remove-orphans`) from any clone, before each
> check; every clone shares the project name `peerconnect`. A check passes when `api` turns healthy
> with the seed logging completion from an empty database, `https://localhost:8443` shows the
> sign-in page after the certificate warning, the bootstrap Admin and the demo Student can sign in,
> `/admin/rounds` shows four closed Rounds and none open, and the console is clean.

> **That pass line is the final one, 2026-09-24** ([`docs/spec.md`](docs/spec.md) §16.5 step 6). It
> binds in full before defense and on every PR from the one that completes the seed's four-Round end
> state. Before that, a criterion counts from the PR whose slice creates it: the infrastructure
> gate's own PR passes when both boot paths come up from an empty database with nothing run first,
> the boot chain runs to a healthy `api`, `https://localhost:8443` serves the bundle after the
> certificate warning with port 8080 redirecting to it, and the console is clean. List in the PR's
> clean-clone box which criteria you checked. Nobody is asked for four closed Rounds before the code
> that makes them exists.

**Check 1 — project entry point:**

```bash
make up
```

**`make up` is the project's entry point.** It bootstraps `.env` from `.env.example` when
`.env` is absent and then brings the stack up, so an evaluator does not need to hand-write
environment configuration (ADR-0004 decision 8).

The Compose invocation used by `make up` is an implementation detail inside the `Makefile`;
bare `docker compose up --build` must also work independently.

`document/en.subject.md:314` requires deployment to run with **a single command**; it names no
particular command and does not rule out a `Makefile`.

**Check 2 — independent Compose path:**

From a **different fresh clone**, run:

```bash
docker compose up --build
```

This must also work end-to-end **without relying on `make up` or any setup performed by the
Makefile**. A fresh clone must therefore provide everything bare Compose requires through the
Compose/configuration design itself; the direct Compose path must not depend on `.env` having first
been created by `make up`.

**That is not a duplicate of the first.** ADR-0004 decision 8 requires bare Compose to work on its
own precisely so **the `Makefile` is never a hiding place for required setup** — a rule ADR-0008 and
ADR-0017 both lean on. If `make up` works and the independent bare Compose check does not, setup has
leaked into the Makefile.

A broken migration breaks **every other developer's database** (see the three rules above).
Catching that at merge costs two independent checks; catching it in the final fortnight costs the
demo.

## Environment

`.env` is gitignored; `.env.example` carries fixed values for the local Supabase fallback. Its
Postgres, Auth, Storage and gateway services load `.env.example` alone. `make local`,
`make dev` and `make test` give `api` and `proxy` that file alone as well, including Compose
interpolation. Among Makefile targets, only `make up` reads an optional `.env` for `api` and
`proxy`, after `.env.example`; it copies the example into place if absent. Bare Compose uses the
same base file and works without `.env` because its interpolated ports have defaults. To run the
team project, a team member's `.env` holds only its values (`DATABASE_URL`, `SUPABASE_URL`, the two
keys, the three passwords and the `FT_OAUTH_*` pair), never a copy of `.env.example`, and only
`make up` and bare `docker compose up --build` read it (`README.md` → *The `.env` model* and
*Running the team project*;
[ADR-0004](docs/adr/0004-deployment-shape.md)). Branch work that changes the database runs on the
fallback, and migrations reach the team project only through `make up` on `main` (*Schema changes*
→ *Supabase*, above). Develop through nginx at
`http://localhost:8081`, published as `127.0.0.1:8081`; LAN access is outside the contract.

> **Toolchain floor, 2026-09-24** ([ADR-0004](docs/adr/0004-deployment-shape.md) d8;
> [`docs/spec.md`](docs/spec.md) §3.3): Docker Compose **≥ 2.24.4**. The optional `env_file` needs
> 2.24.0, but the dev overlay's `!override` tag exists only from 2.24.4. Check with
> `docker compose version`.
