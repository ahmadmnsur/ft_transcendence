# The XP table, ten Levels, three Badges, and one Leaderboard by XP

**No ticket and no ADR on this map had ever awarded a specific XP amount.** ADR-0007
decision 6 settled *when* XP lands — in the same transaction that creates the **Post** — and
said nothing about how much. ADR-0002 decision 5 says an unreviewed **Match** awards none,
decision 9 says an idle-period **Reflection Prompt** answer awards XP but not **Streak**, and
`CONTEXT.md` says XP is "awarded only for completed, confirmed activity". All of that
constrains the shape and none of it gives a number.

It has to be given one here, because **gamification is a claimed module**
(`document/en.subject.md:848`), not deferred work. The module-claim decision banked its point
on the argument that the proposal defers only the *full* badge set and *all* leaderboard
categories, so "a minimal badge set plus one leaderboard" is reduced depth rather than a
Version 2 pull-forward — an argument that only holds once *minimal* and *one* are actually
pinned down.

> **Reclassified by ADR-0015, and the point is unaffected.** That ADR counts the minimal badge
> set plus one Leaderboard as one of exactly **three deliberate Version 2 pull-forwards**,
> beside 42 OAuth and Learning Analytics — the opposite label to "reduced depth rather than a
> pull-forward" above. ADR-0015 is right, on a precedent set after this ADR was written:
> **Section 15 is the MVP list** (ADR-0013), and Section 15 names only "Core XP and a single
> participation streak", so badges and leaderboards are not MVP and the map's standing default
> makes them Version 2. **Nothing moves** — the pull-forward passes ADR-0015 decision 10's test
> outright, because the Gamification Minor requires it and this ADR is the "only to the depth
> the module requires" clause doing its work. Only the framing was inconsistent between two
> records.

Two numbers did already exist, unratified. The matching prototype invented `mentee +120 /
mentor +80` and `levelOf(xp) = min(10, 1 + floor(xp / 250))` to make a *different* question
runnable, and ADR-0006 was then measured against that Level function. This ADR ratifies one of
them deliberately and settles the rest.

## What this ADR changes in earlier records

- **ADR-0006** is **extended, not amended**. Its decision 7 priority term,
  `2 × max(0, |Level(mentor) − Level(mentee)| − 2)`, only fires above a gap of 2 — so it needs
  **at least four Level bands to fire at all**, and below four it is dead code. Decision 3
  below ratifies the ten-band function it was actually measured against. Nothing in ADR-0006
  changes; what changes is that its precondition is written down instead of assumed.
- **ADR-0002** and **ADR-0007** are **extended, not amended**. Decision 5's unreviewed Match,
  decision 9's idle-period Prompt answer, and ADR-0007 decision 6's single transaction all
  stand verbatim. Decisions 1 and 2 below supply only the amounts they were silent on.
- **ADR-0008** is **extended, not amended**. Its read-time **Leaderboard** filter — "filtered
  from the result, never erased from the measure" — is reused unchanged for Admins in decision
  6, and its bar on an Admin editing XP, **Level**, Streak or **Badges** stands.

## The decisions

