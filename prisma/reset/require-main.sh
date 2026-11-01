#!/bin/sh
set -eu

refuse() {
  echo "make reset-team refused: $1. Nothing was deleted." >&2
  exit 1
}

branch=$(git symbolic-ref --quiet HEAD) || refuse "the checkout is on no branch; run git switch main && git pull"
[ "$branch" = refs/heads/main ] || refuse "the checkout is on ${branch#refs/heads/}, not main; run git switch main && git pull"
changes=$(git status --porcelain --untracked-files=all) || refuse "git status failed"
[ -z "$changes" ] || refuse "the checkout has uncommitted changes; commit, stash or remove them (git status -uall lists them)"
git fetch --quiet origin +refs/heads/main:refs/remotes/origin/main || refuse "git fetch origin main failed"
here=$(git rev-parse --verify --quiet HEAD) || refuse "git rev-parse HEAD failed"
there=$(git rev-parse --verify --quiet refs/remotes/origin/main) || refuse "git rev-parse origin/main failed"
[ "$here" = "$there" ] || refuse "main differs from origin/main after a fetch; run git pull, or move main's own commits to a branch"
