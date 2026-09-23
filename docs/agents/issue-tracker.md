# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

* **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
* **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
* **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
* **Comment on an issue**: `gh issue comment <number> --body "..."`
* **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
* **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** *(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)*

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

* **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
* **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
* **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Record propagation

**A settled decision is represented across three surfaces**: its **ADR** in `docs/adr/`, the
**GitHub issue that owns it**, and the **map** (`wayfinder:map`, `#1`). A correction that lands on
one and stops is the failure this section exists to stop — three record audits found the same miss,
and it is a workflow gap rather than a diligence one, because nothing walked the graph.

**The mapping is neither complete nor one-to-one**, so synchronize the surfaces that exist rather
than inventing one to match. Open research, prototype and task tickets routinely precede any ADR
and some never produce one (`#2`, `#3`, `#26`); `#7` settled the claimed module list on the map with
no ADR at all; and `#10` is recorded across seven.

### The rule

> Whenever an ADR, project-map entry, or GitHub issue changes a rule, acceptance criterion, scope,
> status, or resolved question represented on another record surface, **inspect and synchronize every
> applicable record surface that exists in the same task.**

Mandatory, and done before the task is reported complete. Two bounds apply: *When it fires* sets
the threshold, and *Annotate, never rewrite* governs how a record is corrected.

### When it fires

On a change to a decision's **rule, acceptance criteria, scope, status, or a question it recorded
as open**. A wording, formatting or style edit that leaves the meaning intact fires nothing — that
threshold is what keeps the rule signal rather than noise.

### Find the other surfaces

The rule fires in **both directions**, so walk out from whichever surface changed.

**ADR → its issue.** Where an ADR exists, the **owning issue** is the ticket whose **resolution comment**
records that ADR. Search every issue body and comment for the ADR's filename:

```bash
gh issue list --state all --limit 100 --json number,title,body,comments \
  --jq '.[] | select((.body + ([.comments[].body] | join("\n"))) | test("0007-reflection-prompt-lifecycle")) | "\(.number)\t\(.title)"'
```

Expect more than one hit: one owner, plus **cross-references** from sibling tickets and the map.
Every hit is a candidate — inspect each for wording the change has made stale, and propagate to
those too.

**Issue → its ADR.** Where the ticket records an ADR, the ADR path is named in its resolution
comment:

```bash
gh issue view <n> --comments --json body,comments \
  --jq '(.body + ([.comments[].body] | join("\n")))' \
  | grep -o 'docs/adr/[0-9]\{4\}-[a-z0-9-]*\.md' | sort -u
```

Where no ADR exists, **do not invent one**. Synchronize the issue, map, or other applicable
surfaces that do exist.

**Issue → the ADRs it *answers*.** The direction that failed hardest in the audits: an ADR still
pointing at a question the ticket has since settled. ADRs carry these under a
`## Not settled by this decision` heading **and inline**, so sweep for the phrasing, not the
heading:

```bash
grep -rniE 'still (unspecified|open|unsettled)|not (yet )?(settled|specified)|remains? open|open question' docs/adr/
```

Where an issue settles a question represented in an ADR, add the appropriate forward pointer or
correction. Where no ADR exists, synchronize only the applicable surfaces that exist.

### Update each surface

* **Owning issue** — where one exists, comment with what moved and why, then annotate the stale
  wording where it is read, in the body or in the resolution comment. **A closed ticket stays
  closed**: recording a correction is a comment plus an annotation, and only reopening the
  *decision* reopens the ticket.
* **Map (`#1`)** — the map is an index, so correct the line that gists the decision. When the
  change moves scope, move the line between *Decisions so far*, *Not yet specified* and *Out of
  scope* rather than leaving two lines that disagree.
* **ADRs** — where an owning ADR exists, it gets its annotation, and any other ADR whose *Not
  settled* section or inline open question the change answers gets a forward pointer. Where one
  ADR revises an earlier one, this repo's convention is a `## What this ADR changes in earlier
  records` section (ADR-0011, ADR-0015).
* **Legal pages (`docs/legal/`)** — when the change moves what personal data is stored, who can
  see it or how long it is kept, update `privacy-policy.md`; when it moves a conduct rule, a
  Report reason or a sanction, update `terms-of-service.md`. They are user-facing text, so
  correct them in place and move their *Last updated* date; git keeps the history (ADR-0018 d15).

Never manufacture a missing ADR or issue just to complete the three-surface model. **Where a
decision turns out to have no owning ticket, say so in the task report** rather than inventing one
— an unowned decision is a finding, and silence about it is how it stays unowned.

### Annotate, never rewrite

Records are the evidence an evaluator reads. Correct one by **adding** the correction where the
stale claim is read, leaving the original text visible:

```markdown
> **Corrected 2026-09-20 by ADR-0015 d9**: this read "no charts". `/admin/analytics` ships
> exactly one charted surface; the operational tables stay tables.
```

That convention already holds across ADR-0002 d6, ADR-0008 d10 and ADR-0010 d4, and it governs
issue bodies and resolution comments exactly as it governs ADRs.

### Definition of Done

**A planning or decision task is not complete while a substantive change exists on only one
surface.** Verify MD ↔ GitHub issue synchronization before reporting the task complete, and name
in the report which issues you touched — or state that the edit was wording-only and fired nothing.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

**Read first.** Before touching an ADR, the map, or any issue, read root `AGENTS.md` and
*Record propagation* above. Propagation is part of `/wayfinder`'s **Definition of Done**: a
ticket is not resolved while its decision sits on one surface only.

* **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
* **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
* **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, *not* the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
* **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
* **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
* **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far. Then **propagate** (see *Record propagation*): any ADR the answer amends, supersedes or settles gets its annotation, and every other issue whose wording the answer has made stale gets updated — in this same session. The ticket is not resolved until that is done.

