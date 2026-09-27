@AGENTS.md

## Claude Code

`AGENTS.md` above is the one rulebook for every tool; add shared rules there, not here.
`.claude/settings.json` turns off Claude Code's own commit and PR attribution for everyone, and runs
two hooks. `guard-git.sh` refuses a commit or push that would break *No AI or bot attribution in
records* or *One ticket, one branch, one PR*. `after-merge.sh` names the squash commit after each
`gh pr merge`, so the PR's *(uncommitted)* record notes get their *Landed on main* line. Both judge
only commands that run, never text that mentions them; `lib.sh` holds the parsing they share.
Personal settings go in `.claude/settings.local.json`, which `.claude/.gitignore` keeps out of git.
