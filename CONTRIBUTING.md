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
- **Pairing? Add `Co-authored-by:` trailers.** Squash keeps only the PR author otherwise, and
  "commits from all team members" is a rejection criterion (`document/en.subject.md:308`).

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`,
`docs:`, `test:`, `refactor:`. `document/en.subject.md:310` requires "clear commit messages
describing the changes", and it sits in the list that gets a project **rejected**.

## Review

- **Every PR needs one review from another member.** Not enforced by GitHub — this repository
  is private on a free plan, so there is no branch protection. It is a convention the three of
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

## Environment

`.env` is gitignored; `.env.example` carries working development defaults. `make up` copies it
into place when `.env` is absent — see [ADR-0004](docs/adr/0004-deployment-shape.md). Develop on
`http://localhost`: a LAN IP silently drops the session cookie.
