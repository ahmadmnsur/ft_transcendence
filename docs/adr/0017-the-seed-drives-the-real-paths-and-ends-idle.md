# The seed drives the real write paths, carries four closed Rounds, and ends idle

ADR-0004's *Not settled* section opened this in one line — *"decision 11 settles the mechanism and
the bootstrap Admin only; the demo strategy is still open"* — and **eleven later decisions bolted
requirements onto it without anyone owning the result.** It is the last entry in the map's
*Not yet specified*, and the one input `/to-spec` cannot invent.

It is not polish. `document/en.subject.md` counts **only fully functional and properly implemented
modules**, each demonstrated live, and ADR-0001's whole argument for **Round** existing was that
several must complete inside one evaluation slot. A seed that cannot produce that is a scoring
problem.

**One assumption is load-bearing and is not in the subject.** ADR-0001 says *"a peer evaluation
runs under an hour"* and cites nothing. A sweep of `en.subject.md` for `minutes`, `hour`,
`duration` and `defence` returns **one hit** — `:1391`, about the live *modification* step being
*"feasible within a few minutes"*. The hour is a reasonable assumption about 42 peer evaluations,
it is recorded here as an assumption, and nothing below depends on its exact value.

The shape we chose: **the seed drives the same write paths the application does, stops after four
closed Rounds, and leaves the platform idle so the demo opens the fifth on stage.**

## What this ADR changes in earlier records

- **ADR-0010's open choice is taken.** *"Either the seed fabricates Match, Review and Post
  history, or it writes Badge rows directly."* Decision 2 chooses the first.
- **ADR-0007 decision 11 is extended.** *"The seed publishes one Prompt"* is **not enough**: the
  **Knowledge Sharer** Badge needs three Prompts answered (ADR-0010 d4), and ADR-0007 d1 allows
  exactly one live at a time. The seed publishes **four in sequence** — three closed by
  supersession, one live. ADR-0007's rule is untouched; it was sized before the Badge existed.
- **ADR-0004 decision 11 is extended, not amended.** Its boot sequence and its idempotence
  requirement stand; decision 10 below states what idempotence now *means* for a seed this large.
- **ADR-0004 decision 9 gains one entry**, `SEED_STUDENT_PASSWORD` (decision 6), taking
  `.env.example` to fifteen.
- **ADR-0015 decision 3's stronger gap form gains a construction** (decision 8). The obvious one
  — a suspended Student's `TEACH` Skill — **does not work**, because ADR-0015 d2 counts Supply
  over the candidate pool only.
- **ADR-0016 decision 3's shared fixture gains its two call sites** (decision 3).

## The decisions

1. **Four closed Rounds are seeded, the platform ends idle, and two Rounds run live on stage
   sequentially.**

   Ending idle rather than mid-Round is the deliberate part. ADR-0002 decision 2 makes the gap
   between Rounds *"a real, expected state, not a fault"*, and a seeded open Round would force the
   demo to close one before it could open one — a wasted step in the scarcest resource there is.

   Four is the floor set by three separate rules, not a round number: **Consistent Learner** needs
   a **Streak** of 3 (ADR-0010 d4), **Knowledge Sharer** needs three Prompts answered, and
   ADR-0015 decision 4 indexes every time series **by Round**, so fewer than three closed Rounds
   renders the analytics as a point rather than a series. Two live Rounds rather than one because
   the second proves the first was not a fluke.

   > **Corrected 2026-09-20 — the floor is three, and four is a choice. The decision does not
   > move.** The paragraph above contradicts itself: it concludes *"four"* from rules it then
   > states as *"fewer than **three** closed Rounds"*. And only two of the three cited rules
   > constrain the **Round** count at all:
   >
   > - **Consistent Learner (`Streak >= 3`, ADR-0010 d4)** — a genuine Round floor of **three**.
   >   Streak moves only in the Round-close transaction (ADR-0014 d7), so it takes three closed
   >   Rounds with qualifying activity.
   > - **ADR-0015 decision 4's by-Round time series** — a genuine Round floor of **three**, which
   >   is what the sentence above actually says.
   > - **Knowledge Sharer (three Prompts answered)** — **not a Round floor.** ADR-0002 decision 9
   >   decoupled the Prompt loop from matching and ADR-0007's consequence is explicit that *"Streak
   >   is defined on Rounds and not on Prompts"*, with two Prompts answered in one Round counting
   >   once. Three Prompts could be answered inside a single Round. It is a floor on the **Prompt**
   >   sequence, met by the four published Prompts, not on the Round count.
   >
   > **So three is the floor and the fourth closed Round is chosen.** What chooses it is already in
   > this ADR and was never connected to decision 1: **ADR-0006 line 192 guides "roughly 30 Students
   > in demo and test fixtures" *for six Rounds***, which is the calibration decision 3 relies on
   > for `size: 30`. **Four seeded plus two live is exactly that six.** The fourth Round also buys
   > the analytics a four-point series before the demo adds two more, and the headroom the
   > consequence below measures — 62 of roughly 174 legal pairs burned, leaving ~112 against ~30
   > consumed live.

   **Sequentially, because there is no other option.** ADR-0002 decision 2 allows **at most one
   open Round**, and ADR-0014 decision 13 holds it in the schema with a unique index on
   `(closed_at IS NULL)`. So the stage flow is **Round 5 opened, matched, closed — then Round 6**,
   never both at once.

