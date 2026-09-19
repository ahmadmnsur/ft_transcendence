# The matching rule: a skill-only Score, and the most constrained Student picks first

ADR-0002 settled the Round's lifecycle and left the rule that fills it open, noting that
**"the Compatibility Score rule must be validated before it ships"** — atomic matching leaves no
window in which to catch a bad pairing after the fact. This ADR records the rule, validated by
the prototype on branch `prototype/compatibility-score` against criteria fixed before the first
run. It **extends ADR-0002 without amending it**; every decision there stands, including
decision 6.

The shape we chose: **the number a Student sees is about Skills and nothing else, and everything
about fairness lives in the order pairs are selected, where it never has to be explained.**

## The algorithm, step by step

```
1. Generate every unordered Student pair.
2. Reject hard-invalid pairs: previously Matched, or blocked in either direction.
3. Score both Mentor/Mentee orientations.
4. Keep the orientation with the HIGHER DISPLAYED SCORE; if equal, the lower Student id
   is Mentor.
5. Reject pairs whose displayed Score is below the floor of 25.
6. Compute each surviving pair's Selection Priority — internal, never shown:
       priority = Score − 2 × max(0, |Level(mentor) − Level(mentee)| − 2)
7. While any unmatched Student has at least one viable partner:
       - RECOMPUTE every unmatched Student's viable partners. A pair is viable only if
         BOTH its Students are still unmatched, so this must happen after every Match,
         not once up front.
       - Among Students with at least one viable partner, choose the one with the fewest.
         Tie → lower Student id.
       - Take that Student's viable pair with the highest priority.
         Tie → higher displayed Score. Tie → smaller pair key.
       - Assign the Match and mark both Students matched for the Round.
8. Every Student still unmatched is reported to the Admin.
9. An Admin's hand-made Match is a manual override: no Compatibility Score, and not
   bound by no-repeats.
```

Two details carry weight out of proportion to their size. **Step 7 recomputes viable partners
after every Match** — that recomputation *is* most-constrained-first; counting once up front
gives a different and worse algorithm. And **marking both Students matched is what enforces one
Match per Student per Round**: it is a loop invariant, not a filter, which is why no such rule
appears in steps 2 or 5.

Step 7 also has to skip Students with no viable partner rather than select them. "Choose the
Student with the fewest viable partners" applied literally selects a Student with zero, who can
be assigned nothing and never leaves the pool, and the loop never terminates.

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

   The **Learning Goal bonus is +10, once, or not at all**. It applies only when the *Mentee*
   has a Learning Goal and that Skill is in `forward`; the Mentor's own Learning Goal never
   enters. A Mentee with no Learning Goal, or one whose Goal is not among the Skills being
   taught, scores the same as if the rule did not exist. It does not scale with how many other
   Skills are taught, and the clamp is real: a mutual five-Skill exchange scores 97, and the
   bonus takes it to 100 rather than 107. Because the bonus requires the Goal to be *inside*
   `forward`, it can never apply to a pair that teaches nothing — so it cannot lift a
   zero-coverage pair over the floor.

   > **Made implementable by ADR-0014.** As written the bonus tests membership of a **Learning
   > Goal** in `forward`, a set of **Skills**, while `CONTEXT.md` defined a Learning Goal as
   > free text *narrower than* the Skills wanted — which can never be an element of that set.
   > ADR-0014 decision 3 makes **Skill** a catalogue entity and the Learning Goal a reference to
   > one of the Student's own `LEARN` rows, with the displayed sentence beside it. **The rule
   > above is unchanged and the prototype's calibration stands**; it now has a well-formed test
   > rather than a string comparison.

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
   The floor is a switch, not a dial: the chosen orientation is by construction the one with more
   coverage, so its Score is either **0** — nothing taught in either direction — or **at least
   35**, one Skill taught being `round(100 × 0.7 × 0.5)`. Nothing lands in between. The floor
   therefore rejects the 0% case and nothing else, and any value in `(0, 35]` would behave
   identically; 25 is chosen for headroom.

5. **The Mentor is the Student on the higher-scoring side**, not simply the one who teaches
   more Skills. The two usually agree — `0.7·forward + 0.3·reverse` is increasing in forward
   coverage — but the Learning Goal bonus breaks ties they cannot: two Students who each teach
   the other exactly one Skill have *equal* coverage, and if only one of them has that Skill as a
   Learning Goal, one orientation scores 60 and the other 50. Choosing by coverage would pick the
   Mentor by id and display 50%. Ties in **Score** break on the lower Student id. For a genuinely
   symmetric pair the roles are therefore arbitrary, which is a known asymmetry: only the Mentee
   writes the Review, and only the Mentor's Reputation moves.

6. **Selection is most-constrained-first, not greedy.** The Student with the fewest viable
   partners picks first, taking their highest-priority available partner. Plain greedy discards
   roughly 9% of the Matches available each Round. Most-constrained-first **reached the best
   coverage observed across every fixture tested** — measured against the best of 600 randomized
   re-runs of the same Round, across 8 seeds and cohorts of 12, 20 and 30. It is a heuristic:
   nothing here proves it attains the global maximum, and no such guarantee is claimed or
   needed.

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

**Fair Mentor Rotation is cut; availability matching stays Version 2.** Rotation exists to
counteract routing Students to the highest-rated Mentors, which decision 8 makes impossible; it is
a counterweight to a bias this rule does not have, and the prototype missed its
mentoring-concentration criterion by a single Match with no rotation term present at all.

**The two are different acts, and the record said otherwise until 2026-09-19.** The proposal tags
rotation **_(MVP)_** outright at `42_PeerConnect_Concept_Proposal-6.md:111`, and Section 15 — the
MVP list ADR-0013 and ADR-0015 both ruled authoritative — names it again at `:293`. So cutting it
**reduces the proposal's own MVP** and stands on the argument just given, where availability
matching is tagged _(Version 2)_ at `:115` and merely stays where the proposal put it. The decision
is unchanged; only "stay Version 2, as the locked scope cut has them" was wrong.

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
- **No Student is guaranteed a Match.** Coverage reached 96–99% on a 30-Student cohort in
  testing; the remainder are an Admin's work, which is what ADR-0002 decision 7 exists for.
- **Seed roughly 30 Students in demo and test fixtures** for six Rounds. This is **guidance for
  fixtures, not a production constraint** — nothing in the schema or the rule enforces a cohort
  size, and a real 42 cohort is far larger. It matters because no-repeats burns pairs
  permanently and the space is finite: eight Students produce no Matches at all from Round 8.
- **The prototype and this ADR differ on one point, deliberately.** The prototype folded the
  Level term into the displayed Score; this ADR moves it into Selection Priority, so Scores read
  off the prototype run slightly lower than the rule specified here produces.
- **`Block` becomes a domain term and a hard constraint**, so this rule now depends on the
  moderation depth the map still lists as unspecified.
