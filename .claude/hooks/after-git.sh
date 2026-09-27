#!/usr/bin/env bash
# PostToolUse hook for Bash. Keeps local Markdown, origin/main and the issues/map in step
# (AGENTS.md → Local and GitHub stay in step). Never blocks anything; it only tells the agent:
#   - after `git push` of a work branch: which issue the branch belongs to, so it gets updated;
#   - after `gh pr merge`: the squash commit, so the PR's (uncommitted) notes get closed.
# Needs bash and grep; uses gh when present for the PR and issue numbers.

input=$(cat)
cmd=$(printf '%s' "$input" | grep -o '"command"[[:space:]]*:[[:space:]]*"\([^"\\]\|\\.\)*"' | head -1)
[ -z "$cmd" ] && exit 0
dir=${CLAUDE_PROJECT_DIR:-.}

say() {
  local note=${1//\\/\\\\}; note=${note//\"/\\\"}
  printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"%s"}}\n' "$note"
  exit 0
}
closes() { grep -Eio '(close[sd]?|fix(e[sd])?|resolve[sd]?)[[:space:]]+#[0-9]+' | grep -Eo '#[0-9]+' | sort -u | tr '\n' ' '; }
have_gh() { command -v gh >/dev/null 2>&1; }

# After a merge: name the squash commit so every (uncommitted) note gets its "Landed" line.
if printf '%s' "$cmd" | grep -Eq 'gh[[:space:]]+pr[[:space:]]+merge'; then
  n=$(printf '%s' "$cmd" | grep -Eo 'gh[[:space:]]+pr[[:space:]]+merge[[:space:]]+#?[0-9]+' | grep -Eo '[0-9]+$')
  sha=""; issues=""
  if have_gh; then
    info=$(cd "$dir" && timeout 10 gh pr view $n --json number,mergeCommit,body \
      --jq '"\(.number) \(.mergeCommit.oid // "" | .[0:7]) \(.body)"' 2>/dev/null)
    n=${n:-${info%% *}}; rest=${info#* }; sha=${rest%% *}
    issues=$(printf '%s' "$info" | closes)
  fi
  say "PR #${n:-?} was just merged${sha:+ as $sha on main}${issues:+; it closes ${issues% }}. In this project the loop closes after a merge: every issue and map note this PR marked (uncommitted) gets a 'Landed on main at ${sha:-<sha>}' line beside it, and local main is updated with git switch main && git pull (AGENTS.md)."
fi

# After a push of a work branch: name the issue it belongs to.
printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push' || exit 0
branch=$(git -C "$dir" branch --show-current 2>/dev/null)
{ [ -z "$branch" ] || [ "$branch" = "main" ]; } && exit 0

pr=""; issues=""
if have_gh; then
  line=$(cd "$dir" && timeout 10 gh pr list --head "$branch" --state open --json number,body \
    --jq '.[0] | select(.) | "\(.number) \(.body)"' 2>/dev/null)
  pr=${line%% *}
  issues=$(printf '%s' "$line" | closes)
fi

if [ -n "$issues" ]; then
  say "Branch $branch was just pushed. Its PR #$pr closes issue(s) ${issues% }. This project keeps each ticket's issue in step with every push: a comment on the issue saying what this push did, which acceptance criteria are now met and what remains, and an edit of the issue body if the work changed the ticket (AGENTS.md)."
elif [ -n "$pr" ]; then
  say "Branch $branch was just pushed. Its PR #$pr names no issue with Closes #<n>. If this work belongs to a ticket, the PR description needs Closes #<n> and the issue gets a comment on what this push did (AGENTS.md)."
else
  say "Branch $branch was just pushed and has no open PR yet. This project keeps the ticket's issue in step with every push: a comment on the issue saying what this push did and which acceptance criteria are now met (AGENTS.md)."
fi