2. **The seed drives the real write paths. It does not write end-state rows.** It runs the
   matcher, submits Reviews, publishes Prompts and closes Rounds through the same functions the
   application uses.

   **Badges are awarded inside the XP transactions and Streak is recomputed inside the
   Round-close transaction** (ADR-0010 d4, ADR-0014 d7). Writing end-state means **reimplementing
   those rules in the seed** — a second implementation of the only scoring logic in the product,
   which can drift from the first with nothing to catch it. It also gives an honest answer when an
   evaluator asks how a Badge was earned, and it exercises the two XP paths and the Round-close
   path, none of which ADR-0016's thin suite covers.

   The cost is accepted and named: **the seed becomes a large artifact on the boot path**, gated
   exactly like the schema (ADR-0005 d6).

3. **One fixture module, two call sites.** The suite calls `generateCohort({ size: 20, seed: 42 })`
   and the seed calls it with `size: 30`.

   **The test call site is not a preference and must not drift.** `SUCCESS-CRITERIA.md` fixed
   20/seed 42 **before the first prototype run**, and ADR-0006's entire calibration was measured
   against it — changing it invalidates the C3/C4/C6/C7 assertions ADR-0016 decision 4 built.
   Thirty is ADR-0006's separate guidance for a six-Round demo, where stalls flatten to 0.13 and
   coverage reaches 99.4%.

   One difference beyond size: the generator spreads XP across Levels 1–10 for the measurement
   run, and **the seed starts every Student at zero XP** — see decision 4 and the consequence on
   Level spread.

4. **Sixty-two Matches across the four Rounds, and the completion rate reads 74%.**

   | | |
   | --- | --- |
   | Matcher-made, ~15 per Round × 4 | **60** |
   | Admin hand-made repairs (ADR-0002 d7) | **2** |
   | **Total Match rows** | **62** |

   | Status | Count | |
   | --- | --- | --- |
   | `COMPLETED` | **46** | 44 matcher-made, plus both repairs |
   | `LAPSED` | 8 | Round closed with no Review |
   | `DECLINED` | 6 | two of them repaired by hand |
   | `TERMINATED_BY_ADMIN` | 2 | one from the suspension, one from the removal |
   | | **62** | |

   **Completion rate is `46 ÷ 62 = 74%`**, on ADR-0015 decision 2's definition — `COMPLETED` over
   **all** Matches created in closed Rounds, repairs and declines included.

   **A uniformly completed cohort was the thing to avoid.** It reads 100%, renders ADR-0015's
   outcome distribution as a single bar, and looks fabricated because it is. Both repairs complete
   deliberately: that is the only path in the model that produces a Match with
   `compatibility_score NULL` (ADR-0006 d10, ADR-0014 d9) going on to earn XP, and nothing else
   exercises it.

   **`MATCHED` and `ACCEPTED` appear nowhere**, correctly — every seeded Round is closed and
   ADR-0002 decision 5 finalises every Match in it. **So ADR-0015's open-Round stall panel is
   empty at boot and populates when Round 5 opens live.** That is a demo beat, not a broken chart,
   and it is written here so nobody reads it as one.