1. **A Match pays two line items, both inside the transaction that records the Review: 80 XP
   for the completed Match to each Student, and a further 40 to the Mentee for submitting the
   Review.** A Mentee banks 120 per Match, a Mentor 80.

   **Submitting the Review is the trigger for both line items, and it is the only trigger.**
   The first is named for what it pays *for* — the Match — never for a moment at which it
   fires, because there is no such moment: **no action in this model completes a Match, and
   none is to be added.** Anything downstream that reads this table as two events, or that
   builds a "mark complete" action for the first one to hang off, has misread it.

   `:217` names three earning events, but ADR-0002 decision 5 makes an unreviewed Match award
   nothing, and Completed *means* the Review landed — so "completing a weekly match" can never
   fire on its own. Reading the
   proposal's three events as three *line items* rather than three *moments* keeps all three
   literally true while collapsing them into one instant, which is the move ADR-0007 already
   made for a Prompt answer and its Post. This answers the ticket's question directly: a Review
   does not earn *separately* from completing a Match, it is what makes the Match pay at all —
   and it pays both Students, not just the one who wrote it.

   One consequence is recorded rather than discovered later: **a Mentor earns nothing, and
   breaks their Streak, when their Mentee never submits a Review.** That was already true under
   ADR-0002 decision 5; the table makes it visible.

   > **Streak consequence corrected 2026-09-22 before `/to-spec #1`.** “Breaks their Streak” above
   > is too broad. An unreviewed Match supplies no Match XP and no qualifying activity from that
   > Match for either Student; it does not itself reset either Streak. At Round close, ADR-0014 d7
   > asks whether the Student had **any** qualifying activity anywhere in the Round. An accepted
   > Prompt answer serialized into that Round therefore increments or preserves the Mentor's Streak
   > despite the unreviewed Match. The Streak resets only when the whole Round contains no qualifying
   > activity for that Student, subject to the existing Suspension/Removal freeze.

   > **Review lifecycle and retry contract clarified 2026-09-22 before `/to-spec #1`.** A Review
   > may commit only for an `ACCEPTED` Match, moving it to `COMPLETED`. ADR-0014's existing
   > `Match 1:0..1 Review` relation is a database uniqueness rule on `Review.match_id`: the Review,
   > its three parts, the Match status change, both XP line items and First Mentor evaluation are
   > one transaction. One duplicate or retried submission may win; every other attempt receives the
   > already-reviewed outcome and creates or awards nothing. A failed attempt rolls the whole unit
   > back and does not consume the one Review slot.
   >
   > Promotion to `ADMIN` does **not** cancel the Match ADR-0008 d2 leaves standing. The Mentee may
   > finish that already-created Match, including accepting it and submitting its Review, and a
   > valid Review pays the ordinary 80/120 XP and evaluates First Mentor for the pair even if either
   > Student now holds `ADMIN`; retained XP and BadgeAwards remain hidden by the Admin Leaderboard
   > filter. Role alone never freezes XP. Suspension or Removal is different: Review submission and
   > the administrative termination have one logical order. Review first means `COMPLETED` plus the
   > full atomic awards, which the later sanction preserves and freezes; sanction first means
   > `TERMINATED_BY_ADMIN`, so the Review is rejected and neither Student receives Match XP or Badge
   > progress. Reinstatement cannot revive that terminated Match.

   > **Admin history visibility corrected 2026-09-22 before `/to-spec #1`.** “Retained XP and
   > BadgeAwards remain hidden by the Admin Leaderboard filter” above overstates that filter. Only
   > the Admin's **Leaderboard row and personal-rank pin** are omitted. XP remains stored, continues
   > to derive Level, and remains available on the ordinary profile/history surfaces; permanent
   > BadgeAwards likewise remain available and render normally there. BadgeAwards are not a
   > Leaderboard field and promotion creates no Badge-specific visibility rule. Demotion merely makes
   > the retained XP rank-eligible again; it does not restore data that had been hidden or removed.

