# A thin suite over what fails silently, and done is the merged PR

The map has carried *"testing approach, and what 'done' means for a ticket"* in **Not yet
specified** since charting. It is the last process decision before the `/to-spec` handoff,
because **definition of done is what `/to-tickets` writes into every ticket it produces**.

Settling it turned up the fact that should govern it. **`document/en.subject.md` mandates no test
suite anywhere.** A sweep for `test`, `unit test`, `e2e`, `coverage` and `CI` returns five hits
and none of them asks for one:

| Line | What it actually says |
| --- | --- |
| `:73`, `:103` | The habit of checking and testing **AI output**. General advice, not a deliverable |
| `:189` | *"Test their implementations."* — under **Developers**, in the team-roles list |
| `:578` | *"Test and fix all features in each browser."* — **a bullet on a claimed module** |
| `:927` | The blockchain module, never claimed |

So there is **no rejection risk here and no module point for a test suite as such**, and this is a
cost decision rather than a compliance one — the shape this map handles worst by default, because
"anything not shipped is Version 2" decides scope and says nothing about process.

Two obligations are real and pull against each other. **`:578` is a point we claimed**: full
compatibility with two additional browsers, *test and fix all features in each*, documented
limitations (`:580`), consistent UI/UX (`:582`) — a manual pass nobody had scheduled. And
**`:189` is graded by interview**, not by artifact: `:243`-`:249` asks each member to explain
their contribution, and ADR-0005 decision 7 already rests that answer on the PR trail.

The shape we chose: **test only what fails silently, and refuse to invent a second definition of
done when the PR template already is one.**

## What this ADR changes in earlier records

- **ADR-0004** is **extended, not amended**. Its three-item pre-defense checklist stands
  verbatim; decision 5 below adds a second, earlier moment at which the clean-clone boot is
  checked, so the checklist stops being the only one.
- **ADR-0005** is **extended, not amended**. Its decision 6 rule — that operational rules live in
  `CONTRIBUTING.md` and the PR template rather than only in an ADR, *"visible at the moment
  someone is about to break them"* — is reused here and is why decisions 5 and 6 land in those
  two files.
- **ADR-0006** is **extended, not amended**. Four of its prototype's success criteria stop being
  prose and become assertions (decision 3). The rule and its calibration are untouched.
- **ADR-0015's "Recharts is the only stack addition since charting" is now false.** **Vitest is
  the second**, and decision 2 records it on the same footing: a stack addition goes through the
  map, not a slice.
- **The module-claim decision's browser pair changes.** [#7](https://github.com/ahmadmnsur/ft_transcendence/issues/7)
  chose **Firefox + Edge**; decision 8 makes it **Firefox + Brave** on an installability argument.
  The module, the point and the claimed total are unaffected.

## The decisions

