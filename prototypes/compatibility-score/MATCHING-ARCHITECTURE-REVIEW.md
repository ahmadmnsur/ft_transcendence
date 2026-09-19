# Matching architecture — technical review

**What this is.** A review of a proposed matching architecture for 42 PeerConnect, answering
whether it is consistent with the concept proposal, the locked project map, and the existing
ADRs — and whether it is appropriate for a three-person team with six weeks.

**Where the numbers come from.** Every figure below is measured, not estimated, using the
prototype on branch `prototype/compatibility-score`
(`prototypes/compatibility-score/compatibility-score-PROTOTYPE.html`, a single self-contained
HTML file that opens by double-click). Unless stated otherwise, runs are **8 random seeds ×
6 Rounds**, with results averaged, on synthetic cohorts from the generator kept as a test
fixture. Single-seed differences turned out to be mostly noise, which is why everything here
is a multi-seed mean.

**Related documents.** `SUCCESS-CRITERIA.md` (criteria fixed before the first run) and
`FINDINGS.md` (what the original prototype settled) sit alongside this file.

> **One correction carried forward.** An earlier write-up on issue #9 claimed "C1 — nobody
> stalls — is unachievable by any rule that refuses zero-coverage Matches." That was wrong.
> It is unachievable *within the locked scope*; it is achievable, and the sections below show
> by what, and at what cost.

---

## The headline: the tuning effort is going into the wrong place

Scoring weights barely move outcomes. **Selection order moves everything.**

N=30, 6 Rounds, mean of 8 seeds:

| | coverage | stalled | gap≤3 | mean score | capacity wasted |
|---|---|---|---|---|---|
| greedy + fairness bonus (the proposal) | 91.0% | 0.13 | 67.8% | 52.9 | **8.3 Matches** |
| greedy + repair pass | 98.4% | 0.13 | 63.8% | 50.5 | 1.0 |
| **most-constrained-first** | **99.4%** | **0.13** | **70.3%** | 48.5 | **0.0** |

"Capacity wasted" = Matches below the best coverage found in 600 randomized re-runs of the same
Round. Plain greedy throws away roughly 9% of the Matches that were available, every Round.
Most-constrained-first — *the Student with the fewest viable partners picks first* — finds the
maximum every time.

## The fairness bonus is redundant, and ADR-0002 can stay intact

This is the strongest recommendation in this review. At N=30, **all three strategies produce
identical stall counts (0.13)**. And inside most-constrained-first, the fairness bonus does
*nothing at all*:

| bonus | 0 | 5 | 10 | 15 | 20 | 30 | 60 |
|---|---|---|---|---|---|---|---|
| stalled | 1.13 | 1.13 | 1.13 | 1.13 | 1.13 | 1.13 | 1.13 |

Byte-identical at every weight, because selection is driven by option-count, not by score.
Folding urgency directly into the constraint ordering (treating a stalled Student as having
fewer options) was also tried: 1.25 → 1.13 stalls, and coverage *drops* at higher settings.

So **most-constrained-first meets all four fairness goals without any unmatched history**: no
streak, no bonus, no cap, no cross-Round state in the matcher — and **ADR-0002 decision 6 stays
as written.** No amendment, nothing stored, nothing carried over, everyone on equal footing
within the Round. "The Student with the fewest options picks first" is itself a fairness
principle, defensible in one sentence, and it avoids having to explain why the system remembers
failing someone.

The honest cost: mean displayed Score 48.5 vs 52.9. Matching more people means the marginal
pairs get matched too. The floor still holds — Matches scoring under 35 were **0** in every run,
so coverage never comes from manufacturing bad Matches.

The bonus only earns its keep on undersized cohorts (N=20: 0.63 vs 1.25 stalls; N=12: 1.88 vs
3.00). That is a fixture-sizing problem, not an architecture problem.

## The streak cap cannot be justified — it never fires