2. **A Prompt answer pays 20 XP**, in the transaction that creates the Post. That is 1:6
   against a Mentee's Match, and the ratio is deliberately the only governor.

   The two loops have very different ceilings. ADR-0006 step 7 marks both Students matched for
   the Round, so **the Match loop is hard-capped at one award per Student per Round**. ADR-0007
   refused scheduling and set no limit on how many Prompts an Admin may publish, so **the
   Prompt loop is capped only by the Admin's publishing rate**. At 1:6 an Admin would have to
   publish more than six Prompts in a single Round before the lighter loop outweighed the
   heavier one, which is an admin-discipline matter rather than a hole. No cap is invented, so
   ADR-0007's "no scheduling, no draft" stands untouched.

   > **Cross-path XP concurrency contract added 2026-09-22.** Successful XP-award transactions
   > affecting the same Student — Review and Prompt paths alike — must have outcomes equivalent to
   > one serial order. Every increment accumulates; none may overwrite another, and each Badge
   > threshold is evaluated against that same order. ADR-0014's existing unique
   > `(student_id, badge)` constraint remains the final arbiter if concurrent work reaches the same
   > Badge. `/to-spec #1` chooses the PostgreSQL transaction or locking mechanism; the required
   > result is no lost XP, no missed threshold award and no duplicate BadgeAward.

   > **BadgeAward conflict outcome corrected 2026-09-22 before `/to-spec #1`.** "Final arbiter"
   > above names a storage backstop, not permission to reject an otherwise valid earning event. If
   > two distinct valid transactions for the same Student both reach the same Badge, both underlying
   > Review or Prompt actions and both XP increments must eventually commit exactly once, exactly one
   > BadgeAward must exist, and the competing transaction must converge on that already-awarded state.
   > A uniqueness conflict may be resolved or retried internally, but it may not become a permanent
   > failure that cancels otherwise valid XP merely because the Badge now exists. Any aborted attempt
   > commits none of its event, XP or Badge changes, and a transparent retry must rely on the existing
   > Review/Prompt event constraints so it cannot pay that event twice. This remains one atomic earning
   > transaction with no award job, backfill or ledger; `/to-spec #1` chooses the PostgreSQL mechanism.

   > **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §10.4; M1, M4): every XP
   > path updates the Student row inside a `SERIALIZABLE` transaction, so paths paying one Student
   > serialize; a BadgeAward insert is `ON CONFLICT DO NOTHING`, and a contender that aborts is
   > re-run whole, finds the Badge and still commits its own event and XP.

   > **Noted 2026-09-24 before `/to-tickets`: the rule stands, and under that mechanism it never
   > fires** ([`docs/spec.md`](../spec.md) §10.4). No schedule puts two *valid* events for one Student
   > in flight against the same Badge:
   >
   > - First Mentor would need two `ACCEPTED` Matches with one Mentor at once.
   > - Consistent Learner is written only by the one Round close.
   > - Two Knowledge Sharer answers need a publication between their reads. That makes the older
   >   answer a serialization pivot, which is cancelled and then refused as superseded on retry
   >   (ADR-0007 d1).
   >
   > The conflict-safe insert stays as a backstop. ADR-0016 d1's ninth-category case is corrected to
   > assert the outcome that schedule actually has.

3. **`Level = min(10, 1 + floor(XP / 250))` — ten bands, the tenth terminal.** Promoted from
   prototype placeholder to decision, unchanged.

   Two reasons, and neither is that ten is a nice number. It is the **only Level function any
   measurement on this map has ever been taken against**: ADR-0006's weight-2 elbow and its
   measured 59% Level-gap compliance both assume it, so changing it re-opens a calibration that
   cost a prototype to establish. And the band count is not cosmetic — see the note on ADR-0006
   above. At the table in decisions 1 and 2 a band costs just over **two Matches as Mentee**
   (120 XP each) or just over **three as Mentor** (80), and Level 10 sits at **2250 XP** —
   roughly nineteen Matches as Mentee, twenty-eight as Mentor. The two figures differ because
   decision 1 pays the two sides differently; quoting one number for "a Match" hides that.

