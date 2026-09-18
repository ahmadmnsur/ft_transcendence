## What and why

<!-- One or two lines. The issue this advances, if there is one. -->

## Checklist

- [ ] Branch named `<type>/<slice>-<short>`, branched off `main`
- [ ] Commits follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- [ ] Rebased onto latest `main`
- [ ] Paired on this? `Co-authored-by:` trailers added
- [ ] One reviewer requested

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

<!-- Why these rules: docs/adr/0005-prisma-and-the-schema-gate.md -->
