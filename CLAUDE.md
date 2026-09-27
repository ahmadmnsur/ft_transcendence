@AGENTS.md

## Claude Code

`AGENTS.md` above is the one rulebook for every tool; add shared rules there, not here.
`.claude/settings.json` turns off Claude Code's own commit and PR attribution for everyone, and its
hook refuses a commit or push that would break *Nothing published may show AI involvement* or
*One ticket, one branch, one PR*. A second hook (`after-git.sh`) names the issue after each push
of a work branch, and the squash commit after each `gh pr merge`, so issues and the map are
updated and their *(uncommitted)* notes closed. Personal settings go in `.claude/settings.local.json`, which
`.claude/.gitignore` keeps out of git.