4. **Three Badges, each a numeric threshold tested inside the same transaction that awards the
   XP, and each awarded the first instant its test passes.**

   ⚠️ **Corrected by ADR-0014: Consistent Learner is the exception.** `Streak >= 3` is tested in
   the **Round-close** transaction rather than either XP transaction. The other two are tested on
   their respective XP-awarding paths — First Mentor on Review submission (decision 1), Knowledge
   Sharer on a Prompt answer (decision 2). Everything else in this decision stands; the note at
   the end has the reasoning.

   - **First Mentor** — `Matches completed as Mentor >= 1`. It also gives teaching the only
     public mark it has, which matters because decision 1 permanently ranks a Mentee above a
     Mentor at equal participation and decision 6 keeps **Mentor Reputation** off the board.
   - **Knowledge Sharer** — `Reflection Prompts answered >= 3`. Covers the second loop.
   - **Consistent Learner** — `Streak >= 3`. ⚠️ **Tested in the Round-close transaction, not on
     either XP path** — see the note at the end of this decision.

   > **Badge provenance clarified 2026-09-22 before `/to-spec #1`.** **Consistent Learner is a
   > project-authored name, not one of the proposal's six examples.** The proposal says “Badges
   > **such as**” before that list, so the names are illustrative rather than a closed vocabulary;
   > this decision reuses its First Mentor and Knowledge Sharer names and deliberately defines the
   > third. Consistent Learner turns the proposal's existing “one participation streak that counts
   > any qualifying weekly activity” into a permanent personal threshold spanning both product
   > loops. It is chosen instead of the named Longest Learning Streak because that is a global
   > superlative requiring ranking history, while `Streak >= 3` uses the already-stored MVP counter,
   > introduces no new state, and gives Streak its only product consumer. It is not presented as a
   > renamed proposal Badge or as implementation of the deferred full Badge set.

   **What makes "earns once … and never loses" structural is that the test is run once and its
   result is never re-examined — not that the quantity it reads can only rise.** The
   distinction matters for exactly one of the three: the first two count events and are
   genuinely monotonic, but **Streak is not.** It breaks when a Round passes without qualifying
   activity and ADR-0008 freezes it on Suspension, so a Student can hold Consistent Learner at
   a Streak of 0. That is correct and deliberate: the badge records that they *once* sustained
   three consecutive Rounds, which stays true afterwards no matter what the counter does. Write
   the condition as a threshold test at award time and the guarantee follows; write it as a
   property the Student currently satisfies and the badge becomes revocable, which `CONTEXT.md`
   forbids.

   This is the same preference for structure over enforcement as ADR-0007's derived liveness
   and ADR-0009's storage choice. Testing on the two existing write paths also keeps ADR-0001's
   promise not to turn any of this into a scheduled-job problem — nothing ever sweeps the
   Student table looking for conditions that have started or stopped holding — and Badges
   already have no setter under ADR-0008.

   > **Widened by ADR-0014 to three write paths.** **Streak** can only change when a **Round**
   > closes — that is the moment "this Round contained no activity" becomes knowable — so
   > **Consistent Learner is tested in the Round-close transaction**, not on either XP path. The
   > guarantee above is untouched: it is still a threshold tested once inside a real transaction
   > and never re-examined, still no scheduled job, and still no sweep looking for conditions that
   > have started holding. There are simply three such transactions rather than two.

   > **Suspension/Round-close boundary clarified 2026-09-22 before `/to-spec #1`.** Suspension or
   > Removal and Round close must have one logical order for the affected Student. If the sanction
   > is ordered first, the Round-close transaction skips that Student entirely: even qualifying
   > activity already recorded in the closing Round does not increment Streak and cannot award
   > Consistent Learner. The frozen Streak remains unchanged; the skipped Round is never carried
   > forward or backfilled, and a later reinstatement can reach the threshold only through a later
   > qualifying Round. If Round close is ordered first, it updates Streak and may award Consistent
   > Learner atomically; a later sanction preserves both. Role `ADMIN` alone does not trigger this
   > skip — ADR-0008 reserves the freeze for Suspension and Removal.

   **Consistent Learner is the only thing anywhere on this map that reads Streak.** Every other
   mention defines it, freezes it on Suspension, or protects it; nothing consumes it. Without
   this badge, Streak is a counter the platform maintains and never uses.

