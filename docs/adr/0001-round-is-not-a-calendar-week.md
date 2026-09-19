# Round is an explicit admin-controlled entity, not a calendar week

The concept proposal describes the matching cycle as weekly throughout — "weekly match",
"Weekly Review", "weekly participation streak", "Weekly Learning Mission". We have
decoupled it: a **Round** is opened and closed by an **Admin**, and nothing in the schema
references wall-clock time. "Weekly" survives only as a scheduling convention staff may
choose to follow, never as a rule the system enforces.

Chosen for two reasons. A calendar-bound cycle is undemonstrable: a peer evaluation runs
under an hour, and we need to show several Rounds completing within it. And it would turn
**Streak** into a scheduled-job problem rather than a query over completed Rounds.

Recorded here because **XP**, **Streak**, and Match history all read from Round, so
reversing this later touches every progression feature in the product.

## Consequences

- The glossary drops "weekly" from Review, Mission, and Streak (see `CONTEXT.md`).
- Streak counts consecutive Rounds containing qualifying activity, not consecutive
  calendar weeks.

## Not settled by this decision

- Whether any role other than Admin may open a Round.
- What state a Round is in between one closing and the next opening.
- Whether Students left unmatched when a Round closes carry into the next Round or
  are dropped.

> **All three settled by ADR-0002**, which extends this record rather than amending it. Admin
> only, and still Admin only after ADR-0008 added a third role; at most one Round open and the
> platform may sit with none; and nothing carries over, *unmatched* being derived rather than
> stored. Noted here so a reader of ADR-0001 alone is not left with three open questions that
> were closed the same week.
