## Record propagation — mandatory

A settled decision is represented across **three surfaces**: its **ADR** in `docs/adr/`, the
**GitHub issue that owns it**, and the **map** (issue `#1`). Not every decision reaches all three —
synchronize the surfaces that exist rather than inventing one to match. A correction that lands on
one and stops is the failure this rule exists to stop.

> Whenever an ADR, project-map entry, or GitHub issue changes a rule, acceptance criterion, scope,
> status, or resolved question represented on another record surface, the owning ADR, issue, and
> map must be inspected and synchronized in the same task.

This synchronization is mandatory and must happen before reporting the task complete.
Wording-only edits that do not change meaning do not require propagation. **ADR history must be
preserved: annotate rather than rewrite.**

The rule fires in **both directions** — walk out from whichever surface changed. The lookup for
each direction, and what to write on each surface:
`docs/agents/issue-tracker.md` → *Record propagation*.

## Completion checklist

Before finishing any planning or decision task, verify MD ↔ GitHub issue synchronization. **The
task is not complete while a substantive change exists on only one surface.** Name the issues you
touched in the task report, or state that the edit was wording-only and fired nothing.

## Agent skills

### Issue tracker

Issues are tracked as GitHub issues (uses the `gh` CLI). See `docs/agents/issue-tracker.md`.
`/wayfinder` reads that file and this one **before** touching an ADR, the map, or any issue;
propagation is part of its Definition of Done.

### Domain docs

Single-context layout: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
