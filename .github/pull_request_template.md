## What and why

<!-- One or two lines. The issue this advances, if there is one. -->

## Checklist

- [ ] Branch named `<type>/<slice>-<short>`, branched off `main`
- [ ] Commits follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- [ ] Rebased onto latest `main`
- [ ] **One review completed** by another member — requesting a reviewer is not a review
      (`CONTRIBUTING.md` → Review)

## Done

A ticket is done when this PR merges with every box ticked. This list **is** the definition
(ADR-0016) — there isn't a second one.

- [ ] **Suite green** — `npx vitest run`
- [ ] **The ticket's acceptance criteria are met**, each one, not "mostly"
- [ ] **Added no test outside the closed list?** If you did, say why it fails *silently* —
      anything the compiler or a demo step catches is not tested (`CONTRIBUTING.md` → Testing)
- [ ] **Did this change a rule, acceptance criterion, scope, status or resolved question** in an
      ADR, the map, or an issue? Then the affected ADR, issue and map are inspected and
      synchronized in the same task — a substantive change sitting on one surface only is not done
      (`CONTRIBUTING.md` → Records move together). A wording-only edit fires nothing.

## Does this touch `prisma/` or `prisma.config.ts`?

- [ ] **No** — round-robin review, anyone can take it.
- [ ] **Yes** — **request Kamel** (or Ahmad, if Kamel is blocked >24h), and confirm:
  - [ ] `schema.prisma` and the generated migration are committed **together**
  - [ ] If `schema.prisma` changed, `npx prisma generate` was run explicitly to update the client
  - [ ] Migration named `<slice>_<change>`
  - [ ] **No already-merged migration was edited** — checksums are stored in
        `_prisma_migrations`, and editing one breaks every other developer's database
        (a forced dev-database reset, or a blocked `migrate deploy` — see CONTRIBUTING.md
        → Schema changes). Fix forward with a new migration.
  - [ ] Rebased onto `main` **after** the last schema change landed; regenerated if
        `schema.prisma` moved underneath *(your own not-yet-merged migration only — an
        already-merged migration is immutable; see CONTRIBUTING.md → Schema changes)*
  - [ ] `prisma/seed.ts` still idempotent, if touched
  - [ ] If `prisma.config.ts` changed, its schema, migrations, datasource and seed effects are
        described and reviewed
  - [ ] `package.json` still constrains `prisma`/`@prisma/client` to the `^7` major — not
        bumped to 8 (ADR-0005 decision 6)

## Clean-clone boot

Required if this PR touches `prisma/`, `prisma.config.ts`, the Compose files or a Dockerfile.

- [ ] **Not applicable** — this PR touches none of them.
- [ ] **Verified, each check in its own fresh clone** — not your working tree, and not the two
      commands back-to-back in one clone:
  - [ ] Clone 1: **`make up`** works end-to-end.
  - [ ] Clone 2 (a *different* fresh clone): bare `docker compose up --build` works end-to-end,
        with nothing run first — no `make` target, no hand-written `.env`.
  ADR-0004 d8 requires both, and the second only proves the Makefile is not hiding required setup
  if it runs against a clone the Makefile has never touched. A bad migration breaks every other
  developer's database; two checks now beat finding out in the final fortnight.

<!-- Why these rules: docs/adr/0005-prisma-and-the-schema-gate.md -->
