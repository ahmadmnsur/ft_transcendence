#!/usr/bin/env bash
# PreToolUse hook for Bash. Refuses, before it runs:
#   - a commit, PR, issue or API write whose text (inline, or in a file it reads) carries AI or bot
#     attribution (AGENTS.md → No AI or bot attribution in records);
#   - a commit on main, and a push to main (AGENTS.md → One ticket, one branch, one PR).
# Only commands that run count, not text that mentions them. Exit 2 blocks the command and shows
# the message to the agent. Needs bash, grep and awk.

. "${BASH_SOURCE%/*}/lib.sh"

pattern='co-authored-by:[^<"'\'']*(claude|anthropic|\[bot\]|copilot|openai|codex|coderabbit|gemini)|generated with[^"'\''&;|]*(claude|ai\b|codex|copilot)|noreply@anthropic\.com|claude\.ai/code|summary by coderabbit|auto-generated comment|@coderabbitai summary'

block() { echo "Blocked by .claude/hooks/guard-git.sh: $1" >&2; exit 2; }

writes=0
files=()

# read_files <dir>: remembers the files the write in `w` takes its text from: --body-file, --file,
# --input, -F (gh's -F name=@file too) and $(cat <file>), resolved against <dir>.
read_files() {
  local i f cat_re='\$\(cat[[:space:]]+([^)]+)\)'
  for ((i = 1; i < ${#w[@]}; i++)); do
    f=""
    case ${w[i]} in
      --body-file | --file | --input | -F) f=${w[i+1]} ;;
      --body-file=* | --file=* | --input=*) f=${w[i]#*=} ;;
    esac
    [[ $f == *=@* ]] && f=${f#*=@}
    [ -n "$f" ] && [ "$f" != - ] && files+=("$(in_dir "$1" "$f")")
    [[ ${w[i]} =~ $cat_re ]] && files+=("$(in_dir "$1" "${BASH_REMATCH[1]}")")
  done
}

# gh api writes when it names a method other than GET or passes fields, which make it POST.
api_writes() {
  local i
  for ((i = 2; i < ${#w[@]}; i++)); do
    case ${w[i]} in
      -X | --method) [[ ${w[i+1]^^} != GET ]] && return 0 ;;
      -X* | --method=*) [[ ${w[i]^^} != *GET ]] && return 0 ;;
      -f* | -F* | --field* | --raw-field* | --input*) return 0 ;;
    esac
  done
  return 1
}

check_push() {
  local cur r dst remote="" all=0 tags=0 refs=() i=0 redirect='^[0-9]*[<>]+$'
  cur=$(branch_of "$gdir")
  while [ $i -lt ${#args[@]} ]; do
    r=${args[i]}; i=$((i + 1))
    case $r in
      --all | --mirror | --branches) all=1 ;;
      --tags) tags=1 ;;
      -o | --push-option | --repo | --receive-pack | --exec) i=$((i + 1)) ;;
      -*) ;;
      *[\<\>]*) [[ $r =~ $redirect ]] && i=$((i + 1)) ;; # `2>` and its file
      *) if [ -z "$remote" ]; then remote=$r; else refs+=("$r"); fi ;;
    esac
  done
  [ $all = 1 ] && block "this pushes every branch, main included. Push your own branch by name (AGENTS.md)."
  if [ ${#refs[@]} -eq 0 ]; then
    [ $tags = 0 ] && [ "$cur" = main ] &&
      block "you are on main, so this pushes main. Changes reach main only through a reviewed, squash-merged PR (AGENTS.md)."
    return
  fi
  for r in "${refs[@]}"; do
    r=${r#+}
    [ "$r" = : ] && block "this pushes every matching branch, main included. Push your own branch by name (AGENTS.md)."
    dst=${r##*:}
    case $dst in HEAD | @) dst=$cur ;; esac
    [ "${dst#refs/heads/}" = main ] &&
      block "pushing to main. Changes reach main only through a reviewed, squash-merged PR (AGENTS.md)."
  done
}

check() {
  case ${w[0]} in
    git)
      git_parse || return
      case $sub in
        commit)
          [ "$(branch_of "$gdir")" = main ] &&
            block "you are on main. Every ticket is implemented on its own branch: git switch -c <type>/<slice>-<short> (AGENTS.md)."
          writes=1; read_files "$gdir" ;;
        push) check_push ;;
      esac ;;
    gh)
      if [[ "${w[1]} ${w[2]}" =~ ^(pr\ (create|edit|comment|close|reopen|review|merge)|issue\ (create|edit|comment|close|reopen))$ ]] ||
         { [ "${w[1]}" = api ] && api_writes; }; then
        writes=1; read_files "$at"
      fi ;;
  esac
}

walk check

if [ $writes = 1 ]; then
  printf '%s' "$cmd" | grep -Eiq "$pattern" &&
    block "the text carries AI or bot attribution. Remove it (AGENTS.md → No AI or bot attribution in records)."
  for f in "${files[@]}"; do
    [ -f "$f" ] && grep -Eiq "$pattern" "$f" &&
      block "$f carries AI or bot attribution. Remove it (AGENTS.md → No AI or bot attribution in records)."
  done
fi

exit 0
