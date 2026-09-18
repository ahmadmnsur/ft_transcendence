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
