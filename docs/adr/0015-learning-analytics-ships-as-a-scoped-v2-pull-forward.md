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
  Leaderboard** as the third deliberate pull-forward. **Every other item on that list stays out**:
  fair mentor rotation, availability matching, the notification system, prompt categories, per-skill
  endorsements, the **Learning Progress** view, 2FA, and the **Mentor Reputation** score ADR-0013
  added to it. Decision 10 states the test that distinguishes them.
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

2. **All five of the proposal's Learning Analytics figures ship, and the depth around them is
   deliberately reduced.** Most-requested Skills to learn; most-available Skills to teach; the
   supply/demand gap; overall Match completion rate; where in the status flow Matches stall — the
   last of which the model can only answer in a narrower form, below.

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

   **The completion rate's denominator is closed Rounds, not all Rounds, and this is not a detail.**
   Matches in the open Round have not had their chance yet: include them and the rate falls every
   time a Round opens and climbs as it closes, with nothing about anyone's behaviour having changed.
   That swing would happen *during the defense*, since the demo runs several Rounds inside the slot.
   Over closed Rounds the figure is also final, because ADR-0002 decision 5 makes every Match in a
   closed Round terminal. Declines and administrative terminations stay in the denominator: it is an
   *overall* rate, and the outcome distribution beside it already shows the composition.

   ⚠️ **"Where matches stall" cannot be a historical claim, because no status-transition history
   exists.** ADR-0014 gave `Match` a single `status` column and no transition log, so *"matches spend
   longest at X"* and *"matches most often stall at X"* — the proposal's own phrasing at Section 13 —
   are not answerable and must not be implied by a label. What is answerable is stated in the table
   above: where Matches are stuck **right now** in the open Round, and how Matches **ended** in the
   closed ones. Label both for what they are.

   **"Where matches stall" needs no translation table, and that is not an accident.** ADR-0014 took
   three of its six status names verbatim from `42_PeerConnect_Concept_Proposal-6.md:127`'s flow —
   `MATCHED`, `ACCEPTED`, `COMPLETED` — and `DECLINED` from the same section's prose (`:123`,
   `:263`). Only `LAPSED` and `TERMINATED_BY_ADMIN` are ours, and they exist because Section 5's
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
   `42_PeerConnect_Concept_Proposal-6.md:283` says the view exists for: turning interactions into
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

4. **Time series are indexed by Round, never by date.** ADR-0001 established that a **Round** is
   explicitly not a calendar week, and ADR-0002 made Rounds admin-triggered at arbitrary intervals.

   A date axis is not merely less apt, it is actively misleading in the one setting that decides the
   grade: **several Rounds are run inside a single defense slot, so a date axis renders the entire
   demonstration as a vertical line at one point in time.** Round order also makes periods comparable
   to each other, which arbitrary intervals cannot.

5. **Nothing is stored. This is the sixth derived-not-stored ruling on this map.** No snapshot table,
   no aggregates table, no materialised view. It joins derived *unmatched* (ADR-0002), derived Prompt
   liveness (ADR-0007), the report queue's read-time grouping (ADR-0011), and ADR-0014's refusals of
   a candidate-pool table and a `Conversation`.

   **The model charts flows freely and cannot chart stocks.** Matches created, Reviews submitted,
   Posts created and Badges awarded all carry timestamps; **XP**, **Level** and **Streak** exist only
   as today's value, because ADR-0008 decision 6 left no ledger and nothing snapshots state.

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

7. **Recharts is added as the charting dependency.** The locked stack carries no
   charting library, so this is a stack addition rather than a slice's choice. The module is graded
   on the word *dashboard*, and hand-rolling a funnel, two bar charts and a rate over time costs more
   than the dependency it avoids.

8. **Real-time updates ship; export does not.** Neither is a bullet this Minor inherits, and an
   evaluator anchored on `:911` will look for both.

   **Real-time is free.** ADR-0014 decision 8 already created a global `rounds` room carrying
   `round:closed`, so the dashboard re-queries on that event: an Admin closes a Round in one window
   and the analytics move in another. **No privileged data crosses the socket** — the event is
   outbound and content-free, and the refresh is an ordinary authenticated HTTP request carrying the
   role check, so **ADR-0003 decision 9 stands untouched** exactly as ADR-0014 decision 8 framed it.

   **Export is refused** on this map's standing habit of not paying for absolutes it does not owe.
   Export answers "can I take the data away", which neither source asks; charts and a derived insight
   answer the question actually being graded.

9. **`/admin/analytics`, Admin only — and the separate route is the answer to double-duty.** The
   research names the real risk directly: the operational admin tables already exist, so an evaluator
   may see one dashboard claimed for two modules. A distinct route beside `/admin/users`,
   `/admin/rounds` and `/admin/reports` makes two surfaces visibly two. **A Peer Moderator is
   excluded** by ADR-0008 decision 3, which scopes that role to the Post-report queue and Remove Post
   and nothing else. **There is no Student-facing view**, the per-Student **Learning Progress** view
   at `:229` being Version 2 and staying there.

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
    module**, and the check is mechanical rather than a matter of judgement:

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
    > ruled authoritative, by ADR-0013 and again in the preamble above — names it at `:293`. It is
    > therefore **an MVP feature this map cut**, not a Version 2 feature it declined to pull
    > forward, and **decision 10 does not reach it**: this test governs pulling V2 work *in* and
    > says nothing about cutting MVP work *out*. **The cut stands and was always argued on its
    > merits** — see ADR-0006 decision 8 and its Considered options, now corrected to say so. What
    > was wrong was the label, and it mattered here more than anywhere: this table is the one place
    > the map claims its Version 2 list is mechanical rather than re-argued each time, so a row
    > that was never on that list undercut exactly the property the table exists to demonstrate.
    >
    > **Network freshness (`:109`) and "balance experience or skill levels" (`:105`, `:293`) carry
    > no version tag either**, and the map mislabelled both the same way; corrected there rather
    > than here, since neither was ever a row in this table. **Availability matching is genuinely
    > Version 2** (`:115`, `:321`), so every remaining row stands unchanged.

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
an analytics feature normally wants, and this model does not need it at demo scale — and it would be
the fifth time this map materialised a derived grouping after refusing it four times.

**Reconstructing and charting XP history** (rejected, decision 6). Genuinely available and exactly
correct, and redundant against the event counts already charted.

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
