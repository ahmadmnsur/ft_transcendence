# Learning Analytics ships, as a scoped pull-forward — and the rule that stops it becoming a precedent

The claimed **user activity analytics** Minor (`document/en.subject.md:642`) is a single bullet with
no sub-bullets: *"User activity analytics and insights dashboard."* Settling what it displays turned
up a contradiction the map had been carrying unnoticed.

**The map rules this surface out of scope.** Its Out of scope section lists "everything marked
Version 2 or Future in the proposal — … the Learning Progress view, **Admin Learning Analytics**,
2FA", and the proposal's Learning Analytics subsection, marked *(Version 2)*, is almost exactly the
module's content: *"the most requested skills to learn, the most available skills to teach, the
resulting supply/demand gaps, the overall match completion rate, and where in the status flow
(Section 5) matches most often stall."* The module-claim decision banked a point for a surface the
same map excludes, and it went unnoticed because the subject calls it *user activity analytics*
while the proposal calls it *Learning Analytics*.

The obvious escape does not hold. Section 13's *unmarked* bullets include "View basic participation
and engagement statistics", which looks like MVP — but **ADR-0013 already ruled that Section 15, the
actual MVP list, wins**, and Section 15 says the admin dashboard covers "matching, prompts, and
moderation". No statistics. This is a genuine Version 2 pull-forward, not a bullet already owned.

The shape we chose: **ship it, because dropping it breaks the contingency policy the module list was
built around — and close the precedent with a test, so that pulling one V2 section forward does not
license pulling any other.**

## What this ADR changes in earlier records

- **The map's Out of scope section is amended for exactly one entry.** **Admin Learning Analytics**
  moves from excluded to shipped, joining **42 OAuth** and the **minimal badge set plus one
  Leaderboard** as the third deliberate pull-forward. **Every other excluded surface stays out**:
  fair mentor rotation, availability matching, the notification system, prompt categories, per-skill
  endorsements, the **Learning Progress** view, 2FA, and the **Mentor Reputation** score ADR-0013
  added to it. Decision 10 states the test that distinguishes the **Version 2** items among them —
  fair mentor rotation is an MVP cut rather than a Version 2 item, so that test does not reach it.
- **Nothing else moves.** This ADR adds no entity, amends no other ADR, and takes no decision back.
  ADR-0003 decision 9, ADR-0008 decisions 3 and 6, ADR-0010 and ADR-0014 are all load-bearing here
  and all stand exactly as written.

## The decisions

1. **Learning Analytics ships, as a deliberate third Version 2 pull-forward.**

   Dropping the point is clean, honest and cheap — 17 points against a threshold of 14 — and it is
   the wrong call, because **it silently breaks the target policy the module list was locked
   around**. The module-claim decision set that policy as *"survive two majors failing"*, and the
   arithmetic is exact: **18 − 4 = 14, the threshold itself.** At 17 the same two failures land on
   **13**, below it. One Minor whose single point looks discretionary is in fact the entire margin
   of the contingency plan.

   The cost argument has also changed since the point was claimed. ADR-0014 fixed the entity set, and
   every figure below is a query over tables that already exist: **no new entity, no new storage, no
   new role, one new route.**

