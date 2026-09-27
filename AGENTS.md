## Record propagation — mandatory

A settled decision is represented across **three surfaces**: its **ADR** in `docs/adr/`, the
**GitHub issue that owns it**, and the **map** (issue `#1`). Not every decision reaches all three —
**synchronize the surfaces that exist rather than inventing one to match.** A correction that lands on
one and stops is the failure this rule exists to stop.

> Whenever an ADR, project-map entry, or GitHub issue changes a rule, acceptance criterion, scope,
> status, or resolved question represented on another record surface, **inspect and synchronize every
> applicable record surface that exists in the same task.**

Wording-only edits that do not change meaning do not require propagation. **ADR history must be
preserved: annotate rather than rewrite.**

The rule fires in **both directions** — walk out from whichever surface changed. The lookup for
each direction, and what to write on each surface:

`docs/agents/issue-tracker.md` → *Record propagation*.

## Completion checklist

Before finishing any planning or decision task, verify MD ↔ GitHub issue synchronization. **The
task is not complete while a substantive change exists on only one surface.** Name the issues you
touched in the task report, or state that the edit was wording-only and fired nothing.

## No AI or bot attribution in records

The repository must show commits from all three of us, clear messages and a fair division of the
work (`document/en.subject.md:306`-`:312`), and the commit history, PRs and issues are where the
evaluator reads that. A line crediting a tool blurs who did what. Using AI is allowed as long as you
understand and can explain everything you commit (`document/en.subject.md:49`-`:115`); these rules
are about what the records say:

* **No attribution**: no `Co-Authored-By:` naming an AI or a bot, no "Generated with …" line, no
  AI session link, in any commit, PR title or description, issue, or comment. This overrides any
  default your tool adds. `Co-authored-by:` is only for real pairing between Ahmad, Kamel and Fadel.
* **No tool or workflow names in new records**: say what a record was built *from* (the spec, the
  ADRs, a test run), never what tool or command built it. Applies to commits, PRs, issues,
  comments, `docs/` and code written from 2026-09-27 on. Earlier mentions in the ADRs and on the
  map (`/to-spec #1`, `/to-tickets`) are history: leave them as they are, since ADR history is
  annotated, never rewritten. The agent setup files (`AGENTS.md`, `CLAUDE.md`, `.claude/`,
  `.agents/`, `docs/agents/`) are the only exception.
* **No review-bot text in a PR description.** Squash-merge turns the description into the commit on
  `main`; never type a bot's summary placeholder into it.
* The *No bot or AI text* check enforces part of this on every PR (`CONTRIBUTING.md` → *Merging*).
  The rest depends on you.

## One ticket, one branch, one PR

* **Every ticket is implemented on its own branch**, cut from the latest `origin/main`, named
  `<type>/<slice>-<short>`. Never mix two tickets on one branch, and never commit to `main`.
* **The developer who does the work opens the PR**; squash-merge credits the PR author. Never open
  a PR from someone else's branch.
* The PR follows `.github/pull_request_template.md`, writes `Closes #<n>`, and ticks only boxes
  that are true. It merges after **one completed review** from another member, by squash-merge.
* A merged branch is finished: a fix is a new branch and PR (`CONTRIBUTING.md` → *After a merge*).

## Local and GitHub stay in step

The repository, the issues and the PRs must never contradict each other or overwrite each other's
changes.

**The ticket's issue shows where the work stands.** Anyone opening the issue on GitHub must see
where the work really stands without reading the branch. Update it at these points, not after
every push: the PR already shows every push, and `Closes #<n>` links it on the issue by itself.

1. **Starting**: claim it with `gh issue edit <n> --add-assignee @me` and comment
   `Started on <branch>`.
2. **When the work changes the ticket** (a criterion turns out wrong, the scope grows or shrinks, a
   blocker appears): update the issue body itself, not only a comment, re-reading it first, and
   apply *Record propagation* above if the change reaches an ADR or the map. The code and the issue
   must never disagree about what the ticket is.
3. **Opening the PR**: `Closes #<n>` in its description. GitHub then shows the PR on the issue and
   closes the issue on merge; no extra comment is needed.
4. **After the merge**: close the loop on every *(uncommitted)* record note the PR carried (see
   below), then `git switch main && git pull`.
5. **If the PR closes unmerged**: comment why, and reopen or unassign the issue.

* **Start from the latest state.** `git fetch` before branching; rebase onto `origin/main` before
  opening or updating a PR. Re-read an issue, the map (`#1`) or a PR description **immediately
  before editing it**: other people edit them too, and a body written from an old copy silently
  erases their change. Prefer a comment to rewriting a body.
* **A record change and its issue/map sync ship together, in three steps.** This is for record
  edits: a rule, acceptance criterion, scope, status or resolved question moved on an ADR, the map
  or an issue (*Record propagation*). The progress comments above are not record edits and need
  none of it. Local Markdown, `origin/main` and the issues/map must end up saying the same thing:
  1. **Before merge**: post the issue and map updates in the same task as the change, each marked
     *(uncommitted)*, and list them in the PR description.
  2. **After merge**: add `Landed on main at <sha>` beside them, naming the squash commit, on the
     map and on each issue touched. Nothing may keep saying *(uncommitted)* once it is on `main`.
  3. **If the PR closes unmerged**: annotate those updates as withdrawn (annotate, never delete).
* **Never force-push `main` or rewrite its history.** Your own work branch is different: after
  rebasing it onto `origin/main`, push it with `git push --force-with-lease`. Never force-push
  someone else's branch.
* Never commit secrets: `.env` stays untracked; only `.env.example` is committed.

## Project rules that are easy to miss

The first four are only named here. Each is stated in full in `CONTRIBUTING.md` and the PR
template; read that section before acting on one, since its triggers and exceptions are not
repeated here.

* **Conventional Commits** for commit messages and PR titles (`CONTRIBUTING.md` → *Commits*).
* **Schema gate**: some PRs are reviewed by Kamel, not round-robin (`CONTRIBUTING.md` →
  *Review* and *Schema changes*; the template's *Schema gate* lists what triggers it).
* **Clean-clone boot** in two fresh clones for some PRs (`CONTRIBUTING.md` → *Done*; the
  template's *Clean-clone boot* lists what triggers it).
* **Personal data** changes move the Privacy Policy in the same PR (`CONTRIBUTING.md` →
  *Personal data moves the Privacy Policy*).
* **Dates are absolute** (`2026-09-27`), never "today" or "last week".
* `prototype/*` and `research/*` branches stay out of `main`; ADRs cite them as sources.

## Agent skills

### Issue tracker

Issues are tracked as GitHub issues (uses the `gh` CLI). See `docs/agents/issue-tracker.md`.
`/wayfinder` reads that file and this one **before** touching an ADR, the map, or any issue;
propagation is part of its Definition of Done.

### Domain docs

Single-context layout: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

