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

## Nothing published may show AI involvement

The commit history, PRs and issues are what the evaluator reads to see how the three of us divided
the work (`document/en.subject.md:306`-`:312`). Anything you publish must read as the developer's own:

* **No attribution**: no `Co-Authored-By:` naming an AI or a bot, no "Generated with …" line, no
  AI session link, in any commit, PR title or description, issue, or comment. This overrides any
  default your tool adds. `Co-authored-by:` is only for real pairing between Ahmad, Kamel and Fadel.
* **No tool or workflow names in records**: say what a record was built *from* (the spec, the
  ADRs, a test run), never what tool or command built it. Applies to commits, PRs, issues,
  comments, `docs/` and code. The agent setup files (`AGENTS.md`, `CLAUDE.md`, `.claude/`,
  `.agents/`, `docs/agents/`) are the only exception.
* **No review-bot text in a PR description.** Squash-merge turns the description into the commit on
  `main`; never type a bot's summary placeholder into it.
* The *No bot or AI text* check enforces part of this on every PR (`CONTRIBUTING.md` → *Merging*).
  The rest depends on you.

## One ticket, one branch, one PR

* **Every ticket is implemented on its own branch**, cut from the latest `origin/main`, named
  `<type>/<slice>-<short>`. Never mix two tickets on one branch, and never commit to `main`.
* Claim the ticket first: `gh issue edit <n> --add-assignee @me`.
* **The developer who does the work opens the PR**; squash-merge credits the PR author. Never open
  a PR from someone else's branch.
* The PR follows `.github/pull_request_template.md`, writes `Closes #<n>`, and ticks only boxes
  that are true. It merges after **one completed review** from another member, by squash-merge.
* A merged branch is finished: a fix is a new branch and PR (`CONTRIBUTING.md` → *After a merge*).

## Local and GitHub stay in step

The repository, the issues and the PRs must never contradict each other or overwrite each other's
changes.

* **Start from the latest state.** `git fetch` before branching; rebase onto `origin/main` before
  opening or updating a PR. Re-read an issue, the map (`#1`) or a PR description **immediately
  before editing it**: other people edit them too, and a body written from an old copy silently
  erases their change. Prefer a comment to rewriting a body.
* **A docs change and its issue/map sync ship together.** When a PR changes an ADR, `CONTEXT.md`,
  `CONTRIBUTING.md` or `docs/spec.md` in a way record propagation covers, post the issue and map
  updates in the same task, say they land with the PR (`Lands with #<pr>`), and list them in the
  PR description. If the PR closes unmerged, withdraw those updates.
* **Never force-push `main` or rewrite published history** unless Ahmad asks for it explicitly.
* Never commit secrets: `.env` stays untracked; only `.env.example` is committed.

## Project rules that are easy to miss

Full versions in `CONTRIBUTING.md`; these are the ones most often forgotten.

* **Conventional Commits** for commit messages and PR titles (`feat:`, `fix:`, `chore:`, `docs:`,
  `test:`, `refactor:`).
* **Schema gate**: a PR touching `prisma/**`, `prisma.config.ts` or the seed is reviewed by Kamel
  (by Ahmad when Kamel wrote it or is blocked for more than 24 hours). Migrations on `main` are
  never edited; fix forward. `prisma`/`@prisma/client` stay on `^7`. `prisma.config.ts` is the only
  Prisma Config.
* **Clean-clone boot** in two fresh clones for any PR touching `prisma/**`, `prisma.config.ts`, a
  Compose file or a Dockerfile.
* **Personal data** changes move `docs/legal/privacy-policy.md` in the same PR.
* **Dates are absolute** (`2026-09-27`), never "today" or "last week".
* `prototype/*` and `research/*` branches stay out of `main`; ADRs cite them as sources.

## Agent skills

### Issue tracker

Issues are tracked as GitHub issues (uses the `gh` CLI). See `docs/agents/issue-tracker.md`.
`/wayfinder` reads that file and this one **before** touching an ADR, the map, or any issue;
propagation is part of its Definition of Done.

### Domain docs

Single-context layout: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

