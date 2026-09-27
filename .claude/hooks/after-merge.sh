#!/usr/bin/env bash
# PostToolUse hook for Bash. After `gh pr merge`, names the squash commit, so every record note the
# PR marked (uncommitted) gets its "Landed on main at <sha>" line (AGENTS.md → Local and GitHub
# stay in step). Never blocks anything. Needs bash, grep and awk; uses gh for the commit.

. "${BASH_SOURCE%/*}/lib.sh"

say() {
  local note=${1//\\/\\\\}
  note=${note//\"/\\\"}
  printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"%s"}}\n' "$note"
  exit 0
}

merged() {
  [ "${w[0]} ${w[1]} ${w[2]}" = "gh pr merge" ] || return
  local pr="" auto="" i info n state sha issues
  for ((i = 3; i < ${#w[@]}; i++)); do
    case ${w[i]} in
      --auto) auto=1 ;;
      -b | --body | -F | --body-file | -t | --subject | -A | --author-email | --match-head-commit | -R | --repo) i=$((i + 1)) ;;
      -*) ;;
      *) [ -z "$pr" ] && pr=${w[i]#\#} ;;
    esac
  done
  info=$(cd "$at" && timeout 10 gh pr view $pr --json number,state,mergeCommit,body \
    --jq '"\(.number)|\(.state)|\(.mergeCommit.oid // "" | .[0:7])|\(.body)"' 2>/dev/null)
  IFS='|' read -r n state sha _ <<< "$info"
  issues=$(printf '%s' "$info" | grep -Eio '(close[sd]?|fix(e[sd])?|resolve[sd]?)[[:space:]]+#[0-9]+' |
    grep -Eo '#[0-9]+' | sort -u | tr '\n' ' ')
  case $state in
    MERGED) say "PR #$n was merged as $sha on main${issues:+ and closes ${issues% }}. If it carried record notes marked (uncommitted) on the map or an issue, add 'Landed on main at $sha' beside each; progress comments need nothing. Then update local main: git switch main && git pull (AGENTS.md → Local and GitHub stay in step)." ;;
    OPEN) say "PR #$n is not merged yet${auto:+: auto-merge waits for its checks and review}. Its (uncommitted) notes stay as they are until it lands on main." ;;
    CLOSED) say "PR #$n was closed without merging. Annotate its (uncommitted) record notes as withdrawn, never delete them (AGENTS.md → Local and GitHub stay in step)." ;;
    *) say "The state of PR ${pr:+#$pr }could not be looked up. Check it with gh pr view <n> --json state,mergeCommit; if it merged, add 'Landed on main at <sha>' beside every record note it marked (uncommitted) (AGENTS.md → Local and GitHub stay in step)." ;;
  esac
}

walk merged
exit 0
