#!/usr/bin/env bash
# PostToolUse hook for Bash. After a successful `git push` of a work branch, tells the agent which
# issue the branch belongs to, so the issue gets updated in the same task
# (AGENTS.md → The ticket's issue follows the code, every push). Never blocks anything.

input=$(cat)
printf '%s' "$input" | grep -Eq '"command"[[:space:]]*:[[:space:]]*"[^"]*git[[:space:]]+push' || exit 0

dir=${CLAUDE_PROJECT_DIR:-.}
branch=$(git -C "$dir" branch --show-current 2>/dev/null)
[ -z "$branch" ] || [ "$branch" = "main" ] && exit 0

# The open PR for this branch, and the issues its description closes. Best effort: no gh, no PR,
# or no network just means a shorter note.
pr=""; issues=""
if command -v gh >/dev/null 2>&1; then
  line=$(cd "$dir" && timeout 10 gh pr list --head "$branch" --state open --json number,body \
    --jq '.[0] | select(.) | "\(.number) \(.body)"' 2>/dev/null)
  pr=${line%% *}
  issues=$(printf '%s' "$line" | grep -Eio '(close[sd]?|fix(e[sd])?|resolve[sd]?)[[:space:]]+#[0-9]+' \
    | grep -Eo '#[0-9]+' | sort -u | tr '\n' ' ')
fi

if [ -n "$issues" ]; then
  note="Branch $branch was just pushed. Its PR #$pr closes issue(s) ${issues% }. This project keeps each ticket's issue in step with every push: a comment on the issue saying what this push did, which acceptance criteria are now met and what remains, and an edit of the issue body if the work changed the ticket (AGENTS.md)."
elif [ -n "$pr" ]; then
  note="Branch $branch was just pushed. Its PR #$pr names no issue with Closes #<n>. If this work belongs to a ticket, the PR description needs Closes #<n> and the issue gets a comment on what this push did (AGENTS.md)."
else
  note="Branch $branch was just pushed and has no open PR yet. This project keeps the ticket's issue in step with every push: a comment on the issue saying what this push did and which acceptance criteria are now met (AGENTS.md)."
fi

note=${note//\\/\\\\}; note=${note//\"/\\\"}
printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"%s"}}\n' "$note"