| cap | 1 | 2 | 3 | 99 |
|---|---|---|---|---|
| stalled | 1.13 | 1.13 | 1.13 | 1.13 |

Identical. At bonus ≥20 no Student is ever unmatched twice running, so the streak never exceeds
1 and the cap is unreachable code. No value for it can be justified from data. If the bonus is
kept at all, drop the cap.

---

# Final recommendations

## A. Architecture

```
1. HARD CONSTRAINTS  → drop illegal pairs
2. DISPLAYED SCORE   → skill only, explainable, shown to both Students
3. FLOOR             → below 25, the pair is not a Match
4. SELECTION ORDER   → most-constrained-first, using score + level as the preference
5. LEFTOVERS         → flagged to Admin, unscored
```

Four stages, no cross-Round state, no fairness history.

## B. Displayed Compatibility Score — exact formula

```
forward = mentor.canTeach ∩ mentee.wantsToLearn     // Skills the Mentee gains
reverse = mentee.canTeach ∩ mentor.wantsToLearn     // Skills the Mentor gains
cover(n) = 1 − 0.5ⁿ                                  // n = count of Skills, NOT a fraction

score = round(100 × (0.7·cover(|forward|) + 0.3·cover(|reverse|)))
      + 10  if forward contains the Mentee's Learning Goal
      clamped to 0…100
```

The six cases that must not stay ambiguous:

