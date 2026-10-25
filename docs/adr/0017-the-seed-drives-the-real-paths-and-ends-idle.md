# The seed drives the real write paths, carries four closed Rounds, and ends idle

> **Annotated 2026-10-12 for the move to Supabase.** Decision 10 carries notes from
> [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101) and [Settle how the seed creates accounts and files on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/98) on how the seed runs on
> Supabase: what a run that writes the fixture empties, its guard, the completion record and its
> lock. Decision 6 and the *Consequences* count of `.env.example` carry notes of this date. The
> text below is kept as written;
> [ADR-0019](0019-supabase-hosts-the-data-and-peerconnect-keeps-the-rest.md) sums up the move.

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

   > **Scope and order pinned 2026-09-23 before `/to-spec #1`.** *"The real write paths"* covers
   > every write the application couples to another effect: a derived value, a status
   > transition, an award or a guard. The seed calls the application's own functions for Round
   > open and close, Match acceptance and decline, the Admin's hand-made Match, Review submission
   > and Evidence, Prompt publication **and answers**, Suspension and Removal, signup and Skill
   > lists, avatar upload, Friendship request and acceptance, Block, Like, direct message and read,
   > and Report filing and resolution. XP, Level, `BadgeAward`, Streak, Match status,
   > `MatchSkillCoverage`, Report state, and a Friendship's deletion by a Block are therefore never
   > written directly. Only what no runtime path creates is inserted directly: the Skill catalogue
   > (ADR-0014 d3 has no admin screen), and the bootstrap Admin and Peer Moderator (ADR-0004 d11,
   > ADR-0008 d12), since nothing else can create the first Admin. No application API is added for
   > the seed.
   >
   > **Order, which the paths alone do not fix:**
   >
   > 1. The catalogue and the two bootstrap accounts, then the thirty Students and their Skill
   >    lists.
   > 2. Before Round 1 opens: the blocked pair's Block (decision 8). Created later, it lets the
   >    first matcher run cover the gap Skill.
   > 3. Each Round in turn: open; acceptances, declines and their repairs; Reviews; close. Prompts
   >    are published in sequence between these steps, so each answer lands while its Prompt is
   >    live. A sanction lands inside the Round decision 5 names, after that Round opens.
   > 4. Whatever a sanction must preserve exists before it (decision 5's annotation).
   > 5. A Post before its Likes and Reports. A Friendship before the Block meant to end it. No Block
   >    after any Friendship or pending request the fixture means to keep, since a Block ends a
   >    pending request as well (ADR-0014 d4).
   > 6. The end state: no open Round, the fourth Prompt live.
   >
   > Transaction boundaries and batching are `/to-spec #1`'s. Decision 10's annotation states what a
   > failed attempt must leave.

   > **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §14; M28): each step is
   > one call to an application service method in its own `SERIALIZABLE` transaction, with no
   > batching, and §14.5 fixes the per-Round script deterministically from the matcher's output.

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

   > **Conditions made explicit 2026-09-23 before `/to-spec #1`. The totals do not change.** One
   > standing Match per Student per Round caps a Round at half its pool, so 15 matcher-made Matches
   > need 30 candidates when the Round opens.
   >
   > - The pool is the thirty generated Students plus the bootstrap Peer Moderator, who
   >   participates with Skills (ADR-0008 d12). That is 31 in Rounds 1–3, and 30 in Round 4 once
   >   the Student suspended in Round 3 has left it.
   > - **Sixty is reachable only if the Removal lands inside Round 4, after it opens.** Removed any
   >   earlier, Round 4 opens with 29 and caps at 14. That placement is also the only one where
   >   Removal ends an in-progress Match, which the second `TERMINATED_BY_ADMIN` needs.
   > - Even then, 60 needs the matcher to fill all four Rounds, and ADR-0006 measured 96–99%
   >   coverage at 30. It is a target the deterministic run confirms, never one the seed forces:
   >   no Match is added to reach 15. If a Round falls short, the table and the 74% are corrected
   >   from that run.
   > - Each repair pairs Students left unmatched by a decline in the same open Round, under every
   >   rule a hand-made Match still carries: both active and currently unmatched, no Block between
   >   them (ADR-0006 d10), and the Round open at creation (ADR-0002 d7).

   > **Fixture v3, 2026-10-21 ([#50](https://github.com/ahmadmnsur/ft_transcendence/issues/50)).**
   > This increment adds X's Block of Y before Round 1, then four Rounds through the real open,
   > decline, hand-made repair, acceptance and close paths in `docs/spec.md` §14.5's order.
   > It checks four closed Rounds and none open, the stronger gap on G and the blocked pair's
   > exclusion, and logs each Round's actual distribution beside the full-fixture targets above.
   > Reviews join in v4; Prompt answers, Suspension and Removal join in later increments.
   > Until Reviews join, every accepted Match, including both repairs, lapses at close.
   > This version's completion record certifies these steps and checks, not the complete end state
   > (decision 10; `docs/ticket-plan.md` T22). The full-fixture totals remain targets.

   > **Fixture v4, 2026-10-21 ([#53](https://github.com/ahmadmnsur/ft_transcendence/issues/53)).**
   > This increment adds the Mentee's Review of both repairs, at their step d, and of every step-h
   > Match in selection order, through the real submission path, with `docs/spec.md` §14.5's
   > sentences and ratings. A Review's Skill is its Match's first FORWARD Skill by code point, the
   > team project's `C.UTF-8` order, so the fallback's linguistic collation cannot change it; with
   > no FORWARD Skill it is *"a new topic"*. It checks at least three distinct non-null ratings
   > (§14.8 check 4). **So the v3 note's last behaviour no longer holds**: both repairs and every
   > step-h Match now complete, and only each Round's two lapse indices lapse. Until Suspension and
   > Removal join, the two Matches they would terminate complete instead, and their two Reviews take
   > places in the submission order, so the version that adds the sanctions also moves every later
   > Review's rating. This version's completion record certifies these steps and checks, not the
   > complete end state (decision 10; `docs/ticket-plan.md` T25).

   > **Fixture v5, 2026-10-23 ([#62](https://github.com/ahmadmnsur/ft_transcendence/issues/62)).**
   > This increment publishes the four Reflection Prompts through the real publish path: Prompt 1
   > before Round 1, Prompts 2 and 3 right after Rounds 2 and 3 open, and Prompt 4 after Round 4's
   > close, so Prompt 4 is the live one at the end. Each Round's answers go through the real answer
   > path by `docs/spec.md` §14.5 step b, in position order and then the Peer Moderator, with fixed
   > sentences chosen by position; anyone Suspended or Removed at that moment is skipped. It checks
   > exactly four Prompts with the fourth live, finds decision 6's demo Student and logs their
   > email, and checks that each of the three Badges has an active holder (§14.8 checks 1, 3 and 9).
   > **The Matches and Reviews stay those of v4**: the answers' XP keeps every Level between 1 and
   > 3, so the matcher's Level term never fires (`docs/spec.md` §14.10). This version's completion
   > record certifies these steps and checks, not the complete end state (decision 10;
   > `docs/ticket-plan.md` T34).

   > **Fixture v6, 2026-10-24 ([#67](https://github.com/ahmadmnsur/ft_transcendence/issues/67)).**
   > This increment adds `docs/spec.md` §14.4 step 5 after Round 4's close, through the real
   > paths: decision 9's social graph, Likes and two Direct Message threads (§14.6), then decision
   > 7's report fixtures (§14.7), the resolved one dismissed by the Peer Moderator. It checks
   > decision 7's three outcomes through the moderation service's own reads (§14.8 check 6). *S*
   > and *R* are chosen by §14.5's selection rules over Rounds 3 and 4, with neither sanction
   > applied. Wherever §14.6 says *Active*, the seed counts both out all the same, as the complete
   > script will have them by step 5, so neither is decision 6's demo Student, an eligible Student
   > or a Liker. The demo Student is chosen before step 5, which touches nothing check 3 reads, and
   > check 3 must find the same Student at the end. Where §14.6 and §14.7 leave the order open, the
   > demo Student sends the six friend requests and the first of each pair sends theirs, thread A
   > starts with the demo Student, a Post fixture fills its author before its reporters, and the
   > Student fixture fills its target before its reporter. The `OTHER` report carries a text too,
   > which §12.2 leaves optional. The resolved fixture's author is another Student than the grouped
   > one's, and each reported Post is its author's oldest unused answer (`docs/spec.md` §14.7's
   > note of 2026-10-24). The seed also stops unless §14.6's counts hold: 24 eligible Students,
   > twelve accepted Friendships, two pending requests, two Blocks and two unread messages for the
   > demo Student. **The Matches, Reviews and answers stay those of v5.** Until the sanctions
   > join, *S*'s Match completes and *S* stays in Round 4's pool and answers there, so the version
   > that adds them also changes Round 4's Matches and the Posts, and with them possibly *R*, the
   > demo Student, every Like and every party chosen here. This version's completion record
   > certifies these steps and checks, not the complete end state (decision 10;
   > `docs/ticket-plan.md` T39).

   > **Fixture v7, 2026-10-25 ([#68](https://github.com/ahmadmnsur/ft_transcendence/issues/68)).**
   > This increment applies decision 5's two sanctions inside the Rounds, through the real paths.
   > In Round 3, after the declines and the repair and before either side accepts, the Admin
   > suspends *S*, whose Match ends `TERMINATED_BY_ADMIN`. *S* stays suspended, so *S* is skipped
   > from Round 4's answers and leaves Round 4's pool. In Round 4, at the same point, *R* uploads
   > `prisma/seed/assets/avatar.png` through the avatar path and `evidence.pdf` as Evidence on *R*'s
   > earliest Review, then the Admin removes *R*: *R*'s Match ends `TERMINATED_BY_ADMIN`, the Avatar
   > row goes, and its file is deleted after commit. Both are chosen by `docs/spec.md` §14.5's rules
   > from the Matches of their own Round, so *R* comes from v7's Round 4, not v6's. The seed checks
   > that *S* is Suspended and not Removed, and that *R* is Removed, has no Avatar, keeps their
   > email and has Evidence on a Review they wrote as Mentee, with its Private Feedback (§14.8 check
   > 5). It logs the four Rounds' totals against this decision's targets, with the run's duration.
   > **The first complete run confirms the targets exactly**: 62 Matches, 46 `COMPLETED`, 8
   > `LAPSED`, 6 `DECLINED` and 2 `TERMINATED_BY_ADMIN`, a completion rate of 74%, so the tables
   > above stand as written. Rounds 1 and 2, and Round 3's pairs, are those of v6. Round 4's
   > Matches change, and every Review submitted after *S*'s Match moves up in the submission order
   > that picks its rating; the Posts, the Likes and some step-5 parties change with them. *S*, *R*
   > and the demo Student are positions 5, 24 and 3 (v6: 5, 22 and 3). From this version on, the
   > completion record certifies the complete end state: every step of §14.4–§14.7 and all ten
   > §14.8 checks (decision 10; `docs/ticket-plan.md` T40).

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

   > **Sequence and prerequisites pinned 2026-09-23 before `/to-spec #1`.** The Suspension lands
   > inside Round 3 after it opens, and the Removal inside Round 4 after it opens (decision 4's
   > annotation). Each lands while that Student's Match is in progress, so each supplies one
   > `TERMINATED_BY_ADMIN`, and each Round close then skips that Student's Streak (ADR-0014 d7).
   >
   > Before the Removal, the removed Student must hold three things, or three of the six beats have
   > nothing to show: a `COMPLETED` Match as Mentee, with its Review and Private Feedback;
   > **Evidence** on that Review; and **an uploaded avatar**. The files go through ADR-0009's upload
   > paths while the Student is still active.
   >
   > **This narrows ADR-0009's *"the seed needs no avatar images"*, and #27's input 5, by exactly
   > one file.** Removal can only delete an avatar that exists, and a removed Student can never
   > upload one live. Every other seeded Student keeps the default.

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

   > **A Supabase Auth password since the move to Supabase, noted 2026-10-12.** Like
   > `ADMIN_PASSWORD` and `MODERATOR_PASSWORD`, the variable is 8 characters to 72 bytes, and a
   > team `.env` sets it to a value other than the default before the first boot on the team
   > project (ADR-0004 d9's notes). The evaluator is told it and is never handed the `.env`
   > ([Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100)), so they can still sign in as any seeded Student. The
   > environment list has twenty-seven entries since 2026-10-04 (the *Consequences* note).

   The cohort is deterministic from its seed, so **the designated demo Student is stable by
   construction**. They must carry a Match, a Review, a Badge, a **Streak of at least 3**, and
   **Private Feedback received** — that last one because ADR-0013 decision 5's private route is
   empty for anyone who has never mentored, and it is the only surface where the rating appears.

   > **Asserted rather than assumed, 2026-09-23 before `/to-spec #1`.** A deterministic cohort
   > makes the demo Student reproducible, not certain to exist. So when the fixture completes, the
   > seed asserts that at least one active `STUDENT` among the thirty meets every condition above,
   > and fails loudly otherwise. That Student is the demo account. The Streak must survive Round 4's
   > close, so they need qualifying activity in Rounds 2, 3 and 4. *"Private Feedback received"*
   > goes back to #27's own criterion, **a rating received**: at least one Private Feedback they
   > received carries a rating, and seeded ratings vary. Nothing here met ADR-0013's consequence
   > (#27 input 9) before this note.

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

   > **Report-fixture authorization corrected 2026-09-22 by ADR-0011.** “An Admin reads
   > everything” above means every group that Admin is eligible to review; a group targeting the
   > Admin or their Post, or containing a Report they filed, is hidden from them. With only the
   > bootstrap Admin guaranteed, the seeded open Student report therefore neither targets nor is
   > filed by that Admin, so it is actually actionable. The two open Post reporters must **both**
   > pass the Peer Moderator conflict guard because it now applies to the whole group, not row by
   > row. The resolved fixture remains Admin audit history and is not expected on the Peer
   > Moderator's open queue.

   > **Asserted from each role's view, 2026-09-23 before `/to-spec #1`.** The whole-group guard and
   > the Admin self-interest rule turn on more than the reporters: the Post author, the seeded
   > Blocks, and who is later sanctioned. One hazard is silent. **The open Student report must not
   > target the Student this seed removes.** ADR-0011 d10 moves every open report on a removed
   > Student to `ACTIONED` inside the Removal, so it would quietly become a second resolved fixture.
   > When the fixture completes, the seed therefore asserts three outcomes:
   >
   > - the bootstrap Peer Moderator's queue shows the two-report Post group;
   > - the bootstrap Admin's open queue shows the Student report;
   > - the Admin's resolved audit shows the resolved report.
   >
   > The four-fixture count is unchanged. None needs an Admin reporter, and the Student and
   > resolved reports cannot have the bootstrap Admin as reporter without failing these checks.

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

   > **Tightened 2026-09-23 before `/to-spec #1` — "exactly one active" leaves a hole.** Demand and
   > Supply count active candidates at the end, but `MatchSkillCoverage` records every Match ever
   > made. If the Student suspended in Round 3 or removed in Round 4 listed the gap Skill, a Match
   > against its other side before the sanction covers the Skill while both counts still read 1.
   > So **no seeded Student other than the blocked pair lists the gap Skill on either list**, the
   > bootstrap Peer Moderator included, and both of the pair stay active to the end. When the
   > fixture completes, the seed asserts ADR-0015 decision 3's predicate for that Skill:
   > `Demand > 0`, `Supply > 0`, and no `MatchSkillCoverage` row naming it. That includes #27's
   > blocked-pair condition, and the plain form keeps its own assertion above.

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

    > **Idempotence corrected 2026-09-23 before `/to-spec #1` — "if any Round exists, skip" is not
    > safe after a failed attempt.** No record makes the seed atomic. Decision 2 drives application
    > paths that each commit on their own terms, and *"batching inside the transaction"* above is a
    > performance remark, not a commitment to one seed transaction. So an attempt that fails after
    > Round 1 commits leaves a Round behind, and every later boot skips a half-built fixture.
    > **The contract instead:**
    >
    > - A boot either finds a **completed** seed and skips, or brings the fixture to completion.
    > - The skip test recognises completion, never the mere presence of a row such as a Round, a
    >   Student or the bootstrap Admin.
    > - A failed attempt fails the boot loudly, and leaves either nothing or state the next attempt
    >   can complete or discard.
    > - A completed seed never runs again, including over the live Rounds a demo has since added.
    > - **Completed** means decision 1's end state, no open Round with the fourth Prompt live, plus
    >   every end-state assertion in decisions 6, 7 and 8, and each of ADR-0010 d4's three Badges
    >   held by at least one active Student. The last is the reason for the four Prompts.
    >
    > `/to-spec #1` chooses the mechanism: one transaction, a completion record, a reset-and-retry
    > or another. ADR-0004 decisions 8 and 11 stand: the seed still runs on every boot, on both
    > boot paths. *(The pool is 31 in Rounds 1–3, per decision 4's annotation, so those runs cover
    > 465 pairs rather than 435; the cost claim is unaffected.)*

    > **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §14.9; M14): a completion
    > record and a reset-and-retry. The record is a fixed, versioned `COMMENT ON DATABASE`, written
    > only after every end-state assertion passes; a boot finding it skips, and a boot finding rows
    > without it truncates the nineteen domain tables and re-runs, which is safe because the API
    > serves only after the seed completes. The seed and fixture paths are `prisma/seed/**` and
    > `prisma/fixtures/**` (§3.2).

    > **Stale record handled, 2026-09-23 by the pre-`/to-tickets` verification**
    > ([`docs/spec.md`](../spec.md) §14.9). A record
    > over empty domain tables is stale and the boot seeds: Prisma's PostgreSQL reset (`migrate
    > reset`, or `migrate dev`'s reset prompt) drops and recreates the schema but not the database,
    > so a database comment outlives the rows it certified. Report-fixture parties are also drawn
    > again from the start of the eligible Students, since the social graph uses 23 of the 24
    > (§14.6–§14.7), and the demo Student is chosen outside the reserved positions.

    > **Stale record cleared first, 2026-09-24 before `/to-tickets`** ([`docs/spec.md`](../spec.md)
    > §14.9). The note above re-runs the seed over a stale record but left the record in place until
    > the run's end, so a run that failed partway left the old record above partial rows, and the next
    > boot read that as *completed* and skipped — the exact state this decision's contract forbids (*"a
    > failed attempt … leaves either nothing or state the next attempt can complete or discard"*;
    > *"the skip test recognises completion"*). The seed now clears a stale record as its first write,
    > so a failure lands on the ordinary no-record truncate-and-retry path, and a record is only ever
    > present above the fixture it certifies. The contract above is unchanged; only the mechanism
    > now meets it. While the seed is built slice by slice, a record certifies the fixture version
    > that wrote it, and the four-Round end state binds from the PR that completes it (§14.9, §16.5).

    > **On the team project, 2026-10-03 by [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101).** `make up` now runs
    > on the hosted team project when `.env` holds its values. There the seed writes its fixture at
    > the first boot, and every later boot skips it until a reset empties the project, so the Rounds
    > a demo adds stay. Three things this decision took from an empty volume per evaluator no longer
    > hold there:
    >
    > - **Later defenses do not start from decision 1's end state.** Each defense after the first
    >   starts from the team project's accumulated data, so the four-Round idle start and the Round 5
    >   beat of the open-Round stall panel hold only after the first seed or a reset. Before a
    >   defense, no Round is left open.
    > - **The older-fixture remedy.** The boot's warning names `make wipe`, which empties only local
    >   volumes. On the team project it names `make reset-team` instead, which empties the project
    >   so the next boot seeds it afresh. Kamel runs it whenever he chooses, never as part
    >   of `make up`: when the fixture changes, when an earlier defense broke a seeded account, or
    >   when a defense should start from this decision's end state.
    > - **One seed at a time.** The truncate-and-retry above assumes no other stack shares the
    >   database. On the team project the seed holds a session advisory lock for its whole run, and
    >   the reset and the first boot after it run with no other stack connected.
    >
    > ADR-0004 d11's note has the detail. On the fallback, the local stack a fresh clone boots,
    > nothing changes.

    > **Settled 2026-10-11 by [Settle how the seed creates accounts and files on
    > Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/98): what a run empties, the
    > record, the lock and the time, on both targets.** The accounts and files themselves are made as
    > already decided: the staff and the thirty Students through Supabase Auth's admin create and the
    > real sign-up (ADR-0008 d12's note), *R*'s two files through the real upload paths after the
    > seed's bucket step (ADR-0004 d11's note of 2026-10-05).
    >
    > - **A run that writes the fixture empties first.** The seed writes only when it finds no
    >   record, or a stale one over empty tables: the first boot, the boot after a reset, the boot
    >   after a failed attempt. Before its first fixture step it deletes the rows of our tables, then
    >   every Supabase Auth user, then every file in the `avatars` and `evidence` buckets, through
    >   Supabase's admin APIs, never by SQL into the `auth` or `storage` schemas, and it lists each
    >   set whole before deleting any of it, since deleting page by page skips some. Our tables then
    >   hold a failed attempt's rows or none, since the API serves only after the seed completes
    >   (`docs/spec.md` §15.5) and a stale record sits over empty tables; the guard below catches the
    >   one other case. So once those rows are gone, no Student names any Supabase Auth user or file
    >   left there: they are a failed attempt's, or an unfinished reset's. Truncating our tables alone
    >   left them behind, up to thirty-two more Supabase Auth users for every failed attempt. After a
    >   retry, Supabase holds exactly the seed's accounts, and in `avatars` and `evidence` exactly
    >   its files. The two resets run the same deletions (ADR-0004 d11's note of 2026-10-11).
    > - **A guard comes before it.** If any Student is not one the seed makes, by email (the thirty
    >   of `docs/spec.md` §14.3, `ADMIN_EMAIL` and `MODERATOR_EMAIL`), the seed deletes nothing,
    >   says the database holds accounts the seed did not make, names the target's reset,
    >   `make reset-team` or `make reset-local`, and fails. That state means the record was lost
    >   over real data, by a bug or by hand, and the seed never deletes real data on its own: only a
    >   reset does, which someone runs on purpose. A reset that stopped before deleting our rows is
    >   finished by running it again. A failed read of the record also stops the seed; it never
    >   counts as no record.
    > - **The record stays `COMMENT ON DATABASE`.** The `postgres` role is not a superuser, but it
    >   owns the database, on the fallback (checked 2026-10-10) and on the team project (checked
    >   2026-10-11, read-only), so it can write and clear the record. Both databases already carry
    >   Postgres's own comment, *"default administrative connection database"*, so only text of the
    >   form `peerconnect:seed:complete:fixture-v<N>` counts as a record, and any other comment is no
    >   record. A record for another version, over tables that hold rows, writes nothing and exits 0:
    >   an older one names the reset, as the note above says, and a newer one, which an out-of-date
    >   checkout meets, says to pull `main`. Over empty tables, any record is stale and the seed
    >   writes, as the first bullet says. The *already complete* line names the version. On the team
    >   project the record is read in the dashboard's SQL editor, with `docs/spec.md` §14.9's query.
    > - **The lock has a connection of its own.** The advisory lock above is taken on both targets,
    >   on a connection opened for it alone, outside the `api`'s pool, before the record is read,
    >   and kept to the end of the run. Prisma gives a connection back to the pool after each
    >   operation, so a lock taken through it is not held by the run: other work can use that
    >   session, the record may be written on another one, and an idle one is closed after 10
    >   seconds (node-postgres's default). The record is cleared and written on the lock's
    >   connection. **Losing that connection stops the run at once**: an error or a close on it exits
    >   1, with no reconnect, since a second seed can take the freed lock and start deleting while
    >   this run is still writing. The connection sends TCP keepalives every few seconds, because it
    >   sits idle for the whole run and node-postgres turns keepalives off by default. A second seed
    >   waits for the lock, then reads the record. Once built, it is checked through the team
    >   project's session pooler that a dropped client connection frees the lock: client A holds
    >   it, A's connection is closed without ending its backend, and client B gets it.
    > - **The run is slow on the team project, and that is accepted.** Every step is its own
    >   transaction (`docs/spec.md` §14.1), and from a laptop every statement is a round trip to
    >   Frankfurt, about 70 ms from Kamel's computer (measured 2026-10-01). Some 3,000 to 6,000 round
    >   trips put a full run at roughly four to seven minutes, an estimate while the seed is unbuilt;
    >   on the fallback it takes seconds. Only a boot that writes the fixture pays it. So the `api`'s
    >   healthcheck allows 15 minutes (ADR-0004 d11's note of 2026-10-11), the seed logs how long its
    >   run took, and the first complete run on `main` against the team project checks that it fits.
    >   Batching, which this decision keeps for a seed that is too slow, stays the last resort.

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

  > **Twenty-seven since 2026-10-04, noted 2026-10-12.** The fifteen remain, and the move to
  > Supabase added twelve: the `api`'s three `SUPABASE_*` entries and nine signing secrets and
  > keys of the local fallback (ADR-0004 d9's note of 2026-10-04).
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