5. **Four of the proposal's six badges cannot be built in this model, and the reason is
   structural rather than a matter of effort.** `:227` offers First Mentor, Knowledge Sharer,
   Problem Solver, Top Mentor, Most Improved and Longest Learning Streak.

   **Top Mentor, Most Improved and Longest Learning Streak are superlatives**: each names a
   position that changes when somebody *else* acts. Holding one un-revoked would mean "was top
   at some past instant", which needs a record of past rankings — and ADR-0008 settled that XP
   is never a ledger, with nothing anywhere snapshotting state. There is simply no data to
   evaluate them against. The cleanest reading is that the proposal blurred two of its own
   lists: `:247` and `:251` name Most Improved and Longest Streak as **leaderboard categories**,
   and the badge line borrowed the language. **Problem Solver** needs Mission outcomes, and who
   authors a Mission is still an open question on this map.

   This is also the real reason the full badge set is Version 2: half of it is leaderboard
   language, and the rest waits on a decision that has not been taken.

   > **Answered by ADR-0012**, which is that decision arriving: a Mission has no author and no
   > outcome — it is one of six fixed meeting modes, assigned by the machine at Match creation
   > and read by nothing. **Problem Solver is therefore permanently out of scope rather than
   > pending.** All four unbuildable badges are now accounted for: three are superlatives with
   > no history to evaluate, and the fourth waited on this.

6. **One Leaderboard, by XP — global, all-time, top ten plus the viewer's own rank pinned when
   they fall outside it; ties break `XP DESC, Student id ASC`; Admins are filtered out.**

   XP over Mentor Reputation for the reasons in Considered options. The tie-break matters more
   than it looks: a fresh cohort has a long tail sitting at 0 XP, and an arbitrary order would
   reshuffle the bottom of the board on every read — so it follows ADR-0006 decision 9's
   precedent of the lower Student id winning. The Admin filter closes a live edge: ADR-0007 put
   **no eligibility gate on Prompt answers**, so an Admin who answers one earns XP, `CONTEXT.md`
   makes an Admin staff rather than a participant, and ADR-0004 seeds a bootstrap Admin who
   would otherwise rank against Students. It is the same read-time filter ADR-0008 already
   applies to Suspension and Removal, not a new mechanism. A **Peer Moderator** is a full
   participant and appears normally.

   > **Corrected 2026-09-21 after applying ADR-0008's role semantics to ADR-0007.** The Admin
   > filter stands, but “an Admin who answers one earns XP” does not: an `ADMIN` may not submit a
   > Prompt answer. The filter is still necessary because a Student promoted to Admin retains XP,
   > its derived Level, Streak, permanent BadgeAwards and earlier Posts. While the role is held,
   > the Prompt path creates no Post, pays no 20 XP, cannot move Level, supplies no Streak activity
   > and cannot advance or award Knowledge Sharer. Demotion restores eligibility and the retained
   > record becomes visible under the ordinary participant rules. ADR-0008's already-open Match
   > exception and ADR-0014's Round-close Streak rule remain unchanged.

   > **Visibility wording aligned 2026-09-22.** “The retained record becomes visible” above refers
   > only to the Student's XP-ranked Leaderboard row becoming eligible again. Their XP, derived Level,
   > BadgeAwards, Posts and other ordinary profile/history records were never role-hidden while they
   > held `ADMIN`; promotion changed participation and Leaderboard eligibility, not historical-record
   > visibility.

   > **Personal-rank pin clarified 2026-09-22.** The pin is computed only after applying the same
   > participant filter as the top ten. It is available only to an active `STUDENT` or
   > `PEER_MODERATOR`; it never reintroduces a viewer whose role is `ADMIN` or whose account is
   > Suspended or Removed. An Admin therefore receives no own-rank row, and Suspended/Removed
   > Students cannot authenticate and receive no pin even if the ranking query is reused elsewhere.
   > Demotion or reinstatement restores the ordinary pin from retained XP; Removal never does.

