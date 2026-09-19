## What and why

<!-- One or two lines. The issue this advances, if there is one. -->

## Checklist

- [ ] Branch named `<type>/<slice>-<short>`, branched off `main`
- [ ] Commits follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- [ ] Rebased onto latest `main`
- [ ] Paired on this? `Co-authored-by:` trailers added
- [ ] One reviewer requested

## Done

A ticket is done when this PR merges with every box ticked. This list **is** the definition
(ADR-0016) — there isn't a second one.

- [ ] **Suite green** — `npx vitest run`
- [ ] **The ticket's acceptance criteria are met**, each one, not "mostly"
- [ ] **Added no test outside the closed list?** If you did, say why it fails *silently* —
      anything the compiler or a demo step catches is not tested (`CONTRIBUTING.md` → Testing)

## Does this touch `prisma/`?

- [ ] **No** — round-robin review, anyone can take it.
- [ ] **Yes** — **request Kamel** (or Ahmad, if Kamel is blocked >24h), and confirm:
  - [ ] `schema.prisma` and the generated migration are committed **together**
  - [ ] Migration named `<slice>_<change>`
  - [ ] **No already-merged migration was edited** — checksums are stored in
        `_prisma_migrations`, and editing one breaks every other developer's database.
        Fix forward with a new migration.
  - [ ] Rebased onto `main` **after** the last schema change landed; regenerated if
        `schema.prisma` moved underneath
  - [ ] `prisma/seed.ts` still idempotent, if touched

## Clean-clone boot

Required if this PR touches `prisma/`, the Compose files or a Dockerfile.

- [ ] **Not applicable** — this PR touches none of them.
- [ ] **Verified.** From a *fresh clone*, not your working tree: `docker compose up --build`
      works end-to-end. `:314` makes the single command mandatory and a bad migration breaks
      every other developer's database; one command now beats finding out in the final fortnight.

<!-- Why these rules: docs/adr/0005-prisma-and-the-schema-gate.md -->
