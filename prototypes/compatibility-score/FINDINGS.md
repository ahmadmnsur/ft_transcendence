# Compatibility Score — what the prototype settled

Answer to [#9](https://github.com/ahmadmnsur/ft_transcendence/issues/9). Criteria were fixed in
`SUCCESS-CRITERIA.md` and committed before the first run (`22e8ceb`, one commit ahead of any
prototype code). Measured on the seeded 20-Student cohort over 6 Rounds, plus the six hand-built
cohorts in the prototype.

## 1. The rule

```
forward = mentor.canTeach  ∩  mentee.wantsToLearn      // what the Mentee gains
reverse = mentee.canTeach  ∩  mentor.wantsToLearn      // what the Mentor gains
cover(n) = 1 - 0.5^n                                   // n Skills taught: 1→50%, 2→75%, 3→87.5%

score = round(100 * (0.7 * cover(|forward|) + 0.3 * cover(|reverse|)))
      + 10   if forward covers the Mentee's Learning Goal
      - 2    per Level of |Level(mentor) - Level(mentee)| beyond 2
      clamped to 0..100

pair(a, b)  = score both orderings, keep the higher. The Mentor is whichever Student teaches
              more; ties break on Student id, so the result never depends on iteration order.
match(pool) = every pair not in the Round history and scoring >= 25, sorted by Score descending,
              taken greedily while both Students are still free. Everyone left over is unmatched.
```

**There is no denominator, and that is the point.** The obvious rule — Skills covered ÷ Skills
wanted — tells a Student who listed one Skill that they have a *100% match*, and a Student who
listed five that they have a *20% match*, for identical teaching. In the `denominator` cohort the
second Student scores below the floor and gets no Match at all while the first is told the
pairing is perfect. `1 - 0.5ⁿ` scores how much is actually taught rather than how little was
asked for; both Students see 50%, and both get matched.

Reciprocity is weighted at 0.3, not required. Demanding both directions (`mutual`) drops the
cohort from 49 Matches over 6 Rounds to 12, with all 20 Students unmatched by Round 5 — perfect
exchanges are too rare to gate on. Scoring the Mentee's gain alone (`one-way`) performs
marginally better on throughput (50 Matches, 2 more than the default), but the Score is shown to
*both* Students and `CONTEXT.md` defines it as how well the Match serves *their* skill needs, so
the Mentor's own gain belongs in the number. The cost of that choice is measured and small: one
Match in fifty.

Headline example, straight from the concept proposal's own pair, on the default rule:

> **85% match: Ahmad can teach React and Tailwind, which you want to learn; you can teach Docker
> and Networking, which Ahmad wants to learn.**

## 2. The explanation string format

```
{score}% match: {forward clause}[; {reverse clause}].
```

| | Mentee is reading | Mentor is reading |
|---|---|---|
| forward | `{Mentor} can teach {Skills}, which you want to learn` | `you can teach {Skills}, which {Mentee} wants to learn` |
| reverse | `you can teach {Skills}, which {Mentor} wants to learn` | `{Mentee} can teach {Skills}, which you want to learn` |

- Up to three Skills are named, then `and N more`.
- The reverse clause is dropped when there is nothing in it.
- **The forward clause is never empty for a Match the rule created.** The chosen direction is by
  construction the one with more coverage, so if forward were empty the Score would be 0 and the
  floor would have excluded the pair. This is what makes "a Score is never shown without its
  explanation" an invariant rather than an intention.
- A hand-made Match reads `Paired by an Admin: …` with no number — see below.

## 3. The two questions routed here from ADR-0002

**Does a hand-made Match carry a Compatibility Score? No.** An Admin pairs exactly the Students
the rule refused, so the honest Score is at or near zero and the explanation has no clause to
show. The `starvation` walkthrough puts it on screen: two real Students shown `0% match.` and
nothing else. Store the pairing without a Score and label it as an Admin's decision.

**Is a hand-made Match bound by no-repeats? No.** Bound, the Admin's repair tool is useless
precisely when it is needed: in the 8-Student cohort the legal-pair space is fully exhausted by
Round 8, and an Admin obeying no-repeats could do nothing at all. No-repeats is a constraint on
the automatic matcher, not an integrity rule on Match. The pair still enters the history.

## 4. Criteria: four of seven pass. None of the three failures is a tuning problem.

| | Result | |
|---|---|---|
| **C3** Mentor teaches ≥1 wanted Skill | **pass**, 100% | Structural, for any floor above 0. |
| **C4** Every Score is explainable | **pass**, 100% | Same guarantee as C3. |
| **C6** Reproducible from the seed | **pass** | Replaying the action log reproduces every Match exactly. |
| **C7** No Match below the floor | **pass** | Enforced by the matcher; it is the *consequence* that C1 measures. |
| **C1** Nobody stalls | **fail** — 6 Students unmatched twice running | Passes **only** at floor 0, which fails C3 and C4. |
| **C2** Level gap ≤ 3 in ≥90% | **fail** — 59% | The −2/Level nudge is far too weak to move it. |
| **C5** Mentoring does not concentrate | **fail** — max 5 vs 2× mean of 4.9 | Misses by one Match at reputation weight 0. |

**C1 is not achievable by any rule that refuses zero-coverage Matches**, and refusing them is
non-negotiable — C3 and C4 are the disqualifying criteria. Some Students genuinely have no viable
partner in a given Round. The rule's honest output is to say so, and ADR-0002 decision 7 is the
mechanism. **C1 should be rewritten as an Admin workload commitment, not a property of the rule.**

**C2 needs a decision, not a tweak.** Reaching 90% means making Level a real term in the Score,
which the locked scope cut (Compatibility Score + no-repeats only) forbids; "balance experience
when possible" is Version 2 in the proposal. Either relax C2 to a *measured, unenforced*
observation for v1, or reopen the scope cut. Do not quietly retune it.

**C5 misses by a single Match** at reputation weight 0, so v1 is roughly fair by accident rather
than by design — which is the expected state while Fair Mentor Rotation is Version 2. It is worth
recording the number now so the V2 work has a baseline.

## 5. Three things the ticket did not ask about

**Mentor Reputation in the Score is not merely unfair, it breaks the explanation invariant.** At
weight 0.3 a pair where the Mentor can teach the Mentee *nothing* scores 30%, clears the 25%
floor, and is shown to both Students as `30% match.` with no sentence after it. Reputation
manufactures a number out of something the explanation cannot mention. Keep it out of the Score
entirely, not just until rotation ships.

**"No repeats, ever" does not survive contact with a small cohort.** Each Round burns pairs
permanently, and the space is finite:

| | R1 | R4 | R7 | R8 | R10 | R12 |
|---|---|---|---|---|---|---|
| 8 Students — legal pairs left | 20 | 10 | 1 | **0** | 0 | 0 |
| 8 Students — unmatched | 2 | 2 | 6 | **8** | 8 | 8 |
| 20 Students — legal pairs left | 76 | 52 | 29 | 22 | 9 | 2 |
| 20 Students — unmatched | 4 | 6 | 6 | 6 | 12 | **16** |

The 8-Student cohort is dead by Round 8: no Matches, ever again. A 42 cohort is larger, but a
defense fixture is not, and several Rounds inside one hour-long slot is the exact scenario
ADR-0001 exists for. **Recommend narrowing no-repeats to "not in the last N Rounds"** — a small
change to the locked scope, and the alternative is a demo that stops producing Matches on stage.

**For a symmetric exchange, which Student is Mentor is a coin flip with asymmetric consequences.**
The proposal's own example scores 85% in both directions, so the roles come down to a tie-break
on id — yet only the Mentee writes the Review, and only the Mentor's Reputation moves. Worth a
decision before the Review slice is built.

## 6. What to do with this

Nothing folds into application code yet — there is none. The rule above is what `/to-spec` should
consume. The **cohort generator** (the marked block in the prototype) is kept as the test fixture
the ticket asked for, and it runs standalone under `node` with no DOM.