7. **The two unmet module bullets are owned here rather than left to a slice.** The
   acceptance-criteria research flagged both as not in shipped scope, and no ticket had picked
   them up — which meant the point the module-claim decision banked was not actually firm.

   **Visual feedback (`:854`)** is an XP progress bar toward the next Level on the profile, an
   earn panel on the two confirmation screens that already exist — Review submitted, Prompt
   answered — and the Badge shown at the moment it is earned. All of it is in-transaction, on
   the screen where the act happened: no delivery, no inbox, nothing that re-opens the
   notification system the module-claim decision refused. The bullet's own parenthetical offers
   "progress bars" as an alternative to notifications, so this satisfies it on its own terms.

   > **Consistent Learner feedback corrected 2026-09-22.** “On the screen where the act happened”
   > applies to First Mentor and Knowledge Sharer, not to a Badge awarded by an Admin's Round-close
   > action. The existing profile progress surface also lists earned Badges. While that profile is
   > open, ADR-0014's existing content-free `round:closed` event triggers an authenticated refresh of
   > the viewer's own progress, so Consistent Learner appears as soon as its transaction commits.
   > The socket carries no Badge or privileged data, and there is no new event, toast, delivery,
   > inbox, unread flag or “seen” state. A Student who is offline or not viewing the profile sees the
   > durable Badge on the next profile visit; the platform does not backfill an earn alert. The two
   > existing confirmation-screen earn panels are unchanged.

   **Clear rules and progression mechanics (`:856`)** is one static route listing the XP table,
   the Level bands and every Badge condition. No queries, no data. It doubles as the defense
   script for "clear rules".

## Considered options

**Mentor Reputation as the one Leaderboard** (rejected, decision 6). It is the proposal's "Best
Mentor" category and the natural counterweight to a table that pays a Mentee more than a Mentor.
Rejected on four counts. It **has no formula anywhere on this map**, so choosing it would have
silently folded a second, unowned decision into this one. Its source rating is *optional* at
`:173`. It publishes a ranking derived from what `CONTEXT.md` defines as "visible only to that
Mentor and to Admins" — near-identifying at a seed of ~30 Students, where a Mentor may have had
exactly one Mentee and their rank leaks what that Mentee said privately. And it can only rank
Students who have mentored, excluding everyone who has so far only learned or only answered
Prompts. XP is fed by both loops, is public by construction, and is fully defined by this ADR.

**`100 / +50 / 25`** (rejected, decisions 1 and 2). Identical ratios, rounder against the 250
band, and slightly faster progression. Rejected only to keep the one committed primary source on
this map — `prototypes/compatibility-score/` — agreeing with the spec, which costs nothing.

**A smaller named set of Level bands** (rejected, decision 3), five from Novice to Master or
similar. Better product copy, and the tie-break would still fire at gaps of 3 and 4. Rejected
because it invalidates ADR-0006's measured numbers to buy names. **Three bands would be worse
than a re-calibration**: the maximum gap becomes 2, the priority term never fires, and ADR-0006
decision 7 would be dead code that still reads as a live rule.

**A per-Round cap on Prompt XP** (rejected, decision 2). The obvious guard against an Admin
flooding the pool. Rejected because ADR-0007 deliberately left publishing unscheduled and
uncapped, the 1:6 ratio already governs, and a cap is a mechanism with its own edges — what
happens to the seventh answer, and does it still count for Knowledge Sharer.

**Claiming Badges as both "achievements" and "badges"** (rejected, decision 4). `:850`'s list is
closed and shipped scope meets it with exactly three — XP/level system, badges, leaderboards —
with no slack. Counting one implementation twice would buy a fourth on paper and read as
double-counting at defense. The claimed list is locked at 18 against a threshold of 14, so losing
this point costs one point and nothing else; buying it dishonestly costs credibility on the rest.

