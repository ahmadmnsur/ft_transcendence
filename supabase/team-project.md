# The team Supabase project

PeerConnect's team project is **PeerConnect**, in the organization **FT_TRANSCENDENCE** (Free plan),
in Frankfurt (`eu-central-1`). It runs `main` and the defense; branch work that changes the database
runs on the local fallback instead ([ADR-0004](../docs/adr/0004-deployment-shape.md) d8).

Its settings live in its dashboard, outside git, so no pull request ever shows them. This file is
their record. It sits inside the schema gate, and a setting changes here before it changes in the
dashboard ([ADR-0005](../docs/adr/0005-prisma-and-the-schema-gate.md) d5).

> **Not built yet, as of 2026-10-10:** the boot check's steps 3 and 4, so a team `.env` still stops
> the boot before any connection, and `make up` neither migrates the team project nor reports a
> `540`; the bucket step ([Avatars, and PNG/JPEG byte validation](https://github.com/ahmadmnsur/ft_transcendence/issues/43)); and the two reset
> commands, whose ticket is not opened yet ([Rewrite the affected build tickets for Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/104) lists them).
> The ADRs record what each will do, and the steps below that use them wait for them.

## Members

| Member | Role      | In the dashboard                                                                                                                      |
| ------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Kamel  | Owner     | everything, including resuming a paused project                                                                                       |
| Ahmad  | Developer | reads everything, runs SQL, edits rows, creates and deletes Supabase Auth users, changes buckets and their files, reads the keys; cannot change the project's settings (Auth, database, API, Storage's upload limit), or pause and resume |

So the dashboard stops a Developer at the project's settings and at the project itself (pausing,
deleting, transferring), not at its data, its Supabase Auth users or its keys (Supabase's
access-control table, read 2026-10-09, for the API and the dashboard alike). Read-only, the role that could not
do the rest, is offered only on the Team and Enterprise plans. Anyone holding the team `.env`, the
project's two members and each evaluator, can also do anything through the API with its secret
key and database password. The rules below are the team's, not the dashboard's.

## What is set

Last checked by Kamel on 2026-10-10.

**Project**

| Setting                        | Value                                    |
| ------------------------------ | ---------------------------------------- |
| Region                         | Frankfurt (`eu-central-1`)               |
| Data API                       | off, so no table is exposed to it        |
| Automatic RLS on new tables    | off                                      |
| GitHub integration             | none; no integration runs migrations     |

**Database**

| Setting                               | Value                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Enforce SSL on incoming connections   | on                                                                       |
| Connection the `api` and `prisma migrate` use | the session pooler, port 5432, one `DATABASE_URL`                |
| Session-mode Pool Size                | 15, the default; each stack's `api` opens at most 5 connections          |

**Authentication**, with the line in `compose.yaml` that gives the local fallback the same behaviour:

| Setting                                              | Value                                 | Fallback                                                                       |
| ---------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| Allow new users to sign up                           | off                                   | `GOTRUE_DISABLE_SIGNUP: "true"`                                                |
| Minimum password length                              | 8, with no character rule             | `GOTRUE_PASSWORD_MIN_LENGTH: 8`                                                |
| Email provider                                       | on; the password sign-in needs it     | `GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"`                                        |
| Confirm email                                        | off                                   | `GOTRUE_MAILER_AUTOCONFIRM: "true"`                                            |
| Audit Logs → Write audit logs to the database        | off                                   | `GOTRUE_AUDIT_LOG_DISABLE_POSTGRES: "true"`                                    |
| Every other sign-in method: phone, anonymous, OAuth  | off; Sign in with 42 runs in NestJS   | `GOTRUE_EXTERNAL_PHONE_ENABLED: "false"`, `GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED: "false"` |

**Not recorded here**

- **The Storage buckets.** The seed's first step creates `avatars` and `evidence` and sets back any
  setting that differs, so a bucket changed in the dashboard is restored at the next boot (ADR-0004
  d11's note of 2026-10-05).
- **The keys and the database password.** They are only in the team `.env`, which is handed to the
  evaluator at the defense and never committed.

## Changing a setting

1. Open a pull request that changes this file and, where the table names one, the matching
   `GOTRUE_*` line in `compose.yaml`, so the fallback keeps behaving like the team project. It is
   inside the schema gate.
2. Once it merges, Kamel changes the dashboard and comments `Applied in the dashboard on <date>`
   on the merged pull request.

The dashboard goes first only to undo something broken, and the pull request follows the same day.

## Changes by hand

Nobody changes the team project's tables, rows, settings or Supabase Auth users by hand: not in
the dashboard, not in its SQL editor, not with the `.env`'s keys. Migrations reach it only through
`make up` on `main`. Reading is always fine.

There are four exceptions, and each is Kamel's:

1. **Resume a paused project.** A paused project answers `540`, and the boot check says so. Only
   the Owner can resume it, from the project's page in the dashboard.
2. **Run `make reset-team`.** It deletes the rows of our tables, every Supabase Auth user and every
   file in PeerConnect's buckets, and keeps the tables, settings, buckets and keys. It prints the
   project ref and asks for it to be typed before deleting anything (ADR-0004 d11). Run it when the
   seed's fixture changes, when the pre-defense run finds an account an earlier defense changed, or
   when a defense should start from the seed's end state. Prove it on the fallback first, with
   `make reset-local` under `make local`. It runs only from `main` with no uncommitted change,
   equal to `origin/main` after a fetch, and refuses otherwise, so switch to `main` and pull
   first. Stop every stack connected to the team project before the reset. Then run `make up`
   from the same checkout, and keep every other stack stopped until that boot has finished: it
   writes the seed's fixture, which takes several minutes against the team project.
3. **Delete a leftover Supabase Auth user**: one whose id no Student has. A crash between sign-up's
   two steps can leave one; it blocks nobody and nobody can sign in with it. Never delete a
   Supabase Auth user whose id a Student has, a Removed Student included: sign-in still checks
   that password (ADR-0008 d7, d9).
4. **Repair a migration that failed partway.** Every `make up` on `main` then stops with Prisma's
   `P3009` error.
   1. Stop every stack connected to the team project.
   2. Find which of the migration's statements ran: `_prisma_migrations` names the failed one;
      compare its SQL with the database.
   3. Either run its remaining statements by hand, then mark it applied; or undo the statements
      that ran, fix the cause (data the migration cannot convert, say), then mark it rolled back,
      so the next `make up` runs it again. The failed boot has stopped the `api`, so run Prisma in
      a one-off container, from the checkout that holds the team `.env`:

      ```bash
      docker compose run --rm --no-deps api npx prisma migrate resolve --applied <name> --config prisma.config.ts
      docker compose run --rm --no-deps api npx prisma migrate resolve --rolled-back <name> --config prisma.config.ts
      ```

      `run` replaces the boot chain, the `api` reads the team `.env` through its `env_file` list,
      `--no-deps` keeps the fallback's services from starting, and `prisma.config.ts` verifies the
      pooler's certificate as at boot.
   4. Any change the schema still needs is a new migration in a new pull request. Never edit the
      merged migration or `_prisma_migrations` by hand (ADR-0005 d6).

   Rehearse the repair on the fallback first, under `make local`.

## Before each defense

Kamel compares the dashboard with *What is set* above, and corrects any difference through
*Changing a setting*. This is one step of the pre-defense run.
