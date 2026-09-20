# Contributing to 42 PeerConnect

Three developers, six weeks, one database. This file is the short version of
[ADR-0005](docs/adr/0005-prisma-and-the-schema-gate.md), which records why each rule exists.

## Roles

| | Role | Also |
|---|---|---|
| **Ahmad** | Product Owner | Developer · schema-gate deputy |
| **Kamel** | Technical Lead / Architect | Developer · **schema gate** |
| **Fadel** | Scrum Master | Developer |

## Branching

- Branch off `main`. Keep branches **short-lived** — the rebase rule below assumes it.
- Name them `<type>/<slice>-<short>`, e.g. `feat/matching-round-open`, `fix/session-expiry`.
- One PR per slice increment. **Squash-merge**, then delete the branch.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`,
`docs:`, `test:`, `refactor:`. `document/en.subject.md:310` requires "clear commit messages
describing the changes", and it sits in the list that gets a project **rejected**.

## Review

- **Every PR needs one *completed* review from another member.** Requesting a reviewer is not a
  review — the box is ticked when the review has been given. Not enforced by GitHub — this
  repository is private on a free plan, so there is no branch protection. It is a convention the three of
  us keep, and the PR history is what we show an evaluator when asked how work was divided.
- **Non-schema PRs: round-robin.** Anyone reviews anyone.
- **PRs touching `prisma/`: Kamel reviews, always.** If he is blocked for more than 24 hours,
  **Ahmad** deputises. Fadel watches for the stall rather than absorbing it.

## Schema changes — read this before touching `prisma/`

**You write your own migration. Kamel reviews it.** You own your feature DB-through-UI; the
gate exists to catch bad or conflicting schema, not to take authorship away from you.

```bash
# 1. edit prisma/schema.prisma
# 2. generate + apply locally
npx prisma migrate dev --name <slice>_<change>
# 3. commit schema.prisma AND the generated migration together
# 4. open a PR and request Kamel
```

### The three rules

1. **A merged migration is immutable — fix forward, never edit.**
   Prisma checksums applied migrations in `_prisma_migrations`. Editing one that is already on
   `main` breaks **every other developer's database** with a checksum mismatch. If it is wrong,
   write a new migration that corrects it.

2. **Rebase onto `main` before you merge. If `schema.prisma` moved underneath you, regenerate.**
   Prisma orders migrations by their timestamp directory, not by merge order. Two people working
   in parallel can produce a history that applies in one order on their laptops and a different
   order on a fresh clone. Rebasing is what keeps those two identical.

3. **The seed is gated exactly like the schema.**
   `prisma/seed.ts` runs on every boot (ADR-0004 decision 11) and must stay **idempotent**. It is
   shared contention, so it goes through the same reviewer.

## Testing

**We test only what fails silently.** `document/en.subject.md` asks for no test suite anywhere, so
the suite is thin on purpose and stays that way — see
[ADR-0016](docs/adr/0016-a-thin-suite-over-what-fails-silently.md).

**Vitest, one runner, one command.** Integration tests against a real Postgres in the container
that already exists. No unit/integration/e2e pyramid, and no coverage target.

**The closed list of what is covered:**

1. **The matcher** — matching is atomic, so there is no correction window, and a regression shows
   up as pairs quietly never forming. Asserts C3, C4, C6 and C7 from
   `prototypes/compatibility-score/SUCCESS-CRITERIA.md`. **C1, C2 and C5 are not assertions** —
   they failed and ADR-0006 resolved them by decision.
2. **The six raw-SQL migration steps** — three `CHECK` constraints, three expression indexes. If a
   migration stops creating one, the database accepts bad data and says nothing.
3. **At most one standing Match per Student per Round** — the one invariant the schema cannot
   hold, violable through an Admin's hand-made Match.
4. **File access control** — signed out is 401, signed in as an unrelated Student is 403.

**Adding a test outside that list needs an argument.** The rule is *does it fail silently?* —
anything the compiler or a demo step would catch is not tested. Four categories, closed until
someone argues a fifth.

**CI is advisory for the current repository setup.** Branch protection is unavailable on this
plan, so the workflow cannot block a merge. Its job is evidence for
`document/en.subject.md:243`-`:249`: a green check per PR is how an evaluator sees how work was
divided without taking our word for it. **It may become a required check if branch protection
becomes available** — ADR-0016 leaves that open by name, and ADR-0005 decision 7 lists it among the
first rules to enforce if it is.

## Done

**A ticket is done when its PR is merged with every box in the template ticked.** There is no
second definition — the template *is* the definition, so it cannot drift from the checklist beside
it, and it can be checked without asking anyone.

That means, every time: the suite green, the ticket's acceptance criteria met, **one completed
review**, and —
if the PR touches `prisma/`, the Compose files or a Dockerfile — **a clean-clone boot verified**.
If a change to an ADR, the project map, or a GitHub issue moves a rule, acceptance criterion,
scope, status, or resolved question, **the affected records moved together in the same task**.

### Records move together

**A settled decision is represented across three surfaces**: its **ADR** in `docs/adr/`, the
**GitHub issue that owns it**, and the **map**
([#1](https://github.com/ahmadmnsur/ft_transcendence/issues/1)). Not every decision reaches all
three — synchronize the surfaces that exist rather than inventing one to match. Three record audits
found the same miss — a correction lands on whichever surface the fixer was looking at and stops
there — so this is now a rule rather than a habit.

> Whenever an ADR, project-map entry, or GitHub issue changes a rule, acceptance criterion, scope,
> status, or resolved question represented on another record surface, the owning ADR, issue, and
> map must be inspected and synchronized in the same task.

It fires in **both directions**, in the same task. From an **ADR**, find the owning issue by searching
the issues for the ADR's filename — it is the ticket whose resolution comment records that ADR, and
the other hits are cross-references worth checking too. From an **issue**, its ADR is named in the
resolution comment, and any ADR still pointing at a question the issue has now settled needs a
forward pointer. Either way, fix the map's line if the change moved the decision's scope.

**Not done until it is synchronized.** A substantive change sitting on one surface only is not
done, whatever else the PR ticks.

**A wording or formatting edit that leaves the meaning intact fires none of this** — the threshold
is there so the rule stays worth keeping.

**Annotate, never rewrite.** These records are what we hand an evaluator, so a correction is
*added* where the stale claim is read and the original stays visible:

> **Corrected 2026-09-20 by ADR-0015 d9**: this read "no charts". `/admin/analytics` ships exactly
> one charted surface; the operational tables stay tables.

That already holds across ADR-0002 d6, ADR-0008 d10 and ADR-0010 d4, and it applies to issue bodies
and resolution comments the same way. The version with the `gh` commands is `AGENTS.md`
→ *Record propagation* and `docs/agents/issue-tracker.md`.

### The clean-clone check

Run it from a fresh clone, not your working tree:

```bash
make up     # the single command — must bring the stack up end-to-end
```

**`make up` is the project's entry point.** It copies `.env.example` into place when `.env` is
absent and then brings the stack up, so an evaluator never hand-writes a file (ADR-0004 decision 8).
The Compose invocation used by `make up` is an implementation detail inside the `Makefile`; bare
`docker compose up --build` must also work independently. `document/en.subject.md:314` requires
deployment to run with **a single command**; it names no particular command and does not rule out a
`Makefile`.

So, still from the fresh clone, run the second half of the same decision:

```bash
docker compose up --build     # must also work end-to-end, without the Makefile
```

**That is not a duplicate of the first.** ADR-0004 decision 8 requires bare Compose to work on its
own precisely so **the `Makefile` is never a hiding place for required setup** — a rule ADR-0008 and
ADR-0017 both lean on. If `make up` works and this does not, setup has leaked into the `Makefile`.

A broken migration breaks **every other developer's database** (see the three rules above).
Catching that at merge costs two commands; catching it in the final fortnight costs the demo.

## Environment

`.env` is gitignored; `.env.example` carries working development defaults. `make up` copies it
into place when `.env` is absent — see [ADR-0004](docs/adr/0004-deployment-shape.md). Develop on
`http://localhost`: a LAN IP silently drops the session cookie.
