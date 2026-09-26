## What and why

<!-- What changed and why, in plain words: this becomes the commit on main.
     "Closes #N" for the ticket it delivers. Anything deliberately left out. -->

## Checklist

- [ ] Branch `<type>/<slice>-<short>` off `main`, rebased onto latest `main`
- [ ] Conventional Commits title (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`)
- [ ] **One review completed** by another member — requesting one is not a review

## Done

<!-- Every box ticked = the ticket is done (ADR-0016). Tick only what is true. -->

- [ ] **Suite green** (`npx vitest run`) — *n/a* only until the first `test/<NN>-<category>/*.test.ts` exists (§16.8)
- [ ] **Every acceptance criterion** of the ticket met
- [ ] **No test outside the closed list** — or say why it fails silently (`CONTRIBUTING.md` → Testing)
- [ ] **Records synchronized** — if this changed a rule, criterion, scope, status or resolved question in an ADR, the map or an issue, every one of those that exists moved with it (`CONTRIBUTING.md` → Records move together)
- [ ] **Personal data** — if what is stored, who sees it or how long it is kept changed, `docs/legal/privacy-policy.md` is updated here, plus `terms-of-service.md` if a conduct rule, Report reason or sanction moved (ADR-0018)

## Schema gate

<!-- Yes if this touches prisma/** (seed: prisma/seed/**, prisma/fixtures/**), prisma.config.ts,
     or adds any file matching /prisma.config*, /prisma7.config*, /.config/prisma* (ADR-0005 d5, d6). -->

- [ ] **No** — round-robin review
- [ ] **Yes** — Kamel reviews (Ahmad if Kamel authored it or is blocked >24h), and:
  - [ ] `schema.prisma` and its migration committed together; `npx prisma generate` run; migration named `<slice>_<change>`
  - [ ] No merged migration edited — fix forward
  - [ ] Rebased after the last schema change on `main`, and regenerated if it moved
  - [ ] Seed still idempotent; personal data → Privacy Policy moved
  - [ ] Any `prisma.config.ts` change described, with its effect on schema, migrations, datasource and seed; no second Prisma Config file
  - [ ] `prisma`/`@prisma/client` still `^7`

## Clean-clone boot

<!-- Required if this touches prisma/**, prisma.config.ts, a Compose file or a Dockerfile (ADR-0004 d8). -->

- [ ] **n/a**
- [ ] **Verified in two separate fresh clones**, each starting with no `peerconnect` containers or volumes:
  - [ ] Clone 1: `make up` works end-to-end
  - [ ] Clone 2: bare `docker compose up --build`, nothing run first, no hand-written `.env`
  - [ ] Every criterion in effect by merge checked on both (§16.5; `docs/ticket-plan.md` lists them per ticket), listed here:
