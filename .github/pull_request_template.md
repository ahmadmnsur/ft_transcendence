## What and why

## Checklist

- [ ] Branch `<type>/<slice>-<short>` off `main`, rebased onto latest `main`
- [ ] Conventional Commits title (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`)
- [ ] **One review completed** by another member — requesting one is not a review

## Done

- [ ] **Suite green** (`npx vitest run`) — *n/a* only until the first `test/<NN>-<category>/*.test.ts` exists (§16.8)
- [ ] **Every acceptance criterion** of the ticket met
- [ ] **No test outside the closed list** — or say why it fails silently (`CONTRIBUTING.md` → Testing)
- [ ] **Records synchronized** — if this changed a rule, criterion, scope, status or resolved question in an ADR, the map or an issue, every one of those that exists moved with it (`CONTRIBUTING.md` → Records move together)
- [ ] **Personal data** — if what is stored, who sees it or how long it is kept changed, the Privacy Policy is updated here in all three languages, plus the Terms if a conduct rule, Report reason or sanction moved (`CONTRIBUTING.md` → Personal data moves the Privacy Policy; ADR-0018)
- [ ] **Three languages** — if this adds or changes text the SPA shows, it is in English, French and Arabic with `CONTEXT.md`'s words, and `npm --prefix web run build` passes (`CONTRIBUTING.md` → Text ships in three languages)

## Schema gate

- [ ] **No** — round-robin review
- [ ] **Yes** — Kamel reviews (Ahmad if Kamel authored it or is blocked >24h), and:
  - [ ] `schema.prisma` and its migration committed together; `npx prisma generate` run; migration named `<slice>_<change>`
  - [ ] No merged migration edited — fix forward
  - [ ] Rebased after the last schema change on `main`, and regenerated if it moved
  - [ ] Seed still idempotent; personal data → Privacy Policy moved
  - [ ] Any `prisma.config.ts` change described, with its effect on schema, migrations, datasource and seed; no second Prisma Config file
  - [ ] `prisma`/`@prisma/client` still `^7`
  - [ ] No foreign key or SQL into Supabase's `auth` or `storage` schemas
  - [ ] Any migration ran only on the local fallback (`make dev`, `make local`, `make test`), never on the team project before merge
  - [ ] A team project setting changed → `supabase/team-project.md` and, where it names one, the matching `GOTRUE_*` line in `compose.yaml` changed together
  - [ ] No new route, port or service exposes the database or a Data API
  - [ ] A gated file moved or renamed → the gate list here, in `CONTRIBUTING.md` and in `.coderabbit.yaml` updated

## Clean-clone boot

- [ ] **n/a**
- [ ] **Verified in two separate fresh clones**, each starting with no `peerconnect` containers or volumes:
  - [ ] Clone 1: `make up` works end-to-end
  - [ ] Clone 2: bare `docker compose up --build`, nothing run first, no hand-written `.env`
  - [ ] Every criterion in effect by merge checked on both (§16.5; `docs/ticket-plan.md` lists them per ticket), listed here:
