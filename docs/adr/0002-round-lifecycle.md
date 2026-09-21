# The Round lifecycle: atomic matching, hard close, nothing carried over

ADR-0001 made a **Round** an explicit Admin-controlled entity and deliberately left three
things open: who may open one, what state the platform is in between Rounds, and what
happens to Students left unmatched. This ADR settles those and the questions they dragged
in. It **extends ADR-0001 without amending it**; that record stays as written.

The shape we chose: **one Admin action opens a Round and runs the matching in the same
breath, and closing it is a hard, irreversible boundary.** Everything else follows from
keeping the matcher a function that runs exactly once per Round, rather than a process
that reacts to events over a Round's lifetime.

## The decisions

1. **Only an Admin may open or close a Round.** `CONTEXT.md` defines exactly one
   privileged role; we are not leaving a seam for a second one. Peer Moderator stays
   Future work and gets its own decision if it ever arrives.

   > **Amended by ADR-0008**, which is that decision arriving. The rule above stands
   > **verbatim** — a **Peer Moderator** never gains Round control — but the reasoning no
   > longer does: there are now three roles, and Peer Moderator is no longer Future work.

2. **At most one Round is open at a time, and the platform may sit with none.** Closing a
   Round does not open the next. The invariant is one line: no Round may be opened while
   another is open. The idle period between Rounds is a real, expected state, not a fault.

3. **Opening a Round runs the matching atomically.** A Round comes into existence with its
   Matches already created. A Round therefore has exactly two states, **Open** and
   **Closed** — there is no draft, no enrolment window, no separate "run matching" action.
   This is what lets several Rounds complete inside an hour-long defense slot, which is
   the reason ADR-0001 gave for the entity existing at all.

   **"Atomically" means one database transaction: the Round row and every generated Match
   row commit together, or none of them do.** ADR-0014's unique index guards "at most one
   open Round" against two simultaneous Admin requests each trying to open one; it says
   nothing about a single Admin request that fails partway through matching. Without a
   transaction boundary, that failure mode leaves a Round with no Matches, or with some of
   its Matches, sitting there as if it had finished — the transaction is what makes decision
   6's "unmatched" derivation and decision 5's "finalises every Match" trustworthy at all.

4. **The candidate pool is automatic**: every Student with at least one Skill on either
   list is a candidate, with no per-Round opt-in. Consent happens *after* pairing, through
   accept/decline, which is how the concept proposal describes it. Seeding a demo is
   therefore seeding Students, not Students plus enrolments.

   > **Narrowed by ADR-0008.** The rule above is no longer the whole test. A candidate is a
   > Student with a **Skill** listed **and** whose role is not `ADMIN` **and** who is neither
   > **Suspended** nor **Removed**. Read the Skill clause alone and a promoted Admin or a
   > suspended Student silently re-enters matching.

   > **Eligibility serialization clarified 2026-09-21 by ADR-0008.** This predicate is evaluated
   > at Match creation's logical serialization point. A role, Suspension or Removal change and
   > automatic or manual Match creation involving that Student must resolve as one serial order:
   > exclusion first means no Match; Match first means a later promotion leaves it standing, while
   > a later Suspension or Removal terminates it administratively if it is still in progress. The
   > database mechanism belongs to `/to-spec #1`.

5. **Closing a Round finalises every Match in it.** A Match without a submitted Review
   awards no XP and contributes nothing to Streak. This needs no new rule: the glossary
   already says XP is "awarded only for completed, confirmed activity", and an unfinished
   Match was never confirmed activity.