2. **All five of the proposal's Learning Analytics figures ship. The fifth is explicitly narrowed
   to current open-Round state and closed-Round outcomes, because no status-transition history
   exists — and the depth around them is deliberately reduced.** Most-requested Skills to learn;
   most-available Skills to teach; the supply/demand gap; overall Match completion rate; and where
   in the status flow Matches stall, which becomes **where Matches stand now and how past ones
   ended**, never where they spent longest.

   Five queries over ADR-0014's schema — dropping any makes the surface thinner without making it
   meaningfully cheaper. What is reduced is everything *around* them: no workshop-planning tooling,
   no custom date ranges, no export, and no per-Student drill-down, the Users table (ADR-0008 d11)
   already being that.

   **Each figure is defined here rather than left to a slice**, because every one of them has a
   plausible second reading and a dashboard whose numbers cannot be explained on the day is worse
   than no dashboard:

   | Figure | Definition |
   | --- | --- |
   | **Demand** for a Skill | count of `StudentSkill` rows with `kind = LEARN` |
   | **Supply** for a Skill | count of `StudentSkill` rows with `kind = TEACH` |
   | **Gap** | `Demand − Supply`; positive is unmet need, and the list is sorted by it descending |
   | **Match completion rate** | `COMPLETED ÷ all Matches created in closed Rounds × 100` |
   | **Match state and outcomes** (the proposal's *"where matches stall"*) | open Round: the current distribution over the non-terminal states. Closed Rounds: the final outcome distribution |

   **Demand and Supply count candidate-pool Students only** — Skill listed *and* role is not `ADMIN`
   *and* neither Suspended nor Removed, which is ADR-0002 decision 4 as narrowed by ADR-0008 decision
   2. Counting the whole table instead would report demand from people who can never be matched, so
   the gap would name needs that do not exist.

   > **Output shape pinned 2026-09-23 before `/to-spec #1`.** The proposal names *most requested*
   > and *most available* as figures of their own, so Demand and Supply are shown in their own
   > right, not only through the gap.
   >
   > - **Every Skill whose Demand or Supply is above zero appears, and no top-N applies.** The
   >   catalogue is fixed — seeded and extended only by migration (ADR-0014 d3), twenty-seven Skills
   >   in the demo (ADR-0017 d8) — so the full list is already bounded, and no record supports a
   >   cut-off. A Skill at zero on both says nothing and appears nowhere.
   > - ***Most requested*** is the Skills with `Demand > 0` by Demand descending; ***most
   >   available*** the Skills with `Supply > 0` by Supply descending; **the gap list** every
   >   appearing Skill by Gap descending, with its Demand and Supply beside it. A Skill only wanted
   >   therefore heads the gap list, and one only offered sits at its foot with a negative Gap.
   > - **Ties break on `Skill.name` ascending** in all three, the name being unique (ADR-0014 d3).
   > - **Decision 3's sentence renders each positive-Gap row**, in gap order; its stronger form
   >   lists every Skill meeting its predicate, in the same order.

   **The completion rate's denominator is closed Rounds, not all Rounds, and this is not a detail.**
   Matches in the open Round have not had their chance yet: include them and the rate falls every
   time a Round opens and climbs as it closes, with nothing about anyone's behaviour having changed.
   That swing would happen *during the defense*, since the demo runs several Rounds inside the slot.
   Over closed Rounds the figure is also final, because ADR-0002 decision 5 makes every Match in a
   closed Round terminal. Declines and administrative terminations stay in the denominator: it is an
   *overall* rate, and the outcome distribution beside it already shows the composition.

   > **Series and empty denominator pinned 2026-09-23 before `/to-spec #1`.** Decision 7's *"rate
   > over time"* and decision 4's Round-indexed series are this formula applied to **one closed
   > Round at a time** — `COMPLETED ÷ Matches created in that Round × 100`, one point per closed
   > Round in opening order. The overall figure stays the headline, and the closed-Round outcome
   > distribution counts exactly the Matches in its denominator, which is the composition the
   > sentence above means.
   >
   > **A closed Round can legally hold no Match**: ADR-0002 makes a Round opened with fewer than two
   > candidates legal, *"no special case, no guard"*, and an Admin closes it like any other. Its
   > point has nothing to divide, and neither has the headline until some closed Round holds a
   > Match. **Either rate is then absent — no number is shown, never 0% or 100%** — on the
   > convention the Compatibility Score already set for a number that cannot be honest: a
   > hand-made Match carries no Score (ADR-0006 d10), since there is *"no honest number and none is
   > shown"* (`CONTEXT.md`). The empty Round keeps its place on the Round axis, without a point.

   ⚠️ **"Where matches stall" cannot be a historical claim, because no status-transition history
   exists.** ADR-0014 gave `Match` a single `status` column and no transition log, so *"matches spend
   longest at X"* and *"matches most often stall at X"* — the proposal's own phrasing at Section 13 —
   are not answerable and must not be implied by a label. What is answerable is stated in the table
   above: where Matches are stuck **right now** in the open Round, and how Matches **ended** in the
   closed ones. Label both for what they are.

   > **Qualified 2026-09-23 before `/to-spec #1` — no transition *log* exists, but some transition
   > times do.** ADR-0014 d2 carries `mentor_accepted_at` and `mentee_accepted_at`, and Rounds and
   > Reviews carry their own times, so when a Match was accepted is recorded and a partial path
   > through `MATCHED` and `ACCEPTED` could be pieced together. A decline or an administrative
   > termination records no time, so no complete per-status dwell time can be. **The figure does not
   > widen**: both halves count `status` alone and read no acceptance timestamp, and no label, axis
   > or tooltip claims time spent in `MATCHED` or `ACCEPTED`, or a path through them. That is
   > decision 10's *"only to the depth the module requires"*, and the same restraint decision 6
   > shows towards a ledger it could reconstruct.

   **"Where matches stall" needs no translation table, and that is not an accident.** ADR-0014 took
   three of its six status names verbatim from `42_PeerConnect_Concept_Proposal-6.md:131`'s flow —
   `MATCHED`, `ACCEPTED`, `COMPLETED` — and `DECLINED` from the same section's prose (`:127`,
   `:267`). Only `LAPSED` and `TERMINATED_BY_ADMIN` are ours, and they exist because Section 5's
   happy path never enumerated the two ways a Match ends badly; Section 5's own *Meeting Scheduled*
   and *Review Submitted* are absent for the reasons ADR-0014 records. **The six and the five are
   therefore not the same list** — but a Match can only *stall* in a non-terminal state, and there
   are exactly two of those, `MATCHED` and `ACCEPTED`, both of them the proposal's own words. So the
   report reads against Section 5 precisely where stalling happens, which is the only place this
   figure looks.

