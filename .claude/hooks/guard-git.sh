#!/usr/bin/env bash
# PreToolUse hook for Bash. Refuses, before it runs:
#   - a commit, PR or issue write whose text (inline or in a --body-file / -F file) carries AI or
#     bot attribution (AGENTS.md → Nothing published may show AI involvement);
#   - a commit made while on main, and a push to main (AGENTS.md → One ticket, one branch, one PR).
# Exit 2 blocks the command and shows the message to the agent. Needs only bash and grep.

input=$(cat)
pattern='co-authored-by:[^"]*(claude|anthropic|\[bot\]|copilot|openai|codex|coderabbit|gemini)|generated with[^"]*(claude|ai\b|codex|copilot)|noreply@anthropic\.com|claude\.ai/code|summary by coderabbit|auto-generated comment|@coderabbitai summary'

block() { echo "Blocked by .claude/hooks/guard-git.sh: $1" >&2; exit 2; }

# Only the command itself matters; the rest of the hook input is metadata.
cmd=$(printf '%s' "$input" | grep -o '"command"[[:space:]]*:[[:space:]]*"\([^"\\]\|\\.\)*"' | head -1)
[ -z "$cmd" ] && exit 0

writes='git[[:space:]]+commit|gh[[:space:]]+(pr|issue)[[:space:]]+(create|edit|comment|close|review)|gh[[:space:]]+api'
if printf '%s' "$cmd" | grep -Eq "$writes"; then
  if printf '%s' "$cmd" | grep -Eiq "$pattern"; then
    block "the text contains AI or bot attribution. Remove it; nothing published may show AI involvement (AGENTS.md)."
  fi
  # Text passed through a file: --body-file <f>, -F <f>, --file <f>, -F body=@<f>.
  for f in $(printf '%s' "$cmd" | grep -Eo '(--body-file|--file|-F)[= ]+[^ "\\]+' | sed -E 's/^(--body-file|--file|-F)[= ]+//; s/^[a-z_]+=@//'); do
    [ -f "$f" ] && grep -Eiq "$pattern" "$f" && block "$f contains AI or bot attribution. Remove it; nothing published may show AI involvement (AGENTS.md)."
  done
fi

dir=${CLAUDE_PROJECT_DIR:-.}
branch=$(git -C "$dir" branch --show-current 2>/dev/null)

if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+commit' && [ "$branch" = "main" ]; then
  block "you are on main. Every ticket is implemented on its own branch: git switch -c <type>/<slice>-<short> (AGENTS.md)."
fi

if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push'; then
  if printf '%s' "$cmd" | grep -Eq '(:|[[:space:]])(refs/heads/)?main([[:space:]"]|$)' \
     || { [ "$branch" = "main" ] && ! printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push[^"]*[[:space:]][A-Za-z0-9._/-]+[[:space:]]+[A-Za-z0-9._/-]+'; }; then
    block "pushing to main. Changes reach main only through a reviewed, squash-merged PR (AGENTS.md)."
  fi
fi

exit 0
