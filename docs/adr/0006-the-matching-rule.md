# The matching rule: a skill-only Score, and the most constrained Student picks first

ADR-0002 settled the Round's lifecycle and left the rule that fills it open, noting that
**"the Compatibility Score rule must be validated before it ships"** — atomic matching leaves no
window in which to catch a bad pairing after the fact. This ADR records the rule, validated by
the prototype on branch `prototype/compatibility-score` against criteria fixed before the first
run. It **extends ADR-0002 without amending it**; every decision there stands, including
decision 6.

The shape we chose: **the number a Student sees is about Skills and nothing else, and everything
about fairness lives in the order pairs are selected, where it never has to be explained.**

## The decisions

1. **The displayed Compatibility Score is a function of Skills alone.**

   ```
   forward = mentor.canTeach ∩ mentee.wantsToLearn     // Skills the Mentee gains
   reverse = mentee.canTeach ∩ mentor.wantsToLearn     // Skills the Mentor gains
   cover(n) = 1 − 0.5ⁿ                                  // n = count of Skills, not a fraction

   score = round(100 × (0.7·cover(|forward|) + 0.3·cover(|reverse|)))
         + 10  if forward contains the Mentee's Learning Goal
         clamped to 0…100
   ```

2. **There is no denominator.** The obvious rule — Skills covered ÷ Skills wanted — tells a
   Student who listed one Skill they have a *100% match* and a Student who listed five a *20%
   match*, for identical teaching, and the second falls below the floor and gets no Match at all.
   `cover` scores how much is taught, never how little was asked for. One Skill taught is 35%
   whether the Mentee asked for one Skill or five.

3. **Reciprocity is weighted, not required.** Demanding both directions drops a 20-Student cohort
   from 49 Matches over 6 Rounds to 12, with everyone unmatched by Round 5. The Score is shown to
   both Students and the glossary defines it as serving *their* skill needs, so the Mentor's own
   gain earns its 0.3 — but it can never gate the pairing.

4. **A pair scoring below 25 is not a Match.** Those Students surface as unmatched for an Admin.
   The rule produces no Score between 1 and 25, so the floor is a switch rather than a dial: its
   only real job is to keep zero-coverage pairs out.

5. **The Mentor is whichever Student teaches more.** Both orderings are scored and the higher
   wins. For a symmetric pair the roles fall to the tie-break, which is a known asymmetry: only
   the Mentee writes the Review, and only the Mentor's Reputation moves.

6. **Selection is most-constrained-first, not greedy.** The Student with the fewest viable
   partners picks first, taking their highest-priority available partner. Plain greedy discards
   roughly 9% of the Matches that were available every Round; this finds the maximum.

7. **Level is a tie-break inside selection priority, never part of the Score.**
   `priority = score − 2 × max(0, |Level(mentor) − Level(mentee)| − 2)`. It is never displayed,
   never a hard constraint, and weight 2 sits at a sharp elbow — the first two units buy four
   times more Level compliance per unit than anything above them.

8. **No fairness term, no unmatched history, no Mentor Reputation, in the Score or in the
   priority.** Most-constrained-first already matches everyone a priority boost would have, so
   ADR-0002 decision 6 needs no amendment: unmatched stays derived, never stored, never carried
   over, everyone on equal footing.

9. **The tie-break is `priority DESC, Score DESC, pair key ASC`**, the pair key being the two
   Student ids sorted. Deterministic, so a Round re-runs identically.

10. **A blocked pair can never be Matched, in either direction**, and an Admin's hand-made Match
    carries **no** Compatibility Score and is **not** bound by no-repeats.

## Considered options

**Greedy selection** (rejected, decision 6). Simpler by five lines, and it strands Students: a
top-scoring pair consumes two Students who were each other's only viable partner. Measured at
87–91% coverage against most-constrained-first's 96–99%.

**A priority boost for recently unmatched Students** (rejected, decision 8) — the option ADR-0002
already rejected by name. It works under greedy, and under most-constrained-first it does exactly
nothing: identical results at every weight from 0 to 60, because selection is driven by
option-count rather than by score. Adopting it would have meant amending ADR-0002 for a term with
no measurable effect.

**Skills covered ÷ Skills wanted** (rejected, decision 2), and **requiring both directions**
(rejected, decision 3).

**A hard Level constraint** (rejected, decision 7). It does buy full compliance, and more cheaply
than a soft weight tuned to match it — but nothing requires the guarantee, and it costs Matches.
A weight-free alternative, banding Scores and preferring closer Levels within a band, was also
tried and performed *worse* than the weight it was meant to replace.

**Mentor Reputation in the Score** (rejected, decision 8). It is not merely unfair: at weight 0.3
a pair where the Mentor can teach the Mentee *nothing* scores 30%, clears the floor, and renders
as "30% match." with no sentence after it. Reputation manufactures a number the explanation
cannot mention.

**Fair Mentor Rotation and availability matching** stay Version 2, as the locked scope cut has
them. Rotation exists to counteract routing Students to the highest-rated Mentors, which decision
8 makes impossible; it is a counterweight to a bias this rule does not have.

**Hashing the tie-break to avoid favouring early-registered Students** (rejected, decision 9).
The bias was measured rather than assumed, and it is not there: Matches per Student by roster
position came out flat.

## Consequences

- **Every Score is explainable, by construction.** The chosen direction is the one with more
  coverage, so an empty forward set implies Score 0, which the floor excludes. `CONTEXT.md`'s
  "never shown without its plain-language explanation" is therefore an invariant, not an
  intention — and it is what disqualifies any future factor that cannot appear in the sentence.
- **Matching more Students lowers the average Score** — about 4 points — because the marginal
  pairs get matched too. Deliberate, and bounded by the floor.
- **The Score has few distinct values** (8 across 78 candidate pairs in a 20-Student cohort), so
  the Level tie-break decides more Matches than its weight suggests. It is a tie-break in
  practice, not a secondary factor, and should be described that way.
- **No Student is guaranteed a Match.** Coverage reaches 96–99% on a 30-Student cohort; the
  remainder are an Admin's work, which is what ADR-0002 decision 7 exists for.
- **A demo cohort needs roughly 30 Students** for six Rounds. No-repeats burns pairs permanently
  and the space is finite: eight Students produce no Matches at all from Round 8.
- **`Block` becomes a domain term and a hard constraint**, so this rule now depends on the
  moderation depth the map still lists as unspecified.
