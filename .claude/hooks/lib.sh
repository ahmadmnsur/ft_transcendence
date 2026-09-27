# Sourced by the hooks in this directory. Reads the hook input and splits its Bash command into the
# simple commands that will run, so a hook judges `git push …` the command, never the same words in
# a grep, a commit message or a heredoc. Needs bash, grep and awk.

hook_input=$(cat)

# json_string <key>: the first "<key>": "<string>" in the hook input, with JSON escapes undone.
json_string() {
  local s
  s=$(printf '%s' "$hook_input" | grep -o "\"$1\""'[[:space:]]*:[[:space:]]*"\([^"\\]\|\\.\)*"' | head -1)
  [ -n "$s" ] || return 1
  s=${s#*:}; s=${s#*\"}; s=${s%\"}
  s=${s//\\\\/$'\x01'}; s=${s//\\n/$'\n'}; s=${s//\\t/$'\t'}; s=${s//\\\"/\"}
  printf '%s' "${s//$'\x01'/\\}"
}

cmd=$(json_string command) || exit 0
# The directory the command starts in. The input's cwd follows `cd` and worktrees;
# CLAUDE_PROJECT_DIR stays where the session started.
here=$(json_string cwd) && [ -d "$here" ] || here=${CLAUDE_PROJECT_DIR:-$PWD}

# commands: each simple command in $cmd on its own line, its words separated by \037. Splits at
# unquoted ; & | ( ) ` and line breaks, removes quotes as the shell does, drops comments and skips
# heredoc bodies. Not a full shell parser; close enough that quoted text is never taken for a command.
commands() {
  printf '%s\n' "$cmd" | awk '
    function word_end() { if (w != "" || quoted) out = out (out == "" ? "" : "\037") w; w = ""; quoted = 0 }
    function cmd_end() { word_end(); if (out != "") print out; out = "" }
    {
      line = $0
      if (body != "") { t = line; if (strip) sub(/^\t+/, "", t); if (t == body) body = ""; next }
      n = length(line); cont = 0
      for (i = 1; i <= n; i++) {
        c = substr(line, i, 1)
        if (q == "\047") { if (c == "\047") q = ""; else w = w c; continue }
        if (substr(line, i, 2) == "<<" && substr(line, i + 2, 1) != "<") {
          j = i + 2; ps = 0
          if (substr(line, j, 1) == "-") { ps = 1; j++ }
          while (substr(line, j, 1) == " ") j++
          ch = substr(line, j, 1)
          if (ch == "\047" || ch == "\"") {
            k = index(substr(line, j + 1), ch); tag = substr(line, j + 1, k - 1); j = j + k + 1
          } else if (match(substr(line, j), /^[A-Za-z_][A-Za-z0-9_]*/)) {
            tag = substr(line, j, RLENGTH); j = j + RLENGTH
          } else tag = ""
          if (tag != "") { pending = tag; pstrip = ps; i = j - 1; continue }
        }
        if (c == "\\") {
          if (i == n) { cont = 1; continue }
          d = substr(line, i + 1, 1)
          if (q == "\"" && index("\"\\$`", d) == 0) w = w c
          w = w d; i++; continue
        }
        if (q == "\"") { if (c == "\"") q = ""; else w = w c; continue }
        if (c == "\047" || c == "\"") { q = c; quoted = 1; continue }
        if (c == "#" && w == "" && !quoted) break
        if (c == " " || c == "\t") { word_end(); continue }
        if (index(";&|()`", c)) { cmd_end(); continue }
        w = w c
      }
      if (pending != "") { body = pending; strip = pstrip; pending = "" }
      if (q != "") w = w " "
      else if (cont) word_end()
      else cmd_end()
    }
    END { cmd_end() }'
}

# in_dir <dir> <path>: <path> resolved against <dir>, with ~ expanded.
in_dir() {
  case $2 in
    "~" | "~/"*) printf '%s' "$HOME${2#\~}" ;;
    /*) printf '%s' "$2" ;;
    *) printf '%s' "$1/$2" ;;
  esac
}

branch_of() { git -C "$1" branch --show-current 2>/dev/null; }

# walk <fn>: calls <fn> once per simple command, with its words in the array `w` (leading VAR=value
# assignments dropped) and the directory it runs in as `at`, following `cd`.
walk() {
  local line at=$here to
  while IFS= read -r line; do
    IFS=$'\037' read -r -a w <<< "$line"
    while [ ${#w[@]} -gt 0 ] && [[ ${w[0]} =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; do w=("${w[@]:1}"); done
    [ ${#w[@]} -eq 0 ] && continue
    if [ "${w[0]}" = cd ]; then
      to=${w[1]:-$HOME}
      [ "$to" = - ] && continue
      to=$(in_dir "$at" "$to")
      [ -d "$to" ] && at=$to
      continue
    fi
    "$1"
  done < <(commands)
}

# git_parse: for a git command in `w`, sets `sub` (the subcommand), `args` (the words after it) and
# `gdir` (the repository it acts on: `at`, or where -C points). Fails when there is no subcommand.
git_parse() {
  local i=1
  gdir=$at; sub=""; args=()
  while [ $i -lt ${#w[@]} ]; do
    case ${w[i]} in
      -C) gdir=$(in_dir "$gdir" "${w[i+1]}"); i=$((i + 2)) ;;
      -c | --git-dir | --work-tree | --namespace) i=$((i + 2)) ;;
      -*) i=$((i + 1)) ;;
      *) sub=${w[i]}; args=("${w[@]:i+1}"); return 0 ;;
    esac
  done
  return 1
}
