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
   - **At most one standing Match per Student per Round** — the one invariant ADR-0014 decision 13
     records as **not expressible in the schema**, violable through an Admin's hand-made Match
     (ADR-0002 decision 7). If anything in this model earns a test, it is the rule nothing else
     holds.
   - **ADR-0009 decision 3's access-control pair** — signed out gives 401, signed in as an
     unrelated Student gives 403. That ADR already wrote it as an acceptance test in prose, and
     `:542` is a claimed module bullet.

   **Everything else is deliberately untested.** CRUD, forms, the feed, the three dashboards and
   every screen fail *loudly*, and the demo is a better detector than a test would be.

2. **Vitest, one runner for both ends.** Vite is already a locked stack component (ADR-0004
   decision 4's dev overlay), so Vitest reuses its transform and there is no second
   `ts-jest`/babel configuration to keep alive. One runner means **one command for decision 6 to
   point at**, which matters more than it sounds: a definition of done that names two commands is
   one an agent gets half-right.

   The cost is honest and small: NestJS scaffolds with Jest, so `nest new`'s defaults get
   replaced on day one.

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
   through a checksum mismatch. Discovering either in the final fortnight is the worst available
   time, and the check is one command. It goes in the PR template; ADR-0004's pre-defense
   checklist keeps it too.

6. **Done is the merged PR, with every box in the template ticked. Nothing else is defined.**
   The template gains three checks — the suite is green, the ticket's acceptance criteria are met,
   and decision 5's boot check where it applies — beside the branch, commit, rebase,
   `Co-authored-by:` and `prisma/**` boxes ADR-0005 already put there.

   **This deliberately invents no second concept.** A separately written definition of done drifts
   from the checklist sitting next to it, and a purely per-ticket definition lets a ticket be
   "done" with a red suite. Making the template the definition also keeps it **checkable by an
   agent without asking a human**, which is the property `/to-tickets` actually needs.

7. **A test is added only for something that fails silently, and decision 1's list is closed until
   someone argues a fourth category.** The pull to broaden will arrive during implementation, the
   way ADR-0003 decision 9 predicts the pull to put a privileged action on the socket and ADR-0005
   decision 4 predicts the quiet reversal of the schema gate. **Anything the compiler or a demo
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

   **The Compose boot is not in CI.** That is where minutes and flakiness actually bite, and
   decision 5 already put it on a human at the two moments it matters.

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

    Kamel is excluded deliberately: ADR-0005 decision 3 only holds because his infrastructure gate
    and his schema gate are *sequential*, and week 2 is where they meet.

    **Fadel now owns two of the three scheduled QA commitments** (this and decision 9), which
    makes him a single point of failure for a claimed module point. Ahmad deputises on both, on
    the pattern ADR-0005 decision 3 set for the schema gate — *"a single gate with no fallback is
    not a gate, it is a stall."*

## Considered options

**No suite at all, manual demo checklist only** (rejected, decision 1). Defensible on the subject
alone, and the cheapest thing on the board. Rejected because it discards something already paid
for: ADR-0006 exists *because* it was measured, C1–C7 are already written, and #9 committed to the
fixture surviving. It also leaves the three silent-failure categories with no detector at all, in
a model where the failure mode is pairs quietly not forming.

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
- **Whether the advisory workflow ever becomes a required check**, should branch protection turn
  out to be available. ADR-0005 decision 7 already names it as one of the two rules to enforce
  first if it is.
