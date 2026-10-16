#!/bin/sh
# `make reset-team` runs only from an up-to-date main (§15.6 step 1): the reset
# is code, and the boot after it writes the fixture of whatever checkout runs
# `make up`. It runs on the host, before the reset's container, which has no
# git. `make reset-local` has no such check.
set -eu

refuse() {
  echo "make reset-team refused: $1. Nothing was deleted." >&2
  exit 1
}

branch=$(git symbolic-ref --quiet --short HEAD) || refuse "the checkout is on no branch; run git switch main && git pull"
[ "$branch" = main ] || refuse "the checkout is on $branch, not main; run git switch main && git pull"
# Untracked files count too, whatever status.showUntrackedFiles says: the image
# is built from this working tree.
[ -z "$(git status --porcelain --untracked-files=all)" ] || refuse "the checkout has uncommitted changes; commit, stash or remove them (git status lists them)"
# The refspec is spelled out so that origin/main is fresh even when the clone's
# fetch setting does not map main.
git fetch --quiet origin +refs/heads/main:refs/remotes/origin/main || refuse "git fetch origin main failed"
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || refuse "main differs from origin/main after a fetch; run git pull, or move main's own commits to a branch"
