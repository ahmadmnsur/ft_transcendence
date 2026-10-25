# Supabase hosts the database, the files and the passwords; PeerConnect keeps the rest

Until the move was decided on 2026-09-30, the design kept every copy's data on the computer that
started it: Postgres in a Compose volume (ADR-0004 d1), avatar and Evidence bytes in `bytea` columns
(ADR-0009 d2), and argon2id password hashes in `Student.password_hash` (ADR-0003 d3). Nothing was
stored online. Each member's copy began from the seed and held only what was done on that computer.

As Technical Lead, Kamel saw two things missing: **one copy of the data that the whole team
shares**, the same from any member's computer and at the defense, and **a hosted place for that
data**, so that putting PeerConnect online later does not start from a database on someone's
laptop. The team agreed in chat on 2026-09-30 to move the database, the file storage and the login
to Supabase, keeping Socket.IO, and [Map: PeerConnect moves to Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/85) charted the move the same day. Supabase was the first
choice for a hosted database with file storage beside it. No other provider was compared: the four
research tickets checked that Supabase fits PeerConnect, not how it ranks against others.

**The part a reader will ask about: PeerConnect uses almost none of what Supabase offers for
building an application.** Supabase offers a whole backend: its own sessions and tokens, a client
library for the browser, an API generated from the tables with row-level security, Realtime,
sign-in through outside providers, and email. PeerConnect uses three of its stores and nothing else:
its Postgres as the database, Storage as a private file store, and Auth as the place where each
password is kept and checked. Everything that decides something stays code the team wrote: NestJS,
Prisma, the `Session` row and its cookie, Socket.IO, and Sign in with 42. That is deliberate. Four
claimed modules rest on that code: the ORM (`document/en.subject.md:516`), WebSockets (`:490`),
OAuth (`:620`) and file upload (`:536`). Supabase's Realtime and its sign-in would have replaced the
code that two of them are scored on. And the legal pages promise that the browser talks to
PeerConnect alone (ADR-0018 d5).

The shape we chose: **Supabase stores, and PeerConnect decides.**

Settled ticket by ticket on that map between 2026-09-30 and 2026-10-11, by Kamel as Technical Lead,
except [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91) and [Settle what the database stores in French and Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/95), which Ahmad settled. Each decision below is a summary. The rule itself
is in the note it names, inside the ADR it changes, and in its ticket's resolution. A later change
annotates the note, the resolution and, where its summary no longer holds, this ADR.

## What this ADR changes in earlier records

