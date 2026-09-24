# 42 PeerConnect — Buildable Specification

**Status: locked.** Produced by `/to-spec #1` on 2026-09-23 from ADR-0001 → ADR-0018 (as annotated),
the map ([#1](https://github.com/ahmadmnsur/ft_transcendence/issues/1)), `CONTEXT.md`,
`CONTRIBUTING.md`, the PR template, the legal drafts in `docs/legal/`, the research notes in
`docs/research/`, the prototype on `prototype/compatibility-score`, and the two primary sources in
`document/`. It is the input `/to-tickets` reads.

## How to read this document

- **The ADRs are the decisions; this document is the build.** Every rule here is traced to the
  record that settled it (`ADR-00NN dN`). Where a record delegated a *mechanism* to `/to-spec #1`,
  this document chooses it and lists the choice in §2.2. Where two records disagreed, §2.3 names the
  disagreement and the resolution. If a later reader finds this document contradicting an ADR on a
  **rule**, the ADR wins and this document is corrected; on a **mechanism** listed in §2.2, this
  document wins until an ADR says otherwise.
- **Vocabulary is `CONTEXT.md`'s.** Student, Admin, Peer Moderator, Round, Match, Mentor, Mentee,
  Review, Learning Outcome, Private Feedback, Public Takeaway, Evidence, Reflection Prompt, Post,
  Like, Friend, Block, Direct Message, Report, Suspension, Removal, XP, Level, Streak, Badge,
  Leaderboard, Learning Analytics, Presence, Mission, Compatibility Score, Skill, Learning Goal.
- **Operation notation.** Every mutating operation is specified as
  **Input → Auth → Validation → Rule → Persistence → Events → Failure → Concurrency → Visibility.**
- **"SSI tx"** means one PostgreSQL `SERIALIZABLE` transaction run through the Unit of Work in §3.6,
  retried automatically on serialization failure. **"After commit"** means the effect runs only once
  the successful attempt has committed (§3.7).
- **Field-length numbers, retry budgets, timeouts and log caps are engineering defaults** chosen
  here, in the sense ADR-0003 uses the phrase: change them freely; the shape is what is locked.
- **Blocked** marks behaviour whose product meaning is owned by an open ticket (final section). A
  ticket touching it cannot complete until that ticket resolves.

---

## 1. Scope and module claims

### 1.1 Problem statement

42 students learn from each other constantly, but nothing helps them discover who can teach them,
whom they can help, or what was actually learned from an interaction. Chat, friends and a feed
exist on every platform; what is missing is a loop that pairs people by what they can teach and want
to learn, and records the outcome honestly.

### 1.2 Solution

PeerConnect runs that loop in **Rounds** an Admin opens and closes. Opening a Round pairs eligible
Students into **Matches** (a Mentor and a Mentee) by a skill-only **Compatibility Score**, with a
suggested **Mission** for how to meet. After meeting, the Mentee submits a three-part **Review**:
a **Learning Outcome** (private to the pair and Admins, with optional **Evidence**), **Private
Feedback** to the Mentor, and a **Public Takeaway** that becomes a **Post**. A lighter loop runs
beside it: **Reflection Prompts** the Admin publishes, answered once as Posts. Both loops feed one
**XP** pool, a **Level**, one **Streak**, three **Badges** and one **Leaderboard**. Friends,
**Presence**, **Direct Messages**, **Likes**, **Blocks**, **Reports**, a **Peer Moderator** role and
**Learning Analytics** serve the loop. Everything runs locally from a clean clone with one command.

### 1.3 Claimed modules — 18 points (5 Majors, 8 Minors), threshold 14

Locked by [#7](https://github.com/ahmadmnsur/ft_transcendence/issues/7); all 18 firm since #14.
Target policy: survive two Majors failing (18 − 4 = 14).

| Module (`document/en.subject.md`) | Pts | What in this spec satisfies each bullet |
| --- | --- | --- |
| **Major — framework on both ends** (`:478`) | 2 | React SPA (§3.5) + NestJS API (§3.4). The two framework Minors are **not** also claimed (#7). |
| **Major — real-time WebSockets** (`:490`) | 2 | Socket.IO: `post:created` to `feed`, `round:opened`/`round:closed` to `rounds`, per-Student `match:ready`, `dm:message`, Presence (§7). Reconnect, grace window and forced disconnect (§7.5). Room broadcast, not N unicasts (§7.4). |
| **Major — user interaction** (`:498`) | 2 | Chat: 1:1 Direct Messages (§11.4). Profile: §6.2. Friends: request/accept/decline/end, list (§11.1, §6.4). |
| **Major — standard user management** (`:592`) | 2 | Profile edit (§6.2); avatar with default (§9.6, §6.3); Friends with online status (Presence, §7.6); profile page (§6.2). |
| **Major — advanced permissions** (`:622`) | 2 | Users table: view, edit, delete-by-Removal (§6.12); roles `STUDENT`/`PEER_MODERATOR`/`ADMIN` managed on the role column; three distinct views (Student: none; Peer Moderator: `/moderation`; Admin: `/admin/*`). |
| **Minor — ORM** (`:516`) | 1 | Prisma `^7` (§3.3, §4). |
| **Minor — advanced search** (`:534`) | 1 | `GET /api/students` with Skill filters, sort, pagination over TanStack Table (§6.2). |
| **Minor — gamification** (`:848`) | 1 | Exactly three of `:850`: XP/Level, Badges, Leaderboard; persisted; progress bar + earn panels; `/rules` page (§10). |
| **Minor — design system** (`:526`) | 1 | Project-owned palette, type scale, icon set and ≥ 10 reusable components (§3.5.3). |
| **Minor — file upload** (`:536`) | 1 | Avatar (PNG/JPEG) and Evidence (PDF/PNG/JPEG); client + server validation; `bytea` storage behind authorised routes; preview; progress; delete (§9.5–9.6, §6.3). |
| **Minor — OAuth 2.0** (`:620`) | 1 | Sign in with 42 (§5.6). **Identity mapping and a successful sign-in Blocked by #24 (§5.6 B).** |
| **Minor — additional browsers** (`:574`) | 1 | Firefox + Brave pass in week 5, limitations documented in `README.md` (§16.7, ADR-0016 d9). |
| **Minor — user activity analytics** (`:642`) | 1 | `/admin/analytics` Learning Analytics (§13), a scoped V2 pull-forward (ADR-0015). |

Mandatory part (`:300`–`:389`) is met by: containerised single command (§15); Chrome, clean console
(§3.8.2, §15.7, §16.7); Privacy Policy and Terms routes with footer links (§3.5.1, §3.5.4); multi-user concurrency
(§3.6); responsive Tailwind UI (§3.5); `.env` + `.env.example` (§15.4); clear schema (§4); email +
password with salted argon2id (§5.1); validation on both ends (§3.5.2, §6.0); HTTPS for every
browser connection on the deployment path (§15.2).

### 1.4 In scope and out of scope

**In scope** is exactly what §§4–14 specify. **Out of scope**, each ruled on the map or an ADR:
any game and every game-gated module; the four infrastructure Majors; accessibility and i18n
modules; the AI recommendation Major; the public API (#12); the notification system; advanced chat,
PWA, SSR, real-time collaboration, organisations; **Comments** and with them a third report target;
reportable Direct Messages and reportable Evidence; fair mentor rotation and network freshness (MVP
cuts); availability matching, prompt categories/scheduling, per-skill endorsements, the Learning
Progress view, 2FA, the **Mentor Reputation** score and any aggregate over ratings (Version 2);
Problem Solver, Top Mentor, Most Improved and Longest Learning Streak Badges; email verification,
password reset and any Admin-set password; self-service account deletion; appeals; a reporter
status surface; read receipts; `last_seen_at` or any stored Presence; Mission completion tracking;
XP ledger, ranking history, analytics snapshots, exports; a public deployment, `mkcert`, LAN access
on either path; a `SESSION_SECRET`; JWT anywhere; any fourth Compose service.

### 1.5 User stories

**Visitor (signed out)**

1. As a visitor, I want to read the Privacy Policy and the Terms of Service without an account, so
   that I know what I am agreeing to before I sign up.
2. As a visitor, I want to sign up with an email, a password and a display name, ticking the
   acceptance checkbox, so that I can join.
3. As a visitor, I want to sign in with my email and password, so that I reach my account.
4. As a visitor on a copy with 42 OAuth configured, I want a Sign in with 42 button, so that I can
   use my 42 account (**Blocked by #24** for which account it reaches).
5. As a visitor on a copy without OAuth configured, I want no 42 button at all, so that nothing on
   the page is broken.
6. As a visitor who mistypes a password repeatedly, I want one generic refusal and then a
   temporary throttle, so that nobody can enumerate accounts or guess passwords.

**Student — account and profile**

7. As a Student, I want to edit my display name and email, so that my account stays accurate.
8. As a Student, I want to change my password and be signed out everywhere, so that a leaked
   session dies with the old password.
9. As a Student, I want to upload, replace and remove an avatar, with a preview and a progress bar,
   and a default when I have none, so that my profile has a face.
10. As a Student, I want to pick the Skills I can teach and want to learn from the shared catalogue,
    so that the matcher can pair me.
11. As a Student, I want to single out one Skill I want to learn as my Learning Goal with a sentence
    saying why, so that a Match that teaches it is preferred.
12. As a Student, I want to remove all my Skills, so that I stop being matched without leaving.
13. As a Student, I want to view another Student's profile — display name, avatar, Skills, Learning
    Goal and sentence, XP, Level, Streak, Badges and Posts — so that I know who they are.
14. As a Student, I want to see an Admin labelled as an Admin wherever I meet them, so that I know
    whom to ask for help or a Removal.
15. As a Student, I want to search Students by name, by a Skill they teach or want, and by whether
    they have a Learning Goal, sorted and paged, so that I can find people.
16. As a Student, I want to sign out, so that this browser stops being signed in.

**Student — social**

17. As a Student, I want to send a friend request, so that we can see each other's Presence once
    accepted.
18. As a Student, I want to accept or decline a friend request addressed to me.
19. As a Student, I want to cancel a request I sent.
20. As a Student, I want to end a Friendship, so that I stop sharing Presence.
21. As a Student, I want to see my Friends with their online status, so that I know who is around.
22. As a Student, I want to Block another Student, ending any Friendship or pending request between
    us and refusing Direct Messages, friend requests and future Matches with them.
23. As a Student, I want to lift a Block I set, so that a refusal made in anger is not permanent.
24. As a Student, I want to send a Direct Message to any Student I am not in a Block with and see it
    arrive in real time, so that we can arrange a meeting.
25. As a Student, I want an unread count per conversation, cleared when I open the conversation, so
    that I know what I have not read.
26. As a sender, I never learn whether my message was read, so that nobody is pressured by receipts.

**Student — the Match loop**

27. As a Student, I want to be told in real time when a Round opens and my Match is ready.
28. As a Student, I want to see my partner, whether I am Mentor or Mentee, the Compatibility Score
    with its plain-language explanation, and the Mission, so that I know why we were paired and how
    to meet.
29. As a Student, I want to accept my Match, so that the pair can proceed to a Review.
30. As a Student, I want to decline my Match, so that I am not forced into a pairing.
31. As a Mentee, I want to submit a Review with a Learning Outcome, Private Feedback with an
    optional 1–5 rating, and a Public Takeaway, so that the session is recorded.
32. As a Mentee, I want an earn panel on the confirmation screen showing the XP I earned and my
    Level progress, so that the reward is visible where I acted.
33. As a Mentee, I want to attach, replace or delete one Evidence file (PDF, PNG, JPEG) with preview
    and progress, even after the Match completed, so that my Learning Outcome shows what was made.
34. As a Mentor or Mentee, I want to read the Learning Outcome and Evidence of our Match, so that the
    pair shares the result.
35. As a Mentor, I want a private page listing every Private Feedback I received, newest first, each
    with its rating, so that I learn how I teach.
36. As a Mentee, I want to re-read the Private Feedback I wrote, never edit it.
37. As a Student, I want to see my own Match history, which no profile shows to anyone else.

**Student — the Prompt loop, feed and progress**

38. As a Student, I want to answer the live Reflection Prompt once, so that my answer becomes a Post
    and earns XP.
39. As a Student, I want to read closed Prompts and their answers forever.
40. As a Student, I want the feed to show new Posts as they are published, without reloading.
41. As a Student, I want to Like and un-Like a Post and see who liked it.
42. As a Student, I want my profile to show XP, a Level progress bar, my Streak and my Badges, and to
    show Consistent Learner as soon as the Round-close that awarded it commits while my profile is
    open.
43. As a Student, I want a Leaderboard of the top ten by XP plus my own rank, so that I see where I
    stand.
44. As a Student, I want one page that states the XP table, the Level bands and every Badge
    condition, so that the rules are clear.
45. As a Student, I want to report a Post or a Student with a reason and optional text, get an
    honest confirmation, and be refused a second report on the same target.

**Peer Moderator**

46. As a Peer Moderator, I want to be matched and earn XP like any Student.
47. As a Peer Moderator, I want a queue of open reported-Post groups with a count, reasons and texts
    but never the reporters, so that I can triage.
48. As a Peer Moderator, I want to remove the Post or dismiss the group in one action, recorded as
    mine, so that the queue empties.
49. As a Peer Moderator, I never see a group I have an interest in (my Post, my own report, or a
    Block with the author or any reporter), so that I cannot judge my own case.

**Admin**

50. As an Admin, I want to open a Round and have its Matches created at once, and to see who was
    left unmatched.
51. As an Admin, I want to pair two unmatched candidates by hand inside the open Round, with no
    Score shown.
52. As an Admin, I want to close the open Round, lapsing unfinished Matches and updating every
    Streak.
53. As an Admin, I want to publish a Reflection Prompt, closing the previous one.
54. As an Admin, I want a Users table with search and name, email, role and status, including
    Removed Students view-only.
55. As an Admin, I want to edit a Student's display name, email, avatar, Skills and Learning Goal,
    never their password, XP, Badges or anything they wrote.
56. As an Admin, I want to change a Student's role, never my own, and never leave the platform
    without an active Admin.
57. As an Admin, I want to suspend and reinstate a Student, and to remove a Student for good.
58. As an Admin, I want the full report queue, Student reports included, with reporter identity,
    except groups about me or containing my own report.
59. As an Admin, I want an audit of resolved reports with who resolved them and when.
60. As an Admin, I want Learning Analytics — demand, supply, gap, completion rate, Match state and
    outcomes — refreshing when a Round opens or closes.
61. As an Admin, I want to read any Match's Learning Outcome, Private Feedback and Evidence, so that
    abuse can be judged.
62. As an Admin, I am never matched and never answer a Prompt, because I am staff.

**Evaluator and team**

63. As an evaluator, I want `make up` from a clean clone to produce a working platform at
    `https://localhost:8443`.
64. As an evaluator, I want bare `docker compose up --build` from a different clean clone to work
    too, with nothing run first.
65. As an evaluator, I want the platform to boot seeded with four closed Rounds, Badges, Streaks,
    reports and a social graph, and idle, so that the demo opens Round 5 on stage.
66. As an evaluator, I want to sign in as any seeded Student with one shared password.
67. As an evaluator, I want a clean browser console in Chrome, Firefox and Brave.
68. As a developer, I want the dev overlay at `http://localhost:8081` with Vite HMR through nginx.
69. As a developer, I want `npx vitest run` to run the whole suite, and CI on every PR to show
    typecheck, migrations from empty, the seed from empty and the suite.
70. As a reviewer, I want to know from a PR's file list alone whether it is inside the schema gate.

---

## 2. Locked decisions

### 2.1 Settled decisions consumed

One line per operative rule, as annotated. The ADR text is authoritative; this register exists so
`/to-tickets` can cite a source per acceptance criterion.

| Source | Rule consumed |
| --- | --- |
| ADR-0001 | Round is Admin-controlled, never a calendar week; nothing in the schema references wall-clock scheduling. |
| ADR-0002 d1 | Only an Admin opens or closes a Round. |
| ADR-0002 d2 | At most one open Round; the platform may sit with none. |
| ADR-0002 d3 | Opening runs matching in one transaction; Round and its Matches commit together or not at all. States: open, closed. |
| ADR-0002 d4 | Candidate pool: ≥ 1 Skill listed, role ≠ `ADMIN`, neither Suspended nor Removed; evaluated at Match creation's serialization point. |
| ADR-0002 d5 | Close finalises every Match; unreviewed Matches pay nothing; Streak evaluates the whole Round; Review vs terminal transitions serialize. |
| ADR-0002 d6 | *Unmatched* is derived from the **standing** set (`MATCHED`, `ACCEPTED`, `COMPLETED`, `LAPSED`), never stored, never carried over. |
| ADR-0002 d7 | Admin hand-made Match inside the open Round; creation vs close serialize; nothing commits into a closed Round. |
| ADR-0002 d8 | Decline terminates the Match; both drop to unmatched; no automatic replacement. |
| ADR-0002 d9 | Prompt answer with no open Round earns XP, not Streak; Round attribution at the answer's serialization point. |
| ADR-0003 d1 | Opaque session id in one HttpOnly, Secure, SameSite=Lax cookie; no JWT; the cookie also carries the OAuth pre-authentication attempt. |
| ADR-0003 d2 | Single origin for bundle, API and socket. |
| ADR-0003 d3 | argon2id via `@node-rs/argon2`, m = 19 MiB, t = 2, p = 1. |
| ADR-0003 d4 | 30-day sliding expiry, renewed only when `expires_at` is more than an hour old; `Max-Age` derived from `expires_at`. |
| ADR-0003 d5 | Session row holds id, student_id, expires_at; role and sanction flags read from `Student` on every request; sanctioned resolution fails. |
| ADR-0003 d6 | Logout deletes one session; password change, Suspension, Removal delete all; role change deletes none. |
| ADR-0003 d7 | Socket authenticates by the cookie; WebSocket-only; Origin must equal `PUBLIC_ORIGIN` before session resolution; rejection stops retry. |
| ADR-0003 d8 | Deleting sessions force-disconnects live sockets via the Presence registry. |
| ADR-0003 d9 | No privileged action over the socket; a DM is the only client write. |
| ADR-0003 d10 | CSRF: SameSite=Lax + JSON content type on every mutation; upload exception with Origin + `X-PeerConnect-CSRF: 1`; no GET changes a domain row except lazy renewal and the OAuth callback; `state` mandatory; throttle 5 / 15 min keyed on client address **and** email, in memory, nginx the only trusted proxy. |
| ADR-0003 d11 | Logout ships; email verification, password reset and Admin-set passwords do not. |
| ADR-0004 d1–d3 | Three services `proxy`/`api`/`db`; nginx serves the bundle and proxies `/api` and `/socket.io`. |
| ADR-0004 d2 notes | Upload locations admit 6 MiB; request log in nginx standard fields, path and referrer without query; container logs capped with rotation. |
| ADR-0004 d4 | Dev overlay keeps nginx; Vite is a host process reached through `host.docker.internal`; verified bridge bind, no silent wildcard. |
| ADR-0004 d5, d7 | `http://localhost:8081` (dev, `127.0.0.1:8081`) and `https://localhost:8443` (base, `127.0.0.1:8443` + redirect `127.0.0.1:8080`); LAN out of scope on both. |
| ADR-0004 d6 | Self-signed certificate generated at image build; never committed. |
| ADR-0004 d8 | `make up` and bare `docker compose up --build` both work, independently; `.env.example` first, optional `.env` second; Compose ≥ 2.24 (`env_file.required`'s own floor — the toolchain floor is §3.3). |
| ADR-0004 d9 | Fifteen `.env.example` entries; OAuth pair ships empty; staff and seed credentials are dev defaults with a change-it warning. |
| ADR-0004 d10 | No `SESSION_SECRET`. |
| ADR-0004 d11 | Boot: db healthcheck → migrate → idempotent seed, on both paths. |
| ADR-0004 d12 | Kamel owns the infrastructure slice in week 1 as a gate, README Instructions included. |
| ADR-0004 amendment | OAuth credentials `FT_OAUTH_CLIENT_ID`/`FT_OAUTH_CLIENT_SECRET`; redirect URI derived from `PUBLIC_ORIGIN`; platform fully usable with OAuth unconfigured; 42 token used once, discarded. |
| ADR-0005 | Prisma `^7`; one `schema.prisma`; gate = `prisma/**`, root `prisma.config.ts`, every Config discovery path, the seed and its fixture; Kamel reviews, Ahmad deputises past 24 h; developer authors; immutable merged migrations; rebase-then-regenerate own migration; Conventional Commits; squash-merge; `<type>/<slice>-<short>` branches; explicit `prisma generate`; `prisma-client` generator with explicit output; `@prisma/adapter-pg`; Node `^20.19`/`^22.12`/`^24`; TS ≥ 5.4. |
| ADR-0006 | Skill-only Score, `cover(n)=1−0.5ⁿ`, 0.7/0.3, +10 Mentee Learning Goal bonus, clamp, exact half-up rounding; floor 25; orientation by higher Score, tie lower id is Mentor; priority = Score − 2·max(0, ΔLevel − 2); most-constrained-first with recompute; tie-break `priority DESC, Score DESC, pair key ASC`; no-repeats over every Match row of any status; Block unconditional; hand-made Match: no Score (`NULL`, so the 25 floor has nothing to gate), exempt from the no-repeats history check only, oriented by steps 3–4, both currently unmatched, serialized; a Block does not end an existing Match. |
| ADR-0007 | One live Prompt = greatest durable publication order; publish-only, no edit/delete/draft/schedule; answer is the Post; one answer per (Prompt, Student) in the schema; answer + 20 XP + Knowledge Sharer + qualifying activity atomic; answer rejected after supersession; roles `STUDENT`/`PEER_MODERATOR` answer, `ADMIN` does not; answers visible immediately. |
| ADR-0008 | One role per Student; Peer Moderator participates, Admin does not; Peer Moderator authority = open Post-report groups + Remove Post/dismiss; manual role assignment only; three sanctions; Suspension reversible, Removal final; both terminate in-progress Matches as `TERMINATED_BY_ADMIN`, delete sessions, drop sockets; soft delete on Student and Post only; Removed rows view-only, email burned; Admin edits only Student-editable fields + role; self-guards and ≥ 1 active Admin, serialized; Users table is the roles surface; seed bootstraps Admin and Peer Moderator. |
| ADR-0009 | Evidence on the Learning Outcome; bytes in Postgres `bytea`; authenticated opaque routes; Evidence readable by the originating pair + Admins; Mentee-only mutation while active; 5 MiB / 2 MiB exact; Evidence PDF/PNG/JPEG, Avatar PNG/JPEG; server byte validation; canonical type + `nosniff`; atomic replacement; Removal deletes avatar, keeps Evidence; Suspension touches neither. |
| ADR-0010 | 80 XP each per completed Match + 40 to the Mentee; 20 XP per Prompt answer; `Level = min(10, 1 + floor(XP/250))`; First Mentor, Knowledge Sharer, Consistent Learner; one Leaderboard by XP, top ten + pin, `XP DESC, id ASC`, filtered to active `STUDENT`/`PEER_MODERATOR`; XP paths serialize per Student; BadgeAward contention converges; progress bar, earn panels, `/rules`. |
| ADR-0011 | Likes ship, Comments do not; targets Post or Student; one table, two nullable FKs, CHECKs; reason enum + optional capped text; immutable; two partial unique indexes; states `OPEN`/`ACTIONED`/`DISMISSED`; group = open rows per target; first resolution wins; Peer Moderator sees eligible open Post groups without reporter identity; whole-group conflict guard; Admin self-interest hiding; Remove Post and Remove Student auto-action; Suspension resolves nothing; reporter learns nothing; Report and Block separate. |
| ADR-0012 | Mission = one of six enum values, round-robin by zero-based index within the Round, never updated, text rendered by the frontend. |
| ADR-0013 | Optional 1–5 rating on Private Feedback; no aggregate anywhere; Mentor reads received feedback on a private route, newest first; Mentee re-reads own; Removed author shown as tombstone. |
| ADR-0014 | 19 tables, 9 enums, UUIDv7 ids, `uuid(4)` file tokens; Review split across Review/PrivateFeedback/Post; six Match statuses; Skill catalogue + StudentSkill + Learning Goal reference; Friendship directed, unique unordered pair; Like revocable; DM without Conversation, `read_at` for recipient only, non-GET mark-read; Streak stored, recomputed at close skipping Suspended/Removed; outbound-only socket with three rooms; frozen explanation state; database invariants and the one service invariant. |
| ADR-0015 | `/admin/analytics`, Admin-only; Demand/Supply/Gap over the candidate pool; completion over closed Rounds, per closed Round series, absent when zero; state now + outcomes, no dwell or funnel; Round-indexed; nothing stored; refresh on `round:opened`/`round:closed`; Recharts; no export. |
| ADR-0016 | Vitest, one command, real Postgres, ten closed categories, shared fixture, C3/C4/C6/C7, clean-clone check in two fresh clones from an empty database, Done = merged PR with every box ticked, advisory CI, Firefox + Brave in week 5. |
| ADR-0017 | Seed drives real write paths; four closed Rounds, ends idle; 62-Match target; suspension in Round 3, Removal in Round 4 with prerequisites; `SEED_STUDENT_PASSWORD`; four Report rows in three fixture groups (two grouped on one Post, one Student, one resolved) asserted per role; 27-Skill catalogue; both gap forms; social graph; completion-based idempotence, loud failure; both boot paths; no Presence seeding. |
| ADR-0018 | Pages describe the model as built; one cookie; the browser loads nothing from third parties (Sign in with 42 the one chosen exception); logs clean and capped; throttle in memory; visibility rows (§4.6); Admin label; Peer Moderator unlabelled; no read receipts; four signed-out routes, footer everywhere; acceptance checkbox validated, not stored; Removal on request only; 42 data minimisation; immutable 42 identifier as the only key; Privacy Policy moves with personal data. |
| Map #1 | Stack: NestJS, PostgreSQL, Prisma, socket.io, React, Tailwind, TanStack, Recharts, Vitest, Docker Compose. Vertical slices DB-through-UI. |

### 2.2 Mechanisms chosen by this spec

Every item below was delegated to `/to-spec #1` by the record named, or is a gap no record filled.

| # | Mechanism | Delegated by | Chosen | § |
| --- | --- | --- | --- | --- |
| M1 | Serialization for every "one serial order" contract | ADR-0002 d4/d5/d7, 0006 d10, 0007 d1, 0008 d2/d9, 0009 d5, 0010 d2, 0011 d6/d7, 0012 d6, 0014 d4 | Every domain write runs in a `SERIALIZABLE` transaction via one Unit of Work with bounded automatic retry; each operation lists what it must read inside the transaction. | 3.6 |
| M2 | Durable Prompt publication order | ADR-0007 d1, ADR-0014 | `ReflectionPrompt.publication_order BIGINT UNIQUE`, assigned `max + 1` inside the publishing SSI tx. | 4.3.15, 8.12 |
| M3 | How an answer "establishes qualifying activity" for a Round | ADR-0007 d1 (Streak-atomicity correction) | `Post.answer_round_id`, set in the answer transaction to the Round open at its serialization point. | 4.3.16, 8.7 |
| M4 | BadgeAward contention convergence | ADR-0010 d2, ADR-0014 d7 | Insert `ON CONFLICT DO NOTHING` inside the SSI tx; conflicts surface as serialization failures and the whole event retries. | 10.4 |
| M5 | Learning Goal integrity | ADR-0014 d3 | Composite FK `(id, learning_goal_student_skill_id) → StudentSkill(student_id, id)`; `LEARN` kind and text pairing checked in the service; removing the Goal's Skill clears the Goal. | 4.3.1 |
| M6 | Session id representation | ADR-0003 d1 vs ADR-0014 d10 (§2.3 R2) | 256-bit random token in the cookie; `Session.id` stores its SHA-256. | 5.2 |
| M7 | OAuth attempt: cookie representation, store, expiry, single use, verification order | ADR-0018 d5, ADR-0003 d10 | `a.`-prefixed token in the one cookie; in-memory store; 10 minutes; one live attempt per browser (a new start deletes the one its cookie names); take-and-delete; fixed verification order; PKCE S256 in addition to `state`. | 5.6 |
| M8 | Callback route | ADR-0004 amendment | `GET /api/auth/42/callback`; redirect URI `${PUBLIC_ORIGIN}/api/auth/42/callback`. | 5.6 |
| M9 | Trusted client address | ADR-0003 d10 | nginx overwrites `X-Real-IP` with `$remote_addr`; the API reads only that header; Express `trust proxy` stays off. | 5.5 |
| M10 | Request-log format | ADR-0004 d2, ADR-0018 d6 | Custom `log_format` with query-stripped path and referrer. | 3.9 |
| M11 | nginx error log | ADR-0018 *Not settled* | http-level `error_log /dev/null` (no request-context entry is ever written); main-level process log only, which never carries a request line. | 3.9 |
| M12 | Container log cap | ADR-0018 d6 | `json-file`, `max-size: 10m`, `max-file: 3` on every service. | 15.1 |
| M13 | API and database log hygiene | ADR-0018 d6 | No request logging in the API; error logs without messages from Prisma; Postgres `log_error_verbosity=terse`, `log_min_error_statement=panic`. | 3.9 |
| M14 | Seed idempotence | ADR-0017 d10, ADR-0004 d11 | Completion record = a fixed `COMMENT ON DATABASE`, written only after every end-state assertion passes; absent marker + existing rows → truncate and re-run. | 14.9 |
| M15 | Seed and fixture paths | ADR-0005 d6, CONTRIBUTING rule 3 | `prisma/seed/**` and `prisma/fixtures/**`, both inside `prisma/**`. | 3.2, 17.2 |
| M16 | Prisma Config pinning | ADR-0005 d5 | Every Prisma CLI call passes `--config prisma.config.ts`; every other discovery path is forbidden and gated by three file-list patterns (`/prisma.config*`, `/prisma7.config*`, `/.config/prisma*`). | 3.2, 15.5 |
| M17 | Module format | ADR-0005 Consequences | API, seed and Prisma client are CommonJS (`moduleFormat = "cjs"`); the SPA is ESM (Vite). | 3.3 |
| M18 | Where the suite runs; what CI provisions | ADR-0016 d8, *Not settled* | In the api dev container (`make test`); tests boot the app in-process on a derived `<db>_test` database; the upload category runs through a harness-spawned nginx using the real `proxy/snippets/api.conf`; CI provisions Postgres and nginx on the runner, never Compose. | 16.2 |
| M19 | Test file location and naming | ADR-0016 *Not settled* | `test/<NN>-<category>/*.test.ts`. | 16.3 |
| M20 | Clearing Compose state before a clean-clone check | ADR-0016 d5 | `make wipe` = `docker compose down --volumes --remove-orphans`. | 16.5 |
| M21 | Seed/boot regression detection before defense | Map #1 ⚠️ (open, unowned) | CI: `migrate deploy` from empty, then the seed from empty, then the seed again (must skip). | 16.4 |
| M22 | Legal page rendering | ADR-0018 d14 | Markdown bundled with Vite `?raw`, rendered by a project-owned subset renderer that fails the build on unsupported syntax; no library added. | 3.5.4 |
| M23 | Whether a Block can be lifted | ADR-0018 *Not settled* (§2.3 R1) | Yes: the blocker may delete their Block. | 11.3 |
| M24 | Text caps | ADR-0011 final freeze and every text field | §4.3 and §6.0.3 table. | 6.0.3 |
| M25 | Remove Post entry point | gap | Only as a report-group action. | 12.5 |
| M26 | Response envelope and status policy | gap; `en.subject.md:318` | Refusals reachable in normal use return 200 `{ok:false}`; protocol failures keep 4xx/5xx. | 3.8 |
| M27 | Socket client retry and origin handling | ADR-0003 d7 | `unauthorized` connect error is terminal → sign-in; transport failure triggers an HTTP probe; origin mismatch is terminal. | 7.5 |
| M28 | Seed script: transaction boundaries, selection rules | ADR-0017 d2 | Each step is one application operation (one SSI tx); deterministic per-Round script in §14.5. | 14 |
| M29 | Duplicated configuration sources | gap (user brief) | Boot-time consistency checks: `DATABASE_URL` vs `POSTGRES_*`, `PUBLIC_ORIGIN` port vs `HTTPS_PORT`; Compose defaults equal `.env.example`. | 15.4 |
| M30 | Upload validators | ADR-0009 d5 ("a contract, not a library") | `pngjs`, `jpeg-js`, `pdf-lib` plus structural end-marker checks. | 9.5 |
| M31 | Race-forcing test seam | ADR-0016 (tests bind outcomes) | Named `checkpoint()` in the Unit of Work, no-op in production, barrier in tests. | 3.6.4 |
| M32 | Post-commit event dispatch | ADR-0014 d8, ADR-0015 d8 | Per-attempt `afterCommit` queue flushed only after the successful commit. | 3.7 |
| M33 | Partial unique indexes on Report | ADR-0014 top note | Prisma `partialIndexes` preview (Prisma ≥ 7.4) with a defined raw-SQL fallback. | 4.4 |
| M34 | Production security headers | ADR-0018 d5 (structural) | CSP `default-src 'self'` family on the base path only; `nosniff` on files; **no HSTS**. | 3.10 |

### 2.3 Contradictions and gaps resolved

Items here are **R1–R7**. Bare `C` labels elsewhere (`C3`/`C4`/`C6`/`C7` in §§8, 10, 16) are the
prototype's test criteria, not these items.

- **R1 — Whether a Block can be lifted.** ADR-0018 *Not settled* says *"No record says; the pages
  promise neither."* But ADR-0011 d7 (2026-09-22) specifies *"a concurrent Block create/remove"*,
  ADR-0016 d1's tenth category *"races action against Block create/remove"*, and `CONTRIBUTING.md`
  → Testing repeats it. A required test cannot be written against an operation that does not
  exist, so the difference is buildable. ADR-0018 delegated the answer here (*"If `/to-spec` adds
  it, the Privacy Policy's retention list gains it"*). **Resolution: lifting a Block ships** (§11.3);
  the Privacy Policy's retention list and choices are updated in the same task.
- **R2 — Session id format.** ADR-0014 makes every identifier `uuid(7)` *"unless noted"* and itself
  argues UUIDv7 is not opaque (d10); ADR-0003 d1 requires an **opaque** session id. **Resolution:**
  the session row is the noted exception (M6). No rule changes.
- **R3 — Streak attribution of an answer needs a stored association.** ADR-0007 requires an answer
  to count for the Round open at its *serialization point*, never by request start time. A
  timestamp cannot represent a serialization point (a transaction's `now()` is its start). The
  association is stored (M3). This adds one nullable column that ADR-0014's table did not list; it
  is a mechanism column, not a new entity, rule or participation row.
- **R4 — First Mentor's "moment it is earned".** ADR-0010 d7 puts earn panels on the screen where
  the act happened; First Mentor is earned by the Mentor during the **Mentee's** submission. The
  Mentor therefore sees it on the profile's Badge list on their next profile load, exactly as
  ADR-0010 d7 already rules for an offline Consistent Learner. No event is added.
- **R5 — Browser-console rule versus HTTP error statuses.** Chrome logs every 4xx/5xx fetch as a
  console error, and `en.subject.md:318` requires a clean console. **Resolution** (M26): refusals a
  correctly built UI can reach in normal use return 200 with a typed refusal; statuses remain for
  protocol failures the UI never triggers in normal use. ADR-0009 d3's 401/403 file contract is
  unchanged.

- **R6 — The one cookie's second use was missing from the Privacy Policy.** ADR-0018 d5's
  annotation lets the cookie hold a Sign-in-with-42 attempt identifier before a session exists (M7);
  the Privacy Policy described only a session identifier with a 30-day life. The ADR is the record
  and the page was stale: it is corrected in place (ADR-0018 d15).
- **R7 — `CONTRIBUTING.md`'s Prisma commands contradicted M16.** They ran unpinned and from the
  host, where `db` is unreachable. They are annotated with the pinned in-container commands (§15.6).

Nothing else was found that changes the buildable result. Every other difference between records
was already annotated in place with a winner. *(R6 and R7, and the mechanism corrections listed in
§20, came from the pre-`/to-tickets` verification passes of 2026-09-23 and 2026-09-24.)*

---

## 3. Architecture

### 3.1 Topology

```
browser ──https://localhost:8443──▶ proxy (nginx) ──┬─ /            static React bundle (base path)
        (dev: http://localhost:8081)                 │               Vite on the host (dev overlay only)
                                                     ├─ /api/…       ─▶ api:3000 (NestJS, HTTP)
                                                     └─ /socket.io/  ─▶ api:3000 (Socket.IO, WebSocket only)
api ──postgresql──▶ db:5432 (Postgres, internal network only)
api ──https──▶ api.intra.42.fr (OAuth token exchange and /v2/me only, when configured)
```

- **Three Compose services, `proxy`, `api`, `db`** (ADR-0004 d1). Only `proxy` publishes ports:
  `127.0.0.1:${HTTPS_PORT:-8443}:8443` and `127.0.0.1:${HTTP_PORT:-8080}:8080` on the base path; the
  dev overlay replaces them with `127.0.0.1:8081:8081` (§15.2). `api` and `db` publish nothing.
- **One origin per path**, structural: `https://localhost:8443` (base, `wss` socket) and
  `http://localhost:8081` (dev overlay, `ws` socket and HMR). `PUBLIC_ORIGIN` holds the one value
  for the running path; no code hardcodes either string (ADR-0004 Consequences).
- Every subresource a PeerConnect page loads (script, style, font, image, frame, `fetch`, socket)
  comes from PeerConnect's own origin. The only third-party traffic is Sign in with 42, when a
  Student chooses it: the browser's top-level navigation to 42's authorize page and 42's redirect
  back, and the API's server-side token exchange and `/v2/me` call (ADR-0018 d5).

### 3.2 Repository layout (fixed paths)

The repository root is the API's npm package. This keeps `prisma/`, the root `prisma.config.ts` and
the one `package.json` that constrains `prisma`/`@prisma/client` exactly where ADR-0005, the PR
template and `CONTRIBUTING.md` already name them.

```
/                              NestJS API package (package.json, package-lock.json, tsconfig*.json, nest-cli.json)
├── src/                       API source (§3.4)
│   ├── generated/prisma/      generated Prisma client (gitignored; `prisma generate` output)
│   └── shared/                constants shared with web/: field limits, enum mirrors (§6.0.3)
├── test/                      the Vitest suite, test/<NN>-<category>/*.test.ts (§16.3)
│   └── harness/               in-process app boot, test DB, nginx harness, fixtures loader
├── prisma/                    ── SCHEMA GATE (ADR-0005 d5) ──
│   ├── schema.prisma
│   ├── migrations/
│   ├── seed/                  the seed: entry `main.ts` and every seed-only module (M15)
│   │   └── assets/            the two seeded files: avatar.png, evidence.pdf
│   └── fixtures/              `cohort.ts`, the shared fixture module (ADR-0016 d3)
├── prisma.config.ts           the only Prisma Config (gate)
├── vitest.config.ts
├── Dockerfile                 api image: targets `build`, `runtime`, `dev`
├── web/                       React SPA package (own package.json)
├── proxy/                     nginx: Dockerfile (targets `runtime`, `dev`), nginx.conf,
│   ├── snippets/api.conf      the /api and /socket.io locations shared by every server block and the test harness
│   ├── templates/             base-path server blocks (envsubst: PUBLIC_ORIGIN)
│   └── templates-dev/         dev-overlay server block
├── compose.yaml               base (top-level `name: peerconnect`)
├── compose.dev.yaml           dev overlay (overrides only)
├── Makefile                   convenience only (§15.6)
├── .env.example               the fifteen entries (§15.4); `.env` gitignored
├── .github/workflows/ci.yml   the one advisory workflow (§16.4)
├── README.md                  critical path (§17.5)
└── docs/                      adr/, agents/, legal/, research/, spec.md
```

The API build compiles from the repository root, so `dist/` mirrors the tree: `dist/src/main.js` and
`dist/prisma/seed/main.js` (§14.1, §15.5). `nest-cli.json` therefore sets `entryFile: "src/main"`;
Nest's default `dist/main.js` never exists, and the dev overlay's `nest start --watch` (§15.2) runs the
entry file. The build copies no assets. The seed reads its two files from `prisma/seed/assets/`,
resolved against the working directory, which is always the repository root: `/app` in every api
image, the checkout in CI (§16.4). The api runtime image copies `prisma/` whole, which
`migrate deploy` needs anyway.

`.gitignore` covers `.env`, `node_modules/`, `dist/`, `src/generated/`, `web/dist/`. `.dockerignore`
excludes the same plus `.git/`. **No Prisma Config file other than the root `prisma.config.ts` may
exist anywhere** (ADR-0005 d5): nothing may sit at any path the pinned Prisma 7 CLI can discover a
Config at. Read off a file list, that is three patterns; each matches every extension and a directory
of that name, so it also covers the `…/index.*` forms `c12` resolves:

- `/prisma.config*` — the root `prisma.config.*` family; only `prisma.config.ts` may exist, and a
  root `prisma.config.js` would load before it on every 7.x release;
- `/prisma7.config*` — loaded first of all by 7.10+;
- `/.config/prisma*` — `.config/prisma7.*` (loaded before `prisma.config.ts` by 7.10+), and
  `.config/prisma.*`, `.config/prisma.config.*` (loaded once `prisma.config.ts` is gone).

These are the whole discovery set of `prisma` 7.0–7.10 (`@prisma/config`'s `loadConfigFromFile`
and the `c12` search it delegates to; `docs/research/prisma-7-config-governance.md`). Every file
matching one is inside the schema gate (§17.2), and only `prisma.config.ts` is ever approved.

### 3.3 Technology stack

Stack components are the map's; the libraries under them are chosen here. **A new stack component
goes through the map; a new runtime library needs a PR sentence saying why.**

| Layer | Choice | Constraint / record |
| --- | --- | --- |
| Runtime | Node.js 22 LTS, `node:22-alpine`, `engines.node: "^22.12.0"` | Prisma 7 floor (ADR-0005) |
| Language | TypeScript ≥ 5.4, `strict: true` | ADR-0005 |
| Backend framework | NestJS 11 on Express (`@nestjs/platform-express`) | map |
| Module format | API, seed, fixture and Prisma client **CommonJS**; SPA **ESM** (M17) | ADR-0005 left it open |
| ORM | `prisma` and `@prisma/client` **`^7.4.0`** (still the `^7` major; 7.4 is the first with `partialIndexes`); `prisma` is a **runtime** dependency because the runtime image runs `migrate deploy` and the seed | ADR-0005 d6, ADR-0014 |
| Prisma generator | `provider = "prisma-client"`, `output = "../src/generated/prisma"`, `moduleFormat = "cjs"`, `previewFeatures = ["partialIndexes"]` | ADR-0005 Consequences |
| DB driver | `@prisma/adapter-pg` + `pg`, `new PrismaClient({ adapter })` | ADR-0005 Consequences |
| Database | PostgreSQL 17 (`postgres:17-alpine`) | map |
| Passwords | `@node-rs/argon2`, argon2id m = 19456 KiB, t = 2, p = 1 | ADR-0003 d3 |
| Validation | `class-validator` + `class-transformer` via a global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) | `en.subject.md:381` |
| Realtime | `socket.io` 4 via `@nestjs/websockets` + `@nestjs/platform-socket.io`; `socket.io-client` 4 in the SPA and tests | map, ADR-0003 d7 |
| Uploads | Multer memory storage (bundled with platform-express); `pngjs`, `jpeg-js`, `pdf-lib` for byte validation (M30) | ADR-0009 d5 |
| Cookies | `cookie` (parse/serialize) for HTTP and the socket handshake | ADR-0003 d1 |
| Config | `dotenv` imported by `prisma.config.ts` only, and so a **runtime** dependency like `prisma` (§15.5); the app reads `process.env` | ADR-0005 Consequences |
| Frontend framework | React 19 + Vite (current major at scaffold) + `@vitejs/plugin-react` | map |
| Styling | Tailwind CSS 4 | map, `en.subject.md:369` |
| Frontend data | TanStack Query 5 (server state), TanStack Router 1 (routing, search params), TanStack Table 8 (Users table, search results) | map, ADR-0014 Consequences |
| Charts | Recharts 3, `/admin/analytics` only | ADR-0015 d7 |
| Tests | Vitest (current major), `unplugin-swc` + `@swc/core` for the API, `supertest`, `socket.io-client` | ADR-0016 d2 |
| Proxy | nginx stable, Alpine image, exact tag pinned in `proxy/Dockerfile` at scaffold | ADR-0004 |
| Orchestration | Docker Compose ≥ 2.24.4 (`env_file.required` from 2.24.0; `!override`, used by the dev overlay, only from 2.24.4) | ADR-0004 d8 |
| CI | GitHub Actions, one advisory workflow | ADR-0016 d8 |

**Not in the stack, by rule:** JWT libraries, Passport, Redis or any shared store, a Markdown
library (M22), an icon or font package fetched from a CDN, analytics SDKs, `mkcert`, Caddy.

### 3.4 Backend module boundaries

NestJS modules under `src/`. Controllers and the gateway are thin: they parse, validate the DTO,
resolve the actor, call **one** service method, and shape the envelope. **Every service method that
acts for a signed-in Student takes an `Actor` (`{ studentId, sessionHash }`, `sessionHash` null for
an actor the seed or a test constructs). One that writes re-reads the actor's current role and
sanction flags inside its own SSI transaction and refuses if they no longer allow the action** — the
HTTP guard is a fast pre-check, never the authority for a write (ADR-0003 d5, ADR-0011 d7). A
read-only method runs outside the Unit of Work (§3.6.2) and relies on the guard's fresh per-request
read of role and flags (§5.3). Three kinds take no `Actor`: the operations that establish or resolve
one — `signup`, `login`, `start42`, `complete42`, `resolveSession` — each reading the Student row it
acts on itself, inside the transaction when it writes (§5.1, §5.3, §5.6); pure functions — the matcher engine, the byte
validators, Level arithmetic; and the `tx` helpers, which run inside a caller's transaction that
has already read its actor. The seed and the tests call the same service methods, with a
constructed `Actor` where the method takes one.

| Module | Owns | Public operations (service level) |
| --- | --- | --- |
| `core` | env validation (§15.4), Prisma client, Unit of Work (§3.6), `RealtimePublisher` port (§3.7), envelope + exception filter (§3.8), guards (session, role, JSON-mutation, upload-CSRF), throttle store (§5.5), logger (§3.9) | — |
| `auth` | `Session`, the OAuth attempt store | `signup`, `login`, `logout`, `resolveSession`, `changePassword`, `start42`, `complete42` |
| `students` | `Student` profile fields, `StudentSkill`, Learning Goal, search, `Avatar` | `getProfile`, `updateOwnProfile`, `setSkills`, `setLearningGoal`, `clearLearningGoal`, `search`, `putAvatar`, `deleteAvatar` |
| `files` | byte validation, file serving | `validateAvatar`, `validateEvidence`, `readAvatar`, `readEvidence` |
| `social` | `Friendship`, `Block` | `requestFriend`, `acceptFriend`, `declineFriend`, `cancelFriend`, `endFriendship`, `block`, `unblock`, `listFriends`, `listRequests`, `listBlocks` |
| `messaging` | `DirectMessage` | `send`, `listThreads`, `readThread`, `markThreadRead` |
| `realtime` | Socket.IO gateway, Presence registry, rooms, forced disconnect | implements `RealtimePublisher`; handles `dm:send` by calling `messaging.send` |
| `matching` | pure matcher (`src/matching/engine/`, no Nest, no Prisma), `Round`, `Match`, `MatchSkillCoverage` | `openRound`, `closeRound`, `createHandMadeMatch`, `accept`, `decline`, `currentMatch`, `history`, `unmatched` |
| `reviews` | `Review`, `PrivateFeedback`, `Evidence` | `submitReview`, `getReview`, `listFeedbackReceived`, `putEvidence`, `deleteEvidence` |
| `prompts` | `ReflectionPrompt`, Prompt-origin `Post` creation | `publish`, `answer`, `live`, `list` |
| `feed` | `Post` reads, `Like` | `feed`, `getPost`, `like`, `unlike`, `likers`, `postsBy` |
| `gamification` | XP arithmetic, Level, Badge evaluation, Streak evaluation, Leaderboard | `awardMatchXp(tx,…)`, `awardPromptXp(tx,…)`, `evaluateStreaksAtClose(tx,…)`, `leaderboard`, `progress` — the `tx` functions run only inside a caller's transaction |
| `moderation` | `Report` | `file`, `queue`, `resolvePostGroup`, `resolveStudentGroup`, `resolvedAudit` |
| `admin` | Users table, role changes, sanctions | `listUsers`, `getUser`, `editUser`, `changeRole`, `suspend`, `reinstate`, `remove` |
| `analytics` | read-only Learning Analytics | `snapshot` |

Rules: a module writes only the tables it owns, except inside a transaction that a single service
method opens and that the ADRs make one atomic unit (e.g. Review submission writes `Review`,
`PrivateFeedback`, `Post`, `Match`, `Student.xp`, `BadgeAward` through the `gamification` and `feed`
helpers). **The matcher engine is a pure function** of its input (candidates with Skill sets, Learning
Goals, Levels and ids; the set of previously matched pairs; the set of blocked pairs) returning the
ordered list of Matches with orientation, Score, goal flag and coverage. It is the seam for the C-
criteria tests (§16.3).

### 3.5 Frontend

#### 3.5.1 Routes and guards

A single SPA under TanStack Router. **Signed-out readable routes are exactly four** (ADR-0018 d12):
`/sign-in`, `/sign-up`, `/privacy`, `/terms`. Every other route requires a session; the router's
`beforeLoad` redirects to `/sign-in` when `GET /api/session` reports `authenticated: false`. Role
routes redirect a Student without the role to `/`; the server enforces the same rule again.

| Route | Who | Surface |
| --- | --- | --- |
| `/` | signed-in | Feed (live via `post:created`) |
| `/prompts`, `/prompts/:promptId` | signed-in | Live Prompt with answer form (hidden for `ADMIN`), history, answers |
| `/match` | signed-in | Current Match: partner, role, Score + explanation or "Matched by an Admin", Mission, accept/decline, Review entry |
| `/matches`, `/matches/:matchId` | the pair | Own Match history; completed Match shows Learning Outcome, Evidence (preview), Private Feedback to its readers |
| `/matches/:matchId/review` | the Mentee | Review form, then earn panel, then Evidence upload |
| `/feedback` | signed-in | Private Feedback received (Mentor's private route, ADR-0013 d5) |
| `/students`, `/students/:studentId` | signed-in | Search (filters, sort, pagination); profile |
| `/me` | signed-in | Edit profile, Skills, Learning Goal, avatar, email, password; own progress |
| `/friends` | signed-in | Friends with Presence, incoming/outgoing requests, Blocks |
| `/messages`, `/messages/:peerId` | signed-in | Threads with unread counts; conversation |
| `/leaderboard` | signed-in | Top ten + own pin |
| `/rules` | signed-in | Static XP table, Level bands, Badge conditions, Level-10 cap (ADR-0010 d7) |
| `/moderation` | `PEER_MODERATOR` | Eligible open Post-report groups (ADR-0011 d7) |
| `/admin/users`, `/admin/users/:studentId` | `ADMIN` | Users table and detail with state-specific actions |
| `/admin/rounds`, `/admin/rounds/:roundId`, `/admin/matches/:matchId` | `ADMIN` | Open/close, Matches, unmatched list, hand-made Match, full Match detail |
| `/admin/prompts` | `ADMIN` | Publish; history |
| `/admin/reports` | `ADMIN` | Open queue (with reporters) and resolved audit |
| `/admin/analytics` | `ADMIN` | Learning Analytics (§13) |

The **footer shows on every route**, signed in or out, with links to `/privacy` and `/terms`
(ADR-0018 d12). Student surfaces never show a Peer Moderator label; an Admin carries an "Admin" label
wherever another Student sees them (ADR-0018 d4).

#### 3.5.2 Data, validation and state

- All server state through TanStack Query; the socket only invalidates or inserts (§7.4). No global
  store beyond Query and the router.
- **Every form validates on the client with the same limits the server enforces**, from
  `src/shared/limits.ts` imported through a Vite alias. The client pre-checks everything it can know
  (lengths, formats, file size and declared type) so that normal use never reaches a server
  validation error (§3.8.2).
- Uploads use `XMLHttpRequest` for `upload.onprogress` (progress indicator, `en.subject.md:546`) and
  send `X-PeerConnect-CSRF: 1`.
- Browser storage: `localStorage` may hold interface preferences only (e.g. a collapsed panel). Never
  a token, never Student data, never OAuth state (ADR-0018 d5).
- Responsive from 360 px width upward; all layouts are Tailwind utilities.

#### 3.5.3 Design system (Minor `:526`)

Project-owned, in `web/src/design/`: a colour palette as Tailwind theme tokens (primary, neutral,
success, warning, danger, each with a 50–900 scale), a type scale on the system font stack (no web
font is downloaded — ADR-0018 d5), and an icon set of hand-authored inline SVG React components (no
icon package, no CDN). **At least these ≥ 10 reusable components**, each used by at least two
screens: `Button`, `IconButton`, `TextField`, `TextArea`, `Select`, `Checkbox`, `Card`, `Avatar`
(with default image), `RoleLabel` (Admin chip), `SkillChip`, `Modal`, `Tabs`, `DataTable` (TanStack
Table wrapper with sort and pagination), `Pagination`, `ProgressBar`, `FileDrop` (drag/drop, type and
size pre-check, preview, progress), `EmptyState`, `Banner`. A favicon ships in the bundle.

#### 3.5.4 Legal pages (M22)

`/privacy` and `/terms` render `docs/legal/privacy-policy.md` and `docs/legal/terms-of-service.md`
— the canonical text (ADR-0018 d14) — imported with Vite's `?raw`, so the text is inside the bundle
and nothing is fetched. A project-owned renderer (`web/src/legal/markdown.tsx`) supports exactly the
constructs the two files use: ATX headings, paragraphs, `**bold**`, `*italic*`, inline code, `-`
bullet lists (including one nested level and indented continuation lines, as the Terms' sanctions
list has), `1.` numbered lists, pipe tables with a header row, `[text](url)` links, and a bracketed
`[…]` not followed by `(` as literal text (the pages' `[42 login needed]` markers). It escapes
all text. **An unsupported construct throws during `vite build`** (the renderer runs over both files
in a build-time check), so a page can never silently mis-render. No Markdown library is added.

### 3.6 Transactions and serialization (M1)

#### 3.6.1 The rule

**Every operation that writes a domain row runs inside exactly one `SERIALIZABLE` transaction opened
by the Unit of Work, and every read that the decision depends on happens inside that same
transaction.** PostgreSQL's serializable snapshot isolation then guarantees that committed results are
equivalent to one serial order, and that a transaction which committed before another began is
ordered first — which is the literal wording of every serialization contract in ADR-0002, 0006, 0007,
0008, 0009, 0010, 0011, 0012 and 0014. The only per-operation obligation left to implementers is
**what to read inside the transaction**, and every operation in §§5–14 lists it.

#### 3.6.2 Unit of Work contract

```ts
// src/core/uow.ts — shape, not implementation
run<T>(operation: string, work: (tx: PrismaTx, ctx: TxContext) => Promise<T>): Promise<T>
TxContext = {
  now: Date;                                  // one timestamp per attempt, from the injectable Clock
  checkpoint(name: string): Promise<void>;    // no-op in production (§3.6.4)
  afterCommit(effect: () => void): void;      // queued per attempt (§3.7)
}
```

- Opens `prisma.$transaction(work, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 })`.
- **Retries** the whole `work` when the error is Prisma `P2034` or carries SQLSTATE `40001`
  (serialization failure) or `40P01` (deadlock). Up to **10 attempts**, sleeping a random 5–25 ms ×
  attempt number between them. Operations may declare additional retryable unique-violation targets
  (only `ReflectionPrompt.publication_order`, §8.12).
- **A unique violation (`23505`) on a known constraint becomes that operation's mapped refusal
  code.** The SSI reads of §3.6.3 pre-empt most of them and the constraints stay as the deterministic
  backstop; when a partial or unordered index fires anyway, the Unit of Work maps it per operation:
  `round_single_open` → `round_already_open` (§8.4); the `Student.email` unique → `email_unavailable`
  (§6.1, §6.2); `friendship_unordered_pair` → `friendship_exists` (§6.4); the Report partial uniques →
  `already_reported` (§12.2); the `Block` unique → `already_blocked` (§6.4); `UNIQUE Review(match_id)` →
  `already_reviewed` (§9.2); `UNIQUE(prompt_id, author_id)` → `already_answered` (§8.12). Standing-Match
  races have no backing constraint — the schema cannot express them (ADR-0014 d13) — so the service
  check refuses with the existing `already_matched` and no `23505` arises. The refusal
  vocabulary (§6.15) is unchanged and every constraint stays; only `ReflectionPrompt.publication_order`
  is retried instead. **A `23505` on any other constraint is unexpected: it is never converted into an
  unrelated business refusal and falls through to `internal_error`.**
- **Exhaustion** raises `ConcurrencyExhausted` → HTTP 503 `busy_retry_later`; nothing was committed,
  so the client may retry, and every event constraint (Review per Match, answer per Prompt and
  Student, report per reporter and target, BadgeAward per Student and Badge) prevents a double
  effect.
- `work` performs database work only. No network call, no socket emit, no file-system write inside it.
  Byte validation of uploads happens **before** `run` (§9.5).
- Nested `run` is forbidden; helpers that must join a transaction take the caller's `tx`.
- Reads that serve no mutation (GET handlers) run as plain queries. A GET that needs several
  mutually consistent reads (analytics, queue views) uses one `REPEATABLE READ READ ONLY` transaction.

#### 3.6.3 Which contracts this covers

| Contract | Conflicting operations | What each must read inside its tx |
| --- | --- | --- |
| One open Round (ADR-0002 d2) | open vs open | open-Round predicate; the partial unique index is the backstop |
| Eligibility vs Match creation (ADR-0008 d2) | role change, Suspension, Removal vs Round open, hand-made Match | candidates' role and flags (creation); the target's standing Matches (sanction) |
| Standing-Match exclusivity (ADR-0006 d10) | hand-made vs hand-made | both Students' standing Matches in the Round |
| Mission index (ADR-0012 d6) | hand-made vs hand-made | count of Match rows in the Round |
| Nothing commits into a closed Round (ADR-0002 d7) | hand-made vs close | the Round row (creation); the Round's Matches (close) |
| Review vs terminal transitions (ADR-0002 d5) | Review vs close, Decline, Suspension, Removal | the Match row (all write it) |
| Publication order and answer liveness (ADR-0007 d1) | publish vs publish vs answer | max publication order (both) |
| Answer vs Round close (ADR-0007 d1) | answer vs close | the open Round (answer); Prompt-origin Posts attributed to the Round (close) |
| XP accumulation and thresholds (ADR-0010 d2) | Review vs answer vs close for one Student | the Student row (all update it) and the Badge counts |
| Sanction vs Round close (ADR-0010 d4) | Suspension/Removal vs close | the Student row (both write it) |
| Active-Admin invariant (ADR-0008 d9) | demote/suspend/remove vs each other | the set of active Admins |
| Sessions die with the password or a sanction (ADR-0003 d6) | sign-in, 42 callback vs password change, Suspension, Removal | the Student's `password_hash` and flags (session creation, §5.1); the Student's sessions (the change or sanction) |
| Block vs Friendship (ADR-0014 d4) | block vs request | Friendship rows of the pair (block); Block rows of the pair (request) |
| Report group resolution (ADR-0011 d6) | resolve vs resolve vs file vs target Removal | the group's `OPEN` rows; the target's `removed_at` |
| Block vs moderation action (ADR-0011 d7) | Block create/remove vs Peer Moderator action | Blocks between the moderator and the group's author and reporters |
| Evidence at most one (ADR-0009 d5) | put vs put vs delete | the Review's Evidence row |

#### 3.6.4 Test seam: `checkpoint` (M31)

Each operation with a row in the table above calls `await ctx.checkpoint('<operation>')` exactly once,
after its deciding reads and before its first write. In production the call is a no-op. The test
harness binds it to a barrier so a test can hold two transactions at the point where both have read
and neither has written, then release them, forcing the race deterministically. A barrier releases a
given participant only on its first arrival, so the retried attempt passes straight through.

### 3.7 Post-commit events (M32)

`RealtimePublisher` is a port in `core` with one method per server-to-client event (§7.4) plus
`revokeSessions`. Services never call it directly inside `work`; they call
`ctx.afterCommit(() => publisher.x(...))`. The Unit of Work discards the queue of every failed or
retried attempt and flushes the successful attempt's queue in order after commit. An effect that
throws is logged (§3.9) and does not fail the request: every DB-derived event is an invalidation or
an insert that a reload also recovers. The socket gateway implements the port; the seed and the test
harness bind a no-op or a recording implementation.

### 3.8 Response envelope and status policy (M26)

#### 3.8.1 Envelope

Every JSON response has one of two shapes:

```json
{ "ok": true,  "data": { } }
{ "ok": false, "error": { "code": "snake_case_code", "message": "Human-readable sentence." } }
```

#### 3.8.2 Statuses and the clean console

`en.subject.md:318` makes a clean console mandatory, and Chrome logs every 4xx/5xx `fetch` as a
console error. So:

| Situation | Status | Body |
| --- | --- | --- |
| Success | 200, or 201 for a creation | `ok: true` |
| **Refusal a correctly built UI can reach in normal use** — wrong credentials, throttling, a uniqueness or state conflict, a race lost, a file whose bytes fail validation | **200** | `ok: false` with a domain code (§6.15) |
| Request violating the DTO schema (the client pre-check prevents it in normal use) | 400 | `validation_failed` |
| Protected route without a valid session | 401 | `unauthenticated` |
| Authenticated but the role or relation forbids it; CSRF gate; file not readable | 403 | `forbidden` / `csrf_rejected` |
| Unknown resource or route | 404 | `not_found` |
| Upload over the transport envelope / non-multipart upload | 413 / 415 | `payload_too_large` / `unsupported_media_type` |
| Unit of Work exhausted | 503 | `busy_retry_later` |
| Anything else | 500 | `internal_error` |

`GET /api/session` returns 200 with `authenticated: false` when signed out, so a signed-out visitor
produces no error at all. The SPA never calls a protected route without a session it believes valid;
if it receives a 401 it re-probes `/api/session` and routes to `/sign-in`. It never renders an `<img>`
or `<iframe>` for a file URL the viewer cannot read: a Removed Student's avatar is the bundled default.
ADR-0009 d3's 401/403 file contract is unchanged; it is a security boundary, not a UI flow.

### 3.9 Logging (M10–M13)

**The rule the build inherits (ADR-0018 d6):** no log — nginx's, the API's, the database's — ever
contains a password, a cookie, a request body, message text, file contents, a query string, an OAuth
`code` or `state`, or a search term.

**nginx — `proxy/nginx.conf` must contain exactly these logging directives, and no other
`access_log`, `error_log` or `log_format` anywhere in the proxy image** (the official image's own
`nginx.conf` is replaced, not included):

```nginx
error_log  /dev/stderr warn;                       # main context: process-level messages only
http {
    error_log  /dev/null;                          # http context: request/connection entries discarded
    map $request_uri  $pc_path    { "~^(?<p>[^?]*)"   $p; }
    map $http_referer $pc_referer { "~^(?<r>[^?#]*)"  $r; }
    log_format pc_request '$time_iso8601 $remote_addr "$request_method $pc_path" '
                          '$status $body_bytes_sent "$pc_referer" "$http_user_agent"';
    access_log /dev/stdout pc_request;
    server_tokens off;
    # … upstream, maps and includes (§15.3)
}
```

- The **request log** records exactly the fields the Privacy Policy discloses: time, network
  address, method and path **without the query string**, status, response size, referring page
  **without its query string**, browser type. No `$request`, `$args`, `$http_cookie`,
  `$request_body` or header dump appears in any format.
- **The error log is resolved by discarding every request-context entry (M11).** nginx appends the
  full request line and referrer to every error entry written while handling a request, in a fixed
  format no directive can change. Every such entry goes to the http-level log, which is `/dev/null`.
  The main-context log keeps process-level messages (startup, configuration, worker exits), which
  nginx writes without request context. Startup failures still appear in `docker compose logs proxy`.
  The diagnostic cost is accepted: the request log's status field still shows every 413, 502 and 504.
  **The Privacy Policy's single disclosed request log therefore stays exactly true; no second log is
  disclosed because none holds a request.**
- **API** (`src/core/logger`): Nest's logger at `log`/`warn`/`error`, JSON lines to stdout. No HTTP
  request logging of any kind. The global exception filter logs a 5xx as `{ level, time, method,
  route: <matched route pattern, never the URL>, error: <class name>, code: <Prisma code if any>,
  stack }`, **omitting the message of any Prisma or driver error** (they can embed argument values).
  For those errors `stack` is the call frames only: a V8 `stack` begins with `<name>: <message>`,
  so logging it whole would log the message.
  Validation errors, refusals and 4xx are not logged. Socket handlers never log payloads. The seed
  logs step names and counts, the demo Student's email, never a password. The throttle never logs
  its keys. Prisma's own `log` option is empty.
- **Postgres**: the `db` service runs `postgres -c log_error_verbosity=terse -c
  log_min_error_statement=panic`. `terse` drops `DETAIL`/`HINT`/`QUERY`/`CONTEXT`, where PostgreSQL
  would otherwise print the violating key values or the whole failing row (a Report's text, a Post's
  body); `panic` stops it logging the statement of a failed query. Constraint names still appear.
- **Retention**: every service's container log is capped and rotated by Compose (M12, §15.1).

### 3.10 Security headers (M34)

- **Base path only**, on the `location /` that serves the bundle: `Content-Security-Policy:
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
  font-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'self'; frame-ancestors 'self';
  base-uri 'self'; form-action 'self'`. This makes ADR-0018 d5's "nothing loaded from another
  server" structural for every subresource; the top-level navigation to 42 (§3.1) is outside CSP's
  reach and is that decision's stated exception. It is not set in the dev overlay, where Vite injects inline scripts. The
  browser pass (§16.7) confirms it produces no console violation.
- Every file response carries `X-Content-Type-Options: nosniff` (ADR-0009 d5); authenticated JSON
  carries `Cache-Control: no-store`.
- **No `Strict-Transport-Security`, ever**: HSTS is per host, not per port, and would force the dev
  origin `http://localhost:8081` onto HTTPS in the same browser.

---

## 4. Data model

### 4.1 Conventions

- **Nineteen tables, nine enums** (ADR-0014). Prisma model names are the table names (`"Student"`,
  `"Match"`, …, as ADR-0014's SQL quotes them); columns are `snake_case` via `@map`.
- **Identifiers**: `uuid` with `@default(uuid(7))` everywhere (ADR-0014 d10), except
  `Session.id` (M6, §5.2) and the composite primary keys of `MatchSkillCoverage`, `Like` and
  `BadgeAward`. `Avatar.token` and `Evidence.token` are `uuid` with `@default(uuid(4))` and appear in
  routes instead of the id (ADR-0014 d10). **"Lower Student id"** in every tie-break means the lower
  `Student.id` in PostgreSQL `uuid` order, which equals lexicographic order of the canonical
  lowercase string. Every tie-break needs only that deterministic total order. A UUIDv7 leads with
  the millisecond it was generated (Prisma's `uuid(7)` is the `uuid` package's `v7()`, monotonic
  within one process), so id order follows creation order, as ADR-0014 d10 wants; under concurrent
  sign-ups it is the order the ids were generated, not the order they committed. The seed, whose
  script needs id order to equal its position order, creates Students one at a time and asserts it
  (§14.3).
- **Times** are `timestamptz(3)`. Descriptive only: no rule orders by a timestamp where a
  serialization point is meant (R3).
- **Text** columns are `text`; their length limits are service-enforced (§6.0.3), not `varchar`.
- **Foreign keys are `ON DELETE RESTRICT ON UPDATE RESTRICT` everywhere.** Only leaf rows are ever
  hard-deleted (`Session`, `Avatar`, `Evidence`, `StudentSkill`, `Block`, `Friendship`, `Like`), and
  the one referenced leaf (`StudentSkill`, referenced by a Learning Goal) is cleared before deletion
  (§4.3.1). `Student` and `Post` are soft-deleted; every other table is append-only history.
- **Soft delete exists on `Student.removed_at` and `Post.removed_at` only** (ADR-0008 d6). Every read
  of those two tables applies the surface rule in §4.6; no other table has or needs the flag.

### 4.2 Enums

| Enum | Values (declaration order) | Notes |
| --- | --- | --- |
| `Role` | `STUDENT`, `PEER_MODERATOR`, `ADMIN` | one per Student (ADR-0008 d1) |
| `SkillKind` | `TEACH`, `LEARN` | |
| `FriendshipStatus` | `PENDING`, `ACCEPTED` | a declined, cancelled or ended Friendship is deleted |
| `MatchStatus` | `MATCHED`, `ACCEPTED`, `COMPLETED`, `LAPSED`, `DECLINED`, `TERMINATED_BY_ADMIN` | standing = first four; repudiated = last two (ADR-0014 d2) |
| `Mission` | `TECHNICAL_CONCEPT`, `PROJECT_PROBLEM`, `PAIR_PROGRAMMING`, `CODE_REVIEW`, `TECHNOLOGY_DISCUSSION`, `ADVICE` | order is the round-robin order (ADR-0012 d4) |
| `CoverageDirection` | `FORWARD`, `REVERSE` | FORWARD = Mentee gains |
| `ReportReason` | `HARASSMENT`, `SPAM`, `INAPPROPRIATE_CONTENT`, `OTHER` | coupled to the Terms (ADR-0011 d4, ADR-0018 d9) |
| `ReportState` | `OPEN`, `ACTIONED`, `DISMISSED` | |
| `Badge` | `FIRST_MENTOR`, `KNOWLEDGE_SHARER`, `CONSISTENT_LEARNER` | |

The six Mission sentences live in the SPA only (ADR-0012 d4–d5): *Work through a technical concept
together.* · *Walk through how one of you solved a project problem.* · *Do a short pair-programming
session.* · *Review a piece of code together.* · *Discuss a technology, tool, or approach.* · *Share
advice about a project or learning path.*

### 4.3 Tables

Legend for each table: **PK**; **columns** (type, null, default); **unique**; **indexes**;
**FKs**; **delete**; **service invariants** (not enforceable in SQL here); **serialization**.

#### 4.3.1 `Student` — the account; every person is one

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | no | uuid(7) | PK |
| `email` | text | no | | stored trimmed and lower-cased; UNIQUE; survives Removal (burned) |
| `password_hash` | text | no | | argon2id PHC string (salt and parameters embedded). **Blocked by #24**: becomes nullable only if #24 allows OAuth-created accounts |
| `display_name` | text | no | | 1–40 chars |
| `role` | `Role` | no | `STUDENT` | |
| `xp` | integer | no | 0 | written only by the three XP paths (§10) |
| `streak` | integer | no | 0 | written only by Round close (§8.7) |
| `learning_goal_student_skill_id` | uuid | yes | | the Learning Goal (§ below) |
| `learning_goal_text` | text | yes | | 1–200 chars; the displayed sentence |
| `suspended_at` | timestamptz | yes | | set by Suspension, cleared by reinstatement |
| `removed_at` | timestamptz | yes | | set once by Removal; never cleared |
| `created_at` | timestamptz | no | now() | |

- **Unique**: `email`.
- **FK**: `(id, learning_goal_student_skill_id) → StudentSkill(student_id, id)` (composite; `MATCH
  SIMPLE`, so a null Goal is unchecked). This makes "the Goal is one of **this** Student's own rows"
  a database fact (M5, ADR-0014 d3).
- **Delete**: never hard-deleted. `removed_at` is the soft delete.
- **Status** (derived, ADR-0014 note): `removed_at` set → **Removed**; else `suspended_at` set →
  **Suspended**; else **Active**.
- **Service invariants**: the referenced `StudentSkill.kind` is `LEARN`; `learning_goal_text` is
  non-null exactly when the reference is; removing the Goal's Skill from the list clears both Goal
  columns in the same transaction; a Removed row accepts no update of any column; `xp` and `streak`
  never negative and never set by any edit path; `password_hash` changed only by its owner (§5.1);
  `role` changed only by another Admin (§12.7).
- **Serialization**: XP writes, Streak writes, sanctions and role changes all update this row, so
  they conflict and serialize (§3.6.3). The active-Admin invariant reads the set of active Admins.

#### 4.3.2 `Session` — ADR-0003's session row

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | text | no | PK; lowercase hex SHA-256 of the 32-byte token the cookie carries (M6) |
| `student_id` | uuid | no | FK `Student` |
| `expires_at` | timestamptz | no | sliding, 30 days (§5.2) |

- **Index**: `student_id`. **Delete**: hard (logout, password change, Suspension, Removal, expired-row
  purge in the sign-up, sign-in and successful-42-callback transactions, §5.2). No other column: the role is never stored here (ADR-0003 d5).

#### 4.3.3 `Avatar` — 0..1 per Student

Columns: `id` uuid PK; `student_id` uuid UNIQUE FK; `token` uuid UNIQUE `uuid(4)`; `bytes` bytea;
`mime` text; `size` integer; `uploaded_at` timestamptz.
- **Delete**: hard (owner or Admin removes; Removal deletes). **Replace** rewrites `bytes`, `mime`,
  `size`, `uploaded_at` **and issues a new `token`** so a cached URL never shows the old face.
- **Service invariants**: `mime ∈ {image/png, image/jpeg}` and `size ≤ 2,097,152`, both derived from
  validated bytes (ADR-0009 d5); a Removed Student has no row (ADR-0009 d6).

#### 4.3.4 `Skill` — the shared catalogue

Columns: `id` uuid PK; `name` text UNIQUE. **Rows are inserted by the seed's catalogue step and by
migrations only; never updated or deleted** (ADR-0014 d3). No admin screen.

#### 4.3.5 `StudentSkill` — teach and learn lists

Columns: `id` uuid PK; `student_id` uuid FK; `skill_id` uuid FK; `kind` `SkillKind`; `created_at`.
- **Unique**: `(student_id, skill_id, kind)`; `(student_id, id)` (target of the Learning Goal FK).
- **Index**: `(skill_id, kind)` (analytics, search).
- **Delete**: hard, through the list-replacement operation only (§6.2), which diffs so that a Skill
  kept on a list keeps its row (and therefore its Goal).

#### 4.3.6 `Block` — directed, evaluated either way

Columns: `id` uuid PK; `blocker_id` uuid FK; `blocked_id` uuid FK; `created_at`.
- **Unique**: `(blocker_id, blocked_id)`. **Index**: `blocked_id`.
- **Delete**: hard, by the blocker lifting it (M23).
- **Service invariants**: `blocker_id ≠ blocked_id`; the blocked Student is not Removed at creation.
- **Serialization**: a Block and a Friendship row between the same pair never coexist at any commit
  (§11.2).

#### 4.3.7 `Friendship` — directed request with acceptance

Columns: `id` uuid PK; `requester_id` uuid FK; `addressee_id` uuid FK; `status`
`FriendshipStatus`; `created_at`; `responded_at` timestamptz NULL.
- **Unique**: `friendship_unordered_pair` (raw, §4.4 step 6). **Indexes**: `(addressee_id, status)`,
  `(requester_id, status)`.
- **Delete**: hard (decline, cancel, end, or a Block).
- **Service invariants**: `requester_id ≠ addressee_id`; `responded_at` set exactly when `ACCEPTED`.

#### 4.3.8 `DirectMessage` — 1:1, no Conversation entity

Columns: `id` uuid PK; `sender_id` uuid FK; `recipient_id` uuid FK; `body` text; `created_at`;
`read_at` timestamptz NULL.
- **Indexes**: `(sender_id, recipient_id, created_at)` (a thread is the two directions of this index);
  `(recipient_id, read_at)` (unread counts).
- **Delete**: never. **Update**: only `read_at`, only by the recipient, only from null (§11.4).
- **Service invariants**: `sender_id ≠ recipient_id`; at send, no Block in either direction and the
  recipient is not Removed.

#### 4.3.9 `Round`

Columns: `id` uuid PK; `opened_at` timestamptz default now(); `closed_at` timestamptz NULL.
- **Unique**: `round_single_open` (raw, §4.4 step 7) — at most one open Round.
- **Delete**: never. `closed_at` is written once and never cleared (ADR-0002 Consequences).
- **Derived**: open ⇔ `closed_at IS NULL`; the displayed **Round number** is its 1-based position by
  `(opened_at, id)`.

#### 4.3.10 `Match`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | no | uuid(7) | |
| `round_id` | uuid | no | | FK `Round` |
| `mentor_id` | uuid | no | | FK `Student` |
| `mentee_id` | uuid | no | | FK `Student` |
| `status` | `MatchStatus` | no | `MATCHED` | |
| `mission` | `Mission` | no | | index-assigned at creation, never updated |
| `compatibility_score` | smallint | yes | | 25–100 for a matcher Match; NULL exactly for a hand-made Match |
| `goal_bonus_applied` | boolean | no | | frozen explanation state |
| `mentor_accepted_at` | timestamptz | yes | | |
| `mentee_accepted_at` | timestamptz | yes | | |
| `declined_by_id` | uuid | yes | | FK `Student`; non-null exactly when `DECLINED` |
| `created_at` | timestamptz | no | now() | |

- **Indexes**: `(round_id, status)`, `mentor_id`, `mentee_id`, `match_pair_history` (raw, non-unique,
  §4.4 step 8).
- **Delete**: never.
- **Service invariants**: `mentor_id ≠ mentee_id`; `mission`, `compatibility_score`,
  `goal_bonus_applied`, `round_id`, `mentor_id`, `mentee_id` and the coverage rows are never
  written after the insert, by anyone (ADR-0012 d5 correction, ADR-0014 d9); status moves only along
  §8.8; `declined_by_id ∈ {mentor_id, mentee_id}`; the Round is open at creation.
- **Serialization (the one invariant the schema cannot hold, ADR-0014 d13)**: at most one standing
  Match per Student per Round; enforced by reading both Students' standing Matches inside the
  creating SSI transaction (§8.6).

#### 4.3.11 `MatchSkillCoverage` — the frozen explanation

Columns: `match_id` uuid FK; `skill_id` uuid FK; `direction` `CoverageDirection`.
**PK** `(match_id, skill_id, direction)`. **Index** `skill_id`. Written in the Match's creating
transaction, never updated or deleted. FORWARD rows are `mentor.TEACH ∩ mentee.LEARN`, REVERSE rows
`mentee.TEACH ∩ mentor.LEARN`, as they stood at creation — for hand-made Matches too, possibly empty.

#### 4.3.12 `Review` — the Learning Outcome; owns the Evidence

Columns: `id` uuid PK; `match_id` uuid **UNIQUE** FK; `learned` text (*What did you learn,
specifically?*); `can_now_do` text (*What can you now do that you couldn't do before this
session?*); `created_at`.
- **Delete / update**: never (ADR-0014 d11).
- **DB**: `UNIQUE(match_id)` is the arbiter for duplicate and retried submissions (ADR-0014 d2).
- **Service invariants**: created only by the Match's Mentee, only while the Match is `ACCEPTED`, in
  the transaction that moves it to `COMPLETED`.

#### 4.3.13 `PrivateFeedback`

Columns: `id` uuid PK; `review_id` uuid UNIQUE FK; `answer_usefulness` text (*How useful was the
session?*); `answer_explanation` text (*What did the Mentor explain well, and what could be
improved?*); `rating` smallint NULL (raw CHECK 1–5, §4.4 step 5); `created_at`. Never updated or
deleted. Its own table so no feed query can reach it (ADR-0014 d1).

#### 4.3.14 `Evidence` — 0..1 per Review

Columns: `id` uuid PK; `review_id` uuid UNIQUE FK; `token` uuid UNIQUE `uuid(4)`; `bytes` bytea;
`mime` text; `size` integer; `filename` text (1–255, sanitised original name); `uploaded_at`.
- **Delete**: hard, by the originating Mentee. **Replace** rewrites the row in place with a new token.
- **Service invariants**: `mime ∈ {application/pdf, image/png, image/jpeg}`, `size ≤ 5,242,880`, both
  from validated bytes; mutations only by the Review's Match's Mentee while Active.
- **Serialization**: create/replace/delete on one Review serialize; `UNIQUE(review_id)` holds at
  every commit.

#### 4.3.15 `ReflectionPrompt`

Columns: `id` uuid PK; `question` text (1–300); `published_at` timestamptz default now()
(descriptive); `publication_order` **bigint UNIQUE NOT NULL** (M2).
- **Delete / update**: never (ADR-0007 d4). No status column (ADR-0007 d1).
- **Derived**: the live Prompt is the row with the greatest `publication_order`.
- **Serialization**: `publication_order` = `max + 1` read inside the publishing SSI transaction
  (§8.12); the unique index backstops it.

#### 4.3.16 `Post` — the feed item

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | |
| `author_id` | uuid | no | FK `Student` |
| `body` | text | no | Takeaway 1–280 chars; Prompt answer 1–1000 chars |
| `prompt_id` | uuid | yes | FK `ReflectionPrompt` — the Prompt arm |
| `review_id` | uuid | yes | UNIQUE FK `Review` — the Takeaway arm |
| `answer_round_id` | uuid | yes | FK `Round` — Prompt arm only: the Round open at the answer's serialization point (M3) |
| `created_at` | timestamptz | no | |
| `removed_at` | timestamptz | yes | soft delete by moderation |

- **DB**: `post_exactly_one_origin` CHECK (raw, §4.4 step 1); `UNIQUE(prompt_id, author_id)` (one
  answer per Student per Prompt; distinct NULLs on the Takeaway arm are intended, ADR-0014 d13);
  `UNIQUE(review_id)`.
- **Indexes**: `(created_at DESC, id DESC)` (feed); `author_id`; `answer_round_id`.
- **Service invariants**: a Takeaway's `author_id` is its Review's Mentee; `answer_round_id` is null on
  the Takeaway arm; `body` and origin are never updated; `removed_at` is set once, only by a
  moderation resolution (§12.5).

#### 4.3.17 `Like`

Columns: `post_id` uuid FK; `student_id` uuid FK; `created_at`. **PK** `(post_id, student_id)`.
**Index** `student_id`. **Delete**: hard (un-Like). Self-Like permitted (ADR-0014 d5).

#### 4.3.18 `Report`

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | uuid | no | |
| `reporter_id` | uuid | no | FK `Student` |
| `post_id` | uuid | yes | FK `Post` |
| `reported_student_id` | uuid | yes | FK `Student` |
| `reason` | `ReportReason` | no | |
| `text` | text | yes | 1–1000 chars (M24) |
| `state` | `ReportState` | no | default `OPEN` |
| `resolved_by_id` | uuid | yes | FK `Student` |
| `resolved_at` | timestamptz | yes | |
| `created_at` | timestamptz | no | |

- **DB**: CHECKs `report_exactly_one_target`, `report_no_self_student`, `report_state_attribution`
  (raw, §4.4 steps 2–4); partial uniques `report_one_per_reporter_post` on `(reporter_id, post_id)
  WHERE post_id IS NOT NULL` and `report_one_per_reporter_student` on `(reporter_id,
  reported_student_id) WHERE reported_student_id IS NOT NULL` (M33).
- **Indexes**: `(post_id, state)`, `(reported_student_id, state)`, `(state, resolved_at)`.
- **Delete**: never. **Update**: only `state`, `resolved_by_id`, `resolved_at`, once, `OPEN` → terminal.
- **Service invariants**: `reporter_id` is not the Post's `author_id` (crosses a table, ADR-0014 d13);
  the target is not Removed at filing; `reason` and `text` never change.
- **Serialization**: group resolution, filing and target Removal share one serial order (§12).

#### 4.3.19 `BadgeAward`

Columns: `student_id` uuid FK; `badge` `Badge`; `awarded_at`. **PK** `(student_id, badge)` — each
Badge once. Never updated or deleted.

### 4.4 Raw-SQL migration steps (exactly eight) and native partial indexes

Written by hand in the migration that creates the table, named as below, and asserted by test
category 2 (§16.3):

| # | Object | SQL |
| --- | --- | --- |
| 1 | `post_exactly_one_origin` | `ALTER TABLE "Post" ADD CONSTRAINT post_exactly_one_origin CHECK ((prompt_id IS NULL) <> (review_id IS NULL));` |
| 2 | `report_exactly_one_target` | `ALTER TABLE "Report" ADD CONSTRAINT report_exactly_one_target CHECK ((post_id IS NULL) <> (reported_student_id IS NULL));` |
| 3 | `report_no_self_student` | `ALTER TABLE "Report" ADD CONSTRAINT report_no_self_student CHECK (reported_student_id IS NULL OR reporter_id <> reported_student_id);` |
| 4 | `report_state_attribution` | `ALTER TABLE "Report" ADD CONSTRAINT report_state_attribution CHECK ((state = 'OPEN' AND resolved_by_id IS NULL AND resolved_at IS NULL) OR (state <> 'OPEN' AND resolved_by_id IS NOT NULL AND resolved_at IS NOT NULL));` |
| 5 | `private_feedback_rating_range` | `ALTER TABLE "PrivateFeedback" ADD CONSTRAINT private_feedback_rating_range CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);` |
| 6 | `friendship_unordered_pair` | `CREATE UNIQUE INDEX friendship_unordered_pair ON "Friendship" (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));` |
| 7 | `round_single_open` | `CREATE UNIQUE INDEX round_single_open ON "Round" ((closed_at IS NULL)) WHERE closed_at IS NULL;` |
| 8 | `match_pair_history` | `CREATE INDEX match_pair_history ON "Match" (LEAST(mentor_id, mentee_id), GREATEST(mentor_id, mentee_id));` — **non-unique**: hand-made Matches may repeat a pair (ADR-0014 d13 correction) |

**Report's two partial unique indexes** are declared natively (`@@unique([reporterId, postId],
where: { postId: { not: null } }, map: "report_one_per_reporter_post")` and the Student twin) under
the `partialIndexes` preview feature, available from Prisma 7.4 (ADR-0014's note takes it).
**Fallback, defined now:** if the preview produces spurious drop-and-recreate migrations (reported
upstream as prisma/prisma#29263, closed as fixed for 7.5 on 2026-03-11, with follow-ups for other
predicate shapes still open, e.g. #29446 and #29386) that the gate cannot suppress by editing the
generated SQL, the two indexes move to raw SQL with the same names and the raw count becomes
**ten**, exactly as ADR-0014's count revision foresees.

**Gate rule for generated migrations**: Prisma does not represent objects 1–8. When `prisma migrate
dev` emits a statement that drops or alters any of them, or drops and recreates an unchanged partial
index, the author deletes that statement before committing, and the gate reviewer checks for it.
Category 2 fails the suite if any of the ten named objects is missing after `migrate deploy`.

### 4.5 Where each invariant is held

| Invariant | DB constraint | Service check | Serialization (SSI, §3.6) |
| --- | --- | --- | --- |
| At most one open Round | `round_single_open` | open-Round check before insert | open vs open |
| One Review per Match | `UNIQUE Review.match_id` | status `ACCEPTED` check | Review vs close/Decline/sanction |
| One answer per Prompt per Student | `UNIQUE Post(prompt_id, author_id)` | liveness, role | answer vs publish vs close |
| Post has exactly one origin | `post_exactly_one_origin` | — | — |
| Report has exactly one target | `report_exactly_one_target` | — | — |
| No self-report of a Student | `report_no_self_student` | — | — |
| No report of one's own Post | — | `author_id` check (crosses tables) | — |
| One report per reporter per target, forever | two partial uniques | — | concurrent filing: index decides |
| Report state ⇔ attribution | `report_state_attribution` | — | first resolution wins |
| Rating 1–5 or absent | `private_feedback_rating_range` | DTO | — |
| Friendship unique per unordered pair | `friendship_unordered_pair` | — | — |
| No Block and Friendship row coexist | — | block deletes the pair's rows; request checks Blocks | Block vs request |
| Block unique per ordered pair | `UNIQUE(blocker_id, blocked_id)` | — | — |
| Like once per Student per Post | PK | — | — |
| Badge once per Student | PK | — | converge on conflict (M4) |
| Email unique and burned after Removal | `UNIQUE email` | Removed row never edited | — |
| Learning Goal is the Student's own row | composite FK | kind = `LEARN`; text ⇔ reference | — |
| One standing Match per Student per Round | — (not expressible) | standing-Match check | hand-made vs hand-made |
| No Match into a closed Round | — | Round open check | hand-made vs close |
| Candidate eligibility at creation | — | predicate §8.1 | vs role/sanction changes |
| No-repeats for matcher Matches | `match_pair_history` (lookup only) | matcher step 2 | — (Round open reads all Match rows) |
| Blocked pair never matched | — | matcher step 2; hand-made check | Block vs creation |
| Takeaway author is the Mentee | — | Review service | — |
| Mission, Score, coverage frozen | — | no write path after insert | — |
| XP accumulates, thresholds not missed | — | increments only | all XP paths per Student |
| ≥ 1 active Admin | — | predicate §12.7 | demote/suspend/remove vs each other |
| Removed row is view-only | — | every mutation checks `removed_at` | sanction vs other writes |
| At most one Evidence per Review | `UNIQUE Evidence.review_id` | Mentee check | put/replace/delete |
| Avatar ≤ 2 MiB PNG/JPEG; Evidence ≤ 5 MiB PDF/PNG/JPEG | — | byte validation §9.5 | — |
| Live Prompt unique | `UNIQUE publication_order` | max + 1 | publish vs publish |

### 4.6 Visibility (who reads what, in the application)

Database operators can read everything stored; nothing is encrypted at rest and Direct Messages are
not end-to-end encrypted (ADR-0018 d13). **In the application:**

| Data | Readers |
| --- | --- |
| Profile: display name, avatar, Skills, Learning Goal and sentence, XP, Level, Streak, Badges, Posts | every signed-in Student; a Removed Student renders as the tombstone *"Former student"* with the default avatar and no profile |
| Email | its owner and Admins; never on a profile or in search |
| Role | `ADMIN` shown as an "Admin" label to everyone signed in; `PEER_MODERATOR` shown only to its holder and Admins |
| Presence | accepted Friends only |
| Friends list | its owner only |
| Pending requests | the two parties |
| Blocks | the blocker only; not Admins |
| Match (partner, status, Score and explanation, Mission) | the pair and Admins; no profile lists Matches |
| Learning Outcome and Evidence | the originating Match's Mentor and Mentee, and Admins; a Peer Moderator only as a pair member |
| Private Feedback with rating | the Mentor it is about, its Mentee author, Admins |
| Public Takeaway / Prompt answer (Posts) and who liked them | every signed-in Student; a removed Post leaves every surface |
| Direct Messages | the two participants only; no Admin route exists |
| `read_at` | the recipient only, as an unread count; never shown to the sender |
| Reports | Admins, with reporter identity, except own-interest groups (§12.4); Peer Moderators: eligible open Post groups, without reporters; the reporter and the subject: nothing |
| Learning Analytics | Admins only; community aggregates only |
| Leaderboard | every signed-in Student; ranks active `STUDENT`/`PEER_MODERATOR` only |
| Signed out | the four routes of §3.5.1 only |

**Removed-row surface rule** (ADR-0008 Consequences, corrected): discovery and participation
surfaces (search, friend requests, new DMs, new Reports, matching, Leaderboard, friend lists,
pending-request lists) **exclude** Removed Students; historical relations (Posts, Matches, threads,
Private Feedback, Reports) **render the tombstone**; the Admin Users table **includes** Removed rows,
view-only. The normal feed and profiles exclude Posts with `removed_at` set.

---

## 5. Authentication and authorization

### 5.1 Accounts and passwords

- **Sign-up** takes email, password, display name and the acceptance checkbox *"I agree to the Terms
  of Service and have read the Privacy Policy"* (ADR-0018 d12). The checkbox is validated on both
  ends and **not stored**. Email is trimmed and lower-cased; password is 8–128 characters with no
  composition rule; display name 1–40 characters after trimming.
- **Hashing**: `@node-rs/argon2` `hash(password, { algorithm: Argon2id, memoryCost: 19456,
  timeCost: 2, parallelism: 1 })`; the PHC string carries the salt (ADR-0003 d3).
- **Sign-in** verifies against the stored hash. An unknown email is verified against a fixed dummy
  hash so the timing does not reveal existence. **Wrong password, unknown email, Suspended and
  Removed all return the same refusal** `invalid_credentials` — *"Email or password is incorrect, or
  this account cannot sign in."* (ADR-0003 d10; a Removal is never disclosed).
- **The argon2 check runs before the transaction (§3.6.2); the write re-checks what it read.**
  Sign-in's SSI tx re-reads the Student's `password_hash`, `suspended_at` and `removed_at` and
  creates the Session only if the hash is the one just verified and neither flag is set, else
  `invalid_credentials`. Password change's tx refuses with `password_incorrect` if the hash changed
  since its check. So a sign-in with the old password racing a password change, Suspension or
  Removal is either ordered first, and its session is deleted with the rest, or refused: it never
  leaves a session the change missed (ADR-0003 d6).
- **Password change** requires the current password, deletes **every** session of the Student
  including the current one, force-disconnects every socket, and clears the cookie; the SPA returns
  to `/sign-in` with a notice (ADR-0003 d6).
- **No reset, no email, no Admin-set password** (ADR-0003 d11, ADR-0018 d8). A forgotten password is
  unrecoverable, as the Terms state.

### 5.2 Sessions and the one cookie (M6)

- **The only cookie** is `pc_session` (ADR-0018 d5): `HttpOnly; Secure; SameSite=Lax; Path=/`, no
  `Domain`, `Max-Age` = seconds until `expires_at`. `Secure` cookies are accepted on
  `http://localhost:8081` because browsers treat localhost as a secure context (ADR-0004 d5).
- **Value**: `s.<token>` for a session, `a.<token>` for an OAuth pre-authentication attempt (§5.6).
  `<token>` is 32 bytes from `crypto.randomBytes`, base64url-encoded (43 characters).
- **Storage**: `Session.id` = lowercase hex SHA-256 of the token. A database read never yields a
  usable cookie.
- **Creation** (sign-up, sign-in, successful 42 callback): `expires_at = now + 30 days`; the same
  transaction deletes that Student's already-expired rows (the only purge; it runs on a non-GET or
  on the callback, never on an ordinary GET).
- **Lazy renewal** (ADR-0003 d4): on any authenticated request, when `expires_at < now + 30 days −
  1 hour`, one `UPDATE "Session" SET expires_at = now + 30 days WHERE id = $1` runs and the cookie is
  re-set **only if that UPDATE reports one affected row**. Zero rows — the row was deleted or the
  session revoked between the guard's read and this write — writes no cookie and renews nothing, so a
  renewal can never resurrect a concurrently revoked session; §5.3 refuses the next request as usual.
  This is one of the two GET-time writes ADR-0003 d10 allows; it touches only the caller's own
  session row.
- **Logout** (`POST`) deletes that row, drops the sockets bound to it (§7.5), clears the cookie.

### 5.3 Per-request resolution and roles

`SessionGuard` on every protected route: read `pc_session`; **only an `s.`-prefixed value proceeds** —
an `a.` value (§5.6's live OAuth attempt) or anything else fails with 401 `unauthenticated`
**without clearing the cookie**, since this guard clears only a cookie it read as `s.`, so a protected
request can never destroy an attempt in flight; then hash and run one query
`SELECT s.student_id, st.role, st.suspended_at, st.removed_at FROM "Session" s JOIN "Student" st …
WHERE s.id = $1 AND s.expires_at > now()`. No row, Suspended or Removed → 401 `unauthenticated`, the
response clears that `s.` cookie, **nothing is written**. The role is read here, fresh, on every request, so
a role change takes effect on the next request with no session change (ADR-0003 d5–d6). `RolesGuard`
checks the coarse role for `/api/admin/*` (`ADMIN`) and `/api/moderation/*` (`PEER_MODERATOR` or
`ADMIN`). **A writing service re-reads role and sanction flags inside its transaction** and refuses
if they no longer allow the action (ADR-0011 d7); a read relies on this per-request read (§3.4).

### 5.4 CSRF and the GET rule

- **No GET request creates, changes or deletes a domain row** (ADR-0003 d10). The two exceptions are
  §5.2's lazy renewal and §5.6's callback. Marking a thread read and logging out are `POST`s.
- **`JsonMutationGuard`** (global): every `POST`, `PUT`, `PATCH`, `DELETE` must carry
  `Content-Type: application/json` (a body of `{}` where nothing else is needed), else 415. A
  cross-site form cannot send it and no CORS permission exists, so a script cannot either.
- **Upload exception** (ADR-0009 d3): exactly the three multipart routes `PUT /api/me/avatar`,
  `PUT /api/admin/students/:id/avatar`, `PUT /api/reviews/:reviewId/evidence` skip the JSON rule and
  instead require `Origin` byte-equal to `PUBLIC_ORIGIN` **and** `X-PeerConnect-CSRF: 1`; absent,
  `null` or mismatched Origin, or a missing or different header → 403 `csrf_rejected`. The
  `UploadCsrfGuard` runs **before** any multipart parsing. **Precedence**: the nginx envelope
  applies before the request reaches the API (§9.5 step 1: over-envelope → 413, the guard never
  runs); a within-envelope request with a bad `Origin`/header fails CSRF (403) before Multer and
  the size check ever see it. Delete routes stay JSON.
- **CORS is never enabled** (`app.enableCors` is not called; Socket.IO has no `cors` option).
- `SameSite=Lax` on the one cookie is load-bearing twice: it withholds the cookie from cross-site
  subresource requests, and it still sends it on 42's top-level redirect to the callback (§5.6).

### 5.5 Throttle and the trusted client address (M9)

- nginx is the only trusted proxy. Every proxied location sets `proxy_set_header X-Real-IP
  $remote_addr;` and `proxy_set_header X-Forwarded-For $remote_addr;`, **overwriting** anything the
  browser sent. The API has no published port, so it is reachable only through nginx. The API reads
  the client address **only** from `X-Real-IP`; Express `trust proxy` stays `false` and `req.ip` is
  never used.
- **Buckets** (ADR-0003 d10): key = `clientAddress + "|" + normalisedEmail`, never the address alone.
  Sign-in counts failed attempts; sign-up counts every attempt. Sliding window 15 minutes, limit 5;
  the sixth is refused with `too_many_attempts` before any credential check. **In memory only**,
  never persisted, never logged; at most 10,000 keys (oldest evicted); lost on restart (ADR-0018 d6).
- **Layer**: enforced at the HTTP boundary, before any service call. The service methods take no
  address and enforce no throttle themselves, so the seed and any direct service call bypass it by
  construction — they never cross the guard — while every HTTP request crosses it, in-process tests
  included (§16.2).
- **Absent header**: the address part is the `X-Real-IP` value, or the empty string when absent.
  Production never sees absent (nginx always sets it, overwriting); the harness never sends absent
  (§16.2); `req.ip` is never a fallback.

### 5.6 Sign in with 42 (M7, M8)

Two layers, kept separate.

**(A) The authentication mechanism — transport and state: specified and buildable now; a successful sign-in also needs (B).**

- **Enabled** iff `FT_OAUTH_CLIENT_ID` and `FT_OAUTH_CLIENT_SECRET` are both non-empty. Otherwise
  `GET /api/config` returns `oauth42Enabled: false`, the SPA renders no button, `POST
  /api/auth/42/start` returns 404, and nothing fails at boot (ADR-0004 amendment). **Disabled,
  `GET /api/auth/42/callback` also returns 404 `not_found`** (§6.15): no attempt lookup, no
  external call, no cookie mutation, no redirect — the failure-path redirect below belongs to an
  enabled flow only.
- **Fixed endpoints** (constants, not variables): authorize `https://api.intra.42.fr/oauth/authorize`,
  token `https://api.intra.42.fr/oauth/token`, identity `https://api.intra.42.fr/v2/me`; scope
  `public`. **Redirect URI** `${PUBLIC_ORIGIN}/api/auth/42/callback`, registered on the 42
  application byte-for-byte.
- **Start**: `POST /api/auth/42/start` `{ "intent": "sign_in" }` — a JSON mutation, so starting adds
  no GET exception (ADR-0003 d10). `intent: "link"` is reserved and returns 404 until #24 enables it.
  1. With a valid session and `intent: "sign_in"` → refusal `already_signed_in`.
  2. Generate `attemptToken` (32 B), `state` (32 B, base64url) and a PKCE `codeVerifier` (32 B,
     base64url); `bindingKey = sha256(attemptToken)` (for `link`: `sha256(sessionToken)`, and the
     session is not displaced).
  3. Store `{ bindingKey, state, codeVerifier, intent, expiresAt: now + 10 min }` in the in-memory
     `OAuthAttemptStore` (at most 1,000 entries, expired evicted first, then oldest). **One live
     attempt per browser**: a `sign_in` start first deletes the entry for `sha256(<old>)` when the
     request carries `pc_session=a.<old>`, since every start mints a fresh token and so a fresh
     key; a `link` start overwrites the entry already under its session's key. A superseded
     attempt's callback therefore finds nothing and fails. Nothing is written to the database;
     nothing to web storage.
  4. For `sign_in`, set `pc_session=a.<attemptToken>; Max-Age=600` with the usual attributes.
  5. Return `{ authorizeUrl }` carrying `client_id`, `redirect_uri`, `response_type=code`,
     `scope=public`, `state`, `code_challenge` = base64url(SHA-256(`codeVerifier`)),
     `code_challenge_method=S256`. The SPA navigates to it with `window.location.assign`.
- **Callback**: `GET /api/auth/42/callback?code=…&state=…` (or `?error=…`), `Cache-Control:
  no-store`. **Verification order**, every failure taking the same failure path:
  1. Read `pc_session`; `a.` → `bindingKey = sha256(token)`; `s.` → the session must resolve (§5.3),
     `bindingKey = sha256(token)`; anything else → fail.
  2. **Take** the attempt for `bindingKey` — removed from the store now, whatever follows (single
     use).
  3. The attempt exists and has not expired.
  4. `state` is present and equals the stored value (constant-time comparison).
  5. No `error` parameter; `code` present.
  6. Exchange the code server-side (`grant_type=authorization_code`, `code`, `redirect_uri`,
     `client_id`, `client_secret`, `code_verifier`), 10 s timeout, **outside any transaction**.
  7. `GET /v2/me` with the access token, 10 s timeout. Keep **only** the immutable 42 account
     identifier (ADR-0018 d7); discard the token and the rest of the response at once. Never read
     42's email, photo, campus, level, projects or location; never persist or log any of it.
  8. Resolve the identifier to a Student **by the stored 42 identifier only — never by
     `Student.email`**, so no email edit, an Admin's included, can steer a 42 login (ADR-0018 d7).
  9. For a resolved **Active** Student with `intent: "sign_in"`: one SSI tx re-reads the Student's
     flags and creates the Session (§5.2, §5.1); the response sets `pc_session=s.<newToken>`, **replacing** the attempt cookie — the
     attempt token never becomes the session id — and redirects `302 /`.
  - **Failure path**: an `a.` cookie is cleared (`Max-Age=0`); an `s.` cookie is left alone; redirect
    `302 /sign-in?oauth=failed` (for `link`, `/me?oauth=failed`). The response never distinguishes
    the cause, so Suspension and Removal stay undisclosed. The query string never reaches a log
    (§3.9).
- **PKCE is defence in depth only**; `state` stays mandatory (ADR-0003 d10).

**(B) The 42 identity mapping — Blocked by
[#24](https://github.com/ahmadmnsur/ft_transcendence/issues/24).** Step 8's inputs and every branch
after a miss are #24's: which immutable 42 field is the key, and the `Student` column that stores it
(a nullable unique column, added by a gated migration, with the Privacy Policy's 42 sentence updated
in the same PR); whether a first 42 login with no linked Student **links, creates or is refused**;
whether link or create writes happen in the callback GET or in a following JSON `POST` (ADR-0003
d10's annotation); whether signed-in linking exists (the `link` intent above is its mechanism if it
does); any creation path's Terms acceptance (ADR-0018 d12); whether `password_hash` becomes nullable;
whether the Terms' *forgotten password cannot be reset* line changes if a linked 42 login restores
access (ADR-0018 d8); the Privacy Policy's marked 42 sentence, naming the field(s) kept (ADR-0018 d7);
and who registers the 42 application. **Until #24 resolves, no Student has a stored 42 identifier,
so step 8 always misses and the flow ends on the failure path**. What builds and is exercisable
without #24, with no live 42 application and no network to 42: the button/flag/disabled behaviour
(including the disabled-callback 404 above), `start` minting (`state`, PKCE, cookie, store,
one-live-attempt), and the callback's verification rejections of steps 1–5. Steps 6–7 (code
exchange, `/v2/me`) and steps 8–9 (resolution, every link/create/refuse branch after a miss, and
the session issuance only a resolved Student reaches) require a registered application and #24's
mapping, and are not exercised until then. **No dedicated Vitest category covers OAuth**
(ADR-0016 d7's list is closed, and OAuth's failures present loudly as 404s and redirects, not
silent state); a full sign-in is demonstrated once #24 resolves, not suite-asserted before it.
**Until #24 decides, a first 42 login with no linked Student produces no Student row and no
session**: no ordinary active/password account is created as a stand-in — the link, create or
refuse branch owned by #24 above is the only outcome.

### 5.7 Authorization matrix

"Participating" = role `STUDENT` or `PEER_MODERATOR`. Every row also requires an Active actor.

| Capability | STUDENT | PEER_MODERATOR | ADMIN | Relation condition |
| --- | --- | --- | --- | --- |
| Own profile, Skills, Goal, avatar, password, sign-out | ✓ | ✓ | ✓ | self |
| View profiles, feed, Posts, likers, Leaderboard, `/rules`, search | ✓ | ✓ | ✓ | — |
| Friends, Blocks, Direct Messages, Likes | ✓ | ✓ | ✓ | no Block for requests/DMs; target not Removed |
| Be a candidate in matching | ✓ | ✓ | ✗ | ≥ 1 Skill, Active |
| Accept / decline a Match | ✓ | ✓ | ✓ (a Match created before promotion) | participant |
| Submit a Review | ✓ | ✓ | ✓ (pre-promotion Match) | the Mentee, status `ACCEPTED` |
| Evidence write | ✓ | ✓ | ✓ (own Review only, as its Mentee) | the originating Mentee, whatever their current role; the Mentor and every other Admin are read-only (ADR-0009 d5, ADR-0014 d11, §9.4) |
| Evidence / Learning Outcome read | pair | pair | ✓ all | originating Match pair, or current role `ADMIN` (ADR-0009 d4) |
| Private Feedback read | Mentor, author | Mentor, author | ✓ all | |
| Answer a Reflection Prompt | ✓ | ✓ | ✗ | Prompt live |
| File a Report | ✓ | ✓ | ✓ | not self, not own Post, target not Removed |
| Post-report queue, Remove Post, dismiss | ✗ | ✓ eligible groups | ✓ eligible groups | whole-group guard (§12.4) |
| Student-report queue, resolved audit, reporter identity | ✗ | ✗ | ✓ | Admin self-interest guard (§12.4) |
| Open/close Round, hand-made Match, publish Prompt | ✗ | ✗ | ✓ | |
| Users table, edit others, role change, suspend, reinstate, remove | ✗ | ✗ | ✓ | not self for role/sanction; ≥ 1 active Admin; target not Removed |
| Learning Analytics | ✗ | ✗ | ✓ | |
| Read any Direct Message | ✗ | ✗ | ✗ | participants only |
| Set a password for someone | ✗ | ✗ | ✗ | never |

### 5.8 What invalidates sessions and sockets

| Event | Sessions deleted | Sockets dropped (after commit) |
| --- | --- | --- |
| Logout | that one | the sockets authenticated by that session |
| Password change | all of the Student's | all of the Student's |
| Suspension | all | all |
| Removal | all | all |
| Role change | none | none |
| Expiry | none (row stays until the next purge) | none; the next handshake fails and the client goes to sign-in |

---

## 6. API contract

### 6.0 Conventions

#### 6.0.1 General

- Base path `/api`; JSON bodies; the §3.8 envelope; ids are UUIDs (malformed → 400).
- **List paging**: tables take `page` (≥ 1) and `pageSize` (1–50, default 20) and return `{ items,
  total }`; streams (feed, answers, threads, messages) take an opaque `cursor` over
  `(created_at, id)` descending and return `{ items, nextCursor }`.
- **`StudentRef`** (every place a person appears): `{ id, displayName, avatarUrl | null, isAdmin,
  removed }`. A Removed Student renders as `{ id, displayName: "Former student", avatarUrl: null,
  isAdmin: false, removed: true }`. `avatarUrl` is `/api/files/avatars/<token>`; null means the
  bundled default. `isAdmin` is true only for role `ADMIN`; a Peer Moderator is never marked.
- Every mutation below is **one Unit-of-Work call** (§3.6) unless stated; "reads" lists what it reads
  inside that transaction.

#### 6.0.2 The operation template

`METHOD path` — **Auth** · **Input** · **Validation** · **Rule** (inside the SSI tx, with its reads)
· **Persist** · **Events** (after commit) · **Refusals** · **Concurrency** · **Visibility**.

#### 6.0.3 Field limits (`src/shared/limits.ts`, enforced on both ends)

| Field | Limit |
| --- | --- |
| email | trimmed, lower-cased, ≤ 254, one `@`, non-empty local and domain parts |
| password | 8–128 characters |
| display name | 1–40 characters, no control characters |
| Skill lists | each 0–15 distinct catalogue ids |
| Learning Goal sentence | 1–200 |
| Direct Message | 1–2000 |
| Learning Outcome answers | 1–2000 each |
| Private Feedback answers | 1–2000 each; rating absent or integer 1–5 |
| Public Takeaway | 1–280 |
| Prompt question | 1–300 |
| Prompt answer | 1–1000 |
| Report text | absent or 1–1000 (M24) |
| Search `q` | 0–60 |
| Avatar file | ≤ 2,097,152 bytes, PNG/JPEG |
| Evidence file | ≤ 5,242,880 bytes, PDF/PNG/JPEG; filename ≤ 255 |

All strings are trimmed; empty after trimming is invalid; control characters other than a newline in
multi-line fields are rejected.

### 6.1 Configuration, session and authentication

| Endpoint | Auth | Behaviour |
| --- | --- | --- |
| `GET /api/config` | public | `{ publicOrigin, oauth42Enabled }` |
| `GET /api/session` | public | `{ authenticated: false }` or `{ authenticated: true, student: { id, displayName, email, role, avatarUrl } }`; performs lazy renewal |
| `GET /api/health` | public | `{ status: "ok" }` once the app is listening (Compose healthcheck) |

**`POST /api/auth/signup`** — Auth: public; refused `already_signed_in` if a valid session exists ·
Input `{ email, password, displayName, acceptTerms }` · Validation §6.0.3, `acceptTerms === true` ·
Throttle §5.5 · Rule: reads the email → `email_unavailable` if any row holds it, Removed rows
included (ADR-0008 d7) · Persist `Student` (role `STUDENT`, xp 0, streak 0) and `Session` · Events
none · Concurrency: two sign-ups of one email → the unique index admits one; the loser gets
`email_unavailable` · Visibility: sets the cookie.

**`POST /api/auth/login`** — public · `{ email, password }` · Validation §6.0.3 (malformed email →
`validation_failed`) · throttle · verify (§5.1) · with a valid session → `already_signed_in` ·
Persist `Session`, purge the Student's expired rows · Events none · Refusals `invalid_credentials`,
`too_many_attempts` · Concurrency: none (each login inserts its own `Session` row) · Visibility:
sets the cookie on success.

**`POST /api/auth/logout`** — session · `{}` · delete the caller's row · Events `revokeSessions
(sessionHash)` · clears the cookie · Refusals: a session already gone → `unauthenticated` (guard)
· Concurrency: none (single-row delete).

**`POST /api/auth/password`** — session · `{ currentPassword, newPassword }` · Validation §6.0.3
(new password 8–128) · verify current → `password_incorrect` · Persist new hash; delete all the
Student's sessions · Events `revokeSessions(studentId)` · clears the cookie · Concurrency:
concurrent changes serialize on the `Student` row; each deletes all sessions.

**`POST /api/auth/42/start`**, **`GET /api/auth/42/callback`** — §5.6.

### 6.2 Profiles, Skills, Learning Goal, search

| Endpoint | Auth | Behaviour |
| --- | --- | --- |
| `GET /api/skills` | session | the catalogue, by name |
| `GET /api/me` | session | own profile with email, role, status, Skills, Goal, XP, Level, Streak, Badges, progress |
| `GET /api/students/:id` | session | profile per §4.6; tombstone if Removed; email only to self or Admin |
| `GET /api/students/:id/posts?cursor` | session | their non-removed Posts |
| `GET /api/students?q&teaches&wants&hasGoal&sort&order&page&pageSize` | session | **Advanced search**: excludes Removed, includes Suspended and Admins; `q` matches display name only (`ILIKE`, wildcards escaped), never email; `teaches`/`wants` are Skill ids; `hasGoal` boolean; `sort ∈ name, xp, joined` (default `name`), `order ∈ asc, desc`; ties `id ASC`; returns `StudentRef` + Skills + Level + XP and `total` |

**`PATCH /api/me`** — session · `{ displayName?, email? }` · Rule: actor Active; a new email is
unused (Removed rows included) → else `email_unavailable` · Persist `Student` · Concurrency: the
unique index decides two concurrent claims — the loser gets `email_unavailable` with nothing written.

**`PUT /api/me/skills`** — session · `{ teach: uuid[], learn: uuid[] }` · Validation: ids in the
catalogue, no duplicates within a list, ≤ 15 each · Rule: diff against current rows; delete removed
rows, insert added rows, **keep rows that stay** · if the Goal's `LEARN` row is deleted, clear both
Goal columns first (M5) · Persist `StudentSkill`, `Student` · Result `{ goalCleared }` · Events
none · Refusals: validation breaches → `validation_failed` · Effect: the
next Round's candidate pool only (ADR-0002 Consequences) · Concurrency: vs Round open, one serial
order (the matcher read the lists).

**`PUT /api/me/learning-goal`** — session · `{ skillId, text }` · Validation §6.0.3 (sentence
1–200) · Rule: `skillId` is on the actor's `LEARN`
list → else `goal_skill_not_listed`; set the reference to that row and the text together · Result
the stored Goal · Events none · Concurrency: single-row write on the actor's `Student` row.
**`DELETE /api/me/learning-goal`** — session · `{}` · clears both · Events none.

### 6.3 Files

| Endpoint | Auth | Behaviour |
| --- | --- | --- |
| `GET /api/files/avatars/:token` | session → else **401** | any signed-in Student; unknown token → 404; bytes with canonical `Content-Type`, `nosniff`, `Cache-Control: private, max-age=86400, immutable` |
| `GET /api/files/evidence/:token` | session → else **401** | resolve `Evidence → Review → Match`; allow iff actor is that Match's `mentor_id` or `mentee_id`, or the actor's current role is `ADMIN` → else **403**; unknown token → 404; `Content-Disposition: inline; filename="<sanitised>"`, `nosniff`, `Cache-Control: private, no-cache` |

**`PUT /api/me/avatar`** (multipart field `file`) — `UploadCsrfGuard` → session → Multer (one file, `limits.fileSize` 2 MiB + 1 byte) → size check (`size > 2,097,152` →
`file_too_large`) → byte validation §9.5 · Rule: actor Active · Persist upsert `Avatar` with a new
token · Result `{ avatarUrl }` · Refusals `file_too_large`, `file_type_not_allowed`, `file_invalid` ·
Concurrency: two uploads serialize; the later commit wins; one row.
**`DELETE /api/me/avatar`** — session · `{}` · Rule: actor Active · delete if present (idempotent `ok: true`) · Events none.

**`PUT /api/reviews/:reviewId/evidence`**, **`DELETE /api/reviews/:reviewId/evidence`** — §9.4.
**Admin avatar** routes — §6.12.

### 6.4 Friends and Blocks

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/friends` | accepted Friends (Removed excluded) with `online` from the Presence registry |
| `GET /api/friends/requests` | `{ incoming, outgoing }` pending, Removed counterparts excluded |
| `GET /api/blocks` | the actor's own Blocks |

**`POST /api/friends/requests`** — session · `{ studentId }` · Rule (reads: target row; Block rows of the pair
in both directions; Friendship rows of the pair): target exists → else `not_found`; target ≠ actor →
else `self_action_forbidden`; target not Removed → else `student_removed`; no Block either
way → else `friend_request_unavailable` (the same wording whoever blocked, so the other Student is not
told); no Friendship row → else `friendship_exists` · Persist `Friendship(PENDING)` · Events none
· Concurrency: vs a Block, one serial order (§11.2) — Block first → the request loses with
`friend_request_unavailable`; request first → the Block deletes the pending row; vs the
opposite request, `friendship_unordered_pair` admits one and
the loser gets `friendship_exists` with nothing written.

**`POST /api/friends/requests/:id/accept`** — session · `{}` · Rule: actor is the addressee, status `PENDING` →
else `request_not_pending`; requester not Removed and no Block → else `friend_request_unavailable` ·
Persist `ACCEPTED`, `responded_at` · Events none.
**`POST /api/friends/requests/:id/decline`** — session · addressee; deletes the pending row · Events none.
**`DELETE /api/friends/requests/:id`** — session · requester cancels a pending row · Events none.
Accept, decline and cancel on a request id that no longer exists (the other party cancelled,
declined or blocked first) or is no longer `PENDING` → `request_not_pending` (200): a hard-deleted
row is indistinguishable from an unknown one, and this is a race a correct UI reaches (§3.8.2).
**`DELETE /api/friends/:studentId`** — session · `{}` · either party ends an accepted Friendship (hard delete);
none → `not_friends` · Events none.

**`POST /api/blocks`** — session · `{ studentId }` · Rule (reads: target; the pair's Friendship rows): target
exists → else `not_found`; target ≠ actor → else `self_action_forbidden`; target not Removed → else
`student_removed` · Persist `Block`; **delete the pair's Friendship row, pending or
accepted** · a Match in progress is untouched (ADR-0006 d10) · Refusal `already_blocked` (unique
index) · Events none.
**`DELETE /api/blocks/:studentId`** — session · `{}` · deletes the actor's own Block; `not_blocked` if none;
restores nothing (M23, §11.3) · Events none.

### 6.5 Direct Messages (HTTP half; sending is §7.3)

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/messages/threads` | per peer: `StudentRef`, last message, `unreadCount` (messages to the actor with `read_at` null), `canSend` (no Block either way, peer not Removed); newest activity first |
| `GET /api/messages/threads/:peerId?cursor` | session · both directions, newest first, 50 per page; unknown `peerId` → 404 `not_found`; **no side effect** |

**`POST /api/messages/threads/:peerId/read`** — session · `{}` · unknown `peerId` → 404
`not_found`; a Block with the peer or a Removed peer changes nothing — the call still marks the
actor's own inbox · Persist `read_at = now` on rows with
`recipient_id = actor`, `sender_id = peer`, `read_at IS NULL`; never on the actor's own sent rows
(ADR-0014 d6) · Result `{ updated }` · Events none (no read receipt) · Concurrency: vs a concurrent
message, one serial order — a message ordered first is counted, one ordered after is not.

### 6.6 Rounds and Matches (Student side)

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/rounds/current` | `{ round: { id, number, openedAt } | null }` |
| `GET /api/matches/current` | the actor's standing Match in the open Round, else null (`MatchView`) |
| `GET /api/matches?page` | the actor's own Match history, every status |
| `GET /api/matches/:id` | pair or Admin → `MatchView` + `review` (Learning Outcome, Evidence metadata) + `privateFeedback` when the reader is its Mentor, its author or an Admin; any other authenticated non-participant → **404 `not_found`** (the invisibility §8.5 gives accept/decline) |

`MatchView` = `{ id, roundNumber, status, myRole: MENTOR|MENTEE, partner: StudentRef,
compatibilityScore | null, handMade, goalBonusApplied, coverage: { forward: Skill[], reverse:
Skill[] }, mission, iAccepted, partnerAccepted }`. The SPA renders the explanation sentence from
`coverage`, `goalBonusApplied` and `myRole`, and never renders a Score without it; a hand-made Match
reads *"Matched by an Admin"* with no number (ADR-0006 d10, CONTEXT).

**`POST /api/matches/:id/accept`**, **`POST /api/matches/:id/decline`** — §8.5.
**`POST /api/matches/:id/review`** — §9.2.

### 6.7 Reviews and Private Feedback

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/me/feedback-received?page` | the Mentor's private route (ADR-0013 d5–d6): every Private Feedback received, newest first, each `{ matchId, roundNumber, author: StudentRef, answerUsefulness, answerExplanation, rating | null, createdAt }`. **No aggregate is computed or returned** (ADR-0013 d4) |

### 6.8 Reflection Prompts

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/prompts/live` | `{ prompt: { id, question, publishedAt } | null, answeredByMe }` |
| `GET /api/prompts?page` | every Prompt, greatest publication order first, `live` flag, answer count |
| `GET /api/prompts/:id/answers?cursor` | its non-removed answer Posts |

**`POST /api/prompts/:id/answers`** and **`POST /api/admin/prompts`** — §8.12.

### 6.9 Feed and Likes

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/feed?cursor` | non-removed Posts newest first: `{ id, origin: TAKEAWAY|PROMPT_ANSWER, prompt?: { id, question }, author: StudentRef, body, createdAt, likeCount, likedByMe }`. A Takeaway never names the Mentor (ADR-0018 d4) |
| `GET /api/posts/:id` | one Post |
| `GET /api/posts/:id/likes` | the likers' `StudentRef`s |

**`POST /api/posts/:id/like`** — session · `{}` · Post exists (unknown → 404) · insert `ON CONFLICT DO
NOTHING` · `{ likeCount, likedByMe: true }`. **`DELETE /api/posts/:id/like`** — session · `{}` · delete if
present · `{ likeCount, likedByMe: false }`. No XP, no event, not reportable (ADR-0014 d5). **A removed Post** answers every route above
with `post_unavailable` (200), never 404: a loaded feed can still show a Post a moderator has just
removed, so reaching it is normal use (§3.8.2). That includes both Like writes: `POST
.../like` and `DELETE .../like` against a removed Post return `post_unavailable` (200) and write
nothing — no insert, no delete.

### 6.10 Progress and the Leaderboard

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/me/progress` | `{ xp, level, xpIntoLevel, xpForNextLevel | null (at Level 10), streak, badges: [{ badge, awardedAt }] }` |
| `GET /api/leaderboard` | §10.5 |

### 6.11 Reports and moderation — §12 specifies each

`POST /api/reports` · `GET /api/moderation/queue` · `POST /api/moderation/post-groups/:postId/resolve`
· `POST /api/moderation/student-groups/:studentId/resolve` · `GET /api/admin/reports/resolved?page`.

### 6.12 Admin — Users, roles, sanctions (`ADMIN`) — §12.7 specifies the sanctions

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/admin/students?q&role&status&sort&order&page&pageSize` | the Users table: name, email, role, status (Active/Suspended/Removed), **Removed rows included**; `q` matches name or email |
| `GET /api/admin/students/:id` | the §6.2 profile plus email, role, status, avatar and the Student's Matches (§4.6); **never** their Friends, pending requests, Blocks or Direct Messages, which §4.6 keeps from Admins; view-only when Removed |
| `PATCH /api/admin/students/:id` | `{ displayName?, email? }` — target not Removed → else `student_removed` |
| `PUT /api/admin/students/:id/skills` | as §6.2, on the target |
| `PUT` / `DELETE /api/admin/students/:id/learning-goal` | as §6.2, on the target |
| `PUT` / `DELETE /api/admin/students/:id/avatar` | as §6.3, on the target (upload CSRF applies) |
| `POST /api/admin/students/:id/role` | `{ role }` |
| `POST /api/admin/students/:id/suspend` · `/reinstate` · `/remove` | `{}` |

No endpoint sets a password, XP, Level, Streak, Badge, or edits any Review, Private Feedback, Post,
Report or Direct Message (ADR-0008 d8, ADR-0018 d8). No endpoint creates a Student.

### 6.13 Admin — Rounds, Matches, Prompts (`ADMIN`) — §8 specifies each

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/admin/rounds` | every Round with number, times and counts per status |
| `POST /api/admin/rounds` | open a Round (§8.4) |
| `POST /api/admin/rounds/current/close` | close the open Round (§8.7) |
| `GET /api/admin/rounds/:id` | its Matches (pair, status, Score or hand-made, Mission); for the open Round also `unmatched` (§8.9) |
| `POST /api/admin/rounds/current/matches` | hand-made Match `{ studentIds: [a, b] }` (§8.6) |
| `GET /api/admin/matches/:id` | full Match with Learning Outcome, Private Feedback, Evidence metadata |
| `GET /api/admin/prompts` | Prompt history |
| `POST /api/admin/prompts` | publish (§8.12) |

### 6.14 Admin — Learning Analytics — `GET /api/admin/analytics` (§13)

### 6.15 Refusal and error codes

| Code | Status | Meaning |
| --- | --- | --- |
| `validation_failed` | 400 | DTO schema violated |
| `unauthenticated` | 401 | no valid session on a protected route |
| `forbidden` | 403 | role or relation forbids (never reachable from the UI's own controls) |
| `csrf_rejected` | 403 | upload Origin/header gate |
| `not_found` | 404 | unknown resource, disabled OAuth start or callback |
| `payload_too_large` | 413 | transport envelope exceeded |
| `unsupported_media_type` | 415 | mutation not JSON / upload not multipart |
| `busy_retry_later` | 503 | Unit of Work retries exhausted; nothing committed |
| `internal_error` | 500 | anything else |
| `invalid_credentials`, `too_many_attempts`, `email_unavailable`, `password_incorrect`, `already_signed_in` | 200 | auth refusals |
| `student_removed`, `self_action_forbidden`, `last_active_admin`, `already_suspended`, `not_suspended` | 200 | Users-table refusals |
| `goal_skill_not_listed` | 200 | Learning Goal not on the `LEARN` list |
| `file_too_large`, `file_type_not_allowed`, `file_invalid` | 200 | upload validation (§9.5) |
| `friend_request_unavailable`, `friendship_exists`, `request_not_pending`, `not_friends`, `already_blocked`, `not_blocked` | 200 | social |
| `dm_unavailable` | ack | Block either way or recipient Removed (socket ack, §7.3) |
| `round_already_open`, `no_open_round`, `not_a_candidate`, `already_matched`, `pair_blocked`, `same_student` | 200 | Round and hand-made Match |
| `match_not_pending`, `match_not_in_progress`, `match_not_reviewable`, `already_reviewed` | 200 | Match and Review |
| `prompt_not_live`, `already_answered`, `admins_cannot_answer` | 200 | Prompts |
| `post_unavailable` | 200 | the Post was removed by moderation (§6.9) |
| `already_reported`, `report_target_invalid`, `already_resolved`, `conflict_of_interest` | 200 | Reports |

---

## 7. Socket contract

### 7.1 Endpoint and transport

- Same origin, path `/socket.io/`, proxied by nginx with the WebSocket upgrade and the `Origin`
  header preserved (ADR-0004 d2).
- Server (custom Nest `IoAdapter`): `{ path: "/socket.io", transports: ["websocket"],
  allowUpgrades: false, serveClient: false, allowRequest }`, **no `cors` option**. Long-polling is not
  a transport, so `GET /socket.io/?EIO=4&transport=polling` is refused by Engine.IO.
- Client: `io({ path: "/socket.io", transports: ["websocket"], autoConnect: false, reconnection:
  true, reconnectionDelay: 1000, reconnectionDelayMax: 10000 })`, connected only after `GET
  /api/session` reports a session. The cookie travels with the handshake; there is no token.

### 7.2 Admission (every connection and every reconnect)

1. **Origin gate — Engine.IO `allowRequest`**: `req.headers.origin === PUBLIC_ORIGIN` byte-for-byte,
   else refuse. Absent, `null` or mismatched Origin is refused **before the cookie is read**, even
   with a valid session. The refusal leaves the session row untouched (ADR-0003 d7).
2. **Session — Socket.IO middleware (`io.use`)**: parse `pc_session`, resolve as §5.3 (no renewal);
   failure → `next(new Error("unauthorized"))`. The session row is untouched.
3. **On connect**: register `{ socketId, studentId, sessionHash }` in the Presence registry (§7.6),
   then re-read the session row once; if it is gone, disconnect. A handshake whose step 2 read ran
   before a revoking commit but which registers after `revokeSessions` has swept the registry is
   caught here, because the commit deleted the row first. Only then join `feed`, `rounds` and
   `student:<studentId>` and apply §7.6's online transition.

### 7.3 Client → server: exactly one event

`dm:send`, with acknowledgement. Payload `{ recipientId: uuid, body: string }` (body 1–2000). The
gateway validates, then calls `messaging.send(actor, recipientId, body)` — one SSI tx that reads the
sender's row (Active), the recipient (exists, ≠ sender, not Removed) and the pair's Block rows (none
in either direction), then inserts the `DirectMessage`. **After commit**: `dm:message` to
`student:<recipientId>` and `student:<senderId>` (the sender's other tabs). Ack `{ ok: true, data:
DirectMessage }` or `{ ok: false, error: { code: dm_unavailable | validation_failed |
busy_retry_later } }`. **No other client event has a handler**; nothing a client sends performs a
privileged action (ADR-0003 d9). DMs are not restricted to Friends (ADR-0018 Consequences).

### 7.4 Server → client events (the complete list)

| Event | Room | Payload | Emitted after the commit of | Client reaction |
| --- | --- | --- | --- | --- |
| `post:created` | `feed` | the full feed item (§6.9) with `likeCount: 0` | a Prompt answer or a Review | insert at the top of a loaded feed |
| `round:opened` | `rounds` | `{}` | Round open | invalidate current Round, current Match, admin Round views, analytics |
| `round:closed` | `rounds` | `{}` | Round close | invalidate the same, plus `/api/me/progress` when a profile is open (Consistent Learner) |
| `match:ready` | `student:<id>`, each Student of the pair | `{}` | Round open (every matched Student); hand-made Match (both) | invalidate the current Match |
| `dm:message` | `student:<recipient>`, `student:<sender>` | the `DirectMessage` | a DM send | append to the open thread; otherwise bump that thread's unread count |
| `presence:update` | `student:<friendId>` for each accepted Friend | `{ studentId, online }` | not a DB commit — a registry transition (§7.6) | update the Friends list |

Round events are content-free invalidation signals (ADR-0010 d7, ADR-0015 d8); no event carries a
Badge, a Report, a role or any Admin data. **No event is added** for Likes, declines, Reviews,
Evidence, Prompt publication, reports or sanctions; those surfaces refresh on navigation or reload.

### 7.5 Lifecycle and client retry (M27)

- **Session rejection is terminal**: a `connect_error` whose message is `unauthorized` → stop
  reconnection, clear cached data, route to `/sign-in` (ADR-0003 d7).
- **Transport failure** (how an Origin refusal appears, since a browser cannot read a refused
  upgrade's status) → pause reconnection and probe `GET /api/config` and `GET /api/session`:
  - `window.location.origin !== publicOrigin` → **terminal** configuration error banner, no retry.
    This is exactly the server gate's predicate, so the client stops precisely when the server would
    keep refusing;
  - no session → terminal, `/sign-in`;
  - otherwise a network or server outage → resume reconnection with backoff.
- **Forced disconnect** (`io server disconnect` after `revokeSessions`) → no automatic reconnect;
  probe `/api/session`; signed out → `/sign-in`.
- **After any reconnect** the client invalidates its queries, so events missed while disconnected are
  recovered by refetching (graceful reconnection, `en.subject.md:494`).
- **Forced disconnect on the server**: `revokeSessions(studentId)` disconnects every socket of that
  Student; `revokeSessions(sessionHash)` only the sockets that session authenticated.

### 7.6 Presence

- Process-local registry in the one `api` process: `studentId → Set<socketId>`. **Online** while the
  set is non-empty (several tabs are one Presence). Never stored; a restart reads everyone offline
  (ADR-0003 Consequences, `CONTEXT.md`).
- First socket of an offline Student with no pending grace timer → `presence:update {online: true}`
  to their accepted Friends. A pending grace timer is cancelled instead, with no broadcast.
- Last socket gone → a **20-second grace timer**; if the set is still empty when it fires →
  `presence:update {online: false}`. Forced disconnects take the same path.
- Recipients are computed when broadcasting: accepted Friends, Removed excluded. `GET /api/friends`
  reads `online` from the registry. Nothing records when anyone was last online.

---

## 8. Matching, Round lifecycle and the Prompt loop

### 8.1 Candidate pool (ADR-0002 d4 as narrowed by ADR-0008 d2)

A Student is a **candidate** iff, **read inside the creating transaction**: at least one
`StudentSkill` row (either kind), `role ≠ ADMIN`, `suspended_at IS NULL`, `removed_at IS NULL`.
Level for selection is `min(10, 1 + floor(xp / 250))` from the XP read in the same transaction.

### 8.2 The Compatibility Score, exactly (ADR-0006 d1–d5)

For a pair oriented (Mentor *m*, Mentee *e*): `forward = m.TEACH ∩ e.LEARN`, `reverse = e.TEACH ∩
m.LEARN`, *f* = |forward|, *r* = |reverse|.

```
M = max(f, r); D = 2^M
N = 70·(D − 2^(M−f)) + 30·(D − 2^(M−r))      // exact numerator: weighted sum = N / D
base  = floor((2·N + D) / (2·D))              // round half up on the exact value
bonus = 10 if e has a Learning Goal and its Skill ∈ forward, else 0
score = min(100, base + bonus)
```

Integer arithmetic only (with ≤ 27 catalogue Skills, `N < 2^53`; SQL, if ever used, `bigint`). The
five exact halves resolve 22.5 → 23, 52.5 → 53, 57.5 → 58, 67.5 → 68, 87.5 → 88. Reference values:
`(f,r) = (1,0) → 35`, `(2,0) → 53`, `(1,1) → 50` or `60` with the bonus, `(5,5) → 97`, capped at 100
with the bonus. The Mentor's own Learning Goal never enters.

### 8.3 The matcher (pure engine, ADR-0006 steps 1–9)

Input: candidates `{ id, teach, learn, goalSkillId | null, level }`; `history` = every unordered pair
with **any** `Match` row, any Round, any status, either orientation, hand-made included (ADR-0006
step 2 clarification); `blocked` = every unordered pair with a `Block` in either direction.

1. Take every unordered candidate pair.
2. Discard it if in `history` or `blocked`.
3. Score both orientations (§8.2).
4. Keep the orientation with the higher Score; on equal Scores the **lower id is Mentor**.
5. Discard it if Score < **25** (this removes exactly the Score-0 pairs, ADR-0006 d4).
6. `priority = score − 2 · max(0, |level(mentor) − level(mentee)| − 2)` — never displayed.
7. Loop: recompute every unmatched candidate's viable partners (surviving pairs whose other member is
   also unmatched — recomputed after every Match). Among candidates with **at least one** viable
   partner, pick the one with the fewest, ties to the lower id. Take that candidate's viable pair
   with the greatest `priority`, then greater Score, then smaller pair key `(lowerId, higherId)`
   compared lexicographically. Emit it with the next **selection index** (0, 1, 2, …) and mark both
   Students matched. Stop when no unmatched candidate has a viable partner.
8. Output, in selection order: `{ mentorId, menteeId, score, goalBonusApplied, forward[], reverse[],
   index }`. Candidates left out are the Round's unmatched (§8.9).

The engine has no I/O and no randomness; the same input always yields the same output (C6).

### 8.4 Opening a Round — `POST /api/admin/rounds`

- **Auth** `ADMIN`. **Input** `{}`.
- **SSI tx** reads: the actor (role `ADMIN`, Active); whether a Round is open → `round_already_open`;
  every candidate with Skills, Goal and XP; every `Match` pair; every `Block` pair.
  `checkpoint("round.open")`.
- **Rule**: run the engine (§8.3).
- **Persist**: `Round(opened_at = ctx.now)`; for each output item a `Match(status MATCHED, mission =
  MISSION[index mod 6], compatibility_score = score, goal_bonus_applied)` and its coverage rows.
- **Events**: `round:opened`; `match:ready` to every matched Student.
- **Result** `{ round: { id, number }, matchCount, unmatched: StudentRef[] }`.
- **Failure**: any error commits nothing — no Round without its Matches (ADR-0002 d3). Fewer than two
  candidates is legal: a Round with zero Matches.
- **Concurrency**: open vs open → one commits, the other retries and is refused (the
  `round_single_open` index is the backstop, mapped to the same refusal). Skill edits, sign-ups, role
  changes, sanctions and Blocks racing it resolve in one serial order (ADR-0008 d2, ADR-0006 d10).

### 8.5 Accepting and declining

**`POST /api/matches/:id/accept`** — session · `{}` · SSI reads the Match and the actor (Active) ·
actor must be its Mentor or Mentee (otherwise 404, the Match is invisible to them) · status `MATCHED`:
set the actor's `*_accepted_at` if null; when both are set → `ACCEPTED`. Repeating an accept already
recorded returns the current state. Status `ACCEPTED` with the actor already accepted → idempotent
`ok`. Any other status → `match_not_pending`. A Match created before the actor's promotion to `ADMIN`
may still be accepted (ADR-0008 d2). Concurrent accepts by both sides both land, one transition.
Events none · Visibility: no event; the pair reads the new status on the next load (§7.4).

**`POST /api/matches/:id/decline`** — session · actor must be its Mentor or Mentee (otherwise 404,
as for accept) · status `MATCHED` or `ACCEPTED` → `DECLINED`,
`declined_by_id = actor`; else `match_not_in_progress`. Both Students become unmatched (derived);
nothing searches for a replacement (ADR-0002 d8). A Block is not a decline; the blocking Student
declines here if they want out (ADR-0006 d10). Events none · Visibility: as accept.

**Concurrency**: accept, decline, Review, Round close, Suspension and Removal all write the Match
row; whichever commits first wins and the others see the new status (ADR-0002 d5).

### 8.6 Hand-made Match — `POST /api/admin/rounds/current/matches`

- **Auth** `ADMIN`. **Input** `{ studentIds: [a, b] }`. **Validation**: two UUIDs (§6.0.1:
  malformed → 400); distinctness is the `same_student` rule below, not a shape check.
- **SSI tx** reads: the actor (Active); the open Round → `no_open_round`; `a ≠ b` → `same_student`; both
  Students against the candidate predicate §8.1 → `not_a_candidate`; each one's Matches in this Round
  with a standing status → `already_matched`; the pair's Block rows either way → `pair_blocked`; the
  **count of all Match rows in the Round**, any status (the Mission index). `checkpoint
  ("match.handmade")`.
- **Rule**: orient by §8.3 steps 3–4 — score **both** orientations with §8.2's Score (Learning-Goal
  bonus included), higher Score is Mentor, lower id on a tie — and set `goal_bonus_applied` = true
  exactly when §8.2's bonus condition holds for the **chosen** orientation (the Mentee's Learning Goal
  skill in the forward set), false otherwise: the same Score, orientation and goal-bonus logic the
  matcher runs (§8.3), with no hand-made rule of its own. **No history check (no-repeats), and no
  floor — vacuous, since the orienting Score is never stored (`NULL`)** — the only exemptions
  (ADR-0006 d10). The Score computed to orient is neither stored nor shown; only the
  frozen boolean survives (ADR-0014 d9).
- **Persist**: `Match(status MATCHED, compatibility_score NULL, goal_bonus_applied = the Rule's
  boolean, mission = MISSION[count mod 6])` and its coverage rows (possibly none). Nothing else of
  the computation persists — not the orienting Score, not the bonus.
- **Events**: `match:ready` to both.
- **Failure**: any refusal above commits nothing.
- **Result**: the created `Match` (`MatchView`, `compatibilityScore: null`).
- **Visibility**: the pair reads it via `GET /api/matches/:id`; Admins via `GET /api/admin/matches/:id`.
- **Concurrency**: two creations sharing a Student → one commits, the other retries and gets
  `already_matched` with nothing written (ADR-0006 d10). Creation vs close → creation first: it lapses
  with the Round; close first: `no_open_round`, not moved into a later Round (ADR-0002 d7). Creation vs
  a role/sanction change or a Block of either Student → one serial order.

### 8.7 Closing a Round — `POST /api/admin/rounds/current/close`

- **Auth** `ADMIN`. **Input** `{}`.
- **SSI tx** reads: the actor (Active); the open Round *R* → `no_open_round`; every Match in *R*; every
  Student's role, flags and `streak`; per Student, **qualifying activity in *R***: a Match in *R* with
  status `COMPLETED` where they are Mentor or Mentee, **or** a Post with `prompt_id` set, `author_id`
  = them and `answer_round_id = R` (removed or not). `checkpoint("round.close")`.
- **Persist**:
  1. `R.closed_at = ctx.now` — irreversible.
  2. Every Match in *R* with status `MATCHED` or `ACCEPTED` → `LAPSED` (pays nothing).
  3. For every Student with `suspended_at IS NULL AND removed_at IS NULL` — any role, `ADMIN`
     included (role alone has no freeze): `streak = qualifying ? streak + 1 : 0` (written only when it
     changes). **Suspended and Removed Students are skipped entirely**: no Streak write, no Badge test,
     never replayed (ADR-0014 d7, ADR-0008 d5).
  4. For each Student whose new Streak is ≥ 3: `BadgeAward(CONSISTENT_LEARNER)` `ON CONFLICT DO
     NOTHING`.
- **Events**: `round:closed`.
- **Result** `{ roundId, lapsed, streaksIncremented, streaksReset, consistentLearnerAwarded }`.
- **Visibility**: no per-Student event besides `round:closed`; profiles and analytics read the new
  state on the next load (§7.4, §10.7, §13).
- **Concurrency**: a Prompt answer ordered before the close is counted (its `answer_round_id` is *R*);
  one ordered after cannot name *R*, because it read no open Round or a later one. A Suspension or
  Removal ordered before the close is skipped; ordered after, the close's Streak and Badge stand and
  are frozen. A Review ordered first is `COMPLETED` and counts; ordered after, it finds the Match
  `LAPSED` and is refused.

### 8.8 Match status machine

| From | To | Trigger | By |
| --- | --- | --- | --- |
| `MATCHED` | `MATCHED` | first acceptance | Mentor or Mentee |
| `MATCHED` | `ACCEPTED` | second acceptance | Mentor or Mentee |
| `MATCHED`, `ACCEPTED` | `DECLINED` | decline | Mentor or Mentee |
| `ACCEPTED` | `COMPLETED` | Review commit — the **only** completion (ADR-0010 d1) | Mentee |
| `MATCHED`, `ACCEPTED` | `LAPSED` | Round close | Admin |
| `MATCHED`, `ACCEPTED` | `TERMINATED_BY_ADMIN` | Suspension or Removal of either participant | Admin |

`COMPLETED`, `LAPSED`, `DECLINED`, `TERMINATED_BY_ADMIN` are terminal. **Standing** = `MATCHED`,
`ACCEPTED`, `COMPLETED`, `LAPSED`; **repudiated** = `DECLINED`, `TERMINATED_BY_ADMIN`; **in
progress** = `MATCHED`, `ACCEPTED`. Reinstatement revives nothing; promotion changes nothing. No
action marks a Match complete, and no Mission is tracked.

### 8.9 Unmatched (derived, never stored)

For the open Round: the candidates (§8.1, evaluated now) with **no Match in that Round in a standing
status**. A declined Student is unmatched; a lapsed one is not; a Suspended or Removed Student is not
a candidate and so is never listed. Shown to Admins on `/admin/rounds` with the hand-made control
(ADR-0006 step 8). Nothing carries over between Rounds.

### 8.10 Mission assignment (ADR-0012 d6)

Index *i* → the enum value at position *i* mod 6 (`TECHNICAL_CONCEPT` first). Matcher Matches take
their selection index; a hand-made Match takes the count of Match rows already in the Round, whatever
their status. The index is never stored; the value is written once. No write path updates `mission`.

### 8.11 The explanation (ADR-0006 Consequences)

The SPA renders, from the frozen state only: the FORWARD Skills (*"<partner> can teach you …"* or
*"You can teach <partner> …"* by role), the REVERSE Skills if any, and a Learning Goal note when
`goalBonusApplied` — the stored boolean, written at insert for a hand-made Match too (§8.6). A Score
is never shown without that sentence; a hand-made Match shows *"Matched by an Admin"* and no number,
the note and the number staying independent of each other. Because every matcher Match has a non-empty FORWARD set, every
displayed Score names at least one concrete Skill and its direction (C4).

### 8.12 The Reflection Prompt lifecycle (ADR-0007)

**Publish — `POST /api/admin/prompts`** — `ADMIN` · `{ question }` (1–300) · SSI reads the actor
(Active) and
`max(publication_order)` · `checkpoint("prompt.publish")` · insert `ReflectionPrompt(question,
published_at = ctx.now, publication_order = max + 1, or 1 for the first)`; a unique violation on
`publication_order` is retryable for this operation only · no event · result the Prompt ·
Refusals: over-long or empty question → `validation_failed` · Visibility: no event; the live Prompt
is read on the next load (§7.4). **The
greatest `publication_order` is the one live Prompt**; publishing closes the previous one for
answering and nothing else. Two overlapping publications both commit with distinct values, and a
publication that committed before another began always has the smaller value (M2). No edit, delete,
draft, schedule or close action exists.

**Answer — `POST /api/prompts/:id/answers`** — session · `{ body }` (1–1000) · SSI reads:
- the actor: role `STUDENT` or `PEER_MODERATOR` → else `admins_cannot_answer`; Active;
- the Prompt (unknown → 404) and `max(publication_order)`: live iff equal → else `prompt_not_live`;
- the actor's existing answer to it → `already_answered`;
- the open Round, if any;
- the actor's count of Prompt-origin Posts.

`checkpoint("prompt.answer")` · **Persist, as one success**: `Post(prompt_id, author_id = actor, body,
answer_round_id = open Round id or NULL)`; `Student.xp += 20`; when the count including this answer
is ≥ 3, `BadgeAward(KNOWLEDGE_SHARER)` `ON CONFLICT DO NOTHING` · **Events** `post:created` · **Result**
the earn panel `{ xpAwarded: 20, xp, level, xpIntoLevel, xpForNextLevel, badgesAwarded }`
(`badgesAwarded` lists only Badges this transaction inserted) · **Concurrency**: a duplicate or retried
answer → `UNIQUE(prompt_id, author_id)` admits one; every other attempt returns `already_answered`
having created and paid nothing; a rolled-back attempt leaves the slot free (ADR-0007 d1). Publication
vs answer and answer vs close are one serial order (§3.6.3). The answer establishes qualifying activity
through `answer_round_id` and **never writes `Student.streak`**; with no open Round it earns XP and
Badge progress only (ADR-0002 d9).

**Read** — `GET /api/prompts/live`, `GET /api/prompts`, `GET /api/prompts/:id/answers` (§6.8).
Answers are visible to everyone immediately (ADR-0007 d10). A closed Prompt stays readable forever.
Removing an answer Post keeps its row, so its `(prompt, author)` slot stays used and its XP stays paid
(ADR-0008 d6, ADR-0011 Consequences).

---

## 9. Reviews, Evidence and Private Feedback

### 9.1 Three parts, three homes (ADR-0014 d1)

The **Learning Outcome** is the `Review` row (pair + Admins). **Private Feedback** is its own table
(Mentor, author, Admins). The **Public Takeaway** is the `body` of a Takeaway `Post` (everyone).
All three are written in one transaction and **never edited or deleted** by anyone (ADR-0014 d11);
Evidence is the one mutable attachment.

### 9.2 Submitting a Review — `POST /api/matches/:id/review`

- **Auth** session. **Input** `{ learningOutcome: { learned, canNowDo }, privateFeedback: {
  answerUsefulness, answerExplanation, rating? }, publicTakeaway }` (limits §6.0.3; `rating` absent or
  an integer 1–5).
- **SSI tx** reads: the actor (Active); the Match — not a participant → 404; the actor is the Mentor
  → 403; status `COMPLETED` → `already_reviewed`; any status other than `ACCEPTED` →
  `match_not_reviewable`; the Mentor's row. `checkpoint("review.submit")`.
- **Persist, as one success**: `Review`; `PrivateFeedback`; `Post(review_id, author_id = Mentee, body =
  publicTakeaway)`; `Match.status = COMPLETED`; `Mentor.xp += 80`; `Mentee.xp += 120` (80 + 40);
  `BadgeAward(FIRST_MENTOR)` for the Mentor `ON CONFLICT DO NOTHING` (this Review makes their count of
  Matches completed as Mentor ≥ 1).
- **Events**: `post:created` (the Takeaway).
- **Result**: the Mentee's earn panel `{ reviewId, postId, xpAwarded: 120, xp, level, xpIntoLevel,
  xpForNextLevel, badgesAwarded: [] }`.
- **Roles**: a participant promoted to `ADMIN` after the Match was created may still submit, and both
  Students are paid and First Mentor evaluated as usual (ADR-0010 d1).
- **Concurrency**: a duplicate or retried submission → `UNIQUE Review(match_id)` and the status
  re-read admit one; the loser gets `already_reviewed` and awards nothing. Against Round close,
  Decline, Suspension or Removal: whichever commits first wins; a terminal status first rejects the
  Review with no XP or Badge (ADR-0002 d5, ADR-0008 d5). Against a concurrent Prompt answer or another
  Review paying the same Student: both commit, XP accumulates, thresholds are evaluated in the serial
  order (§10.4).

### 9.3 Reading

- `GET /api/matches/:id` (pair, Admin; any other Student → 404, §6.6) and `GET /api/admin/matches/:id` return the Learning Outcome and
  Evidence metadata; Private Feedback is included only for its Mentor, its author and Admins.
- `GET /api/me/feedback-received` — the Mentor's private route, newest first, ratings shown one by
  one, never averaged, a Removed author shown as the tombstone (ADR-0013 d4–d8). It is never on the
  profile page (ADR-0013 d5).

### 9.4 Evidence — `PUT` / `DELETE /api/reviews/:reviewId/evidence`

- **PUT** (multipart `file`), in this order: `UploadCsrfGuard` → session → pre-check that the actor
  is the Mentee of **this Review's Match** (else 403) → Multer (one file, `limits.fileSize` 5 MiB + 1 byte) → size check (`size >
  5,242,880` → `file_too_large`) → byte validation §9.5 — **all before any transaction** → SSI tx re-reads `Review → Match`, confirms the
  Mentee and that the actor is Active — **the role is not read**: a Mentee promoted to `ADMIN` after
  the Match was created keeps the path for their own Review (ADR-0009 d5, ADR-0014 d11, the
  standing-Match exception of ADR-0008 d2) — then **upserts** the one `Evidence` row with a new token
  (create or replace in one statement) → result `{ token, mime, size, filename }` · Events none ·
  Refusals `file_too_large`, `file_type_not_allowed`, `file_invalid`, plus the pre-check's 403 ·
  Visibility: reads via `GET /api/files/evidence/:token` and the Match detail (§9.3).
- **DELETE** `{}` → same authorization → SSI delete if present (idempotent `ok: true`) · Events none.
- A rejected or failed replacement leaves the old Evidence untouched, because validation precedes the
  transaction and the transaction is atomic (ADR-0009 d5).
- Allowed after the Match is `COMPLETED`, in any later Round; a later Match is irrelevant. The Mentor
  and every Admin who is not this Review's Mentee are read-only (ADR-0009 d5). Suspension pauses the
  path (no session), reinstatement restores it, Removal ends it and the row survives (ADR-0009 d5–d6).
- **Concurrency**: put vs put vs delete on one Review → one serial order; `UNIQUE(review_id)` holds at
  every commit.
- **Read**: `GET /api/files/evidence/:token` (§6.3). The pair means **the Mentor and Mentee of the
  Match reached through this Evidence's Review** — never a current Match, never another historical
  one; a Peer Moderator reads only as a member of that pair (ADR-0009 d4).

### 9.5 File acceptance contract (both files; M30)

1. **Transport**: nginx admits 6 MiB on the three upload routes and 1 MiB on every other `/api/`
   route; a maximum-size Evidence upload must reach the API (ADR-0009 d2).
2. **Size**: Multer's `limits.fileSize` is the documented cap + 1 byte, so a boundary payload reaches
   the API intact and the **service**, not the parser, judges it: any file with `size >` the
   documented cap — 2,097,152 (Avatar) / 5,242,880 (Evidence) — is rejected `file_too_large`. Exactly
   the cap is accepted; one byte above it is `file_too_large`. A file past Multer's own limit aborts
   the stream and takes the same `file_too_large` path. Empty → `file_invalid`.
3. **Format from the bytes**: PNG signature `89 50 4E 47 0D 0A 1A 0A`; JPEG `FF D8 FF`; PDF `%PDF-`.
   None → `file_type_not_allowed`. **An Avatar that is a PDF → `file_type_not_allowed`.**
4. **Complete structural validation** of the detected format, rejecting empty, malformed or
   truncated content with `file_invalid`:
   - PNG: width and height from `IHDR` ≤ 4096, then `pngjs` `PNG.sync.read` (checks every chunk CRC,
     requires `IEND`);
   - JPEG: ends with `FF D9`, then `jpeg-js` decode with `maxResolutionInMP: 17`;
   - PDF: `%%EOF` within the last 1024 bytes, then `pdf-lib` `PDFDocument.load(bytes, {
     throwOnInvalidObject: true, updateMetadata: false })` with at least one page.
5. **Claims must agree**: a supplied filename extension must be `.png`, `.jpg`/`.jpeg` or `.pdf`
   matching the detected format (case-insensitive); a part `Content-Type` other than
   `application/octet-stream` must equal the detected canonical type. Disagreement →
   `file_type_not_allowed`; nothing is relabelled.
6. **Persist** the canonical `mime` and the byte length from the validated bytes, never client
   metadata. Evidence `filename` = basename, path separators and control characters removed, ≤ 255,
   `evidence.<ext>` when empty.
7. **Serve** with the canonical type and `X-Content-Type-Options: nosniff`.

The SPA mirrors checks 2, 3 (by extension and declared type) and 5 for immediate feedback; only the
server decides.

### 9.6 Avatar lifecycle

A Student without an `Avatar` row shows the bundled default. The owner (`/api/me/avatar`) or an Admin
(`/api/admin/students/:id/avatar`, target not Removed) may upload, replace or delete. **Removal
deletes the row** in the Removal transaction (ADR-0009 d6); Suspension touches nothing (d7).

### 9.7 Preview and progress (`en.subject.md:544–546`)

PNG and JPEG preview as `<img>`; a PDF previews in an `<iframe>` on the file URL (same origin) with a
download link beside it. Uploads show a progress bar from `XMLHttpRequest.upload.onprogress`.

---

## 10. Gamification

### 10.1 XP (ADR-0010 d1–d2)

| Event | Mentor | Mentee / author | Path |
| --- | --- | --- | --- |
| Review submitted on an `ACCEPTED` Match | +80 | +120 (80 + 40) | §9.2 |
| Reflection Prompt answered | — | +20 | §8.12 |

Nothing else pays: not being matched, accepting, Likes, Friendships, Direct Messages, reports, or
moderation. **XP is never revoked** — a removed Post keeps its XP (ADR-0011 Consequences). No Admin can
set it (ADR-0008 d8). A lapsed, declined or terminated Match pays nobody.

### 10.2 Level (ADR-0010 d3)

`level = min(10, 1 + floor(xp / 250))`, derived on read, never stored. Band *n* (1–9) spans
`[250·(n−1), 250·n)`; Level 10 starts at 2250 and is terminal. Progress: `xpIntoLevel = xp −
250·(level − 1)`, `xpForNextLevel = 250`, or `null` at Level 10, where the bar stays full and `/rules`
says why.

### 10.3 Badges (ADR-0010 d4, ADR-0014 d7)

| Badge | Threshold | Tested in | Earned by |
| --- | --- | --- | --- |
| `FIRST_MENTOR` | Matches completed as Mentor ≥ 1 | the Review transaction | the Mentor |
| `KNOWLEDGE_SHARER` | Prompt-origin Posts authored ≥ 3 (removed ones count) | the answer transaction | the author |
| `CONSISTENT_LEARNER` | Streak ≥ 3 after the increment | the Round-close transaction | each Student the close increments |

Each threshold is tested once, in the transaction that could first make it true, and **never
re-examined**; a Badge is never revoked, so Consistent Learner may be held at Streak 0. No sweep, no
job, no backfill.

### 10.4 Serialization and convergence (M1, M4)

Each of the three paths updates the Student row it pays or advances (XP or Streak), so paths touching
one Student conflict and serialize (§3.6). A Badge insert is `ON CONFLICT DO NOTHING`. When two
distinct valid events for one Student race to the same Badge, one transaction aborts with a
serialization failure; the Unit of Work re-runs it; it finds the Badge committed (its insert does
nothing) and still commits its own event and XP. Result: **both events and both XP increments exactly
once, exactly one `BadgeAward`, no threshold missed** (ADR-0010 d2). A duplicate of the *same* event is
stopped by that event's own constraint and pays nothing.

**Under M1 no schedule puts two valid events for one Student in flight against the same Badge**, so
the rule above holds vacuously and the `ON CONFLICT DO NOTHING` insert remains as a backstop:

- **First Mentor** would need two Matches `ACCEPTED` at once with the same Mentor. That cannot
  happen, because a Student has at most one standing Match per Round, only one Round is open, and
  every Match in a closed Round is terminal.
- **Consistent Learner** is written only by the one Round close.
- **Knowledge Sharer** needs a second answer, to a *newer* Prompt, whose publication commits between
  the two answers' reads. That makes the older answer the pivot of a read/write cycle (newer answer
  → older answer → publication). PostgreSQL cancels the pivot (*"Canceled on identification as a
  pivot, during write"*), and its retry re-reads liveness and is refused `prompt_not_live`
  (ADR-0007 d1).

Reproduced on PostgreSQL 17.11 on 2026-09-24 in every release order. The older answer commits only
when no newer answer holds reads. Category 9 asserts the outcome this schedule actually has (§16.3).

### 10.5 The Leaderboard — `GET /api/leaderboard` (ADR-0010 d6)

Eligible = role `STUDENT` or `PEER_MODERATOR`, `suspended_at IS NULL`, `removed_at IS NULL`. Order
`xp DESC, id ASC`; rank = 1-based position. Returns `{ top: [{ rank, student: StudentRef, xp, level }]
(≤ 10), me: { rank, xp, level } | null }`. `me` is present only when the viewer is eligible **and**
ranks below ten; an Admin, a Suspended or a Removed viewer never gets a row or a pin, the pin being
computed over the same filtered set (ADR-0008 d6, ADR-0010 d6). Filtering never changes stored XP.

### 10.6 Streak (ADR-0014 d7)

Stored integer, changed **only** by Round close (§8.7): +1 for a Round with qualifying activity, 0 for
a Round without, **unchanged** for a Student Suspended or Removed at the close. A skipped Round is never
replayed; a reinstated Student resumes from the frozen value. An answer in an idle period earns XP and
Knowledge Sharer progress but never Streak (ADR-0002 d9). Consistent Learner is Streak's only consumer.

### 10.7 Visual feedback and rules (ADR-0010 d7; `en.subject.md:854–856`)

- **Earn panels** on the two confirmation screens: Review submitted (the Mentee's +120, Level bar,
  Badges this act awarded to them) and Prompt answered (+20, Level bar, Knowledge Sharer when awarded).
- **Profile progress**: XP, Level progress bar, Streak, Badge list with dates. An open profile refetches
  `/api/me/progress` on `round:closed`, so Consistent Learner appears as soon as the close commits.
  First Mentor (earned during the Mentee's submission) and any Badge earned while the Student was away
  appear on the next profile load (§2.3 R4).
- **No** toast, inbox, unread flag, "seen" state or notification delivery.
- **`/rules`**: a static page with the XP table, the ten Level bands and the Level-10 cap, and the three
  Badge conditions. No data is fetched.

### 10.8 Promotion to Admin

XP, Level, Streak value, Badges and Posts stay and render normally on the profile. Only the
Leaderboard row and the pin disappear. The Prompt path is closed while the role is held; a Match
created before promotion finishes through its ordinary path. Demotion restores rank eligibility and
Prompt answering without recomputing anything (ADR-0008 d2, ADR-0010 d1, d6).

---

## 11. Social: Friends, Blocks, Direct Messages, Likes

### 11.1 Friends (ADR-0014 d4)

A Friendship is a **directed request with an acceptance**, unique per unordered pair. It confers
nothing until accepted; accepted Friends see each other's Presence, which is why acceptance exists.
Either party ends it (hard delete). A friends list is shown to its owner only (ADR-0018 d4).
Operations are §6.4. A request to, or acceptance of a request from, a Removed Student is refused
(ADR-0008 Consequences); Removed counterparts disappear from friends and request lists, while any
history elsewhere shows the tombstone.

### 11.2 Blocks (ADR-0006 d10, ADR-0014 d4, CONTEXT)

- **Create** (`POST /api/blocks`): one Student's standing refusal, stored directed, **evaluated in
  either direction**. In the same transaction it deletes the pair's Friendship row, pending or
  accepted. From then on, in either direction: no friend request, no new Direct Message, no Match —
  by the matcher (step 2) or by an Admin's hand (§8.6).
- **Does not** end a Match that already exists (the blocker may decline it while in progress), delete
  message history, file a Report, or notify anyone. It never affects sessions.
- **Visibility**: the blocker only. The other Student is not told; Admins do not see Blocks.
- **Concurrency**: a Block and a new friend request between the same pair have one serial order —
  Block first, the request is refused; request first, the Block deletes it — so a Block and a
  Friendship row never coexist at any commit (§3.6.3). A Block racing a Round open or a hand-made
  Match: Block first, no Match; creation first, the Match stands (ADR-0006 d10). A Block racing a
  Peer Moderator's queue action: one serial order at the action (§12.5).

### 11.3 Lifting a Block (M23, §2.3 R1)

`DELETE /api/blocks/:studentId` deletes the actor's own Block row. It restores nothing: an ended
Friendship must be requested again; the matcher's no-repeats history is unaffected; a Block the other
Student set on the actor still applies. Only the blocker can lift it. The Privacy Policy states it
(retention: *a Block is deleted when you lift it*).

### 11.4 Direct Messages (ADR-0014 d6, ADR-0003 d9, ADR-0018 d4)

- 1:1 only; a thread is derived from the unordered pair, with no Conversation row.
- **Send** over the socket only (§7.3), to any Student who is not Removed and not in a Block with the
  sender in either direction — Friendship not required.
- **Read**: `GET` endpoints only read (§6.5). **Mark read** is `POST
  /api/messages/threads/:peerId/read`, issued by the SPA when the thread is opened, and sets `read_at`
  only on messages addressed to the opener.
- **No read receipts**: `read_at` feeds the recipient's unread count and nothing else.
- History is never deleted or unsent; it stays readable to both participants after a Block or a
  Removal (tombstone). **No application route lets anyone else — any Admin included — read a Direct
  Message.** A database operator can read stored messages because nothing is encrypted at rest; the
  Privacy Policy states both layers (ADR-0018 d13).

### 11.5 Likes (ADR-0014 d5)

Revocable (delete the row), attributed, readable by every signed-in Student, self-Like permitted, no
XP, not reportable, no event (§6.9).

---

## 12. Moderation: roles, Reports, sanctions

### 12.1 Roles (ADR-0008 d1–d4)

Exactly one of `STUDENT`, `PEER_MODERATOR`, `ADMIN` per Student, assigned only by an Admin in the
Users table; no OAuth claim, XP, Level or other threshold assigns a role. A Peer Moderator is a full
participant (matched, answers Prompts, earns XP, ranked). An Admin is staff: never a candidate, never
answers a Prompt, never ranked. Round control, Prompt publication, Student reports, sanctions and
roles are Admin-only.

### 12.2 Filing a Report — `POST /api/reports`

- **Auth** session, any role (an Admin may file, ADR-0011 d11). **Input** `{ postId }` **or** `{
  studentId }` (exactly one), `reason ∈ ReportReason`, `text?` (1–1000).
- **SSI tx** reads: the actor (Active); a Post target — exists, `removed_at IS NULL`, `author_id ≠
  actor`; a Student target — exists, not Removed, `≠ actor`. Otherwise `report_target_invalid`. A
  Suspended Student remains reportable (ADR-0011 d11).
- **Persist** `Report(OPEN)`. **Events** none. **Result** `{ received: true }` — the honest
  confirmation; the reporter is never told anything more (ADR-0011 d12). No XP either way.
- **Concurrency**: two filings by one reporter on one target → a partial unique index admits one; the
  loser gets `already_reported` and the winner is untouched. The slot is used for the target's
  lifetime, through any resolution (ADR-0011 d6). Filing vs resolution: ordered before, it joins the
  group and is resolved with it; ordered after, it opens a new group (a different reporter only).
  Filing vs Post removal or Student Removal: ordered before, it is included and `ACTIONED`; ordered
  after, `report_target_invalid`.
- **UI**: the report flow also offers a separate Block button; filing never creates a Block
  (ADR-0011 d13).

### 12.3 Groups (ADR-0011 d5–d6)

An **open group** is the `OPEN` rows for one target (one `post_id` or one `reported_student_id`) at
the reading transaction's serialization point. Derived, never stored; no case entity. One action
resolves the whole group.

### 12.4 Who sees which group — `GET /api/moderation/queue` (ADR-0011 d5–d7)

One `REPEATABLE READ READ ONLY` transaction; groups ordered by their oldest open row.

- **Peer Moderator** — only open groups whose target is a non-removed Post, and **the whole group is
  absent** if: the moderator authored the Post; or the moderator filed any open row in it; or a Block
  exists **in either direction** between the moderator and the Post's author or **any** open reporter
  (ADR-0008 d10 as widened, ADR-0011 d7). Each group shows the Post (body, author, origin, time), the
  count, and each row's reason, text and time — **never who filed it**. No resolved history.
- **Admin** — open groups for both target kinds, **except** a group targeting the Admin's own Student
  row or one of their Posts, and any group containing an open row the Admin filed (ADR-0011 d9). Each
  row shows its reporter. When no other Admin is eligible, the group simply waits.

### 12.5 Resolving a group

**`POST /api/moderation/post-groups/:postId/resolve`** `{ action: "REMOVE_POST" | "DISMISS" }` —
Peer Moderator or Admin.
**`POST /api/moderation/student-groups/:studentId/resolve`** `{ action: "ACTION" | "DISMISS" }` —
Admin only.

- **SSI tx** reads, **re-running authorization** (a stale queue grants nothing): the actor's current
  role and flags (else 403 / 401); the group's `OPEN` rows → none → `already_resolved`; the conflict
  guard of §12.4 for the actor's current role, **evaluated now** → `conflict_of_interest` with no
  mutation. For a Peer Moderator that includes every Block edge between the actor and the author and
  every open reporter; an Admin's guard is the self-interest one only, with no Block test (ADR-0008
  d10: Admins sit outside the participation graph). `checkpoint("moderation.resolve")`.
- **Persist**:
  - `REMOVE_POST`: `Post.removed_at = ctx.now` and every open row → `ACTIONED`;
  - `DISMISS`: every open row → `DISMISSED`;
  - `ACTION` (Student group): every open row → `ACTIONED` — no sanction is applied by this call;
    Suspension and Removal are Users-table actions (§12.7);
  - every resolved row gets the **same** `resolved_by_id = actor` and `resolved_at = ctx.now`.
- **Events** none; a removed Post leaves the feed on the next load.
- **Concurrency**: two resolutions of one group → the first commit wins; the other returns
  `already_resolved` and changes nothing — a losing `REMOVE_POST` never removes the Post, and a
  winning removal is never rewritten to `DISMISSED` (ADR-0011 d6). A Block created or removed
  concurrently with a Peer Moderator's action has one serial order: Block first → `conflict_of_interest`;
  action first → it commits and the later Block does not touch its attribution (ADR-0011 d7). A role
  change keeps the ordinary next-request boundary.
- **Remove Post exists only as this group action** (M25): every removal is attributed through
  `resolved_by_id`, and an Admin cannot bypass the own-complaint guard by removing a Post they
  reported.
- **Guard scope**: this guard and §12.4's hiding gate the queue read and these two resolution
  endpoints — not §12.7's sanctions. Remove Student action-resolves **every** open report on its
  target, a row the removing Admin filed included, attributed to that Admin (ADR-0011 d10,
  §12.7); §12.6 then governs who sees the batch.

### 12.6 Resolved audit — `GET /api/admin/reports/resolved?page` (Admin) (ADR-0011 d6, d8)

Resolution batches — rows sharing `(target, resolved_by_id, resolved_at, state)` — newest first, each
with the target (the Post body even if removed; the Student as `StudentRef`), the state, the resolver,
the time, and every row's reporter, reason, text and time. A batch targeting the viewing Admin or their
Post, or containing any row the viewing Admin filed, is hidden from that Admin. Peer Moderators have no
access.

### 12.7 Sanctions and roles — the Users-table actions (`ADMIN`)

Common reads in every action's SSI tx: the actor (`ADMIN`, Active); the target; `actor ≠ target` →
`self_action_forbidden`; target not Removed → `student_removed`; and, whenever the action can remove
an **active Admin** (role `ADMIN`, neither flag set) from that set, the count of active Admins, which
must stay ≥ 1 afterwards → `last_active_admin` (ADR-0008 d9).

| Action | Extra reads | Writes (one transaction) | After commit |
| --- | --- | --- | --- |
| **Change role** `{ role }` | — | `role` | none — effective on the target's next request |
| **Suspend** | not already Suspended → `already_suspended`; target's in-progress Matches | `suspended_at = now`; every `MATCHED`/`ACCEPTED` Match of the target → `TERMINATED_BY_ADMIN` (`declined_by_id` stays null); delete every Session of the target | `revokeSessions(target)` |
| **Reinstate** | Suspended → else `not_suspended` | `suspended_at = NULL`; nothing is revived | none |
| **Remove** | target's in-progress Matches; `Avatar`; open Reports whose `reported_student_id` is the target | `removed_at = now`; in-progress Matches → `TERMINATED_BY_ADMIN`; delete every Session; delete the `Avatar` row; every such open Report → `ACTIONED` with `resolved_by_id = actor`, `resolved_at = now` | `revokeSessions(target)` |

- **Suspension** is reversible and resolves no Report (ADR-0011 d10); Posts, avatar, Evidence, XP and
  Streak stay (Streak frozen by the close's skip). The other participant of a terminated Match becomes
  unmatched if still a candidate; only an Admin repairs it.
- **Removal** is final and view-only afterwards: the email stays burned, and Posts, Matches, Reviews,
  Private Feedback, Evidence, Direct Messages, Likes, Blocks, Reports, BadgeAwards and XP all stay,
  rendered as the tombstone (ADR-0008 d6–d7, ADR-0009 d6, ADR-0018 d3). A Student reaches it only by
  asking an Admin; there is no self-service deletion.
- **Removal's report side effect takes no own-report exclusion** (ADR-0011 d10): *every* open Report
  on the target — including one this Admin filed — commits `ACTIONED` with `resolved_by_id = actor`
  in the same transaction, one `resolved_at` for the batch. Afterwards §12.6 hides that batch from
  the removing Admin and shows it, with the attribution, to every other Admin. The §12.4 guard bars
  queue reads and group resolutions, never this sanction, so the two rules cannot collide.
- **Edits** (`PATCH`, Skills, Learning Goal, avatar) are allowed on Active and Suspended targets only,
  and never touch password, XP, Level, Streak, Badges or anything the Student wrote (ADR-0008 d8).
- **Concurrency**: two Admins demoting, suspending or removing each other cannot both succeed; a
  sanction vs a Review, a Round close or a Match creation involving the target has one serial order
  (§3.6.3).

### 12.8 Admin label

Wherever a `StudentRef` with `isAdmin: true` renders to another Student — profile, feed, search,
messages — the design system's `RoleLabel` shows "Admin". The Peer Moderator role is never shown to
other Students (ADR-0018 d4).

---

## 13. Learning Analytics — `GET /api/admin/analytics` and `/admin/analytics`

Admin only (a Peer Moderator gets 403). One `REPEATABLE READ READ ONLY` transaction. Nothing is stored
(ADR-0015 d5): no snapshot, aggregate table, materialised view, export, date range or per-Student
drill-down. **Always about the community, never a named Student** (ADR-0015 d9). No dedicated
Vitest category covers it: a read-only view over committed state fails loudly (wrong numbers on the
dashboard), so the closed list (ADR-0016 d7) needs no eleventh category for it.

### 13.1 Response (ADR-0015 d2)

```
{
  skills: {
    mostRequested: [{ skill, demand }],            // Demand > 0, Demand DESC, name ASC
    mostAvailable: [{ skill, supply }],            // Supply > 0, Supply DESC, name ASC
    gap:           [{ skill, demand, supply, gap }] // every Skill with Demand or Supply > 0, gap DESC, name ASC
  },
  insights: {
    gap:       [{ skill, demand, supply }],        // gap > 0, in gap order
    uncovered: [{ skill, demand, supply }]         // Demand > 0, Supply > 0, no MatchSkillCoverage row names it; gap order
  },
  completion: {
    overall:  { completed, total, rate | null },   // closed Rounds only
    perRound: [{ roundNumber, completed, total, rate | null }]  // every closed Round, opening order
  },
  outcomes: {
    closed: { COMPLETED, LAPSED, DECLINED, TERMINATED_BY_ADMIN },  // exactly the overall denominator
    open:   { roundNumber, MATCHED, ACCEPTED } | null              // current state of the open Round
  }
}
```

### 13.2 Definitions (ADR-0015 d2)

- **Candidate pool** = §8.1 evaluated now. **Demand(Skill)** = its `LEARN` rows of pool members;
  **Supply(Skill)** = its `TEACH` rows of pool members; **Gap** = Demand − Supply. A Skill at zero on
  both appears nowhere; there is no top-N (the catalogue is 27 Skills).
- **Completion rate** = `COMPLETED ÷ all Matches created in closed Rounds × 100` — declines and
  terminations included, the open Round excluded. Per closed Round, the same formula over that Round.
  **A zero denominator gives `rate: null`** and the UI shows no number and no point, never 0 % or 100 %;
  the Round keeps its place on the axis. Displayed rates round half up to a whole percent.
- **Match state and outcomes**: the open Round counts `MATCHED` and `ACCEPTED` only ("where Matches
  stand now"); closed Rounds count the four terminal statuses ("how Matches ended"). Both read `status`
  alone — no acceptance timestamp, no dwell time, no path, no funnel shape (ADR-0015 d2, d7).

### 13.3 The insight sentences (ADR-0015 d3)

For each `insights.gap` row: *"{demand} Students want to learn {Skill}; nobody lists it as a Skill
they can teach."* when Supply is 0, else *"{demand} Students want to learn {Skill}; only {supply} can
teach it."* For each `insights.uncovered` row: *"{Skill} is wanted by {demand} and offered by
{supply}, but no Match has ever covered it."*

### 13.4 Charts and refresh (ADR-0015 d4, d7, d8)

Recharts: bar charts for most requested, most available and the gap (negative gaps below the axis);
a bar chart for the open-Round state; a bar chart for closed outcomes; the per-Round completion rate
on a Round-number axis with `connectNulls={false}`. No axis is a date. The page loads on mount and
**re-queries on `round:opened` and `round:closed`**, reading nothing from their payloads; between
those events every figure is as of the last load and refreshes on reload. No other event is added.

---

## 14. Seed and demo (ADR-0017)

### 14.1 Where it lives and how it runs

- Entry `prisma/seed/main.ts`; seed-only modules in `prisma/seed/`; the two seeded files in
  `prisma/seed/assets/`; the fixture in `prisma/fixtures/cohort.ts` (M15). Compiled with the API build
  (it needs NestJS decorator metadata) to `dist/prisma/seed/main.js`, which `prisma.config.ts`
  registers as `migrations.seed`.
- Runs on **every boot, on both paths**, after `migrate deploy` (§15.5); `make seed` re-runs it.
- It boots `NestFactory.createApplicationContext(SeedModule)` — the application's own modules, a
  no-op `RealtimePublisher` — and **drives the real write paths**: every step below is one call to a
  service method from §§5–12 (with a constructed `Actor` where it takes one, §3.4), each its own SSI
  transaction (M28). No
  application API exists for the seed.
- **Inserted directly, and nothing else**: the 27 `Skill` rows; the bootstrap Admin (`ADMIN_EMAIL`,
  `ADMIN_PASSWORD`, display name *PeerConnect Admin*, role `ADMIN`, no Skills) and the bootstrap Peer
  Moderator (`MODERATOR_EMAIL`, `MODERATOR_PASSWORD`, display name *Yara*, role `PEER_MODERATOR`),
  hashed with the application's own hash function. XP, Level, `BadgeAward`, Streak, Match status,
  `MatchSkillCoverage`, Report state and a Friendship's deletion by a Block are **never** written
  directly.

### 14.2 The fixture module (ADR-0016 d3)

`SKILLS`, `RARE_SKILLS`, `NAMES`, `levelOf`, `mulberry32` and `generateCohort` are copied from the
prototype's `COHORT GENERATOR` block. The returned objects may drop `mentorReputation` and
`timesMentor`, **but every random draw stays, in the same order**, so `generateCohort({ size: 20,
seed: 42 })` reproduces the prototype's measured cohort exactly. The fixture owns generation only;
everything that reaches the database is the seed's. The prototype's hand-built cohorts (`COHORTS`)
are **not** fixture content: category 1's one use of `starvation` copies its four literal Students
into `test/01-matcher/` (§16.3), leaving ADR-0016 d3's module list as it is.

### 14.3 The cohort (ADR-0017 d3)

- `generateCohort({ size: 30, seed: 42, unmatchable: 1 })`. Position *p* = 0…29.
- Display name `NAMES[p mod 24]`, with a suffix " 2" for *p* ≥ 24; email
  `<NAMES[p mod 24] lower-cased>.<p+1, two digits>@peerconnect.test` (e.g. `karim.01@peerconnect.test`); password
  `SEED_STUDENT_PASSWORD`. Created through `auth.signup` **strictly in position order**; the seed
  then asserts that `Student.id` order equals position order (the lower-id tie-breaks depend on it).
- Generator XP is ignored; everyone starts at 0 XP (ADR-0017 d3).
- **Gap Skill `G` = "Valgrind"**: removed from every generated list; added to position 1's `TEACH`
  list (*X*) and position 2's `LEARN` list (*Y*); a generated Learning Goal on `G` is dropped.
- Skill lists through `students.setSkills`; each generated Learning Goal still on its `LEARN` list
  through `students.setLearningGoal` with the sentence *"I want to get comfortable with {Skill} for my
  next project."*
- The Peer Moderator's lists are `generateCohort({ size: 1, seed: 4242 })[0]`'s, with `G` removed; no
  Learning Goal.
- **Reserved positions** — 0 (the `unmatchable` Student, whose `RARE_SKILLS` wants are the plain gap),
  1 (*X*) and 2 (*Y*) — are never suspended, removed, the demo Student, or a party to any fixture
  other than *X*'s Block of *Y* (friendship, the *P*/*Q* Block, message thread or report), so they
  stay Active candidates.

### 14.4 Order (ADR-0017 d2's order contract)

1. Catalogue; bootstrap Admin and Peer Moderator; the thirty sign-ups, lists and Goals; the Peer
   Moderator's lists.
2. **Before Round 1**: *X* Blocks *Y* (`social.block` as *X*).
3. Publish Prompt 1.
4. Rounds 1–4, each by §14.5.
5. After Round 4's close: the social graph (§14.6), Likes, Direct Messages, the report fixtures (§14.7).
6. Publish Prompt 4. End-state assertions (§14.8). Completion record (§14.9).

The four Prompts are the proposal's own examples, in order: *Describe how you handled a conflict at
work or in a team project.* · *What is a mistake that taught you something important?* · *What is one
piece of advice you'd give a first-year student?* · *What technology are you currently learning, and
why?*

### 14.5 The per-Round script (ADR-0017 d2, d4)

Let `M[0..n−1]` be the matcher's Matches in selection order.

| Step | Round 1 | Round 2 | Round 3 | Round 4 |
| --- | --- | --- | --- | --- |
| a. open (Admin); publish | — | Prompt 2 after open | Prompt 3 after open | — |
| b. Prompt answers | P1 by *p* mod 5 ≠ 0, and the Peer Moderator | P2 by *p* mod 5 ≠ 1, and the Peer Moderator | P3 by *p* mod 5 ≠ 2 with *p* even, and the Peer Moderator | P3 by *p* mod 5 ≠ 2 with *p* odd |
| c. declines | `M[0]` by its Mentee; `M[1]` by its Mentor | `M[0]` by its Mentee | `M[0]` by its Mentee; `M[1]` by its Mentor | `M[0]` by its Mentor |
| d. hand-made repair (Admin) | one Student of `M[0]` with one of `M[1]` | — | one Student of `M[0]` with one of `M[1]` | — |
| e. Suspension (Admin) | — | — | *S* | — |
| f. Removal (Admin) | — | — | — | *R*, after its prerequisites |
| g. lapses | `M[n−1]`, `M[n−2]` | same | same | same |
| h. every other Match | both accept; the Mentee reviews | same | same | same |
| i. close (Admin) | ✓ | ✓ | ✓ | ✓ |

- **Answers** skip anyone Suspended or Removed at that moment. Students with *p* mod 5 ∈ {3, 4} and
  the Peer Moderator answer all three and earn Knowledge Sharer.
- **Repairs** try, in order, (`M[0]`.Mentee, `M[1]`.Mentor), (`M[0]`.Mentor, `M[1]`.Mentee),
  (`M[0]`.Mentee, `M[1]`.Mentee), (`M[0]`.Mentor, `M[1]`.Mentor) and keep the first the hand-made
  service accepts (it refuses a blocked pair); none accepted → the seed fails. Both accept, the
  Mentee reviews: both repairs complete (ADR-0017 d4).
- ***S*** = the Mentee of the first `M[k]`, *k* ≥ 2 and not a lapse index, whose Mentee is neither the
  Peer Moderator nor at a reserved position; suspended before either side accepts, so that Match
  becomes `TERMINATED_BY_ADMIN`. *S* stays suspended.
- ***R*** = the first participant (Mentee before Mentor) of `M[k]`, *k* ≥ 1 and not a lapse index, who
  is not the Peer Moderator, not reserved, not *S*, and holds a `COMPLETED` Match as Mentee from Rounds
  1–3. Before anyone in that Match accepts: *R* uploads `assets/avatar.png` through the avatar path and
  `assets/evidence.pdf` as Evidence on *R*'s earliest Review; then the Admin removes *R*, terminating
  that Match.
- **Lapses**: `M[n−1]` — both accept, no Review; `M[n−2]` — only the Mentor accepts. Both become
  `LAPSED` at close.
- **Reviews** (step h and repairs), with *k* the 0-based submission order: *learned* = *"How {first
  FORWARD Skill} works in practice."*; *can now do* = *"I can use {first FORWARD Skill} on my own
  project."*; Private Feedback *"Very useful — we covered {Skill} end to end."* / *"Clear
  explanations; more worked examples would help."*; rating `[5, 4, 5, 3, null, 4, 5, 2][k mod 8]`;
  Takeaway *"Learned {Skill} with a peer this Round."* ({Skill} = *"a new topic"* when FORWARD is
  empty). Prompt answers are fixed sentences in the seed module chosen by position; their wording
  carries no rule.
- **Target** with 15 matcher Matches a Round: Round 1 = 11 completed + 2 lapsed + 2 declined (+1
  repair completed); Round 2 = 12 + 2 + 1; Round 3 = 10 + 2 + 2 + 1 terminated (+1 repair); Round 4 =
  11 + 2 + 1 + 1 terminated. **Totals 62: 46 `COMPLETED`, 8 `LAPSED`, 6 `DECLINED`, 2
  `TERMINATED_BY_ADMIN`; completion 74 %.** The pool is 31 (thirty plus the Peer Moderator) at the
  open of Rounds 1–3 — 30 for the rest of Round 3 after *S*'s suspension inside it — and 30 in
  Round 4. **These are targets the deterministic run confirms, never counts the seed
  forces**: no Match is added to reach 15. The seed logs the actual distribution; if the first run
  differs, ADR-0017 d4's table and the 74 % are corrected from it (a record update, not a code change).

### 14.6 Social graph, Likes, Direct Messages (ADR-0017 d9)

- **Demo Student *D*** = the first Active `STUDENT` by position, outside the reserved positions,
  satisfying §14.8 check 3. "Eligible" below = Active `STUDENT`s other than *D*, *S*, *R* and the
  reserved positions, in position order: 30 − 3 reserved − *D*, *S*, *R* = **24**. The social graph
  and message threads below take 23 of the 24, each once; the one remaining eligible Student takes
  no graph or thread part and stays available to the report fixtures, which reselect from the start
  of the order.
- **Accepted Friendships** (request, then accept): *D* with the next six eligible; then six pairs among
  the next twelve.
- **A Block that ends a Friendship**: the next two eligible, *P* and *Q* — *P* requests, *Q* accepts, *P*
  blocks *Q*.
- **Two pending requests into *D*'s inbox** from the next two eligible.
- Result: twelve accepted Friendships, two pending, two Blocks (*X*→*Y*, *P*→*Q*).
- **Likes**: seeded Posts in creation order, *k* = 0, 1, …: liked by the first (*k* mod 7) Active
  Students by position other than the author.
- **Direct Messages**: thread A between *D* and *D*'s first Friend, four alternating messages, both
  marked read; thread B between *D* and the next eligible Student who is neither *D*'s Friend nor in a
  Block with *D*: one from *D*, two to *D*; the other side marks read, *D* does not — two unread for *D*.

### 14.7 Report fixtures (ADR-0017 d7)

Three fixture groups comprising four Report rows. Parties are eligible Students (§14.6; never the bootstrap Admin, the Peer Moderator, *D*, *S*, *R* or a
reserved position), taken again **from the start** of the eligible order, so a social-graph party may
also be a report party: the graph and threads have already used 23 of the 24, and these fixtures
need seven party-slots, filled by reuse. Each party-slot takes the first eligible Student, in position order, not already a
party to the same fixture; a Post author is the first such Student with a Prompt-answer Post not
used by an earlier fixture.
The Peer Moderator is in no Block, so no party is in a Block with them, and nothing is filed by or
about the Admin.

1. **Grouped open Post reports**: the first Prompt-answer Post by an eligible author; two different
   eligible reporters, reasons `SPAM` and `INAPPROPRIATE_CONTENT`, each with a short text.
2. **Open Student report**: an eligible target, a different eligible reporter, `HARASSMENT`, with text.
   Never the Student this seed removes.
3. **Resolved**: another eligible author's Prompt-answer Post, one eligible reporter, `OTHER`; the
   **Peer Moderator dismisses** it through §12.5, so the Admin's resolved audit shows a moderator's
   dismissal, attributed (ADR-0011 d8).

### 14.8 End-state assertions (all, or the seed fails)

1. No open Round; exactly four closed Rounds; exactly four Prompts; the live one is Prompt 4.
2. The Match status distribution is logged against the §14.5 targets (reported, not asserted).
3. **Demo Student**: *D* exists — Active, `STUDENT`, a `COMPLETED` Match as Mentee with its Review, at
   least one `BadgeAward`, Streak ≥ 3 after Round 4's close, and at least one Private Feedback received
   as Mentor with a non-null rating. Its email is logged.
4. At least three distinct non-null ratings among seeded Private Feedback.
5. *S* is Suspended and not Removed. *R* is Removed, has no `Avatar` row, keeps its email, and has
   Evidence on a Review it wrote as Mentee whose Private Feedback exists.
6. Through the moderation service's own reads: the Peer Moderator's queue shows the two-report Post
   group with no reporter identity; the Admin's open queue shows the Student report; the Admin's
   resolved audit shows the dismissed batch.
7. **Plain gap**: a `RARE_SKILLS` Skill has Demand > 0 and Supply = 0.
8. **Stronger gap**: `G` has Demand > 0, Supply > 0, no `MatchSkillCoverage` row names it, and no Match
   joins *X* and *Y* (the blocked-pair condition of #27).
9. Each of the three Badges is held by at least one Active Student.

### 14.9 Idempotence and failure (M14)

- **Completion record**: `COMMENT ON DATABASE <current database> IS
  'peerconnect:seed:complete:fixture-v<N>'`, written as the very last statement, only after every
  assertion passed. It lives in the database's own catalogue, so it survives restarts and dies with the
  volume, and it is outside every Prisma model. `<N>` is the fixture version, bumped by any PR that
  changes the fixture.
- **At start** the seed reads it (`SELECT shobj_description(oid, 'pg_database') FROM pg_database
  WHERE datname = current_database()`):
  - a marker and **every domain table empty** → the marker is stale: the schema was reset under a
    surviving database, as `prisma migrate reset` or `migrate dev`'s reset prompt does (Prisma's
    PostgreSQL reset drops and recreates the schema, not the database, so a database comment
    survives it) → run from step 1, which rewrites the marker;
  - otherwise, a marker for the **current** version → log *seed already complete*, exit 0;
  - otherwise, a marker for an **older** version → log a warning naming `make wipe`, exit 0 — a
    completed seed never runs again, including over Rounds a demo added (ADR-0017 d10);
  - **no marker and every domain table empty** → run;
  - **no marker and any domain table non-empty** → the previous attempt failed: `TRUNCATE` the nineteen
    domain tables in one statement (never `_prisma_migrations`), then run from step 1.
- **Why truncation is safe**: the API serves only after the seed has completed (§15.5), so a database
  without a marker can hold nothing but a failed attempt's rows.
- **Failure is loud**: any refusal, error or failed assertion logs the step and reason and exits 1, the
  `api` container stops, and `docker compose up` reports the dependency failure. The next boot
  truncates and retries.
- Identical on `make up` and bare Compose; no Makefile target, flag or second command is involved.

### 14.10 Not seeded, and accepted

Presence (two live browsers are needed to show online status, ADR-0017 d11); Missions (assigned by
construction); avatars other than *R*'s; Level spread (Levels run 1–3, so the Level term in selection
priority never fires on stage — accepted, not "fixed" by seeding XP).

---

## 15. Deployment and configuration

### 15.1 Services

| Service | Build / image | Ports | Depends on | Healthcheck | Restart |
| --- | --- | --- | --- | --- | --- |
| `db` | `postgres:17-alpine`, command `postgres -c log_error_verbosity=terse -c log_min_error_statement=panic`; named volume `db-data` | none | — | `pg_isready -h 127.0.0.1 -U "$${POSTGRES_USER}" -d "$${POSTGRES_DB}"` — over TCP, because on first boot the image's init server listens on the Unix socket only (`listen_addresses=''`) and would pass a socket check before `api` can connect | default (no) |
| `api` | context `.`, `dockerfile: Dockerfile`, target `runtime` (base) / `dev` (overlay) | none | `db: service_healthy` | `wget -qO- http://127.0.0.1:3000/api/health`, interval 5 s, `start_period` 180 s | **no** — a failed boot stays failed and visible |
| `proxy` | context `.`, `dockerfile: proxy/Dockerfile`, target `runtime` / `dev` | base `127.0.0.1:${HTTPS_PORT:-8443}:8443`, `127.0.0.1:${HTTP_PORT:-8080}:8080`; overlay `!override` → `127.0.0.1:8081:8081` | `api: service_healthy` | — | default |

Every service has `logging: *pc-logging` (a top-level `x-logging` anchor: `driver: json-file`,
`options: { max-size: "10m", max-file: "3" }`, M12). Every service with container configuration
loads `env_file: [{ path: .env.example, required: true }, { path: .env, required: false }]` in that
order (ADR-0004 d8). The base file declares `name: peerconnect`. No fourth service exists on either
path. **Both images build from the repository root as their build context** (`context: .` with the
`dockerfile` paths in the table), so files outside an image's own directory — `proxy/` included —
stay in scope on a fresh clone's build, and the `dev` targets are chosen the same way.

### 15.2 The two paths

- **Base** (`make up` / `docker compose up --build`): `https://localhost:8443`, `PUBLIC_ORIGIN =
  https://localhost:8443`, `NODE_ENV = production`; the proxy serves the built bundle over TLS, `wss`
  socket; port 8080 only redirects (`return 301 ${PUBLIC_ORIGIN}$request_uri`).
- **Dev overlay** (`make dev`, which is `docker compose -f compose.yaml -f compose.dev.yaml up
  --build`): overrides only (ADR-0004 d4). `proxy` builds target `dev` (no bundle, no TLS), publishes
  `!override` `127.0.0.1:8081:8081`, gains `extra_hosts: ["host.docker.internal:host-gateway"]`, and
  proxies `/` and the HMR upgrade to `host.docker.internal:5173`; `api` builds target `dev`,
  bind-mounts `.:/app` with an anonymous `/app/node_modules`, runs `prisma generate` → `nest build` →
  migrate → seed → `nest start --watch`; both get `environment: { PUBLIC_ORIGIN:
  "http://localhost:8081", NODE_ENV: development }`. The overlay's `!override` tag exists only from
  Compose **2.24.4** — the first docker/compose release carrying compose-go's `!override` support —
  so that, not 2.24.0, is the toolchain floor (§3.3, §17.5).
- **Host Vite** (not a Compose service, not started by `make dev`): `npm --prefix web run dev --
  --host <verified host-side bridge address> --port 5173 --strictPort`, with `server.hmr.clientPort =
  8081` and `server.fs.allow` including the repository root (for `docs/legal/`). The README states
  the bind command, how the address was verified, and that nginx-to-Vite HTTP/HMR works while Vite is
  not reachable from the LAN; no silent `0.0.0.0` (ADR-0004 d4).
- **Localhost only** on both paths: every published port binds `127.0.0.1` (ADR-0004 d5, d7).

### 15.3 Proxy configuration files (what they must contain)

- `proxy/nginx.conf` replaces the image's own: the logging directives of §3.9 verbatim, `map
  $http_upgrade $connection_upgrade { default upgrade; "" close; }`, `upstream peerconnect_api {
  server api:3000; }`, `server_tokens off;`, `include /etc/nginx/conf.d/*.conf;`.
- `proxy/snippets/api.conf` (included by every server block and by the test harness; it contains no
  `include` of its own):
  - `location /api/` → `client_max_body_size 1m; proxy_pass http://peerconnect_api;`;
  - `location ~ ^/api/(me/avatar|admin/students/[0-9a-f-]+/avatar|reviews/[0-9a-f-]+/evidence)$` →
    `client_max_body_size 6m;` and the same `proxy_pass`;
  - `location /socket.io/` → `proxy_pass`, `proxy_http_version 1.1`, `Upgrade`/`Connection` from the
    map, `proxy_read_timeout 1h`;
  - in each: `proxy_set_header Host $host; X-Real-IP $remote_addr; X-Forwarded-For $remote_addr;
    X-Forwarded-Proto $scheme;` — and **no** directive that sets or clears `Origin`.
- `proxy/templates/default.conf.template` (envsubst by the image's entrypoint, `PUBLIC_ORIGIN` only):
  the 8080 redirect server; the 8443 `ssl` server (`http2 on`, the build-time certificate and key),
  `include` of the snippet, and `location / { try_files $uri /index.html; add_header
  Content-Security-Policy "…" always; }` (§3.10).
- `proxy/templates-dev/default.conf.template`: one `listen 8081` server with the snippet and `location
  /` proxied to Vite with the upgrade headers; no CSP.
- **TLS** at image build: `openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes
  -days 825 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`. The key exists
  only in the local image, never in the repository; the image is never published (ADR-0004 d6).

### 15.4 Environment (the fifteen entries, ADR-0004 d9) and duplicated sources (M29)

`.env.example`, committed, begins with a header comment: *these are development defaults for a local,
throwaway copy; change the staff and seed passwords and the database password for any shared use;
the OAuth pair ships empty and the platform works without it; copy to `.env` to override locally.*

| Entry | Default | Read by | Notes |
| --- | --- | --- | --- |
| `POSTGRES_USER` | `peerconnect` | db (first boot), api (consistency check) | |
| `POSTGRES_PASSWORD` | `peerconnect-dev-password` | db (first boot), api (check) | |
| `POSTGRES_DB` | `peerconnect` | db (first boot), api (check) | |
| `DATABASE_URL` | `postgresql://peerconnect:peerconnect-dev-password@db:5432/peerconnect` | api, Prisma CLI, seed | the only connection source the application uses |
| `NODE_ENV` | `production` | api | overlay sets `development` |
| `PUBLIC_ORIGIN` | `https://localhost:8443` | api, proxy template | overlay sets `http://localhost:8081` |
| `HTTPS_PORT` | `8443` | Compose interpolation (default `8443`), api (check) | |
| `HTTP_PORT` | `8080` | Compose interpolation (default `8080`) | |
| `ADMIN_EMAIL` | `admin@peerconnect.test` | seed | |
| `ADMIN_PASSWORD` | `change-me-admin` | seed | |
| `FT_OAUTH_CLIENT_ID` | *(empty)* | api | 42 dashboard label **UID** |
| `FT_OAUTH_CLIENT_SECRET` | *(empty)* | api | 42 dashboard label **SECRET** |
| `MODERATOR_EMAIL` | `moderator@peerconnect.test` | seed | |
| `MODERATOR_PASSWORD` | `change-me-moderator` | seed | |
| `SEED_STUDENT_PASSWORD` | `change-me-student` | seed | shared by the thirty seeded Students |

- **No other entry**: no `SESSION_SECRET` (ADR-0004 d10), no callback URL, no test database URL (the
  suite derives it, §16.2), no feature flag.
- **Only `HTTPS_PORT` and `HTTP_PORT` are interpolated by Compose**, each with a Compose-level default
  equal to its `.env.example` value; everything else reaches containers through `env_file`, so bare
  Compose works with no `.env` (ADR-0004 d8).
- **Boot validation** (shared by `src/main.ts` and the seed entry; failure → one message naming the
  variable, never its value, exit 1): the required entries are non-empty (all but the OAuth pair);
  `PUBLIC_ORIGIN` is a bare origin; the staff and seed passwords satisfy the password policy.
- **Duplicated sources, resolved by checks rather than new entries**:
  - `DATABASE_URL`'s user, password and database must equal `POSTGRES_USER`, `POSTGRES_PASSWORD` and
    `POSTGRES_DB`, else the api fails at boot telling the operator to change both together — and to run
    `make wipe` if the database was already initialised, because Postgres applies `POSTGRES_*` only to
    an empty data directory.
  - When `PUBLIC_ORIGIN` is `https:`, its port must equal `HTTPS_PORT`.
  - `compose.yaml`'s interpolation defaults must equal `.env.example`'s port values, and the overlay's
    `PUBLIC_ORIGIN` literal must match its published port; the reviewer checks them together.

### 15.5 Boot sequence (ADR-0004 d11)

1. `db` becomes healthy.
2. `api` runtime command: `npx prisma migrate deploy --config prisma.config.ts && npx prisma db seed
   --config prisma.config.ts && exec node dist/src/main.js`. The seed validates the environment first.
3. `main.js` validates the environment, then listens; `/api/health` answers; `proxy` starts.
4. Any failure stops the chain; `api` exits non-zero and is not restarted; `proxy` never starts;
   `docker compose up` reports it. **The API never serves before the seed has completed**, which is what
   makes §14.9's truncation safe.

`prisma.config.ts` imports `dotenv/config`, sets `schema: "prisma/schema.prisma"`, `migrations: {
path: "prisma/migrations", seed: "node dist/prisma/seed/main.js" }` and `datasource: { url:
process.env.DATABASE_URL }`. **Every Prisma CLI invocation — boot, Makefile, CI, docs — passes
`--config prisma.config.ts`** (M16), so no pinned invocation can load another Config. Pinning does
not stop an unpinned run — an editor extension, a developer's bare `npx prisma` — from discovering
one, which is why §3.2 forbids the files themselves and the gate reads them off the file list; the
two layers are meant together. `dotenv` is therefore a runtime dependency too: the runtime image's
Prisma CLI loads `prisma.config.ts`, which imports it.

### 15.6 Makefile (convenience only; ADR-0004 d8)

| Target | Command |
| --- | --- |
| `up` | `env`, then `docker compose up --build` |
| `dev` | `env`, then `docker compose -f compose.yaml -f compose.dev.yaml up --build` |
| `down` | `docker compose down` (keeps the volume) |
| `wipe` | `docker compose down --volumes --remove-orphans` (M20) |
| `seed` | `docker compose exec api npx prisma db seed --config prisma.config.ts` |
| `test` | `docker compose -f compose.yaml -f compose.dev.yaml run --rm api npx vitest run` |
| `logs` | `docker compose logs -f` |
| `env` | copy `.env.example` to `.env` when absent |

Every target's full command is also in the README. Bare `docker compose up --build` needs none of them.

Prisma commands a developer runs by hand (`migrate dev`, `generate`, `db seed`) run inside the dev
overlay's `api` container, because `db` publishes no port and `DATABASE_URL` names the Compose host
`db`; the bind mount puts the generated migration and client back in the working tree. They are
pinned like every other invocation, e.g. `docker compose -f compose.yaml -f compose.dev.yaml exec api
npx prisma migrate dev --config prisma.config.ts --name <slice>_<change>`. `CONTRIBUTING.md` →
*Schema changes* carries the same commands.

### 15.7 Pre-defense checklist (ADR-0004 Consequences, ADR-0016 d5)

Both boot paths, each from its own fresh clone **and an empty database** (§16.5); expect the certificate
interstitial; confirm the console is clean in Chrome, Firefox and Brave after accepting it.

---

## 16. Testing, CI and the clean boot (ADR-0016)

### 16.1 Principles

Test only what fails silently; everything else fails loudly and the demo is its detector. One level:
integration tests against a real Postgres. **The ten categories are closed**; an eleventh needs the
*does it fail silently?* argument. Tests assert outcomes, never a PostgreSQL technique. No coverage
target; roughly 20–40 tests. Vitest is the one runner; the API side builds tests with `unplugin-swc`
for decorator metadata. **`npx vitest run` is the command** the Done box names.

### 16.2 Where the suite runs (M18)

- **Locally** (the Done box's run): `make test` runs `npx vitest run` in a fresh `api` dev container on
  the Compose network, beside the running `db`. That container has the dev dependencies, the
  bind-mounted repository and an `nginx` binary (installed in the Dockerfile's `dev` target only).
- **The harness** (`test/harness/`):
  - global setup derives the test database name `<database of DATABASE_URL>_test`, drops and recreates
    it (`DROP DATABASE … WITH (FORCE)`), runs `npx prisma generate --config prisma.config.ts` first —
    the client is gitignored (§3.2), a fresh clone has none, so nothing may import it before it exists,
    and this is what lets `make test` run on a fresh clone — then `npx prisma migrate deploy
    --config prisma.config.ts` against it; the development database is never touched;
  - each test file boots the real `AppModule` in-process against the test database on an ephemeral
    port, with a recording `RealtimePublisher` (the socket category boots the real gateway);
  - tables are truncated between tests; `fileParallelism: false`;
  - **the nginx harness** starts the `nginx` binary with a generated configuration that carries, at
    `http` scope, `map $http_upgrade $connection_upgrade { default upgrade; "" close; }` — the
    snippet's `/socket.io/` location reads `$connection_upgrade` (§15.3) and nginx refuses a config
    containing an undefined variable — then `upstream peerconnect_api { server 127.0.0.1:<app port>; }`
    and one server on an ephemeral loopback port that includes the repository's own
    `proxy/snippets/api.conf`, so uploads cross the production directives. Only the harness config is
    generated; production `proxy/nginx.conf` already defines the map (§15.3) and is untouched here. A
    missing `nginx` binary **fails** the suite; nothing is skipped;
  - **client address**: with nothing in front of the in-process app, every request the harness sends
    carries an explicit `X-Real-IP` (one fixed address per test; varied only where a test asserts the
    throttle), so §5.5's key is deterministic. This is **test-only** injection — production keeps nginx
    as the sole writer of `X-Real-IP` and the API still trusts no other source (§5.5, ADR-0003 d10);
  - `checkpoint` is bound to a barrier registry (§3.6.4).
- **In CI**: the same `npx vitest run` on the runner, with a `postgres:17-alpine` service container and
  `nginx` installed from the distribution. No Compose, no image build (ADR-0016 d8). Postgres is never
  published to the developer's host.
- The suite never runs the seed; the seed has its own checks (§16.4, §14.8).

### 16.3 The ten categories — files and exact assertions (M19)

Files live at `test/<NN>-<category>/*.test.ts`.

| # | Directory | Seam | Assertions |
| --- | --- | --- | --- |
| 1 | `01-matcher` | pure engine + services + DB | Over `generateCohort({ size: 20, seed: 42 })` and six Rounds with every Match accepted and reviewed through the services: **C3** every Match has ≥ 1 FORWARD row; **C4** every stored Score equals §8.2 recomputed from its coverage and goal flag, and its explanation names a FORWARD Skill; **C6** two runs on fresh databases with the same action log give identical sequences of (mentor position, mentee position, Score, Mission, coverage); **C7** no Match below 25. The five half-values round up. **No-repeats**: a pair with a prior `DECLINED`, and one with `TERMINATED_BY_ADMIN`, is never proposed, while a hand-made Match may pair it; a blocked pair is never proposed and a hand-made Match refuses it. Most-constrained-first picks the constrained Student first on the prototype's `starvation` cohort. C1, C2, C5 are **not** asserted. |
| 2 | `02-migrations` | SQL on the migrated test DB | Each of the eight raw objects and both Report partial uniques exists by name with its definition (catalog queries); each CHECK rejects a violating row; `friendship_unordered_pair` rejects the reversed duplicate; `round_single_open` rejects a second open Round; `match_pair_history` exists and is non-unique. |
| 3 | `03-standing-match` | services + checkpoint | Two concurrent hand-made creations sharing a Student, both held after their reads, admit exactly one Match; the other returns `already_matched` and writes nothing. |
| 4 | `04-file-access` | HTTP | Evidence URL signed out → 401; signed in as an unrelated Student → 403; the pair and an Admin → 200. Avatar signed out → 401, any signed-in → 200. |
| 5 | `05-socket-origin` | real Socket.IO server + client, real session | Exact `PUBLIC_ORIGIN` connects; absent, `null` and mismatched `Origin` are refused with the session row still present; an HTTP long-polling request is refused; a good origin with no session gets `unauthorized`. |
| 6 | `06-prompt-serialization` | services + checkpoint | Publication vs answer in both orders (old answer committed or refused with nothing written); two publications with an identical injected `published_at` get distinct orders and exactly one live Prompt; answer vs close in both orders (`answer_round_id` and the close's Streak agree with the order); duplicate and retried answers → one Post, one +20, Knowledge Sharer once; the answer transaction never writes `streak`; an unreviewed Match plus an answer in the Round increments Streak, no activity resets it, Suspended and Removed are skipped. |
| 7 | `07-lifecycle-lockout` | services + checkpoint | The candidate predicate excludes `ADMIN`, Suspended, Removed and Skill-less Students; role, Suspension and Removal vs Round open and vs hand-made creation, both orders; hand-made creation vs close, both orders — never a Match in a closed Round; Block vs friend request, both orders — never a Block beside a Friendship row; a Removed row refuses every mutation and its email refuses sign-up; two Admins demoting, suspending or removing each other leave ≥ 1 active Admin. |
| 8 | `08-files` | HTTP **through the nginx harness** | Exactly 5,242,880-byte PDF, PNG and JPEG Evidence and a 2,097,152-byte Avatar reach the API and are stored; one byte more → `file_too_large` from the API's §9.5 size check (`size > cap`), not an nginx 413; malformed, truncated, extension-spoofed, `Content-Type`-spoofed and Avatar-PDF payloads are refused; Evidence reads anchor to the owning Review's Match (a Student paired with the uploader in another Match → 403; a Peer Moderator outside the pair → 403; inside it → 200); only the originating Mentee mutates (Mentor, an Admin outside the pair → 403), including after `COMPLETED` and including a Mentee promoted to `ADMIN` after the Review (→ 200); Suspension blocks mutation and keeps the row, reinstatement restores, Removal ends mutation and keeps the row; a failed replacement leaves the old bytes; a missing or wrong `Origin` or `X-PeerConnect-CSRF` → 403 before any parsing. |
| 9 | `09-review-xp-badges` | services + checkpoint | A duplicate or retried Review → one Review, Private Feedback, Post and XP payment; Review vs close, Decline, Suspension and Removal, both orders; a Match created before promotion completes with 80/120 XP and First Mentor, the Admin's Level and Badge still on the profile and absent only from the Leaderboard and its pin; a Review and a Prompt answer paying one Student concurrently both land; **same-Badge contention, as §10.4 shows it can occur**: a Student with two answers answers Prompt *n* (held after its reads) while Prompt *n+1* is published and answered by them (held). Released in either order, or together, the answer to Prompt *n* is refused `prompt_not_live` and writes nothing (no Post, no XP). The answer to Prompt *n+1* commits one Post, +20 XP and exactly one Knowledge Sharer, so the threshold is still crossed once. The test never asserts two Posts or +40, which no serial order admits; Suspension or Removal vs close with prior qualifying activity, both orders; the pin never reintroduces an Admin, Suspended or Removed viewer. |
| 10 | `10-reports` | services + HTTP | The two partial uniques and the Report CHECKs; two concurrent filings by one reporter on one target → one row and `already_reported`, winner unchanged; two concurrent resolutions → one winner, `already_resolved`, a losing removal leaves the Post; every row of a batch shares state, resolver and time; filing vs resolution and vs target Removal, both orders; Remove Post and Remove Student action their open rows atomically — Remove Student includes an open row the removing Admin personally filed, `ACTIONED` with `resolved_by_id` = that Admin, the batch then hidden from that Admin's own resolved audit and visible to another Admin with reporters — Suspension leaves them open; a Peer Moderator sees only eligible open Post groups with no reporter identity and no resolved history, and one conflicting open reporter hides the whole group; an Admin cannot read or resolve their own-target group or any open group or resolved batch containing their own report, while another Admin can, with reporters; a stale queue read followed by demotion is refused on action; a Block create/remove racing a Peer Moderator action, both orders. |

### 16.4 CI — one advisory workflow (ADR-0016 d8, M21)

`.github/workflows/ci.yml`, on every pull request:

1. Check out; set up Node 22; `npm ci`; `npm --prefix web ci`.
2. Load `.env.example` into the job environment, with `DATABASE_URL` pointed at the service container.
   The `postgres:17-alpine` service is started with `.env.example`'s own `POSTGRES_USER`,
   `POSTGRES_PASSWORD` and `POSTGRES_DB`, and only `DATABASE_URL`'s host and port change (to the
   runner's mapped `localhost` port). Any other credentials would fail §15.4's consistency check when
   the seed validates the environment at step 5.
3. `npx prisma generate --config prisma.config.ts`; typecheck the API and the SPA; `npx nest build`.
4. **Schema from empty**: `npx prisma migrate deploy --config prisma.config.ts` on the empty service
   database.
5. **Seed from empty**: `npx prisma db seed --config prisma.config.ts` — the whole fixture through the
   real write paths, ending with §14.8's assertions; any failure fails the step.
6. **Seed idempotence**: run the seed again; it must log *already complete* and exit 0.
7. Install `nginx`; `npx vitest run` (the suite uses its own `_test` database).

It stays advisory: branch protection is available on this plan and not enabled; making the workflow a
required check is an open governance decision (#28, ADR-0005 d7). The Compose boot is not in CI.

### 16.5 Clean-clone boot verification (ADR-0004 d8, ADR-0016 d5)

Required on any PR touching `prisma/**` (the seed at `prisma/seed/**` and the fixture at
`prisma/fixtures/**` included), `prisma.config.ts`, `compose.yaml`, `compose.dev.yaml`, `Dockerfile`
or `proxy/Dockerfile`, and before defense:

1. **Clear state**: `make wipe` (or `docker compose down --volumes --remove-orphans`) from any clone —
   every clone shares the project name `peerconnect`. Clearing is not setup.
2. **Clone 1**: fresh clone, `make up`.
3. Clear state again.
4. **Clone 2**: a different fresh clone, nothing run first, no `.env`: `docker compose up --build`.
5. **Each passes when**: `api` becomes healthy with the seed logging completion from an empty
   database; `https://localhost:8443` shows the sign-in page after the interstitial; the bootstrap Admin
   and the demo Student (`SEED_STUDENT_PASSWORD`) can sign in; `/admin/rounds` shows four closed Rounds
   and none open; the console is clean.

### 16.6 Detecting a seed or boot regression before defense — four distinct layers

| Layer | Catches | Runs |
| --- | --- | --- |
| **Schema migration checks** | a migration that fails from empty, a lost raw object, checksum drift | CI step 4 on every PR; category 2 on every suite run; the gate review; `migrate deploy` at every boot |
| **Application integration tests** | the ten silent-failure categories | the Done box's `npx vitest run`; CI step 7 |
| **Seed fixture assertions** | an application change the seed drives that breaks the fixture or its end state — the case no earlier check saw (map #1's open ⚠️) | inside every seed run: at every boot from empty, and CI steps 5–6 on every PR |
| **Empty-database clean-clone boot** | Compose, Dockerfile, env, TLS, nginx or boot-order breakage | the two-clone procedure on the PRs listed in §16.5 and before defense |

Developers' own databases already hold a completed seed and skip it, which is why the seed is checked
from empty in CI rather than trusted to surface at the next local boot.

### 16.7 Browser pass (ADR-0016 d9)

Fadel runs it in week 5 (2026-10-16 → 10-22), Ahmad deputising: every feature in Firefox and Brave,
Chrome as the baseline; Brave Shields against the self-signed certificate, the `wss` socket and the
`SameSite=Lax` cookie; the CSP and the clean console. Limitations are documented in the README
(`en.subject.md:580`).

### 16.8 Definition of Done (ADR-0016 d6)

A ticket is done when its PR merges with every applicable box of `.github/pull_request_template.md`
ticked — there is no second definition: branch named and based on `main`; Conventional Commits;
rebased; **one completed review** by another member; **suite green** (`npx vitest run`); **the ticket's
acceptance criteria met**, each; no test outside the closed list without its argument; **records moved
together** if a rule, criterion, scope, status or resolved question changed; **Privacy Policy** (and
Terms) moved with any change to stored personal data, its visibility or retention; the **schema-gate**
boxes when inside the gate; the **clean-clone** boxes when §16.5 applies.

---

## 17. Team gates and process

### 17.1 Roles (CONTRIBUTING)

| | Role | Also |
| --- | --- | --- |
| **Ahmad** | Product Owner | Developer · schema-gate deputy |
| **Kamel** | Technical Lead / Architect | Developer · schema gate · week-1 infrastructure gate |
| **Fadel** | Scrum Master | Developer · fixture port and matcher tests (week 2) · browser pass (week 5) |

### 17.2 The schema gate (ADR-0005 d3–d6)

- **Scope, read off the file list**: `prisma/**` — which contains the seed (`prisma/seed/**`) and the
  fixture module (`prisma/fixtures/**`) — and every Prisma Config discovery path, read as the three
  patterns of §3.2: `/prisma.config*` (which holds the root `prisma.config.ts`), `/prisma7.config*`
  and `/.config/prisma*`. A PR adding any file matching one other than `prisma.config.ts` is inside
  the gate and refused. The application code the seed drives stays round-robin.
- **Kamel reviews; Ahmad deputises when Kamel is blocked more than 24 hours**; Fadel watches for the
  stall. The developer authors the migration.
- **Rules**: a merged migration is immutable (fix forward); rebase onto `main` before merging and
  regenerate only your own unmerged migration; `schema.prisma` and its migration are committed
  together; `npx prisma generate` is run explicitly; migrations are named `<slice>_<change>`; the seed
  stays idempotent; generated statements touching the raw objects are removed (§4.4); `prisma` and
  `@prisma/client` stay in the `^7` major; a personal-data change moves the Privacy Policy in the same
  PR.
- The week-1 infrastructure gate (ADR-0004 d12) and the schema gate are sequential, not concurrent
  (ADR-0005 d3).

### 17.3 Records move together

A change to a rule, acceptance criterion, scope, status or resolved question on an ADR, the map or an
issue is synchronized across every surface that exists, in the same task; ADRs are annotated, never
rewritten; the legal pages are corrected in place with a new *Last updated* date (`AGENTS.md`,
`docs/agents/issue-tracker.md`, ADR-0018 d15). **This document is inside that rule**: a correction to a
rule stated here updates the ADR it cites, and an implementation discovery that contradicts this
document is reported, not silently coded around.

### 17.4 Process (ADR-0005 d7–d8)

Trunk-based; branches `<type>/<slice>-<short>` off `main`, short-lived; one PR per slice increment;
squash-merge; Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`); every PR
needs one completed review from another member; round-robin outside the gate. Nothing is enforced by
GitHub today. The Makefile is never a hiding place for required setup.

### 17.5 README — on the critical path

`README.md` must exist before evaluation with: the subject's first line and the Description,
Instructions (prerequisites: Docker Engine with Compose ≥ 2.24.4; Node 22 for the host Vite process; the
`.env` model; both boot commands; the certificate interstitial; the dev overlay and the verified Vite
bind command with its LAN restriction), Resources and AI usage sections, **Team Information**, **Project
Management**, **Technical Stack** with justifications, **Database Schema** (§4, or a diagram generated
from the schema), **Features List** with the member(s) behind each, **Modules** with the 18-point
calculation (§1.3), the browser-limitations section (§16.7), the credential variables and the demo
Student's email. **Owners recorded**: Instructions — Kamel (ADR-0004 d12); browser limitations — Fadel
(ADR-0016 d9). **No owner is recorded for the other sections**; `/to-tickets` should surface that as a
ticket rather than assume one.

### 17.6 Settled dates

Week 1 (from 2026-09-18): Kamel's infrastructure gate. Week 2: Fadel ports the fixture and writes the
matcher tests. End of week 4 (2026-10-15): the legal pages signed off by Ahmad, technical claims
verified by Kamel, live. Week 5 (2026-10-16 → 10-22): the browser pass. The 2026-10-02 / 10-05 / 10-22
module-contingency dates are discharged (#7).

---

## 18. Build dependencies

Internal ordering `/to-tickets` should encode as blocking edges; product decisions are already made.

1. **Infrastructure gate** (Kamel, week 1): Compose files, both Dockerfiles, nginx files, `.env.example`,
   boot command, env validation, `/api/health`, Makefile, README Instructions. Gates every slice.
2. **Core** (Unit of Work with retry, `checkpoint` and `afterCommit`; envelope and exception filter;
   guards; logger; `RealtimePublisher` port) and the **test harness** (test DB, in-process app, nginx
   harness). Gate every slice.
3. **Accounts and sessions** (`Student`, `Session`, sign-up, sign-in, sign-out, password change,
   throttle) and the **seed skeleton** (catalogue, bootstrap accounts, completion record, truncation
   logic). Gate every signed-in feature.
4. **Fixture port + matcher engine + category 1** (Fadel, week 2, independent of the database layer for
   the pure part).
5. **Profiles and Skills** → **Rounds and Matches** (open, accept, decline, hand-made, close without
   Streak) → **Reviews** → **XP, Badges, Streak at close, Leaderboard** → **Learning Analytics**.
6. **Prompts** → **feed and Likes** → **Reports and moderation**.
7. **Socket gateway and Presence** → **Friends** (Presence) → **Direct Messages**; **Blocks** before
   Friends' request rule and before matching's blocked-pair input.
8. **Files** (validation, avatar, Evidence) after Reviews for Evidence.
9. **Users table and sanctions** after Matches (termination) and Reports (auto-action).
10. **Sign in with 42**: transport and state any time after 3; a **successful sign-in** and its
    identity mapping **Blocked by #24**.
11. **Legal pages rendering** any time after the SPA shell; sign-off by 2026-10-15.
12. **The full seed** grows with each slice it drives; each seed PR is inside the gate, bumps the
    fixture version and adds its end-state assertions. It reaches ADR-0017's complete end state only
    when 5–9 exist; the first complete deterministic run confirms or corrects the §14.5 targets and
    names the demo Student.
13. **Browser pass** (week 5) after features exist.

---

## 19. Implementation constraints and invariants

Rules every ticket inherits; a PR breaking one is not done.

1. No GET writes a domain row, except lazy session renewal and the 42 callback (§5.4).
2. One cookie, `pc_session`; no JWT; no token, Student data or OAuth state in web storage.
3. No page loads a subresource from another origin: no CDN, web font, analytics or hotlinked image.
   The only cross-origin browser traffic is the top-level navigation to and from 42's authorize page
   when a Student chooses Sign in with 42 (§3.1).
4. Every domain write goes through the Unit of Work at `SERIALIZABLE`, reading inside the transaction
   everything its decision depends on; no network call inside a transaction.
5. Every DB-derived socket event and every forced disconnect runs after commit.
6. Nothing a client sends over the socket performs a privileged action; `dm:send` is the only client
   event.
7. The socket admits only `Origin === PUBLIC_ORIGIN`, before session resolution, WebSocket only.
8. `PUBLIC_ORIGIN` is the only place the origin exists; no hardcoded `https://localhost:8443` or
   `http://localhost:8081` in code. No HSTS.
9. Every multipart route checks Origin and `X-PeerConnect-CSRF: 1` before parsing; every other
   mutation requires JSON; CORS is never enabled.
10. Level, Presence, unmatched, the live Prompt, report groups, threads, Round state and Round number
    are derived, never stored.
11. `Match.mission`, `compatibility_score`, `goal_bonus_applied`, its pair and its coverage rows are never
    written after insert.
12. No action completes a Match except Review submission; no Mission is tracked.
13. XP changes only by +80/+120 on Review and +20 on a Prompt answer; Streak only at Round close;
    Badges only by their three tests; nothing is revoked or set by hand.
14. No aggregate over ratings is computed or displayed anywhere, including as a UI convenience.
15. No Admin sets or resets a password; no application route shows a Direct Message to anyone but its
    two participants.
16. A 42 login resolves to a Student only through the stored immutable 42 identifier, never through
    `Student.email`; only the identifier is kept from 42.
17. A Removed row is view-only; Suspension and Removal delete every session and drop every socket.
18. Only `Student` and `Post` are soft-deleted; every read of them applies §4.6's surface rule.
19. No log contains a password, cookie, request body, message text, file contents, query string, OAuth
    `code`/`state` or search term (§3.9); no route carries a search term in its path.
20. Refusals reachable in normal use return 200 with `ok: false`; the console stays clean.
21. The seed writes directly only the catalogue and the two bootstrap accounts; everything else goes
    through the application's own service methods.
22. No entity, column, enum value or index beyond §4 without a gated migration and the records moving
    with it; `schema.prisma` is one file; `prisma.config.ts` is the only Config and every CLI call pins
    it.
23. Three Compose services; the Makefile hides no required setup; both boot paths work from a fresh
    clone and an empty database.
24. A change to stored personal data, its visibility or retention updates the Privacy Policy in the same
    PR; a change to `ReportReason` updates the Terms.
25. Tests are added only for what fails silently, inside the ten categories.

---

## 20. `/to-tickets` readiness checklist

- [x] Claimed modules and points fixed, each bullet mapped to a section (§1.3).
- [x] Every ADR rule consumed and traceable (§2.1); every delegated mechanism chosen (§2.2); every
      contradiction found resolved or reported (§2.3).
- [x] Stack, repository layout, module boundaries and frontend routes fixed (§3).
- [x] All nineteen tables with columns, keys, indexes, FKs, delete behaviour and the DB / service /
      serialization split (§4).
- [x] Authentication, sessions, CSRF, throttle, authorization matrix; OAuth mechanism specified and
      its #24-owned parts marked Blocked (§5).
- [x] Every endpoint with auth, validation, rule, persistence, events, refusals, concurrency and
      visibility (§§6–12).
- [x] Socket admission, the one client event and the complete server event list (§7).
- [x] Matching arithmetic and algorithm exact; Round, Match and Prompt lifecycles with their serial
      outcomes (§8).
- [x] Review, Evidence and file-validation contracts (§9); XP, Level, Badges, Streak, Leaderboard (§10).
- [x] Social, moderation and sanctions (§§11–12); Learning Analytics (§13).
- [x] Seed: paths, order, per-Round script, fixtures, assertions, idempotence, failure (§14).
- [x] Deployment, environment, logging, boot (§§3.9, 15).
- [x] Test categories with exact assertions, where they run, CI, clean-clone procedure, seed
      regression layers, Definition of Done (§16).
- [x] Gates, owners, dates and build dependencies (§§17–18); invariants (§19).
- [x] Records synchronized for this document's resolutions: ADR-0004, 0005, 0014, 0016, 0017 and
      0018 annotated; `CONTRIBUTING.md` rule 3 and the PR template name the seed paths; the Privacy
      Policy updated (Block lifting, the answer's Round); map #1 annotated; #6, #8, #10, #13, #20,
      #24, #25, #27 and #28 commented — each marked *uncommitted* until this lands on `main`.
- [x] **Pre-`/to-tickets` verification, 2026-09-23.** Mechanisms corrected: `Actor` scope (§3.4);
      sign-in re-checks the hash and flags it verified (§5.1, §3.6.3); one live OAuth attempt per
      browser (§5.6); third-party wording split into subresources and the 42 navigation (§3.1, §19);
      id-order wording (§4.1); Prisma Config gate read as three patterns, pinning's limits, `dotenv`
      at runtime, in-container developer commands (§3.2, §15.5–15.6, §17.2); a stale seed marker over
      an empty schema (§14.9); report-fixture parties and the demo Student (§14.3, §14.6–14.7);
      `stack` without the message (§3.9); the renderer's construct list (§3.5.4); `post_unavailable`
      and friend-request races as 200 refusals (§6.4, §6.9); the Admin's moderation guard (§12.5);
      the db healthcheck over TCP (§15.1); socket registration against revocation (§7.2); the
      upstream partial-index report (§4.4). Records moved with them: forward pointers on every inline
      `/to-spec #1` delegation still lacking one (ADR-0002, 0003, 0005, 0006, 0007, 0008, 0010,
      0011, 0012, 0016, 0017, 0018); `CONTRIBUTING.md`, the PR template and the Prisma research note;
      the Privacy Policy's cookie paragraph (§2.3 R6); map #1; #4, #5, #6, #8, #9, #11, #13, #14,
      #17, #20, #21, #24, #25, #27 and #28 commented.
- [x] **Second pre-`/to-tickets` verification, 2026-09-24.** Mechanisms corrected: a `23505` on a
      known constraint maps to that operation's refusal, any other falls through to `internal_error`
      (§3.6.2); lazy renewal re-sets the cookie only on one affected row (§5.2); the session guard
      never clears an `a.` attempt cookie (§5.3); upload precedence nginx envelope → CSRF → Multer
      (§5.4); the throttle lives at the HTTP boundary, with a fixed rule for an absent `X-Real-IP`
      (§5.5); Sign in with 42 split into what is exercisable before #24 and what is not, and the
      disabled callback's 404 (§5.6, Remaining Dependencies #1); the operation template's Refusals,
      Events, Concurrency and Visibility filled on the §6 routes, §8.5, §8.7 and §8.12; non-participant
      Match reads → 404 (§6.6); the hand-made Match's goal flag and explanation (§8.6, §8.11); the
      upload boundary `size > cap` (§6.3, §9.4–9.5); both images built from context `.` (§15.1); the
      Compose floor ≥ 2.24.4 (§3.3, §15.2, §17.5); the harness's `$connection_upgrade` map,
      `prisma generate` and explicit `X-Real-IP` (§16.2); the subject line citations (§1.3, §2.2,
      §2.3, §3.5.3, §3.8.2); §2.3's items relabelled R1–R7. Rule-level: Removal's report side effect
      includes an open Report the removing Admin filed, hidden afterwards from that Admin's audit
      (§12.5, §12.7, category 10); Evidence write stays with the originating Mentee whatever their
      current role, as ADR-0009 d5 and ADR-0014 d11 rule (§5.7, §9.4, category 8). Records moved with
      them: ADR-0004 d8 (toolchain floor), ADR-0011 d9 and d10 (guard scope, own report), ADR-0016 d1
      (categories 8 and 10), ADR-0018 *Not settled* (the R1 label) — each *uncommitted* until this
      lands on `main`. *(The ADR-0016 d1 note listed here was actually written in the third pass
      below. This pass commented on #6, #14 and #20 and annotated map #1.)*
- [x] **Third pre-`/to-tickets` verification, 2026-09-24.** **Rule-level:** category 9's same-Badge
      contention case asserted two Posts and +40 XP, which no serial order admits under M1. §10.4
      now explains why two *valid* events for one Student never contend for one Badge (reproduced on
      PostgreSQL 17.11), and §16.3 asserts the outcome that schedule actually has. **Mechanisms:**
      the `dist/` layout, `nest-cli.json`'s `entryFile` and the seed's asset path (§3.2); where the
      `starvation` cohort lives (§14.2); CI's Postgres credentials (§16.4); the fields of the
      Admin's Student detail (§6.12). **Records moved with them:** ADR-0016 d1 and d7 (that
      correction, plus the categories 8 and 10 cases above); a pointer on ADR-0010 d2;
      `CONTRIBUTING.md` → *Testing* item 9; map #1; comments on #25 and #17. Each is *uncommitted*
      until this lands on `main`.
- [ ] External decisions below — they block only the tickets that name them.

---

### Remaining Dependencies / External Decisions

Only items owned elsewhere. Nothing that `/to-spec #1` was responsible for choosing is left here.

1. **[#24 — Settle how a 42 identity maps to a Student](https://github.com/ahmadmnsur/ft_transcendence/issues/24)
   (open).** Owns: which **immutable 42 account identifier** is the key, and the `Student` column that
   stores it; whether a first 42 login with no linked Student **links, creates or is refused**; whether
   link or create writes happen **inside the callback GET or in a following JSON `POST`** (ADR-0003 d10's
   annotation); whether **signed-in linking** ships (§5.6 reserves `intent: "link"`); the Terms
   acceptance on any 42 creation path; whether `password_hash` becomes nullable; whether the Terms'
   *forgotten password cannot be reset* line changes if a linked 42 login restores access; the Privacy
   Policy's marked 42 sentence; and **who registers the 42 application** — one shared application or one
   per developer. **Blocks**: exercising callback steps 6–7 (code exchange, `/v2/me`), which need a registered
   42 application — who registers it is this item's — and a **successful** Sign in with 42: step 8's
   resolution, the branches after a miss and the session issuance they lead to (§5.6 B), and its
   demo. What builds and is exercised now, with no registered application and no network to 42: the
   button and the enabled/disabled flag (the disabled callback's 404 included), `start` (`state`,
   PKCE, cookie, store, one live attempt) and the callback's verification steps 1–5 with the failure
   path. Steps 6–7 are written against §5.6 now but not exercised until an application is
   registered; steps 8–9 wait for #24's mapping.
2. **The residue of [#26](https://github.com/ahmadmnsur/ft_transcendence/issues/26)** (closed, a fact not
   a decision): whether 42 accepts plain `http://localhost:8081/api/auth/42/callback` as a registered
   redirect URI. It affects only exercising Sign in with 42 on the dev overlay; the base path's
   `https://localhost:8443` is unaffected. Feeds #24's registration question.
3. **Legal-page sign-off inputs** (ADR-0018 Consequences): Kamel's and Fadel's **42 logins**, which no
   record holds, and #24's field. Ahmad signs off and Kamel verifies the technical claims by
   **2026-10-15**.
4. **[#16 — commits from Kamel and Fadel](https://github.com/ahmadmnsur/ft_transcendence/issues/16)
   (open)**: `en.subject.md:306`–`:312` is a rejection criterion until each has landed a commit.
5. **[#28 — repository governance](https://github.com/ahmadmnsur/ft_transcendence/issues/28) (open)**:
   `CODEOWNERS` (which must map `/prisma/`, `/prisma.config*`, `/prisma7.config*` and
   `/.config/prisma*`, §3.2 — the seed paths now sit inside `prisma/**`); squashing migrations before
   defense; long-lived branches; and whether to enable branch protection and make CI a required check
   (ADR-0005 d7, ADR-0016 *Not settled*).
6. **The demo script's running order** (ADR-0017 *Not settled*): a rehearsal question for whoever
   presents. The demo Student's identity is not a decision; §14.8 selects it deterministically and the
   first run records it.