5. **One Student is suspended in Round 3 and left suspended; one is removed.**

   Both are one flag, and between them they make six settled rules visible that a clean cohort
   cannot show: the **Streak freeze** (ADR-0014 d7 skips flagged rows, so it resumes rather than
   restarts), the **Leaderboard read-time filter** (ADR-0008 d6 — *"filtered from the result,
   never erased from the measure"*), the Users table's **suspended** and **removed** statuses
   (ADR-0008 d11), the **tombstone** render with its permanently burned email (ADR-0008 d7), a
   **deleted avatar beside surviving Evidence** (ADR-0009 d6), and **Private Feedback from a
   removed Student still rendering to its Mentor** (ADR-0013 d8).

   The removed Student must therefore have been a **Mentee** in a completed Match before removal,
   or the last of those has nothing to show.

   > **Corrected 2026-09-20 — the Streak parenthesis describes a beat this fixture cannot show.**
   > *"So it resumes rather than restarts"* is ADR-0014 decision 7's wording, and that sentence
   > ends *"it **resumes on reinstatement** rather than restarting."* **This Student is left
   > suspended and is never reinstated**, so no resumption ever happens on stage. What the fixture
   > actually demonstrates is the **freeze itself**: the Round-close transaction skips Suspended and
   > Removed rows, so the stored Streak is **preserved rather than reset to zero** when a Round
   > closes without qualifying activity from them — which is what would happen to an active Student.
   > That is ADR-0008 decision 6's *"a Suspension makes Streak freeze"* and `CONTEXT.md`'s *"their
   > XP and Streak freeze rather than revert"*. **The fixture is unchanged**; only the claim about
   > what it shows is corrected.

6. **`SEED_STUDENT_PASSWORD` in `.env.example`, shared by all thirty seeded Students.**

   Today `.env` carries credentials for the bootstrap **Admin** and **Peer Moderator** only
   (ADR-0004 d9, ADR-0008 d12), so an evaluator can reach the platform **only as staff** — and the
   Student view is where the entire product lives. One variable rather than a dedicated demo pair,
   because it lets them sign in as **any** seeded Student the moment they stop following the
   script, which is exactly when a demo is really being tested. ADR-0004 decision 9's warning
   extends to it unchanged.

   > **Clarified 2026-09-20 by ADR-0004 d8/d11 — the seed reads the resolved container
   > environment, not only `.env`.** `.env.example` is the required baseline `env_file` for
   > the bare clean-clone path; optional `.env` is loaded later and overrides it. The variable,
   > its shared development value and the fifteen-entry environment list are unchanged.

   The cohort is deterministic from its seed, so **the designated demo Student is stable by
   construction**. They must carry a Match, a Review, a Badge, a **Streak of at least 3**, and
   **Private Feedback received** — that last one because ADR-0013 decision 5's private route is
   empty for anyone who has never mentored, and it is the only surface where the rating appears.

7. **Four report fixtures: two open Post reports, one open Student report, one resolved.**

   One report was ADR-0011's stated minimum and it demonstrates half of what the advanced
   permissions points rest on. **A Peer Moderator reads `post_id IS NOT NULL`; an Admin reads
   everything** (ADR-0011 d7) — with no **Student** report in the queue, both roles see an
   identical list and the split is invisible.

   - **Two open Post reports**, one target carrying **both** so the grouped count shows
     (ADR-0011 d5).
   - **One open Student report**, which only the Admin can see.
   - **One resolved report** with `resolved_by` and `resolved_at` set. This one earns its place
     specifically: ADR-0011 decision 8 closes the moderator-abuse hole with *"attribution plus an
     Admin who can read resolved items"*, and that argument is unverifiable against an empty list.

   ⚠️ **The reporters must be chosen deliberately.** A reporter may not be the Post's author, and
   **no reporter may be in a Block in either direction with the bootstrap Peer Moderator**
   (ADR-0008 d10 as widened by ADR-0011) — otherwise the conflict-of-interest filter hides the
   only rows there are, and the queue renders empty on a moderator account that has one.

8. **The Skill catalogue is the fixture's twenty-four plus three `RARE_SKILLS`, and both of
   ADR-0015's gap forms are constructed.**

   **The plain form is free.** `RARE_SKILLS` exists in the generator to *"manufacture an
   unmatchable Student"*, so `Demand > 0` and `Supply = 0` — provided at least one **active**
   Student lists one as `LEARN`, which the seed asserts rather than assumes.

   **The stronger form comes from a Block, and the obvious construction does not work.** ADR-0015
   decision 3 wants a Skill that is wanted, *is* offered, and has **never been covered by a
   Match** — *"it says the matcher is not reaching a need that exists."* Reaching for a
   **suspended** Student's `TEACH` row fails: **ADR-0015 decision 2 counts Supply over the
   candidate pool only**, so a suspended Student contributes nothing to Supply and the case
   collapses into the plain form. Recorded because it is the first thing anyone will try.

   What works instead: pick one catalogue Skill and seed it so **exactly one active candidate
   lists it as `TEACH` and exactly one lists it as `LEARN`** — and make **those two Students one
   of the two seeded Blocks** (decision 9). ADR-0006 step 2 rejects blocked pairs as hard-invalid
   in either direction, and **ADR-0006 decision 10 binds an Admin's hand too** — its prohibition is
   unqualified, *"a blocked pair can never be Matched, in either direction"*, and the same sentence
   then names exactly what a hand-made Match **is** exempt from: the Compatibility Score and
   no-repeats. **The Block is not on that list.** So the only pair that could ever cover that Skill
   never can. `Demand = 1`, `Supply = 1`, no `MatchSkillCoverage` row. One Block does double duty
   and nothing is manufactured.

   ⚠️ **No database constraint holds that, and this construction rests on it.** ADR-0014 decision
   13's list of invariants that move into the schema does not include it — `Block`'s only unique
   constraint is on the ordered pair (ADR-0014 d4), which stops duplicate Block rows, not a Match
   across one. The rule lives in **matcher step 2**, and an Admin's hand-made Match **does not run
   the matcher** (ADR-0002 d7, ADR-0006 step 9). An Admin path that omits the Block check would
   cover this Skill and silently erase the gap ADR-0015 decision 3 is demonstrated by. Same shape
   as ADR-0014 decision 13's note that the standing-Match rule is violable through the same path,
   and recorded for the same reason.

   **A third, separate beat worth keeping:** suspending a Student who teaches something makes
   **Supply for that Skill visibly drop**, which is ADR-0015 decision 2's candidate-pool
   restriction demonstrating itself. It is not the stronger gap; it is its own thing.

9. **The social graph is sized deliberately: roughly twelve accepted Friendships, two pending into
   the demo Student's inbox, two Blocks — one of them ending a Friendship — Likes scattered zero
   to six across seeded Posts, and two direct-message threads, one carrying unread messages.**

   Three of those are load-bearing rather than decorative. **A Block that ends a Friendship** is
   ADR-0014 decision 4's new rule and is invisible without one. **Unread messages** are the only
   thing that exercises `read_at`, the column ADR-0014 decision 6 defended as *"the difference
   between a chat that demonstrates and one that does not"* while insisting it is not the
   notification system the module claim refused. And a **pending** request is what shows the
   acceptance step exists — the step `:504` never asks for, added because friendship **discloses
   Presence** and one-sided adding would publish someone's online status without their consent.

10. **One seed, everything, on the boot path. Idempotence is "if any Round exists, skip."**

    ADR-0004 decision 8 is firm that bare `docker compose up --build` must work **end-to-end** and
    that the Makefile is *"never a hiding place for required setup"*. **The demo fixture is
    required setup** — it is what makes the claimed modules demonstrable — so putting it behind a
    second target is precisely what that decision forbids, and an evaluator running the bare
    command from a clean clone would meet an empty platform.

    The cost is smaller than the artifact's size suggests: four matcher runs over 435 candidate
    pairs each is trivial CPU, and the whole fixture is on the order of a thousand rows. **If it
    is ever too slow, the answer is batching inside the transaction, not a Makefile target.**

11. **Presence cannot be seeded, and the demo script must account for it.** Presence is live,
    process-local state; it does not survive a restart, there is no column, and **nothing records
    when a Student was last online** (ADR-0003, `CONTEXT.md`). Every seeded Student therefore
    reads **offline** until someone signs in as them, so **demonstrating online status requires
    two live browser sessions**. Written down because it looks exactly like a bug.

## Considered options

**Writing end-state rows directly** (rejected, decision 2). The cheap half of ADR-0010's open
choice, and genuinely faster. It requires the seed to reimplement Badge thresholds and the Streak
recomputation, which is a second copy of the only scoring logic in the product, and it answers
*"how was this Badge earned?"* with *"it wasn't."*

**A split — real paths for Matches and Reviews, direct writes for Badges and Streak** (rejected,
decision 2). It looks like a reasonable middle and is the worst of both: the two things it writes
directly are exactly the two that ADR-0010 and ADR-0014 placed *inside* transactions on purpose.

**Six closed Rounds seeded, one live** (rejected, decision 1), and **two seeded, four live**
(rejected, same). The first leaves almost nothing to demonstrate and turns the slot into a tour of
a database; the second spends the slot re-demonstrating one loop and gives the analytics a
two-point series.

**A seeded open Round**, so the demo starts mid-cycle (rejected, decision 1). It saves the audience
one step and costs the ability to show a Round opening, which is where atomic matching — the whole
of ADR-0002 decision 3 — becomes visible.

**One shared cohort at 30 for both the suite and the seed** (rejected, decision 3). Tidier by one
parameter. It silently re-measures ADR-0006 against a cohort its calibration was never taken on.

**A dedicated `DEMO_EMAIL` / `DEMO_PASSWORD` pair** (rejected, decision 6). Two variables instead
of one, and it locks an evaluator to the single account the script names.

**`make seed-demo` behind a second command** (rejected, decision 10), and **`SEED_DEMO` as an env
flag** (rejected, same). Both buy boot speed by breaking ADR-0004 decision 8's single-command
property, for a cost decision 10 measures in seconds.

**Seeding initial XP to spread Levels** (rejected, decisions 2 and 3). Tempting, because four
Rounds cannot lift anyone far. It is the exact incoherence ADR-0010 warned of — *"seeded Students
would otherwise show as Level 8 with no badges and a Streak of 0"* — and it re-opens the ledger
question by another route. The consequence below states what we accept instead.

## Consequences

- **Every Level, Badge and Streak in the demo is traceable to activity that actually happened.**
  That is the whole return on decision 2.
- **Levels run 1 to 3, and that is accepted.** Four Rounds pay a Mentee at most 480 XP plus Prompt
  answers, and ADR-0010's bands are 250 XP wide. **ADR-0006 decision 7's Level tie-break therefore
  never fires during the demo**, since it only bites above a gap of 2. This costs nothing
  demonstrable: the term is internal and **never displayed** (ADR-0006 d7), and the Leaderboard
  ranks by **XP**, which does spread. Recorded so nobody later "fixes" it by seeding XP.
- **The seed burns 62 of roughly 174 legal pairs.** At N=30 about 40% of the 435 pairs clear the
  floor — **derived by scaling the prototype's measured N=20 figure, not measured at 30** — leaving
  ~112, against ~30 consumed by two live Rounds. Comfortable, and now cheap to verify exactly,
  since ADR-0016 made the generator a real fixture.
- **The seed publishes four Reflection Prompts, not one.** ADR-0007 decision 11 was written before
  Knowledge Sharer existed.
- **`.env.example` reaches fifteen entries.** Ten from ADR-0004, two empty OAuth, two moderator,
  and `SEED_STUDENT_PASSWORD`.
- **The seed is now the largest gated artifact in the repository** after `schema.prisma`, and
  ADR-0005 decision 6 puts it through the same review. Whoever writes it should expect the gate.
- **The map's *Not yet specified* section is empty.** Testing went to ADR-0016 and the demo
  strategy goes here. Open **decisions** remain; unknown unknowns do not.

## Not settled by this decision

- **The order of the demo script itself** — which surface is shown when, inside the slot. This ADR
  fixes what exists at boot and what runs live; the running order is a rehearsal question and
  belongs with whoever presents.
- **Exactly which named Student is the demo account.** Deterministic from the seed, so it can be
  read off the first generated cohort rather than decided here.