Every change below is already written as a dated note where the old wording is read, added by the
ticket that settled it, so this ADR adds no rule to them. The list is the audit [Write the Supabase ADR and annotate the ADRs it changes](https://github.com/ahmadmnsur/ft_transcendence/issues/102) asked
for, checked against every ADR on 2026-10-12.

- **ADR-0003**: decision 1 (the token a password check returns lives only inside that request),
  decision 3 (Supabase's bcrypt replaces argon2id; a password is 8 characters to 72 bytes),
  decision 5 (resolving a session reads PeerConnect's tables only), decision 6 (a password change
  signs out twice and moves `password_version`), decision 10 (sign-in gives the real reason, a
  sanction only after the right password) and decision 11 (it stands; password reset by email is
  out of scope), plus the notes on Sign in with 42. From [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91), [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92) and [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93).

  > **Changed 2026-10-25 by ADR-0003 d10's note of that date**: the sign-in page shows a wrong
  > email and a wrong password one sentence, so it no longer tells which one is wrong. Decision 5's
  > note below has the detail.

- **ADR-0004**: the team project and the local fallback (the top note, decisions 1, 8, 9 and 11, and
  the first *Consequence*); "no deployed environment" qualified, since the team project is hosted
  infrastructure; `.env.example` at 27 entries; the boot check, the session pooler, verified TLS
  and the pool cap; the evaluator no longer handed the `.env`; and the module amendment's 42
  questions answered. From [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101), [Local Supabase fallback: Compose services, make targets, environment check and CI](https://github.com/ahmadmnsur/ft_transcendence/issues/121), [Team project database: verified TLS and the api's pool cap](https://github.com/ahmadmnsur/ft_transcendence/issues/124), [Settle how avatars and Evidence are stored and served on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/94), [Settle how the seed creates accounts and files on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/98), [Settle how tests and CI run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/99), [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100), [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93)
  and [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91).
- **ADR-0005**: decision 5's gate also covers `supabase/**`, every `compose*.yaml`, the buckets'
  settings and `prisma/reset/**`; decision 6 is corrected, since `prisma migrate deploy` skips an
  edited migration rather than refusing it; and *Not settled* notes that decision 5's note completes
  the path list a `CODEOWNERS` file would map. From [Settle how the schema gate covers Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/97).
- **ADR-0008**: decisions 5, 7, 8, 9 and 12. No sanction writes to Supabase Auth, a Removed
  Student's hash is kept, an Admin still sets no password, nobody deletes a Student's Supabase Auth
  user outside a reset or the seed's guarded run, and the bootstrap accounts go through Supabase's
  admin create. From [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92), [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93), [Settle how the schema gate covers Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/97), [Settle how the seed creates accounts and files on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/98) and [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100).
- **ADR-0009**: decision 2 is replaced, since the bytes live in two private Storage buckets; and
  decisions 5 and 6, *What this ADR changes in earlier records* and the second-volume option carry
  notes. From [Settle how avatars and Evidence are stored and served on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/94).
- **ADR-0014**: still nineteen tables and nine enums. `password_hash` becomes `password_version`;
  `display_name_search` and `forty_two_id` are added; `Avatar` and `Evidence` drop `bytes`; three
  ids lose their Prisma default; decision 12's `bytea` argument is marked historical. From [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91),
  [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92), [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93), [Settle how avatars and Evidence are stored and served on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/94), [Settle what the database stores in French and Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/95), [Settle which tables change for Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/96) and [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100).
- **ADR-0016**: decision 1 (real Supabase, never a stand-in; the eleventh and twelfth categories;
  four checks in `08-files`), decisions 5 and 6 (the clean-clone triggers and the gate box),
  decision 7 (the eleventh and twelfth categories and the two Sign in with 42 checks, counted
  against its closed list), decision 8 (CI starts Supabase's containers) and *Not settled*. From [Settle how tests and CI run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/99), [Settle how avatars and Evidence are stored and served on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/94), [Settle what the database stores in French and Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/95),
  [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93), [Settle how the schema gate covers Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/97) and [Settle how the seed creates accounts and files on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/98).
- **ADR-0017**: decision 10 (what a run that writes the fixture empties, its guard, the completion
  record, the lock's own connection, and minutes on the team project). From [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101) and [Settle how the seed creates accounts and files on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/98).
- **ADR-0018**: the top note, decisions 1, 3, 5, 6, 7, 8, 12 and 13, *Consequences* and *Not
  settled*: two kinds of copy, Supabase named as the host of the team's copy, Supabase Auth's
  records and Supabase's logs disclosed, no backups the team can restore, the 42 field settled and
  the 42 sentence worded. From [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91), [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93), [Settle how avatars and Evidence are stored and served on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/94)
  and [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100).

The audit added these notes, dated 2026-10-12, and one dated 2026-10-13 after review:

- **A pointer to this ADR** under the top note of ADR-0003, ADR-0004, ADR-0008, ADR-0009, ADR-0014
  and ADR-0018, each of which said that [Write the Supabase ADR and annotate the ADRs it changes](https://github.com/ahmadmnsur/ft_transcendence/issues/102) would record what the move changes.
- **A top note on ADR-0005, ADR-0016 and ADR-0017**, which carried their Supabase notes only
  inside decisions, naming those decisions.
- **ADR-0015**: the 42 questions its last *Consequence* hands to [Settle how a 42 identity maps to a Student](https://github.com/ahmadmnsur/ft_transcendence/issues/24) were answered by [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93) on
  2026-10-08, and [Settle how a 42 identity maps to a Student](https://github.com/ahmadmnsur/ft_transcendence/issues/24) closed on 2026-10-12.
- **ADR-0017**: `.env.example` has 27 entries, not fifteen (ADR-0004 d9), and decision 6's shared
  password is a Supabase Auth password of 8 characters to 72 bytes.

  > **Twenty-eight since 2026-10-25** (ADR-0004 d9's note of that date, from [Open make up to the local network when a member's .env asks](https://github.com/ahmadmnsur/ft_transcendence/issues/223)):
  > `BIND_ADDRESS` joins them.

- **ADR-0013** (2026-10-13): decision 5 says ADR-0009 put Evidence in Postgres so that every read
  passes through NestJS. Since [Settle how avatars and Evidence are stored and served on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/94) settled it on 2026-10-05, Evidence goes in a private Storage
  bucket, and every read still passes through NestJS (ADR-0009 d2's note), so the decision stands.

Unaffected:

- **ADR-0011**: decision 7's action request re-runs ADR-0003's session, role and sanction check,
  which [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91) kept reading PeerConnect's tables only.
- **ADR-0001, ADR-0002, ADR-0006, ADR-0007, ADR-0010, ADR-0012, the rest of ADR-0013 and the rest
  of ADR-0015**: their domain rules do not depend on where the data is stored, and what they rest
  on carries over. Postgres's `SERIALIZABLE` transactions and the retry on `40001` and `40P01` run
  unchanged through the session pooler (decision 3). Student ids still follow creation order,
  since NestJS makes them as UUIDv7 ([Settle which tables change for Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/96#issuecomment-6100214046)), which the tie-breaks of ADR-0006 d9 and
  ADR-0010 d6 rely on. And NestJS stays the only way to the data (decision 1).
- **`CONTEXT.md`**: no term changes. "Supabase Auth user" and "Supabase Auth session" name
  infrastructure, not domain language, as the resolutions of [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91#issuecomment-5913893382) (decision 7) and
  [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92#issuecomment-5941374186) (decision 1) say.

## The decisions

1. **Supabase is three stores, and nothing more.**

   - **Postgres** is the team project's database, reached through Prisma as before.
   - **Storage** holds avatars and Evidence in two private buckets.
   - **Auth** holds one Supabase Auth user per Student, which keeps that Student's password.

   Not used: Supabase's sessions and tokens beyond one request, its browser client, the Data API
   and row-level security, Realtime, sign-in through outside providers, its email, and Edge
   Functions. NestJS, Prisma and Socket.IO stay as the ADRs have them. The browser never talks to
   Supabase: `web/` has no `@supabase/*` package and no `VITE_SUPABASE_*` variable, and the CSP's
   `connect-src 'self'` stands (decision 3 of [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91#issuecomment-5913893382); [Rewrite the Test harness and SPA shell tickets for Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/106)).

2. **One team project, in Frankfurt, which Kamel owns and keeps available.** The organization
   FT_TRANSCENDENCE, on the Free plan, holds one project, PeerConnect, in Frankfurt
   (`eu-central-1`). The rule was an EU region first, then speed, with Paris as the fallback; it is
   not a legal requirement ([Settle which region the team Supabase project uses](https://github.com/ahmadmnsur/ft_transcendence/issues/107)). Kamel is Owner and Ahmad Developer ([Create PeerConnect's Supabase organization and team project](https://github.com/ahmadmnsur/ft_transcendence/issues/90)); Hussein is not a
   member. A Free project with too little activity for a week is paused, and only an Owner or
   Administrator can resume it ([Find out what Supabase's free plan means for PeerConnect](https://github.com/ahmadmnsur/ft_transcendence/issues/89)). So Kamel keeps it active and checks it before each
   defense, with no keep-alive job and no paid plan ([Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101)). Its dashboard settings are recorded
   in [`supabase/team-project.md`](../../supabase/team-project.md) and change by pull request first
   ([Settle how the schema gate covers Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/97)). ADR-0004's note on "no deployed environment".

3. **`make up` runs on the team project when `.env` holds its values, and on a local fallback
   otherwise.** The fallback is Supabase's own Postgres, Auth, Storage and gateway inside Compose,
   reading `.env.example` alone, so a fresh clone and bare `docker compose up --build` still boot
   ([Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101), built by [Local Supabase fallback: Compose services, make targets, environment check and CI](https://github.com/ahmadmnsur/ft_transcendence/issues/121)). Of the `make` targets that start a stack, only `make up` reads
   `.env`, as bare `docker compose up --build` does; `make local`, `make dev` and `make test` always
   run the fallback. The boot check runs first: every value present, both URLs naming one target,
   the keys accepted, then the database. A failure stops the boot and names the
   variable, and nothing falls back by itself. Branch work that changes the database, by a
   migration or by writing data, runs on the fallback.

   On the team project, `prisma migrate` and the `api` share one `DATABASE_URL`, the session
   pooler. The direct connection is IPv6-only on Free, and the transaction pooler drops the lock
   `prisma migrate` holds. `40001` and `40P01` come back through the session pooler unchanged
   (tested on 2026-10-03), so the Unit of Work's retry works. The connection is verified against
   Supabase's certificate, `supabase/prod-ca-2021.crt`, the project refuses unencrypted
   connections, and each `api` opens at most 5 connections ([Team project database: verified TLS and the api's pool cap](https://github.com/ahmadmnsur/ft_transcendence/issues/124)). ADR-0004 decisions 1, 8, 9
   and 11.

4. **PeerConnect keeps its own session.** Supabase Auth checks a password, and PeerConnect's
   `Session` row, behind the one `pc_session` cookie, decides who is signed in. Resolving a session
   on a request or a socket handshake reads only PeerConnect's tables and never calls Supabase. The
   Supabase Auth session that a password check creates is signed out at once, and its tokens never
   leave that request. That sign-out is best effort: if it fails, the sign-in still succeeds.
   Supabase's shared rate limit is accepted, and no browser's address is forwarded to Supabase ([Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91)). ADR-0003 decisions 1 and 5.

5. **Supabase Auth keeps each Student's password, and nothing else of theirs.** Each Supabase Auth
   user has the Student's own id and logs in as `<id>@peerconnect.invalid`, a reserved name that
   never receives mail; the real email stays in `Student.email` alone. Supabase's bcrypt replaces
   argon2id, so a password is 8 characters to 72 bytes. Sign-up creates the Supabase Auth user with
   the secret key, then writes the Student in one transaction, and the project's public sign-up is
   off. In use, only sign-up and a password change write to Supabase Auth: an email change, a
   Suspension, a reinstatement and a Removal each stay one PeerConnect transaction, and a Removed
   Student's hash is kept. A password change signs out everywhere, sets the password and signs out
   again, with `password_version` replacing `password_hash`. Sign-in tells the real reason, and a
   sanction only after the right password. The audit log's copy in the database is off ([Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92)).
   ADR-0003 decisions 3, 6 and 10; ADR-0008 decisions 5, 7, 8, 9 and 12.

   > **Changed 2026-10-25 by ADR-0003 d10's note of that date, decided by Ahmad**: the sign-in page
   > shows a wrong email and a wrong password one sentence, "Wrong email or password." The API
   > keeps both codes, `no_account` and `password_incorrect`, and a sanction is still told only
   > after the right password.

6. **Sign in with 42 stays NestJS's own.** Supabase Auth takes no part in it. A 42 login finds its
   Student by 42's account `id`, in `Student.forty_two_id`. A 42 account that no Student holds gets
   the sign-up form, pre-filled, with a password and the Terms checkbox, so every Student has a
   password. Connect 42 and Disconnect 42 ask for the current password, and Confirm with 42 lets a
   Student set a new password once, without the current one, within ten minutes. The team
   application is registered on Kamel's 42 account; its keys are only in the team `.env`, and its
   secret lasts 28 days, with a warning in the last seven ([Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93)). ADR-0003; ADR-0004's module amendment; ADR-0008 decisions 7 and 8;
   ADR-0018 decisions 5, 7, 8 and 12.

7. **Files live in two private buckets, and every byte goes through NestJS.** `avatars` (2 MiB;
   PNG, JPEG) and `evidence` (5 MiB; PDF, PNG, JPEG) have no access policies, so only the `api`,
   with the secret key, opens them. NestJS's routes read a file whole from Storage and then send
   it, with no signed links. A file's name is its row's token, new on every upload; the rows keep
   `token`, `mime`, `size` and `uploaded_at` and drop `bytes`. A save writes the file, then the row,
   then deletes the old file, and a delete removes the row, then the file. So a crash leaves at
   worst a file that no row names, which the `api` deletes once it is more than an hour old, at
   every start and every hour: within two hours, as long as the `api` runs and its hourly cleanup
   succeeds. The seed's first step creates the buckets, or sets them back, on every run: at boot,
   under `make seed` and in CI ([Settle how avatars and Evidence are stored and served on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/94)). ADR-0009 decisions 2, 5 and 6; ADR-0014 decision 12;
   ADR-0004 decision 11.

8. **The tables barely change, and none reaches into Supabase's schemas.** Nineteen tables and nine
   enums, as before, and nine raw-SQL steps. `Student` swaps `password_hash` for `password_version`
   and gains `display_name_search` and `forty_two_id`; `Avatar` and `Evidence` drop `bytes`;
   `Session` stays. No foreign key points into `auth` or `storage`, so the test database can be
   dropped and rebuilt on its own, and there is no row-level security. NestJS makes `Student.id`,
   `Avatar.token` and `Evidence.token` before it writes the row, so they lose their Prisma default
   ([Settle which tables change for Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/96)). The hosted database uses `C.UTF-8`, which sorts by code point, so the ninth raw-SQL
   step gives `Student.display_name` the `und-x-icu` collation; the database stores nothing per
   language ([Settle what the database stores in French and Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/95)). ADR-0014.

9. **Tests and CI run on real Supabase.** The suite and CI use the fallback's own containers, never
   a plain Postgres or a fake Auth or Storage. `make test` starts a copy of its own, under its own
   Compose project, from empty, and deletes it with its volumes after the run; CI runs the same
   copy. The harness refuses any `DATABASE_URL` or `SUPABASE_URL` that is not the fallback's, makes
   every account through the real sign-up and bootstrap code, and keeps `<db>_test`. Sign-in adds a
   twelfth category, `12-sign-in` ([Settle how tests and CI run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/99)). ADR-0016 decisions 1 and 8; ADR-0004 decision 8.

10. **The seed fills each target once, and two resets empty one on purpose.** The seed writes its
    fixture at a target's first boot, and every later boot finds its completion record and skips
    it, so the team project's data stays between defenses. A run that writes the fixture first
    deletes our rows, every Supabase Auth user and every file in the two buckets, but only after a
    guard: if any Student's email is not one the seed uses, it deletes nothing and fails. The
    completion record stays `COMMENT ON DATABASE`, and the lock has a connection of its own. A run
    takes minutes against Frankfurt, so the `api` has 15 minutes to turn healthy ([Settle how the seed creates accounts and files on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/98)). `make reset-team` and `make reset-local` each empty one fixed
    target; `make reset-team` asks for the project ref to be typed and runs only from an up-to-date
    `main` ([Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101), [Settle how the seed creates accounts and files on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/98)). ADR-0017 decision 10; ADR-0004 decision 11; ADR-0008 decision 9.

11. **The schema gate covers Supabase, and the team project changes only through its record.** The
    gate adds `supabase/**`, every `compose*.yaml`, the buckets' settings and `prisma/reset/**`. A
    dashboard setting changes by a pull request to `supabase/team-project.md` first, then in the
    dashboard, with an `Applied in the dashboard on <date>` comment. Nobody changes the team
    project by hand outside that and four cases, each Kamel's: resuming it, running
    `make reset-team`, deleting a Supabase Auth user that no Student has, and repairing a migration
    that failed partway. The clean-clone boot also runs for `supabase/**`, except its Markdown
    files, and for `.env.example`, and the PR template gains five Supabase checks ([Settle how the schema gate covers Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/97)).
    ADR-0005 decisions 5 and 6; ADR-0016 decisions 5 and 6.

12. **The legal pages name two kinds of copy, and the team `.env` stays with the team.** The
    team's copy is stored by Supabase in Frankfurt, and a local copy stays on the computer that
    started it; each section of the pages states each copy's facts. Supabase is named as storing
    the team's copy for the team, and no law is named. The `.env` is no longer handed to the
    evaluator: a defense runs on a team member's own computer, and the evaluator is told only the
    three sign-in passwords. There are no backups the team can restore, Supabase encrypts its disks,
    and Supabase Auth's records and Supabase's logs are disclosed. So that no log holds what a
    Student submits, the team project's `postgres` role carries four log settings, which Kamel
    applies in the dashboard's SQL editor ([Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100)). ADR-0018 decisions 1, 3, 5, 6, 7, 8 and 13; ADR-0004
    decision 9.

## Considered options

- **Keeping the stack as it was**: Postgres in a Compose volume, files in `bytea`, argon2id. Every
  copy stays on one computer, so there is no copy the team shares and nothing hosted to go online
  with later, the two gaps this ADR exists for.
- **Supabase as the application, not only its stores.** Each part was weighed on its own ticket and
  left out:
  - *Supabase's session as the authority*, its tokens held on the server: a key check or a round
    trip on every request, an hourly refresh that concurrent requests race to use, no way to sign
    one Student out at once, and a JWT in the cookie that ADR-0003 refuses ([Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91#issuecomment-5913893382)).
  - *Supabase's client in the browser*: it breaks ADR-0018 d5's one cookie, the CSP, and the
    Privacy Policy's "your browser loads nothing from any other website" ([Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91#issuecomment-5913893382)).
  - *Realtime* in place of Socket.IO: Socket.IO carries the WebSockets Major ([Map: PeerConnect moves to Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/85), *Out of
    scope*).
  - *Supabase's sign-in through an outside provider* for 42: its custom provider needs a `sub`
    field that 42's answer lacks, and it would send the browser through Supabase's address. The
    OAuth Minor stays code the team wrote and can explain ([Find out what Supabase Auth offers PeerConnect](https://github.com/ahmadmnsur/ft_transcendence/issues/87), [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93#issuecomment-6067107389)).
  - *The Data API and row-level security*: off on the team project from its creation ([Create PeerConnect's Supabase organization and team project](https://github.com/ahmadmnsur/ft_transcendence/issues/90)). On
    the fallback, Supabase's REST service would have let the committed publishable key read and
    write the tables in `public`, so it is not run ([Local Supabase fallback: Compose services, make targets, environment check and CI](https://github.com/ahmadmnsur/ft_transcendence/issues/121)).
  - *Signed links or a public bucket* for files: a link works for anyone who holds it until it
    expires, and the CSP and ADR-0009 d3 block Supabase's address anyway ([Find out how Supabase Storage keeps files private](https://github.com/ahmadmnsur/ft_transcendence/issues/88), [Settle how avatars and Evidence are stored and served on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/94#issuecomment-6001578316)).
- **Other ways to keep the accounts** ([Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92#issuecomment-5941374186)): the real email in Supabase Auth as well, which
  is two writes a crash can split; importing the argon2id hashes, which the first password change
  would turn into bcrypt; hashing a password first to lift the 72-byte limit; a Supabase ban for a
  sanction, or deleting the Supabase Auth user at Removal; Supabase's public sign-up; the user's own
  password update; and one generic sign-in refusal.
- **Other ways to connect and boot** ([Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101#issuecomment-5962066710)): falling back to a local copy by itself, which
  could leave an evaluator on an empty copy believing it the team's; the direct connection,
  IPv6-only on Free; the transaction pooler, which drops `prisma migrate`'s lock; a keep-alive job
  or a paid plan; and a connection whose certificate is not verified.
- **Handing the team `.env` to the evaluator**, [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101)'s first answer: reversed on 2026-10-11 by
  [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100), so that only the team, and Supabase as its host, can open the team's copy directly, as
  the Privacy Policy now says.
- **Tests on a plain Postgres or with fakes** ([Settle how tests and CI run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/99#issuecomment-5979357629)): a seed or a file check could pass on a
  stand-in and fail on Supabase, and Auth and Storage need roles that only Supabase's Postgres
  image creates.
- **Google sign-in**, ruled out on 2026-10-08 ([Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93#issuecomment-6067107389)): Sign in with 42 already earns the
  OAuth Minor, and Supabase's own Google sign-in would send the browser through Supabase's address.
- **The gate read from a ticked box, or the dashboard changed first** ([Settle how the schema gate covers Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/97#issuecomment-6092752187)): a box is easy
  to skip and cannot become a `CODEOWNERS` line, and changing the dashboard first changes a setting
  unreviewed. Dashboard first stays only for undoing a breakage.

## Consequences

- **The team's copy needs the internet and an active project.** A paused project answers `540`,
  which the boot check names, and only Kamel can resume it. If it is paused on defense day anyway,
  the last resort is the fallback, with no `.env`, which starts from the seed.
- **Part of a Student's account lives where PeerConnect's code cannot reach it.** Supabase Auth
  records the last time it accepted a password and keeps its own logs, and Supabase may keep
  backups the team cannot restore. The Privacy Policy says each (decision 12).
- **The team project's secret key opens everything.** Whoever holds it can read every file and
  create, change or delete any Supabase Auth user. It is in the team `.env` alone, only the `api`
  uses it, and it is never committed or sent to the browser. The fallback's own key, committed in
  `.env.example`, opens only a local copy.
- **A password is 8 characters to 72 bytes.** An accented or Arabic letter counts two bytes or
  more, so the frontend and the API both check the length before Supabase sees the password.
- **A crash can leave harmless leftovers**: a Supabase Auth user that no Student has, which nobody
  can sign in with and Kamel may delete, and a file that no row names, which the `api`
  deletes within two hours, as long as it runs and its hourly cleanup succeeds.
- **The seed is slow on the team project**, an estimated four to seven minutes, so the `api` waits
  15 minutes before it counts as unhealthy, and no other stack connects while the seed runs after
  a reset.
- **Two copies can differ.** The team's copy keeps what defenses did until `make reset-team`, while
  a local copy starts from the seed. A demo relies only on what the seed makes.
- **No module point moves.** Prisma, Socket.IO, Sign in with 42 and the file routes stay code the
  team wrote, and the database is still Postgres under the ORM.
- **The README's "Database system and why it was chosen"** (`document/en.subject.md:1274`) takes
  its answer from this ADR, through [README: the sections with no recorded owner](https://github.com/ahmadmnsur/ft_transcendence/issues/71).
- **The spec and the build tickets follow.** [Update the spec and the legal pages for Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/103) updates `docs/spec.md` to this ADR, and
  [Rewrite the affected build tickets for Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/104) rewrites the build tickets the move changes.

  > **The spec followed, 2026-10-13.** `docs/spec.md` is corrected in place to this ADR and the
  > notes it names. The names the notes left to it (Sign in with 42's routes, the sign-in codes) and
  > one rule Kamel chose there, that a wrong current password counts toward the throttle (ADR-0003
  > d10's note of that date), are listed in its §2.2 as M35–M37.

  > **The build tickets followed, 2026-10-14.** [Rewrite the affected build tickets for Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/104) rewrote the seventeen open build tickets
  > the move changes, each changed criterion under a dated note citing the spec and this ADR, and
  > opened three: [Team project boot: the boot check's steps 3 and 4](https://github.com/ahmadmnsur/ft_transcendence/issues/155), which lets `make up` run on the
  > team project (decision 3); [The two resets: make reset-local and make reset-team](https://github.com/ahmadmnsur/ft_transcendence/issues/156) (decision 10); and
  > [Sign in with 42: recovery through Confirm with 42](https://github.com/ahmadmnsur/ft_transcendence/issues/157) (decision 6).

## Not settled by this decision

- **Putting PeerConnect online**, one reason for the move but outside [Map: PeerConnect moves to Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/85). It reverses ADR-0004's
  "no deployed environment" and needs its own decision: where NestJS and Socket.IO run, the cookie
  and CORS across two domains, a second 42 redirect URI, and what `make reset-team` and the thirty
  seeded Students' shared password mean once the accounts are real.
- **Password reset by email**, a later effort: PeerConnect would send the email itself, and
  Supabase Auth would only set the password ([Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92#issuecomment-5941374186)).
- **Features only for 42 students, and 42 projects as Skills**: a later ticket ([Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93#issuecomment-6067107389)).
- **French and Arabic**: [Map: PeerConnect in English, French and Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/139) claims the language modules, and the database stores nothing per
  language ([Settle what the database stores in French and Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/95)).

  > **Recorded 2026-10-15 in [ADR-0020](0020-peerconnect-speaks-english-french-and-arabic.md)**:
  > the multi-language and right-to-left Minors are claimed, and the database still stores nothing
  > per language.
