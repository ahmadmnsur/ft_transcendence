# Compatibility Score — success criteria

**Committed before the first run.** Issue
[#9](https://github.com/ahmadmnsur/ft_transcendence/issues/9) makes this a condition: without
criteria fixed in advance we will stare at output and rationalise whatever it produced. This
file is the yardstick; `compatibility-score-PROTOTYPE.html` is the thing being measured.

- **Question**: what rule produces a good Compatibility Score?
- **Timebox**: one day.
- **Scope**: matching v1 is **Compatibility Score + no-repeats only**. Fair Mentor Rotation and
  availability matching are Version 2 and are not being designed here.
- **Why it has to be right before it ships**: ADR-0002 makes matching atomic. A Match exists
  for both Students the instant a Round opens — no enrolment window, no review step. A bad
  rule is a user-facing defect with no correction window.

## The measurement run

Unless a criterion says otherwise, every number below is measured over:

- a **seeded synthetic cohort of 20 Students** (seed `42`), skills drawn from a 24-Skill
  catalogue, 1–5 Skills on each list, XP spread across Levels 1–10;
- **6 consecutive Rounds**, every Match accepted and reviewed, so no-repeats history
  accumulates and XP moves Levels underneath the rule;
- the rule's **default settings** as shipped in the prototype.

The cohort generator is **kept as a test fixture**, per the ticket. It is the block marked
`COHORT GENERATOR` in the prototype and lifts out on its own.

## Criteria

| # | Criterion | Target |
|---|---|---|
| **C1** | **Nobody stalls.** No Student is unmatched in two consecutive Rounds. | 0 Students |
| **C2** | **Experience stays balanced.** `abs(Level(Mentor) - Level(Mentee)) <= 3`. Measured, never enforced — v1 constrains on no-repeats only. | >= 90% of Matches |
| **C3** | **The Mentor can actually teach the Mentee.** The Mentor's teachable Skills cover at least one Skill the Mentee wants to learn. | 100% of Matches |
| **C4** | **Every Score is explainable.** The Match renders a plain-language reason naming at least one concrete Skill and its direction. `CONTEXT.md`: a Compatibility Score is "never shown without its plain-language explanation". | 100% of Matches |
| **C5** | **Mentoring does not concentrate.** No Student holds the Mentor role more than **2x the cohort mean** across the 6 Rounds. Rotation is V2, so v1 must at least not actively concentrate it. | 0 Students over |
| **C6** | **Reproducible.** Replaying the same seed and the same action log produces byte-identical Matches. Atomic matching with no correction window means a defense demo has to re-run the same way twice. | exact match |
| **C7** | **A weak pair is an Admin flag, not a Match.** No Match is created below the score floor; those Students surface as unmatched for an Admin to pair by hand (ADR-0002 decision 7). | 0 Matches below floor |

A rule that fails **C3** or **C4** is disqualified outright — those are correctness, not tuning.
C1, C2 and C5 are the ones expected to trade against each other.

## Questions the prototype must also answer

Routed here from the Round lifecycle decision (#4 / ADR-0002), and part of the answer:

1. Does a Match an **Admin creates by hand** carry a Compatibility Score, or none at all?
2. Is a hand-made Match **bound by no-repeats**?

## The deliverable

Not a passing dashboard. The answer is **the rule itself plus the explanation string format**,
written back to #9.