3. **The insight is the supply/demand gap, rendered as a sentence rather than a number.** *"9
   Students want to learn Rust; nobody lists it as a Skill they can teach."*

   **"Insight" is the word this module fails on, not "analytics"** — the acceptance-criteria research
   is explicit that an evaluator anchored on IV.8's *Major* dashboard (`:911`) expects more than a
   table. A sentence naming a Skill and a number is actionable, and it is precisely what
   `42_PeerConnect_Concept_Proposal-6.md:287` says the view exists for: turning interactions into
   "visibility into what the community actually wants to learn, which can directly inform workshops".

   **`MatchSkillCoverage` supports a second, stronger form that nothing else in the model could
   answer**: Skills that are wanted, *are* offered by someone, and have nevertheless **never been
   covered by an actual Match** — `Demand > 0` and `Supply > 0` and no `MatchSkillCoverage` row
   names that Skill. That is a different and more interesting claim than "nobody teaches it" — it
   says the matcher is not reaching a need that exists. ADR-0014 decision 9 kept the
   explanation state as rows rather than prose partly on this argument; this is that bet paying out.

   > **Given a construction by ADR-0017, and the obvious one does not work.** Reaching for a
   > **suspended** Student's `TEACH` row fails on **decision 2 above**: Supply counts the candidate
   > pool only, so a suspended Student contributes nothing to it and the case collapses into the
   > plain gap. What works is a **Block** — seed one Skill with exactly one active `TEACH` and one
   > active `LEARN`, and block that pair. ADR-0006 step 2 rejects blocked pairs in either direction
   > and ADR-0006 d10 binds an Admin's hand too, so `Demand = 1`, `Supply = 1`, and no
   > `MatchSkillCoverage` row can ever name it.
   >
   > ⚠️ **Qualified 2026-09-20: "can ever" is a rule, not a constraint.** ADR-0006 d10 does bind an
   > Admin — the Block is absent from the closed list of what a hand-made Match is exempt from — but
   > **ADR-0014 d13 does not put it in the schema**, and an Admin's hand-made Match does not run the
   > matcher that enforces it. ADR-0017's seed creates **two Admin repairs**, so this construction
   > survives only while that path checks Blocks. Tracked as a seed acceptance condition on
   > [#27](https://github.com/ahmadmnsur/ft_transcendence/issues/27): *"the seeded blocked pair must
   > remain unmatched after all Admin repair paths."* The gap definition above is unchanged.
   >
   > **Tightened 2026-09-23 by ADR-0017 d8.** *"Exactly one active"* leaves a hole: Demand and Supply
   > count active candidates, but coverage records every Match ever made, including one by a
   > Student sanctioned afterwards. So no other seeded Student lists the gap Skill at all, and the seed
   > asserts this decision's predicate — no coverage row names it — when it finishes.

4. **Any historical time series in this surface is indexed by Round, never by date.** ADR-0001
   established that a **Round** is explicitly not a calendar week, and ADR-0002 made Rounds
   admin-triggered at arbitrary intervals.

   A date axis is not merely less apt, it is actively misleading in the one setting that decides the
   grade: **several Rounds are run inside a single defense slot, so a date axis renders the entire
   demonstration as a vertical line at one point in time.** Round order also makes periods comparable
   to each other, which arbitrary intervals cannot.

   **Not every figure here is a series.** Current stock measures — **Demand**, **Supply**, the gap
   derived from them, and the open-Round state distribution — remain **point-in-time snapshots**,
   and are not presented as historical series because the model stores no state snapshots
   (decision 5). Round indexing governs the figures that genuinely run over time; it is not a claim
   that every number on the dashboard has a history behind it.

5. **Nothing is stored.** No snapshot table, no aggregates table, no materialised view. This
   follows the map's existing pattern of deriving read-time groupings rather than storing them:
   derived *unmatched* (ADR-0002), derived Prompt liveness (ADR-0007), the report queue's read-time
   grouping (ADR-0011), and ADR-0014's refusals of a candidate-pool table and a `Conversation`.

   **The model has timestamped event flows but does not preserve historical snapshots of state.**
   Matches created, Reviews submitted, Posts created and Badges awarded all carry timestamps;
   **XP**, **Level** and **Streak** exist only as today's value, because ADR-0008 decision 6 left no
   ledger and nothing snapshots state.

6. **The XP ledger ADR-0008 refused to store is exactly reconstructible as a query — and we do not
   build it.**

   Recorded because it is not obvious and because someone will eventually propose storing one. A
   Student's XP at any past instant is `80 × (completed Matches with a Review submitted by then) + 40
   × (Reviews they submitted by then) + 20 × (Prompt-origin Posts they created by then)`, because
   ADR-0010 decision 1 made XP a pure function of two timestamped events and closed the table. **It
   is exact only because Posts are soft-deleted and ADR-0011 decision 10 does not revoke XP on
   removal** — a hard delete would make the reconstruction silently undercount. ADR-0008's soft
   delete paying a dividend nobody predicted when choosing it.

   It is not built because **XP is a linear function of the three event counts already being
   charted**, so an XP-growth line would plot the same information twice. The next person who wants
   XP history should reach for this query, not for a schema change.

   > **Corrected 2026-09-20 — "already being charted" is false; decision 2 is what falsifies it.**
   > The sentence should read: **"It is not built because XP is exactly reconstructible from
   > timestamped Match/Review and Prompt-origin Post events already present in the model, while an
   > XP-growth line would add a derivative view rather than a new community-level insight."**
   >
   > Decision 2's five figures are **Demand, Supply, the gap, the completion rate, and Match state
   > and outcomes**. **None of them charts a count of completed Matches, Reviews submitted or
   > Prompt-origin Posts**, so "plot the same information twice" overstated the case — those events
   > are *present in the model* and carry timestamps (decision 5), which is not the same as being
   > on the dashboard. The conclusion is unchanged and if anything better supported: XP is
   > **per-Student**, and decision 9 makes this surface report on the community and never on an
   > individual Student.

7. **Recharts is added as the charting dependency.** The locked stack carries no
   charting library, so this is a stack addition rather than a slice's choice. The module is graded
   on the word *dashboard*, and hand-rolling a funnel, two bar charts and a rate over time costs more
   than the dependency it avoids.

   > **Clarified 2026-09-23 before `/to-spec #1` — "funnel" names decision 2's Match state and
   > outcomes figure, and it is not drawn as a conversion funnel.** A funnel encodes how many items
   > *passed through* each stage. This figure counts Matches by the one status each holds now or
   > ended in: `MATCHED` and `ACCEPTED` are disjoint current counts, not one population narrowing,
   > and the terminal counts do not say which state a Match left. A funnel shape would therefore
   > assert the path decision 2's qualification refuses to read. The same holds for *"the funnel"*
   > twice in Considered options. The chart form is otherwise the slice's to choose; the figure is
   > decision 2's table.

8. **Real-time updates ship; export does not.** Neither is a bullet this Minor inherits, and an
   evaluator anchored on `:911` will look for both.

   **Real-time is free.** ADR-0014 decision 8 already created a global `rounds` room carrying
   `round:closed`, so the dashboard re-queries on that event: an Admin closes a Round in one window
   and the analytics move in another. **No privileged data crosses the socket** — the event is
   outbound and content-free, and the refresh is an ordinary authenticated HTTP request carrying the
   role check, so **ADR-0003 decision 9 stands untouched** exactly as ADR-0014 decision 8 framed it.

   > **Narrowed 2026-09-23 before `/to-spec #1` — "real-time" means a re-query at each Round
   > boundary, not a live feed of every figure.** The claim above was broader than its mechanism.
   > The dashboard re-queries on **both** of the `rounds` room's existing events, `round:opened` and
   > `round:closed`, using each only as an invalidation signal and reading nothing from its payload.
   > Each must be emitted only after the transaction it announces commits, or the re-query reads
   > the state from before it.
   >
   > - **`round:closed` covers every closed-Round figure completely**: the completion rate, its
   >   per-Round series and the outcome distribution. They can change at no other moment, since
   >   ADR-0002 d5 makes every Match in a closed Round terminal and d7 lets no Match commit into one.
   > - **`round:opened` covers the open-Round distribution and Skill coverage at the moment both
   >   jump**, a Round opening with all its Matches at once (ADR-0002 d3). Without it, a dashboard
   >   left open across ADR-0017's close-then-open stage flow reads *no open Round* while one is open.
   > - **Between those events, Demand, Supply, the gap and the open-Round distribution are as of
   >   the last load** and refresh on reload. Skill edits, role and sanction changes, accepts,
   >   declines, Reviews, administrative terminations and hand-made Matches all move them, none is
   >   broadcast, and **none gains an event**: the argument above was that real-time is *free*,
   >   and an event per mutation is not.
   >
   > No new event, room or payload. ADR-0003 d9 and ADR-0014 d8 are unchanged, and the refresh
   > remains ordinary authenticated HTTP carrying the role check.

   > **Noted 2026-11-03 (ADR-0021 decision 5).** Accepts, declines and Reviews now send
   > `match:changed`, but only to the Match's two Students. The dashboard does not hear it, so the
   > paragraph above holds: those changes still show as of the last load.

   **Export is refused** on this map's standing habit of not paying for absolutes it does not owe.
   Export answers "can I take the data away", which neither source asks; charts and a derived insight
   answer the question actually being graded.

9. **`/admin/analytics`, Admin only — and the separate route is the answer to double-duty.** The
   research names the real risk directly: the operational admin tables already exist, so an evaluator
   may see one dashboard claimed for two modules. A distinct route beside `/admin/users`,
   `/admin/rounds` and `/admin/reports` makes two surfaces visibly two. **A Peer Moderator is
   excluded** by ADR-0008 decision 3, which scopes that role to the Post-report queue and Remove Post
   and nothing else. **There is no Student-facing view**, the per-Student **Learning Progress** view
   at `:233` being Version 2 and staying there.

   **Learning Analytics reports on the community and never on an individual Student.** That is the
   line separating it from Learning Progress (per-Student, Version 2) and from the Users table
   (per-Student, operational) — and it is why it needs no new permission: every figure is an
   aggregate over people the Admin can already read one by one.

10. **The precedent is closed by a test: a Version 2 section is pulled into MVP only when a claimed
    module requires it, and only to the depth that module requires.**

    This is the whole reason decision 1 is safe. Without the test, "Learning Analytics ships" reads
    as "Version 2 is negotiable", and every future slice acquires an argument for pulling something
    forward.

    All three exceptions pass it and are the only three: **42 OAuth** backs the OAuth 2.0 Minor;
    **the minimal badge set and one Leaderboard** back the Gamification Minor; **Learning Analytics**
    backs the user activity analytics Minor. **Nothing else on the Version 2 list backs a claimed
    module**, and the check is mechanical rather than a matter of judgement.

    **Every row below sits on the proposal's own Version 2 list** — six tagged *(Version 2)* in
    the text, plus **Mentor Reputation**, which ADR-0013 decision 3 placed there on the proposal's
    own grouping of it with the per-skill endorsements at `:209` and `:336`. **An MVP cut and an
    untagged feature are not candidates for this test at all**: it governs pulling Version 2 work
    *in*, and says nothing about cutting MVP work *out*. That distinction is what the correction
    beneath the table turns on.

    | Version 2 item | Claimed module requiring it |
    | --- | --- |
    | Availability matching | none |
    | Notification system | **the module was refused outright** by the module-claim decision |
    | Prompt categories | none — ADR-0007 d3 refused scheduling |
    | Per-skill endorsements | none — ADR-0013 d3 keeps them with the reputation score |
    | Learning Progress view | none — Gamification is satisfied by ADR-0010 |
    | 2FA | none — 2FA is not on the claimed list |
    | Mentor Reputation score | none — ADR-0013 d3 |

    > **Corrected 2026-09-19 by the ticket-to-record audit: fair mentor rotation was a row in
    > this table and is not a Version 2 item at all.** The proposal tags it **_(MVP)_** outright at
    > `42_PeerConnect_Concept_Proposal-6.md:111`, and Section 15 — the MVP list this map has twice
    > ruled authoritative, by ADR-0013 and again in the preamble above — names it at `:297`. It is
    > therefore **an MVP feature this map cut**, not a Version 2 feature it declined to pull
    > forward, and **decision 10 does not reach it**: this test governs pulling V2 work *in* and
    > says nothing about cutting MVP work *out*. **The cut stands and was always argued on its
    > merits** — see ADR-0006 decision 8 and its Considered options, now corrected to say so. What
    > was wrong was the label, and it mattered here more than anywhere: this table is the one place
    > the map claims its Version 2 list is mechanical rather than re-argued each time, so a row
    > that was never on that list undercut exactly the property the table exists to demonstrate.
    >
    > **Network freshness (`:109`) and "balance experience or skill levels" (`:105`, `:297`) carry
    > no version tag either**, and the map mislabelled both the same way; corrected there rather
    > than here, since neither was ever a row in this table. **Availability matching is genuinely
    > Version 2** (`:119`, `:330`), so every remaining row stands unchanged.

    The second half of the test matters as much as the first: **only to the depth the module
    requires.** Decision 2's reduced scope is that clause doing its work, and it is the same move
    ADR-0010 made in shipping three Badges against the proposal's six.

## Considered options

**Dropping the module and banking 17** (rejected, decision 1). The honest-looking option, and the
one to take if the arithmetic were different. It fails on the contingency policy alone: two majors
failing lands on 13 against a threshold of 14, which converts a plan built to survive setbacks into
one that does not.

**Arguing Section 13's unmarked bullets make statistics MVP already** (rejected). It would have
avoided amending anything, and it contradicts ADR-0013's ruling that Section 15 is the MVP list —
a precedent set three tickets ago and not worth breaking for the convenience of not writing this
ADR down.

**Shipping a subset — the gap and the funnel only** (rejected, decision 2). Barely cheaper, since
the other three are one query each, and it weakens the surface against precisely the evaluator this
module is exposed to.

**A stored aggregates or snapshot table, to make trends cheap** (rejected, decision 5). It is what
an analytics feature normally wants, and this model does not need it at demo scale — and it would
depart from the map's consistent pattern of deriving these groupings rather than storing them, the
pattern decision 5 lists. ADR-0014 puts it plainly: reintroducing one is *"reversing a decision, not
adding a feature."*

**Reconstructing and charting XP history** (rejected, decision 6). Genuinely available and exactly
correct, and redundant against the event counts already charted. *(**Corrected 2026-09-20**: those
event counts are **present in the model**, not charted — see decision 6's annotation. The rejection
stands; XP history is a derivative per-Student view, and this surface is community-level.)*

**Hand-rolled Tailwind and SVG charts, keeping the stack closed** (rejected, decision 7). Viable —
bar charts carry four of the five figures — and it loses on the funnel, where a line chart is the
natural form and the hand-rolled version costs more than the dependency.

**A CSV export as a cheap hedge against an IV.8-anchored evaluator** (rejected, decision 8). Around
twenty lines, and it answers a question neither source asks while inviting the reading that IV.8 is
being claimed.

## Consequences

- **The claimed list is firm at 18 with its contingency policy intact.** The point that made the
  difference was the one that looked most discretionary on the board.
- **The map's Out of scope section is now amended rather than absolute**, which is a change in kind
  and the reason decision 10 exists. Any future proposal to pull a Version 2 item forward is tested
  against the table there, not argued afresh.
- **Recharts is added as the charting dependency**, and `CONTRIBUTING.md`'s schema gate is
  untouched, this being a frontend package rather than a schema change.

  > **No longer the only addition since charting.** **ADR-0016 adds Vitest**, on the same footing
  > and for the same reason: the locked stack carried no test runner, so it is a stack decision
  > rather than a slice's choice. Two additions, both through the map — which is the rule worth
  > preserving, not the count.
- **The seed must span several Rounds, not merely contain history.** The demo-strategy fog already
  required fabricated Match, Review and Post history for Badges and Streak; a Round-indexed time
  series over a single Round is one point, so the same fixture now has a second reason to cover
  multiple Rounds, and the supply/demand gap needs at least one Skill deliberately left untaught to
  have anything to say.
- **`CONTEXT.md` gains Learning Analytics** — a read surface rather than an entity, on the precedent
  of **Leaderboard**, because the rule that it never reports on an individual Student is what keeps
  it distinct from Learning Progress and from the Users table.
- **No ticket is unblocked and none is surfaced by this decision.**

  > **The "last unmet module bullet" claim originally written here was wrong, and a
  > ticket-to-record audit on 2026-09-19 found it.** ADR-0004's module-claim amendment ends with a
  > **"Not settled by this amendment"** section holding three open questions about **42 OAuth** —
  > also a claimed module — that no ticket had ever picked up. They are now
  > [Settle how a 42 identity maps to a Student](https://github.com/ahmadmnsur/ft_transcendence/issues/24).
  > The lesson generalises past this ADR: **"no ticket owns it" is not visible from the module list,
  > only from reading each record's own open-questions section**, which is why the audit found in one
  > pass what three tickets had missed.
  >
  > > **Answered 2026-10-08, noted 2026-10-12.**
  > > [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93) settled the questions that ticket held:
  > > NestJS runs Sign in with 42 and finds a Student by 42's account `id` (ADR-0004's note under
  > > *Not settled by this amendment*). [Settle how a 42 identity maps to a Student](https://github.com/ahmadmnsur/ft_transcendence/issues/24) closed on 2026-10-12.
