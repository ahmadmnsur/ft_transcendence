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

7. **Trunk-based branching, `<type>/<slice>-<short>`, squash-merge, PRs mandatory by
   convention.** The repository is private under a personal free account, so branch protection
   is probably unavailable and **no rule here is enforced by the platform**. That is accepted:
   the PR history's real job is evidence. `:243`-`:249` says the team will be asked how work was
   divided and how each member contributed, and a PR trail is the artifact that answers it
   without the evaluator taking anyone's word. Squash-merge preserves the PR author, so
   contribution stays visible — **paired work needs `Co-authored-by:` trailers** or the second
   person disappears from a rejection criterion.

8. **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`), satisfying `:310`'s "clear
   commit messages describing the changes" with no tooling.

## Considered options

**TypeORM** (rejected, decision 2). The NestJS-idiomatic choice, and entities beside their
modules match the vertical-slice division beautifully — which is exactly the trap. The division
it flatters is the one that hides schema collisions until migration time.

**Kamel authors every migration** (rejected, decision 4). The intuitive reading of "gated
through a single owner", and it contradicts the vertical-slice division already settled.

**Kamel as sole reviewer of everything** (rejected, decision 5). One person on the critical path
of every slice, at three developers and six weeks.

**Rewriting the existing commit history** to manufacture contributions from all three members
(rejected). The eight planning commits genuinely were one person's work, and `:243`-`:249` asks
the team to explain how work was divided — the honest answer is available and the fabricated one
is fragile.

## Consequences

- **`schema.prisma` becomes the most contended file in the repository**, touched by nearly every
  slice. That is the intended trade: contention that git surfaces, rather than contention that
  surfaces at runtime.
- **`CONTRIBUTING.md` and `.github/pull_request_template.md` now exist** and are where decisions
  6, 7 and 8 actually live. This ADR records *why*; those files are *what someone reads at the
  keyboard*.
- **The repository currently fails `:306`-`:312`, a rejection criterion.** All commits are by one
  author, and the other two developers are not collaborators on the repository at all. Provisioning
  that access is tracked separately and is the most urgent item this decision surfaced.
- **Nothing here is enforced by GitHub.** Every rule is a convention three people keep. If branch
  protection turns out to be available, decisions 5 and 7 are the ones to enforce first.

## Not settled by this decision

- **Whether `CODEOWNERS` auto-request works on this plan.** Add it; treat it as a convenience, and
  never as the mechanism.
- **Migration naming beyond `<slice>_<change>`**, and whether migrations are ever squashed before
  defense.
- **What happens to a long-lived branch that falls far behind** — the rebase rule assumes branches
  stay short, which decision 7 intends but does not enforce.