6. **"Unmatched" is derived, never stored, and never carried over.** A Student is
   unmatched in a Round when the pool contains them and that Round holds no Match for them
   in a live status. The status check matters: a Student whose only Match was declined and
   never replaced is unmatched, even though a Match row exists. Nothing waits through the
   idle period; an unmatched Student is an ordinary candidate next Round, on equal footing.

   > **Corrected by ADR-0014, and read this before implementing the rule above.** "In a **live**
   > status" is the wrong word and implementing it literally is a bug: a `COMPLETED` Match is not
   > live, so the Students who did exactly what the platform asked would derive as *unmatched* for
   > that Round. The partition this rule needs is **standing** versus **repudiated** — standing being
   > `MATCHED`, `ACCEPTED`, `COMPLETED` and `LAPSED`, repudiated being `DECLINED` and
   > `TERMINATED_BY_ADMIN`. The intent above is untouched; only the word was wrong.

7. **An Admin may create a Match by hand inside an open Round.** Without it, the proposal's
   "flag them for the admin to handle manually" is a dead end, and an odd-sized pool
   guarantees a leftover Student every single Round.

8. **Declining terminates that Match.** Both Students drop back to unmatched for the
   Round, and only an Admin repairs it. The system does not hunt for a replacement.

9. **A Reflection Prompt answered while no Round is open earns XP but not Streak.** XP is a
   pool fed by confirmed activity and needs no Round. Streak is defined in Rounds and has
   nothing to attach to during an idle period. The Prompt loop stays decoupled from
   matching, as the proposal intends, and the shortfall is the honest answer rather than a
   hole in the model.

   > **Concurrency boundary clarified 2026-09-21 by ADR-0007.** “While no Round is open” and
   > “the Round open at answer time” are evaluated at the Prompt-answer transaction's logical
   > serialization point, not when its request began. If an accepted answer is ordered before a
   > concurrent close, that close observes it as qualifying activity. If the close is ordered
   > first, the answer earns its normal XP and Badge progress but contributes nothing to the
   > closed Round; it belongs for Streak purposes to the Round then open, if any, or to none.

## Considered options

**Auto-opening the next Round on close** (rejected, decision 2). It removes the idle state,
but it also removes the Admin's ability to stop the machine, and it forces a defense demo
to re-match whether or not that's wanted.

**A carry-over queue for unmatched Students, or a priority boost for them** (rejected,
decision 6). The boost is Fair Mentor Rotation wearing a different hat, and the locked
scope cut puts matching v1 at Compatibility Score plus no-repeats only. The queue is an
entity whose only job is to survive an idle period we've just decided is genuinely idle.

**Automatic re-matching on decline** (rejected, decision 8). It turns the matcher into an
event-driven repair loop running against a pool that's already partly consumed — which is
precisely what decision 3 was chosen to avoid. One atomic algorithm plus an Admin's hand
beats an algorithm plus a repair loop, at three developers and six weeks.

**Round-scoping Reflection Prompts** (rejected, decision 9). It would make Streak trivially
clean, at the cost of silencing the community feed between Rounds.

## Consequences

- **The data model needs a terminal Match status for "finalised by Round close without a
  Review", distinct from Completed.** XP and Streak are queries that must tell a real
  success apart from an abandonment; if the two collapse into one status, both become
  unanswerable.
- **Closing a Round is irreversible.** A closed Round cannot reopen — that is what makes
  decision 5 a boundary rather than a suggestion.
- **A Round opened with fewer than two candidates is legal.** It produces zero Matches and
  leaves everyone unmatched. No special case, no guard.
- **A Student who joins mid-Round waits for the next one**, as does one who updates their
  Skills after opening. Follows from decisions 3 and 4.
- **The Compatibility Score rule must be validated before it ships.** Atomic matching
  leaves no enrolment or review window in which to catch a bad pairing after the fact —
  by the time anyone sees a Match, it already exists for both Students.
- **Real-world Round length is operational guidance, never enforced.** A week remains a
  sensible default for staff to follow, and nothing in the schema knows about it. It is
  written here rather than in `CONTEXT.md` deliberately: ADR-0001's whole argument was to
  get "weekly" out of the domain language, and a recommended length in the glossary is how
  it creeps back in.
