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
- [ ] **Did this change what personal data is stored, who can see it, or how long it is kept?**
      Then `docs/legal/privacy-policy.md` is updated in this PR — and
      `docs/legal/terms-of-service.md` too, if a conduct rule, a Report reason or a sanction moved
      (`CONTRIBUTING.md` → Personal data moves the Privacy Policy; ADR-0018).

## Does this touch `prisma/` or `prisma.config.ts`?

Also answer **Yes** if it adds a Prisma Config anywhere else — any file matching `/prisma.config*`,
`/prisma7.config*` or `/.config/prisma*` other than `prisma.config.ts` (a root `prisma7.config.*` or
`.config/prisma7.*` would load first on Prisma 7.10+, a root `prisma.config.js` on any Prisma 7;
`docs/spec.md` §3.2) — or changes the seed anywhere it lives: a module that exists only for the seed, or
the fixture module it seeds from, at the paths `CONTRIBUTING.md` → Schema changes, rule 3 lists:
`prisma/seed/**` and `prisma/fixtures/**`, both inside `prisma/**`.
All are inside the gate (ADR-0005 d5, d6).

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
  - [ ] The seed still idempotent, if any part of it was touched
  - [ ] If the schema change touches personal data, `docs/legal/privacy-policy.md` moved with it
        (ADR-0018 d15)
  - [ ] If `prisma.config.ts` changed, its schema, migrations, datasource and seed effects are
        described and reviewed
  - [ ] **No second Prisma Config file added** — `prisma.config.ts` is the only one
        (ADR-0005 d5)
  - [ ] `package.json` still constrains `prisma`/`@prisma/client` to the `^7` major — not
        bumped to 8 (ADR-0005 decision 6)

## Clean-clone boot

Required if this PR touches `prisma/`, `prisma.config.ts`, the seed or its fixture module, the
Compose files or a Dockerfile.

- [ ] **Not applicable** — this PR touches none of them.
- [ ] **Verified, each check in its own fresh clone** — not your working tree, and not the two
      commands back-to-back in one clone:
  - [ ] Each started with **no container or volume left under the project's Compose name**,
        from the other check or your working stack, so each built its database from empty.
        Clearing that state is not setup.
  - [ ] Clone 1: **`make up`** works end-to-end.
  - [ ] Clone 2 (a *different* fresh clone): bare `docker compose up --build` works end-to-end,
        with nothing run first — no `make` target, no hand-written `.env`.
  ADR-0004 d8 requires both, and the second only proves the Makefile is not hiding required setup
  if it runs against a clone the Makefile has never touched. A bad migration breaks every other
  developer's database; two checks now beat finding out in the final fortnight.

<!-- Why these rules: docs/adr/0005-prisma-and-the-schema-gate.md -->