**A fourth Badge for the Mentee's first Match** (rejected, decision 4). Symmetric with First
Mentor and tempting for that reason. Rejected because the proposal has no name for it, so it
would be a second invented name, and `:860`-`:865` explicitly prefers three well-implemented
features to six thin ones. The Mentee already gets the larger XP award and the progress bar.

## Consequences

- **`CONTEXT.md` sharpens Level, Badge and Leaderboard.** Level gains its ten bands and the
  terminal tenth; Badge gains "a threshold reached, never a position held", which is what rules
  the superlatives out; Leaderboard gains that only participants are ranked. **XP and Streak
  need no change** — amounts are not glossary content.
- **Mentor Reputation is now the only shipped glossary term with no rule behind it.** Pricing it
  as a Leaderboard measure found that nothing on this map says how it is computed, nor whether
  Private Feedback carries a rating in MVP at all. It has its own ticket.

  > **Settled by ADR-0013, and the claim above no longer holds. Mentor Reputation remains
  > defined in the glossary as a Version 2 concept; it has no shipped aggregate score or
  > computation in MVP.** The rating ships — optional, 1 to 5, a component of Private Feedback —
  > and the score does not, going to Version 2 with the per-skill endorsements `:209` calls "a
  > more detailed view of the same number". **No aggregate is ever taken over the ratings**; a
  > Mentor reads the individual feedback on a private route instead. **The glossary keeps the
  > term rather than deleting it**, because three live ADR-0008 rules name it — so what changed
  > is that the term has a stated scope, not that it acquired a formula. Decision 6 above is
  > strengthened rather than revisited: three of its four counts stand verbatim, and "no formula
  > anywhere on this map" is now a deliberate absence, not a gap.
- **The seed cannot produce Badges or Streaks by setting XP.** XP is a plain column under
  ADR-0008, so seeding Levels and a populated Leaderboard is one write — but Badges are awarded
  inside the two XP transactions and Streak is derived from Rounds containing activity. Seeded
  Students would otherwise show as Level 8 with no badges and a Streak of 0. Either the seed
  fabricates Match, Review and Post history, or it writes Badge rows directly. This is a demo
  strategy input, not a decision this ADR takes.

  > **Taken by ADR-0017: the seed fabricates, by driving the real write paths.** It runs the
  > matcher, submits Reviews and closes Rounds through the same functions the application uses, so
  > every Badge and Streak in the demo is awarded by the transactions decision 4 and ADR-0014 d7
  > define rather than by a second implementation in the seed. **The warning above is what decided
  > it.** One consequence follows and is accepted there: four seeded Rounds pay at most 480 XP, so
  > demo Levels run **1 to 3** and ADR-0006 d7's Level tie-break never fires on stage — harmless,
  > since that term is internal and never displayed.
- **At Level 10 the progress bar is full permanently.** The cap is what bounds the matching
  tie-break, so the dead zone is the price of decision 3 rather than a defect — but the rules
  surface must say the cap exists rather than ship a bar that never moves again.
- **A Prompt answered during an idle period counts toward Knowledge Sharer but not toward
  Consistent Learner.** ADR-0002 decision 9 gives it XP and not Streak; this needs no new rule,
  the same way ADR-0007 found Streak needed none.
- **Gamification has no slack.** Exactly three of the six enumerated mechanics, and decision 7's
  two surfaces are now load-bearing for the point rather than polish.
- **The entity map gains the XP table as an input.** XP is a column on Student, Badge is an
  awarded row per Student, and both Badge evaluation and the XP write sit on the Review-submit
  and Prompt-answer paths — which bears on the "one entity or three?" question still open there.

  > **Answered by ADR-0014 decision 1: three parts, three homes**, one per readership — the
  > Learning Outcome on `Review`, `PrivateFeedback` in its own table, and the Public Takeaway as
  > the `body` of its `Post`. ADR-0014 decision 7 also made **Streak** a stored column recomputed
  > at Round close, since a derived Streak cannot honour ADR-0008's freeze.