1. **The suite is thin, targeted, and lives at one level: integration tests against a real
   Postgres in the container that already exists.** No unit/integration/e2e pyramid, no coverage
   target, and roughly 20–40 tests in total.

   **What it covers is the closed list of things that fail *silently*:**

   - **The matcher.** ADR-0002 decision 3 makes matching atomic, so there is **no correction
     window** — by the time anyone sees a Match it exists for both Students. ADR-0006 is the only
     part of this system that was ever *measured*, and a regression in it presents as **pairs
     simply never forming**, which nothing reports. This half is **not optional**; see decision 3.
   - **The six raw-SQL migration steps** (ADR-0014 decision 13, as corrected). Three `CHECK`
     constraints and three expression indexes, hand-written. If a migration stops creating one,
     the database accepts bad data and says nothing.

     > **Count corrected 2026-09-22 by ADR-0011's final audit.** The working set is now **eight**:
     > five CHECKs and three expression indexes. The two added CHECKs reject a Student self-report
     > and a Report state/attribution mismatch. They extend this existing migration category; they
     > do not create a separate test category.

     > **Count corrected 2026-10-02 by [Settle what the database stores in French and
     > Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/95).** The working set is now
     > **nine**: the ninth step sets `Student.display_name`'s collation to `und-x-icu` (ADR-0014's
     > *Consequences*, count note of 2026-10-02). If a migration stops setting it, names fall back
     > to the database's default order, code point on the hosted project, and nothing says so, so
     > this category asserts the column's collation too. It extends this category; it does not
     > create a new one.
   - **At most one standing Match per Student per Round** — the one invariant ADR-0014 decision 13
     records as **not expressible in the schema**, violable through an Admin's hand-made Match
     (ADR-0002 decision 7). If anything in this model earns a test, it is the rule nothing else
     holds.
   - **ADR-0009 decision 3's access-control pair** — signed out gives 401, signed in as an
     unrelated Student gives 403. That ADR already wrote it as an acceptance test in prose, and
     `:542` is a claimed module bullet.

   **Everything else is deliberately untested.** CRUD, forms, the feed, the three dashboards and
   every screen fail *loudly*, and the demo is a better detector than a test would be.

   > **Extended 2026-09-20 — ADR-0003 decision 7 adds the fifth silent-failure category.**
   > The Socket.IO origin gate can be absent while the legitimate UI and cookie-authenticated
   > socket still work, leaving a security boundary silently unenforced. Integration coverage
   > therefore exercises the Engine.IO admission gate with a real session: exact
   > `PUBLIC_ORIGIN` succeeds; absent, `null` and mismatched `Origin` fail even with a valid
   > cookie; and HTTP long-polling is unavailable because the browser transport is WebSocket-only.
   > The four original categories and the one-level, no-coverage-target shape are unchanged.

   > **Extended 2026-09-21 — ADR-0007's concurrency contract adds the sixth silent-failure
   > category.** Integration coverage exercises the four races the contract names: publication
   > versus answer; two publications with equal `published_at`; answer versus Round close; and two
   > concurrent/retried submissions by the same Student. It asserts the observable outcomes — one
   > live Prompt by `(published_at, id)`, no accepted answer after supersession, the answer counted
   > in exactly the Round selected by the serial order, and at most one atomic Post + XP + Badge
   > success. The database mechanism remains for `/to-spec #1`; the tests bind the behavior, not a
   > particular lock.

   > **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §3.6, §3.6.4, §16.3; M1,
   > M31): `SERIALIZABLE` transactions with automatic retry, and each race is forced
   > deterministically through one named `checkpoint()` in the Unit of Work, a no-op in production.
   > The tests still bind outcomes.

   > **Extended 2026-10-04 by [Settle how tests and CI run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/99): one pause sits outside a
   > transaction.** The password change reaches the same test barrier, by name, between its first
   > sign-out and Supabase's admin update, a no-op in production. The race `12-sign-in` needs has
   > no transaction there to hold (decision 1's note of 2026-10-04). Every other race still goes
   > through `checkpoint`.

   > **Corrected 2026-09-21 by ADR-0007.** The equal-timestamp publication case remains in scope,
   > but `(published_at, id)` is no longer the expected order. The test must assert a unique,
   > durable publication order that respects completed-before-started transactions and gives
   > overlapping publications one database-established total order, with exactly one live Prompt.
   > For answer versus Round close, it must also assert that the answer transaction atomically
   > establishes qualifying activity without updating `Student.streak`, and that only the serialized
   > Round-close transaction updates the stored Streak while skipping Suspended and Removed Students.

   > **Extended 2026-09-22 for the Match/Round Streak distinction; still the sixth category.** The
   > Round-close case includes a Student whose Match has no Review but whose accepted Prompt answer
   > belongs to that Round: the answer is qualifying activity, so the close increments rather than
   > resets Streak. The paired no-other-activity case resets it. This guards the whole-Round query
   > without adding a new test category or prescribing a database mechanism.

   > **Extended 2026-09-21 — ADR-0008's lifecycle and lockout corrections add the seventh
   > silent-failure category.** Integration coverage verifies that matching admits only active,
   > non-`ADMIN` Students with a Skill; role/Suspension/Removal changes serialize against automatic
   > and manual Match creation; Removed rows reject every mutation and retain the burned email; and
   > concurrent demotion, Suspension or Removal cannot reduce the platform below one active Admin.
   > These are data-integrity and security failures that can return successful responses while
   > leaving forbidden state, so the existing scope guard admits them.

   > **Extended 2026-09-22 — ADR-0009's corrected file contract adds the eighth silent-failure
   > category.** Through the nginx path, integration coverage proves exact-limit valid files reach
   > the application; over-limit, malformed, truncated, extension/MIME-spoofed and Avatar-PDF
   > payloads fail server-side. It proves Evidence reads are anchored to the owning Review's Match
   > (including pair-bound access for a Peer Moderator, no role-wide moderator access, and no access
   > from another current or historical Match), and that only the originating active Mentee may
   > mutate after completion. Suspension pauses mutation, Removal ends it without deleting the row,
   > failed replacement preserves the old bytes, and upload requests missing the exact Origin or
   > `X-PeerConnect-CSRF: 1` fail. A client-only validator, current-Match authorization or
   > delete-before-validate replacement can leave the ordinary UI healthy, so the scope guard admits
   > this category; the one-level, no-coverage-target shape is unchanged.

   > **Extended 2026-10-05 by [Settle how avatars and Evidence are stored and served on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/94): four checks join the eighth
   > category, and no category is added.** Files now live in Supabase Storage and their rows in
   > Postgres, two stores no transaction covers (ADR-0009 decision 2's note). A file left behind,
   > or deleted under its row, shows nowhere while the screens keep working, so the scope guard
   > admits these:
   >
   > 1. after a replace or a delete, the old file is gone from Storage;
   > 2. a save the transaction refuses leaves no new file;
   > 3. the cleanup deletes a file no row names once it is an hour old, skips a younger one, and
   >    never deletes a file a row names; the test moves the application's clock rather than
   >    waiting;
   > 4. on an empty Supabase, the boot creates both buckets, private, with their caps and types.

   > **Extended 2026-09-22 — the Review/XP transaction contract adds the ninth silent-failure
   > category.** Integration coverage verifies one atomic Review + status + Takeaway + Private
   > Feedback + both XP line items + Badge success under duplicate/retried submission; Review versus
   > Round close, Decline, Suspension and Removal yields exactly the winning serial outcome; a Match
   > created before promotion can still complete and award normally while the Admin remains filtered;
   > and concurrent valid Review/Prompt awards to one Student accumulate without lost XP or a missed
   > or duplicate BadgeAward. These failures can commit plausible rows and return successful responses,
   > so the scope guard admits them; the one-level, no-coverage-target shape is unchanged.

   > **Extended 2026-09-22 by ADR-0010's final Badge/Leaderboard audit; still the ninth category.**
   > The lifecycle cases now also cover Suspension/Removal versus Round close for a Student whose
   > closing Round already contains qualifying activity: sanction first must freeze Streak and award
   > no Consistent Learner, while close first may award it and the later sanction preserves it. The
   > Leaderboard assertion applies the eligibility filter to both the top ten and the viewer-rank pin,
   > so `ADMIN`, Suspended and Removed viewers can never be reintroduced by the pin. These are silent
   > lifecycle/ranking failures inside the existing category, not a tenth category.

   > **Extended 2026-09-22 for BadgeAward conflict recovery; still the ninth category.** The
   > concurrency case must make two distinct valid earning events for one Student contend for the same
   > Badge and assert that both event records and XP increments commit exactly once, exactly one
   > BadgeAward remains, and neither the threshold nor valid XP is lost when the uniqueness contender
   > converges or retries. The test binds the observable result, not a PostgreSQL technique.
   >
   > > **Corrected 2026-09-24 before `/to-tickets` — this case cannot be forced; the category asserts
   > > what the schedule does.** Under the transaction mechanism `/to-spec #1` chose
   > > ([`docs/spec.md`](../spec.md) §10.4; M1), two *valid* earning events for one Student are never
   > > in flight against the same Badge. First Mentor would need two simultaneously `ACCEPTED`
   > > Matches with one Mentor, and Consistent Learner comes only from the one Round close. Knowledge
   > > Sharer needs a second answer to a newer Prompt published between the two answers' reads, which
   > > makes the older answer the pivot of a read/write cycle: PostgreSQL cancels it, and its retry is
   > > refused as superseded (ADR-0007 d1). Reproduced on PostgreSQL 17.11 in every release order. So
   > > "both event records and XP increments commit" is never observable, and the requirement above
   > > is satisfied vacuously. ADR-0010 d2's rule is unchanged and holds. The ninth category instead
   > > asserts that schedule's one outcome: the older answer is refused with nothing written, and the
   > > newer answer commits once with its +20 and exactly one Knowledge Sharer, so the threshold is not
   > > missed (spec §16.3 category 9). Still the ninth category.

   > **Extended 2026-09-22 for Admin history visibility; still the ninth category.** The
   > completion-after-promotion case asserts that the Admin's XP remains stored and drives the
   > ordinary profile Level, any earned BadgeAward remains on the ordinary profile/history surface,
   > and only the XP Leaderboard row and personal-rank pin are absent. This prevents the role filter
   > from leaking out of the Leaderboard without adding a new category.

   > **Extended 2026-09-22 — Report integrity adds the tenth silent-failure category.** Integration
   > coverage verifies both target-specific uniqueness rules and the Report CHECKs; two concurrent
   > filings by the same reporter against the same target admit exactly one winning row and return
   > **already reported** to the loser without modifying the winner; concurrent
   > resolution of one open target group admits exactly one winner and returns **already resolved**
   > to the loser without applying its sanction; every winning row shares one terminal state,
   > resolver and time; and a concurrent filing against a *different* reporter or after resolution
   > is either included, forms a later group, or is rejected after Removal according to the serial
   > order. Remove Post and Remove Student each
   > commit atomically with `ACTIONED` open reports, while Suspension leaves Student reports open.
   > Authorization coverage proves that a Peer Moderator sees only eligible open Post groups with
   > no reporter identity or resolved history, that one conflicting open reporter hides the whole
   > group, and that an Admin cannot read or resolve their own-target group or read any open group /
   > resolved batch containing a Report they filed, while another Admin retains reporter-visible
   > audit access. It also proves the action endpoint re-runs session/current-role/sanction
   > authorization after a stale queue read and races action against Block create/remove, whose
   > guard is decided at the action serialization point. These failures can return plausible data
   > and successful responses while violating privacy or attribution, so they meet the scope guard;
   > the tests bind outcomes, not a PostgreSQL locking technique.

   > **Extended 2026-09-23 for hand-made Match creation; no new category.** The third category now
   > covers the race that can actually break it: two concurrent hand-made creations sharing a
   > Student admit exactly one committed Match and reject the other with nothing written (ADR-0006
   > d10). The seventh category's Match-creation serialization also covers Round close: a creation
   > ordered before the close is in the Round and lapses with it, and one ordered after is rejected,
   > so no Match ever commits into a closed Round (ADR-0002 d7). Both bind outcomes, not a
   > PostgreSQL technique.

   > **Extended 2026-09-23 for no-repeats and Block versus Friendship; no new category.** The
   > matcher category also asserts step 2's no-repeats: a pair with a prior `Match` row of any
   > status — `DECLINED` and `TERMINATED_BY_ADMIN` included — is never proposed, while a hand-made
   > Match may still pair it (ADR-0006 step 2, d10). The seventh category's serialization
   > assertions also cover a Block racing a new Friendship request between the same pair: exactly
   > one serial outcome, and never a Block and a Friendship row, pending or accepted, at once
   > (ADR-0014 d4). Both would otherwise fail silently — a pair quietly re-offered, a blocked
   > Student quietly able to see Presence. One precision for the second category: "the database
   > accepts bad data" holds for seven of its eight steps. The no-repeats index is a non-unique
   > lookup aid (ADR-0014 d13), so its absence costs speed rather than integrity; the test still
   > asserts that the migration creates it.

   > **Precision extended 2026-10-02 by [Settle what the database stores in French and
   > Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/95).** With the ninth step,
   > "the database accepts bad data" holds for seven of nine. The no-repeats index aids lookup and
   > the `display_name` collation sets sort order, so their absence costs speed or order rather
   > than integrity; the test still asserts both.

   > **Two cases made explicit 2026-09-24 before `/to-tickets`; no new category**
   > ([`docs/spec.md`](../spec.md) §16.3). The **eighth** category's "only the originating active
   > Mentee may mutate" includes a Mentee promoted to `ADMIN` after the Review, who keeps the path
   > for that Review (ADR-0009 d5, ADR-0014 d11), while an Admin outside the pair stays refused. The
   > **tenth** category's Remove Student case includes an open row the removing Admin filed
   > themselves: that row commits `ACTIONED` and is attributed to that Admin. The batch is then
   > hidden from that Admin's own resolved audit and shown to another Admin with its reporters
   > (ADR-0011 d9–d10 annotations). Both follow rules already recorded; they bind the outcome, not a
   > technique.

   > **Extended 2026-10-02 — name search adds the eleventh silent-failure category**
   > ([Settle what the database stores in French and
   > Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/95)). `display_name_search`, the
   > folded copy of the display name (ADR-0014's top note of 2026-10-02), agrees with
   > `display_name` only because every write path saves both through `nameFields`; the schema cannot
   > hold it. A path that skips the helper raises no error: the Student is simply not found under
   > their new name, and no demo step searches a renamed Student by plain letters. So
   > `11-name-search` writes a name through each path the suite runs that sets one (sign-up, the
   > Student's own edit, the Admin edit, and any path added later) and asserts that searching its
   > plain form (`helene`, `احمد`, `فاطمه`) finds the Student, and that after a rename to a name
   > whose folded form does not contain the old folded form, the old one no longer does. The suite does not run the seed, so the
   > seed's two directly inserted bootstrap accounts are checked by the seed's own end-state
   > assertions instead. It binds the outcome, not the fold's technique;
   > [`docs/spec.md`](../spec.md) §16.3 and §14.8 hold the exact assertions once updated.

   > **Changed 2026-10-04 by [Settle how tests and CI run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/99): the real Postgres is Supabase's
   > own, beside a real Supabase Auth and Storage.** Sign-up and the bootstrap staff are made
   > through Supabase Auth (ADR-0003's top note of 2026-10-02), and the file categories store their
   > bytes in Supabase Storage, so the suite runs against the containers of the local fallback
   > (ADR-0004 d1's note): Supabase's Postgres image, Auth, Storage and gateway. There is no plain
   > Postgres and no stand-in for either service. A stand-in would prove the code against itself,
   > and CI's seed steps, which drive the real write paths, would pass a seed that breaks on
   > Supabase. Where and how the suite runs is the last note under *Not settled*.

   > **Extended 2026-10-04 — sign-in adds the twelfth silent-failure category**
   > ([Settle how tests and CI run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/99)). Supabase Auth checks the password outside PeerConnect's
   > transaction, and PeerConnect decides the rest afterwards (ADR-0003's notes on decisions 6 and
   > 10 of 2026-10-02). Two of those decisions can go wrong behind a normal-looking answer, so
   > `12-sign-in` asserts both:
   >
   > - **A sanction is told only after the right password.** A Suspended or Removed Student signed
   >   in with a wrong password gets `password_incorrect`, never the sanction's message; with the
   >   right password, the sanction's own message. The wrong order tells anyone who knows the email,
   >   and no demo step types a wrong password for a sanctioned account.
   > - **A completed password change leaves no session the old password opened.** A sign-in with
   >   the old password racing the change ends refused or signed out in every order the test
   >   stages: held at its own transaction's `checkpoint` and the change's, and run whole between
   >   the change's first sign-out and Supabase's admin update. Only the change's second sign-out
   >   catches that last order, and no transaction spans it, so `checkpoint` cannot hold it. The
   >   password change therefore reaches the same test barrier there, by name, a no-op in
   >   production like `checkpoint` ([`docs/spec.md`](../spec.md) §3.6.4 gains it). The test holds
   >   the change at that point, runs a whole sign-in with the old password, releases the change
   >   and asserts the session is gone. Each guard looks redundant and has its own order. Without
   >   the second sign-out, the sign-in run in that gap keeps its session. Without the
   >   `password_version` re-check, a sign-in held at its own `checkpoint` until the change ends
   >   keeps its session. Either way the Student is told they are signed out everywhere.
   >
   > Two other account behaviours stay untested. A concurrent duplicate sign-up that fails to delete
   > its spare Supabase Auth user leaves one that holds no real email and matches no Student, so it
   > harms nothing. A Supabase `429` answered as `too_many_attempts` shows the Student a message,
   > and no test can make Supabase answer `429` on demand. The category binds outcomes, not a
   > technique.

2. **Vitest, one runner for both ends.** Vite is already a locked stack component (ADR-0004
   decision 4's dev overlay), so Vitest reuses its transform and there is no second
   `ts-jest`/babel configuration to keep alive. One runner means **one command for decision 6 to
   point at**, which matters more than it sounds: a definition of done that names two commands is
   one that gets half-run.

   The cost is honest and small: NestJS scaffolds with Jest, so `nest new`'s defaults get
   replaced on day one.

   > **Corrected 2026-09-23 before `/to-spec #1` — the API half does not reuse Vite's transform
   > as-is.** Vite and Vitest compile TypeScript with esbuild, which
   > [does not support `emitDecoratorMetadata`](https://esbuild.github.io/content-types/), and
   > NestJS's constructor injection by type depends on that metadata. NestJS's own
   > [Vitest recipe](https://docs.nestjs.com/recipes/swc) therefore builds test files with SWC
   > through `unplugin-swc`. So the API's Vitest configuration carries one SWC plugin: *"no second
   > `ts-jest`/babel configuration"* stays true, *"reuses its transform"* does not hold for the
   > backend, and the cost above is one plugin larger. **The decision is unchanged** — one runner,
   > one command — but every category in decision 1 exercises the API, so this plugin sits on the
   > suite's main path rather than at its edge.

3. **The prototype's cohort generator is extracted into the repository as one fixture module,
   shared by the suite and by the seed.** [#9](https://github.com/ahmadmnsur/ft_transcendence/issues/9)
   committed to this at charting — *"the synthetic cohort generator is kept as a test fixture,
   not thrown away"* — and the block is self-contained by construction: `SKILLS`, `RARE_SKILLS`,
   `NAMES`, `levelOf`, `generateCohort` and `mulberry32`, which the prototype's own source says
   *"depend on nothing else on this page."*

   **It carries more than tests need**, which is why it is shared rather than test-only. It hands
   the demo-strategy decision three inputs at no cost: the **24-Skill catalogue** ADR-0014
   decision 3 requires seeding, **`RARE_SKILLS`** — which exists to *"manufacture an unmatchable
   Student"* and is exactly the deliberately-untaught Skill ADR-0015 needs for its one graded
   insight — and **`unmatchable`**, which produces ADR-0002 decision 7's Admin-flag path.

   > **Corrected 2026-09-23 before `/to-spec #1` — `SKILLS` is 24 names; the catalogue is 27.**
   > ADR-0017 decision 8 settled the shipped catalogue as the fixture's twenty-four `SKILLS`
   > **plus** the three `RARE_SKILLS`. The plain supply/demand gap needs a catalogue Skill that
   > someone wants and nobody teaches, which is what `RARE_SKILLS` exists to supply, and ADR-0015's
   > Skill lists read the whole catalogue. *"The 24-Skill catalogue"* above names `SKILLS` alone.
   > Both lists live in this one module, so sharing it is unaffected, and so is the measured test
   > cohort: ADR-0017 decision 3's `size: 20, seed: 42` call draws only on `SKILLS`, because
   > `RARE_SKILLS` enter a cohort only through `unmatchable`.
   >
   > **What the fixture owns stops at generation**: the Skill and name lists and a deterministic
   > cohort generator. **What reaches the database is ADR-0017's**: the catalogue rows, which active
   > Students list a `RARE_SKILLS` Skill (asserted, its decision 8), the blocked pair behind
   > ADR-0015's stronger gap, the Rounds, and every Review, Badge and Streak, all driven through
   > the real write paths (its decision 2). The fixture is an input to the seed, never a second
   > seed specification.

   **`prototype/compatibility-score` stays frozen and untouched** as the primary source. Drift
   between it and the fixture is one-way and expected: a prototype records what was measured, it
   is not a maintained artifact.

4. **The matcher tests assert the four success criteria that passed.** `SUCCESS-CRITERIA.md` was
   committed before the first prototype run and is already a test spec in prose. **C3** (the
   Mentor can actually teach the Mentee, 100%) and **C4** (every Score is explainable, 100%) are
   the two ADR-0006 calls *disqualifying*; **C6** (replaying the same seed and action log produces
   byte-identical Matches) is a determinism test, and determinism is what ADR-0012 decision 6
   refused randomness to preserve; **C7** (no Match below the floor) is decision 4 of ADR-0006.

   **C1, C2 and C5 are not assertions.** They failed, and ADR-0006 resolved them by decision
   rather than by tuning. Writing them as tests would re-litigate settled decisions every run.

5. **The clean-clone boot is verified at every merge touching `prisma/**`, the Compose files or
   the Dockerfiles — not only before defense.** ADR-0004 decision 8 makes `make up` *and* bare
   `docker compose up --build` from a clean clone the mandatory single command (`:314`), and
   ADR-0005 decision 6 warns that one bad migration **breaks every other developer's database**
   through a checksum mismatch — concretely, a forced dev-database reset or a blocked
   `migrate deploy`, per that decision's 2026-09-20 annotation. Discovering either in the final fortnight is the worst available
   time, and the check is one command. It goes in the PR template; ADR-0004's pre-defense
   checklist keeps it too.

   > **Corrected 2026-09-20 — it is two checks, in two separate fresh clones.** *"The check is
   > one command"* understated it. ADR-0004 decision 8 requires **both** `make up` and bare
   > `docker compose up --build` to work end-to-end, and its 2026-09-20 note makes the two boot
   > paths **independent**: bare Compose must run from a clone where the Makefile has created
   > nothing. Run back-to-back in one clone, the second command inherits the `.env` the first
   > wrote and proves nothing — which is the whole reason decision 8 asks for it. Neither the
   > moment this decision moved the check to, nor the trigger (`prisma/**`, Compose files,
   > Dockerfiles), changes. `CONTRIBUTING.md` → *The clean-clone check* and the PR template
   > carry the two-clone procedure.

   > **Extended 2026-09-20, following ADR-0005 decision 5's gate-scope correction.** The trigger
   > now also includes the root `prisma.config.ts`. Prisma 7 Config selects the schema, migration
   > path, migration datasource and seed command, so a Config-only change can break the same
   > clean-clone boot while touching nothing under `prisma/**`. The Compose/Dockerfile triggers and
   > the two-independent-clone procedure are unchanged.

   > **Extended 2026-09-23, following ADR-0005 decision 6's note on what "the seed" covers.** The
   > trigger also includes the seed wherever its code lives: the entry `prisma.config.ts` registers,
   > every module that exists only for the seed, and decision 3's shared fixture module. A change
   > there can break a boot from an empty database while touching nothing under `prisma/**`, which
   > is the argument that added `prisma.config.ts` above. The two-clone procedure is unchanged.

   > **Sharpened 2026-09-23 before `/to-spec #1` — a fresh clone is not a fresh database.**
   > Compose groups containers and named volumes by **project name**, not by directory. The
   > `Makefile` says the base Compose file carries a default name; even without one, two default
   > clones share a directory name, and so a project name. So the second clone reuses the first
   > clone's Postgres volume, as does a clone beside a running working tree. Its boot then runs no
   > migration from empty and no seed. The Postgres image also skips its first-boot setup on a
   > non-empty data directory, so a bare path missing `POSTGRES_PASSWORD` would still pass.
   > **Each check therefore starts with no container or volume left under the project's Compose
   > name**, by the other check or by a working stack, so each boot path builds its database from
   > empty. Clearing that state creates nothing a boot could rely on, so it is not the setup ADR-0004
   > d8 forbids. `/to-spec #1` chooses how it is cleared. ADR-0004 d11's volume-wiping target,
   > which the `Makefile` does not have yet, is one candidate.

   > **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §15.6, §16.5; M20): `make
   > wipe`, which is `docker compose down --volumes --remove-orphans`, run from any clone since all
   > share the project name `peerconnect`; the procedure names the bare command too.

   > **Pass criteria staged, 2026-09-24 before `/to-tickets`** ([`docs/spec.md`](../spec.md) §16.5
   > step 6). The trigger above is unchanged, and so is the rule that every such merge is checked. What
   > a check must show was the finished platform's pass line — sign-in, the demo Student, four closed
   > Rounds — which no PR before the seed's end state could meet, starting with ADR-0004 d12's week-1
   > gate. That line binds in full from the PR that completes the seed; before it, a criterion counts
   > from the PR whose slice creates it. The PR template's clean-clone box lists the criteria checked,
   > so decision 6's Done stays checkable without asking anyone.

6. **Done is the merged PR, with every box in the template ticked. Nothing else is defined.**
   The template gains three checks — the suite is green, the ticket's acceptance criteria are met,
   and decision 5's boot check where it applies — beside the branch, commit, rebase,
   `Co-authored-by:` and `prisma/**` boxes ADR-0005 already put there.

   > **Amended 2026-09-20 — a fourth check, and the decision is unchanged.** *Records move
   > together*: when a change to an ADR, the map or an issue moves a rule, acceptance criterion,
   > scope, status or resolved question, the affected ADR, issue and map are inspected and
   > synchronized in that same task. Settled as question 4 of
   > [#28](https://github.com/ahmadmnsur/ft_transcendence/issues/28); the rule lives in root
   > `AGENTS.md`, `docs/agents/issue-tracker.md` and `CONTRIBUTING.md`. It is added to the template
   > *because* of this decision — a Done condition written only in `CONTRIBUTING.md` would be the
   > second definition decision 6 refuses. **"Three checks" above is the count at the time of
   > writing, not a closed list**; unlike decision 7's test categories, nothing here closed it.

   > **Amended 2026-09-20 — the `Co-authored-by:` box is removed from the template.** The clause
   > above now reads: beside the branch, commit, rebase and `prisma/**` boxes ADR-0005 already put
   > there. The three checks *this* decision added are untouched; the box removed is one of
   > ADR-0005's, and **the requirement behind it is retired outright** — see ADR-0005 d7's
   > annotation.

   > **Amended 2026-09-20 — the Prisma gate box now covers both `prisma/**` and the root
   > `prisma.config.ts`.** This follows ADR-0005 decision 5's scope correction and decision 5
   > above's matching clean-clone trigger. Done remains the merged PR with every applicable box
   > ticked; only the Prisma box's path scope changed.

   > **Amended 2026-09-23 — a fifth check, and the decision is unchanged.** *Personal data moves
   > the Privacy Policy* (ADR-0018 d15): a PR that changes what personal data is stored, who can
   > see it or how long it is kept updates `docs/legal/privacy-policy.md` in the same PR, and
   > `docs/legal/terms-of-service.md` where a conduct rule or a sanction moves. It sits in the
   > template for the same reason as the fourth check: a Done condition written only in
   > `CONTRIBUTING.md` would be the second definition this decision refuses.

   **This deliberately invents no second concept.** A separately written definition of done drifts
   from the checklist sitting next to it, and a purely per-ticket definition lets a ticket be
   "done" with a red suite. Making the template the definition also keeps it **checkable
   without asking anyone**, which is the property `/to-tickets` actually needs.

   > **The suite box binds from the first test file, 2026-09-24 before `/to-tickets`**
   > ([`docs/spec.md`](../spec.md) §16.8). `npx vitest run` exits 1 when it finds no test file, so
   > before the first one lands no PR can show a green suite, starting with ADR-0004 d12's week-1
   > gate. Until a branch holds a test file, the box is *not applicable*; from the PR that adds the
   > first, it binds on every PR. `passWithNoTests` is never set: it would excuse a broken test path
   > as well as an empty suite. The definition above is unchanged: a red suite still never passes.

7. **A test is added only for something that fails silently, and decision 1's list is closed until
   someone argues a fourth category.**

   > *(**Corrected 2026-09-20**: a **fifth** category. Decision 1 enumerates **four** — the matcher,
   > the six raw-SQL migration steps, the one standing Match per Student per Round, and ADR-0009
   > d3's access-control pair — so the next one argued is the fifth. `CONTRIBUTING.md` → *Testing*
   > and [#25](https://github.com/ahmadmnsur/ft_transcendence/issues/25)'s resolution both already
   > read "four categories, closed until someone argues a fifth"; this sentence was the outlier.)*

   > **Extended 2026-09-20 — the fifth category has now been argued and added.** ADR-0003
   > decision 7's Socket.IO origin gate is the silent boundary described in decision 1's new
   > annotation. The next proposed category is therefore the sixth and still needs the same
   > *does it fail silently?* argument.

   > **Extended 2026-09-21 — the sixth category has now been argued and added.** ADR-0007's four
   > concurrency races can leave the ordinary UI apparently healthy while accepting a superseded
   > answer, selecting the wrong Round or awarding duplicate XP. The next proposed category is
   > therefore the seventh and still needs the same *does it fail silently?* argument.

   > **Extended 2026-09-21 — ADR-0008 supplies that seventh category.** Candidate, sanction and
   > active-Admin concurrency can commit forbidden state while every request appears successful,
   > so decision 1 now covers it. The next proposed category is the eighth and still needs the same
   > scope argument.

   > **Extended 2026-09-22 — ADR-0009 supplies that eighth category.** File qualification,
   > originating-Match authorization, mutation lifecycle, atomic replacement, upload CSRF and the
   > nginx envelope can all fail silently behind a working happy path, so decision 1 now covers
   > them. The next proposed category is the ninth and still needs the same scope argument.

   > **Extended 2026-09-22 — the ninth category has now been argued and added.** Review retries,
   > competing terminal Match transitions and concurrent XP paths can silently duplicate or lose
   > awards while leaving individually plausible rows. Decision 1 now binds their atomic and serial
   > outcomes. The next proposed category is the tenth and still needs the same scope argument.

   > **Extended again 2026-09-22 without adding a category.** Sanction versus Round-close ordering
   > for Consistent Learner and the rule that the personal-rank pin cannot bypass Leaderboard
   > filtering are additional assertions in the ninth lifecycle/gamification category. The next
   > proposed category remains the tenth.

   > **Extended 2026-09-22 for BadgeAward contention, still without adding a category.** A uniqueness
   > contender must not turn a distinct valid earning event into lost XP: both events commit once, one
   > BadgeAward survives and the threshold cannot be missed. The next proposed category remains the
   > tenth.
   >
   > > **Corrected 2026-09-24**: no valid pair of events can be made to contend for one Badge under
   > > the chosen mechanism. See decision 1's matching correction for what the ninth category asserts
   > > instead. Still no new category.

   > **Extended 2026-09-22 for Admin history visibility, still without adding a category.** The
   > role filter must remove only the Leaderboard row and pin while retained XP/Level and BadgeAwards
   > remain available on ordinary profile/history reads. This is another assertion in the ninth
   > category; the next proposed category remains the tenth.

   > **Extended 2026-09-22 — ADR-0011 supplies the tenth category.** Duplicate reports, partial
   > group filtering, competing resolutions and target Removal can all commit plausible but
   > contradictory moderation data behind a working queue. Decision 1 now covers the database,
   > atomicity, serialization and authorization outcomes named there. The next proposed category
   > is the eleventh and still needs the same *does it fail silently?* argument.

   > **Extended 2026-09-23 for hand-made Match creation, no-repeats and Block versus Friendship,
   > still without adding a category.** A double-booked Student, a Match committed into a closed
   > Round, a re-offered pair and a Friendship row beside a Block are all plausible rows behind a
   > successful response; they are assertions in the first, third and seventh categories. The next
   > proposed category remains the eleventh.

   > **Extended 2026-10-02 — name search supplies the eleventh category** (decision 1's note of
   > 2026-10-02). The next proposed category is the twelfth and still needs the same *does it fail
   > silently?* argument.

   > **Extended 2026-10-04 — sign-in supplies the twelfth category** (decision 1's note of
   > 2026-10-04). The next proposed category is the thirteenth and still needs the same *does it
   > fail silently?* argument.

   The pull to broaden will arrive during implementation, the way ADR-0003 decision 9 predicts the
   pull to put a privileged action on the socket and ADR-0005 decision 4 predicts the quiet
   reversal of the schema gate. **Anything the compiler or a demo
   step would catch is not tested.**

   Stated as a rule rather than a cap because a cap on count or runtime is arbitrary and games
   easily, where this gives a reviewer one sentence to point at — the same move ADR-0006 made in
   requiring any future Score factor to be expressible in the explanation sentence.

8. **One advisory CI workflow: install, typecheck, run the suite, on every pull request.**

   **It cannot be a required check and is not pretending to be one.** ADR-0005 decision 7 records
   that this repository is private under a personal free account, so branch protection is probably
   unavailable and *"no rule here is enforced by the platform."* **The workflow's job is
   evidence**, on that decision's own argument: `:243`-`:249` asks how work was divided and each
   member's contribution, and a green check per PR is that answer in a form an evaluator reads
   without taking anyone's word.

   > **Corrected 2026-09-20, following ADR-0005 decision 7's correction.** The account is GitHub
   > Pro, not Free, and Pro supports branch protection on a private repository — the mechanism is
   > available, just not turned on. This workflow is still advisory: nobody has decided to make it
   > a required check, and this correction does not decide that.

   **The Compose boot is not in CI.** That is where minutes and flakiness actually bite, and
   decision 5 already put it on a human at the two moments it matters.

   > **Surfaced 2026-09-23 before `/to-spec #1` — where the suite runs is not settled, and three
   > records pull on it.** Decision 1 runs the suite against *"a real Postgres in the container
   > that already exists"*. Since ADR-0009's 2026-09-22 correction, the eighth category runs
   > **through nginx**. This decision runs the suite in CI but keeps the Compose boot out of it.
   > No record publishes Postgres to the host, and none says how the workflow obtains a Postgres or
   > the nginx envelope. **Two constraints bind the answer, and neither moves.** The Done box's
   > `npx vitest run` is the run that must cover all ten categories, since CI is advisory evidence
   > and decision 6 makes the template the definition. And the Compose boot stays out of CI. How
   > the local run reaches the stack, and what the workflow provisions or leaves to that local run,
   > is for `/to-spec #1`; see *Not settled*.
   >
   > *Eleven categories since 2026-10-02 (decision 7's note of that date); the new one runs on the
   > same harness.*

   > **The workflow is placed and grows by steps, 2026-09-24 before `/to-tickets`**
   > ([`docs/spec.md`](../spec.md) §16.4, §18). `ci.yml` lands with ADR-0004 d12's week-1 gate.
   > Each step is added by the PR that creates what it needs, rather than made to tolerate an early
   > failure: the seed-idempotence step with the seed's completion record, and the suite step with
   > the first test file. The decision above is unchanged — one advisory workflow on every pull
   > request.

   > **Annotated 2026-09-27 — a second workflow exists, and it is required; this one is not.**
   > `.github/workflows/no-bot-text.yml` checks only a PR's title, description and commit authors
   > for bot or AI text, and a ruleset on `main` requires it (ADR-0005 d7's 2026-09-27 annotation).
   > It installs, builds and tests nothing. **"One advisory CI workflow" still describes `ci.yml`**,
   > which stays the only workflow that tests anything and stays advisory; whether it becomes a
   > required check remains open (*Not settled*).

   > **Narrowed 2026-10-04 by [Settle how tests and CI run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/99): CI starts Supabase's containers,
   > and still not the boot.** The suite and the seed steps need Supabase's own Postgres, Auth and
   > Storage (decision 1's note of 2026-10-04). GitHub starts a workflow's service containers before
   > it checks the repository out, and Supabase's containers need files from it, the database's
   > setup SQL and the gateway's configuration, so they cannot be service containers. CI therefore
   > starts the same throwaway copy as `make test` (*Not settled*, last note): Supabase's containers
   > and the `api` dev container built from the `Dockerfile`'s `dev` target. The migration, the two
   > seed runs and the suite run inside that container, then the copy is deleted. **What stays out
   > is what this decision kept out**: no production image, no `proxy`, no TLS and no boot chain;
   > the clean-clone boot stays decision 5's human check. The price is a `dev` image build and the
   > Supabase images' download on each run. The workflow stays advisory.
   >
   > *Twelve categories since 2026-10-04 (decision 7's note of that date).*

9. **The two additional browsers are Firefox and Brave, and Fadel runs the pass in week 5.**
   `:576`'s list — *"Firefox, Safari, Edge, etc."* — is open, so Brave qualifies unambiguously.

   **Recorded because the engine argument cuts against it and was weighed anyway.** Chrome, Edge
   and Brave are all **Blink**, so Firefox + Brave is Gecko plus a second Blink browser, and
   Firefox + Safari would have covered three engines. It loses to a harder constraint: **the pass
   has to run on the machine the project is demonstrated on**, and Brave is what installs there.
   The consolation is real rather than rhetorical — **Brave Shields make it behaviourally distinct
   despite the shared engine**, and Shields against a self-signed certificate (ADR-0004 decision
   6), against the `wss` socket, and against a `SameSite=Lax` session cookie (ADR-0003 decision 1)
   are where `:580`'s limitations document gets content. **An empty limitations document is the
   thin-looking outcome**, and Edge was less likely to produce one than Brave is.

   Week 5 (2026-10-16 to 10-22) because features must exist first, and it stays clear of week 4,
   which is already Ahmad's hard deadline for the Privacy Policy and Terms of Service.

10. **Fadel ports the fixture and writes the matcher tests in week 2, and Ahmad deputises.**
    Ahmad wrote the prototype and the criteria and would be faster, and that is exactly why this
    is recorded as a decision rather than left to fall to him. **[#16](https://github.com/ahmadmnsur/ft_transcendence/issues/16)
    is the only rejection-bearing item failing right now** — `:306`-`:312` requires commits from
    all team members and the repository has none from Kamel or Fadel — and this is one of very few
    genuinely self-contained pieces of week-2 work, against a file that already exists. **A real
    commit from Fadel in week 2 is worth more than the day it costs.**

    > **Annotated 2026-09-28 — Kamel's first commit has landed; Fadel's has not.** Kamel's first
    > commit reached `main` on 2026-09-27 as `77bef58` (#81, the infrastructure gate), so "none from
    > Kamel or Fadel" no longer holds for Kamel. Fadel still has none, so this decision's reason
    > stands: the fixture port (#34) is planned as Fadel's first commit. Tracked on
    > [#16](https://github.com/ahmadmnsur/ft_transcendence/issues/16).

    Kamel is excluded deliberately: ADR-0005 decision 3 only holds because his infrastructure gate
    and his schema gate are *sequential*, and week 2 is where they meet.

    **Fadel now owns two of the three scheduled QA commitments** (this and decision 9), which
    makes him a single point of failure for a claimed module point. Ahmad deputises on both, on
    the pattern ADR-0005 decision 3 set for the schema gate — *"a single gate with no fallback is
    not a gate, it is a stall."*

    > **Week-2 scope fixed on review of the ticket plan, 2026-09-24** ([`docs/spec.md`](../spec.md)
    > §16.3, §18; `docs/ticket-plan.md`, *uncommitted*). Category 1's seam is *pure engine +
    > services + DB*, and most of its assertions need Rounds, Reviews, hand-made Matches or a
    > Suspension, none of which exist in week 2. **Fadel's week-2 matcher tests (#35) are category 1's
    > engine part**: §8.2's arithmetic and its five halves; C3, C7 and C6 over
    > `generateCohort({ size: 20, seed: 42 })` across six engine Rounds; no-repeats and blocked
    > pairs as engine inputs; most-constrained-first on `starvation`. **The service and DB
    > assertions land with the tickets that create their seams**, which are unassigned:
    > - C4, the prior-`DECLINED` pair, and a blocked pair never proposed by Round open, with
    >   Rounds and Matches (#48);
    > - the hand-made exemptions, and a hand-made Match refusing a blocked pair, with hand-made
    >   Matches (#49);
    > - the six-Round run with every Match accepted and reviewed through the services, asserting
    >   C3, C4, C6 across fresh databases and C7 over it (§16.3), with Reviews (#52);
    > - the prior-`TERMINATED_BY_ADMIN` pair with Suspension and Removal (#66).
    >
    > The fixture port is its own PR (#34), blocked by the infrastructure gate only (#29), and the seed
    > skeleton waits on it for the catalogue (ADR-0017 d8). The owner, the deputy and the category
    > are unchanged.

## Considered options

**No suite at all, manual demo checklist only** (rejected, decision 1). Defensible on the subject
alone, and the cheapest thing on the board. Rejected because it discards something already paid
for: ADR-0006 exists *because* it was measured, C1–C7 are already written, and #9 committed to the
fixture surviving. It also leaves the three silent-failure categories with no detector at all, in
a model where the failure mode is pairs quietly not forming. *(**2026-09-23**: decision 1 listed
**four** categories when written and lists **ten** now; see decision 7.)*

**The conventional pyramid** (rejected, decision 1). Unit, integration and e2e with a coverage
target. It is a tax every slice pays for six weeks against a bullet nobody is grading, which is
the same shape the module-claim decision refused when it left the notification system unclaimed —
*"the strictest absolute in the subject, for one point."* Time is the binding constraint on this
map and has been since charting.

**Jest for the API and Vitest for the frontend** (rejected, decision 2). The NestJS-idiomatic
split, and it matches what `nest new` generates. Two runners, two configurations and two commands,
against a suite that is mostly backend anyway.

**`node:test`** (rejected, decision 2). Zero new dependencies, genuinely attractive for a suite
this thin. It gives the frontend half no watch mode or assertion ergonomics later, and decision 2
is trying to buy one command rather than the smallest dependency.

**Extracting the cohort generator for tests only** (rejected, decision 3). Cleaner separation, and
it lets the seed choose its own data. It throws away the three demo-strategy inputs decision 3
names, which the generator already contains.

**Asserting all seven success criteria** (rejected, decision 4). Symmetric and tempting. C1, C2
and C5 failed and were resolved by ADR-0006 as decisions — C1 rewritten as an Admin workload
commitment, C2 relaxed to measured-but-unenforced, C5 accepted as roughly fair by accident.
Asserting them would fail the build over settled decisions.

**A separately written definition of done** (rejected, decision 6), and **per-ticket acceptance
criteria alone** (rejected, same). The first drifts from the template beside it; the second lets a
ticket be done with a red suite.

**A hard cap on test count or runtime** as the scope guard (rejected, decision 7). Arbitrary, and
games easily by writing fewer, larger tests.

**CI including the Docker clean-clone boot** (rejected, decision 8). The complete version, and the
one an evaluator would find most convincing. It is also where the free plan's minutes and CI
flakiness actually arrive, for a check decision 5 already assigns to a human at the moments it
matters.

**Firefox + Safari** (rejected, decision 9). Three distinct engines and the strongest answer to
`:582`. Rejected on installability where the project is demonstrated, which beats engine coverage.

**Ahmad porting the fixture** (rejected, decision 10). Faster by a day, and it is what would have
happened by default. `:306`-`:312` is a rejection criterion and the repository currently fails it.

## Consequences

- **`CONTRIBUTING.md` gains a Testing section and a Done section, and the PR template gains three
  boxes.** That is where decisions 5, 6 and 7 actually live; this ADR records *why*.
  *(**2026-09-20**: four boxes — the *Records move together* check was added under decision 6's own
  rule. See the annotation there.)*
- **`CONTEXT.md` gains nothing, deliberately.** Testing and done are process, and the glossary is
  domain language. A "definition of done" entry there would be the first implementation detail in
  it.
- **The stack gains its second addition since charting.** Recharts (ADR-0015) and now Vitest. Both
  went through the map rather than a slice, which is the rule worth preserving.
- **Four of ADR-0006's success criteria become executable**, so the one measured part of this
  system keeps its measurement. The other three stay in `SUCCESS-CRITERIA.md` as the record of
  what was traded.
- **The demo-strategy decision is unblocked and arrives with three inputs it did not have** — the
  seeded Skill catalogue, an untaught Skill, and an unmatchable Student. See decision 3.
- **`:316`-`:318`'s clean console stays manual and unverified by anything automated.** It is on
  ADR-0004's pre-defense checklist and stays there. Recorded rather than fixed: a console-error
  check needs a real browser in CI, which decision 8 declined.
- **Nothing in this decision earns a module point except decision 9**, which discharges `:578` on
  a claimed Minor. Worth stating plainly so nobody later defends the suite as a graded deliverable.

## Not settled by this decision

- **Where test files live and what they are named.** A convention `CONTRIBUTING.md` states without
  needing a decision; the slice that writes the first test picks it.

  > **Fixed 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §16.3; M19):
  > `test/<NN>-<category>/*.test.ts`, one directory per category of decision 1, the harness in
  > `test/harness/`.
- **Whether the advisory workflow ever becomes a required check**, should branch protection turn
  out to be available. ADR-0005 decision 7 already names it as one of the two rules to enforce
  first if it is.

  > **Corrected 2026-09-20.** Branch protection is available now (ADR-0005 decision 7's
  > correction, decisions 5 and 7 named as first to enforce) — the "should it turn out to be
  > available" framing is resolved. Whether to actually enable it, and whether this workflow then
  > becomes required, is still not settled by this decision or by ADR-0005.
- **Where the suite executes, and what the advisory workflow provisions for it** *(added
  2026-09-23; see decision 8's annotation)*. For `/to-spec #1`, bound by the Done box's run
  covering all ten categories and by the Compose boot staying out of CI.

  > **Settled 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §16.2, §16.4, §16.6; M18,
  > M21). Locally, `npx vitest run` runs in a fresh `api` dev container on the Compose network
  > (`make test`); the harness migrates a derived `<db>_test` database and boots the app in-process,
  > and category 8 crosses a harness-started nginx that includes the repository's own
  > `proxy/snippets/api.conf`, so all ten categories run. CI provisions a Postgres service container
  > and the distribution's nginx on the runner and runs the same command — no Compose boot. CI also
  > migrates and seeds an empty database and re-runs the seed, which is how an application change
  > that breaks the seed is seen before the pre-defense clean-clone run.
  >
  > *Eleven categories since 2026-10-02 (decision 7's note of that date); the new one runs on the
  > same harness, locally and in CI.*

  > **Changed 2026-10-04 by [Settle how tests and CI run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/99).** The suite now runs against
  > Supabase's own containers (decision 1's note of 2026-10-04), so:
  >
  > - **`make test` runs a copy of its own.** It keeps the files and values ADR-0004 d8's note gives
  >   it (`compose.yaml`, `compose.dev.yaml`, the local overlay, `--env-file .env.example`) under a
  >   Compose project name of its own, for example `peerconnect-test`. It starts the fallback's
  >   Supabase containers from empty, runs `npx vitest run` in a fresh `api` dev container, and
  >   deletes the copy, volumes included. Supabase Auth and Storage write to the copy's main
  >   database, not to `<db>_test`, so sharing `make dev`'s containers would leave every test's
  >   users and files in the developer's data, and a run from empty means what CI's run means.
  > - **The harness keeps `<db>_test`** and never empties the main database, so a suite run inside
  >   a `make dev` container leaves the developer's tables alone. The Supabase users and files that
  >   run makes still go to the developer's stack and stay there until `make reset-local` or
  >   `make wipe`, since only `make test`'s copy is thrown away. Our tables never sit beside
  >   Supabase's `auth` and `storage` schemas during tests, and none of them may reference those
  >   schemas by foreign key.
  > - **The harness refuses any target but the fallback.** Its first step, before any connection,
  >   runs the check `make reset-local` runs (ADR-0004 d11's note): `DATABASE_URL` and
  >   `SUPABASE_URL` must both name the fallback, or the run stops and names the variable and the
  >   host it points at, never the password. `make test`
  >   reads `.env.example` alone, but `npx vitest run` can be typed anywhere, and
  >   `prisma.config.ts` loads `.env` by itself.
  > - **Every test account is made the real way**: a Student through the sign-up code (Supabase
  >   admin create, then the `Student` and its `Session`), the bootstrap staff through the seed's
  >   bootstrap code. A staff session is opened by the code sign-in runs after the password check,
  >   so only the tests of sign-in itself pay for a real password check.
  > - **Supabase Auth users and files outlive the truncation between tests** and are deleted with
  >   the copy. Their ids never repeat, so they collide with nothing; a test checks a user or a
  >   file by its id, never by a count, and file names are built from ids.
  >
  >   *Settled 2026-10-05 by [Settle how avatars and Evidence are stored and served on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/94): a file's name is its row's token, new and
  >   random on every upload. The harness creates the buckets with the boot's own code, and the
  >   `api`'s hourly cleanup timer is off in it; the tests call the cleanup directly.*
  > - **CI runs the same copy** (decision 8's note of 2026-10-04): `prisma migrate deploy` and the
  >   seed on the copy's empty main database, the seed again, then the suite, then the copy is
  >   deleted. There is no Postgres service container, and `nginx` comes from the `dev` image rather
  >   than the distribution.