| case | forward | reverse | score |
|---|---|---|---|
| A wants 1 Skill, B teaches it | 1 | 0 | **35%** (45% if it is A's Learning Goal) |
| A wants 5 Skills, B teaches 1 | 1 | 0 | **35%** — *identical*, deliberately |
| Bidirectional, 2 each way | 2 | 2 | **75%** |
| One direction only, 2 Skills | 2 | 0 | **53%** |
| Neither direction | 0 | 0 | **0% → no Match**, both to Admin |
| One lists many, other few | — | — | list length is not an input; only Skills *taught* count |

**There is no denominator, and that is the point.** Covered ÷ wanted tells a Student who listed
one Skill they have a *100% match* and a Student who listed five a *20% match* for identical
teaching — and the second falls below the floor and gets nothing at all.

**Level is not in the displayed Score.** It is not part of "how well this Match serves their
skill needs" (the `CONTEXT.md` definition), and it cannot be phrased in the explanation sentence
without sounding like an excuse.

## C. Selection priority — exact formula

```
priority = displayed_score − 2 × max(0, |Level(mentor) − Level(mentee)| − 2)
```

That is the whole thing. No fairness term, no rotation, no network freshness. Never displayed.

## D. Hard constraints

1. A pair already Matched in any previous Round.
2. Either Student blocked by the other, **in either direction**.
3. One Match per Student per Round (enforced by the selection loop, not a filter).
4. Displayed Score below 25.

Self-matching is deliberately **not** on this list: `i < j` pair iteration makes it impossible,
and listing it invites an evaluator to ask why the code checks something that cannot happen.

## E. Tie-break rule

`priority DESC, displayed score DESC, then pair key (sorted ids) ASC.`

An id-based tie-break was suspected of quietly favouring early-registered Students, because
**88% of candidate pairs share a priority with another pair** and only 8 distinct displayed
Scores exist among 78 pairs — the tie-break decides most of the matching. Tested against a
`hash(Round + pair)` alternative:

| | first 5 | next 5 | next 5 | last 5 |
|---|---|---|---|---|
| id tie-break | 5.17 | 5.15 | 5.13 | 5.10 |
| hash tie-break | 5.10 | 5.05 | 5.13 | 5.08 |

Matches received per Student by roster position. **No meaningful bias.** Keep the simple id
tie-break; the hash buys nothing measurable and costs explainability. (This measured match
*count*, not partner quality.)

## F. Unmatched Students

Derived, never stored, never carried over — ADR-0002 decision 6, unchanged. Anyone left over is
listed for the Admin, who may pair them by hand. A hand-made Match carries **no** Compatibility
Score and is **not** bound by no-repeats.

## G. Greedy selection — change it

Replace greedy with most-constrained-first: about 15 lines, one sentence to defend, recovers
8–9% more Matches, and reaches the maximum coverage found by 600 randomized restarts.

A repair pass on top of greedy (*"if breaking one Match lets two stranded Students both be
matched, do it"*) recovers most of the gap at 95–98% coverage — but it is more code than
most-constrained-first for a worse result. Skip it.

## H. Level treatment — weight 2, not 5

Marginal return per unit of weight:

| step | gap≤3 gain | per unit |
|---|---|---|
| 0 → 2 | +8.7pp | **4.35** |
| 2 → 5 | +2.8pp | 0.93 |
| 5 → 8 | +3.1pp | 1.03 |
| 8 → 12 | +1.5pp | 0.38 |

Sharp elbow at 2; everything after is four times less efficient. Coverage and stalls are flat
across the whole range, so weight 5 is not distinguishable from weight 2 in anything except the
metric it directly targets. **Weight 2 is justified by the elbow. Weight 5 is not.**

A weight-free alternative was also tried (band the scores, prefer closer Levels within a band).
**It lost**: 63.3% vs 65.1% for weight 2, and it merely relocates the arbitrary parameter into
the band size. Withdrawn.

No hard level constraint. A guarantee is not needed here, and a hard cap costs Matches to buy one.

## I. Mentor Rotation — out of MVP

Rotation is marked `_(MVP)_` in the **concept proposal** (`:111`, `:293`) but was cut to
**Version 2 by the locked map**, which states *"Anything not on the shipped list is Version 2 by
default."*

The evidence for leaving it out: the proposal's rotation exists to counteract *"always routing
students to the same few highest-rated mentors"* — routing that only exists if Mentor Reputation
feeds selection. It does not, and should not: at reputation weight 0.3 a pair where the Mentor
can teach the Mentee **nothing** scores 30%, clears the floor, and renders as `30% match.` with
no sentence after it. Measured concentration without reputation is mild (max 5 Mentor roles
against a mean of 2.45 over 6 Rounds). **Rotation is a counterweight to a bias v1 does not have.**

## J. Network Freshness — out of MVP

Three independent blockers:

1. The proposal's line is **conditional**: *"…if the goal for that student is to expand their
   network"* (`:109`). No such per-Student preference exists anywhere in the project.
2. `CONTEXT.md` has **no `Friend`, no `Block`, and no chat/message entity**. The glossary is 23
   terms and none of them is a social relation.
3. It couples the matching slice to the chat/friends slice, against the vertical-slice work
   division in `CONTRIBUTING.md`.

## K. No-repeat — keep it permanent

Keep it. Exhaustion is a fixture-sizing issue, not an algorithm defect: **seed ~30 Students**
for a 6-Round demo, which is where stalls flatten to 0.13 regardless of strategy and coverage
reaches 99%. At N=12 every strategy struggles; that is the cohort, not the algorithm.

(For the record, the proposal says *"Avoid matching the same two students **repeatedly**"*
(`:105`), not "never" — so pair decay is permitted later if it is ever wanted. It is not needed
now.)

## L. Documents to amend

| Document | Change |
|---|---|
| **Concept proposal** | **None.** Primary source; the concept is locked by the map. |
| **ADR-0002** | **None**, if most-constrained-first is adopted. The original plan required amending decision 6. |
| **Map #1 scope cut** | Amend: "Compatibility Score + no-repeats" → "+ blocked-pair exclusion, + Level as tie-break, + most-constrained-first selection". |
| **`CONTEXT.md`** | Add **Block** — it is a hard constraint on a term the glossary does not define. |
| **New ADR-0006** | The matching rule: formula, floor, selection order, tie-break, Admin fallback. |
| **Map "Demo strategy"** | Record the ~30-Student fixture rule. |

**Dependency risk:** blocking is referenced only in ADR-0003 decision 6, whose consequences say
*"whoever settles moderation depth inherits decision 6"* — and moderation depth is still on the
map's **Not yet specified** list. The matching slice therefore depends on an unspecified ticket.

## M. Test scenarios

1. **Denominator** — one Mentor, two Mentees, one wanting 1 Skill and one wanting 5, same Skill
   taught. Both must score **35%**.
2. **Zero coverage** — a pair with no overlap either way. No Match; both appear as unmatched.
3. **Role assignment** — asymmetric pair. The Mentor must be the Student who teaches more.
4. **Symmetric pair** — equal both ways. Roles must be stable across re-runs.
5. **No-repeats** — the same pair must never appear in two Rounds.
6. **Blocking** — A blocks B; no Match in either direction, in any Round.
7. **Starvation** — the 4-Student `starvation` fixture. Most-constrained-first must produce
   **2** Matches where greedy produces 1.
8. **Determinism** — same seed, same Round, run twice: identical Matches. *(Verified, passes.)*
9. **Explanation invariant** — every Match in a 30-Student, 6-Round run renders at least one
   clause naming a Skill. Must be 100%.
10. **Admin fallback** — a hand-made Match shows no Score, and is permitted on a
    previously-Matched pair.

---

## Where each requirement actually comes from

| | Concept Proposal | Locked map | ADR | Code today |
|---|---|---|---|---|
| Skill compatibility primary | **required** | in scope | — | none |
| No repeats | **required** ("avoid… repeatedly") | in scope | — | none |
| Unmatched → Admin | **required** | in scope | ADR-0002 dec. 7 | none |
| Balanced experience | **required, MVP** | **cut** | — | none |
| Mentor rotation | **required, MVP** | **cut to V2** | — | none |
| Network freshness | **conditional** | out | — | none |
| Unmatched priority boost | not mentioned | — | **explicitly rejected**, ADR-0002 dec. 6 | none |
| Blocking | **required** (trust & safety) | in scope | ADR-0003 dec. 6 | none |
| Most-constrained-first | not mentioned | — | — | **new recommendation** |

A concept-proposal requirement is **not** automatically active in the locked implementation
scope. Balanced experience and mentor rotation are both marked MVP in the proposal and both were
deliberately cut by the map; re-adding either is a scope change that belongs on the map, not a
free implementation detail.

**The repository still contains zero application code** — no `src/`, no `prisma/`, no
`package.json`. "Current implementation behaviour" is the prototype only, so none of this is a
migration.

## Hidden problems worth knowing about

1. **The Score has only 8 distinct values across 78 candidate pairs.** Students will repeatedly
   see the same numbers, and the tie-break — not the Score — decides most Matches. Worth knowing
   before anyone treats the percentage as precise.
2. **More coverage means lower average Scores** (52.9 → 48.5). Matching more people necessarily
   reaches further down the quality curve. It is the right trade, but it should be made
   consciously.
3. **Level weight 2 is not a "light secondary factor"** — given 8 distinct Scores, it *is* the
   tie-break in practice. The spec should say so, or it will mislead whoever implements it.
4. **Most-constrained-first has a subtle downside:** it computes option counts against the
   *current* candidate set, so a Student whose only partners all sit just above the floor gets
   matched early into a weak pair. The floor bounds the damage, but the effect is real.
5. **Blocking is a hard constraint on an undefined term**, gated behind an unspecified
   moderation ticket.
6. **`Mission`** is in the glossary as "the concrete task attached to a Match", and nothing in
   this design produces one. Not a matching problem, but it is an MVP term with no owner.

---

## Bottom line

Take **most-constrained-first**, drop the fairness bonus and the streak cap entirely, keep Level
at weight 2 as an honest tie-break, keep no-repeats permanent, and size demo cohorts at ~30
Students.

That is fewer moving parts than the proposed approach, it leaves ADR-0002 untouched, and it
measures better on coverage, stalls and level balance simultaneously.
