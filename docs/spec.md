# 42 PeerConnect — Buildable Specification

**Status: locked.** Produced by `/to-spec #1` on 2026-09-23 from ADR-0001 → ADR-0018 (as annotated),
the map ([#1](https://github.com/ahmadmnsur/ft_transcendence/issues/1)), `CONTEXT.md`,
`CONTRIBUTING.md`, the PR template, the legal drafts in `docs/legal/`, the research notes in
`docs/research/`, the prototype on `prototype/compatibility-score`, and the two primary sources in
`document/`. It is the input `/to-tickets` reads.

> **Updated 2026-10-13 for the move to Supabase**, from
> [ADR-0019](adr/0019-supabase-hosts-the-data-and-peerconnect-keeps-the-rest.md) and the ADR notes it
> names, by [Update the spec and the legal pages for Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/103).
> Every section the move changed is corrected in place, each changed rule citing the note that holds
> it: §§1–7, §9, §12.7, §13, §§14–19 and the final section, with the mechanisms chosen here listed in §2.2
> (M35–M37). `main` at `62eb070` holds the text before.

> **Updated 2026-10-15 for French, Arabic and right-to-left**, from
> [ADR-0020](adr/0020-peerconnect-speaks-english-french-and-arabic.md) and the proposals it
> summarises, by [Write the ADR for French, Arabic and right-to-left, and update the spec](https://github.com/ahmadmnsur/ft_transcendence/issues/147).
> The multi-language and right-to-left Minors are claimed, so the claim is 20 points. Every section
> they change is corrected in place, each changed rule citing ADR-0020's decision: §1.3, §1.4,
> §2.1, §2.2 (M38), §3.3, §3.5 (with a new §3.5.5), §12.8, §13.3, §13.4, §16.7, §16.8, §17.5,
> §18, §19 and the final section. `main` at `845964d` holds the text before.

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
- **Blocked** marks behaviour whose product meaning is owned by an open ticket (final section); none
  is marked since 2026-10-13. A ticket touching it cannot complete until that ticket resolves.

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
**Learning Analytics** serve the loop. Everything runs from a clean clone with one command: on the
team's copy, whose database, files and passwords Supabase keeps, when the team's `.env` is present,
and on a local copy otherwise (§15, ADR-0019).

### 1.3 Claimed modules — 22 points (6 Majors, 10 Minors), threshold 14

Locked by [#7](https://github.com/ahmadmnsur/ft_transcendence/issues/7) at 18, all firm since #14;
the multi-language and right-to-left Minors joined on 2026-10-15 (ADR-0020 d1, from
[map #139](https://github.com/ahmadmnsur/ft_transcendence/issues/139)). Target policy: survive two
Majors failing (20 − 4 = 16).

> **Updated 2026-10-27** (#71, Ahmad as Product Owner): the heading read *"20 points (5 Majors, 10
> Minors)"*. The matching engine and its validation method are also claimed, as a Module of choice
> Major (`document/en.subject.md:937`): the fallback #7 named on 2026-09-18, found not needed on
> 2026-09-19 and never rejected. The claim is 22 points, so two Majors failing leave 18. The bonus
> counts at most 5 points above 14 (`:1375`), so the three points above 19 are margin, not score.
> `README.md` → *Modules* gives the justification `:941`–`:949` asks for, framed as #7 requires:
> the engine and its validation method, never the platform's matching counted twice.

> **2026-11-03** *(uncommitted, on branch `docs/readme-modules`)*: two Minor Modules of choice
> (`:957`) are offered beyond the 22, on Kamel's call: the light and the dark theme (§3.5.3) and
> New dots (ADR-0021). They are extras: the 22 do not depend on them, so the count stands if the
> evaluator refuses them. With both, 24 are claimed, and 19 still count at most. Neither is the
> notification system (`:518`), which stays out (§1.4). `README.md` → *Modules* → *Extra modules*
> gives each the justification `:941`–`:949` asks for.

| Module (`document/en.subject.md`) | Pts | What in this spec satisfies each bullet |
| --- | --- | --- |
| **Major — framework on both ends** (`:478`) | 2 | React SPA (§3.5) + NestJS API (§3.4). The two framework Minors are **not** also claimed (#7). |
| **Major — real-time WebSockets** (`:490`) | 2 | Socket.IO: `post:created` to `feed`, `round:opened`/`round:closed` to `rounds`, per-Student `match:ready`, `dm:message`, Presence (§7). Reconnect, grace window and forced disconnect (§7.5). Room broadcast, not N unicasts (§7.4). |
| **Major — user interaction** (`:498`) | 2 | Chat: 1:1 Direct Messages (§11.4). Profile: §6.2. Friends: request/accept/decline/end, list (§11.1, §6.4). |
| **Major — standard user management** (`:592`) | 2 | Profile edit (§6.2); avatar with default (§9.6, §6.3); Friends with online status (Presence, §7.6); profile page (§6.2). |
| **Major — advanced permissions** (`:622`) | 2 | Users table: view, edit, delete-by-Removal (§6.12); roles `STUDENT`/`PEER_MODERATOR`/`ADMIN` managed on the role column; three distinct views (Student: none; Peer Moderator: `/moderation`; Admin: `/admin/*`). |
| **Major — Module of choice: the matching engine and its validation method** (`:937`) | 2 | The pure engine of §8.3 over the exact integer Compatibility Score of §8.2 (ADR-0006): most-constrained-first selection, the Level term in the selection priority only, the total tie-break order and the hard pair rules; validated against the best of 600 randomized re-runs across 8 seeds and cohorts of 12, 20 and 30 (ADR-0006 d6); test category 1 (§16.3). Added 2026-10-27, note above. |
| **Minor — ORM** (`:516`) | 1 | Prisma `^7`, on Supabase's Postgres (§3.3, §4). |
| **Minor — advanced search** (`:534`) | 1 | `GET /api/students` with Skill filters, sort, pagination over TanStack Table (§6.2). |
| **Minor — gamification** (`:848`) | 1 | Exactly three of `:850`: XP/Level, Badges, Leaderboard; persisted; progress bar + earn panels; `/rules` page (§10). |
| **Minor — design system** (`:526`) | 1 | Project-owned palette, type scale, icon set and ≥ 10 reusable components (§3.5.3). |
| **Minor — file upload** (`:536`) | 1 | Avatar (PNG/JPEG) and Evidence (PDF/PNG/JPEG); client + server validation; storage in two private Supabase Storage buckets, every byte through authorised NestJS routes; preview; progress; delete (§9.5–9.6, §6.3, §9.8). |
| **Minor — OAuth 2.0** (`:620`) | 1 | Sign in with 42, run by NestJS with no part for Supabase Auth; a 42 login finds its Student by 42's account `id` (§5.6). |
| **Minor — additional browsers** (`:574`) | 1 | Firefox + Brave pass in week 5, limitations documented in `README.md` (§16.7, ADR-0016 d9). |
| **Minor — user activity analytics** (`:642`) | 1 | `/admin/analytics` Learning Analytics (§13), a scoped V2 pull-forward (ADR-0015). |
| **Minor — multiple languages** (`:554`) | 1 | English, French and Arabic, each complete: a typed dictionary of the SPA's own over `Intl`, whose build refuses a missing text (§3.5.5); the switcher in the shared header on every route (§3.5.5); every text the SPA shows or gives to a screen reader translated (§3.5.2), the legal pages included (§3.5.4). ADR-0020. |
| **Minor — right-to-left** (`:564`) | 1 | Arabic. `<html dir>` is set before the first render and switches with the language, without a reload (§3.5.5); complete mirroring through flow-relative classes, with a build that refuses a left or right class, and the tables and the chart mirrored (§3.5.2, §13.4); the RTL-specific adjustments (`:570`), as ADR-0020 decision 7 lists them: the `ProgressBar`'s fill, the arrow keys, the empty fields, the table fade, the chart, the chevrons, the legal lists and logins, the Arabic text rules and the Skill names (§3.5.2–§3.5.4, §13.4). ADR-0020. |

Mandatory part (`:300`–`:389`) is met by: containerised single command (§15); Chrome, clean console
(§3.8.2, §15.7, §16.7); Privacy Policy and Terms routes with footer links (§3.5.1, §3.5.4); multi-user concurrency
(§3.6); responsive Tailwind UI (§3.5); `.env` + `.env.example` (§15.4); clear schema (§4); email +
password, hashed and salted by Supabase Auth's bcrypt (§5.1); validation on both ends (§3.5.2,
§6.0); HTTPS for every browser connection on the deployment path (§15.2).

### 1.4 In scope and out of scope

**In scope** is exactly what §§4–14 specify. **Out of scope**, each ruled on the map or an ADR:
any game and every game-gated module; the four infrastructure Majors; the accessibility Major
(WCAG 2.1 AA), a fourth language and translating text a person writes (ADR-0020 d1); the AI
recommendation Major; the public API (#12); the notification system; advanced chat,
PWA, SSR, real-time collaboration, organisations; **Comments** and with them a third report target;
reportable Direct Messages and reportable Evidence; fair mentor rotation and network freshness (MVP
cuts); availability matching, prompt categories/scheduling, per-skill endorsements, the Learning
Progress view, 2FA, the **Mentor Reputation** score and any aggregate over ratings (Version 2);
Problem Solver, Top Mentor, Most Improved and Longest Learning Streak Badges; email verification,
password reset and any Admin-set password; self-service account deletion; appeals; a reporter
status surface; read receipts; `last_seen_at` or any stored Presence; Mission completion tracking;
XP ledger, ranking history, analytics snapshots, exports; a public deployment, `mkcert`, LAN access
on the dev path (the base path opens to the local network only when a member's `.env` sets
`BIND_ADDRESS`, §15.2); a `SESSION_SECRET`; JWT anywhere, except the token a password check through
Supabase Auth returns, which lives only inside that request on the server (§5.1, ADR-0003 d1's
note); any Compose service beyond the six of §15.1.

> **2026-11-01 ([#249](https://github.com/ahmadmnsur/ft_transcendence/issues/249))** *(uncommitted)*, **landed on `main` at `4cc1717`**:
> a typing indicator on a Direct Message page is built (§7.3's note of the same day). It is one
> bullet of the advanced chat Minor, which stays unclaimed and out of scope: two of its six bullets
> need a game. Read receipts stay out.

> **2026-11-03 ([#259](https://github.com/ahmadmnsur/ft_transcendence/issues/259); ADR-0021)**: New dots, a dot on a link when
> something waits for the Student on that page, and more live events are in scope, on
> [#260](https://github.com/ahmadmnsur/ft_transcendence/issues/260), [#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261) and [#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262). The notification system stays out: no number, popup,
> operating-system notification, inbox or list of what happened (ADR-0021 decision 8).

> **2026-11-03** *(uncommitted, on branch `docs/readme-modules`)*: the New dots are now offered as
> an extra Minor Module of choice (`:957`), outside the 22 (§1.3's note of this day). The
> notification system (`:518`) still stays out, for ADR-0021 decision 7's reason.

**Out of scope with the move to Supabase** (map #85, ADR-0019): everything Supabase offers beyond
its three stores, namely its sessions and tokens past one request, its browser client, the Data
API and row-level security, Realtime (Socket.IO stays), sign-in through outside providers, its
email and Edge Functions; Google sign-in; password reset by email; features only for 42 students,
and 42 projects as Skills; hosting PeerConnect anywhere, Vercel included.

### 1.5 User stories

**Visitor (signed out)**

1. As a visitor, I want to read the Privacy Policy and the Terms of Service without an account, so
   that I know what I am agreeing to before I sign up.
2. As a visitor, I want to sign up with an email, a password and a display name, ticking the
   acceptance checkbox, so that I can join.
3. As a visitor, I want to sign in with my email and password, so that I reach my account.
4. As a visitor on a copy with 42 OAuth configured, I want a Sign in with 42 button that reaches the
   Student who connected my 42 account, or, when none has, a sign-up form pre-filled from 42, so
   that I can use my 42 account.
5. As a visitor on a copy without OAuth configured, I want no 42 button at all, so that nothing on
   the page is broken.
6. As a visitor who mistypes a password, I want to be told whether no account uses the email or the
   password is wrong, and then a temporary throttle, so that I know what to fix and nobody can keep
   guessing; a Suspension or Removal is told only once the right password is typed.

   > **Updated 2026-10-25** (ADR-0003 d10's note of the same day): the sign-in page shows a wrong
   > email and a wrong password the same sentence, *"Wrong email or password."*, so the page no
   > longer says which one is wrong; the API's codes still do. The throttle and the sanction rule
   > stand.

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
69. As a developer, I want `make test` to run the whole suite (`npx vitest run`) against Supabase's
    own containers, and CI on every PR to show typecheck, migrations from empty, the seed from empty
    and the suite.
70. As a reviewer, I want to know from a PR's file list alone whether it is inside the schema gate.
71. As a team member, I want `make up` with the team's `.env` to run PeerConnect on the team's copy,
    so that every member and the defense see the same data.

**Student — Sign in with 42**

72. As a Student, I want to connect my 42 account to my account, and disconnect it, with my current
    password, so that I can sign in with 42 and nobody at a computer I left signed in can attach
    theirs.
73. As a Student who connected 42 and forgot my password, I want to confirm with 42 and then set a
    new password within ten minutes, so that I can get back into my account.

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
| ADR-0003 d1 | Opaque session id in one HttpOnly, Secure, SameSite=Lax cookie; no JWT; the cookie also carries the OAuth pre-authentication attempt. A password check through Supabase Auth's password grant returns a JWT that lives only inside that request on the server: used once to sign its Supabase Auth session out, never stored, logged or sent to the browser (d1's notes of 2026-09-30 and 2026-10-02). |
| ADR-0003 d2 | Single origin for bundle, API and socket. |
| ADR-0003 d3 | Replaced (d3's note of 2026-10-02): Supabase Auth keeps each password, bcrypt at cost 10; a password is 8 characters to 72 UTF-8 bytes, no composition rule, checked in the SPA and again in the API; PeerConnect hashes and stores no password. A new password holds no emoji; a current one is checked without that rule (d3's note of 2026-11-01). |
| ADR-0003 d4 | 30-day sliding expiry, renewed only when `expires_at` is more than an hour old; `Max-Age` derived from `expires_at`. |
| ADR-0003 d5 | Session row holds id, student_id, expires_at; role and sanction flags read from `Student` on every request; sanctioned resolution fails. Resolving a session reads PeerConnect's tables only and never calls Supabase Auth (d5's note). |
| ADR-0003 d6 | Logout deletes one session; password change, Suspension, Removal delete all; role change deletes none. Only the password change writes to Supabase Auth: check the current password, delete every session, admin update, delete every session again, `password_version` raised each time (d6's note of 2026-10-02); after Confirm with 42 the check is skipped (note of 2026-10-08). |
| ADR-0003 d7 | Socket authenticates by the cookie; WebSocket-only; Origin must equal `PUBLIC_ORIGIN` before session resolution; rejection stops retry. |
| ADR-0003 d8 | Deleting sessions force-disconnects live sockets via the Presence registry. |
| ADR-0003 d9 | No privileged action over the socket; a DM is the only client write. |
| ADR-0003 d10 | CSRF: SameSite=Lax + JSON content type on every mutation; upload exception with Origin + `X-PeerConnect-CSRF: 1`; no GET changes a domain row except lazy renewal and the OAuth callback; `state` mandatory; throttle 5 / 15 min keyed on client address **and** email, in memory, nginx the only trusted proxy. Sign-in's codes say what is wrong, a sanction only after the right password; a Supabase 429 is `too_many_attempts`, not counted; Supabase Auth unreachable is `busy_retry_later` (d10's note of 2026-10-02). The sign-in page shows a wrong email and a wrong password one sentence, *"Wrong email or password."* (note of 2026-10-25). The 42 callback writes only a found Student's session or a Connect 42 link; Connect 42 and Disconnect 42 ask for the current password; the 42 sign-up form's own request creates the Student (note of 2026-10-08). |
| ADR-0003 d11 | Logout ships; email verification, password reset by email and Admin-set passwords do not. A Student who connected 42 may set a new password without the current one within ten minutes of Confirm with 42 (d11's note of 2026-10-08). |
| ADR-0004 top notes | `make up` runs on the team Supabase project when `.env` holds its values, for `main` and the defense, and on the local fallback otherwise; nothing falls back by itself. Kamel keeps the Free project active. Still no public deployment. The team `.env` stays with the team (note of 2026-10-11). |
| ADR-0004 d1–d3 | Six services: `proxy`, `api`, and the fallback's `db` (Supabase's Postgres image), `auth`, `storage` and `api-gw` (d1's notes of 2026-10-03 and 2026-10-04); the fallback's services load `.env.example` alone; only `proxy` publishes ports; nginx serves the bundle and proxies `/api` and `/socket.io`. |
| ADR-0004 d2 notes | Upload locations admit 6 MiB; request log in nginx standard fields, path and referrer without query; container logs capped with rotation. |
| ADR-0004 d4 | Dev overlay keeps nginx; Vite is a host process reached through `host.docker.internal`; verified bridge bind, no silent wildcard. |
| ADR-0004 d5, d7 | `http://localhost:8081` (dev, `127.0.0.1:8081`) and `https://localhost:8443` (base, `127.0.0.1:8443` + redirect `127.0.0.1:8080`); LAN out of scope on dev. The base path's two ports listen on `BIND_ADDRESS`, `127.0.0.1` by default: a member's `.env` with `BIND_ADDRESS=0.0.0.0` and `PUBLIC_ORIGIN` on the laptop's IP opens `make up` to the local network (notes of 2026-10-25). |
| ADR-0004 d6 | Self-signed certificate generated at image build; never committed. |
| ADR-0004 d8 | `make up` and bare `docker compose up --build` both work, independently; `.env.example` first, optional `.env` second; Compose ≥ 2.24 (`env_file.required`'s own floor — the toolchain floor is §3.3). Of the targets that start a stack, only `make up` reads `.env`; `make local`, `make dev` and `make test` always run the fallback; the boot check is the chain's first step and never falls back by itself; `make test` runs a copy of its own (d8's notes of 2026-10-03 and 2026-10-04). |
| ADR-0004 d9 | Twenty-eight `.env.example` entries, all the fallback's (notes of 2026-10-04 and 2026-10-25); the team project's values only in `.env`; OAuth pair ships empty; staff and seed credentials are development defaults for the fallback, 8 characters to 72 bytes, set to other values in the team `.env` before its first boot, and in a member's `.env` before that member opens the fallback to the local network (d1's note of 2026-10-25); the team `.env` is never handed to an evaluator (note of 2026-10-11). |
| ADR-0004 d10 | No `SESSION_SECRET`. |
| ADR-0004 d11 | Boot: the boot check → migrate → seed, whose first step makes the buckets, the same chain on both targets; on the team project the session pooler, TLS verified against Supabase's certificate, a pool of 5; `make reset-team` and `make reset-local`, each emptying one fixed target (d11's notes of 2026-10-03 to 2026-10-11). |
| ADR-0004 d12 | Kamel owns the infrastructure slice in week 1 as a gate, README Instructions included. |
| ADR-0004 amendment | OAuth credentials `FT_OAUTH_CLIENT_ID`/`FT_OAUTH_CLIENT_SECRET`; redirect URI derived from `PUBLIC_ORIGIN`; platform fully usable with OAuth unconfigured; 42 token used once, discarded. NestJS runs Sign in with 42 and finds a Student by 42's account `id`; one team application on Kamel's 42 account, its keys only in the team `.env`; its secret lasts 28 days, with a warning in the last seven; 42 is off under `make local`, `make dev` and `make test` (note of 2026-10-08). |
| ADR-0005 | Prisma `^7`; one `schema.prisma`; gate = `prisma/**`, root `prisma.config.ts`, every Config discovery path, the seed and its fixture, plus `supabase/**`, every `compose*.yaml`, the buckets' settings and `prisma/reset/**` (d5's note of 2026-10-10); a PR moving a gated file updates the gate list and is gated; the team project's dashboard settings change by a PR to `supabase/team-project.md` first; Kamel reviews, Ahmad deputises past 24 h and reviews any gated PR Kamel authors (d3's 2026-09-24 annotation); developer authors; immutable merged migrations (`migrate deploy` skips an edited one silently, d6's correction of 2026-10-10); rebase-then-regenerate own migration; Conventional Commits; squash-merge; `<type>/<slice>-<short>` branches; explicit `prisma generate`; `prisma-client` generator with explicit output; `@prisma/adapter-pg`; Node `^20.19`/`^22.12`/`^24`; TS ≥ 5.4. |
| ADR-0006 | Skill-only Score, `cover(n)=1−0.5ⁿ`, 0.7/0.3, +10 Mentee Learning Goal bonus, clamp, exact half-up rounding; floor 25; orientation by higher Score, tie lower id is Mentor; priority = Score − 2·max(0, ΔLevel − 2); most-constrained-first with recompute; tie-break `priority DESC, Score DESC, pair key ASC`; no-repeats over every Match row of any status; Block unconditional; hand-made Match: no Score (`NULL`, so the 25 floor has nothing to gate), exempt from the no-repeats history check only, oriented by steps 3–4, both currently unmatched, serialized; a Block does not end an existing Match. |
| ADR-0007 | One live Prompt = greatest durable publication order; publish-only, no edit/delete/draft/schedule; answer is the Post; one answer per (Prompt, Student) in the schema; answer + 20 XP + Knowledge Sharer + qualifying activity atomic; answer rejected after supersession; roles `STUDENT`/`PEER_MODERATOR` answer, `ADMIN` does not; answers visible immediately. |
| ADR-0008 | One role per Student; Peer Moderator participates, Admin does not; Peer Moderator authority = open Post-report groups + Remove Post/dismiss; manual role assignment only; three sanctions; Suspension reversible, Removal final; both terminate in-progress Matches as `TERMINATED_BY_ADMIN`, delete sessions, drop sockets; soft delete on Student and Post only; Removed rows view-only, email burned; Admin edits only Student-editable fields + role; self-guards and ≥ 1 active Admin, serialized; Users table is the roles surface; seed bootstraps Admin and Peer Moderator. No sanction writes to Supabase Auth, and a Removed Student's Supabase Auth user and hash are kept (d5, d7 notes); the Removed row keeps `forty_two_id`; an email edit writes `Student.email` alone; no Admin sets a password or touches `forty_two_id` (d8 notes); nobody deletes a Student's Supabase Auth user outside a reset or the seed's guarded run (d9 notes); the bootstrap accounts go through Supabase's admin create (d12's note). |
| ADR-0009 | Evidence on the Learning Outcome; bytes in two private Supabase Storage buckets, `avatars` and `evidence`, opened only by the `api`, every read through NestJS, no signed link; file written before its row and deleted after it; files no row names deleted by the `api` once more than an hour old, at every start and every hour (d2's note of 2026-10-05); authenticated opaque routes; Evidence readable by the originating pair + Admins; Mentee-only mutation while active; 5 MiB / 2 MiB exact; Evidence PDF/PNG/JPEG, Avatar PNG/JPEG; server byte validation; canonical type + `nosniff`; atomic replacement; Removal deletes avatar, keeps Evidence; Suspension touches neither. |
| ADR-0010 | 80 XP each per completed Match + 40 to the Mentee; 20 XP per Prompt answer; `Level = min(10, 1 + floor(XP/250))`; First Mentor, Knowledge Sharer, Consistent Learner; one Leaderboard by XP, top ten + pin, `XP DESC, id ASC`, filtered to active `STUDENT`/`PEER_MODERATOR`; XP paths serialize per Student; BadgeAward contention converges; progress bar, earn panels, `/rules`. |
| ADR-0011 | Likes ship, Comments do not; targets Post or Student; one table, two nullable FKs, CHECKs; reason enum + optional capped text; immutable; two partial unique indexes; states `OPEN`/`ACTIONED`/`DISMISSED`; group = open rows per target; first resolution wins; Peer Moderator sees eligible open Post groups without reporter identity; whole-group conflict guard; Admin self-interest hiding; Remove Post and Remove Student auto-action; Suspension resolves nothing; reporter learns nothing; Report and Block separate. |
| ADR-0012 | Mission = one of six enum values, round-robin by zero-based index within the Round, never updated, text rendered by the frontend. |
| ADR-0013 | Optional 1–5 rating on Private Feedback; no aggregate anywhere; Mentor reads received feedback on a private route, newest first; Mentee re-reads own; Removed author shown as tombstone. |
| ADR-0014 | 19 tables, 9 enums, UUIDv7 ids, UUIDv4 file tokens; `Student.id`, `Avatar.token` and `Evidence.token` made by NestJS before the row, so with no Prisma default (d10's note of 2026-10-10); `Student` holds `password_version`, `display_name_search` and `forty_two_id`, no `password_hash`; `Avatar` and `Evidence` hold no bytes; no foreign key into Supabase's `auth` or `storage`, no row-level security (top note of 2026-10-10); Review split across Review/PrivateFeedback/Post; six Match statuses; Skill catalogue + StudentSkill + Learning Goal reference; Friendship directed, unique unordered pair; Like revocable; DM without Conversation, `read_at` for recipient only, non-GET mark-read; Streak stored, recomputed at close skipping Suspended/Removed; outbound-only socket with three rooms; frozen explanation state; database invariants and the one service invariant. |
| ADR-0015 | `/admin/analytics`, Admin-only; Demand/Supply/Gap over the candidate pool; completion over closed Rounds, per closed Round series, absent when zero; state now + outcomes, no dwell or funnel; Round-indexed; nothing stored; refresh on `round:opened`/`round:closed`; Recharts; no export. |
| ADR-0016 | Vitest, one command, a real Postgres, Auth and Storage (Supabase's own containers, never a stand-in, d1's note of 2026-10-04), twelve closed categories, shared fixture, C3/C4/C6/C7, clean-clone check in two fresh clones from an empty database (triggers also `supabase/**` except Markdown, and `.env.example`), Done = merged PR with every box ticked, advisory CI running `make test`'s copy, Firefox + Brave in week 5. |
| ADR-0017 | Seed drives real write paths; four closed Rounds, ends idle; 62-Match target; suspension in Round 3, Removal in Round 4 with prerequisites; `SEED_STUDENT_PASSWORD`, a Supabase Auth password; four Report rows in three fixture groups (two grouped on one Post, one Student, one resolved) asserted per role; 27-Skill catalogue; both gap forms; social graph; completion-based idempotence, loud failure; a run that writes first checks its guard, then deletes our rows, every Supabase Auth user and every file in the two buckets; the lock on a connection of its own; minutes on the team project (d10's notes of 2026-10-03 and 2026-10-11); both boot paths; no Presence seeding. |
| ADR-0018 | Pages describe the model as built; two kinds of copy, the team's (Supabase, Frankfurt) and a local one (d1's note of 2026-10-11); one cookie; the browser loads nothing from third parties and never contacts Supabase (Sign in with 42 the one chosen exception); logs clean and capped, the team project's `postgres` role with four log settings (d6's note of 2026-10-11); throttle in memory; visibility rows (§4.6); Admin label; Peer Moderator unlabelled; no read receipts; four signed-out routes (a fifth, the landing page at `/`, since d12's note of 2026-10-25), footer everywhere; acceptance checkbox validated, not stored, on the 42 sign-up form too; Removal on request only, keeping the hash and the 42 account number; 42 data minimisation; 42's account `id` in `Student.forty_two_id` as the only key; recovery through 42 only; Privacy Policy moves with personal data. |
| ADR-0019 | Supabase is three stores and nothing more: Postgres as the database, Storage for the two buckets, Auth as the place each password is kept and checked. The browser never talks to Supabase; PeerConnect keeps its session, Prisma, Socket.IO and Sign in with 42. One team project in Frankfurt, which Kamel owns and keeps available. |
| ADR-0020 | Multi-language (English, French, Arabic) and right-to-left (Arabic) claimed; WCAG stays out. Every text the SPA shows or gives to a screen reader is translated in the SPA; names, text for developers, the seed's text and what the browser or 42 draws are not; the API keeps its English `message` and `"Former student"`, which the SPA never shows. A typed dictionary over `Intl`, no package; `tsc -b` refuses a missing text, plural form or placeholder; English is the fallback. Every value isolated; numbers, dates and lists by `Intl` with `en-GB`, `fr` and `ar-u-nu-arab`. First visit from the browser's languages; the choice in `localStorage` only when picked; switcher in the shared header on every route. Flow-relative classes only, the build refusing a left or right class; tables and the chart mirror; arrows flip. A bundled Noto Sans Arabic for Arabic characters. Legal pages English until translated once, the English canonical, one date for three versions. Each slice ships its text in three languages (`CONTRIBUTING.md` → *Text ships in three languages*). |
| ADR-0021 | New dots: a red dot after a link's text, no number, when something waits on that page and is newer than this sign-in's last opening of it; menus and the tab icon show one too. Openings on five `Session` columns, six since d4's note of 2026-11-03 *(uncommitted)*; `PrivateFeedback.read_at`, never shown to its author. Events say "read again", except `post:removed { postId }` and `post:likes { postId, likeCount }` to `feed` (d5's note of 2026-11-03) *(uncommitted)*, **landed on `main` at `20057b3`**; a `staff` room that follows role changes. A dot for Likes on your own Post is reopened for #262 (d3's note of 2026-11-03) *(uncommitted)*, **landed on `main` at `20057b3`**, and settled: it shows on the feed's link, and opening `/` clears it (d3's second note of 2026-11-03) *(uncommitted)*. Blocks, Reports' parties and sanctions stay silent; not the notification system. Built by #260, #261, #262. |
| Map #1 | Stack: NestJS, PostgreSQL, Prisma, socket.io, React, Tailwind, TanStack, Recharts, Vitest, Docker Compose. Vertical slices DB-through-UI. |
| Map #85 | Supabase provides the database, the file storage and the password check; Socket.IO stays; `make up` on any machine serves `https://localhost:8443`; hosting comes later. |
| Map #139 | PeerConnect in English, French and Arabic; Hussein owns both modules; Skill names stay English; the database stores nothing per language; switching changes language and direction at once, without a reload. |

### 2.2 Mechanisms chosen by this spec

Every item below was delegated to `/to-spec #1` by the record named, or is a gap no record filled.

| # | Mechanism | Delegated by | Chosen | § |
| --- | --- | --- | --- | --- |
| M1 | Serialization for every "one serial order" contract | ADR-0002 d4/d5/d7, 0006 d10, 0007 d1, 0008 d2/d9, 0009 d5, 0010 d2, 0011 d6/d7, 0012 d6, 0014 d4 | Every domain write runs in a `SERIALIZABLE` transaction via one Unit of Work with bounded automatic retry; each operation lists what it must read inside the transaction. | 3.6 |
| M2 | Durable Prompt publication order | ADR-0007 d1, ADR-0014 | `ReflectionPrompt.publication_order BIGINT UNIQUE`, assigned `max + 1` inside the publishing SSI tx. | 4.3.15, 8.12 |
| M3 | How an answer "establishes qualifying activity" for a Round | ADR-0007 d1 (Streak-atomicity correction) | `Post.answer_round_id`, set in the answer transaction to the Round open at its serialization point. | 4.3.16, 8.7 |
| M4 | BadgeAward contention convergence | ADR-0010 d2, ADR-0014 d7 | Insert `ON CONFLICT DO NOTHING` inside the SSI tx; conflicts surface as serialization failures and the whole event retries. A backstop no schedule reaches under M1 (§10.4). | 10.4 |
| M5 | Learning Goal integrity | ADR-0014 d3 | Composite FK `(id, learning_goal_student_skill_id) → StudentSkill(student_id, id)`; `LEARN` kind and text pairing checked in the service; removing the Goal's Skill clears the Goal. | 4.3.1 |
| M6 | Session id representation | ADR-0003 d1 vs ADR-0014 d10 (§2.3 R2) | 256-bit random token in the cookie; `Session.id` stores its SHA-256. | 5.2 |
| M7 | OAuth attempt: cookie representation, store, expiry, single use, verification order | ADR-0018 d5, ADR-0003 d10 and its note of 2026-10-08 | `a.`-prefixed token in the one cookie for `sign_in`, the session's key for `link` and `confirm`; in-memory store; 10 minutes; one live attempt per browser (a new start deletes the one its cookie names); take-and-delete, so `state` and the verifier are used once; a first 42 login's sign-up draft, and Confirm with 42's permission, kept in the same store for ten minutes; fixed verification order; PKCE S256 in addition to `state`. | 5.6 |
| M8 | Callback route | ADR-0004 amendment | `GET /api/auth/42/callback`; redirect URI `${PUBLIC_ORIGIN}/api/auth/42/callback`. | 5.6 |
| M9 | Trusted client address | ADR-0003 d10 | nginx overwrites `X-Real-IP` with `$remote_addr`; the API reads only that header; Express `trust proxy` stays off. | 5.5 |
| M10 | Request-log format | ADR-0004 d2, ADR-0018 d6 | Custom `log_format` with query-stripped path and referrer. | 3.9 |
| M11 | nginx error log | ADR-0018 *Not settled* | http-level `error_log /dev/null` (no request-context entry is ever written); main-level process log only, which never carries a request line. | 3.9 |
| M12 | Container log cap | ADR-0018 d6 | `json-file`, `max-size: 10m`, `max-file: 3` on every service. | 15.1 |
| M13 | API and database log hygiene | ADR-0018 d6 and its note of 2026-10-11 | No request logging in the API; error logs without messages from Prisma; the fallback's `db` runs with `log_error_verbosity=terse`, `log_min_error_statement=panic`, `auto_explain.log_min_duration=-1` and `log_statement=none`; the team project's `postgres` role carries `log_min_messages = fatal`, `log_min_error_statement = panic`, `auto_explain.log_min_duration = -1` and `log_statement = none` (`supabase/team-project.md`). | 3.9 |
| M14 | Seed idempotence | ADR-0017 d10 and its notes, ADR-0004 d11 | Completion record = `COMMENT ON DATABASE` with the text `peerconnect:seed:complete:fixture-v<N>`, written only after every end-state assertion passes; a run that writes first passes the guard (every Student one the seed makes, by email), then deletes our rows, every Supabase Auth user and every file in `avatars` and `evidence`; the lock and the record on a connection of the seed's own. | 14.9 |
| M15 | Seed and fixture paths | ADR-0005 d6, CONTRIBUTING rule 3 | `prisma/seed/**` and `prisma/fixtures/**`, both inside `prisma/**`. | 3.2, 17.2 |
| M16 | Prisma Config pinning | ADR-0005 d5 | Every Prisma CLI call passes `--config prisma.config.ts`; every other discovery path is forbidden and gated by three file-list patterns (`/prisma.config*`, `/prisma7.config*`, `/.config/prisma*`). | 3.2, 15.5 |
| M17 | Module format | ADR-0005 Consequences | API, seed and Prisma client are CommonJS (`moduleFormat = "cjs"`); the SPA is ESM (Vite). | 3.3 |
| M18 | Where the suite runs; what CI provisions | ADR-0016 d8, *Not settled* and their notes of 2026-10-04 | `make test` starts a copy of its own of the local fallback (Compose project `peerconnect-test`, from empty, deleted with its volumes after) and runs the suite in a fresh api dev container; tests boot the app in-process on a derived `<db>_test` database against the copy's own Supabase Auth and Storage; the upload category runs through a harness-spawned nginx using the real `proxy/snippets/api.conf`; CI runs the same copy, with no service container and `nginx` from the `dev` image, and never the boot. | 16.2 |
| M19 | Test file location and naming | ADR-0016 *Not settled* | `test/<NN>-<category>/*.test.ts`. | 16.3 |
| M20 | Clearing Compose state before a clean-clone check | ADR-0016 d5 | `make wipe` = `docker compose down --volumes --remove-orphans`, which drops the fallback's database and Storage volumes and never touches the team project. | 16.5 |
| M21 | Seed/boot regression detection before defense | Map #1 ⚠️ (open, unowned) | CI: `migrate deploy` from empty, then the seed from empty, then the seed again (must skip). | 16.4 |
| M22 | Legal page rendering | ADR-0018 d14 | Markdown bundled with Vite `?raw`, rendered by a project-owned subset renderer that fails the build on unsupported syntax; no library added. | 3.5.4 |
| M23 | Whether a Block can be lifted | ADR-0018 *Not settled* (§2.3 R1) | Yes: the blocker may delete their Block. | 11.3 |
| M24 | Text caps | ADR-0011 final freeze and every text field | §4.3 and §6.0.3 table. | 6.0.3 |
| M25 | Remove Post entry point | gap | Only as a report-group action. | 12.5 |
| M26 | Response envelope and status policy | gap; `en.subject.md:318` | Refusals reachable in normal use return 200 `{ok:false}`; protocol failures keep 4xx/5xx. | 3.8 |
| M27 | Socket client retry and origin handling | ADR-0003 d7 | `unauthorized` connect error is terminal → sign-in; transport failure triggers an HTTP probe; origin mismatch is terminal. | 7.5 |
| M28 | Seed script: transaction boundaries, selection rules | ADR-0017 d2 | Each step is one application operation (one SSI tx); deterministic per-Round script in §14.5. | 14 |
| M29 | Duplicated configuration sources | gap (user brief); ADR-0004 d8's note of 2026-10-03 | Boot-time consistency checks: `DATABASE_URL` and `SUPABASE_URL` name one target (the boot check's step 2), `DATABASE_URL` vs `POSTGRES_*` on the fallback only, `PUBLIC_ORIGIN` port vs `HTTPS_PORT`; Compose defaults equal `.env.example`. | 15.4, 15.5 |
| M30 | Upload validators | ADR-0009 d5 ("a contract, not a library") | `pngjs`, `jpeg-js`, `pdf-lib` plus structural end-marker checks. | 9.5 |
| M31 | Race-forcing test seam | ADR-0016 (tests bind outcomes), d1's note of 2026-10-04 | Named `checkpoint()` in the Unit of Work, no-op in production, barrier in tests; plus one named pause outside a transaction, in the password change between its first sign-out and Supabase's admin update, through the same `CheckpointHook`. | 3.6.4 |
| M32 | Post-commit event dispatch | ADR-0014 d8, ADR-0015 d8 | Per-attempt `afterCommit` queue flushed only after the successful commit. | 3.7 |
| M33 | Partial unique indexes on Report | ADR-0014 top note | Prisma `partialIndexes` preview (Prisma ≥ 7.4) with a defined raw-SQL fallback. | 4.4 |
| M34 | Production security headers | ADR-0018 d5 (structural) | CSP `default-src 'self'` family on the base path only; `nosniff` on files; **no HSTS**. | 3.10 |
| M35 | Sign in with 42's routes and outcomes beyond start and callback | ADR-0003 d10's and d11's notes of 2026-10-08 ("for example by its own route") | Intents `sign_in`, `link`, `confirm`; `GET /api/auth/42/draft`, `POST /api/auth/42/signup`, `POST /api/auth/42/disconnect`, `POST /api/auth/42/password`; the callback's outcomes `?oauth=failed`, `removed`, `suspended`, `in_use`, `connected`, `confirmed`; codes `oauth_failed`, `forty_two_connected`, `forty_two_not_connected`, `confirmation_required`. | 5.6, 6.15 |
| M36 | Sign-in's refusal codes | ADR-0003 d10's note of 2026-10-02, whose ticket left the names to this spec | `no_account`, `password_incorrect`, `account_removed`, `account_suspended`; `invalid_credentials` is retired. | 5.1, 6.15 |
| M37 | Whether a wrong current password counts toward the throttle | gap, found in review of the Sign in with 42 notes on 2026-10-09 and left to §5.5 | It counts, as a failed attempt under the client address and the signed-in Student's own email, for the password change, Connect 42's start and Disconnect 42; the new password after Confirm with 42 checks no password and is not throttled. | 5.5 |
| M38 | How the legal check finds a plain space before French punctuation | gap; Kamel's note on [#146](https://github.com/ahmadmnsur/ft_transcendence/issues/146#issuecomment-6199250142)'s approval, for the legal-pages ticket | It reads each `.fr.md` file's parsed text, not its raw lines, so a table's delimiter row (`\| :--- \|`) never fails it; code spans and link targets are skipped, and a line break inside a paragraph counts as a plain space. | 3.5.4 |

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
team project, when .env holds its values:
api ──postgresql + TLS──▶ aws-<n>-eu-central-1.pooler.supabase.com:5432 (session pooler, Frankfurt)
api ──https──▶ https://<ref>.supabase.co (Supabase Auth and Storage, server-side keys)
local fallback, otherwise:
api ──postgresql──▶ db:5432 (Supabase's Postgres image, internal network only)
api ──http──▶ api-gw:8000 (Supabase's gateway ─▶ auth:9999, storage:5000)
api ──https──▶ api.intra.42.fr (OAuth token exchange and /v2/me only, when configured)
```

- **`make up` runs on the team Supabase project when `.env` holds its values, and on the local
  fallback otherwise** (ADR-0004's top note of 2026-10-03, ADR-0019 d3): the same `api` code, one
  `DATABASE_URL` and one `SUPABASE_URL` naming one target (§15.5). The browser never talks to
  Supabase on either target: every byte it receives comes through `proxy` (ADR-0019 d1).
- **Six Compose services**: `proxy`, `api`, and the fallback's `db`, `auth`, `storage` and `api-gw`
  (ADR-0004 d1's notes of 2026-10-03 and 2026-10-04; §15.1). The fallback's four start on both
  targets and sit unused on the team project. Only `proxy` publishes ports:
  `${BIND_ADDRESS:-127.0.0.1}:${HTTPS_PORT:-8443}:8443` and `${BIND_ADDRESS:-127.0.0.1}:${HTTP_PORT:-8080}:8080`
  on the base path, on loopback unless a member's `.env` sets `BIND_ADDRESS`; the dev overlay replaces
  them with `127.0.0.1:8081:8081` (§15.2). No other service publishes anything, so nothing of the
  fallback is reachable from outside the machine.
- **One origin per path**, structural: `https://localhost:8443` (base, `wss` socket) and
  `http://localhost:8081` (dev overlay, `ws` socket and HMR). `PUBLIC_ORIGIN` holds the one value
  for the running path; no code hardcodes either string (ADR-0004 Consequences). A member who opens
  `make up` to the local network sets it to `https://<the laptop's IP>:8443`, and everyone, that
  member included, opens that address (ADR-0004 d5's note of 2026-10-25).
- Every subresource a PeerConnect page loads (script, style, font, image, frame, `fetch`, socket)
  comes from PeerConnect's own origin. The only third-party traffic is Sign in with 42, when a
  Student chooses it: the browser's top-level navigation to 42's authorize page and 42's redirect
  back, for Sign in with 42, Connect 42 and Confirm with 42 alike, and the API's server-side token
  exchange and `/v2/me` call (ADR-0018 d5 and its note of 2026-10-08). The API's calls to Supabase
  are server-side too, and the browser never sees them.

### 3.2 Repository layout (fixed paths)

The repository root is the API's npm package. This keeps `prisma/`, the root `prisma.config.ts` and
the one `package.json` that constrains `prisma`/`@prisma/client` exactly where ADR-0005, the PR
template and `CONTRIBUTING.md` already name them.

```
/                              NestJS API package (package.json, package-lock.json, tsconfig*.json, nest-cli.json)
├── src/                       API source (§3.4)
│   ├── generated/prisma/      generated Prisma client (gitignored; `prisma generate` output)
│   └── shared/                shared with web/: field limits, enum mirrors (§6.0.3), `fold-name.ts` (§4.3.1)
├── test/                      the Vitest suite, test/<NN>-<category>/*.test.ts (§16.3)
│   └── harness/               in-process app boot, test DB, nginx harness, fixtures loader
├── prisma/                    ── SCHEMA GATE (ADR-0005 d5) ──
│   ├── schema.prisma
│   ├── migrations/
│   ├── seed/                  the seed: entry `main.ts` and every seed-only module (M15); its first step sets the buckets
│   │   └── assets/            the two seeded files: avatar.png, evidence.pdf
│   ├── reset/                 `make reset-team` and `make reset-local` (§15.6)
│   └── fixtures/              `cohort.ts`, the shared fixture module (ADR-0016 d3)
├── prisma.config.ts           the only Prisma Config (gate)
├── supabase/                  ── SCHEMA GATE (ADR-0005 d5's note of 2026-10-10) ──
│   ├── README.md              what the folder holds; inside the gate, no clean-clone check
│   ├── db/                    the fallback database's start-up SQL (the Auth and Storage roles' passwords, the JWT expiry)
│   ├── api/                   the fallback gateway's routes (Envoy)
│   ├── prod-ca-2021.crt       Supabase's CA certificate, which the team connection is verified against (§15.5)
│   └── team-project.md        the record of the team project's dashboard settings (§17.2); Markdown, no clean-clone check
├── vitest.config.ts
├── Dockerfile                 api image: targets `build`, `runtime`, `dev`
├── web/                       React SPA package (own package.json)
├── proxy/                     nginx: Dockerfile (targets `runtime`, `dev`), nginx.conf,
│   ├── snippets/api.conf      the /api and /socket.io locations shared by every server block and the test harness
│   ├── templates/             base-path server blocks (envsubst: PUBLIC_ORIGIN)
│   └── templates-dev/         dev-overlay server block
├── compose.yaml               base (top-level `name: peerconnect`); gate, since it holds the fallback's `GOTRUE_*` settings
├── compose.dev.yaml           dev overlay (overrides only); gate
├── compose.local.yaml         overlay giving `api` and `proxy` `.env.example` alone (`make local`, `make dev`, `make test`); gate
├── Makefile                   convenience only (§15.6)
├── .env.example               the twenty-eight entries, all the fallback's (§15.4); `.env` gitignored
├── .github/workflows/ci.yml   the one advisory workflow (§16.4)
├── .github/workflows/no-bot-text.yml  the required bot/AI-text check on PRs (§17.4)
├── README.md                  critical path (§17.5)
└── docs/                      adr/, agents/, legal/, research/, spec.md
```

The API build compiles from the repository root, so `dist/` mirrors the tree: `dist/src/main.js` and
`dist/prisma/seed/main.js` (§14.1, §15.5). The build tsconfig sets `"rootDir": "."` explicitly, so
the layout never depends on which files the build happens to include. `nest-cli.json` therefore sets
`entryFile: "src/main"`; Nest's default `dist/main.js` never exists, and the dev overlay's
`nest start --watch` (§15.2) runs the entry file. The build copies no assets. The seed reads its two
files from `prisma/seed/assets/`, resolved against the working directory, which is always the
repository root: `/app` in every api image, the checkout in CI (§16.4). The api runtime image copies
`prisma/` whole, which `migrate deploy` needs anyway.

`.gitignore` covers `.env`, `.env.*` except `.env.example` (so a second file such as `.env.team`
cannot be committed by mistake, ADR-0004 d8's note of 2026-10-03), `node_modules/`, `dist/`,
`src/generated/`, `web/dist/`. `.dockerignore` excludes `.env`, `.git/`, `node_modules/` (at any
depth), `dist/`, `web/dist/` and `src/generated/`; the images `COPY` named paths only, so no other
`.env.*` file reaches one. **No Prisma Config file other than the root `prisma.config.ts` may
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
| DB driver | `@prisma/adapter-pg` + `pg`, `new PrismaClient({ adapter })`; the pool capped at 5 connections, and on the team project TLS verified against `supabase/prod-ca-2021.crt` (§15.5) | ADR-0005 Consequences, ADR-0004 d11's note |
| Database | PostgreSQL 17 from Supabase: the team project's, in Frankfurt (`eu-central-1`), through its session pooler; on the fallback, `supabase/postgres:17.6.1.136` | map #85, ADR-0004 d1 and d11's notes |
| Passwords | Supabase Auth (bcrypt, cost 10), called from the API only; on the fallback `supabase/gotrue:v2.196.0` | ADR-0003 d3's note |
| Files | Supabase Storage, two private buckets, called from the API only with the secret key; on the fallback `supabase/storage-api:v1.74.0`, behind Supabase's gateway (`envoyproxy/envoy:v1.39.1`) | ADR-0009 d2's note, ADR-0004 d1's note |
| Validation | `class-validator` + `class-transformer` via a global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) | `en.subject.md:381` |
| Realtime | `socket.io` 4 via `@nestjs/websockets` + `@nestjs/platform-socket.io`; `socket.io-client` 4 in the SPA and tests | map, ADR-0003 d7 |
| Uploads | Multer memory storage (bundled with platform-express); `pngjs`, `jpeg-js`, `pdf-lib` for byte validation (M30) | ADR-0009 d5 |
| Cookies | `cookie` (parse/serialize) for HTTP and the socket handshake | ADR-0003 d1 |
| Config | `dotenv` imported by `prisma.config.ts` only, and so a **runtime** dependency like `prisma` (§15.5); the app reads `process.env` | ADR-0005 Consequences |
| Frontend framework | React 19 + Vite (current major at scaffold) + `@vitejs/plugin-react` | map |
| Styling | Tailwind CSS 4 | map, `en.subject.md:369` |
| Frontend data | TanStack Query 5 (server state), TanStack Router 1 (routing, search params), TanStack Table 8 (Users table, search results) | map, ADR-0014 Consequences |
| Charts | Recharts 3, `/admin/analytics` only | ADR-0015 d7 |
| Translation | **No package**: a typed dictionary of the SPA's own over `Intl`, so §3.3's PR sentence for a runtime library does not apply (§3.5.5) | ADR-0020 d3 |
| Fonts | The system stack; for Arabic characters only, Noto Sans Arabic 2.012, one woff2 file cut to the Arabic blocks and to weights 400–600, bundled and served from PeerConnect's origin, under the SIL Open Font License 1.1 (§3.5.3) | ADR-0020 d8, ADR-0018 d5 |
| Tests | Vitest (current major), `unplugin-swc` + `@swc/core` for the API, `supertest`, `socket.io-client` | ADR-0016 d2 |
| Proxy | nginx stable, Alpine image, exact tag pinned in `proxy/Dockerfile` at scaffold | ADR-0004 |
| Orchestration | Docker Compose ≥ 2.24.4 (`env_file.required` from 2.24.0; `!override`, used by the dev overlay, only from 2.24.4) | ADR-0004 d8 |
| CI | GitHub Actions, one advisory workflow; plus one required check that tests nothing (§17.4) | ADR-0016 d8 |

> **Updated 2026-11-02** (ADR-0004's note of 2026-10-31): the floor is Docker Compose ≥ 2.27.2, since
> `make local`, `make dev`, `make test` and `make reset-local` check `.env` with
> `docker compose config --environment`, which Compose has only from 2.27.2. This replaces 2.24.4
> here, in §15.2 and in §17.5.

**Not in the stack, by rule:** JWT libraries, Passport, Redis or any shared store, a Markdown
library (M22), a translation package such as react-intl, i18next or Lingui (ADR-0020 d3), an icon
or font package fetched from a CDN, analytics SDKs, `mkcert`, Caddy,
`@node-rs/argon2`, any `@supabase/*` package in `web/` and any `VITE_SUPABASE_*` variable (ADR-0019
d1), and Supabase's Studio, Realtime, REST service, Edge Functions, image resizer and pooler
containers (ADR-0004 d1's note).

### 3.4 Backend module boundaries

NestJS modules under `src/`. Controllers and the gateway are thin: they parse, validate the DTO,
resolve the actor, call **one** service method, and shape the envelope. **Every service method that
acts for a signed-in Student takes an `Actor` (`{ studentId, sessionHash }`, `sessionHash` null for
an actor the seed or a test constructs). One that writes re-reads the actor's current role and
sanction flags inside its own SSI transaction and refuses if they no longer allow the action** — the
HTTP guard is a fast pre-check, never the authority for a write (ADR-0003 d5, ADR-0011 d7). A
read-only method runs outside the Unit of Work (§3.6.2) and relies on the guard's fresh per-request
read of role and flags (§5.3). Three kinds take no `Actor`: the operations that establish or resolve
one — `signup`, `login`, `start42` with `sign_in`, `complete42`, `signup42`, `resolveSession` — each reading the Student row it
acts on itself, inside the transaction when it writes (§5.1, §5.3, §5.6); pure functions — the matcher engine, the byte
validators, Level arithmetic; and the `tx` helpers, which run inside a caller's transaction that
has already read its actor. The seed and the tests call the same service methods, with a
constructed `Actor` where the method takes one.

| Module | Owns | Public operations (service level) |
| --- | --- | --- |
| `core` | env validation and the boot check (§15.4, §15.5), Prisma client, Unit of Work (§3.6), `RealtimePublisher` port (§3.7), envelope + exception filter (§3.8), guards (session, role, JSON-mutation, upload-CSRF), throttle store (§5.5), logger (§3.9), the Supabase Auth and Storage clients (server-side, §5.1, §9.8) | — |
| `auth` | `Session`, the OAuth attempt store (attempts, sign-up drafts, Confirm with 42 permissions), the password check | `signup`, `login`, `logout`, `resolveSession`, `changePassword`, `start42`, `complete42`, `signup42`, `disconnect42`, `setPasswordAfter42` |
| `students` | `Student` profile fields, `StudentSkill`, Learning Goal, search, `Avatar` | `getProfile`, `updateOwnProfile`, `setSkills`, `setLearningGoal`, `clearLearningGoal`, `search`, `putAvatar`, `deleteAvatar` |
| `files` | byte validation, file serving, the buckets and the cleanup (§9.8) | `validateAvatar`, `validateEvidence`, `readAvatar`, `readEvidence`, `ensureBuckets`, `cleanup` |
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
`/sign-in`, `/sign-up`, `/privacy`, `/terms`; the 42 sign-up form is `/sign-up?from=42`, the same
route (§5.6 B). Every other route requires a session; the router's
`beforeLoad` redirects to `/sign-in` when `GET /api/session` reports `authenticated: false`. Role
routes redirect a Student without the role to `/`; the server enforces the same rule again.

> **A fifth signed-out page, 2026-10-25** ([Landing: what PeerConnect is, at / for a signed-out visitor](https://github.com/ahmadmnsur/ft_transcendence/issues/222);
> ADR-0018 d12's note of 2026-10-25). This read "exactly four". **`/` signed out is the landing
> page**: what PeerConnect is, the Match loop and the way in, Sign up and Sign in. It shows no
> data, and any example on it uses invented names and says so. `/` signed in is still the feed.
> `/` alone changes: every other signed-in route still redirects a signed-out visitor to
> `/sign-in`, and so do a 401 (§3.8.2) and Sign out.

| Route | Who | Surface |
| --- | --- | --- |
| `/` | signed-in | Feed (live via `post:created`) |
| `/` | signed out | Landing page: what PeerConnect is, the Match loop, Sign up and Sign in; no data (2026-10-25) |
| `/prompts`, `/prompts/:promptId` | signed-in | Live Prompt with answer form (hidden for `ADMIN`), history, answers |
| `/match` | signed-in | Current Match: partner, role, Score + explanation or "Matched by an Admin", Mission, accept/decline, Review entry |
| `/matches`, `/matches/:matchId` | the pair | Own Match history; completed Match shows Learning Outcome, Evidence (preview), Private Feedback to its readers |
| `/matches/:matchId/review` | the Mentee | Review form, then earn panel, then Evidence upload |
| `/feedback` | signed-in | Private Feedback received (Mentor's private route, ADR-0013 d5) |
| `/students`, `/students/:studentId` | signed-in | Search (filters, sort, pagination); profile |
| `/me` | signed-in | Edit profile, Skills, Learning Goal, avatar, email, password; Connect 42, Disconnect 42, Confirm with 42 and the new password after it, when 42 is configured (§5.6); own progress |
| `/friends` | signed-in | Friends with Presence, incoming/outgoing requests, Blocks |
| `/messages`, `/messages/:peerId` | signed-in | Threads with unread counts; conversation |
| `/leaderboard` | signed-in | Top ten + own pin |
| `/rules` | signed-in | Static XP table, Level bands, Badge conditions, Level-10 cap (ADR-0010 d7) |
| `/moderation` | `PEER_MODERATOR` | Eligible open Post-report groups (ADR-0011 d7) |
| `/admin` | `ADMIN` | Admin tools: one link to each Admin page below, named by that page's title |
| `/admin/users`, `/admin/users/:studentId` | `ADMIN` | Users table and detail with state-specific actions |
| `/admin/rounds`, `/admin/rounds/:roundId`, `/admin/matches/:matchId` | `ADMIN` | Open/close, Matches, unmatched list, hand-made Match, full Match detail |
| `/admin/prompts` | `ADMIN` | Publish; history |
| `/admin/reports` | `ADMIN` | Open queue (with reporters) and resolved audit |
| `/admin/analytics` | `ADMIN` | Learning Analytics (§13) |

The **footer shows on every route**, signed in or out, with links to `/privacy` and `/terms`
(ADR-0018 d12). Student surfaces never show a Peer Moderator label; an Admin carries an "Admin" label
wherever another Student sees them (ADR-0018 d4). **The language switcher sits at the end of the
shared header, on every route**, signed in or out, the four signed-out routes and the error page
included (ADR-0020 d6, §3.5.5).

> **2026-10-25:** the signed-out pages are five, with the landing page at `/` (the note above the
> table); the footer and the switcher show on it too.

> **The signed-in header, 2026-10-24.** It showed one button for every page: ten for a Student,
> eleven for a Peer Moderator and fifteen for an Admin. It now holds three parts. **A bar of links**
> under the header's line: the feed, Match, Reflection Prompts, Direct Messages, Students and
> Friends, plus *Moderation* for a Peer Moderator and one *Admin tools* link to `/admin` for an
> Admin. The current page's link is marked, `/admin` on every `/admin/…` page.
> **An account menu**, a button named by the Student, holding My profile, Private Feedback,
> Leaderboard, Rules and Sign out. **The language switcher**, still at the end of the line. Below
> `md` one Menu button shows the bar's links and the account menu's under the header's line. Each
> panel closes on Escape, on a press outside it, when a page opens and when the window crosses
> `md`. A new Admin page adds a link on `/admin`, not in the header. The session read only decides
> which links show; the route guards and the API check the role again.

> **The header stays on screen, 2026-10-25.** Signed in or out, it stays at the top of the window
> while the page scrolls under it. Whatever the browser scrolls into view, a focused field, a notice
> or the heading a `#` link opens, stops below it, not behind it. The account menu and, below `md`,
> the Menu's panel each scroll on their own when taller than the window under the header.

> **The signed-out header below `md`, 2026-11-02.** It wrapped onto two lines on a phone. Below
> `md` its line now holds the logo, a Menu button and the language switcher. The Menu's panel lists
> Sign in and Sign up, the current page marked, then the theme switch, and closes like the signed-in
> one. From `md` the line is unchanged: Sign in, Sign up, the theme button and the language switcher.

> **New dots, 2026-11-03 ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262); ADR-0021 decisions 1–3)** *(uncommitted)*: a link in the header shows a
> New dot when something waits on its page and is newer than this sign-in's last opening of it:
> the feed (another Student's Like on one of your Posts), Match, Reflection Prompts, Direct
> Messages, Friends, and *Moderation* or *Admin tools* (a Report you can act on); in the account
> menu, Private Feedback. Students never has one. The account menu button shows one when Private
> Feedback does, the phone Menu button when any link in its panel does, and the `/admin` page's
> Reports entry when the Admin's link does. The browser tab's icon swaps `favicon.svg` for
> `favicon-dot.svg` while any link has one. These pages open their dot when they show, and again
> when it comes back while they are on screen: `/`, `/messages` and each thread, `/match`,
> `/friends`, `/prompts` and the live Prompt's page, `/feedback` and a Match's page (§6.7's note
> of the same day), `/moderation` and `/admin/reports`. All of them read one query,
> `GET /api/me/new-dots` (§6.1's note of the same day); the route guards and the API still decide
> what each page shows.

#### 3.5.2 Data, validation and state

- All server state through TanStack Query; the socket only invalidates or inserts (§7.4). No global
  store beyond Query and the router.
- **Every form validates on the client with the same limits the server enforces**, from
  `src/shared/limits.ts` imported through a Vite alias. The client pre-checks everything it can know
  (lengths, formats, file size and declared type) so that normal use never reaches a server
  validation error (§3.8.2). Every form sets `noValidate`, so the browser draws no error bubble of
  its own and every form error is PeerConnect's own translated text (ADR-0020 d2).
- Uploads use `XMLHttpRequest` for `upload.onprogress` (progress indicator, `en.subject.md:546`) and
  send `X-PeerConnect-CSRF: 1`.
- Browser storage: `localStorage` may hold interface preferences only (e.g. a collapsed panel, the
  language choice under `peerconnect.language`, §3.5.5, or the theme under `peerconnect.theme`,
  §3.5.3). Never a token, never Student data, never OAuth state (ADR-0018 d5).
- **The browser never talks to Supabase.** `web/` has no `@supabase/*` package, and no Supabase URL
  or key reaches the bundle: there is no `VITE_SUPABASE_*` variable (ADR-0003's top note of
  2026-09-30, ADR-0019 d1). Every file the SPA shows comes from PeerConnect's own file routes
  (§6.3).
- **Names and text in any direction** (from the database's French and Arabic settlement, map #85;
  ADR-0020 d4 and d7): screens show a Student's display name through `PersonName`, inside `<bdi>`,
  wherever markup can go; where it cannot (`alt`, `title`, `aria-label`, `<option>`), the name is
  plain text between U+2068 and U+2069, from `PersonName`'s plain-text helper, never from
  `displayName` itself. Text a person wrote that is shown at length (Posts, messages, Reviews, the
  Learning Goal sentence, Report text, Prompts) gets `dir="auto"`, and `TextField` and `TextArea`
  default to `dir="auto"`, so Arabic aligns right while it is typed. An empty field follows the
  page's direction, so its placeholder starts on the page's side; once typed, the text follows its
  own first letter.

  > **Refined 2026-10-18** by [Languages: the design system in French and Arabic, right to left](https://github.com/ahmadmnsur/ft_transcendence/issues/173),
  > its criterion 6: `TextField` and `TextArea` have `dir="auto"` only while they hold text, read
  > from the element after each render, on each input and after a form reset. An empty one has no
  > `dir`, so it takes the page's direction. In Chrome 155 and Firefox 157 the CSS-only ways
  > failed: one left an empty field's caret on the left, the other made Firefox hide a focused
  > empty field's placeholder.
- **Skill names keep their direction** (ADR-0020 d4). Inside a message, the dictionary isolates every
  value (§3.5.5). Outside one, `SkillName`, a `<bdi>` like `PersonName`, shows every Skill name where
  markup can go: inside `SkillChip`, in a table cell, in a heading. Where it cannot (`<option>`,
  `title`, `aria-label`) and on the chart's axis, the name sits between U+2068 and U+2069. So `C++`
  never shows as `++C` on an Arabic page.
- **Every text the SPA shows on screen, or gives to a screen reader, is translated** into French and
  Arabic, on every route, the Peer Moderator and Admin screens included (ADR-0020 d2): sentences,
  labels and buttons; fixed text stored as codes (Mission sentences, Badges, Report reasons and
  states, Match statuses, Role names, the Admin label, the insight sentences, the Score
  explanation); the validation messages for the limits in `src/shared/limits.ts`; headings,
  including those only screen readers hear, and `aria-label`, `alt`, `title` and `placeholder`; the
  chart's title, axis titles, legend and tooltips (§13.4); `/rules`; dates and relative times; and
  the page name `PageTitle` writes before `· 42 PeerConnect`. **Never translated:** the product name,
  Skill names and display names; text for developers (logs, the dev proxy's message, the README,
  `docs/`, code comments, the API's `message`); the seed's Posts, Direct Messages and Reflection
  Prompts; and what the browser or 42 draws. A Mission's French or Arabic sentence is a rewording,
  bound by ADR-0012 d1's note, and the report form's reason labels use each language's words of the
  Terms (ADR-0011 d4's note). Until the foundation build ticket creates `web/src/i18n/`, a slice
  keeps its English in one object per area shaped like the dictionary, and its French and Arabic
  come when that object moves (§3.5.5; `CONTRIBUTING.md` → *Before the foundation*).

  > **Updated 2026-10-25** (map #1's note of this date): the product a visitor sees is named
  > **21 Beirut**. `PageTitle` writes the page name before `· 21 Beirut`, the header draws the name
  > as a logo labelled with it, and the Privacy Policy and the Terms use it (§3.5.4). The name is
  > still never translated. In the SPA's code one constant, `BRAND`, holds it, beside `index.html`'s
  > title for the moment before the app mounts, and a text that names it takes it as the value
  > `{brand}`, which the dictionary isolates (§3.5.5). Text for developers keeps the earlier name,
  > PeerConnect: this spec, the ADRs and the rest of `docs/` but the two legal pages, code comments
  > and the API's `message`. The README does not: the subject asks its Description for a clear name
  > for the project (`document/en.subject.md:1240`), and the evaluator reads it before seeing the
  > site, so the Description names the project 21 Beirut and can say PeerConnect was its earlier
  > name (§17.5, #71).
- **Errors by code, and the tombstone** (ADR-0020 d2). The SPA never displays the API's `message`;
  §3.8.1 stays as written. It picks its text by `code` from one map typed over every `ErrorCode` and
  `RefusalCode`, so a code without text fails `tsc`, and an unknown code, or a response that is not
  the envelope (such as nginx's 502 page), shows a translated "Something went wrong". When a
  `StudentRef` has `removed: true` (§6.0.1), the SPA ignores its `displayName` and renders its own
  translated tombstone, through `PersonName` or its plain-text helper.
- **Nothing is joined or typed in code** (ADR-0020 d4). A sentence with values is one message with
  placeholders (§3.5.5), never pieces joined in code, so the merged `SkillChip`, `Banner`,
  `Pagination`, `DataTable`, `FileDrop` and `PageTitle` are rewritten where they join pieces.
  Numbers, dates, times and lists are written by `Intl` with the locale table (§3.5.5): a percentage
  with `style: 'percent'`, a file size with `style: 'unit'`. The merged code that writes a number by
  hand changes: `Pagination`'s page buttons, `ProgressBar`'s default value, `FileDrop`'s upload
  status and its `formatBytes`, and `authCopy`'s limits, which become placeholders filled from
  `LIMITS`. A text the SPA shows is read from the dictionary, or before the foundation from its
  area's English object, and never typed into a component.
- **Mirroring: flow-relative classes only, and the build refuses a left or right class** (ADR-0020
  d7). The SPA writes `ms-`/`me-`, `ps-`/`pe-`, `inset-s-`/`inset-e-`, `text-start`/`text-end`,
  `rounded-s-`/`rounded-e-`, `border-s`/`border-e` and `float-start`/`float-end`, which follow their
  own element's direction. `rtl:` and `ltr:` are used only where no flow-relative class exists
  (`origin-`, a gradient's direction, an icon's flip, §3.5.3). They follow the page's direction, and
  in the build its `lang` too, so they are never used for content whose direction can differ from the
  page's: a name in `<bdi>`, text with `dir="auto"`, the English legal page inside an Arabic page.
  - **The check.** The physical-class scanner lives in `web/` and runs in `npm --prefix web run
    build`, beside the legal check, so CI and every `make up` stop on a left or right class. A class
    behind `rtl:` or `ltr:` passes. A hit in a comment is printed and does not fail. A line the
    scanner lists for a person (an `@source`, or CSS from a file it does not read) fails the build
    until the PR names that line in the check's own short list. The scanner loads TypeScript and
    PostCSS from `web/node_modules`, so `postcss` is a `devDependency` of `web/`. It cannot see a
    style object in a script or JavaScript that assumes left to right: review and the Arabic pass
    (§16.7) look for those.
  - **The merged code that changes:** the 15 physical uses (`pl-6` becomes `ps-6` in `Checkbox`'s
    hint and the legal lists; `pl-3 pr-1` becomes `ps-3 pe-1` in `SkillChip`; `text-left` and
    `text-right` become `text-start` and `text-end` in `DataTable` and the legal tables; `right-px`
    and `rounded-r-lg` become `inset-e-px` and `rounded-e-lg`; `bg-linear-to-l` gains
    `rtl:bg-linear-to-r`; `origin-left` gains `rtl:origin-right`, so `ProgressBar` fills from the
    right in Arabic; the skip link's `focus:left-4` becomes `focus:inset-s-4`). `Tabs`' arrow keys
    follow the screen: ArrowLeft moves to the tab on the left, which is the next tab in Arabic.

    > **Refined 2026-10-18** by [Languages: the design system in French and Arabic, right to left](https://github.com/ahmadmnsur/ft_transcendence/issues/173),
    > its criterion 4: the two with no flow-relative form are written
    > `ltr:bg-linear-to-l rtl:bg-linear-to-r` and `ltr:origin-left rtl:origin-right`, since
    > *The check* above passes a class only behind `rtl:` or `ltr:`.
  - **Tables** run right to left in Arabic; every cell's text sits at its start, and an
    `align: 'end'` column puts its header and its numbers on the same side. The "more columns" fade
    sits on the end side and shows while more columns lie that way: its scroll math measures from
    the start, since `scrollLeft` is negative right to left, and runs again when the direction
    changes, since Firefox fires no `scroll` event then.
  - **The page's own scroll bar** stays where the browser draws it, and the README's browser
    limitations can name it (§16.7).
- **Arabic and French text rules** (ADR-0020 d8). PeerConnect's own Arabic carries no vowel marks
  (U+064B–U+0652), and `tsc` rejects one in an Arabic text; text a person writes keeps its marks.
  Letter spacing (`tracking-*`) is reset on Arabic text. Arabic emphasis is bold, never italic.
  French puts a no-break space before `: ; ! ?` and inside `« »` (U+202F before `; ! ?`, U+00A0
  before `:` and inside `« »`), and `tsc` rejects a French text with a plain space there. The
  foundation build ticket adds the two `tsc` checks and names them in `CONTRIBUTING.md` → *Text ships
  in three languages*.

  > **Refined 2026-10-18** by [Languages: the design system in French and Arabic, right to left](https://github.com/ahmadmnsur/ft_transcendence/issues/173),
  > its criterion 11: Arabic emphasis is upright at weight 600 (`font-semibold`), the heaviest
  > weight the bundled font is cut to (§3.5.3) and the one the SPA's bold text already uses.
- Responsive from 360 px width upward; all layouts are Tailwind utilities.

#### 3.5.3 Design system (Minor `:526`)

Project-owned, in `web/src/design/`: a colour palette as Tailwind theme tokens (primary, neutral,
success, warning, danger, each with a 50–900 scale), a type scale on the system font stack, and an
icon set of hand-authored inline SVG React components (no icon package, no CDN).

- **One bundled font, for Arabic characters only** (ADR-0020 d8; ADR-0018 d5 bundles fonts). Noto
  Sans Arabic 2.012, the variable font cut to the Arabic blocks and to weights 400–600, is one woff2
  file served from PeerConnect's own origin, which the CSP's `font-src 'self'` allows (§3.10). It is
  declared with a `unicode-range` on those blocks in front of the system stack, so English and French
  keep the system stack, and a page fetches the file only when it shows an Arabic character: an
  Arabic page, or an English or French page showing an Arabic name or Post. It is under the SIL Open
  Font License 1.1, with no Reserved Font Name; the cut file is a Modified Version, so it keeps its
  copyright notice, and `OFL.txt` ships beside it. Its Arabic-Indic digits share one width, so
  `tabular-nums` lines numbers up in tables.

  > **Measured 2026-10-18** by [Languages: the design system in French and Arabic, right to left](https://github.com/ahmadmnsur/ft_transcendence/issues/173):
  > the cut file is 82,876 bytes. Firefox 157 fetches it on English and French pages too, since
  > every page shows the switcher (§3.5.5): Tailwind's base styles give its `<select>` the page's
  > font, and Firefox sizes the select from all its options, `العربية` included. Chrome 155
  > fetches it only for a page that shows Arabic. It stays so, because the bundled file also draws
  > the switcher's `العربية` on a computer with no Arabic font.
- **Arrows flip in Arabic, and nothing else does** (ADR-0020 d7). An icon that points somewhere, such
  as the `Pagination` chevrons, is marked where it is drawn as one that flips, for example by a prop
  on `IconBase` that adds `rtl:-scale-x-100`. The check mark, the search glass, the info, alert and
  close signs, the vertical sort and upload arrows, the star, trophy and user, the speech bubble,
  the flag and the file stay as drawn, and the `Button` spinner keeps turning clockwise. *(Added
  2026-10-24:)* so do the header's menu lines.
- **A light and a dark theme** *(added 2026-10-31)*. Every colour role has a dark value beside its
  light one in `tokens.css`, set under `:root[data-theme='dark']` with `color-scheme: dark`, so the
  browser's own controls and scroll bars turn dark too. Two roles join them: `ink-accent`, the teal
  of text, icons and chart marks, and `line-accent`, the teal of borders and underlines. In dark,
  the neutral scale runs from dark to light, and each colour scale's 50–500 steps become dark tints
  and its 900 a light text, so every tint keeps its text; its 600–800 steps keep their values, so
  white text on them keeps its ratio. Every text and boundary pair the components use meets WCAG AA
  in both themes (text 4.5:1, boundaries and the focus ring 3:1).
  - **How it is chosen.** A first visit follows the computer's setting (`prefers-color-scheme`), and
    keeps following it while the page is open, until a choice is made. The header's moon or sun
    button, beside the language switcher, switches the theme and stores the choice under the
    `localStorage` key `peerconnect.theme`, as `light` or `dark`; any other stored value is
    ignored. A choice made in one tab reaches the browser's other open tabs at once. Like the
    language, the choice belongs to the browser, not the account. Signed in below `md`, the switch
    is an item of the phone menu instead, so the header's line keeps the logo's width. *(Signed out
    too, since 2026-11-02, §3.5.1.)*
  - **No flash.** `web/public/theme.js`, a small script at the top of `web/index.html`, sets
    `data-theme` on `<html>` before anything is drawn, so a stored choice never shows the other
    theme first, and the SPA starts from the theme it set. It is served from PeerConnect's own
    origin, which the CSP's `script-src 'self'` allows (§3.10).
  - The default avatar has a dark version, and the sun and the moon stay as drawn right to left.

**At least these ≥ 10 reusable components**, each used by at least two screens: `Button`,
`IconButton`, `TextField`, `TextArea`, `Select` (its label can be hidden visually while screen
readers still read it, for the language switcher, §3.5.5), `Checkbox`, `Card`, `Avatar` (with
default image), `RoleLabel` (Admin chip), `PersonName` (a display name inside `<bdi>`, with a
plain-text helper, §3.5.2), `SkillName` (a Skill name inside `<bdi>`, §3.5.2), `SkillChip`, `Modal`,
`Tabs`, `DataTable` (TanStack Table wrapper with sort and pagination), `Pagination`, `ProgressBar`,
`FileDrop` (drag/drop, type and size pre-check, preview, progress), `EmptyState`, `Banner`. A
favicon ships in the bundle. Once the foundation exists, every text they show comes from the
dictionary (§3.5.5).

> **One more component, 2026-11-03 ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262); ADR-0021 decision 1)** *(uncommitted)*: `NewDot` draws every
> New dot, a red `danger-500` dot of 8 px after the link's text, hidden from screen readers, while
> the link's name gains "new", in three languages. `web/public/favicon-dot.svg` is the favicon
> with that dot, visible on a light and a dark tab bar.

#### 3.5.4 Legal pages (M22)

`/privacy` and `/terms` render `docs/legal/privacy-policy.md` and `docs/legal/terms-of-service.md`
— the canonical text (ADR-0018 d14) — imported with Vite's `?raw`, so the text is inside the bundle
and nothing is fetched. Their French and Arabic translations, once written, are four more files
beside them, `privacy-policy.fr.md`, `privacy-policy.ar.md`, `terms-of-service.fr.md` and
`terms-of-service.ar.md`, imported, rendered and checked the same way (ADR-0018 d14's note of
2026-10-13; ADR-0020 d9). A project-owned renderer (`web/src/legal/markdown.tsx`) supports exactly
the constructs the two files use: ATX headings, paragraphs, `**bold**`, `*italic*`, inline code, `-`
bullet lists (including one nested level and indented continuation lines, as the Terms' sanctions
list has), `1.` numbered lists, pipe tables with a header row, `[text](url)` links, and a bracketed
`[…]` not followed by `(` as literal text (the Privacy Policy's 42-field marker). It escapes
all text. **An unsupported construct throws during `vite build`** (the renderer runs over both files
in a build-time check), so a page can never silently mis-render. No Markdown library is added.

**In three languages** (ADR-0018 d14's and d15's notes of 2026-10-13; ADR-0020 d9):

- **English until the translations merge.** `/privacy` and `/terms` follow the chosen language like
  every other page, signed out included. Until a page's French and Arabic files exist, it shows the
  English file in every language, in an article with `lang="en"` and `dir="ltr"`, so it reads
  correctly inside an Arabic page. The page titles and the footer links are dictionary text
  (§3.5.5). Hussein translates both pages once, near the end, on their own build ticket, finished
  before Pre-defense readiness (#73); Ahmad checks and signs off the French and the Arabic before
  they merge.
- **The English stays the canonical text.** Each translation says under its date line: *"This is a
  translation. If it differs from the English version, the English version applies."* When the
  translations land, the English *Changes to this page* and *Changes to these Terms* sections say
  that French and Arabic translations exist and that the English applies where they differ, and
  that *"The date at the top is the same in the English, French and Arabic versions, and moves when
  any of them changes."*
- **One document, one date.** Once translated, a PR that changes one version of a page changes all
  three and moves their three *Last updated* dates to the same day. **The build fails when the three
  dates differ**: the check reads the day, the month and the year from each version's *Last
  updated* line, with each language's twelve month names written in the check and Arabic-Indic
  digits read as digits, and fails, naming the file, when the dates differ or a line does not read.
  Its result never depends on the Node or CLDR version of the host or of the Docker build. The
  French and the Arabic dates are written as the SPA writes one: *12 octobre 2026*,
  *١٢ أكتوبر ٢٠٢٦*.
- **The translations use the interface's words**: the buttons (**Sign in with 42**, **Connect 42**,
  **Confirm with 42**, **Disconnect 42**), the sign-up checkbox, the Admin label, the Report reasons
  and each domain term, as the dictionary and `CONTEXT.md` write them in that language.
- **In Arabic**, lists hang their bullets and numbers on the right, inside the text column (`ps-6`),
  and a nested list indents from the right; an Arabic file's numbered lists draw Arabic-Indic
  numbers (`list-[arabic-indic]`), chosen from the file's language, not the page's, so the English
  page inside an Arabic page keeps 1, 2, 3. Tables run right to left, each cell's text at its start.
  The three 42 logins render as `<code dir="ltr">`, and a code span holds Latin only. The Arabic text
  writes its numbers in Arabic-Indic digits, except the name *42* and a list item's `1.` in the
  Markdown source, which is syntax. It uses `**bold**` where the English uses `*italic*`.

  > **Updated 2026-10-25** (map #1's note of this date): the product's name, *21 Beirut*, is also
  > written as it is, with Western digits, since the product name is never translated (§3.5.2's
  > note of this date).
- **The legal check's text rules.** It fails an `.ar.md` file that holds italic or a vowel mark
  (U+064B–U+0652), and an `.fr.md` file with a plain space before `: ; ! ? »` or after `«`. It reads
  the parsed text, not the raw lines (M38): a line break inside a paragraph counts as a plain space,
  code spans and link targets are skipped, and a table's delimiter row never fails it.

#### 3.5.5 Languages and direction (ADR-0020)

The SPA shows every text in English, French or Arabic, and Arabic right to left. How a slice ships
its text is `CONTRIBUTING.md` → *Text ships in three languages*; this section is the mechanism that
rule points to. Until the foundation build ticket creates `web/src/i18n/`, a slice keeps its English
in one object per area shaped like the dictionary, as that rule's *Before the foundation* says.

- **A typed dictionary of the SPA's own, over `Intl`, and no translation package** (ADR-0020 d3).
  - **Where the text lives.** `web/src/i18n/en/`, `fr/` and `ar/` hold one file per area, with the
    same names in each folder (`shell.ts`, `auth.ts`, `errors.ts`…), and each folder's `index.ts`
    joins its areas. The types and the helpers sit in `web/src/i18n/`. A component reads the
    current language's dictionary from one React context: `t.auth.signIn.submit`.
  - **How it is keyed.** Keys are nested by area, in camelCase, and so are placeholders
    (`{partnerName}`). A group never has a key named `text`, `parts` or a plural form (`zero`,
    `one`, `two`, `few`, `many`, `other`). Text chosen by a code is keyed by the code, spelt as
    `src/shared/` spells it, and written `as const satisfies Record<Code, string>`: the errors over
    `ErrorCode | RefusalCode` (§3.5.2), the Role names over `Role`, and Badges, Mission modes, Report
    reasons and states and Match statuses once their type is in `src/shared/`.
  - **How the files are checked.** Every language file is `as const`, so each text keeps its literal
    type. Each English area file `satisfies` the dictionary's shape, and each French and Arabic area
    file `satisfies` the type derived from its English area, so `tsc` points at the line. Each
    language's `index.ts` holds one more check over the whole language, which names each problem by
    its key (`"inbox.archived: missing."`), so an area file that forgets its own check is still
    checked.
  - **All three languages are in the bundle**, so switching never waits and cannot fail.
- **The build refuses what is missing** (ADR-0020 d3). `npm run build` runs `tsc -b`, in CI (§16.4,
  step 2) and in the Docker image, so no copy with a missing text can be built. `tsc` rejects:
  - a text French or Arabic lacks, a key English lacks, and an area left out of a language's
    `index.ts`;
  - a plural form the language needs, and one it does not write; a form without `{count}`, unless it
    holds a single number;
  - a placeholder English has, missing or misspelt in any form of any language, English's own forms
    included, and a placeholder English does not have; a placeholder name that is not camelCase;
  - an empty text or form, or one of white space only; a text that has lost its literal type;
  - a code with no English text, and an English text for a code that does not exist; a group key
    named `text`, `parts` or a plural form;
  - a call that leaves out a value, names a wrong one, passes a string as a number, or passes
    `undefined`, `null`, `false` or an array; and a text with placeholders rendered unfilled;
  - a vowel mark in an Arabic text, and a plain space before `: ; ! ? »` or after `«` in a French
    one, the two text rules of §3.5.2.

  **If one slips through**, which only `vite dev` allows since it skips the type check, French and
  Arabic are laid over English, following English's shape per form and per part: a missing or empty
  text shows in English, a missing plural form uses that language's `other`, and a plural without
  `other` or a two-number sentence missing a part shows whole in English. Nothing throws, and
  nothing reaches the console. **No test is added** (ADR-0016 d7). What `tsc` cannot see, such as
  English typed into a component or left in a French or Arabic file, a name filled from
  `displayName`, or a poor translation, is for the PR's reviewer, Hussein's proofreading and the
  Arabic pass (§16.7).
- **Messages** (ADR-0020 d4).
  - **A count** is one entry with a text for each plural form: English `one` and `other`; French
    `one`, `many` and `other` (0 takes `one`, 1,000,000 takes `many`); Arabic `zero`, `one`, `two`,
    `few`, `many` and `other`. English `one` and Arabic `zero`, `one` and `two` hold a single number
    and may write it in words (`one unread message`, `رسالة واحدة`, `رسالتان`); every other form
    contains `{count}`, and every form contains every other placeholder.
  - **Two numbers in one sentence** are still one message, as the insight sentences are (§13.3): its
    text orders the parts, and each part is written once per plural form, chosen by its own number.
  - **Every number value**, `{count}` included, is written by `Intl.NumberFormat` with the locale
    table below.
  - **Every value is isolated.** In markup, `format` puts a string or a number in a `<bdi>` and
    leaves an element as it is (`PersonName`, `SkillName`, `SkillChip`). The plain-string helper,
    for `alt`, `title`, `aria-label` and `<option>`, puts each value between U+2068 and U+2069. A
    name is filled with `PersonName`, or in a plain string from its plain-text helper.
  - **A list** fills one placeholder. The helper builds it from `Intl.ListFormat`'s `formatToParts`
    and isolates each item as above, so a `SkillChip` item stays a `SkillChip`. The output is
    `Intl.ListFormat`'s as it is: "Docker, Git and C++", "Docker, Git et C++", "Docker وGit وC++".
- **The locale table** (ADR-0020 d5) gives `Intl` each language's tag, and says that only Arabic is
  `rtl`. In Node 22.22.1 (ICU 78.2, CLDR 48.0), in the UTC time zone, it writes:

  | Language | Tag | 1234.5 | 42 % | A date | A time | A date and time |
  | --- | --- | --- | --- | --- | --- | --- |
  | English | `en-GB` | 1,234.5 | 42% | 13 October 2026 | 14:05 | 13 October 2026 at 14:05 |
  | French | `fr` | 1 234,5 | 42 % | 13 octobre 2026 | 14:05 | 13 octobre 2026 à 14:05 |
  | Arabic | `ar-u-nu-arab` | ١٬٢٣٤٫٥ | ٤٢٪؜ | ١٣ أكتوبر ٢٠٢٦ | ٢:٠٥ م | ١٣ أكتوبر ٢٠٢٦ في ٢:٠٥ م |

  Arabic writes Arabic-Indic digits, named in its tag, so every browser agrees, with `ar`'s month
  names. A date is `dateStyle: 'long'`, never numeric, a time `timeStyle: 'short'`, and a moment
  both; each language keeps its own hour cycle, and times show in the browser's time zone. The
  digits reach every number the SPA writes, the chart's axes and the legal pages' dates included;
  text a person types keeps the digits they typed.
- **The first visit and the choice** (ADR-0020 d6). A first visit takes the first of the browser's
  languages (`navigator.languages`) that is English, French or Arabic, judged by its language part
  (`fr-CA` is French), and English when none is. The choice is stored only when the person picks a
  language in the switcher, under the `localStorage` key `peerconnect.language`, as `en`, `fr` or
  `ar`; any other stored value is ignored, and where storage is blocked the choice lasts until the
  page reloads. It belongs to the browser, not the account: signing out keeps it, and the database
  stores nothing. `<html lang>` and `<html dir>` are set before the first render, and on each switch
  in the same update as the text, without a reload (`en.subject.md:572`).
- **The switcher** (ADR-0020 d6) is the design system's `Select`, at the end of the shared header's
  line (`SiteHeader`, `web/src/layout.tsx`), so every route shows it (§3.5.1). It is labelled
  "Language" in the current language, its label hidden visually while screen readers still read it.
  Its options are each language's own name, English, Français and العربية, each with its `lang`
  attribute, and are never translated. Choosing one switches at once. From 360 px wide the header
  may wrap to a second line. *(2026-11-02: the signed-out header no longer wraps either; below `md`
  its line holds the logo, a Menu button and the switcher, §3.5.1.)*
- **The legal pages' text stays outside the dictionary**, in their Markdown files (§3.5.4); their
  page titles and the footer links are dictionary text.

### 3.6 Transactions and serialization (M1)

#### 3.6.1 The rule

**Every operation that writes a domain row runs inside exactly one `SERIALIZABLE` transaction opened
by the Unit of Work, and every read that the decision depends on happens inside that same
transaction.** One exception: the password change, and the new password after Confirm with 42,
run two transactions, one for each sign-out, with Supabase's admin update between them (§5.1,
ADR-0003 d6's note of 2026-10-02). PostgreSQL's serializable snapshot isolation then guarantees that committed results are
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
  `already_reported` (§12.2); the `Student.forty_two_id` unique → `oauth_failed` on the 42 sign-up
  form and the `in_use` outcome on Connect 42 (§5.6 B); the `Block` unique → `already_blocked` (§6.4);
  `UNIQUE Review(match_id)` →
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
- `work` performs database work only. No network call, a call to Supabase Auth or Storage included,
  no socket emit, no file-system write inside it. Byte validation of uploads, and the upload of the
  new file to Storage, happen **before** `run` (§9.5, §9.8); deleting a file happens after commit
  (§3.7).
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
| Sessions die with the password or a sanction (ADR-0003 d6 and its note of 2026-10-02) | sign-in, 42 callback vs password change, Suspension, Removal; password change vs password change | the Student's `password_version` and flags (session creation, §5.1); the Student's sessions and `password_version` (each of the change's two sign-outs, or the sanction) |
| One 42 account, one Student (ADR-0014's top note of 2026-10-08) | 42 sign-up form vs Connect 42, in any pair | whether any row holds the 42 `id`; the `forty_two_id` unique is the backstop |
| Block vs Friendship (ADR-0014 d4) | block vs request | Friendship rows of the pair (block); Block rows of the pair (request) |
| Report group resolution (ADR-0011 d6) | resolve vs resolve vs file vs target Removal | the group's `OPEN` rows; the target's `removed_at` |
| Block vs moderation action (ADR-0011 d7) | Block create/remove vs Peer Moderator action | Blocks between the moderator and the group's author and reporters |
| Evidence at most one (ADR-0009 d5) | put vs put vs delete | the Review's Evidence row |

> **Updated 2026-10-14** (#36; ADR-0003 d6's note of 2026-10-14): in the *Sessions die with the
> password or a sanction* row, `password_version` alone does not serialize *password change vs
> password change*. A second change that starts during the first one's gap between §5.1's steps 4 and
> 5, on a session signed in with the old password, reads the version the first change already raised
> and passes its own step 4. A per-Student lock in the `auth` module, taken just before step 4 and
> held through step 6, serializes them: the change that waited reads the moved version and is refused
> `password_incorrect`, a lost race that §5.5 does not count. The lock is in memory, like the
> throttle, so it relies on one `api` process (§15.1); a second process would bring the race back.

#### 3.6.4 Test seam: `checkpoint` (M31)

Each operation with a row in the table above calls `await ctx.checkpoint('<operation>')` exactly once,
after its deciding reads and before its first write. In production the call is a no-op. The test
harness binds it to a barrier so a test can hold two transactions at the point where both have read
and neither has written, then release them, forcing the race deterministically. A barrier releases a
given participant only on its first arrival, so the retried attempt passes straight through.

**One named pause sits outside a transaction** (ADR-0016 d1's note of 2026-10-04): the password
change (§5.1) reaches the same barrier, through `CheckpointHook`, as `password-change:admin-update`,
between its first sign-out (step 4) and Supabase's admin update (step 5). No transaction spans that
gap, so `checkpoint` cannot hold it, and `12-sign-in` needs it for the one order only the second
sign-out catches (§16.3). In production it is a no-op like `checkpoint`. Every other race still goes
through `checkpoint`.

### 3.7 Post-commit events (M32)

`RealtimePublisher` is a port in `core` with one method per server-to-client event (§7.4) plus
`revokeSessions`. Services never call it directly inside `work`; they call
`ctx.afterCommit(() => publisher.x(...))`. The Unit of Work discards the queue of every failed or
retried attempt and flushes the successful attempt's queue in order after commit. An effect that
throws is logged (§3.9) and does not fail the request: every DB-derived event is an invalidation or
an insert that a reload also recovers. The socket gateway implements the port; the seed and the test
harness bind a no-op or a recording implementation.

> **Changed 2026-11-03 ([#260](https://github.com/ahmadmnsur/ft_transcendence/issues/260))** *(uncommitted)*, **landed on `main` at `20057b3`**:
> the port also has `friendsChanged(studentIds)`, `matchChanged(studentIds)` and
> `postLikes(postId, likeCount)` (§7.4). Services queue them with `ctx.afterCommit` like
> the other events. `post:likes` updates a cached count, extending "an invalidation or an insert"
> above; a reload recovers the count too. For these events, every Student id used for a room comes
> from a row read in the transaction or the actor's own Student id; the payload's `postId` comes
> from a row read in the transaction. Route parameters pass `ParseUUIDPipe` without being
> lowercased; rooms and client caches use the stored ids.

> **Live moderation and Prompts, 2026-11-03 ([#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261))** *(uncommitted)*, **landed on `main` at `2c9eb01`**:
> the port gains `postRemoved(postId)`, `promptPublished()` and `reportsChanged(exceptStudentIds)`
> for §7.4's new events, and `roleChanged(studentId, role)` to move open sockets into or out of
> `staff`, beside `revokeSessions`. Each runs after commit through the same queue; a failed or
> retried attempt sends nothing. `reportsChanged` names the Students a Report is about, whose
> sockets it skips. The room move also sends that Student's own sockets `session:changed {}`,
> which carries no role.

**Deleting a file is an after-commit effect too** (ADR-0009 d2's note of 2026-10-05): a replaced or
deleted avatar or Evidence file, and the avatar of a Removal, is deleted from its bucket only after
the commit that stopped naming it. A failed delete is logged and left to the cleanup (§9.8), which
deletes it within two hours as long as the `api` runs and its hourly cleanup succeeds.

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
| Unit of Work exhausted, or Supabase Auth unreachable (§5.1) | 503 | `busy_retry_later` |
| A file row whose file Storage cannot give (§6.3); a file save stopped by the 30-minute rule (§9.8) | 500 | `internal_error`, logged |
| Anything else | 500 | `internal_error` |

`GET /api/session` returns 200 with `authenticated: false` when signed out, so a signed-out visitor
produces no error at all. The SPA never calls a protected route without a session it believes valid;
if it receives a 401 it re-probes `/api/session` and routes to `/sign-in`. It never renders an `<img>`
or `<iframe>` for a file URL the viewer cannot read: a Removed Student's avatar is the bundled default.
ADR-0009 d3's 401/403 file contract is unchanged; it is a security boundary, not a UI flow.

### 3.9 Logging (M10–M13)

**The rule the build inherits (ADR-0018 d6):** no log — nginx's, the API's, the database's — ever
contains a password, a cookie, a request body, message text, file contents, a query string, an OAuth
`code` or `state`, or a search term. Since 2026-10-11 it binds the team project too, where the
database is Supabase's (ADR-0018 d6's note of that date), and no Supabase key or token is ever
logged either.

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
  **The Privacy Policy's disclosed request log therefore stays exactly true.** It also discloses,
  since 2026-10-11, the logs of the services that store a copy's data, which record PeerConnect's
  own requests to them (ADR-0018 d6's note): on the team's copy, Supabase's gateway, Auth, Storage
  and Postgres logs, which the team sees for up to a day and Supabase keeps for a period it does not
  publish; on a local copy, the same services' container logs, capped like the rest. They hold the
  time, the path and PeerConnect's server address, never a browser's, and Auth's events name the
  account by `<id>@peerconnect.invalid`, never the real email.
- **API** (`src/core/logger`): Nest's logger at `log`/`warn`/`error`, JSON lines to stdout. No HTTP
  request logging of any kind. The global exception filter logs a 5xx as `{ level, time, method,
  route: <matched route pattern, never the URL>, error: <class name>, code: <Prisma code if any>,
  stack }`, **omitting the message of any Prisma or driver error** (they can embed argument values).
  For those errors `stack` is the call frames only: a V8 `stack` begins with `<name>: <message>`,
  so logging it whole would log the message.
  Validation errors, refusals and 4xx are not logged. Socket handlers never log payloads. The seed
  logs step names and counts, the demo Student's email and how long its run took (§14.8), never a
  password. The throttle never logs its keys. Prisma's own `log` option is empty. The token a
  password check returns, the Supabase keys and the 42 secret are never logged; the boot check and
  the test harness name a variable, a host or a query parameter node-postgres or Prisma reads,
  never a secret value (§15.4, §15.5, §16.2). The file cleanup logs one line only when it deletes
  a file, and a failed run (§9.8). Sign in with 42 logs
  a warning naming `secret_valid_until` in the secret's last seven days (§5.6).

  > **Updated 2026-10-20** (#43, from the review of PR #193): the 5xx line also carries `reason`
  > when the error is a `StorageError`: the Storage call and Storage's status (*Supabase Storage
  > download answered 404*), never a body or a key. That message names no value by construction
  > (`src/core/supabase-storage.ts`), and with it the team project's log tells a 403 (a key problem)
  > from a 404 (the file is gone). The other error lines built from the same fields carry it too:
  > the file cleanup's failed run, a save's failed delete of its new file and a failed after-commit
  > step. Every other error's message is still left out.
- **Postgres on the fallback**: the `db` service runs Supabase's image with `-c
  config_file=/etc/postgresql/postgresql.conf -c log_error_verbosity=terse -c
  log_min_error_statement=panic -c auto_explain.log_min_duration=-1 -c log_statement=none`.
  `terse` drops `DETAIL`/`HINT`/`QUERY`/`CONTEXT`, where PostgreSQL would otherwise print the
  violating key values or the whole failing row (a Report's text, a Post's body); `panic` stops it
  logging the statement of a failed query. Constraint names still appear. Supabase's image also
  preloads `auto_explain`, which logs any statement over 10 seconds with its values, and logs DDL;
  the last two flags turn both off (the fallback's build, #121, 2026-10-04).
- **Postgres on the team project** (ADR-0018 d6's note of 2026-10-11): a hosted project takes no
  command-line settings, the `postgres` role may not set `log_error_verbosity`, and the hosted
  `csvlog` keeps `DETAIL` whatever it says. So the `postgres` role, which the `api`, `prisma
  migrate` and the seed connect as, carries `log_min_messages = fatal`, `log_min_error_statement =
  panic`, `auto_explain.log_min_duration = -1` and `log_statement = none`. They are recorded in
  `supabase/team-project.md`, which has the SQL and the check through the session pooler; Kamel
  applied them in the dashboard on 2026-10-12. The cost: the dashboard's Postgres log no longer shows
  our errors, and the `api`'s own log still records every 5xx with its Prisma code. Supabase's own
  Auth and Storage roles keep Supabase's defaults, which only Supabase can change; their rows hold
  no Student's text and no real email.
- **Retention**: every service's container log is capped and rotated by Compose (M12, §15.1).

### 3.10 Security headers (M34)

- **Base path only**, on the `location /` that serves the bundle: `Content-Security-Policy:
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
  font-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'self'; frame-ancestors 'self';
  base-uri 'self'; form-action 'self'`. This makes ADR-0018 d5's "nothing loaded from another
  server" structural for every subresource; the top-level navigation to 42 (§3.1) is outside CSP's
  reach and is that decision's stated exception. `connect-src 'self'` also keeps the browser off every Supabase address (ADR-0019 d1). It is not set in the dev overlay, where Vite injects inline scripts. The
  browser pass (§16.7) confirms it produces no console violation.
- Every file response carries `X-Content-Type-Options: nosniff` (ADR-0009 d5); authenticated JSON
  carries `Cache-Control: no-store`.
- **No `Strict-Transport-Security`, ever**: HSTS is per host, not per port, and would force the dev
  origin `http://localhost:8081` onto HTTPS in the same browser.

---

## 4. Data model

### 4.1 Conventions

- **Nineteen tables, nine enums** (ADR-0014, unchanged by the move to Supabase: its top note of
  2026-10-10). Prisma model names are the table names (`"Student"`, `"Match"`, …, as ADR-0014's SQL
  quotes them); columns are `snake_case` via `@map`.
- **Identifiers**: `uuid` with `@default(uuid(7))` everywhere (ADR-0014 d10), except
  `Session.id` (M6, §5.2), the composite primary keys of `MatchSkillCoverage`, `Like` and
  `BadgeAward`, and three values **NestJS makes before it writes their row**, which therefore have no
  `@default` (ADR-0014 d10's note of 2026-10-10):
  - `Student.id`, made with the `uuid` package's `v7()` before sign-up creates the Supabase Auth user
    that shares it (§5.1). A create that forgets it still compiles, because the Learning Goal's
    composite foreign key (M5) makes `id` a relation field, which Prisma's checked create input
    leaves out; the database then refuses the row. So sign-up passes `id` with the other scalar
    fields, in Prisma's unchecked create input.
  - `Avatar.token` and `Evidence.token`, random UUIDv4s (`randomUUID()`) made before the file they
    name is uploaded (§9.8). A create that forgets one fails to compile. They appear in routes
    instead of the id (ADR-0014 d10, ADR-0009 d3).

  With a default, either create would write a row that names no Supabase Auth user or no file; a
  required field only catches a missing value, and writing the id the Supabase Auth user got, and
  the token that was uploaded, stays the path's job. **"Lower Student id"** in every tie-break means
  the lower `Student.id` in PostgreSQL `uuid` order, which equals lexicographic order of the
  canonical lowercase string. Every tie-break needs only that deterministic total order. A UUIDv7
  leads with the millisecond it was generated (`v7()`, the function Prisma's `uuid(7)` uses,
  monotonic within one process), so id order follows creation order, as ADR-0014 d10 wants; under
  concurrent sign-ups it is the order the ids were generated, not the order they committed. The
  seed, whose script needs id order to equal its position order, creates Students one at a time and
  asserts it (§14.3).
- **Nothing reaches into Supabase's schemas** (ADR-0014's top note of 2026-10-10, ADR-0019 d8): no
  foreign key, and no SQL, from our tables into `auth` or `storage`. A Student shares its id with its
  Supabase Auth user, and a file is named by its row's token; neither is a constraint. So the test
  database can be dropped and rebuilt alone (§16.2). There is **no row-level security and no grants
  step**: the team project's Data API is off, and the fallback runs no REST service.
- **Times** are `timestamptz(3)`. Descriptive only: no rule orders by a timestamp where a
  serialization point is meant (R3).
- **Text** columns are `text`; their length limits are service-enforced (§6.0.3), not `varchar`.
- **Foreign keys are `ON DELETE RESTRICT ON UPDATE RESTRICT` everywhere.** Only leaf rows are ever
  hard-deleted (`Session`, `Avatar`, `Evidence`, `StudentSkill`, `Block`, `Friendship`, `Like`), and
  the one referenced leaf (`StudentSkill`, referenced by a Learning Goal) is cleared before deletion
  (§4.3.1). `Student` and `Post` are soft-deleted; every other table is append-only history. The
  seed's run that writes its fixture and the two resets delete every row of every table (§14.9,
  §15.6), which no application path does.
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
| `id` | uuid | no | none | PK; made by NestJS with `v7()` before the Supabase Auth user that shares it (§4.1) |
| `email` | text | no | | stored trimmed and lower-cased; UNIQUE; survives Removal (burned); the only copy of the real email, never in Supabase Auth (§5.1) |
| `password_version` | integer | no | 0 | raised by each sign-out of a password change; what sign-in re-reads (§5.1). It replaces `password_hash`: PeerConnect stores no password (ADR-0014's top note of 2026-10-02) |
| `display_name` | text | no | | 1–40 chars; collation `und-x-icu`, set by the ninth raw-SQL step (§4.4), so every stack sorts names with the same collation |
| `display_name_search` | text | no | | the display name folded by `foldName` (`src/shared/fold-name.ts`): lower case, NFKD with combining marks dropped, `ة` → `ه`, `ى` → `ي`, no tatweel; never returned by the API |
| `forty_two_id` | integer | yes | | 42's account `id`; UNIQUE; set by a 42 sign-up or Connect 42, cleared by Disconnect 42, kept on a Removed row, never set by an Admin (§5.6) |
| `role` | `Role` | no | `STUDENT` | |
| `xp` | integer | no | 0 | written only by the three XP paths (§10) |
| `streak` | integer | no | 0 | written only by Round close (§8.7) |
| `learning_goal_student_skill_id` | uuid | yes | | the Learning Goal (§ below) |
| `learning_goal_text` | text | yes | | 1–200 chars; the displayed sentence |
| `suspended_at` | timestamptz | yes | | set by Suspension, cleared by reinstatement |
| `removed_at` | timestamptz | yes | | set once by Removal; never cleared |
| `created_at` | timestamptz | no | now() | |

- **Unique**: `email`; `forty_two_id` (a plain Prisma unique; Postgres admits any number of nulls).
- **FK**: `(id, learning_goal_student_skill_id) → StudentSkill(student_id, id)` (composite; `MATCH
  SIMPLE`, so a null Goal is unchecked). This makes "the Goal is one of **this** Student's own rows"
  a database fact (M5, ADR-0014 d3).
- **Delete**: never hard-deleted. `removed_at` is the soft delete.
- **Status** (derived, ADR-0014 note): `removed_at` set → **Removed**; else `suspended_at` set →
  **Suspended**; else **Active**.
- **Service invariants**: the referenced `StudentSkill.kind` is `LEARN`; `learning_goal_text` is
  non-null exactly when the reference is; removing the Goal's Skill from the list clears both Goal
  columns in the same transaction; a Removed row accepts no update of any column; `xp` and `streak`
  never negative and never set by any edit path; `password_version` changed only by the owner's
  password change (§5.1); `forty_two_id` changed only by the owner (§5.6); `role` changed only by
  another Admin (§12.7). **`display_name_search` always equals `foldName(display_name)`**: every
  path that writes a name, sign-up, the 42 sign-up form, the Student's own edit, the Admin edit and
  the seed's direct inserts, writes both through one helper, `nameFields`, which returns both
  fields. The schema cannot hold it, like ADR-0014 d13's Takeaway author rule (ADR-0014's top note
  of 2026-10-02; tested by `11-name-search`, §16.3, and asserted by §14.8).
- **Serialization**: XP writes, Streak writes, sanctions and role changes all update this row, so
  they conflict and serialize (§3.6.3). The active-Admin invariant reads the set of active Admins.

#### 4.3.2 `Session` — ADR-0003's session row

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | text | no | PK; lowercase hex SHA-256 of the 32-byte token the cookie carries (M6) |
| `student_id` | uuid | no | FK `Student` |
| `expires_at` | timestamptz | no | sliding, 30 days (§5.2) |

- **Index**: `student_id`. **Delete**: hard (logout, each of a password change's two sign-outs,
  Suspension, Removal, expired-row purge in the sign-up, 42 sign-up form, sign-in and successful-42-callback transactions, §5.2). No other column: the role is never stored here (ADR-0003 d5). The table
  stays with the move to Supabase: PeerConnect's `Session` row decides who is signed in, and the
  tokens of a Supabase Auth session never outlive one password check (ADR-0014's top note of
  2026-09-30).

> **Six more columns, 2026-11-03 ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262); ADR-0021 decision 4 and its note of the same day)** *(uncommitted)*:
>
> | Column | Type | Null | Notes |
> | --- | --- | --- | --- |
> | `feed_opened_at`, `messages_opened_at`, `match_opened_at`, `friends_opened_at`, `prompts_opened_at`, `reports_opened_at` | timestamptz | yes | when this sign-in last opened that page (§6.1's note of the same day); null until it does |
>
> "No other column" above no longer holds; the role is still never stored here. Each starts null
> when the row is created and goes with the row, so the deletes above are unchanged.

#### 4.3.3 `Avatar` — 0..1 per Student

Columns: `id` uuid PK; `student_id` uuid UNIQUE FK; `token` uuid UNIQUE, no default (made by NestJS,
§4.1); `mime` text; `size` integer; `uploaded_at` timestamptz. **No bytes**: the file is in the
private `avatars` bucket, named by the token, with no path column (ADR-0014 d12's note of
2026-10-05, §9.8).
- **Delete**: hard (owner or Admin removes; Removal deletes), the row in the transaction and the file
  after commit. **Replace** is a new file under a **new `token`**, uploaded before the transaction;
  the transaction rewrites `token`, `mime`, `size` and `uploaded_at`, and the old file is deleted
  after commit, so a cached URL never shows the old face.
- **Service invariants**: `mime ∈ {image/png, image/jpeg}` and `size ≤ 2,097,152`, both derived from
  validated bytes (ADR-0009 d5); a Removed Student has no row (ADR-0009 d6); the row's token names a
  file in `avatars` (§9.8).

#### 4.3.4 `Skill` — the shared catalogue

Columns: `id` uuid PK; `name` text UNIQUE. **Rows are inserted by the seed's catalogue step and by
migrations only; never updated or deleted** (ADR-0014 d3). No admin screen.

#### 4.3.5 `StudentSkill` — teach and learn lists

Columns: `id` uuid PK; `student_id` uuid FK; `skill_id` uuid FK; `kind` `SkillKind`; `created_at`.
- **Unique**: `(student_id, skill_id, kind)`; `(student_id, id)` (target of the Learning Goal FK).
- **Index**: `(skill_id, kind)` (analytics, search).
- **Delete**: hard, through the list-replacement operation only (§6.2), which diffs so that a Skill
  kept on a list keeps its row (and therefore its Goal).
- **Service invariant**: a Skill is on at most one of a Student's two lists. The list-replacement
  operation (§6.2) refuses a request that puts one Skill on both; the unique key stays
  `(student_id, skill_id, kind)`, so the schema does not hold it.

> **2026-11-02 ([#256](https://github.com/ahmadmnsur/ft_transcendence/issues/256)):** the invariant
> above is new. `CONTEXT.md` has a Student list a Skill "either as one they can teach or one they
> want to learn", but the operation accepted the same Skill on both lists. Rows written before the
> change stay: the SPA names such a Skill and holds Save until it is removed from one list.

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

> **Changed 2026-11-02** (#254): `body` is 1–500 characters (§6.0.3's note), held by the trigger
> `direct_message_body_length` (§4.4's note), which checks a body on insert and when an update
> changes it. A plain `CHECK` would also test a row whose `read_at` is set, so an older body over
> 500 characters could never be marked read; the trigger leaves such a body as it is.

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

> **2026-11-03 ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262); ADR-0021 decision 4)** *(uncommitted)*: one more column, `read_at` timestamptz NULL,
> set when the Mentor opens `/feedback` (every unread row about them) or that Match's page (that
> row), §6.7's note of the same day. "Never updated" above no longer holds for this one column.
> No response carries it (§4.6's note of the same day).

#### 4.3.14 `Evidence` — 0..1 per Review

Columns: `id` uuid PK; `review_id` uuid UNIQUE FK; `token` uuid UNIQUE, no default (made by NestJS,
§4.1); `mime` text; `size` integer; `filename` text (1–255, sanitised original name); `uploaded_at`.
**No bytes**: the file is in the private `evidence` bucket, named by the token (§9.8).
- **Delete**: hard, by the originating Mentee: the row in the transaction, the file after commit.
  **Replace** rewrites the row in place with the new token of a file uploaded before the
  transaction, and the old file is deleted after commit (§9.4).
- **Service invariants**: `mime ∈ {application/pdf, image/png, image/jpeg}`, `size ≤ 5,242,880`, both
  from validated bytes; mutations only by the Review's Match's Mentee while Active; the row's token
  names a file in `evidence` (§9.8).
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

### 4.4 Raw-SQL migration steps (exactly nine) and native partial indexes

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
| 9 | `Student.display_name` collation | `ALTER TABLE "Student" ALTER COLUMN display_name TYPE text COLLATE "und-x-icu";`, in the migration that creates `Student` — holds no invariant: it gives display names the same collation on every stack, since the hosted database's default `C.UTF-8` sorts by code point and Prisma's `orderBy` cannot name a collation (ADR-0014's *Consequences* count note of 2026-10-02) |

**Report's two partial unique indexes** are declared natively (`@@unique([reporterId, postId],
where: { postId: { not: null } }, map: "report_one_per_reporter_post")` and the Student twin) under
the `partialIndexes` preview feature, available from Prisma 7.4 (ADR-0014's note takes it).
**Fallback, defined now:** if the preview produces spurious drop-and-recreate migrations (reported
upstream as prisma/prisma#29263, closed as fixed for 7.5 on 2026-03-11, with follow-ups for other
predicate shapes still open, e.g. #29446 and #29386) that the gate cannot suppress by editing the
generated SQL, the two indexes move to raw SQL with the same names and the raw count becomes
**eleven**, exactly as ADR-0014's count revisions foresee.

**The move to Supabase adds no step** (ADR-0014's *Consequences* count note of 2026-10-10):
`password_version`, `display_name_search` and `forty_two_id` are plain Prisma, and there is no
row-level security or grants step. Two stacks on different ICU versions can still order some names
differently, and an ICU upgrade under one database can shift its order, which PostgreSQL then reports
as a collation version mismatch.

**Gate rule for generated migrations**: Prisma does not represent objects 1–9. When `prisma migrate
dev` emits a statement that drops or alters any of them, or drops and recreates an unchanged partial
index, the author deletes that statement before committing, and the gate reviewer checks for it. A
later `ALTER COLUMN … TYPE` on `display_name` silently puts it back on the database's default
collation. Category 2 fails the suite if any of the ten named objects (objects 1–8 and the two
Report partial uniques) is missing after `migrate deploy`, or `display_name`'s collation is not
`und-x-icu`.

> **Count changed 2026-11-02** (#254): eight steps join the nine, all in the migration
> `20261102120000_text_limits` rather than the one that creates each table, since the tables
> exist. They hold §6.0.3's text limits in the database, each counted with `char_length`:
>
> | # | Object | Holds |
> | --- | --- | --- |
> | 10 | `student_text_length` | `email` 1–254, `display_name` 1–40, `learning_goal_text` null or 1–200 |
> | 11 | `review_text_length` | `learned` and `can_now_do` 1–2000 each |
> | 12 | `private_feedback_text_length` | `answer_usefulness` and `answer_explanation` 1–2000 each |
> | 13 | `post_body_length` | `body` 1–280 on a Takeaway (`review_id` set), 1–1000 on a Prompt answer (`prompt_id` set) |
> | 14 | `reflection_prompt_question_length` | `question` 1–300 |
> | 15 | `report_text_length` | `text` null or 1–1000 |
> | 16 | `evidence_filename_length` | `filename` 1–255 |
> | 17 | `direct_message_body_length` | a `BEFORE INSERT OR UPDATE OF body` trigger and its function: a new or changed `body` is 1–500; an unchanged one is not checked (§4.3.8's note) |
>
> Steps 10–16 are `CHECK` constraints. The working count is **seventeen**, or **nineteen** if
> the `partialIndexes` preview feature is declined. Prisma represents none of the eight, so the
> gate rule above covers them, and category 2 asserts each by name (§16.3's note). Changing a
> limit in `src/shared/limits.ts` now also takes a migration that changes its step, reviewed
> under the Schema gate.

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
| 42 account unique and kept after Removal | `UNIQUE forty_two_id` | Removed row never edited; no Admin path writes it | 42 sign-up vs Connect 42 |
| Folded name equals the display name | — (not expressible) | `nameFields` on every name write | — |
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
| A file row names an existing file | — (two stores, no transaction covers both) | file written before its row, deleted after it; the cleanup (§9.8) | — |
| Every Student has its Supabase Auth user | — (no foreign key into `auth`) | sign-up's order (§5.1); only a reset or the seed's guarded run deletes one (§14.9, §15.6) | — |
| Avatar ≤ 2 MiB PNG/JPEG; Evidence ≤ 5 MiB PDF/PNG/JPEG | — | byte validation §9.5 | — |
| Live Prompt unique | `UNIQUE publication_order` | max + 1 | publish vs publish |

> **Row added 2026-11-02** (#254): *Every text within its §6.0.3 limit* — DB constraint: steps
> 10–17 of §4.4's note of the same day, where a Direct Message body is checked only when it is
> written or changed; service check: the DTOs and the `dm:send` check, with the SPA stopping input
> at the limit before either; serialization: —.

### 4.6 Visibility (who reads what, in the application)

Whoever can open a copy's database directly can read everything stored in it: for the team's copy,
only the team, and Supabase as its host; for a local copy, whoever runs it. Supabase encrypts the
team project's disks and backups, a local copy is not encrypted at rest, and Direct Messages are not
end-to-end encrypted (ADR-0018 d13 and its note of 2026-10-11, ADR-0018 d1's note). **In the
application:**

| Data | Readers |
| --- | --- |
| Profile: display name, avatar, Skills, Learning Goal and sentence, XP, Level, Streak, Badges, Posts | every signed-in Student; a Removed Student renders as the tombstone *"Former student"* with the default avatar and no profile |
| Email | its owner and Admins; never on a profile or in search |
| 42 account number (`forty_two_id`) | nobody: its owner sees only whether a 42 account is connected (§6.2) |
| `display_name_search` | nobody: never returned by the API (§4.3.1) |
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

> **2026-10-25:** the *Signed out* row also covers the landing page at `/`, which shows no data
> (§3.5.1's note of 2026-10-25).

> **2026-11-01 ([#249](https://github.com/ahmadmnsur/ft_transcendence/issues/249))** *(uncommitted)*, **landed on `main` at `4cc1717`**:
> a new row. *That a Student is writing a Direct Message to another* — that other Student only,
> while the pair could exchange one, on their open page of the pair's messages; never stored
> (§7.3's note of the same day, ADR-0018 d4's note). *Presence* stays with accepted Friends: the
> page of a Direct Message shows a peer's online status only when they are one.

> **2026-11-03 ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262); ADR-0018 d4's note of the same day)** *(uncommitted)*: two new rows. *Private
> Feedback's `read_at`* — nobody: it only turns off the Mentor's own New dot, and no response
> carries it, so the Mentee who wrote it is never shown it. *When a sign-in last opened each page*
> (`Session.*_opened_at`) — nobody: it only decides that sign-in's own dots. A dot tells no more
> than its page shows, with the page's own filters for Removed Students, Blocks and role (ADR-0021
> decision 3).

**Removed-row surface rule** (ADR-0008 Consequences, corrected): discovery and participation
surfaces (search, friend requests, new DMs, new Reports, matching, Leaderboard, friend lists,
pending-request lists) **exclude** Removed Students; historical relations (Posts, Matches, threads,
Private Feedback, Reports) **render the tombstone**; the Admin Users table **includes** Removed rows,
view-only. The normal feed and profiles exclude Posts with `removed_at` set.

---

## 5. Authentication and authorization

### 5.1 Accounts and passwords

- **Where the password lives** (ADR-0003 d3's note of 2026-10-02, ADR-0019 d5): every Student has one
  Supabase Auth user with the Student's own id, whose login is `<id>@peerconnect.invalid`, a reserved
  name that never receives mail. It keeps the password and nothing else of the Student's: the real
  email is `Student.email` alone. Supabase Auth hashes with bcrypt at cost 10 and a salt per hash;
  PeerConnect hashes and stores no password. Only the API calls Supabase Auth, from the server, with
  `SUPABASE_PUBLISHABLE_KEY` for the password grant and `SUPABASE_SECRET_KEY` for admin create,
  admin update and admin delete (ADR-0004 d9's note of 2026-10-03).
- **A password check**, wherever this spec says so, is Supabase Auth's password grant on the
  Student's login. The token it returns is a JWT that lives only inside that request: the API uses
  it once to sign that Supabase Auth session out, then drops it with its refresh token, never
  stored, logged or sent to the browser. If that sign-out fails, the request still goes on
  (ADR-0003 d1's notes). Its answers: accepted; refused → `password_incorrect`; a Supabase `429`
  from its shared per-IP bucket → `too_many_attempts`, not counted as the Student's failure (§5.5);
  Supabase Auth unreachable → `busy_retry_later` (503), never a credentials refusal (ADR-0003 d10's
  note of 2026-10-02).
- **The password rule**: at least 8 characters and at most 72 bytes in UTF-8, so an accented or
  Arabic letter counts two bytes or more, with no composition rule (§6.0.3), except that a new
  password holds no emoji (the note of 2026-11-01 below). The SPA refuses a password outside it,
  and the API checks again before it calls Supabase Auth. The Supabase project's own minimum length
  is 8 too.

  > **Updated 2026-10-31**: every password field in the SPA stops taking text at 72 bytes after
  > trimming, as a field's maximum length does, and nothing on the page names that limit: a
  > keystroke or a paste that would pass it keeps only as much as fits. So the refusal names only
  > the 8 characters, *"Use at least 8 characters."*, and the hint under a new password reads *"At
  > least 8 characters."* The length rule does not change, and the API still checks both ends.

  > **Updated 2026-11-01** (ADR-0003 d3's note of the same day): a **new** password may not hold an
  > emoji. That is sign-up's password, the password change's new one, the one set after Confirm
  > with 42 (§5.6 C), and the staff and seed passwords the boot check reads from `.env` (§15.4). An
  > emoji is a character that `hasEmoji` in `src/shared/limits.ts` matches: a pictograph
  > (`Extended_Pictographic`, which also takes a few symbols such as © ® ™ ‼ ↔ ▶), a flag letter
  > (`Regional_Indicator`), a skin tone U+1F3FB–U+1F3FF, U+FE0F or the keycap mark U+20E3. No ASCII
  > character is one. A **current** password is checked without that rule: at sign-in, by Connect
  > 42 and Disconnect 42, and as the password change's current password. A password set before this
  > note may hold an emoji, and refusing it there would lock its Student out with no way left to
  > change it. A new password that holds an emoji is refused with *"A password can't contain
  > emoji."*, even when it is also too short; any other refusal still reads *"Use at least 8
  > characters."*

- **Sign-up** takes email, password, display name and the acceptance checkbox *"I agree to the Terms
  of Service and have read the Privacy Policy"* (ADR-0018 d12). The checkbox is validated on both
  ends and **not stored**. Email is trimmed and lower-cased; display name 1–40 characters after
  trimming. In this order:
  1. validation, then the throttle (§5.5);
  2. read: any Student holds the email, Removed ones included → `email_unavailable`;
  3. NestJS makes the Student's id, a UUIDv7 (§4.1);
  4. Supabase admin create, with the secret key: that id, the login, the password and
     `email_confirm: true`. Supabase Auth unreachable → `busy_retry_later`, with nothing written;
  5. one SSI tx writes the `Student`, its `id` passed in, and its `Session`; then the cookie is
     set. Two sign-ups of one email: the unique index admits one, the loser gets
     `email_unavailable`, and the API deletes the Supabase Auth user it just made, best effort.

  **The 42 sign-up form runs this same sign-up**, its transaction also writing `forty_two_id`
  (§5.6 B). The project's public sign-up is off, so no account is made except through PeerConnect. Supabase
  Auth goes first because the other order could leave a Student with no password, whose real email
  would then be blocked for good. A crash between steps 4 and 5, or a failed delete, leaves a
  Supabase Auth user that no Student has: it holds no real email, and nobody can sign in with it,
  since sign-in starts from a Student's email. There is no repair code; Kamel may delete it by hand
  (`supabase/team-project.md`, ADR-0005 d5's note of 2026-10-10).
- **Sign-in**, in this order (ADR-0003 d10's note of 2026-10-02):
  1. the throttle (§5.5);
  2. find the Student by the normalised email, reading its `password_version`; none →
     `no_account`, *"No account uses this email."*;
  3. a password check on that Student's login; refused → `password_incorrect`, *"Wrong password."*;
  4. one SSI tx re-reads `password_version`, `removed_at` and `suspended_at`, in this order: a
     version that moved since step 2 → `password_incorrect`; Removed → `account_removed`, *"This
     account was removed and can't sign in again."*; Suspended → `account_suspended`, *"Your
     account is suspended. Contact an Admin."*; otherwise it creates the Session (§5.2).

  **A sanction is told only after the right password**, so someone who only knows the email never
  learns of it (ADR-0008 d5's note). Saying that no account uses an email discloses nothing new,
  since sign-up's `email_unavailable` already answers that for any email, so there is no dummy hash.

  > **Updated 2026-10-25** (ADR-0003 d10's note of the same day): step 2's sentence is now *"Wrong
  > email or password."* The codes do not change. `/sign-in` shows that sentence for
  > `password_incorrect` too, so a wrong email and a wrong password read the same. Every check of a
  > signed-in Student's current password (the password change, and Connect 42 and Disconnect 42 in
  > §5.6) still shows *"Wrong password."*

- **The password check runs before the transaction (§3.6.2); the write re-checks what it read.**
  `password_version` (§4.3.1) is what the transactions re-read in place of a hash: sign-in creates
  its Session only if the version is unchanged since before its check, and every sign-out of a
  password change raises it. So a sign-in with the old password racing a password change,
  Suspension or Removal is either ordered first, and its session is deleted with the rest, or
  refused: it never leaves a session the change missed (ADR-0003 d6's note of 2026-10-02).
- **Password change** (`POST /api/auth/password`) requires the current password, in this order:
  1. validate the new password, then the throttle (§5.5);
  2. read `password_version`;
  3. a password check of the current password; refused → `password_incorrect`, counted (§5.5);
  4. one SSI tx: a version that moved since step 2 → `password_incorrect`; otherwise version + 1
     and delete **every** session of the Student, the current one included;
  5. Supabase admin update by id, with the secret key, sets the new password. If it fails →
     `busy_retry_later`: the Student is already signed out, and the password is unchanged;
  6. one SSI tx: version + 1 and delete every session again.

  Steps 4 and 6 each queue `revokeSessions(studentId)` after commit, the cookie is cleared, and the
  SPA returns to `/sign-in` with a notice. Step 6 catches a sign-in with the old password that lands
  between steps 4 and 5, while the old password still works at Supabase; step 4 makes a crash before
  step 5 safe, signed out everywhere with the password unchanged. A crash between steps 5 and 6
  leaves the new password set and at most a session created in that gap: accepted. The test seam's
  one named pause outside a transaction sits between steps 4 and 5 (§3.6.4).

  > **Updated 2026-10-14** (#36): step 5's "the password is unchanged" holds only when the update
  > never took effect. When its answer is lost instead (no answer within the timeout, a dropped
  > connection, or a gateway error after Supabase Auth applied it), the new password may already be
  > set and the API cannot tell: it still answers `busy_retry_later` with the Student signed out, and
  > the SPA's notice says the change may not have finished, so the Student tries the new password
  > first, then the old one. Like a crash between steps 5 and 6, this is accepted.

- **A new password after Confirm with 42** (§5.6 C) is the same change with step 3 replaced by the
  confirmation; steps 4 to 6 and the version guards stand (ADR-0003 d6's note of 2026-10-08). Its
  step 1 validates the new password with no throttle: the route checks no password, so it counts
  nothing and has nothing to slow down (§5.5).
- **What writes to Supabase Auth.** In use, only sign-up and a password change. An email change, a
  Suspension, a reinstatement and a Removal each stay one PeerConnect transaction: no ban, no
  delete. A Removed Student's Supabase Auth user, with its hash, is kept, so that sign-in can still
  check the password before telling of the Removal (ADR-0008 d5, d7 and d8's notes). The two resets
  (§15.6) and the seed's guarded run (§14.9) delete every Supabase Auth user.
- **Supabase Auth's settings**: public sign-up off, minimum password length 8, the email provider on
  (the password grant needs it), confirmation emails off, and the audit log's copy in the database
  off. On the fallback they are `GOTRUE_*` variables of the `auth` service in `compose.yaml`; on the
  team project, dashboard settings recorded in `supabase/team-project.md` (ADR-0004 d1's note of
  2026-10-03, ADR-0005 d5's note of 2026-10-10).
- **No reset by email, no email, no Admin-set password** (ADR-0003 d11, ADR-0018 d8). A Student who
  connected 42 can set a new password through Confirm with 42 (§5.6 C); a Student who never
  connected 42 cannot recover a forgotten password, as the Terms state.

### 5.2 Sessions and the one cookie (M6)

- **The only cookie** is `pc_session` (ADR-0018 d5): `HttpOnly; Secure; SameSite=Lax; Path=/`, no
  `Domain`, `Max-Age` = seconds until `expires_at`. `Secure` cookies are accepted on
  `http://localhost:8081` because browsers treat localhost as a secure context (ADR-0004 d5).
- **Value**: `s.<token>` for a session, `a.<token>` for an OAuth pre-authentication attempt (§5.6).
  `<token>` is 32 bytes from `crypto.randomBytes`, base64url-encoded (43 characters).
- **Storage**: `Session.id` = lowercase hex SHA-256 of the token. A database read never yields a
  usable cookie.
- **Creation** (sign-up, the 42 sign-up form, sign-in, a successful 42 sign-in callback):
  `expires_at = now + 30 days`; the same
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

> **2026-11-03 ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262); ADR-0021 decisions 2 and 4)** *(uncommitted)*: a new row starts with its six
> `*_opened_at` columns null, so a new sign-in, on any device, shows again whatever still waits.
> `POST /api/me/new-dots/opened` (§6.1's note of the same day) sets one of them on the caller's own
> row to the server's time; it is a `POST` with the usual checks (§5.4), not a GET-time write.
> Logout, a password change, a Suspension, a Removal and the purge delete the row with its
> openings.

### 5.3 Per-request resolution and roles

`SessionGuard` on every protected route: read `pc_session`; **only an `s.`-prefixed value proceeds** —
an `a.` value (§5.6's live OAuth attempt) or anything else fails with 401 `unauthenticated`
**without clearing the cookie**, since this guard clears only a cookie it read as `s.`, so a protected
request can never destroy an attempt in flight; then hash and run one query
`SELECT s.student_id, st.role, st.suspended_at, st.removed_at FROM "Session" s JOIN "Student" st …
WHERE s.id = $1 AND s.expires_at > now()`. No row, Suspended or Removed → 401 `unauthenticated`, the
response clears that `s.` cookie, **nothing is written**. The role is read here, fresh, on every request, so
a role change takes effect on the next request with no session change (ADR-0003 d5–d6). **Resolving a
session reads PeerConnect's tables only and never calls Supabase Auth**, on a request or a socket
handshake (ADR-0003 d5's note), so the flags it refuses on are PeerConnect's own. `RolesGuard`
checks the coarse role for `/api/admin/*` (`ADMIN`) and `/api/moderation/*` (`PEER_MODERATOR` or
`ADMIN`). **A writing service re-reads role and sanction flags inside its transaction** and refuses
if they no longer allow the action (ADR-0011 d7); a read relies on this per-request read (§3.4).

### 5.4 CSRF and the GET rule

- **No GET request creates, changes or deletes a domain row** (ADR-0003 d10). The two exceptions are
  §5.2's lazy renewal and §5.6's callback, which writes only the session for a Student a 42 login
  finds and the Connect 42 link on the signed-in Student's own row (ADR-0003 d10's note of
  2026-10-08). Creating a Student through 42 is the 42 sign-up form's JSON request. Marking a thread
  read and logging out are `POST`s.
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

### 5.5 Throttle and the trusted client address (M9, M37)

- nginx is the only trusted proxy. Every proxied location sets `proxy_set_header X-Real-IP
  $remote_addr;` and `proxy_set_header X-Forwarded-For $remote_addr;`, **overwriting** anything the
  browser sent. The API has no published port, so it is reachable only through nginx. The API reads
  the client address **only** from `X-Real-IP`; Express `trust proxy` stays `false` and `req.ip` is
  never used.
- **Buckets** (ADR-0003 d10): key = `clientAddress + "|" + normalisedEmail`, never the address alone.
  Sign-in counts failed attempts; sign-up, the 42 sign-up form included, counts every attempt. **A
  wrong current password counts too**: the password change, Connect 42's start and Disconnect 42
  share one check (§5.1), and a refusal of it counts as a failed attempt under the signed-in
  Student's own email, so someone at a computer left signed in cannot keep guessing. Sliding window
  15 minutes, limit 5; the sixth is refused with `too_many_attempts` before any credential check. A
  failure is `no_account` or Supabase Auth refusing the password. Not counted: a lost race (a moved
  `password_version`, also answered `password_incorrect`), a sanction told after the right password,
  a Supabase `429`, answered `too_many_attempts`, and Supabase Auth unreachable (ADR-0003 d10's
  notes of 2026-10-02 and 2026-10-13, M37). The code alone cannot tell them apart, so the service
  tells the boundary whether a refusal counts. **The new password after Confirm with 42 is not
  throttled**: it checks no password (§5.1, §5.6 C). A Student who used up their count on the
  change form before turning to Confirm with 42 sets the new password at once, but signs in with
  it under the same key only once the window has passed; that is accepted. **In memory only**,
  never persisted, never logged; at most 10,000 keys (oldest evicted); lost on restart (ADR-0018
  d6).
- **Layer**: enforced at the HTTP boundary, before any service call. The service methods take no
  address and enforce no throttle themselves, so the seed and any direct service call bypass it by
  construction — they never cross the guard — while every HTTP request crosses it, in-process tests
  included (§16.2).
- **Absent header**: the address part is the `X-Real-IP` value, or the empty string when absent.
  Production never sees absent (nginx always sets it, overwriting); the harness never sends absent
  (§16.2); `req.ip` is never a fallback.

### 5.6 Sign in with 42 (M7, M8, M35)

**NestJS runs Sign in with 42 itself, and Supabase Auth takes no part in it.** Supabase's custom
provider cannot read 42's identity (42 answers no `sub`), would send the browser through Supabase's
address (ADR-0018 d5), and would be refused by the project's switched-off public sign-up (ADR-0003's
top note of 2026-10-08, ADR-0019 d6). One transport serves three intents: **`sign_in`**, signed out;
**`link`**, Connect 42, signed in; and **`confirm`**, Confirm with 42, signed in. (A) is the
transport, (B) what a 42 account maps to, (C) recovery through 42.

**(A) The authentication mechanism — transport and state.**

- **Enabled** iff `FT_OAUTH_CLIENT_ID` and `FT_OAUTH_CLIENT_SECRET` are both non-empty. Otherwise
  `GET /api/config` returns `oauth42Enabled: false`, the SPA renders no 42 button and no Connect or
  Confirm control, every `/api/auth/42/*` route returns 404, and nothing fails at boot (ADR-0004
  amendment). **Disabled, `GET /api/auth/42/callback` also returns 404 `not_found`** (§6.15): no
  attempt lookup, no external call, no cookie mutation, no redirect — the failure-path redirect below
  belongs to an enabled flow only. `make local`, `make dev` and `make test` read `.env.example`
  alone, whose pair is empty, so 42 is off there (ADR-0004 amendment's note of 2026-10-08).
- **The application**: one team application, *PeerConnect*, registered by Kamel under his 42 account
  on 2026-10-07, scope `public`, redirect URI `https://localhost:8443/api/auth/42/callback`, plus
  `https://<the laptop's IP>:8443/api/auth/42/callback` on a line of its own for each network address
  a member opens `make up` on, which Kamel adds when asked (§15.2; ADR-0004 amendment's note of
  2026-10-25). Its `UID` and `SECRET` are the two `FT_OAUTH_*` values of the team `.env` only (§15.4).
  A branch that needs a real 42 sign-in runs `make up` with a `.env` holding only those two lines,
  which boots the local fallback. Hosting later adds one more redirect URI (ADR-0004 amendment's
  note).
- **Fixed endpoints** (constants, not variables): authorize `https://api.intra.42.fr/oauth/authorize`,
  token `https://api.intra.42.fr/oauth/token`, identity `https://api.intra.42.fr/v2/me`; scope
  `public`. **Redirect URI** `${PUBLIC_ORIGIN}/api/auth/42/callback`, registered on the 42
  application byte-for-byte.
- **Start**: `POST /api/auth/42/start` `{ "intent": "sign_in" | "link" | "confirm", "password"?: string }`
  — a JSON mutation, so starting adds no GET exception (ADR-0003 d10).
  1. `sign_in` with a valid session → refusal `already_signed_in`. `link` and `confirm` need a
     valid session (§5.3), else 401 `unauthenticated`.
  2. `link`: a Student who already has a 42 account connected → `forty_two_connected`; otherwise,
     after the throttle, `password`, the current password, gets a password check (§5.1) before
     anything is minted: refused → `password_incorrect`, counted (§5.5) (ADR-0003 d10's note of
     2026-10-08).
     `confirm`: a Student with no 42 account connected → `forty_two_not_connected`.
  3. Generate `attemptToken` (32 B), `state` (32 B, base64url) and a PKCE `codeVerifier` (32 B,
     base64url); `bindingKey = sha256(attemptToken)` for `sign_in`, `sha256(sessionToken)` for
     `link` and `confirm`, whose session is not displaced.
  4. Store `{ bindingKey, state, codeVerifier, intent, studentId (link, confirm), expiresAt: now + 10
     min }` in the in-memory `OAuthAttemptStore` (at most 1,000 entries, expired evicted first, then
     oldest). **One live attempt per browser**: a `sign_in` start first deletes the entry for
     `sha256(<old>)` when the request carries `pc_session=a.<old>`, since every start mints a fresh
     token and so a fresh key; a `link` or `confirm` start overwrites the entry already under its
     session's key. A superseded attempt's callback therefore finds nothing and fails. Nothing is
     written to the database; nothing to web storage.
  5. For `sign_in`, set `pc_session=a.<attemptToken>; Max-Age=600` with the usual attributes.
  6. Return `{ authorizeUrl }` carrying `client_id`, `redirect_uri`, `response_type=code`,
     `scope=public`, `state`, `code_challenge` = base64url(SHA-256(`codeVerifier`)),
     `code_challenge_method=S256`. The SPA navigates to it with `window.location.assign`.
- **Callback**: `GET /api/auth/42/callback?code=…&state=…` (or `?error=…`), `Cache-Control:
  no-store`. **Verification order**, every failure taking the same failure path:
  1. Read `pc_session`; `a.` → `bindingKey = sha256(token)`; `s.` → the session must resolve (§5.3),
     `bindingKey = sha256(token)`; anything else → fail.
  2. **Take** the attempt for `bindingKey` — removed from the store now, whatever follows, so
     `state` and the verifier are used once.
  3. The attempt exists and has not expired.
  4. `state` is present and equals the stored value (constant-time comparison).
  5. No `error` parameter; `code` present.
  6. Exchange the code server-side (`grant_type=authorization_code`, `code`, `redirect_uri`,
     `client_id`, `client_secret`, `code_verifier`), 10 s timeout, **outside any transaction**. The
     answer carries `secret_valid_until`: once fewer than seven days are left, the API logs a
     warning naming that date at each exchange. The secret lasts 28 days (the first one ends on
     2026-11-04), and an expired one fails every trip to 42; email-and-password sign-in is
     unaffected (ADR-0004 amendment's note).
  7. `GET /v2/me` with the access token, 10 s timeout. Read its `id`, a number 42 never changes.
     Read `login` and `email` only for a `sign_in` whose `id` no Student holds (B), and nothing else
     ever: no photo, campus, level, projects or location. Discard the token and the rest of the
     response at once; never persist or log any of it (ADR-0018 d7's note of 2026-10-08).
  8. Go on by intent: (B) for `sign_in` and `link`, (C) for `confirm`.
  - **Failure path**: an `a.` cookie is cleared (`Max-Age=0`); an `s.` cookie is left alone; redirect
    `302 /sign-in?oauth=failed` (for `link` and `confirm`, `/me?oauth=failed`), and the SPA shows
    *"Sign in with 42 failed. Try again."* for every cause: cancelled on 42's page, an expired or
    unknown attempt, a `state` mismatch, 42 unreachable, an expired secret. The only other outcomes
    are (B)'s and (C)'s: `oauth=removed`, `suspended`, `in_use`, `connected` and `confirmed`, and the
    sign-up form. The query string never reaches a log (§3.9).
- **PKCE is defence in depth only**; `state` stays mandatory (ADR-0003 d10). Whether 42 checks PKCE
  is unconfirmed; the first real sign-in shows whether 42 accepts it (ADR-0004 amendment's note).
  The first real round trip, on 2026-10-16, sent the verifier and 42 answered the token exchange
  200, so 42 accepts PKCE; whether it checks the verifier is still unconfirmed (ADR-0004
  amendment's note of 2026-10-16).

**(B) The 42 identity mapping** (ADR-0003's top note and d10's note of 2026-10-08, ADR-0004
amendment's note, ADR-0018 d7's note).

- **The key is 42's account `id`**, stored in `Student.forty_two_id` (§4.3.1), a nullable unique
  integer, **never `Student.email`**, nor 42's `login` or `email`, which can change. So no email
  edit, an Admin's included, can steer a 42 login (ADR-0018 d7).
- **`sign_in`, a Student holds the `id`**: one SSI tx re-reads that Student. Removed → redirect
  `302 /sign-in?oauth=removed`, *"This account was removed and can't sign in again."*; Suspended →
  `/sign-in?oauth=suspended`, *"Your account is suspended. Contact an Admin."*. 42's confirmation
  stands where the right password does in §5.1, so a sanction is told once 42 confirms the account.
  Both clear the `a.` cookie. Otherwise the tx creates the Session (§5.2); the response sets
  `pc_session=s.<newToken>`, **replacing** the attempt cookie — the attempt token never becomes the
  session id — and redirects `302 /`.
- **`sign_in`, no Student holds the `id`**: the callback creates nothing. In place of the attempt it
  took, it stores a **sign-up draft** under the same key, `{ bindingKey, fortyTwoId, login, email,
  expiresAt }`, keeping the attempt's `expiresAt`, so the draft ends with the attempt's ten minutes
  and the `a.` cookie's `Max-Age`. The cookie stays, and the browser goes `302 /sign-up?from=42`.
  - The sign-up form, still the signed-out route `/sign-up` (ADR-0018 d12), reads
    `GET /api/auth/42/draft` → `{ login, email }`, or `oauth_failed` with no live draft. It is
    pre-filled, display name with the 42 login and email with the 42 email, both editable, and asks
    for a password and the Terms checkbox, validated on both ends and not stored (ADR-0018 d12's
    note of 2026-10-08).
  - Its request is **`POST /api/auth/42/signup`** `{ email, password, displayName, acceptTerms }`, a
    route of its own, so it can never be taken for an ordinary sign-up. Without `pc_session=a.<token>`
    or a live draft under its key, it is refused `oauth_failed`, *"Sign in with 42 failed. Try
    again."*, and never becomes an ordinary sign-up. Otherwise it **takes** the draft and runs §5.1's
    sign-up from step 1, whose transaction also writes `forty_two_id`; its new session replaces the
    attempt cookie. A taken email gets `email_unavailable`, which tells its owner to sign in with
    their password and connect 42: nothing links by email. If another row took the `id` meanwhile,
    the `forty_two_id` unique admits one, and the loser gets `oauth_failed` and its Supabase Auth
    user is deleted, as for a duplicate email.

    > **Updated 2026-10-19** (#70, from the review of PR #188): "takes the draft and runs §5.1's
    > sign-up from step 1" runs in this order. §5.1 step 1's validation comes first. Then a request
    > without `pc_session=a.<token>` or a live draft is refused `oauth_failed` before the throttle,
    > so it counts no attempt: §5.5's "every attempt" of the 42 sign-up form starts after this
    > refusal. Then the throttle counts the attempt, and only then is the draft **taken**, used once,
    > before §5.1's steps 2–5 run. So a body that fails validation, or a request the throttle
    > refuses, keeps its draft. Every request past the throttle uses the draft up, whatever it
    > answers next (`email_unavailable`, `busy_retry_later`, …), and the form then says it cannot be
    > sent again and offers to start over with 42.

  - **An ordinary sign-up never uses a draft**, even while one is live in that browser. A 42 sign-up
    form that goes through therefore always creates an account connected to that 42 account;
    someone who leaves it for the ordinary sign-up creates an ordinary account and can connect 42
    later with their password.
- **`link`, Connect 42**: one SSI tx re-reads the Student, which must still be Active, the attempt's
  `studentId` and without a 42 account connected, else the failure path; and whether any other row
  holds the `id`, a Removed one included. If one does →
  `302 /me?oauth=in_use`, *"This 42 account is connected to another PeerConnect account."*;
  otherwise it sets `forty_two_id` on the Student's own row and redirects `302 /me?oauth=connected`.
  The `forty_two_id` unique is the backstop and gives the same answer. The session is untouched.

  > **Updated 2026-10-25** (map #1's note of this date): the notice no longer names the product. It
  > reads *"This 42 account is already connected to another account."*, since the Student reading
  > it is signed in.
- **Disconnect 42**: **`POST /api/auth/42/disconnect`** `{ password }`, signed in. After the throttle, a
  password check of the current password (§5.1), refused → `password_incorrect`, counted (§5.5); then one SSI tx
  re-reads the Student: no 42 account connected → `forty_two_not_connected`; otherwise it clears
  `forty_two_id`.
- **Every Student has a password**, whichever way they joined, so someone 42 no longer lets in still
  signs in with email and password. A Student created through 42 is an ordinary Student: there is
  no 42-only kind of Student and no 42-only feature (ADR-0018 d7's note).
- **A Removed row keeps `forty_two_id`**, like its email, so that 42 account can never make a new
  Student, and Connect 42 on another account answers `in_use` (ADR-0008 d7's note of 2026-10-08).
  **No Admin action sets, changes or clears it** (ADR-0008 d8's note).

**(C) Recovery through Confirm with 42** (ADR-0003 d6's and d11's notes of 2026-10-08, ADR-0018
d8's note).

- A signed-in Student who connected 42 presses **Confirm with 42** on `/me`: `start` with
  `intent: "confirm"`. At the callback, after step 7, the `id` must equal the Student's
  `forty_two_id`, re-read then; anything else takes the failure path. The API stores a
  **permission** in memory in the same store, `{ bindingKey: sha256(sessionToken), studentId,
  fortyTwoId, expiresAt: now + 10 min }`, never a database row, writes nothing else, and redirects
  `302 /me?oauth=confirmed`, where the SPA shows the new-password form.
- That form sends **`POST /api/auth/42/password`** `{ newPassword }`, signed in, with no throttle
  (§5.5). After validation it **takes** the permission under its session's key, so it is used once. None, an expired one, or a
  Student whose `forty_two_id` no longer equals the confirmed one (re-read) → `confirmation_required`.
  Then §5.1's password change runs with its step 3 replaced by this permission: the Student is
  signed out everywhere and returns to `/sign-in`.
- **A PeerConnect session alone cannot change the password**: Confirm with 42 also needs the
  connected 42 account, signed in in that browser. If the 42 intranet is still signed in there, 42
  may send the browser straight back without asking for anything: it is plain OAuth 2.0, with no
  way to ask for a fresh login. So whoever controls the connected 42 account in a browser controls
  the PeerConnect account, as they already could through Sign in with 42, and the Terms say so.
  Connect 42 asks for the current password (B), so a session left open cannot attach another 42
  account and use it here. An Admin still sets no password (ADR-0018 d8's note).

**Tests.** Two checks in `12-sign-in` cover Sign in with 42, with only the two calls to 42, the token
exchange and `/v2/me`, replaced by a fixed answer; everything after them is the real code on the
fallback (§16.3, ADR-0016 d1's note of 2026-10-08). The real round trip to 42 is shown by hand,
once on the registered application and again at the defense (§15.7). The rest of the flow fails
loudly, as 404s and redirects, and has no check of its own (ADR-0016 d7).

### 5.7 Authorization matrix

"Participating" = role `STUDENT` or `PEER_MODERATOR`. Every row also requires an Active actor.

| Capability | STUDENT | PEER_MODERATOR | ADMIN | Relation condition |
| --- | --- | --- | --- | --- |
| Own profile, Skills, Goal, avatar, password, sign-out | ✓ | ✓ | ✓ | self |
| Connect 42, Disconnect 42, Confirm with 42 | ✓ | ✓ | ✓ | self; Connect and Disconnect with the current password (§5.6) |
| Set own password without the current one | ✓ | ✓ | ✓ | self, once, within ten minutes of Confirm with 42 on the connected 42 account (§5.6 C) |
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
| Set, change or clear another Student's `forty_two_id` | ✗ | ✗ | ✗ | never (ADR-0008 d8's note) |

### 5.8 What invalidates sessions and sockets

| Event | Sessions deleted | Sockets dropped (after commit) |
| --- | --- | --- |
| Logout | that one | the sockets authenticated by that session |
| Password change, or a new password after Confirm with 42 | all of the Student's, twice: before and after Supabase's admin update (§5.1) | all of the Student's, after each |
| Suspension | all | all |
| Removal | all | all |
| Role change | none | none |
| Connect 42, Disconnect 42, Confirm with 42 | none | none |
| Expiry | none (row stays until the next purge) | none; the next handshake fails and the client goes to sign-in |

---

## 6. API contract

### 6.0 Conventions

#### 6.0.1 General

- Base path `/api`; JSON bodies; the §3.8 envelope; ids are UUIDs (malformed → 400).
- **List paging**: tables take `page` (≥ 1) and `pageSize` (1–50, default 20) and return `{ items,
  total }`; streams (feed, answers, threads, messages) take an opaque `cursor` over
  `(created_at, id)` descending and return `{ items, nextCursor }`.

  > **Updated 2026-10-24:** a Post stream (the feed, a Student's Posts and a Prompt's answers)
  > **pages like a table**: it takes `page` and `pageSize` (default 20) and returns `{ items,
  > total }`, read with an offset in the feed index's `(created_at DESC, id DESC)` order beside a
  > count of the same Posts, in one read-only transaction. A Prompt's answers keep `prompt`, `live`
  > and `answeredByMe` beside them (§6.8). The SPA shows one page of 20 at a time with page
  > numbers, the page in the URL as `?page=`, and replaces a page past the end with the last one.
  > A Post stream took a `cursor`, returned 50 Posts a page and added each page under the last
  > with "Load more", so a reader scrolled past 50 Posts, then 100. Threads and messages keep
  > their `cursor` and their 50 a page (§6.5).
  >
  > Page numbers drift while Posts arrive or leave: a new Post pushes every later Post down one
  > place, so the last Post of page 1 shows again at the top of page 2, and a Post a moderator
  > removes pulls them up one place, so one Post is skipped. At this size that is accepted, and
  > nothing prevents it. A live `post:created` goes to the top of a loaded page 1 (§7.4).
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
| password | at least 8 characters and at most 72 bytes in UTF-8, so an accented or Arabic letter counts two bytes or more; no composition rule, except that a new password holds no emoji (§5.1, ADR-0003 d3's notes) |
| display name | 1–40 characters, no control characters, no Unicode format characters (`Cf`) except U+200C and U+200D, no emoji (§3.5; the note of 2026-11-01 below) |
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

All strings are trimmed; a field whose minimum above is 1 is invalid when empty after trimming;
control characters other than a newline in multi-line fields are rejected. **Search `q` — on both
search routes, §6.2 and §6.12 — is the one string whose minimum is 0**: absent, or empty after
trimming, it applies no text filter and is never `validation_failed`, so clearing the search box is
ordinary use (§3.8.2).

> **Changed 2026-11-02** (#254, at Ahmad's request): a **Direct Message is 1–500** characters (it
> read 1–2000); every other limit above stays. Each limit is now held on **three layers**: the API,
> the SPA, and the database (§4.4's note of the same day). The SPA stops a field at its limit when
> text is typed, pasted, dropped or composed with an IME. It cuts only the text being added, never
> text already in the field, and cuts whole characters only, so an emoji or a flag is never split. A
> multi-line field shows how many characters are left once 80% of its limit is used, and a text
> field or text area says in one sentence when it has cut text. All three layers count characters by
> code point (`charLength` in `src/shared/limits.ts`, `char_length` in SQL), so an emoji such as 😀
> counts one and a family emoji counts each of its code points. The SPA counts the field as typed
> and the API counts it after trimming, so the SPA is never looser than the API. The search box
> inside a long dropdown, which filters on the client and sends nothing, stops at the 60 characters
> of Search `q` without that sentence, since nothing it holds is kept. A password field also cuts
> without it, at 72 bytes, as §5.1's note of 2026-10-31 has it: nothing on the page names that
> limit. A Direct Message saved before this note keeps its whole text: it still shows, and can
> still be marked read (§4.3.8's note).

> **Updated 2026-11-01**, decided by the team in Ahmad's review of
> [#244](https://github.com/ahmadmnsur/ft_transcendence/pull/244): a display name and a new password
> may not hold an emoji, as `hasEmoji` in `src/shared/limits.ts` defines it (§5.1's note of the same
> day lists what it matches), and both ends check it. For the password this is ADR-0003 d3's note of
> the same day; the display name's rule has no ADR, as its `Cf` rule had none. A current password is
> checked without that rule (§5.1). A value that holds an emoji is refused under its field with its
> own sentence, *"A display name can't contain emoji."* or *"A password can't contain emoji."*, even
> when it is also too short. **A display name saved before this note that holds an emoji keeps
> showing** wherever names show. The profile form, the Student's own on `/me` and an Admin's on
> `/admin/users/:studentId`, refuses to save until the emoji is removed, even when only the email
> changed: it checks the name on every save, though it sends only the fields that changed, and the
> API checks a display name only when one is sent.

### 6.1 Configuration, session and authentication

| Endpoint | Auth | Behaviour |
| --- | --- | --- |
| `GET /api/config` | public | `{ publicOrigin, oauth42Enabled }` |
| `GET /api/session` | public | `{ authenticated: false }` or `{ authenticated: true, student: { id, displayName, email, role, avatarUrl } }`; performs lazy renewal |
| `GET /api/health` | public | `{ status: "ok" }` once the app is listening (Compose healthcheck) |

**`POST /api/auth/signup`** — Auth: public; refused `already_signed_in` if a valid session exists ·
Input `{ email, password, displayName, acceptTerms }` · Validation §6.0.3, `acceptTerms === true` ·
Throttle §5.5 · Rule: reads the email → `email_unavailable` if any row holds it, Removed rows
included (ADR-0008 d7); NestJS makes the id; Supabase admin create, outside the transaction (§5.1)
· Persist `Student` (its `id` passed in, role `STUDENT`, xp 0, streak 0, `password_version` 0, both
name fields through `nameFields`) and `Session` · Events none · Refusals `email_unavailable`,
`too_many_attempts`, `busy_retry_later` (Supabase Auth unreachable, nothing written) · Concurrency:
two sign-ups of one email → the unique index admits one; the loser gets `email_unavailable` and its
Supabase Auth user is deleted, best effort · Visibility: sets the cookie. Never uses a 42 sign-up
draft (§5.6 B).

**`POST /api/auth/login`** — public · `{ email, password }` · Validation §6.0.3 (malformed email →
`validation_failed`) · throttle · with a valid session → `already_signed_in` · find the Student,
password check, then the SSI tx (§5.1) · Persist `Session`, purge the Student's expired rows ·
Events none · Refusals `no_account`, `password_incorrect`, `account_removed` and `account_suspended`
(both only after the right password), `too_many_attempts`, `busy_retry_later` · Concurrency: the SSI tx
re-reads `password_version` and the flags (§5.1); otherwise none (each login inserts its own
`Session` row) · Visibility: sets the cookie on success.

**`POST /api/auth/logout`** — session · `{}` · delete the caller's row · Events `revokeSessions
(sessionHash)` · clears the cookie · Refusals: a session already gone → `unauthenticated` (guard)
· Concurrency: none (single-row delete). Writes nothing to Supabase Auth (ADR-0003 d6's note).

**`POST /api/auth/password`** — session · `{ currentPassword, newPassword }` · Validation §6.0.3 ·
the throttle's count of a wrong current password (§5.5) · §5.1's six steps: password check of the
current one → `password_incorrect`; SSI tx raising `password_version` and deleting all the
Student's sessions; Supabase admin update; the same SSI tx again · Events `revokeSessions
(studentId)` after each tx · clears the cookie · Refusals `password_incorrect`,
`too_many_attempts`, `busy_retry_later` (Supabase Auth unreachable: at step 3 nothing changes; at
step 5 the Student is signed out, the password unchanged) · Concurrency: a change whose version moved since its read → `password_incorrect`, so
two changes cannot both go through; a sign-in racing it is deleted or refused (§5.1).

> **Updated 2026-10-14** (#36; §3.6.3's note of 2026-10-14): the version check alone does not make
> *two changes cannot both go through* true. A per-Student lock, taken just before step 4 and held
> through step 6, serializes concurrent changes; a change that waited finds the version moved and gets
> `password_incorrect`, not counted (§5.5). The lock relies on one `api` process (§15.1), like the
> throttle.

> **Updated 2026-10-14** (#36; §5.1's note of 2026-10-14): `busy_retry_later` at step 5 leaves the
> Student signed out, but the password is unchanged only when the update never took effect; when
> its answer is lost, the new password may already be set.

**`POST /api/auth/42/start`**, **`GET /api/auth/42/callback`**, **`GET /api/auth/42/draft`**,
**`POST /api/auth/42/signup`**, **`POST /api/auth/42/disconnect`**, **`POST /api/auth/42/password`**
— §5.6. Every one returns 404 while 42 is not configured.

> **The New dots routes, 2026-11-03 ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262); ADR-0021 decisions 2–4)** *(uncommitted)*:
>
> | Endpoint | Auth | Behaviour |
> | --- | --- | --- |
> | `GET /api/me/new-dots` | session | `{ feed, messages, match, friends, prompts, feedback, reports }`, each a boolean; no side effect |
>
> **`POST /api/me/new-dots/opened`** — session · `{ page }`, `page` one of `feed`, `messages`,
> `match`, `friends`, `prompts`, `reports` or `feedback`, and with `feedback` only, an
> optional `matchId` · Validation: any other key or value → `validation_failed` · Persist: that
> page's `*_opened_at` on the caller's own `Session` row = now, or the time of the newest thing
> waiting on that page if that is later, so nothing the opening saw shows a dot; `feedback` has no column and sets
> `PrivateFeedback.read_at = now` on every unread Private Feedback about the caller, or with
> `matchId` on that Match's only, where the caller is its Mentor · Result: the same object as the
> `GET` · Events `new-dots:changed {}` to that sign-in's own sockets; for `feedback`, to the
> caller's own `student:<id>` room, and only when it marked one (§7.4) · Refusals: none of
> its own; an unknown `matchId`, or a Match the caller is not the Mentor of, writes nothing and
> is not an error, so it reveals nothing.
>
> A key is `true` when the newest thing waiting on its page is later than its column, or the
> column is null and something waits; `feedback` has no column, so unread is enough. A key that
> does not apply to the caller's role is `false`. Each counts what its page shows, with the
> page's own filters:
>
> | Key | What waits | Its time |
> | --- | --- | --- |
> | `feed` | another Student's Like on one of the caller's Posts that is not removed | `Like.created_at` |
> | `messages` | an unread Direct Message to the caller, as the thread list counts it (§6.5) | `created_at` |
> | `match` | a Match waiting for the caller's Accept or Decline; for the Mentee, an accepted Match with no Review | `created_at`; the later of the two accept times |
> | `friends` | a pending friend request to the caller | `created_at` |
> | `prompts` | the live Prompt, unanswered by the caller; `false` for an `ADMIN` | `published_at` |
> | `feedback` | Private Feedback about the caller with `read_at` null | none |
> | `reports` | an open Report filed by someone else, in a group the caller can act on (§12.4); `false` for a `STUDENT` | `created_at` |

### 6.2 Profiles, Skills, Learning Goal, search

| Endpoint | Auth | Behaviour |
| --- | --- | --- |
| `GET /api/skills` | session | the catalogue, by name |
| `GET /api/me` | session | own profile with email, role, status, Skills, Goal, XP, Level, Streak, Badges, progress, and `fortyTwoConnected` (whether a 42 account is connected, never its number) |
| `GET /api/students/:id` | session | profile per §4.6; tombstone if Removed; **never an email, for any viewer** — email is never on a profile (§4.6, ADR-0018 d4): the owner reads their own on `GET /api/me`, Admins on `GET /api/admin/students/:id` (§6.12) |
| `GET /api/students/:id/posts?cursor` | session | their non-removed Posts |
| `GET /api/students?q&teaches&wants&hasGoal&sort&order&page&pageSize` | session | **Advanced search**: excludes Removed, includes Suspended and Admins; `q` matches the folded display name only, `displayNameSearch` `contains` `foldName(q)` (§4.3.1), so `helene` finds Hélène and `احمد` finds أحمد, never email; `%` and `_` in `q` are escaped: whoever builds it confirms whether Prisma's `contains` escapes them, and escapes them in that query if not (#95's refinement); `teaches`/`wants` are Skill ids; `hasGoal` boolean; `sort ∈ name, xp, joined` (default `name`), `order ∈ asc, desc`; ties `id ASC`; returns `StudentRef` + Skills + Level + XP and `total` |

> **Updated 2026-10-18** (#42; #95's refinement of 2026-10-02): in the *Advanced search* row, the
> question left to whoever builds it is answered: Prisma's `contains` does not escape `%` or `_`.
> Checked on Prisma 7.10 against the test database, `contains: '%'` and `contains: '_'` each
> matched every name, while `contains: '\%'` matched only a name holding `%`. So
> `nameSearchWhere` (`src/students/name-search.ts`) escapes `\`, `%` and `_` itself, after the
> fold, since NFKD turns `％` into `%`: `q=%` finds only a name holding `%`, and `q=_` only one
> holding `_`. §6.12's Users table (#65) reuses `nameSearchWhere` for its name match.

> **Updated 2026-10-24** (§6.0.1's note of the same day): `GET /api/students/:id/posts` takes
> `?page&pageSize` in place of `?cursor` and returns `{ items, total }`; for a Removed Student it
> is `{ items: [], total: 0 }`.

**`PATCH /api/me`** — session · `{ displayName?, email? }` · Rule: actor Active; a new email is
unused (Removed rows included) → else `email_unavailable` · Persist `Student`: a new display name
writes `display_name` and `display_name_search` together through `nameFields` (§4.3.1); a new email
writes `Student.email` alone, with Supabase Auth untouched and no mail sent (ADR-0008 d8's note) ·
Concurrency: the unique index decides two concurrent claims — the loser gets `email_unavailable`
with nothing written.

**`PUT /api/me/skills`** — session · `{ teach: uuid[], learn: uuid[] }` · Validation: ids in the
catalogue, no duplicates within a list, no Skill on both lists (§4.3.5), ≤ 15 each · Rule: diff
against current rows; delete removed rows, insert added rows, **keep rows that stay** · if the
Goal's `LEARN` row is deleted, clear both Goal columns first (M5) · Persist `StudentSkill`,
`Student` · Result `{ goalCleared }` · Events none · Refusals: validation breaches →
`validation_failed` · Effect: the
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
| `GET /api/files/avatars/:token` | session → else **401** | any signed-in Student; unknown token → 404; the whole file read from the `avatars` bucket, then sent (§9.8), with the row's canonical `Content-Type`, `nosniff`, `Cache-Control: private, max-age=86400, immutable`; a row whose file Storage cannot give → **500** `internal_error`, logged, never 404 |
| `GET /api/files/evidence/:token` | session → else **401** | resolve `Evidence → Review → Match`; allow iff actor is that Match's `mentor_id` or `mentee_id`, or the actor's current role is `ADMIN` → else **403**; unknown token → 404; the whole file read from the `evidence` bucket, then sent (§9.8); `Content-Disposition: inline; filename="<sanitised>"`, `nosniff`, `Cache-Control: private, no-cache`; a row whose file Storage cannot give → **500** `internal_error`, logged |

**`PUT /api/me/avatar`** (multipart field `file`) — `UploadCsrfGuard` → session → Multer (one file, `limits.fileSize` 2 MiB + 1 byte) → size check (`size > 2,097,152` →
`file_too_large`) → byte validation §9.5 → NestJS makes a new token and uploads the file to the
`avatars` bucket under it, before the transaction (§9.8) · Rule: actor Active · Persist upsert
`Avatar` with that token, `mime`, `size` and `uploaded_at` · Events: after commit, the replaced file
is deleted · Result `{ avatarUrl }` · Refusals `file_too_large`, `file_type_not_allowed`,
`file_invalid` (each before the upload); a save that fails deletes its new file as §9.8 says ·
Concurrency: two uploads serialize; the later commit wins; one row, and the earlier file is deleted
after the later commit.
**`DELETE /api/me/avatar`** — session · `{}` · Rule: actor Active · delete the row if present
(idempotent `ok: true`), then the file after commit (§9.8) · Events none.

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

> **Changed 2026-11-03 ([#260](https://github.com/ahmadmnsur/ft_transcendence/issues/260))** *(uncommitted)*, **landed on `main` at `20057b3`**:
> `friends:changed {}` replaces "Events none" for the five friend writes above: a request sent,
> accepted, declined or cancelled, and a Friendship ended. After commit it goes to `student:<id>`
> of both Students of the request or Friendship (§7.4). A refusal sends nothing. The client reads
> again `GET /api/friends` and `GET /api/friends/requests`. A Block still sends nothing, even when
> it deletes the pair's Friendship in the same transaction; lifting a Block sends nothing too.

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

> **2026-11-03 ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262); ADR-0021 decision 2)** *(uncommitted)*: "Events none" no longer holds. When the call
> marks at least one message, `new-dots:changed {}` goes to the actor's own `student:<id>` room
> after commit, so the Messages dot of their other sign-ins reads again (§7.4). The sender is told
> nothing, so there is still no read receipt.

### 6.6 Rounds and Matches (Student side)

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/rounds/current` | `{ round: { id, number, openedAt } | null }` |
| `GET /api/matches/current` | the actor's standing Match in the open Round, else null (`MatchView`) |
| `GET /api/matches?page` | the actor's own Match history, every status |
| `GET /api/matches/:id` | the pair only — its Mentor or Mentee, whatever their current role (a Match made before promotion stays readable here) → `MatchView` + `review` (Learning Outcome, Evidence metadata) + `privateFeedback` (once the Review exists; the Mentor it is about and its author are exactly the pair); any other authenticated caller, **an Admin outside the pair included** → **404 `not_found`** (the invisibility §8.5 gives accept/decline). Admins read every Match through `GET /api/admin/matches/:id` (§6.13), because `MatchView` is written from one participant's side |

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

> **2026-11-03 ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262); ADR-0021 decision 4)** *(uncommitted)*: the Mentor reads Private Feedback by opening
> `/feedback` or a Match's page: `POST /api/me/new-dots/opened` with `{ page: "feedback" }`, and
> `matchId` for one Match, sets its `read_at` (§6.1's note of the same day).
> `GET /api/me/feedback-received` still has no side effect, and neither it nor any other response
> carries `read_at`, to the Mentor or to the Mentee. When an opening marks any, `new-dots:changed {}`
> goes to the Mentor's own `student:<id>` room, so their other sign-ins follow (§7.4).

### 6.8 Reflection Prompts

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/prompts/live` | `{ prompt: { id, question, publishedAt } | null, answeredByMe }` |
| `GET /api/prompts?page` | every Prompt, greatest publication order first, `live` flag, answer count |
| `GET /api/prompts/:id/answers?cursor` | its non-removed answer Posts |

> **Updated 2026-10-24** (§6.0.1's note of the same day): `GET /api/prompts/:id/answers` takes
> `?page&pageSize` in place of `?cursor` and returns `{ prompt, live, answeredByMe, items,
> total }`.

**`POST /api/prompts/:id/answers`** and **`POST /api/admin/prompts`** — §8.12.

> **2026-11-03 ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262); ADR-0021 decision 2)** *(uncommitted)*: an answer also sends `new-dots:changed {}` to
> its author's own `student:<id>` room after commit, beside `post:created`, so the Prompts dot of
> their other sign-ins reads again (§7.4).

### 6.9 Feed and Likes

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/feed?cursor` | non-removed Posts newest first: `{ id, origin: TAKEAWAY|PROMPT_ANSWER, prompt?: { id, question }, author: StudentRef, body, createdAt, likeCount, likedByMe }`. A Takeaway never names the Mentor (ADR-0018 d4) |
| `GET /api/posts/:id` | one Post |
| `GET /api/posts/:id/likes` | the likers' `StudentRef`s |

> **Updated 2026-10-24** (§6.0.1's note of the same day): `GET /api/feed` takes `?page&pageSize`
> in place of `?cursor` and returns `{ items, total }`.

**`POST /api/posts/:id/like`** — session · `{}` · Post exists (unknown → 404) · insert `ON CONFLICT DO
NOTHING` · `{ likeCount, likedByMe: true }`. **`DELETE /api/posts/:id/like`** — session · `{}` · delete if
present · `{ likeCount, likedByMe: false }`. No XP, no event, not reportable (ADR-0014 d5). **A removed Post** answers every route above
with `post_unavailable` (200), never 404: a loaded feed can still show a Post a moderator has just
removed, so reaching it is normal use (§3.8.2). That includes both Like writes: `POST
.../like` and `DELETE .../like` against a removed Post return `post_unavailable` (200) and write
nothing — no insert, no delete.

> **Changed 2026-11-03 ([#260](https://github.com/ahmadmnsur/ft_transcendence/issues/260))** *(uncommitted)*, **landed on `main` at `20057b3`**:
> "no event" in "No XP, no event, not reportable" above no longer holds.
> `POST /api/posts/:id/like` and `DELETE /api/posts/:id/like` send `post:likes { postId, likeCount }`
> to `feed` after commit, with the count the transaction counted (§7.4).
> A Like on one's own Post sends it too, so every tab shows the same count (ADR-0014 d5). A
> repeated Like or unlike that writes nothing sends nothing, as a repeated accept (§8.5). A removed
> Post still answers `post_unavailable`, writes nothing and sends nothing. No XP and not reportable
> still hold.

> **2026-11-03 ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262); ADR-0021 decision 5's note of the same day)** *(uncommitted)*: a Like or unlike by a
> Student who is not the Post's author, when it changes a row, also sends `new-dots:changed {}` to
> the author's `student:<id>` room after commit, so their Feed dot reads again (§7.4). A
> self-Like sends only `post:likes`. The answers of both Like routes are unchanged.

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
| `GET /api/admin/students?q&role&status&sort&order&page&pageSize` | the Users table: name, email, role, status (Active/Suspended/Removed), **Removed rows included**; `q` matches the folded name (`displayNameSearch` `contains` `foldName(q)`, wildcards escaped, as §6.2) or the email |
| `GET /api/admin/students/:id` | the §6.2 profile plus email, role, status, avatar and the Student's Matches (§4.6); **never** their Friends, pending requests, Blocks or Direct Messages, which §4.6 keeps from Admins; view-only when Removed |
| `PATCH /api/admin/students/:id` | `{ displayName?, email? }` — target not Removed → else `student_removed`; written as §6.2's `PATCH /api/me`: both name fields through `nameFields`, an email in `Student.email` alone, Supabase Auth untouched |
| `PUT /api/admin/students/:id/skills` | as §6.2, on the target |
| `PUT` / `DELETE /api/admin/students/:id/learning-goal` | as §6.2, on the target |
| `PUT` / `DELETE /api/admin/students/:id/avatar` | as §6.3, on the target (upload CSRF applies) |
| `POST /api/admin/students/:id/role` | `{ role }` |
| `POST /api/admin/students/:id/suspend` · `/reinstate` · `/remove` | `{}` |

> **Updated 2026-10-18** (#65): in the Users table row, `q`'s email match is a `contains` like the
> name match, and escapes `\`, `%` and `_` the same way, with the escape `nameSearchWhere` uses in
> `src/students/name-search.ts`. Unescaped, `_` matches any one character and `%` any run, so
> `q=john_doe` would also find `john.doe@…`, and `q=%` or `q=_` would return every row.
>
> **Refined 2026-10-23** (#65; [the question left open](https://github.com/ahmadmnsur/ft_transcendence/issues/65#issuecomment-6252982885)
> after #185): the email match ignores letter case. It takes `q` trimmed and lower-cased, as every
> email is stored (§4.3.1), never folded, and then escapes `\`, `%` and `_` with that same escape,
> which `src/students/name-search.ts` now exports. So `q=Karim.01@peerconnect.test` finds
> `karim.01@peerconnect.test`. Taken as typed, `q` would reach Prisma's `contains`, a case-sensitive
> `LIKE` on PostgreSQL, and a capital letter would find no email.

No endpoint sets a password, XP, Level, Streak, Badge or `forty_two_id`, or edits any Review,
Private Feedback, Post, Report or Direct Message (ADR-0008 d8 and its notes, ADR-0018 d8). Supabase's
admin update, which a password change uses, is never offered as an Admin action. No endpoint
creates a Student, and none writes to Supabase Auth.

### 6.13 Admin — Rounds, Matches, Prompts (`ADMIN`) — §8 specifies each

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/admin/rounds` | every Round with number, times and counts per status |
| `POST /api/admin/rounds` | open a Round (§8.4) |
| `POST /api/admin/rounds/current/close` | close the open Round (§8.7) |
| `GET /api/admin/rounds/:id` | its Matches (pair, status, Score or hand-made, Mission); for the open Round also `unmatched` (§8.9) |
| `POST /api/admin/rounds/current/matches` | hand-made Match `{ studentIds: [a, b] }` (§8.6) |
| `GET /api/admin/matches/:id` | full Match: `AdminMatchView` + `review` (Learning Outcome, Evidence metadata) + `privateFeedback`, for any Match |
| `GET /api/admin/prompts` | Prompt history |
| `POST /api/admin/prompts` | publish (§8.12) |

`AdminMatchView` = `{ id, roundNumber, status, mentor: StudentRef, mentee: StudentRef,
compatibilityScore | null, handMade, goalBonusApplied, coverage: { forward: Skill[], reverse: Skill[] },
mission, mentorAccepted, menteeAccepted, declinedBy: StudentRef | null }` — both participants named,
where `MatchView` names one side's partner (§6.6).

### 6.14 Admin — Learning Analytics — `GET /api/admin/analytics` (§13)

### 6.15 Refusal and error codes

| Code | Status | Meaning |
| --- | --- | --- |
| `validation_failed` | 400 | DTO schema violated |
| `unauthenticated` | 401 | no valid session on a protected route |
| `forbidden` | 403 | role or relation forbids (never reachable from the UI's own controls) |
| `csrf_rejected` | 403 | upload Origin/header gate |
| `not_found` | 404 | unknown resource; any `/api/auth/42/*` route while 42 is not configured |
| `payload_too_large` | 413 | transport envelope exceeded |
| `unsupported_media_type` | 415 | mutation not JSON / upload not multipart |
| `busy_retry_later` | 503 | Unit of Work retries exhausted, or Supabase Auth unreachable (§5.1); nothing committed by that step |
| `internal_error` | 500 | anything else, a file row whose file Storage cannot give (§6.3) and a file save stopped by the 30-minute rule (§9.8) included |
| `no_account`, `password_incorrect`, `account_removed`, `account_suspended`, `too_many_attempts`, `email_unavailable`, `already_signed_in` | 200 | auth refusals (§5.1; M36); `password_incorrect` also answers a wrong current password and a password change that lost a race; the two sanction codes come only after the right password |
| `oauth_failed`, `forty_two_connected`, `forty_two_not_connected`, `confirmation_required` | 200 | Sign in with 42's JSON refusals (§5.6; M35): no live draft for the 42 sign-up form, or another account took that 42 account first; Connect 42 while connected; Confirm with 42 or Disconnect 42 while not connected; a new password with no fresh Confirm with 42 |
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

> **Updated 2026-10-14** (#36; §5.1's note of 2026-10-14): in the `busy_retry_later` row, "nothing
> committed by that step" does not hold for the password change's step 5 when the admin update's
> answer is lost: Supabase Auth may already have set the new password. The Student is signed out
> either way, and the SPA's notice says the change may not have finished.

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
2. **Session — Socket.IO middleware (`io.use`)**: parse `pc_session`, resolve as §5.3 (no renewal),
   reading PeerConnect's tables only and never calling Supabase Auth (ADR-0003 d5's note);
   failure → `next(new Error("unauthorized"))`. The session row is untouched.
3. **On connect**: register `{ socketId, studentId, sessionHash }` in the Presence registry (§7.6),
   then re-read the session row once; if it is gone, disconnect. A handshake whose step 2 read ran
   before a revoking commit but which registers after `revokeSessions` has swept the registry is
   caught here, because the commit deleted the row first. Only then join `feed`, `rounds` and
   `student:<studentId>` and apply §7.6's online transition.

> **Staff admission, 2026-11-03 ([#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261))** *(uncommitted)*, **landed on `main` at `2c9eb01`**:
> step 3's session re-read also reads the Student's current role. `PEER_MODERATOR` and `ADMIN`
> join `staff` beside the three rooms above; a `STUDENT` never joins it. A role move that runs
> while that socket waits overrides the re-read's role, so a stale read cannot undo a demotion
> or promotion. Consecutive moves apply in the order they run, the last one winning. A held
> `staff` event is delivered after admission only if the socket ends up in `staff`; held events
> for the other rooms keep their existing behaviour. A held event that skips some Students
> (`reports:changed`, §7.4) is never delivered to their sockets.

### 7.3 Client → server: exactly one event

`dm:send`, with acknowledgement. Payload `{ recipientId: uuid, body: string }` (body 1–2000). The
gateway validates, then calls `messaging.send(actor, recipientId, body)` — one SSI tx that reads the
sender's row (Active), the recipient (exists, ≠ sender, not Removed) and the pair's Block rows (none
in either direction), then inserts the `DirectMessage`. **After commit**: `dm:message` to
`student:<recipientId>` and `student:<senderId>` (the sender's other tabs). Ack `{ ok: true, data:
DirectMessage }` or `{ ok: false, error: { code: dm_unavailable | validation_failed |
busy_retry_later } }`. **No other client event has a handler**; nothing a client sends performs a
privileged action (ADR-0003 d9). DMs are not restricted to Friends (ADR-0018 Consequences).

> **Changed 2026-11-02** (#254): the body is 1–500 characters after trimming (it read 1–2000);
> a longer one is acknowledged `validation_failed` and nothing is written (§6.0.3's note).

> **Refined 2026-10-20 by #47, review of #196:** the failure-code list also includes
> `unauthenticated` when the socket has no session or the sender's transaction re-read finds
> them no longer Active, and `internal_error` for an unexpected failure. An `unauthenticated`
> acknowledgement re-probes `/api/session` and follows §3.8.2's sign-in path. In addition to
> §6.15's retry-exhaustion and Auth-unreachable cases, `busy_retry_later` answers a send while
> §7.2 step 3's session re-read is pending: no message is written in that window.

> **A second client event, 2026-11-01 ([#249](https://github.com/ahmadmnsur/ft_transcendence/issues/249); ADR-0003 d9's note of the same day)** *(uncommitted)*, **landed on `main` at `4cc1717`**:
> the heading's "exactly one event" no longer holds. A client may also send **`dm:typing`**,
> payload exactly `{ recipientId: uuid, typing: boolean }`, with **no acknowledgement**. The
> gateway drops any other payload, and an event while §7.2 step 3's re-read is pending, without
> an answer. Otherwise it reads, in one read-only snapshot, what `dm:send` reads: the sender is
> Active, and the recipient exists, is not the sender, is not Removed and is in no Block with the
> sender either way. If all hold, it emits `dm:typing { studentId: senderId, typing }` to
> `student:<recipientId>` only (§7.4); if not, it sends nothing anywhere, so the sender learns
> nothing about a Block. Nothing is written or stored. The gateway takes at most one
> `typing: true` per second for each sending socket and recipient, counted as the requests arrive,
> and does not relay one that only renews dots already shown within a second of the previous relay;
> one that brings the dots back after a relayed `typing: false` is relayed as soon as it is taken.
> A `typing: false`, sent or caused by the socket's disconnect, is relayed only after a
> `typing: true` was, and only after the same read finds the pair still able to exchange a Direct
> Message. The SPA sends `typing: true` at the
> first input after a stop, no sooner than a second after its previous one, and again at most every
> 2 seconds while input continues. It sends `typing: false` when the field empties, a send starts,
> 1.5 seconds pass without input or the page closes, and nothing while disconnected. It is still
> true that **nothing a client sends performs a privileged action**, and `dm:send` stays the only
> write.

### 7.4 Server → client events (the complete list)

| Event | Room | Payload | Emitted after the commit of | Client reaction |
| --- | --- | --- | --- | --- |
| `post:created` | `feed` | the full feed item (§6.9) with `likeCount: 0` | a Prompt answer or a Review | insert at the top of a loaded feed |
| `round:opened` | `rounds` | `{}` | Round open | invalidate current Round, current Match, admin Round views, analytics |
| `round:closed` | `rounds` | `{}` | Round close | invalidate the same, plus `/api/me/progress` when a profile is open (Consistent Learner) |
| `match:ready` | `student:<id>`, each Student of the pair | `{}` | Round open (every matched Student); hand-made Match (both) | invalidate the current Match |
| `dm:message` | `student:<recipient>`, `student:<sender>` | the `DirectMessage` | a DM send | append to the open thread; otherwise bump that thread's unread count |
| `presence:update` | `student:<friendId>` for each accepted Friend | `{ studentId, online }` | not a DB commit — a registry transition (§7.6) | update the Friends list |

> **Updated 2026-10-24** (§6.0.1's note of the same day): the feed shows one numbered page at a
> time, so `post:created`'s "top of a loaded feed" is the top of a loaded page 1. The Post goes
> there, page 1 keeps 20 Posts, and its `total` grows by one. Another page takes nothing; its
> reader sees the Post on page 1, which is read again when opened.

> **A seventh event, 2026-11-01 ([#249](https://github.com/ahmadmnsur/ft_transcendence/issues/249); §7.3's note of the same day)** *(uncommitted)*, **landed on `main` at `4cc1717`**:
>
> | Event | Room | Payload | Emitted after the commit of | Client reaction |
> | --- | --- | --- | --- | --- |
> | `dm:typing` | `student:<recipient>` | `{ studentId, typing }` | not a DB commit — a relayed `dm:typing` from the writer (§7.3) | on the open page of that pair, show or hide the typing dots; hide them on that Student's `dm:message`, on a disconnect, and 4 seconds after the last `typing: true` |
>
> The writer's other tabs do not receive it. `presence:update`'s reaction also covers the page of a
> Direct Message: its header reads the peer's status from the same cached Friends list
> (`GET /api/friends`, kept 30 seconds), so the page adds at most that one read, and none when the
> list was just read.

Round events are content-free invalidation signals (ADR-0010 d7, ADR-0015 d8); no event carries a
Badge, a Report, a role or any Admin data. **No event is added** for Likes, declines, Reviews,
Evidence, Prompt publication, reports or sanctions; those surfaces refresh on navigation or reload.

> **Changed 2026-11-03 by ADR-0021 decisions 5 and 6 ([#259](https://github.com/ahmadmnsur/ft_transcendence/issues/259))**: friend
> requests, Match answers, Reviews, Prompt publication, removed Posts, the report queue and the
> author's like count gain events, and a fourth room, `staff`, joins for Peer Moderators and
> Admins. Each row is added here by the ticket that builds it: [#260](https://github.com/ahmadmnsur/ft_transcendence/issues/260) (`friends:changed`,
> `match:changed`, `post:likes`), [#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261) (`post:removed`, `prompt:published`,
> `reports:changed`) and [#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262) (`new-dots:changed`). Evidence and sanctions still have no
> event, and the sentence above holds for them. No new event carries a Badge, a Report, a role or
> Admin data.

> **Added 2026-11-03 ([#260](https://github.com/ahmadmnsur/ft_transcendence/issues/260))** *(uncommitted)*, **landed on `main` at `20057b3`**:
> the three rows from #260 join the list above (§6.4, §6.9, §8.5, §9.2).
>
> | Event | Room | Payload | Emitted after the commit of | Client reaction |
> | --- | --- | --- | --- | --- |
> | `friends:changed` | `student:<id>` of both Students of the request or Friendship | `{}` | a request sent, accepted, declined or cancelled; a Friendship ended | read again `GET /api/friends` and `GET /api/friends/requests` |
> | `match:changed` | `student:<id>` of the Match's Mentor and Mentee | `{}` | an Accept that writes, a Decline, a Review (after its `post:created`) | read again the Student's Matches (current, history, one Match) and `/feedback` |
> | `post:likes` | `feed` | `{ postId, likeCount }` | `POST` or `DELETE /api/posts/:id/like` that changes a row, including a self-Like; a repeat that writes nothing sends nothing | set `likeCount` on that Post in loaded feed pages, profile Posts and a Prompt's answers; read nothing |
>
> Only what is loaded reacts: invalidation refetches queries on screen and marks the rest stale,
> so a page not on screen reads on its next visit. A missed event costs nothing: after a
> reconnect the client already reads its queries again (§7.5). `post:likes` touches neither
> `likedByMe` nor the likers list. Every Student with the Post loaded sees its count change live.
> The existing events, payloads and rooms are unchanged.

> **Live moderation and Prompts, 2026-11-03 ([#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261); ADR-0021 decisions 5–7)** *(uncommitted)*, **landed on `main` at `2c9eb01`**:
>
> | Event | Room | Payload | Emitted after the commit of | Client reaction |
> | --- | --- | --- | --- | --- |
> | `post:removed` | `feed` | `{ postId }` | a resolution that removes the Post (§12.5) | drop it from every loaded feed page, Student's Posts and Prompt's answers that holds it, decrement that page's `total`, then read that query again so a numbered page refills to 20 (§6.0.1) |
> | `prompt:published` | `feed` | `{}` | a Prompt published (§8.12) | read again the loaded live Prompt, Prompt history pages (Student and Admin) and Prompt answers, including the Prompt it closed |
> | `reports:changed` | `staff`, except the sockets of the Student the Report is about: the reported Student, or the reported Post's author | `{}` | a Report filed (§12.2); a group resolved (§12.5) | read again the loaded moderation queue and Admin's resolved audit |
> | `session:changed` | `student:<id>` of the Student whose role changed | `{}` | a Change role that changes the role (§12.7) | read the session again and run the open page's guard again: a page the new role cannot open goes to `/`, and the header's links follow |
>
> `staff` is the fourth room, shared by Peer Moderators and Admins (§7.2). A role change moves
> open sockets after commit and tells that Student's own sockets to read the session again
> (§12.7). On a Prompt's page, an existing `post:created` whose Post is an answer to that Prompt
> reads its answers again; the feed's page-1 insert stays as above. No new event carries a
> Report, a role or Admin data. `reports:changed` skips the Student a Report is about, staff or
> not, so the reported Student receives nothing. A reporter who is staff hears it like any staff
> member and sees that group in their queue (§12.4); any other reporter is not in `staff`. A
> staff member hears only that the queue changed, and what it reads again passes the same checks
> as any read.
>
> A live update never takes away what someone is using: a queue card whose confirm dialog is
> open, and a Post card whose Report or Likers dialog is open, stay on screen until the dialog
> closes, and a Prompt's answer form that holds text stays after the Prompt closes. Acting then
> gets the server's refusal (`already_resolved`, `conflict_of_interest`, `report_target_invalid`,
> `prompt_not_live`), shown with its existing text. A removed Post is dropped only from the pages
> that hold it; a read in flight is left to finish, then checked.

> **The last event, 2026-11-03 ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262); ADR-0021 decisions 2 and 5)** *(uncommitted)*:
>
> | Event | Room | Payload | Emitted after the commit of | Client reaction |
> | --- | --- | --- | --- | --- |
> | `new-dots:changed` | that sign-in's own sockets after an opening; otherwise the Student's own `student:<id>` | `{}` | an opening (`POST /api/me/new-dots/opened`, §6.1); for the Student's room, a Private Feedback opening or a thread read that marks any (§6.7, §6.5), a Prompt answer (§6.8), and another Student's Like or unlike of their Post that changes a row (§6.9) | read the New dots again |
>
> The New dots (§3.5.1) also read again on `dm:message`, `match:ready`, `match:changed`,
> `friends:changed`, `prompt:published`, `reports:changed`, `round:opened`, `round:closed`,
> `session:changed` and `post:removed` (§12.5), and after a reconnect with every other query (§7.5). The opening sign-in's
> other tabs follow it; another sign-in of the same Student keeps its own dots. What is handled on
> one sign-in (a thread read, Private Feedback read, the live Prompt answered) reaches the
> Student's other sign-ins, whose dots read again without changing their openings. No room is added:
> the server finds a sign-in's sockets by the session they were admitted with. The existing events,
> payloads and rooms are unchanged.

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

> **Updated 2026-10-18** (#45; ADR-0003's note of 2026-10-18): **online**, for every read of the
> registry, `GET /api/friends` included, is "the set is non-empty **or a grace timer is pending**".
> During the grace no friend has been told offline, and a reconnect inside it broadcasts nothing, so a
> read in that window answers online, as the friends were last told. The transitions and broadcasts
> above are unchanged, and nothing is stored.

> **Shortened 2026-11-01, decided by Ahmad ([#249](https://github.com/ahmadmnsur/ft_transcendence/issues/249))** *(uncommitted)*, **landed on `main` at `4cc1717`**: the grace timer is **5
> seconds**, not 20, so a Friend who closes the page shows offline about 5 seconds later. A reload
> reconnects within 1 to 2 seconds and still broadcasts nothing; a connection that drops for longer
> than the window shows offline, then online again. A connection lost without closing (a sleeping
> laptop) is noticed only by Socket.IO's heartbeat, up to 45 seconds later, before the window starts.

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

> **Changed 2026-11-03 ([#260](https://github.com/ahmadmnsur/ft_transcendence/issues/260))** *(uncommitted)*, **landed on `main` at `20057b3`**:
> `match:changed {}` replaces "Events none · Visibility: no event" for Accept and Decline above,
> including Decline's "Visibility: as accept". After an Accept that writes or a Decline commits,
> it goes to `student:<id>` of the Match's Mentor and Mentee; the client reads again current,
> history and single-Match queries and `/feedback` (§7.4). A repeated accept that writes nothing
> sends nothing. A Match ended by a Suspension or a Removal sends nothing (ADR-0021 decision 7).
> A Round close already sends `round:closed`.

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
- **Result**: the created Match as `AdminMatchView` (§6.13, `compatibilityScore: null`) — the Admin is
  not one of the pair, so a `MatchView` has no side to be written from.
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

> **Live publication, 2026-11-03 ([#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261))** *(uncommitted)*, **landed on `main` at `2c9eb01`**:
> publishing sends `prompt:published {}` to `feed` after commit (§7.4). The loaded Prompt list,
> live Prompt and answers pages read again, including the Prompt it closed. The publication's
> "no event" and "read on the next load" above no longer hold. Publication order and the one live
> Prompt rule stay as they are.

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

  > **Added 2026-11-03 ([#260](https://github.com/ahmadmnsur/ft_transcendence/issues/260))** *(uncommitted)*, **landed on `main` at `20057b3`**:
  > the Review also sends `match:changed {}` to `student:<id>` of the Match's Mentor and Mentee,
  > after the existing `post:created`. Both are sent after the Review commits (§3.7). The client
  > reads again the Student's Matches and `/feedback` (§7.4).

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

- `GET /api/matches/:id` (the pair only; any other caller, an Admin outside the pair included → 404,
  §6.6) and `GET /api/admin/matches/:id` (Admins, any Match) return the Learning Outcome and Evidence
  metadata; Private Feedback is included only for its Mentor, its author and Admins — the pair on the
  first route, Admins on the second.
- `GET /api/me/feedback-received` — the Mentor's private route, newest first, ratings shown one by
  one, never averaged, a Removed author shown as the tombstone (ADR-0013 d4–d8). It is never on the
  profile page (ADR-0013 d5).

### 9.4 Evidence — `PUT` / `DELETE /api/reviews/:reviewId/evidence`

- **PUT** (multipart `file`), in this order: `UploadCsrfGuard` → session → pre-check that the actor
  is the Mentee of **this Review's Match** (else 403) → Multer (one file, `limits.fileSize` 5 MiB + 1 byte) → size check (`size >
  5,242,880` → `file_too_large`) → byte validation §9.5 → NestJS makes a new token and uploads the
  file to the `evidence` bucket under it (§9.8) — **all before any transaction** → SSI tx re-reads `Review → Match`, confirms the
  Mentee and that the actor is Active — **the role is not read**: a Mentee promoted to `ADMIN` after
  the Match was created keeps the path for their own Review (ADR-0009 d5, ADR-0014 d11, the
  standing-Match exception of ADR-0008 d2) — then, at its last step, applies the 30-minute rule
  (§9.8) and **upserts** the one `Evidence` row with the new token (create or replace in one
  statement) → result `{ token, mime, size, filename }` · Events: after commit, the replaced file is
  deleted · Refusals `file_too_large`, `file_type_not_allowed`, `file_invalid` (each before the
  upload), plus the pre-check's 403; a refusal inside the transaction deletes the new file at once ·
  Visibility: reads via `GET /api/files/evidence/:token` and the Match detail (§9.3).
- **DELETE** `{}` → same authorization → SSI delete of the row if present (idempotent `ok: true`),
  then the file after commit · Events none.
- **A rejected replacement, or one that fails before COMMIT, leaves the old Evidence whole**, its row
  and its file, because validation and the upload precede the transaction, the old file is deleted
  only after commit, and the transaction is atomic. One whose COMMIT reply is lost leaves the old
  Evidence or the new one whole, never a row without its file (ADR-0009 d5's note of 2026-10-05).
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

   > **Updated 2026-10-19** (#43, from the review of PR #193): the two image decoders do less than
   > this step says. `pngjs` 7.0.0 checks the CRC only of the chunks it reads (`IHDR`, `PLTE`,
   > `tRNS`, `gAMA`, `IDAT`, `IEND`) and skips every other chunk unchecked; it reads a second `IHDR`
   > over the first, so a file whose first `IHDR` says 4×4 decodes at the second one's size, past
   > the 4096 limit; it does not check how the critical chunks are laid out; and its inflate passes
   > over a zlib error and decodes whatever its buffer held, so corrupt image data can pass.
   > `jpeg-js` 0.4.4 decodes a JPEG cut before its first start of scan (`FF DA`) and ended with
   > `FF D9` as a blank image. So the build walks the bytes before each decoder
   > (`src/files/validate.ts`), and refuses with `file_invalid`:
   >
   > - a PNG unless, against the PNG spec, every chunk is whole, its type four letters, its CRC
   >   correct; `IHDR` comes first and only there, with a bit depth its color type allows; at most
   >   one `PLTE`, before the image data, never for a grey image, of 1–256 entries and no more than
   >   a palette image's bit depth can index; the `IDAT`s in one run; then an empty `IEND`; and
   >   unless the image data inflates, as one whole zlib stream, to exactly the size `IHDR` implies;
   > - a JPEG whose segments, walked from `FF D8` through those `jpeg-js` reads before a scan, do
   >   not reach a `FF DA` whose header names 1–4 components. That refuses too a file `jpeg-js`
   >   would recover, a phone's malformed APP1 say, which is malformed content all the same.
   >
   > Two of 37,503 PNGs on one developer machine carry a wrong CRC on their `iCCP` chunk; browsers
   > show them, and they are now refused, as this step asks. What the walk does not catch is a JPEG
   > built so that `jpeg-js` reads a segment's fields past or short of its length: it can still
   > decode with no scan, as a blank image, served like any avatar.

   > **Updated 2026-10-22** (#54, from a security check of PR #206 and its review): `pdf-lib`
   > 1.17.1 inflates every object stream and cross-reference stream whole while it loads, with no
   > cap and without yielding, and a chain of filters on one stream holds a buffer for each filter.
   > So a PDF of a few megabytes could ask for gigabytes, hold the thread every request waits on
   > meanwhile, then take the process out of memory. The load therefore runs in a worker thread,
   > one PDF at a time (`src/files/pdf-check.ts`), and the PDF is refused `file_invalid` when its
   > decoders together would allocate more than 32 MiB over the whole load, counted before each
   > allocation; when the worker's heap passes 256 MiB; or when the load is still running
   > 5 seconds after its worker started. The wait for an earlier PDF does not count toward the
   > 5 seconds. The 32 MiB counts both each decoder's output buffer and the four fixed dictionary
   > arrays (24,576 bytes) an `LZWDecode` decoder allocates in its constructor, so a chain of
   > `LZWDecode` filters is refused at construction as well. Measured: the most any of 122 real
   > PDFs under 5 MiB needed is 3.55 MiB, and a generated PDF of 20,500 pages and about 4.8 MB with
   > every object in one object stream needs 16.5 MiB; the slowest real PDF loads in about 1.3
   > seconds.
5. **Claims must agree**: a supplied filename extension must be `.png`, `.jpg`/`.jpeg` or `.pdf`
   matching the detected format (case-insensitive); a part `Content-Type` other than
   `application/octet-stream` must equal the detected canonical type. Disagreement →
   `file_type_not_allowed`; nothing is relabelled.
6. **Persist** the canonical `mime` and the byte length from the validated bytes, never client
   metadata. Evidence `filename` = basename, path separators and control characters removed, ≤ 255,
   `evidence.<ext>` when empty. **The upload to Storage declares that canonical type**, so Storage
   keeps the validated label; its own type check reads only that label, so these steps stay the only
   check of the bytes (ADR-0009 d5's note).
7. **Serve** with the canonical type from the row and `X-Content-Type-Options: nosniff`.

The SPA mirrors checks 2, 3 (by extension and declared type) and 5 for immediate feedback; only the
server decides.

### 9.6 Avatar lifecycle

A Student without an `Avatar` row shows the bundled default. The owner (`/api/me/avatar`) or an Admin
(`/api/admin/students/:id/avatar`, target not Removed) may upload, replace or delete. **Removal
deletes the row** in the Removal transaction (ADR-0009 d6), and the file after commit, beside
`revokeSessions` (§12.7). The default avatar shows from the commit on; if the file's delete fails,
the cleanup deletes it within two hours, as long as the `api` runs and its hourly cleanup succeeds
(ADR-0009 d6's note of 2026-10-05). Suspension touches nothing (d7).

### 9.7 Preview and progress (`en.subject.md:544–546`)

PNG and JPEG preview as `<img>`; a PDF previews in an `<iframe>` on the file URL (same origin) with a
download link beside it. Uploads show a progress bar from `XMLHttpRequest.upload.onprogress`.

### 9.8 Files on Supabase Storage (ADR-0009 d2's note of 2026-10-05, ADR-0019 d7)

- **Two private buckets**: `avatars` (2,097,152 bytes; PNG, JPEG) and `evidence` (5,242,880 bytes;
  PDF, PNG, JPEG). They have no access policies, so only the secret key opens them, and only the
  `api` uses it. There is no public bucket and no signed link, which would work for anyone holding
  it until it expired. The buckets' caps and types are a second guard only; §9.5 stays the check.
  On the team project the files are in its Storage; on the fallback, in the `storage` service's
  named volume `storage-data`, which `make wipe` deletes with the database's.
- **The seed's first step sets the buckets, on every run** (ADR-0004 d11's note of 2026-10-05): it
  creates a missing one and sets back one whose settings differ, made public in the dashboard or
  given other caps or types. It runs before the seed checks whether its fixture is complete, so a
  run that skips the fixture still does it, and so wherever the seed runs: in the boot chain after
  the boot check, under `make seed`, and in CI. A failure stops the seed, and with it the boot, and
  names the bucket, since every upload would fail after it. The resets keep the buckets; `make wipe`
  drops the fallback's, and the next boot creates them again. The test harness runs the same code
  for buckets of its own, `test-avatars` and `test-evidence` (§16.2).
- **A file's name is its row's token**, new on every upload, in a flat bucket with no folders and no
  path column, so an upload never overwrites a file.
- **Reading** (§6.3): authorize, read the row, read the whole file from Storage, then send it with the
  row's canonical type. A row whose file Storage cannot give answers 500 `internal_error`, logged,
  never 404.
- **Saving**, an avatar's or Evidence's, own or an Admin's: validate the bytes (§9.5), make a new
  token, upload the file under it declaring the canonical type, then the SSI transaction writes the
  row, and after commit the replaced file is deleted. **The file is written before its row and
  deleted after it.**
  - Each save's transaction sets `idle_in_transaction_session_timeout` to 15 seconds, the Unit of
    Work's cap, so Postgres ends a transaction whose client froze after the check below instead of
    letting it commit on waking; the client then sees a lost connection. The build checks the
    setting once through the team project's session pooler.
  - **The 30-minute rule**: at the transaction's last step, if more than 30 minutes have passed since
    its upload finished, the save fails with 500 `internal_error`, logged, and deletes its own file.
    That step reads the application's clock (`Clock.now()`) then, not the attempt's `ctx.now`, which
    is taken before the transaction opens. A running save never comes near it; half the hour leaves
    room for clocks a few minutes apart.
  - **A save that fails deletes its new file at once only when nothing can have committed**: an error
    inside the transaction's work, a refusal among them, the 30-minute rule, or the Unit of Work's
    retries all used up. Any other failure, a lost connection or a timeout, may have committed, since
    a COMMIT can succeed and its reply be lost, so the new file is left to the cleanup, which keeps
    it if a row names it.
- **Deleting**: the row in its transaction, then the file after commit (§3.7).
- So a crash can leave a file that no row names, **never a row whose file is missing**.
- **The cleanup**: the `api` deletes the files in `avatars` and `evidence` that no row names and that
  are more than an hour old, when it starts and every hour while it runs. A run lists the whole bucket
  before it deletes anything, since deleting page by page shifts the list and skips files. A failed
  run is only logged and waits for the next, and never stops the boot. So a file a failed delete left
  is gone within two hours, as long as the `api` runs and its hourly cleanup succeeds; the Privacy
  Policy says so. The hour protects a save whose file exists a moment before its row, and the two
  rules above keep a save frozen in between, a laptop put to sleep say, from writing its row after
  another stack's cleanup deleted its file. In the test harness the cleanup never runs by itself,
  neither at start nor hourly: `08-files` calls it on the suite's own buckets (§16.3).

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

**The argument rests on three facts**: a Student holds at most one in-progress Match; only Round close
writes Streak; an answer needs its Prompt live. No test exercises the `ON CONFLICT` backstop, so **a
new Badge, a new earning path, or a change to any of the three facts re-runs this argument before it
ships**. If a real contention schedule appears, the backstop becomes load-bearing and category 9 gains
the case.

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

> **Still true for progress, 2026-11-03 (ADR-0021 decision 3; ADR-0010 d7's note of the same
> day)**: New dots and Private Feedback's `read_at` come elsewhere, and none of them shows XP, a
> Level or a Badge. The fourth bullet holds as written.

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

> **Added 2026-11-03 ([#260](https://github.com/ahmadmnsur/ft_transcendence/issues/260))** *(uncommitted)*, **landed on `main` at `20057b3`**:
> the five writes — a request sent, accepted, declined or cancelled, and a Friendship ended —
> send `friends:changed {}` to both Students after commit (§6.4, §7.4). The client reads the loaded
> Friends and request lists again without a reload. A Block stays silent (§11.2), as does lifting
> one (§11.3).

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

  > **2026-11-01 ([#249](https://github.com/ahmadmnsur/ft_transcendence/issues/249))** *(uncommitted)*, **landed on `main` at `4cc1717`**:
  > a **typing indicator** is not a read receipt: it tells the recipient that the sender is writing
  > to them now, and tells the sender nothing. It goes only to a Student the sender could message,
  > is never stored, and runs over §7.3's `dm:typing`.
- History is never deleted or unsent; it stays readable to both participants after a Block or a
  Removal (tombstone). **No application route lets anyone else — any Admin included — read a Direct
  Message.** Whoever can open a copy's database directly can read stored messages: Supabase encrypts
  the team project's disks, a local copy is not encrypted at rest, and Direct Messages are not
  end-to-end encrypted; the Privacy Policy states both layers (ADR-0018 d13 and its note of
  2026-10-11, §4.6).

### 11.5 Likes (ADR-0014 d5)

Revocable (delete the row), attributed, readable by every signed-in Student, self-Like permitted, no
XP, not reportable, no event (§6.9).

> **Changed 2026-11-03 ([#260](https://github.com/ahmadmnsur/ft_transcendence/issues/260))** *(uncommitted)*, **landed on `main` at `20057b3`**:
> "no event" above no longer holds: every signed-in Student with the Post loaded sees its count
> change through `post:likes { postId, likeCount }` after a Like or unlike commits (§6.9, §7.4).
> The client changes only `likeCount` and reads nothing; each tab keeps the `likedByMe` it last
> read, and the likers list is untouched. Nothing new is revealed: counts are already readable by
> every signed-in Student.

> **2026-11-03 ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262); ADR-0021 decision 3's note of the same day)** *(uncommitted)*: another Student's Like
> on your Post turns on the feed's New dot until this sign-in opens `/`; your own Like does not.
> The like count and the list of who liked are unchanged.

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

> **Live report queue, 2026-11-03 ([#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261))** *(uncommitted)*, **landed on `main` at `2c9eb01`**:
> a successful filing sends `reports:changed {}` to `staff` after commit, skipping the reported
> Student or the reported Post's author (§7.4). The reporter still receives only
> `{ received: true }`; a reporter who is a Peer Moderator or an Admin also sees the group in
> their queue (§12.4's note of the same day). Nothing is sent to the reported Student; only Peer
> Moderators and Admins hear the queue change, without Report data.

### 12.3 Groups (ADR-0011 d5–d6)

An **open group** is the `OPEN` rows for one target (one `post_id` or one `reported_student_id`) at
the reading transaction's serialization point. Derived, never stored; no case entity. One action
resolves the whole group.

### 12.4 Who sees which group — `GET /api/moderation/queue` (ADR-0011 d5–d7)

One `REPEATABLE READ READ ONLY` transaction; groups ordered by their oldest open row.

> **Changed 2026-11-01** (#251, at Ahmad's request): groups are ordered by their **newest** open
> row, newest first, and each group lists its rows newest first, `id` descending breaking a tie on
> `created_at`. Oldest first put a Report filed today at the bottom of `/admin/reports`.
> `/moderation` reads the same endpoint and follows. Who sees which group does not change.

- **Peer Moderator** — only open groups whose target is a non-removed Post, and **the whole group is
  absent** if: the moderator authored the Post; or the moderator filed any open row in it; or a Block
  exists **in either direction** between the moderator and the Post's author or **any** open reporter
  (ADR-0008 d10 as widened, ADR-0011 d7). Each group shows the Post (body, author, origin, time), the
  count, and each row's reason, text and time — **never who filed it**. No resolved history.
- **Admin** — open groups for both target kinds, **except** a group targeting the Admin's own Student
  row or one of their Posts, and any group containing an open row the Admin filed (ADR-0011 d9). Each
  row shows its reporter. When no other Admin is eligible, the group simply waits.

> **A staff member sees the Report they filed, 2026-11-03 by Kamel ([#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261); ADR-0011 d9's note of
> the same day)** *(uncommitted)*, **landed on `main` at `2c9eb01`**: a group holding the viewer's own open Report is no longer
> hidden for that reason. Each group carries `filedByMe`.
>
> - **Peer Moderator**: the group shows read-only, with no action and the line *"You reported this
>   Post. Another Peer Moderator or an Admin decides."* Their own Post, or a Block with the author
>   or any open reporter, still hides the whole group. They still never see who filed.
> - **Admin**: the group shows with its actions, the Admin among its reporters. Only a group about
>   that Admin or their Post stays hidden, and only such a group waits for another Admin.
>
> Found in a manual test: a Post reported by the only Peer Moderator and the only Admin showed
> on no screen and could not be resolved, and neither could report it again (§12.2).

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

> **Live resolutions, 2026-11-03 ([#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261))** *(uncommitted)*, **landed on `main` at `2c9eb01`**:
> either Post-group action and either Student-group action send `reports:changed {}` to `staff`
> after commit, skipping the Post's author or the reported Student. `REMOVE_POST` also sends `post:removed { postId }` to `feed`. A removed Post
> leaves any loaded feed page, Student's Posts or Prompt's answers immediately, and that query
> reads again to refill its numbered page. "A removed Post leaves the feed on the next load"
> above no longer holds. Refused resolutions send nothing; the attribution and guards stay.

> **Own Reports, 2026-11-03 by Kamel ([#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261); §12.4's note of the same day)** *(uncommitted)*, **landed on `main` at `2c9eb01`**:
> an Admin's guard no longer counts a Report they filed. An Admin may resolve a group holding one;
> being the Post's author or the reported Student still answers `conflict_of_interest`. A Peer
> Moderator's guard is unchanged, so a group holding their own Report still answers
> `conflict_of_interest`. "An Admin cannot bypass the own-complaint guard by removing a Post they
> reported" above no longer holds: an Admin may remove a Post they reported, attributed through
> `resolved_by_id` like every removal.

> **2026-11-03 ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262); ADR-0021 decision 5's note of the same day)** *(uncommitted)*: every open page reads its
> New dots again on the `post:removed` a removal already sends (§7.4), since Likes on a removed Post
> no longer light its author's Feed dot. No event is added, so the author hears nothing of their own.

### 12.6 Resolved audit — `GET /api/admin/reports/resolved?page` (Admin) (ADR-0011 d6, d8)

Resolution batches — rows sharing `(target, resolved_by_id, resolved_at, state)` — newest first, each
with the target (the Post body even if removed; the Student as `StudentRef`), the state, the resolver,
the time, and every row's reporter, reason, text and time. A batch targeting the viewing Admin or their
Post, or containing any row the viewing Admin filed, is hidden from that Admin. Peer Moderators have no
access.

> **Changed 2026-11-01** (#251): each batch lists its rows newest first, like the queue (§12.4's
> note). The batches themselves stay newest first.

> **Changed 2026-11-03 ([#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261); §12.4's note of the same day)** *(uncommitted)*, **landed on `main` at `2c9eb01`**: a batch
> containing a row the viewing Admin filed is no longer hidden from them, the batch a Removal
> closed included (§12.7). Only a batch about the viewing Admin or their Post is.

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
| **Remove** | target's in-progress Matches; `Avatar`; open Reports whose `reported_student_id` is the target | `removed_at = now`; in-progress Matches → `TERMINATED_BY_ADMIN`; delete every Session; delete the `Avatar` row; every such open Report → `ACTIONED` with `resolved_by_id = actor`, `resolved_at = now` | `revokeSessions(target)`; delete the avatar's file from `avatars` (§9.8) |

> **Live staff membership and Removal, 2026-11-03 ([#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261))** *(uncommitted)*, **landed on `main` at `2c9eb01`**:
> after a Change role that changes the role commits, the Student's open sockets move into `staff`
> for `PEER_MODERATOR` or `ADMIN`, and out for `STUDENT`, including sockets still waiting for
> admission (§7.2). The same sockets then get `session:changed {}` (§7.4): the open page reads
> the session again, a page the new role cannot open goes to `/`, and the header's links follow.
> A request that leaves the role as it was moves nothing and sends nothing.
> No session or socket is dropped; HTTP authorization still changes on the next request.
> A Remove sends no new event, even when it closes open Reports: a sanction stays silent beyond
> the sign-out it causes (ADR-0021 decision 7), so another Admin sees that group closed on their
> next read.
> Suspension and Removal still disconnect as in §5.8, and Suspension resolves no Report.

- **No sanction writes to Supabase Auth** (ADR-0008 d5's note of 2026-10-02): no ban, no delete.
  Each stays this one PeerConnect transaction, and the flags it sets are what sign-in and session
  resolution refuse on (§5.1, §5.3). Reinstatement and a role change write nothing there either.
- **Suspension** is reversible and resolves no Report (ADR-0011 d10); Posts, avatar, Evidence, XP and
  Streak stay (Streak frozen by the close's skip). The other participant of a terminated Match becomes
  unmatched if still a candidate; only an Admin repairs it.
- **Removal** is final and view-only afterwards: the email stays burned, and Posts, Matches, Reviews,
  Private Feedback, Evidence, Direct Messages, Likes, Blocks, Reports, BadgeAwards and XP all stay,
  rendered as the tombstone (ADR-0008 d6–d7, ADR-0009 d6, ADR-0018 d3). The Student's Supabase Auth
  user and its password hash are kept, so a password sign-in tells of the Removal only after the
  right password, and the row keeps `forty_two_id`, so that 42 account can never make a new Student
  (ADR-0008 d7's notes of 2026-10-02 and 2026-10-08). A Student reaches it only by asking an Admin;
  there is no self-service deletion.
- **Removal's report side effect takes no own-report exclusion** (ADR-0011 d10): *every* open Report
  on the target — including one this Admin filed — commits `ACTIONED` with `resolved_by_id = actor`
  in the same transaction, one `resolved_at` for the batch. Afterwards §12.6 hides that batch from
  the removing Admin and shows it, with the attribution, to every other Admin. The §12.4 guard bars
  queue reads and group resolutions, never this sanction, so the two rules cannot collide.

  > **Changed 2026-11-03 ([#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261); §12.6's note of the same day)** *(uncommitted)*, **landed on `main` at `2c9eb01`**: §12.6 no
  > longer hides that batch from the removing Admin, who sees it like every other Admin.
- **Edits** (`PATCH`, Skills, Learning Goal, avatar) are allowed on Active and Suspended targets only,
  and never touch password, `forty_two_id`, XP, Level, Streak, Badges or anything the Student wrote
  (ADR-0008 d8 and its notes). An email edit writes `Student.email` alone, since Supabase Auth logs
  the Student in by id: Supabase Auth is not touched and no mail is sent.
- **Concurrency**: two Admins demoting, suspending or removing each other cannot both succeed; a
  sanction vs a Review, a Round close or a Match creation involving the target has one serial order
  (§3.6.3).

### 12.8 Admin label

Wherever a `StudentRef` with `isAdmin: true` renders to another Student — profile, feed, search,
messages — the design system's `RoleLabel` shows the Admin label: "Admin" in English and French, and
"مسؤول" in Arabic, `CONTEXT.md`'s words (ADR-0020 d2). The Peer Moderator role is never shown to
other Students (ADR-0018 d4).

---

## 13. Learning Analytics — `GET /api/admin/analytics` and `/admin/analytics`

Admin only (a Peer Moderator gets 403). One `REPEATABLE READ READ ONLY` transaction. Nothing is stored
(ADR-0015 d5): no snapshot, aggregate table, materialised view, export, date range or per-Student
drill-down. **Always about the community, never a named Student** (ADR-0015 d9). No dedicated
Vitest category covers it: a read-only view over committed state fails loudly (wrong numbers on the
dashboard), so the closed list (ADR-0016 d7) needs no further category for it.

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

Each sentence is one message of the dictionary, in each language, and each number in it chooses its
own plural form (§3.5.5; ADR-0020 d4). The Skill's name stays English and is isolated.

### 13.4 Charts and refresh (ADR-0015 d4, d7, d8)

Recharts: bar charts for most requested, most available and the gap (negative gaps below the axis);
a bar chart for the open-Round state; a bar chart for closed outcomes; the per-Round completion rate
on a Round-number axis with `connectNulls={false}`. No axis is a date. The page loads on mount and
**re-queries on `round:opened` and `round:closed`**, reading nothing from their payloads; between
those events every figure is as of the last load and refreshes on reload. No other event is added.

**In three languages, and mirrored in Arabic** (ADR-0020 d2, d4, d7). The charts' titles, axis
titles, legends and tooltips are dictionary text, and their numbers are written with the locale
table (§3.5.5), so an Arabic chart writes Arabic-Indic digits and a percentage as
`style: 'percent'` does. Skill names stay English, and on an axis, which is SVG text where a `<bdi>`
cannot go, each sits between U+2068 and U+2069. In Arabic each chart runs right to left, like the
page: its bars and its Round axis start at the right, and the number axis sits on the right. No tick
label crosses an axis line, each legend icon keeps its gap from its text, the tooltip opens toward
the inside of the chart, `C++` reads `C++`, and the arrow keys move the way they point.
[Find what complete layout mirroring needs in the SPA](https://github.com/ahmadmnsur/ft_transcendence/issues/140)'s runs give a start:
`XAxis reversed`, `YAxis orientation="right"`, and `dir="ltr"` on the chart's box or explicit
`textAnchor` values. The build ticket checks `C++` on the axis in Chrome and Firefox.

---

## 14. Seed and demo (ADR-0017)

### 14.1 Where it lives and how it runs

- Entry `prisma/seed/main.ts`; seed-only modules in `prisma/seed/`; the two seeded files in
  `prisma/seed/assets/`; the fixture in `prisma/fixtures/cohort.ts` (M15). Compiled with the API build
  (it needs NestJS decorator metadata) to `dist/prisma/seed/main.js`, which `prisma.config.ts`
  registers as `migrations.seed`.
- Runs on **every boot, on both paths and both targets**, after `migrate deploy` (§15.5); `make seed`
  re-runs it. **Its first step, on every run, sets the two buckets** (§9.8), before it checks
  whether its fixture is complete; then §14.9 decides whether it writes.
- It boots `NestFactory.createApplicationContext(SeedModule)` — the application's own modules, a
  no-op `RealtimePublisher` — and **drives the real write paths**: every step below is one call to a
  service method from §§5–12 (with a constructed `Actor` where it takes one, §3.4), each its own SSI
  transaction (M28). No
  application API exists for the seed.
- **Inserted directly, and nothing else**: the 27 `Skill` rows; the bootstrap Admin (`ADMIN_EMAIL`,
  `ADMIN_PASSWORD`, display name *PeerConnect Admin*, role `ADMIN`, no Skills) and the bootstrap Peer
  Moderator (`MODERATOR_EMAIL`, `MODERATOR_PASSWORD`, display name *Yara*, role `PEER_MODERATOR`).
  Each is made the way sign-up makes every account (ADR-0008 d12's note of 2026-10-02): NestJS makes
  the id, Supabase's admin create sets the `.env` password, then the `Student` row is written with
  its role, both name fields through `nameFields` (§4.3.1). That bootstrap function is shared with the
  test harness's staff helper (§16.2). XP, Level, `BadgeAward`, Streak, Match status,
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
  `SEED_STUDENT_PASSWORD`, a Supabase Auth password (8 characters to 72 bytes, no emoji: §5.1). Created through
  `auth.signup`, so through Supabase's admin create, **strictly in position order**; the seed
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
- **Reviews** (step h and repairs), with *k* the 0-based submission order across the whole seed —
  a repair's Review is submitted at step d, then step h's in selection order: *learned* = *"How
  {Skill} works in practice."*; *can now do* = *"I can use {Skill} on my own project."*; Private
  Feedback *"Very useful — we covered {Skill} end to end."* / *"Clear explanations; more worked
  examples would help."*; rating `[5, 4, 5, 3, null, 4, 5, 2][k mod 8]`; Takeaway *"Learned {Skill}
  with a peer this Round."* **In all four sentences {Skill} is one value**: the name of the Match's
  FORWARD Skill that sorts first by `Skill.name` ascending, or *"a new topic"* when FORWARD is empty.
  An empty FORWARD set is not hypothetical: a hand-made repair may cover nothing (§8.6), and a replay
  of this script over the fixture pairs both repairs with no Skill covered either way. Prompt answers
  are fixed sentences in the seed module chosen by position; their wording carries no rule.

  > **Refined 2026-10-21** by [Seed v4: Reviews](https://github.com/ahmadmnsur/ft_transcendence/issues/53):
  > "sorts first" compares names by code point, the team project's `C.UTF-8` order, and the seed
  > compares them itself. The fallback's database sorts linguistically (`en_US.UTF-8`), which puts
  > *Sockets* before *SQL*, and one seeded Match covers exactly those two, so reading the order from
  > the database would write a different fixture on each target (§14.9).
- **Target** with 15 matcher Matches a Round: Round 1 = 11 completed + 2 lapsed + 2 declined (+1
  repair completed); Round 2 = 12 + 2 + 1; Round 3 = 10 + 2 + 2 + 1 terminated (+1 repair); Round 4 =
  11 + 2 + 1 + 1 terminated. **Totals 62: 46 `COMPLETED`, 8 `LAPSED`, 6 `DECLINED`, 2
  `TERMINATED_BY_ADMIN`; completion 74 %.** The pool is 31 (thirty plus the Peer Moderator) at the
  open of Rounds 1–3 — 30 for the rest of Round 3 after *S*'s suspension inside it — and 30 in
  Round 4. **These are targets the deterministic run confirms, never counts the seed
  forces**: no Match is added to reach 15. The seed logs the actual distribution; if the first run
  differs, ADR-0017 d4's table and the 74 % are corrected from it (a record update, not a code change).

  > **Confirmed 2026-10-25** by [Seed v7: Suspension, Removal and their files](https://github.com/ahmadmnsur/ft_transcendence/issues/68):
  > the first complete run gives exactly these targets, Round by Round and in total: 62 Matches,
  > 46 `COMPLETED`, 8 `LAPSED`, 6 `DECLINED`, 2 `TERMINATED_BY_ADMIN`, completion 74 %. So ADR-0017
  > d4's table and the 74 % stand uncorrected.

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

   > **Refined 2026-10-24** by [Seed v6: the social graph, Likes, Direct Messages and the report fixtures](https://github.com/ahmadmnsur/ft_transcendence/issues/67):
   > item 3 decides fixture 3's author. The party-slot rule above, alone, would take fixture 1's
   > author again, who still has an unused Prompt-answer Post; *another eligible author's* rules
   > them out. So fixture 3's author is the first eligible Student, in position order, other than
   > fixture 1's author and with a Prompt-answer Post no earlier fixture used. Which of an author's
   > Posts a fixture reports is not said elsewhere: in items 1 and 3 it is their oldest unused
   > Prompt-answer Post, in creation order.

### 14.8 End-state assertions (all, or the seed fails)

1. No open Round; exactly four closed Rounds; exactly four Prompts; the live one is Prompt 4.

   > **Refined 2026-10-25** by [Seed and suite: stop when a Round shows another Round's number, and give tests room under load](https://github.com/ahmadmnsur/ft_transcendence/issues/228):
   > each seeded Round must also show its own number and close after it opens: read back through
   > the Admin's Round list at its close (§14.5 step i), the *n*-th Round the script opens shows as
   > Round *n*, and its `closed_at` is not before its `opened_at`. A Round's number is its position
   > by `(opened_at, id)` (§4.3.9), and both times come from the clock. So a clock step back while
   > the seed runs can swap two labels, as it did once on 2026-10-25 in a clean clone, or, inside a
   > Round, make it close before it opens. The seed then stops, leaving no record, and the next boot
   > retries (§14.9). The fixture
   > stays v7, on Kamel's call: no row changes, and a database seeded at v7 before this check keeps
   > its record.
2. The Match status distribution is logged against the §14.5 targets (reported, not asserted), with
   how long the run took (ADR-0017 d10's note of 2026-10-11).
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
10. Every Student's `display_name_search` equals `foldName(display_name)`. This covers the two
    bootstrap accounts, which the suite never reaches (§16.3's `11-name-search`).

### 14.9 Idempotence and failure (M14)

ADR-0017 d10 and its notes of 2026-10-03 and 2026-10-11, ADR-0004 d11's notes. Everything below
holds on both targets, the team project and the fallback.

- **Completion record**: `COMMENT ON DATABASE <current database> IS
  'peerconnect:seed:complete:fixture-v<N>'`, written as the very last statement, only after every
  assertion passed, on the lock's connection (below). It lives in the database's own catalogue, so
  it survives restarts and dies with the fallback's volume or a reset, and it is outside every Prisma
  model. The `postgres` role is not a superuser but owns the database on both targets (checked on
  the fallback on 2026-10-10 and, read-only, on the team project on 2026-10-11), so it can write and
  clear it. Both databases already carry Postgres's own comment, *"default administrative connection
  database"*: **only text of the form `peerconnect:seed:complete:fixture-v<N>` counts as a record**,
  and any other comment is no record. `<N>` is the fixture version, bumped by any PR that changes the
  fixture. **A record certifies exactly the fixture at version `<N>`**: every step and every §14.8
  assertion that version implements, all of them passed. While the seed is being built slice by
  slice (§18 item 12), a version implements only the steps and assertions whose slices have merged;
  from the PR that completes ADR-0017's end state onward, `<N>` implements all of §14.4–§14.8. On the
  team project the record is read in the dashboard's SQL editor with the query below.

  > **2026-10-25** ([#228](https://github.com/ahmadmnsur/ft_transcendence/issues/228)): a v7 record
  > written before §14.8 check 1's Round check reached `main` still counts. The seed skips such a
  > database, so the check never runs on it (§14.8 check 1's note of 2026-10-25). `make reset-team`,
  > then `make up` from `main`, gives it a record the check has passed: the reset only empties, and
  > the boot after it writes the record (§15.6).
- **The lock comes first.** The seed opens a connection for the lock alone, outside the `api`'s
  pool, takes a session advisory lock on it before it reads the record, and keeps it to the end of
  the run; the record is cleared and written on that connection. Prisma gives a connection back to
  the pool after each operation, so a lock taken through it would not be held by the run, and an
  idle pooled connection is closed after 10 seconds. **Losing the lock's connection stops the run at
  once**: an error or a close on it exits 1, with no reconnect, since a second seed could take the
  freed lock and start deleting while this run still writes. The connection sends TCP keepalives
  every few seconds, because it sits idle for the whole run. A second seed waits for the lock, then
  reads the record. The two resets take the same lock (§15.6). Once built, a check through the team
  project's session pooler confirms that a dropped client connection frees the lock.
- **At start** the seed, holding the lock, reads the record (`SELECT shobj_description(oid,
  'pg_database') FROM pg_database WHERE datname = current_database()`). A failed read stops the seed
  with exit 1; it never counts as no record. Then:
  - a record for the **current** version over tables that hold rows → log *seed already complete
    (fixture-v<N>)*, exit 0;
  - a record for **another** version over tables that hold rows → write nothing, exit 0. An older one
    logs a warning naming the remedy, `make reset-team` on the team project, which Kamel runs, and
    `make wipe` on the fallback; a newer one, which an out-of-date checkout meets, says to pull
    `main`. A completed seed never runs again, including over Rounds a demo added (ADR-0017 d10);
  - **any record and every domain table empty** → the record is stale: the schema was reset under a
    surviving database, as `prisma migrate reset` or `migrate dev`'s reset prompt does (Prisma's
    PostgreSQL reset drops and recreates the schema, not the database, so a database comment
    survives it) → write, clearing it first;
  - **no record and every domain table empty** → write;
  - **no record and any domain table non-empty** → the previous attempt failed, or a reset stopped
    partway → write.
- **A run that writes**, before its first fixture step:
  1. **The guard.** If any Student is not one the seed makes, by email (the thirty of §14.3,
     `ADMIN_EMAIL` and `MODERATOR_EMAIL`), the seed deletes nothing, logs that the database holds
     accounts the seed did not make, names the target's reset, `make reset-team` or
     `make reset-local`, and exits 1. That state means the record was lost over real data, by a bug
     or by hand, and **the seed never deletes real data on its own**: only a reset does, which
     someone runs on purpose. A reset that stopped before deleting our rows is finished by running it
     again.
  2. **Clear a stale record** (`COMMENT ON DATABASE <current database> IS NULL`, the run's first
     write). Left in place, it would sit over a failed run's rows, and the next boot would read it as
     *complete* and serve a partial fixture.
  3. **Empty**, through the one function both resets share (ADR-0004 d11's note of 2026-10-11): the
     rows of our tables (`TRUNCATE` the nineteen domain tables in one statement, never
     `_prisma_migrations`), then every Supabase Auth user, then every file in `avatars` and
     `evidence`, through Supabase's admin APIs, never by SQL into `auth` or `storage`, each set
     listed whole before any of it is deleted, since deleting page by page skips some. After a retry,
     Supabase therefore holds exactly the seed's accounts, and the two buckets exactly its files.

  Then it runs from step 1, which writes the current record at the end.
- **The invariant**: a record is present only over the fixture it certifies. The seed writes it last,
  after every assertion, and clears a stale one before its own first write, so no failure at any
  point leaves a record above rows it does not certify.
- **Why emptying is safe**: the API serves only after the seed has completed (§15.5), and a stale
  record sits over empty tables, so a run that writes finds a failed attempt's rows or none; the
  guard catches the one other case. Once those rows are gone, no Student names any Supabase Auth
  user or file left, so they are a failed attempt's or an unfinished reset's: up to thirty-two
  Supabase Auth users per failed attempt, which truncating our tables alone would leave behind. The
  lock keeps it to one seed at a time on a shared database.
- **Failure is loud**: any refusal, error or failed assertion logs the step and reason and exits 1, the
  `api` container stops, and `docker compose up` reports the dependency failure. The next boot empties
  and retries.
- **On the team project a run takes minutes**: every step is its own transaction, and from a laptop
  every statement is a round trip to Frankfurt, about 70 ms from Kamel's computer (measured
  2026-10-01). Some 3,000 to 6,000 round trips put a full run at roughly four to seven minutes, an
  estimate while the seed is unbuilt; on the fallback it takes seconds. Only a boot that writes the
  fixture pays it. So the `api`'s healthcheck allows 15 minutes (§15.1), the seed logs its run's
  duration (§14.8), and the first complete run on `main` against the team project checks that it
  fits. Batching stays the last resort.
- **The team project's data stays between defenses**: a later boot finds the record and skips, so the
  Rounds a demo adds stay. Each defense after the first starts from that accumulated data, and the
  four-Round idle start and the Round 5 beat hold only after the first seed or a reset (§15.6, §15.7).
  Before a defense, no Round is left open.
- Identical on `make up` and bare Compose; no Makefile target, flag or second command is involved.

### 14.10 Not seeded, and accepted

Presence (two live browsers are needed to show online status, ADR-0017 d11); Missions (assigned by
construction); avatars other than *R*'s; Level spread (Levels run 1–3, so the Level term in selection
priority never fires on stage — accepted, not "fixed" by seeding XP).

---

## 15. Deployment and configuration

### 15.1 Services

Six services (ADR-0004 d1 and its notes of 2026-10-03 and 2026-10-04). `proxy` and `api` are
PeerConnect's; `db`, `auth`, `storage` and `api-gw` are the **local fallback**, Supabase's own
Postgres, Auth, Storage and gateway, pinned to the versions of Supabase's Docker setup. The
fallback's four start on both targets and sit unused when `.env` points at the team project.

| Service | Build / image | Ports | Depends on | Healthcheck | Restart |
| --- | --- | --- | --- | --- | --- |
| `db` | `supabase/postgres:17.6.1.136`, command `postgres -c config_file=/etc/postgresql/postgresql.conf -c log_error_verbosity=terse -c log_min_error_statement=panic -c auto_explain.log_min_duration=-1 -c log_statement=none` (§3.9); named volumes `db-data` and `db-config`; `supabase/db/roles.sql` and `jwt.sql` mounted among the image's init scripts, which run only when the volume is created; its initial superuser is `supabase_admin`, while `.env.example`'s `POSTGRES_USER` stays `postgres`, the `api`'s role | none | — | `pg_isready -h 127.0.0.1 -U postgres -d postgres` — over TCP, because on first boot the image's init server listens on the Unix socket only (`listen_addresses=''`) and would pass a socket check before `api` can connect | default (no) |
| `auth` | `supabase/gotrue:v2.196.0`; the `GOTRUE_*` settings of §5.1 in its own `environment:`, so it behaves like the team project | none | `db: service_healthy` | `GET /health` on port 9999, interval 5 s, `start_period` **60 s**, so the checks that fail while Auth runs its own migrations on a first boot from empty volumes do not count; a normal boot is still healthy at its first passing check, and a broken Auth still stops the boot, three failed checks after the period ends | default |
| `storage` | `supabase/storage-api:v1.74.0`, file backend in the named volume `storage-data`, image transformation off | none | `db: service_healthy` | `GET /status` on port 5000, interval 5 s, `start_period` **60 s**, for Storage's own migrations on a first boot, as for `auth` | default |
| `api-gw` | `envoyproxy/envoy:v1.39.1` with `supabase/api/`'s routes; serves Auth and Storage under one `SUPABASE_URL`, `http://api-gw:8000`, as the team project does, so the `api` has one code path | none | `auth`, `storage`: `service_healthy` | TCP on port 8000 | default |
| `api` | context `.`, `dockerfile: Dockerfile`, target `runtime` (base) / `dev` (overlay); the runtime image carries `supabase/prod-ca-2021.crt` (*Supabase Root 2021 CA*, valid until 2031-04-26) | none | `db`, `api-gw`: `service_healthy` | `wget -qO- http://127.0.0.1:3000/api/health`, interval 5 s, `start_period` **900 s**, so a boot that writes the fixture on the team project, which takes minutes, is not marked unhealthy (§14.9); a normal boot is still healthy within one interval of the `api` answering, and a failed seed still exits at once | **no** — a failed boot stays failed and visible |
| `proxy` | context `.`, `dockerfile: proxy/Dockerfile`, target `runtime` / `dev` | base `${BIND_ADDRESS:-127.0.0.1}:${HTTPS_PORT:-8443}:8443`, `${BIND_ADDRESS:-127.0.0.1}:${HTTP_PORT:-8080}:8080`; overlay `!override` → `127.0.0.1:8081:8081` | `api: service_healthy` | — | default |

Every service has `logging: *pc-logging` (a top-level `x-logging` anchor: `driver: json-file`,
`options: { max-size: "10m", max-file: "3" }`, M12). The base file declares `name: peerconnect`.
No other service exists on either path: Supabase's Studio, Realtime (Socket.IO stays), REST service,
Edge Functions, image resizer and pooler are left out. The REST service would let the committed
publishable key read and write the tables in `public` through `/rest/v1/`, while the team project
runs with its Data API off. **Both PeerConnect images build from the repository root as their
build context** (`context: .` with the `dockerfile` paths in the table), so files outside an image's
own directory — `proxy/` and `supabase/` included — stay in scope on a fresh clone's build, and the
`dev` targets are chosen the same way.

**Which values reach which service** (ADR-0004 d1's note of 2026-10-03):

- `api` and `proxy` load `env_file: [{ path: .env.example, required: true }, { path: .env, required:
  false }]` in that order (ADR-0004 d8), except under `compose.local.yaml`, which gives them
  `.env.example` alone with `!override` (§15.2).
- **The fallback's four load `.env.example` alone, never `.env`.** Supabase's images read some of the
  `api`'s names: Storage takes its database connection from `DATABASE_URL`, the gateway reads the
  `SUPABASE_*` keys, and Auth falls back to `DATABASE_URL` when `GOTRUE_DB_DATABASE_URL` is unset.
  Through the shared `env_file` chain a team `.env` would reach them. So Storage's and Auth's
  database URLs, which use their own roles (`supabase_storage_admin`, `supabase_auth_admin`), are
  written in each service's own `environment:` as plain values, with no `${…}`: Compose fills `${…}`
  from the shell and `.env`, never from `env_file`. They repeat `.env.example`'s
  `POSTGRES_PASSWORD`, as does `db`'s own `PGPASSWORD`, because Supabase's Postgres image gives those
  roles that password when it initializes; the two files change together, with a comment saying so
  beside each copy. The fallback's values therefore come only from `.env.example` and
  `compose.yaml`, and `.env` cannot change them: with a team `.env` in place, `docker compose config`
  shows no team value in any fallback service.

### 15.2 The paths and the two targets

- **Base** (`make up`, `make local` or `docker compose up --build`): `https://localhost:8443`,
  `PUBLIC_ORIGIN = https://localhost:8443`, `NODE_ENV = production`; the proxy serves the built
  bundle over TLS, `wss` socket; port 8080 only redirects (`return 301 ${PUBLIC_ORIGIN}$request_uri`).
- **Dev overlay** (`make dev`, which is `docker compose --env-file .env.example -f compose.yaml -f
  compose.dev.yaml -f compose.local.yaml up --build`): overrides only (ADR-0004 d4). `proxy` builds
  target `dev` (no bundle, no TLS), publishes `!override` `127.0.0.1:8081:8081`, gains `extra_hosts:
  ["host.docker.internal:host-gateway"]`, and proxies `/` and the HMR upgrade to
  `host.docker.internal:5173`; `api` builds target `dev`, bind-mounts `.:/app` with an anonymous
  `/app/node_modules`, runs the boot check → `prisma generate` → `nest build` → migrate → seed →
  `nest start --watch`; both get `environment: { PUBLIC_ORIGIN: "http://localhost:8081", NODE_ENV:
  development }`. The overlay's `!override` tag exists only from Compose **2.24.4** — the first
  docker/compose release carrying compose-go's `!override` support — so that, not 2.24.0, is the
  toolchain floor (§3.3, §17.5).
- **Host Vite** (not a Compose service, not started by `make dev`): `npm --prefix web run dev --
  --host <verified host-side bridge address> --port 5173 --strictPort`, with `server.hmr.clientPort =
  8081` and `server.fs.allow` including the repository root (for `docs/legal/`). The README states
  the bind command, how the address was verified, and that nginx-to-Vite HTTP/HMR works while Vite is
  not reachable from the LAN; no silent `0.0.0.0` (ADR-0004 d4).
- **Localhost by default**: every published port binds `127.0.0.1` unless a member's `.env` sets
  `BIND_ADDRESS` for `make up` (ADR-0004 d5 and d7, and their notes of 2026-10-25). `make local`
  reads `.env.example`'s `127.0.0.1`, and the dev overlay's `127.0.0.1:8081` is fixed.
  `BIND_ADDRESS=0.0.0.0`, with `PUBLIC_ORIGIN=https://<the laptop's IP>:8443`, opens `make up` to the
  local network; the README's *Open it from other laptops on the same network* has every step.
- **Two targets** (ADR-0004's top note and d8's notes of 2026-10-03, ADR-0019 d3): the **team
  project**, `main`'s and the defense's, in Frankfurt; and the **local fallback**, a copy on the
  computer that runs it, which starts from the seed. **Of the targets that start a stack, only
  `make up` reads `.env`**, as bare `docker compose up --build` does:
  - `make up`: the production image, on `.env`'s target: the team project when `.env` holds its
    values; the fallback with no `.env`, or with the copy of `.env.example` that `make up` puts in
    its place, so a fresh clone and bare Compose still work;
  - `make local`: the production image, always on the fallback, through `compose.local.yaml` and
    `--env-file .env.example`, which keeps Compose's own `${…}` off `.env` too: destructive tests,
    the reset's local runs, and the last resort on defense day;
  - `make dev`: the dev image with hot reload, always on the fallback; this is where branches are
    coded;
  - `make test`: `make dev`'s files under a project name of its own (§16.2).
- **Which branch runs where**: branch work runs under `make dev` or `make local`, whatever `.env`
  holds. Branch work that changes the database, a migration (which any boot applies) or written
  data, never runs `make up`; branch work that only reads data may, to see the team project's data,
  without hot reload. Migrations reach the team project only through `make up` on `main`, after
  review (ADR-0005 d5's note of 2026-10-10). The team values pass between members privately and are
  never committed.
- **The team project must be available.** Kamel, its Owner, keeps the Free project active and checks
  it before each defense, with no keep-alive job and no paid plan. A paused project answers `540` on
  its Auth and Storage addresses, which the boot check names; only Kamel can resume it. If it is
  paused on defense day anyway, the last resort is the fallback, `make local`, which starts from the
  seed (ADR-0004's notes of 2026-10-03, ADR-0019 d2).

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
- **No location reaches Supabase**: the proxy never forwards to `api-gw` or to a Supabase address;
  every file goes through the `api`'s routes (§9.8).
- **TLS** at image build: `openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes
  -days 825 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`. The key exists
  only in the local image, never in the repository; the image is never published (ADR-0004 d6).

### 15.4 Environment (the twenty-eight entries, ADR-0004 d9) and duplicated sources (M29)

`.env.example`, committed, holds the fallback's values only, and begins with a header comment: *fixed
development values for the local Supabase fallback only; every container loads this file, and only
`api` and `proxy` can also load the team `.env`; keep the team project's values in the gitignored
`.env`; OAuth is optional.* All twenty-eight values belong to the fallback, and the fallback's keys
are made to expire on 2041-10-04 (ADR-0004 d9's note of 2026-10-04).

| Entry | Default | Read by | Notes |
| --- | --- | --- | --- |
| `POSTGRES_USER` | `postgres` | api (consistency check) | the `api`'s role on the fallback; `db`'s own superuser is set in `compose.yaml` |
| `POSTGRES_PASSWORD` | `peerconnect-dev-password` | db (first boot), api (check) | repeated as plain values in `compose.yaml` (§15.1) |
| `POSTGRES_DB` | `postgres` | api (check) | |
| `DATABASE_URL` | `postgresql://postgres:peerconnect-dev-password@db:5432/postgres` | api, Prisma CLI, seed | the only database connection the application uses. Team `.env`: the dashboard's plain Session pooler string, `postgresql://postgres.<ref>:<password>@aws-<n>-eu-central-1.pooler.supabase.com:5432/postgres`, with no TLS settings: the code adds them, and replaces or removes any the URL carries, so none can weaken the check (§15.5). On either target it carries no other query parameter: node-postgres takes the user, password, host and port from one before the URL's own, so the boot check refuses every parameter but the TLS settings (*Boot validation*, below). A slow network needs no `connect_timeout` either: `prisma.config.ts` sets one (§15.5) |
| `NODE_ENV` | `production` | api | overlay sets `development` |
| `PUBLIC_ORIGIN` | `https://localhost:8443` | api, proxy template | overlay sets `http://localhost:8081`; a member's `.env` sets `https://<the laptop's IP>:8443` with `BIND_ADDRESS` |
| `HTTPS_PORT` | `8443` | Compose interpolation (default `8443`), api (check) | |
| `HTTP_PORT` | `8080` | Compose interpolation (default `8080`) | |
| `BIND_ADDRESS` | `127.0.0.1` | Compose interpolation (default `127.0.0.1`) | where the proxy's two base-path ports listen; a member's `.env` sets `0.0.0.0`, with `PUBLIC_ORIGIN` on the laptop's IP, to open `make up` to the local network (ADR-0004 d7's note of 2026-10-25) |
| `ADMIN_EMAIL` | `admin@peerconnect.test` | seed | |
| `ADMIN_PASSWORD` | `change-me-admin` | seed | a Supabase Auth password, 8 characters to 72 bytes, no emoji (§5.1) |
| `FT_OAUTH_CLIENT_ID` | *(empty)* | api | 42 dashboard label **UID**; the team application's, in the team `.env` only |
| `FT_OAUTH_CLIENT_SECRET` | *(empty)* | api | 42 dashboard label **SECRET**; team `.env` only; expires every 28 days (§5.6) |
| `MODERATOR_EMAIL` | `moderator@peerconnect.test` | seed | |
| `MODERATOR_PASSWORD` | `change-me-moderator` | seed | 8 characters to 72 bytes, no emoji (§5.1) |
| `SEED_STUDENT_PASSWORD` | `change-me-student` | seed | shared by the thirty seeded Students; 8 characters to 72 bytes, no emoji (§5.1) |
| `SUPABASE_URL` | `http://api-gw:8000` | api | Team `.env`: `https://<ref>.supabase.co`; only `https:` names the team project |
| `SUPABASE_PUBLISHABLE_KEY` | the fallback's | api (the password grant), api-gw | Team `.env`: the project's publishable key |
| `SUPABASE_SECRET_KEY` | the fallback's | api (admin create, update and delete; Storage), api-gw | Team `.env`: a secret key. It opens every account and file, so only the `api` uses it, and it is never committed or sent to the browser |
| `ANON_KEY`, `SERVICE_ROLE_KEY`, `GOTRUE_JWT_KEYS`, `JWT_JWKS`, `GOTRUE_JWT_SECRET`, `AUTH_JWT_SECRET`, `SERVICE_KEY`, `ANON_KEY_ASYMMETRIC`, `SERVICE_ROLE_KEY_ASYMMETRIC` | the fallback's | the fallback's `auth`, `storage` and `api-gw`, each under its image's own name | nine entries: the fixed local signing secret and the keys made from it. Development defaults that open only a local copy; never in a team `.env` |

- **No other entry**: no `SESSION_SECRET` (ADR-0004 d10), no callback URL, no test database URL (the
  suite derives it, §16.2), no feature flag, and no `VITE_` entry: the web bundle reads none of these
  values (ADR-0019 d1).
- **The team `.env`** (ADR-0004 d9's notes of 2026-10-03 and 2026-10-11) holds only the team
  project's values: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SECRET_KEY`, the three passwords and the `FT_OAUTH_*` pair, plus `BIND_ADDRESS` and
  `PUBLIC_ORIGIN` while its member opens `make up` to the local network; never the fallback's own
  names, such as `POSTGRES_PASSWORD`. Every other value comes from `.env.example`, so the file is
  never a copy of it. **It sets all three passwords to values other than the defaults before the
  first boot on the team project**, which is shared use. So is the fallback opened to the local
  network: before opening it, that member's `.env` sets the three passwords too, and a fallback
  already seeded takes one `make wipe`, then `make up`, since the seed writes the accounts only into
  an empty database and `make local` and `make dev` seed `.env.example`'s passwords (ADR-0004 d1's
  note of 2026-10-25). The team `.env` holds the `postgres` role's password and
  the secret key, so whoever has it can read and change every account and file on the team project:
  only the team holds it, it passes between members privately, it is never committed, and **it is
  never handed to an evaluator**. It is not rotated after a defense; rotating stays cheap if that
  changes, since secret keys are created and revoked one at a time and the database password is one
  reset.
- **Only `HTTPS_PORT`, `HTTP_PORT` and `BIND_ADDRESS` are interpolated by Compose**, each with a
  Compose-level default equal to its `.env.example` value; everything else reaches containers through
  `env_file` or as a plain value in `compose.yaml`, so bare Compose works with no `.env` (ADR-0004 d8).
- **Boot validation**: the boot check's steps 1 and 2 (§15.5), shared by the boot chain, the seed
  entry, both resets and the test harness. A failure prints one message naming the variable and,
  for a URL, its host or a query parameter it sets that node-postgres or Prisma reads, never a
  secret value, and exits 1. Step 1 checks that the `api`'s entries are non-empty (all but the
  OAuth pair and the fallback's nine
  signing secrets and keys, which the `api` never reads), that `PUBLIC_ORIGIN` is a bare origin,
  that the staff and seed passwords meet the rule for a new password (§5.1, and its note of
  2026-11-01), and that `DATABASE_URL` carries
  no query parameter except its TLS settings, the names that start with `ssl` and
  `uselibpqcompat`, on both targets (ADR-0004 d8's note of 2026-10-18). node-postgres reads every
  parameter and takes the user, password, host and port from one before the URL's own, so any
  other parameter could move the connection after steps 1 and 2 had checked the URL; the rule
  lists what may stay, not what is known to move it. For example: `Invalid environment:
  DATABASE_URL: must carry no query parameter except its TLS settings, and it sets user`. Only a
  name on a fixed list of those node-postgres or Prisma reads is printed (`host`, `hostaddr`,
  `port`, `user`, `password`, `database`, `options`, `application_name`, `schema`, `pgbouncer`,
  `connection_limit`, `connect_timeout`); any other reads `it sets a parameter`, since in a
  password typed with a raw `@` and then `?` the rest of the password becomes the first
  parameter's name. The test harness applies the same rule (§16.2).
- **Duplicated sources, resolved by checks rather than new entries**:
  - `DATABASE_URL` and `SUPABASE_URL` must name one target (the boot check's step 2). Compose layers
    `.env` over `.env.example` one variable at a time, so a `.env` that missed one would otherwise
    run the database on one target and Auth and Storage on the other.
  - **On the fallback only**, `DATABASE_URL`'s user, password and database must equal
    `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB`. The fallback's credentials are fixed:
    its `db` always initializes from `.env.example`'s password, so a `.env` that changes
    `POSTGRES_*` and `DATABASE_URL` together passes this rule but names a password the fallback's
    database never read, and the boot check's step 4 refuses it with the remedy (§15.5). Changing
    the database password for shared use no longer applies: shared use is the team project, or a
    fallback opened to the local network, whose database stays unreachable from outside and whose
    three passwords change in `.env` instead (ADR-0004 d1's note of 2026-10-25). An old
    `.env` from before the fallback (`POSTGRES_USER=peerconnect`) is deleted, and `make wipe` run,
    as the README says.
  - When `PUBLIC_ORIGIN` is `https:`, its port must equal `HTTPS_PORT`.
  - `compose.yaml`'s interpolation defaults must equal `.env.example`'s port values, its plain copies
    of the password must equal `POSTGRES_PASSWORD`, and the overlay's `PUBLIC_ORIGIN` literal must
    match its published port; the reviewer checks them together.

> **Updated 2026-10-31** (ADR-0004's note of that date): `.env.example` now holds each variable's
> name with no value, and every value lives in the gitignored `.env`. The table's *Default* column
> records the fallback's values as they were. The team project's values sit in `.env` under the
> variables' own names; the fallback's values for the eleven variables that differ (`DATABASE_URL`,
> `PUBLIC_ORIGIN`, `BIND_ADDRESS`, the three passwords, the `FT_OAUTH_*` pair, `SUPABASE_URL` and the
> two Supabase keys) sit under a `LOCAL_` prefix, with `LOCAL_DEV_PUBLIC_ORIGIN` in place of the dev
> overlay's literal origin; the fallback database's user, password and name and its nine signing
> keys carry no prefix. `make up` and bare `docker compose up --build` read the team values and start
> only `api` and `proxy`. The fallback's four services sit in the Compose profile `local`, which
> `make local`, `make dev`, `make test`, `make reset-local` and CI enable with `--env-file .env`;
> those give every service the `LOCAL_` values in place of the team's. `compose.yaml` reads the
> fallback's database password and site address from `.env` instead of repeating them. Every target
> stops when `.env` is missing, and the fallback ones name each value it lacks. This supersedes, where
> they say `.env.example` carries values, that a fresh clone or bare Compose needs no `.env`, or that
> the fallback and `make local`, `make dev` and `make test` read `.env.example` alone: stories 63 and
> 64, the summary rows for ADR-0004 d8 and d9, the tree's lines for `compose.local.yaml` and
> `.env.example`, §5.6 (A), §15.1, §15.2, this section, §15.6, §16.4 and §16.5.

### 15.5 Boot sequence (ADR-0004 d11 and its notes)

The chain is the same on both targets.

1. The fallback's services become healthy: `db`, then `auth` and `storage`, then `api-gw`.
2. `api` runtime command: `node dist/src/core/check-env.js && npx prisma migrate deploy --config
   prisma.config.ts && npx prisma db seed --config prisma.config.ts && exec node dist/src/main.js`.
   **The boot check comes first**, before anything touches a database (ADR-0004 d8's note of
   2026-10-03). In order, it checks that:
   1. every value the `api` reads is present and well formed (§15.4);
   2. the values name **one target**: `DATABASE_URL` and `SUPABASE_URL` both point at the fallback's
      services, or both carry the same project ref, in the pooler user `postgres.<ref>` and in
      `https://<ref>.supabase.co`;
   3. Supabase Auth and Supabase Storage accept the keys. They come before the database because only
      their HTTP addresses answer `540` for a paused project; the pooler just refuses the
      connection;
   4. the database accepts `DATABASE_URL`. On the fallback, a refusal says to use `make dev` or
      `make local`, or to remove `.env` or replace it with a copy of `.env.example`, since the
      fallback's database never reads `.env`.

      > **Updated 2026-10-31** (§15.4's note of that date): the refusal now says that the fallback's
      > database keeps the password it was created with, so `POSTGRES_PASSWORD` and
      > `LOCAL_DATABASE_URL` in `.env` must match it, or `make wipe` recreates the database. Removing
      > `.env`, or replacing it with `.env.example`, which now holds names only, stops every boot.

   A failure ends the boot with the problem named, for example `Supabase check failed: Auth rejected
   SUPABASE_SECRET_KEY (401)` or `Supabase check failed: https://<ref>.supabase.co answered 540: the
   project is paused`. **The boot never falls back by itself**: an evaluator who believes they are on
   the team project must never be quietly on an empty local copy. To use the fallback on purpose,
   run `make local` or `make dev`.
3. `migrate deploy`, then the seed, whose first step sets the two buckets on every run (§9.8, §14.1),
   then §14.9.
4. `main.js` validates the environment, starts the file cleanup, whose failure is only logged
   (§9.8), then listens; `/api/health` answers; `proxy` starts.
5. Any failure stops the chain; `api` exits non-zero and is not restarted; `proxy` never starts;
   `docker compose up` reports it. **The API never serves before the seed has completed**, which is
   what makes §14.9's emptying safe.

The dev image runs the same check first, from a copy outside the bind mount, then `prisma generate`,
`nest build`, migrate, seed and `nest start --watch` (§15.2).

**On the team project** (ADR-0004 d11's notes of 2026-10-03, 2026-10-06 and 2026-10-11):

- **One `DATABASE_URL`, the session pooler**, for `prisma migrate` and the `api`. The direct
  connection is IPv6-only on Free, and the transaction pooler drops the lock `prisma migrate` holds.
  `40001` and `40P01` come back through the session pooler unchanged (tested on 2026-10-03), so the
  Unit of Work's retry works (§3.6.2).
- **The connection is encrypted and verified.** When `DATABASE_URL` and `SUPABASE_URL` name the team
  project, `src/core/database-connection.ts` gives the `api`'s pool, and the boot check's step 4,
  `supabase/prod-ca-2021.crt` with full verification, after removing every TLS setting the URL
  carries (each `ssl…` key and
  `uselibpqcompat`): node-postgres lays the URL's settings over its config, so a pasted
  `?sslmode=no-verify` would otherwise switch the check off. For `prisma migrate`, whose engine takes
  TLS from the URL only, `prisma.config.ts` sets `sslmode=require`, `sslaccept=strict` and
  `sslcert=<absolute path>` on the query of a URL on Supabase's pooler, replacing any it has; the
  engine does not find a relative path. A wrong or missing certificate stops both connections. The
  project also enforces SSL, so an unencrypted connection is refused, and the boot check names it.
- **`prisma migrate` waits 30 s for the pooler.** Its engine waits 5 s by default, and from some
  networks the pooler takes more than 5 s to answer, so `prisma.config.ts` also sets
  `connect_timeout=30` on a URL on Supabase's pooler, replacing any it has (ADR-0004 d11's note of
  2026-10-19). No `.env` needs one, and the boot check refuses one (§15.4). The boot check's step 4
  runs first and gives its own connection 10 s, so a pooler slower than that still stops the boot
  there.
- **Each `api`'s pool is capped at 5 connections.** In session mode the pooler accepts at most the
  project's Pool Size, 15 (the default for its compute size), per role and database. Two members'
  stacks of 5, `prisma migrate deploy`, and the seed's two connections, its pool's and its lock's,
  make 13, with 2 to spare.

`prisma.config.ts` imports `dotenv/config`, sets `schema: "prisma/schema.prisma"`, `migrations: {
path: "prisma/migrations", seed: "node dist/prisma/seed/main.js" }` and `datasource: { url:
process.env.DATABASE_URL }`, with the TLS settings and the wait above on a Supabase pooler URL. **Every Prisma CLI
invocation — boot, Makefile, CI, docs — passes `--config prisma.config.ts`** (M16), so no pinned
invocation can load another Config. Pinning does not stop an unpinned run — an editor extension, a
developer's bare `npx prisma` — from discovering one, which is why §3.2 forbids the files themselves
and the gate reads them off the file list; the two layers are meant together. `dotenv` is therefore
a runtime dependency too: the runtime image's Prisma CLI loads `prisma.config.ts`, which imports it.
Because it loads `.env` by itself, the test harness checks its own target (§16.2).

### 15.6 Makefile (convenience only; ADR-0004 d8)

| Target | Command |
| --- | --- |
| `up` | `env`, then `docker compose up --build` — the only stack target that reads `.env` |
| `local` | `docker compose --env-file .env.example -f compose.yaml -f compose.local.yaml up --build` — the production image, always on the fallback |
| `dev` | `docker compose --env-file .env.example -f compose.yaml -f compose.dev.yaml -f compose.local.yaml up --build` — always on the fallback |
| `down` | `docker compose down` (keeps the volumes) |
| `wipe` | `docker compose down --volumes --remove-orphans` (M20): the fallback's database and Storage volumes, never the team project |
| `seed` | `docker compose exec api npx prisma db seed --config prisma.config.ts`, in whichever stack is up |
| `test` | under `-p peerconnect-test` with `make dev`'s files and `--env-file .env.example`: remove any copy an interrupted run left, with its volumes; build `api`; start `db`, `auth`, `storage` and `api-gw`; `run --rm api npx vitest run`; remove the copy with its volumes even if the suite fails (§16.2) |
| `logs` | `docker compose logs -f` |
| `env` | copy `.env.example` to `.env` when absent |
| `reset-team` | empty the team project (below) |
| `reset-local` | empty the fallback (below) |

Every target's full command is also in the README. Bare `docker compose up --build` needs none of them.

**The two resets** (ADR-0004 d11's notes of 2026-10-03 and 2026-10-11, ADR-0019 d10), whose code is
under `prisma/reset/**`, inside the gate. `make reset-team` empties the team project and reads
`.env`; `make reset-local` empties the fallback and reads `.env.example` alone, as `make local`
does. Each deletes the rows of our tables (the tables and migrations stay), **every** Supabase Auth
user and **every** file in `avatars` and `evidence`, not only what the seed made, since pre-defense
checks and defenses add accounts and files too, through the seed's own function (§14.9); the next
boot seeds afresh. Each leaves the project or the stack, its settings, the buckets and the keys.
There is no single command for both: wanting a fresh local copy must never empty the shared project.
In order:

1. `make reset-team` only: it refuses unless the checkout is on `main`, has no uncommitted change
   and, after a fetch, equals `origin/main`, since the reset is code and the boot after it writes the
   fixture of whatever checkout runs `make up`. `make reset-local` has no such check.
2. **It checks what it read** with the boot check's steps 1 and 2, since neither reset runs the boot
   chain. `make reset-team` refuses unless `DATABASE_URL` and `SUPABASE_URL` both name the team
   project with the same ref (with no `.env`, or a copy of `.env.example`, it has no ref and
   refuses), then prints that ref and asks for it to be typed before it deletes anything.
   `make reset-local` refuses unless both name the fallback. A mixed `.env` would otherwise delete
   Auth users and files on one target and rows on the other.
3. **It takes the seed's lock**, on a connection of its own, and refuses before any write, saying a
   seed is running on that target, while a seed holds it. It keeps the lock until it has deleted, so
   a seed that starts meanwhile waits; losing that connection stops it at once, with no reconnect.
4. **Its first write clears the completion record**, on the lock's connection, so a reset that stops
   partway leaves no record over the rows left, and the next boot empties and seeds, or, if a
   Student the seed does not make is left, the guard stops it and running the reset again finishes
   it (§14.9).
5. Then it deletes. `make reset-team` ends by saying to run `make up` from the same checkout.

**Kamel runs `make reset-team` whenever he chooses**, never as part of `make up`: when the seed's
fixture changes; when the pre-defense run finds anything an earlier defense changed in the way, a
changed password or a suspended, demoted or removed account, for which the reset is the one remedy
(the only one for a removed account, since Removal has no reinstate); and whenever a defense should
start from the seed's end state. Every stack connected to the team project is stopped first, and
every other stack stays stopped until the boot after it has finished writing the fixture. It is
proven on the fallback first, with `make reset-local` under `make local`: boot; add a sign-up and an
avatar the seed did not make; reset; boot again; check that only the seed's accounts and files are
left, with four closed Rounds and none open. `make wipe` is different again: it drops the
fallback's volumes without running the deletions through Auth and Storage, and it is the only
command that removes the suite's own buckets left in a `make dev` stack (§16.2).

Prisma commands a developer runs by hand (`migrate dev`, `generate`, `db seed`) run inside the dev
overlay's `api` container, on the fallback, because no database port is published and `DATABASE_URL`
names the Compose host `db`; the bind mount puts the generated migration and client back in the
working tree. They are pinned like every other invocation, e.g. `docker compose -f compose.yaml -f
compose.dev.yaml exec api npx prisma migrate dev --config prisma.config.ts --name
<slice>_<change>`. `CONTRIBUTING.md` → *Schema changes* carries the same commands. Repairing a
migration that failed partway on the team project is one of Kamel's four changes by hand
(`supabase/team-project.md`).

### 15.7 Pre-defense checklist (ADR-0004 Consequences and its notes, ADR-0016 d5)

- **Both boot paths on the fallback**, each from its own fresh clone **and an empty database**
  (§16.5); expect the certificate interstitial; confirm the console is clean in Chrome, Firefox and
  Brave after accepting it.
- **One run on the team project**, from a team member's own computer, with the team `.env` (ADR-0004
  *Consequences*' note of 2026-10-03): Kamel checks that the project is active; `make up` boots on
  it; the bootstrap Admin, the Peer Moderator and the demo Student sign in with the team `.env`'s
  passwords; one sign-up succeeds, which also confirms that the team project accepts
  `<id>@peerconnect.invalid` logins; and one avatar upload succeeds. If anything an earlier defense
  changed is in the way, Kamel runs `make reset-team` (§15.6), boots with `make up` and runs the
  three sign-ins again, so the defense is never the first sign-in after a reset; the sign-up and the
  upload are not repeated. Unless he resets, the run's writes stay in the data the defense starts
  from. No Round is left open.
- **The dashboard matches `supabase/team-project.md`**, compared by Kamel, and the `postgres` role's
  four log settings are checked through the session pooler with that record's `psql -f` check and
  its two probes, not `rolconfig`, which shows only what the role stores (ADR-0018 d6's note).
- **`.env` opens nothing to the network**: `BIND_ADDRESS` and `PUBLIC_ORIGIN` are absent or hold
  `.env.example`'s values, so the site is at `https://localhost:8443`, where the evaluator opens it
  (ADR-0004 d5's note of 2026-10-25).
- **The 42 secret's `secret_valid_until`** is checked; an expired secret fails every trip to 42 (the
  first ends on 2026-11-04).
- **The evaluator is told only the three sign-in passwords**, `ADMIN_PASSWORD`, `MODERATOR_PASSWORD`
  and `SEED_STUDENT_PASSWORD`; the team `.env` stays with the team. If a defense ever runs on another
  computer, never one an evaluator controls, a team member puts the `.env` there, shows it to
  nobody, and at the end runs `make down`, which removes the containers that hold its values, and
  deletes it (ADR-0004 d9's note of 2026-10-11).
- **A real Sign in with 42** is shown by hand, the round trip the suite replaces (§5.6).

---

## 16. Testing, CI and the clean boot (ADR-0016)

### 16.1 Principles

Test only what fails silently; everything else fails loudly and the demo is its detector. One level:
integration tests against **Supabase's own Postgres, Auth and Storage**, the local fallback's
containers, never a plain Postgres or a stand-in for either service (ADR-0016 d1's note of
2026-10-04, ADR-0019 d9): a stand-in would prove the code against itself, and a seed or a file check
could pass on it and fail on Supabase. **The twelve categories are closed**; a thirteenth needs the
*does it fail silently?* argument (ADR-0016 d7's notes). Tests assert outcomes, never a PostgreSQL
technique. No coverage target; roughly 20–40 tests. Vitest is the one runner; the API side builds
tests with `unplugin-swc` for decorator metadata. **`npx vitest run` is the command** the Done box
names, run locally as `make test`.

### 16.2 Where the suite runs (M18)

- **Locally** (the Done box's run): **`make test` runs a copy of its own** (ADR-0004 d8's note of
  2026-10-04, ADR-0016 *Not settled*'s note). Under the Compose project `peerconnect-test`, with
  `compose.yaml`, `compose.dev.yaml` and `compose.local.yaml` and `--env-file .env.example`, it
  removes any copy an interrupted run left, starts the fallback's `db`, `auth`, `storage` and
  `api-gw` from empty, runs `npx vitest run` in a fresh `api` dev container, and deletes the copy
  with its volumes when the run ends, even if the suite fails. It never starts `proxy`, so it
  publishes no port. Supabase Auth and Storage write each test's users and files to the copy's own
  main database, which is why the copy never shares `make dev`'s or `make local`'s containers, and a
  run from empty means what CI's run means. **One `make test` runs at a time per machine**: every
  copy has the same project name, so a second run's first step would delete a running copy. The `api`
  dev container has the dev dependencies, the bind-mounted repository and an `nginx` binary
  (installed in the Dockerfile's `dev` target only).
- **The harness** (`test/harness/`):
  - **its first step, before any connection, refuses any target but the fallback**, with the check
    `make reset-local` runs (the target function of `src/core/env.ts`): `DATABASE_URL` and
    `SUPABASE_URL` must both name the fallback, or the run stops and names the variable and the host
    it points at, never the password. It also refuses a `DATABASE_URL` query parameter other than
    the TLS settings, with step 1's rule (§15.4), and names the parameter as step 1 does.
    `make test` reads `.env.example` alone, but `npx vitest run` can be typed anywhere, and
    `prisma.config.ts` loads `.env` by itself;
  - global setup derives the test database name `<database of DATABASE_URL>_test`, drops and recreates
    it (`DROP DATABASE … WITH (FORCE)`), runs `npx prisma generate --config prisma.config.ts` first —
    the client is gitignored (§3.2), a fresh clone has none, so nothing may import it before it exists,
    and this is what lets `make test` run on a fresh clone — then `npx prisma migrate deploy
    --config prisma.config.ts` against it. The main database is never emptied, so a suite run inside
    a `make dev` container leaves the developer's tables alone. No table references Supabase's
    `auth` or `storage` schemas (§4.1), so `<db>_test` can be dropped and rebuilt on its own;
  - each test file boots the real `AppModule` in-process against the test database and the copy's
    own Supabase Auth and Storage, on an ephemeral port, with a recording `RealtimePublisher` (the
    socket category boots the real gateway);
  - **every test account is made the real way**: a Student through the sign-up code, Supabase's
    admin create and then the `Student` and its `Session`; the bootstrap staff through the seed's
    bootstrap code (§14.1). The Student and session helpers land with Accounts and sessions (§18
    item 3), and the staff helper with the seed that builds the shared bootstrap function. A staff
    session is opened by the code sign-in runs after the password check, so only the tests of
    sign-in itself pay for a real password check;
  - tables are truncated between tests; `fileParallelism: false`; a test or hook without its own
    limit gets 20 s (`testTimeout`, `hookTimeout`), the limit most slow tests set one by one, since
    Vitest's 5 s default failed sub-second tests when other Docker work shared the machine, and
    hooks get the same room. **Supabase Auth users and files
    outlive the truncation** and are deleted with the copy. Their ids never repeat, so they collide
    with nothing: a test checks a user or a file by its id, never by a count, and a file's name is
    its row's token (§9.8);
  - **the suite's files go to buckets of its own**, `test-avatars` and `test-evidence`, made by the
    bucket code of §9.8 with those names passed in; the cleanup never runs by itself in the harness,
    neither at start nor hourly, and `08-files` calls it on those buckets. Run inside `make dev`, the
    suite therefore never lists or deletes the developer's files;
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
  - `checkpoint`, and the password change's named pause, are bound to a barrier registry (§3.6.4);
  - only the two calls to 42, the token exchange and `/v2/me`, are replaced by a fixed answer, in
    `12-sign-in` (§5.6); nothing of Supabase is.
- **Inside a `make dev` container** (`npx vitest run` typed there): the harness leaves the
  developer's tables alone, but the Supabase Auth users the run makes stay in that stack until
  `make reset-local`, `make wipe` or the next seed run there that writes its fixture, and the files in
  the suite's own buckets stay until `make wipe` (ADR-0016's note of 2026-10-11).
- **In CI**: the same copy as `make test` (§16.4), with no service container and `nginx` from the
  `dev` image. No production image, no `proxy`, no TLS and no boot chain (ADR-0016 d8's note of
  2026-10-04). No database port is ever published to the developer's host.
- The suite never runs the seed; the seed has its own checks (§16.4, §14.8).

### 16.3 The twelve categories — files and exact assertions (M19)

Files live at `test/<NN>-<category>/*.test.ts`.

| # | Directory | Seam | Assertions |
| --- | --- | --- | --- |
| 1 | `01-matcher` | pure engine + services + DB | Over `generateCohort({ size: 20, seed: 42 })` and six Rounds with every Match accepted and reviewed through the services: **C3** every Match has ≥ 1 FORWARD row; **C4** every stored Score equals §8.2 recomputed from its coverage and goal flag, and its explanation names a FORWARD Skill; **C6** two runs on fresh databases with the same action log give identical sequences of (mentor position, mentee position, Score, Mission, coverage); **C7** no Match below 25. The five half-values round up. **No-repeats**: a pair with a prior `DECLINED`, and one with `TERMINATED_BY_ADMIN`, is never proposed, while a hand-made Match may pair it; a blocked pair is never proposed and a hand-made Match refuses it. Most-constrained-first picks the constrained Student first on the prototype's `starvation` cohort. C1, C2, C5 are **not** asserted. |
| 2 | `02-migrations` | SQL on the migrated test DB | Each of the eight named raw objects and both Report partial uniques exists by name with its definition (catalog queries), and `Student.display_name`'s collation, the ninth raw step, is `und-x-icu`, since a later `ALTER COLUMN … TYPE` would silently put it back on the database default (ADR-0016 d1's notes of 2026-10-02); each CHECK rejects a violating row; `friendship_unordered_pair` rejects the reversed duplicate; `round_single_open` rejects a second open Round; `match_pair_history` exists and is non-unique. |
| 3 | `03-standing-match` | services + checkpoint | Two concurrent hand-made creations sharing a Student, both held after their reads, admit exactly one Match; the other returns `already_matched` and writes nothing. |
| 4 | `04-file-access` | HTTP | Evidence URL signed out → 401; signed in as an unrelated Student → 403; the pair and an Admin → 200. Avatar signed out → 401, any signed-in → 200. |
| 5 | `05-socket-origin` | real Socket.IO server + client, real session | Exact `PUBLIC_ORIGIN` connects; absent, `null` and mismatched `Origin` are refused with the session row still present; an HTTP long-polling request is refused; a good origin with no session gets `unauthorized`. |
| 6 | `06-prompt-serialization` | services + checkpoint | Publication vs answer in both orders (old answer committed or refused with nothing written); two publications with an identical injected `published_at` get distinct orders and exactly one live Prompt; answer vs close in both orders (`answer_round_id` and the close's Streak agree with the order); duplicate and retried answers → one Post, one +20, Knowledge Sharer once; the answer transaction never writes `streak`; an unreviewed Match plus an answer in the Round increments Streak, no activity resets it, Suspended and Removed are skipped. |
| 7 | `07-lifecycle-lockout` | services + checkpoint | The candidate predicate excludes `ADMIN`, Suspended, Removed and Skill-less Students; role, Suspension and Removal vs Round open and vs hand-made creation, both orders; hand-made creation vs close, both orders — never a Match in a closed Round; Block vs friend request, both orders — never a Block beside a Friendship row; a Removed row refuses every mutation and its email refuses sign-up; two Admins demoting, suspending or removing each other leave ≥ 1 active Admin. |
| 8 | `08-files` | HTTP **through the nginx harness** | Exactly 5,242,880-byte PDF, PNG and JPEG Evidence and a 2,097,152-byte Avatar reach the API and are stored; one byte more → `file_too_large` from the API's §9.5 size check (`size > cap`), not an nginx 413; malformed, truncated, extension-spoofed, `Content-Type`-spoofed and Avatar-PDF payloads are refused; Evidence reads anchor to the owning Review's Match (a Student paired with the uploader in another Match → 403; a Peer Moderator outside the pair → 403; inside it → 200); only the originating Mentee mutates (Mentor, an Admin outside the pair → 403), including after `COMPLETED` and including a Mentee promoted to `ADMIN` after the Review (→ 200); Suspension blocks mutation and keeps the row, reinstatement restores, Removal ends mutation and keeps the row; a failed replacement leaves the old row and its file; a missing or wrong `Origin` or `X-PeerConnect-CSRF` → 403 before any parsing. **Storage** (ADR-0016 d1's note of 2026-10-05; the suite's own buckets, §16.2): (1) after a replace or a delete, the old file is gone from Storage; (2) a save that fails before anything can commit leaves no new file: a refusal, and a failure by the 30-minute rule (§9.8) with the save held inside its transaction while the clock moves; (3) the cleanup deletes a file no row names once it is more than an hour old, skips one an hour old or younger, and never deletes a file a row names, run with a page size small enough that the bucket takes several pages, so a run that skips files fails it; (4) on an empty Supabase the bucket step creates both buckets, private, with their caps and types, and where a bucket exists with other settings, made public or given other caps or types, it sets it back. Checks 2 and 3 move the application's clock rather than waiting. |
| 9 | `09-review-xp-badges` | services + checkpoint | A duplicate or retried Review → one Review, Private Feedback, Post and XP payment; Review vs close, Decline, Suspension and Removal, both orders; a Match created before promotion completes with 80/120 XP and First Mentor, the Admin's Level and Badge still on the profile and absent only from the Leaderboard and its pin; a Review and a Prompt answer paying one Student concurrently both land; **the one same-Badge race that can be staged (§10.4)**: a Student with two answers answers Prompt *n* (held after its reads) while Prompt *n+1* is published and answered by them (held). Released in either order, or together, the answer to Prompt *n* is refused `prompt_not_live` and writes nothing (no Post, no XP). The answer to Prompt *n+1* commits one Post, +20 XP and exactly one Knowledge Sharer, so the threshold is still crossed once. The test never asserts two Posts or +40: no serial order consistent with both held reads admits them. An older answer can still commit — category 6's "old answer committed" order — but only when no newer answer by the same Student has read first; Suspension or Removal vs close with prior qualifying activity, both orders; the pin never reintroduces an Admin, Suspended or Removed viewer. |
| 10 | `10-reports` | services + HTTP | The two partial uniques and the Report CHECKs; two concurrent filings by one reporter on one target → one row and `already_reported`, winner unchanged; two concurrent resolutions → one winner, `already_resolved`, a losing removal leaves the Post; every row of a batch shares state, resolver and time; filing vs resolution and vs target Removal, both orders; Remove Post and Remove Student action their open rows atomically — Remove Student includes an open row the removing Admin personally filed, `ACTIONED` with `resolved_by_id` = that Admin, the batch then hidden from that Admin's own resolved audit and visible to another Admin with reporters — Suspension leaves them open; a Peer Moderator sees only eligible open Post groups with no reporter identity and no resolved history, and one conflicting open reporter hides the whole group; an Admin cannot read or resolve their own-target group or any open group or resolved batch containing their own report, while another Admin can, with reporters; a stale queue read followed by demotion is refused on action; a Block create/remove racing a Peer Moderator action, both orders. |
| 11 | `11-name-search` | services + DB | Sign-up, the Student's own edit and the Admin edit, and any path added later that sets a name, each write a name, and searching its plain form (`helene`, `احمد`, `فاطمه`) finds the Student; after a rename to a name whose folded form does not contain the old folded form, the old one no longer does. Binds the outcome, not the fold's technique; the seed's two directly inserted bootstrap accounts are asserted by §14.8 instead (ADR-0016 d1's note of 2026-10-02). |
| 12 | `12-sign-in` | HTTP + services + `checkpoint` and the named pause (§3.6.4); for 42, only the token exchange and `/v2/me` replaced by a fixed answer | **A sanction is told only after the right password**: a Suspended or Removed Student signed in with a wrong password gets `password_incorrect`, never the sanction's code; with the right password, `account_suspended` or `account_removed`. **A completed password change leaves no session the old password opened**: a sign-in with the old password racing the change ends refused or signed out in every order staged, held at its own transaction's `checkpoint` and at the change's, and run whole between the change's first sign-out and Supabase's admin update, with the change held at `password-change:admin-update`, then released, and the session gone. **A 42 login finds its Student only by `forty_two_id`**: after an Admin sets another Student's email to the email the fixed `/v2/me` answer returns for a connected Student's 42 account, a 42 login with that account reaches the Student who connected it, never the other. **A password is set without the current one only within a fresh Confirm with 42**: without the confirmation, and eleven minutes after it, the request is refused `confirmation_required`; within ten minutes, once, it succeeds (ADR-0016 d1's notes of 2026-10-04 and 2026-10-08). Untested on purpose: a concurrent duplicate sign-up that fails to delete its spare Supabase Auth user, which harms nothing, and a Supabase `429`, which no test can make Supabase answer on demand. |

> **Row 2 extended 2026-11-02** (#254): category 2's `text-limits.test.ts` asserts §4.4's steps
> 10–17 by name, each `CHECK` refusing a text one character over its limit and an empty one, and
> the trigger refusing a new or changed Direct Message body over 500 characters while an older,
> longer body still reads and is still marked read. The API's own length checks stay untested, as
> ADR-0016 d1 leaves forms (its note of the same day).

> **Row 5 extended 2026-11-03 ([#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261))** *(uncommitted)*, **landed on `main` at `2c9eb01`**:
> category 5's `staff-room.test.ts` uses real sessions and sockets: a `STUDENT` never receives
> `reports:changed` when a Report is filed; a Peer Moderator does, then stops after demotion on
> the same connected socket, which receives one `session:changed {}` while the `STUDENT`'s
> receives none. A Report about a Peer Moderator or an Admin, of the Student or of their Post,
> sends that staff member no `reports:changed` while another Admin's socket gets one. Admission
> is awaited before checking delivery. Category 10's filer assertions follow §12.4's note of the
> same day: an Admin sees and may resolve a group holding their own Report, and their audit shows
> its batch, the Removal's included; a Peer Moderator sees such a group with `filedByMe: true`
> and no reporter, and is refused `conflict_of_interest` on resolving it.

> **Rows 9 and 12 extended 2026-11-03 ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262); ADR-0021 *Consequences*)** *(uncommitted)*:
> category 12's `new-dots.test.ts` signs in over HTTP: Messages has a dot with an unread Direct
> Message; after opening Messages, none; after a newer Direct Message, a dot again; and after
> signing out and in again, a dot while only the older message is unread. The test clock makes
> "newer" exact. Category 9's `feedback-read.test.ts`: a Mentee's opening sets nothing; the
> Mentor's opening of one Match sets that Private Feedback's `read_at` alone, and opening
> `/feedback` sets the rest; and no response the Mentee receives, the Match pages, Match history,
> feedback, New dots and session included, nor the Mentor's own feedback list, carries `read_at`
> or any `*_opened_at`.

### 16.4 CI — one advisory workflow (ADR-0016 d8, M21)

`.github/workflows/ci.yml`, on every pull request. **CI runs the same copy as `make test`** (ADR-0016
d8's note of 2026-10-04): GitHub starts a workflow's service containers before it checks the
repository out, and Supabase's containers need files from it, the database's setup SQL and the
gateway's configuration, so there is no service container.

1. Check out; set up Node 22; `npm ci`; `npm --prefix web ci`.
2. `npx prisma generate --config prisma.config.ts`; typecheck the API and the SPA; build the SPA;
   `npx nest build`.
3. **Start the copy**: under `-p peerconnect-test`, with `--env-file .env.example` and
   `compose.yaml`, `compose.dev.yaml` and `compose.local.yaml`, remove any leftover copy with its
   volumes, build the `api` dev image, and start `db`, `auth`, `storage` and `api-gw`. Every value
   comes from `.env.example`, so §15.4's consistency check passes unchanged.
4. **Schema from empty**: inside one `run --rm api` dev container for steps 4–7, `npx prisma migrate
   deploy --config prisma.config.ts` on the copy's empty main database.
5. **Seed from empty**: `npx prisma db seed --config prisma.config.ts` — its first step makes the
   buckets (§9.8), then the fixture at its current version (§14.9) through the real write paths,
   ending with the §14.8 assertions that version implements; any failure fails the step.
6. **Seed idempotence**: run the seed again; it must log *already complete* and exit 0.
7. `npx vitest run` (the suite uses its own `_test` database and its own buckets), with `nginx` from
   the `dev` image.
8. **Delete the copy** with its volumes, even if a step failed.

**The workflow grows with the slices, as the seed does.** A step that cannot pass before its
prerequisite exists is added by the PR that creates the prerequisite, never made conditional or
tolerant: `ci.yml` landed with the infrastructure gate (§18 item 1), the local fallback's build
(#121) moved it onto `make test`'s copy, step 6 is added by the PR that lands the seed skeleton's
completion record (§18 item 3), since the week-1 seed entry writes none and a second run could not
log *already complete*, and step 7 was added by the first test file's PR (#112, 2026-10-02; §16.8). Vitest's
`passWithNoTests` is never set: an empty run fails, so a broken test path can never pass as green.
The price is a `dev` image build and the Supabase images' download on each run.

It stays advisory: making the workflow a required check is an open governance decision (#28, ADR-0005
d7). The only required check on `main` is *No bot or AI text* (§17.4), which tests nothing.
**What stays out of CI is the boot**: no production image, no `proxy`, no TLS and no boot chain; the
clean-clone boot stays a human check (§16.5).

> **Updated 2026-10-31** (§15.4's note of that date): before the suite, CI writes `.env` from the
> repository secret `LOCAL_ENV_FILE`, which holds the fallback's values, and runs Compose with
> `--env-file .env --profile local`.

### 16.5 Clean-clone boot verification (ADR-0004 d8, ADR-0016 d5)

Required on any PR touching `prisma/**` (the seed at `prisma/seed/**`, the fixture at
`prisma/fixtures/**` and the resets at `prisma/reset/**` included), `prisma.config.ts`, any
`compose*.yaml`, `Dockerfile`, `proxy/Dockerfile`, `supabase/**` except its Markdown files, or
`.env.example`, and before defense. Parts of `supabase/**` and `.env.example` act only when a
database volume is created: `compose.yaml` mounts `supabase/db/`'s SQL into the folder Postgres runs
only then, and the fallback's database passwords take effect only then. So a broken change there can
pass on a working stack with an old volume and fail on a fresh clone (ADR-0016 d5's note of
2026-10-10). Both clones run on the fallback: a fresh clone has no team `.env`, and the team project's
own run is §15.7's.

1. **Clear state**: `make wipe` (or `docker compose down --volumes --remove-orphans`) from any clone —
   every clone shares the project name `peerconnect`. It drops the fallback's database and Storage
   volumes and never touches the team project; `make test`'s copy has a project name of its own, so
   clearing never involves it. Clearing is not setup.
2. **Clone 1**: fresh clone, `make up`.
3. Clear state again.
4. **Clone 2**: a different fresh clone, nothing run first, no `.env`: `docker compose up --build`.
5. **Each passes when**: `api` becomes healthy with the seed logging completion from an empty
   database; `https://localhost:8443` shows the sign-in page after the interstitial; the bootstrap Admin
   and the demo Student (`SEED_STUDENT_PASSWORD`) can sign in; `/admin/rounds` shows four closed Rounds
   and none open; the console is clean.

   > **2026-10-25** (§3.5.1's note of 2026-10-25): `https://localhost:8443` shows the landing page,
   > and its Sign in reaches the sign-in page. The rest of the pass line is unchanged.
6. **Which of those apply to a given PR.** Step 5 is the final contract: it binds in full before
   defense and on every qualifying PR from the one that completes ADR-0017's end state (§18 item 12)
   onward. Before that, a criterion applies from the PR whose slice creates its surface, and a PR
   inside §16.5's trigger lists the criteria it could check in its clean-clone box. The ones that
   bind from the first PR, the infrastructure gate's (§18 item 1), are the same on both clones:
   both boot paths come up from an empty database with no step run first; the §15.5 chain runs in
   order and `api` turns healthy only after it — the boot check, `migrate deploy`, then the seed
   entry, which at that stage may do no more than log completion, then `main.js`;
   `https://localhost:8443` serves the bundle's `index.html` after the interstitial, and port 8080
   redirects to it; the console is clean. The seed logging completion of the fixture version as it
   stands (§14.9) and the bootstrap Admin's sign-in join from §18 item 3; the sign-in page from the
   SPA's sign-in slice; the demo Student's sign-in and four closed Rounds from item 12. Four closed
   Rounds is never required of a PR that precedes the slices producing them.

> **Updated 2026-10-31** (§15.4's note of that date): `make up` now runs only the team project, which
> is never empty. Each fresh clone first gets a copy of a filled `.env`, and the two checks run the
> fallback: `make local`, and bare `docker compose --env-file .env --profile local -f compose.yaml
> -f compose.local.yaml up --build`. The pass line is unchanged.

### 16.6 Detecting a seed or boot regression before defense — four distinct layers

| Layer | Catches | Runs |
| --- | --- | --- |
| **Schema migration checks** | a migration that fails from empty, a lost raw object or collation; **checksum drift**, an edited merged migration, is caught by the gate review alone, since CI step 4 deploys onto an empty database and the boot's `migrate deploy` skips an edited migration, printing *No pending migrations to apply* (ADR-0005 d6's correction of 2026-10-10) | CI step 4 on every PR; category 2 on every suite run; the gate review; `migrate deploy` at every boot |
| **Application integration tests** | the twelve silent-failure categories | the Done box's `npx vitest run`, as `make test`; CI step 7 |
| **Seed fixture assertions** | an application change the seed drives that breaks the fixture or its end state — the case no earlier check saw (map #1's open ⚠️) | inside every seed run that writes: at every boot from empty, and CI steps 5–6 on every PR |
| **Empty-database clean-clone boot** | Compose, Dockerfile, env, TLS, nginx or boot-order breakage, and a change to the fallback's Supabase services that acts only when a volume is created | the two-clone procedure on the PRs listed in §16.5 and before defense |

Developers' own databases already hold a completed seed and skip it, and so does the team project,
which is why the seed is checked from empty in CI rather than trusted to surface at the next boot.
None of the four reaches the team project itself: its settings, its availability and the seeded
accounts' passwords are checked by §15.7's run before each defense.

### 16.7 Browser pass (ADR-0016 d9)

Ahmad runs it in week 5 (2026-10-16 → 10-22): every feature in Firefox and Brave,
Chrome as the baseline; Brave Shields against the self-signed certificate, the `wss` socket and the
`SameSite=Lax` cookie; the CSP and the clean console. Limitations are documented in the README
(`en.subject.md:580`).

**An Arabic pass** joins it and Pre-defense readiness (#72, #73), added by
[Write the build tickets for French, Arabic and right-to-left](https://github.com/ahmadmnsur/ft_transcendence/issues/148) (ADR-0020 d7). In Arabic, right to left, it
checks what the build cannot: the merged code's changes, the tables, the chart and the arrows
(§3.5.2, §3.5.3, §13.4), English typed into a component, and JavaScript that assumes left to right.
The page's own scroll bar stays on the right in Chrome and Firefox: it is browser UI, which the
README's limitations can name.

> **Updated 2026-10-09:** this read *"Fadel runs it in week 5 (2026-10-16 → 10-22), Ahmad
> deputising"*. Fadel left the team on 2026-10-01, and the pass has been Ahmad's since (#72;
> ADR-0016 d9's note). No deputy is recorded for it.

### 16.8 Definition of Done (ADR-0016 d6)

A ticket is done when its PR merges with every applicable box of `.github/pull_request_template.md`
ticked — there is no second definition: branch named and based on `main`; Conventional Commits;
rebased; **one completed review** by another member; **suite green** (`npx vitest run`); **the ticket's
acceptance criteria met**, each; no test outside the closed list without its argument; **records moved
together** if a rule, criterion, scope, status or resolved question changed; **Privacy Policy** (and
Terms) moved with any change to stored personal data, its visibility or retention; **three
languages** when the PR adds or changes text the SPA shows, in English, French and Arabic with
`CONTEXT.md`'s words, and `npm --prefix web run build` passing (ADR-0016 d6's note of 2026-10-15,
ADR-0020 d10; until `web/src/i18n/` exists, the text in English only, in one object per area
shaped like the dictionary); the **schema-gate** boxes when inside the gate; the **clean-clone**
boxes when §16.5 applies.

**The suite box binds from the first test file.** `npx vitest run` exits 1 when it finds no test
file, so no PR before the first `test/<NN>-<category>/*.test.ts` can show it green — the
infrastructure gate's among them. Until a PR's branch holds at least one such file, the box is ticked
*not applicable*; from the PR that adds the first one — at the latest §18 item 4, category 1 — the
suite must pass, on every PR after it. The test harness (§18 item 2) adds no test of its own: each of
the twelve categories needs the slice it covers. `passWithNoTests` is never set (§16.4), so this is the
only way an empty suite is excused, and it ends for good with the first test file.

---

## 17. Team gates and process

### 17.1 Roles (CONTRIBUTING; ADR-0004 d12, ADR-0005 d3, ADR-0016 d9–d10)

| | Role | Also |
| --- | --- | --- |
| **Ahmad** | Product Owner · Scrum Master | Developer · schema-gate deputy · fixture port and matcher tests (week 2) · browser pass (week 5) · Developer member of the team Supabase project |
| **Kamel** | Technical Lead / Architect | Developer · schema gate · week-1 infrastructure gate · Owner of the team Supabase project: keeps it available, the only member who changes it by hand (§17.2), and runs `make reset-team` (§15.6) |
| **Hussein** | Developer | — (not a member of the team Supabase project) |

> **Updated 2026-10-09.** The table's third row was *Fadel: Scrum Master; Developer · fixture port
> and matcher tests (week 2) · browser pass (week 5)*. Fadel left the team on 2026-10-01, and Ahmad
> took that role and those tickets (#34, #35, and #72, §16.7's browser pass), with the watch for
> schema-gate stalls (§17.2). Hussein Dakdouk (`hdakdouk42`) joined as a Developer on 2026-10-04.
> The team is Ahmad, Kamel and Hussein, as in `CONTRIBUTING.md` → *Roles*.

### 17.2 The schema gate (ADR-0005 d3–d6)

- **Scope, read off the file list**: `prisma/**` — which contains the seed (`prisma/seed/**`), the
  fixture module (`prisma/fixtures/**`) and the two resets (`prisma/reset/**`) — and every Prisma
  Config discovery path, read as the three patterns of §3.2: `/prisma.config*` (which holds the root
  `prisma.config.ts`), `/prisma7.config*` and `/.config/prisma*`. A PR adding any file matching one
  other than `prisma.config.ts` is inside the gate and refused. **Supabase's files are inside too**
  (ADR-0005 d5's note of 2026-10-10): `supabase/**` (the fallback database's start-up SQL, the
  gateway's routes, the CA certificate and `supabase/team-project.md`), and every `compose*.yaml`,
  since the fallback's Auth settings are `GOTRUE_*` variables in `compose.yaml` beside the `api` and
  `proxy` services, which a path cannot tell apart. The buckets' settings are set by the seed's first
  step, so under `prisma/seed/**` they are gated already; a build that puts them anywhere else names
  that file in the gate list. **A PR that moves or renames a gated file updates the gate list, here,
  in `CONTRIBUTING.md`, in the PR template and in `.coderabbit.yaml`, in the same PR, and is gated
  itself.** The application code the seed drives stays round-robin, and so does the code that calls
  Supabase: sign-up and the password change, the file cleanup and the boot check, which `08-files`
  and `12-sign-in` cover.

  > **Updated 2026-10-19** (#43, from the review of PR #193): the buckets' settings are in
  > `src/files/buckets.ts`, not under `prisma/seed/**` as this item expected. The bucket names,
  > their privacy, caps and types, and the bucket step that sets them are in that one file, which
  > the seed's first step, the `api`'s cleanup and the test harness all import. It is inside the
  > gate, and the gate list names it here, in `CONTRIBUTING.md`, in the PR template and in
  > `.coderabbit.yaml`.
- **Kamel reviews; Ahmad deputises when Kamel is blocked more than 24 hours**; Ahmad also watches
  for the stall. The developer authors the migration. **When the gate holder authors a gated PR,
  Ahmad reviews it** — nobody reviews their own PR (§17.4), and Ahmad is already the gate's deputy.

  > **Updated 2026-10-09:** this read *"Fadel watches for the stall"*. Fadel left the team on
  > 2026-10-01, and Ahmad has watched for the stall since (#28; §17.1's note).
- **Rules**: a merged migration is immutable (fix forward): `prisma migrate deploy` matches applied
  migrations by name, so an edited merged migration is skipped silently, exit 0, and the database
  keeps the old version (ADR-0005 d6's correction of 2026-10-10); rebase onto `main` before merging and
  regenerate only your own unmerged migration; `schema.prisma` and its migration are committed
  together; `npx prisma generate` is run explicitly; migrations are named `<slice>_<change>`; the seed
  stays idempotent; generated statements touching the raw objects are removed (§4.4); `prisma` and
  `@prisma/client` stay in the `^7` major; a personal-data change moves the Privacy Policy in the same
  PR.
- **The five Supabase checks of the PR template's gate section** (ADR-0016 d6's note of 2026-10-10):
  no foreign key or SQL into Supabase's `auth` or `storage` schemas; any migration ran only on the
  fallback (`make dev`, `make local`, `make test`), never on the team project before merge; a team
  project setting changed together with `supabase/team-project.md` and, where it names one, the
  matching `GOTRUE_*` line; no new route, port or service exposing the database or a Data API; a
  moved gated file carried into the gate lists.
- **The team project changes outside git**, in its dashboard, where no PR shows it, so
  `supabase/team-project.md` records what is set there. A new setting is a PR changing that record,
  and the matching `GOTRUE_*` line where one exists, before Kamel changes the dashboard and comments
  `Applied in the dashboard on <date>` on the merged PR; the dashboard goes first only to undo a
  breakage, with the PR the same day. **Nobody changes the team project's tables, rows, settings or
  Supabase Auth users by hand**, in the dashboard, its SQL editor or with the `.env`'s keys, except in
  four cases the record lists, each Kamel's: resuming a paused project, `make reset-team`, deleting
  a Supabase Auth user whose id no Student has, and repairing a migration that failed partway.
  Nobody deletes or edits a Student's Supabase Auth user, a Removed Student's included. Migrations
  reach the team project only through `make up` on `main`. Reading is always fine. Before each
  defense Kamel compares the dashboard with the record (§15.7).
- The week-1 infrastructure gate (ADR-0004 d12) and the schema gate are sequential, not concurrent
  (ADR-0005 d3). **One overlap is unavoidable**: the week-1 boot chain (§15.5) needs the Prisma
  scaffolding — `prisma.config.ts`, a `prisma/schema.prisma` with its generator and datasource, and
  the seed entry `prisma/seed/main.ts` — all inside the gate, and Kamel authors it. That PR is
  therefore reviewed by Ahmad under the rule above. It adds no feature table and no migration: those
  arrive with their slices, which is the sense in which week 1 writes no schema.

### 17.3 Records move together

A change to a rule, acceptance criterion, scope, status or resolved question on an ADR, the map or an
issue is synchronized across every surface that exists, in the same task; ADRs are annotated, never
rewritten; the legal pages are corrected in place with a new *Last updated* date (`AGENTS.md`,
`docs/agents/issue-tracker.md`, ADR-0018 d15). **This document is inside that rule**: a correction to a
rule stated here updates the ADR it cites, and an implementation discovery that contradicts this
document is reported, not silently coded around. Record edits posted to the map or an issue before
their PR merges are marked *(uncommitted)*, and get `Landed on main at <sha>` once it merges or a
withdrawn note if it closes unmerged (`CONTRIBUTING.md` → *Records move together*, since 2026-09-27).

### 17.4 Process (ADR-0005 d7–d8)

Trunk-based; branches `<type>/<slice>-<short>` off `main`, short-lived; one PR per slice increment;
squash-merge; Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`); every PR
needs one completed review from another member; round-robin outside the gate. GitHub enforces
squash-only merging and deletes the head branch on merge (since 2026-09-27; ADR-0005 d7's annotation);
review and branch naming remain conventions. Two rulesets guard `main` (since 2026-09-27). One requires
the *No bot or AI text* check (`.github/workflows/no-bot-text.yml`; admins can bypass): no review-bot
summary, `Generated with` line or bot/AI `Co-authored-by:` in the PR title or description, and no
bot-authored commit. The other takes changes only through a squash-merged PR and refuses a direct push,
a force-push or deleting `main`, with no bypass for anyone; it requires no approving review. A merged branch is never reused: a fix is a new PR off `main`, and a bad merge is
undone with a revert (`CONTRIBUTING.md` → *After a merge*). Each ticket is implemented on its own
branch, and its issue shows where the work stands: claimed when work starts, its body edited when the
work changes the ticket, linked and closed by the PR's `Closes #<n>`; it is not commented on after every
push. A rebased work branch is pushed with `--force-with-lease`; `main` is never force-pushed
(`CONTRIBUTING.md` → *Branching*, *Merging*, since 2026-09-27; ADR-0005 d7's annotation). These stay
conventions. The Makefile is never a hiding place for required setup.

### 17.5 README — on the critical path

`README.md` must exist before evaluation with: the subject's first line and the Description,
Instructions (prerequisites: Docker Engine with Compose ≥ 2.24.4; Node 22 for the host Vite process; the
`.env` model; both boot commands; the certificate interstitial; the dev overlay and the verified Vite
bind command with its LAN restriction), Resources and AI usage sections, **Team Information**, **Project
Management**, **Technical Stack** with justifications (the database system's from ADR-0019, through #71), **Database Schema** (§4, or a diagram generated
from the schema), **Features List** with the member(s) behind each, **Modules** with the 20-point
calculation (§1.3), both language Minors included, the browser-limitations section (§16.7), the
credential variables and the demo Student's email. **Owners recorded**: Instructions — Kamel
(ADR-0004 d12); browser limitations — Ahmad (ADR-0016 d9; #72). **No owner is recorded for the
other sections**; `/to-tickets` should surface that as a ticket rather than assume one.

> **Updated 2026-10-09:** this read *"browser limitations — Fadel"*. The section has been Ahmad's
> since Fadel left the team on 2026-10-01 (#72, which covers the pass and that section).

> **Updated 2026-10-27** (#71, at Ahmad's request as Product Owner): the README also holds
> **Individual Contributions** (`document/en.subject.md:1308`), each member's work with the date
> each part merged and the challenges they met, and a **Timeline** under Project Management, each
> milestone with its deadline and the date it was met. The subject requires Individual
> Contributions, which this list had left out. Both are #71's, the ticket for the sections with no
> recorded owner. The same day **Modules** became the 22-point calculation, with the matching engine
> as a Module of choice and its justification (§1.3's note of 2026-10-27).

### 17.6 Settled dates

Week 1 (from 2026-09-18): Kamel's infrastructure gate. Week 2: Fadel ports the fixture and writes the
matcher tests. End of week 4 (2026-10-15): the legal pages signed off by Ahmad, technical claims
verified by Kamel, live. Week 5 (2026-10-16 → 10-22): the browser pass. The 2026-10-02 / 10-05 / 10-22
module-contingency dates are discharged (#7).

> **Updated 2026-10-09:** week 2's owner changed after this was settled. Fadel left the team on
> 2026-10-01, and Ahmad took the fixture port and the matcher tests (#34, #35; §17.1): the port
> landed as `e15d2c0` (#110) and the tests as `ab26e78` (#112).

> **Moved 2026-10-14** (ADR-0018 d14's note of 2026-10-14): Ahmad's sign-off and Kamel's check of
> the technical claims are due **2026-10-25**, a Sunday in week 6. Kamel checks the cookie and 42
> claims against merged code, so the date holds only if Accounts (#36) and Sign in with 42's
> transport and state (#39) merge before it. The pages have been live since 2026-10-11
> (`592bf58`, #38), before the old date. The browser pass keeps week 5.

---

## 18. Build dependencies

Internal ordering `/to-tickets` should encode as blocking edges; product decisions are already made.

> **The move to Supabase** (ADR-0019) changes many of the slices below. [Rewrite the affected build
> tickets for Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/104) rewrites their
> tickets and opens the ones the move adds; `docs/ticket-plan.md` carries notes where its reasoning
> no longer holds. Two build tickets outside the plan have already changed item 1's and item 2's
> merged code: the local Supabase fallback (#121: Compose services, make targets, the boot check's
> steps 1 and 2, CI on `make test`'s copy) and the team project's verified TLS and pool cap (#124).
> #104 rewrote the seventeen open tickets the move changes on 2026-10-14 and opened three: the boot
> check's steps 3 and 4, which let `make up` run on the team project (#155; until it lands, a team
> `.env` stops the boot), the two resets (#156), and recovery through Confirm with 42 (#157).

1. **Infrastructure gate** (Kamel, week 1): Compose files, both Dockerfiles, nginx files, `.env.example`,
   boot command, env validation, `/api/health`, Makefile, `.github/workflows/ci.yml` with §16.4's
   steps 1–5, README Instructions. Gates every slice. The boot command brings the Prisma scaffolding
   into this PR (`prisma.config.ts`, `prisma/schema.prisma` with no feature table, a seed entry that
   only logs completion), so it is a gated PR its gate holder authored: **Ahmad reviews it** (§17.2).
   Its Done has no suite to run yet (§16.8).
   The `Makefile` already on `main` predates this document — no `wipe` or `test` target, and an
   unpinned `seed` (M16) — so this slice rewrites it to §15.6 rather than extending it. Its clean-clone
   check passes on §16.5 step 6's first-PR criteria.
2. **Core** (Unit of Work with retry, `checkpoint` and `afterCommit`; envelope and exception filter;
   guards; logger; `RealtimePublisher` port) and the **test harness** (test DB, in-process app, nginx
   harness, the fallback-only check, the named pause; on the fallback's own Supabase Auth and
   Storage, so after #121). Gate every slice.
3. **Accounts and sessions** (`Student`, `Session`, sign-up, sign-in, sign-out, password change and
   its two sign-outs, throttle, all through Supabase Auth, §5.1) and the **seed skeleton** (catalogue,
   bootstrap accounts through Supabase's admin create, completion record, the guard, the deletions
   and the lock, §14.9), whose PR adds CI step 6 (§16.4). `12-sign-in` lands with Accounts and
   sessions (#36). Gate every signed-in feature. The two resets (§15.6) share the seed's deletion
   function and lock, so they come after the skeleton, in a ticket of their own (#156).
4. **Fixture port + matcher engine + category 1** (Fadel, week 2, independent of the database layer for
   the pure part). If no earlier PR has added a test file, this one adds the first: from it the Done
   box's suite must be green and CI gains step 7 (§16.4, §16.8).

   > **Updated 2026-10-09:** Ahmad built it after Fadel left the team on 2026-10-01 (#34, #35;
   > §17.6's note).
5. **Profiles and Skills** → **Rounds and Matches** (open, accept, decline, hand-made, close without
   Streak) → **Reviews** → **XP, Badges, Streak at close, Leaderboard** → **Learning Analytics**.
6. **Prompts** → **feed and Likes** → **Reports and moderation**.
7. **Socket gateway and Presence** → **Friends** (Presence) → **Direct Messages**; **Blocks** before
   Friends' request rule and before matching's blocked-pair input.
8. **Files** (validation, avatar, Evidence, on Supabase Storage with the bucket step, the order of
   writes and the hourly cleanup, §9.8) after Reviews for Evidence. The avatar slice (#43) comes
   first and builds what both files share: the bucket step, which it puts first in the seed, the
   Storage calls, the cleanup, and the files part of the seed's deletion function.
9. **Users table and sanctions** after Matches (termination) and Reports (auto-action).
10. **Sign in with 42**: transport and state any time after 3; the identity mapping and a
    successful sign-in, the 42 sign-up form, Connect and Disconnect 42, after 3 as well; and
    recovery through Confirm with 42 after the identity mapping, which adds the column it needs
    (§5.6; #157). #24's questions were answered on 2026-10-08, and #24 closed on 2026-10-12.
11. **Legal pages rendering** any time after the SPA shell; sign-off by 2026-10-15.

    > **Moved 2026-10-14:** sign-off by 2026-10-25 (§17.6's note of 2026-10-14).

12. **The full seed** grows with each slice it drives; each seed PR is inside the gate, bumps the
    fixture version and adds its end-state assertions. It reaches ADR-0017's complete end state only
    when 5–9 exist; the first complete deterministic run confirms or corrects the §14.5 targets and
    names the demo Student.
13. **Browser pass** (week 5) after features exist.
14. **French, Arabic and right-to-left** (ADR-0020), whose build tickets [Write the build tickets
    for French, Arabic and right-to-left](https://github.com/ahmadmnsur/ft_transcendence/issues/148)
    opens. **No slice waits for the foundation**: until it creates `web/src/i18n/`, a slice keeps
    its English in one object per area, and whichever of the two merges second moves it (§3.5.5).
    The foundation (the dictionary, the locale table, the switcher, the first visit and
    `<html lang dir>`, §3.5.5, and the two text checks, §3.5.2) moves every such object on `main`
    when it merges, `authCopy` included. The changes to the merged design system and SPA shell
    (§3.5.2, §3.5.3), the scanner in the build, the font, and the chart on Learning Analytics (#60,
    §13.4) follow their own tickets. **The legal translations** come after the foundation and before
    Pre-defense readiness (#73), with Ahmad's sign-off (§3.5.4).

    > **Opened 2026-10-16** by [Write the build tickets for French, Arabic and
    > right-to-left](https://github.com/ahmadmnsur/ft_transcendence/issues/148): the foundation,
    > [Languages foundation: the dictionary, the switcher and the locale
    > table](https://github.com/ahmadmnsur/ft_transcendence/issues/171); the merged code's changes,
    > [Languages: the SPA shell in French and Arabic, right to
    > left](https://github.com/ahmadmnsur/ft_transcendence/issues/172) and [Languages: the design
    > system in French and Arabic, right to left](https://github.com/ahmadmnsur/ft_transcendence/issues/173),
    > each after the foundation, whichever merges second turning the scanner on in the build, and the
    > font with the design system's; and [Languages: the Privacy Policy and the Terms in French and
    > Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/174), after the foundation, the
    > SPA shell's changes, which make the legal renderer's classes flow-relative, and the English
    > sign-off (#69). The chart is #60's. The browser pass (#72) waits on the two merged-code tickets,
    > since its Arabic pass checks them, and the README (#71) on the design system's changes and the
    > legal translations, since its *Modules* claims both Minors.

> **Sequenced on review of the ticket plan, 2026-09-24** (`docs/ticket-plan.md`; issues #29–#73; *uncommitted*). No
> rule moves. Four orderings this list left open are fixed:
>
> - **Item 4's fixture port comes before item 3's seed skeleton.** The catalogue the skeleton
>   inserts is the fixture module's `SKILLS` plus `RARE_SKILLS` (ADR-0017 d8), so the seed-skeleton
>   PR (#37) is blocked by the fixture-port PR (#34). The port is a pure copy and needs item 1 only. The pure
>   matcher engine (#35) needs item 1 and the port only.
> - **Item 4's category 1 is the engine part.** Category 1's seam is *pure engine + services + DB*
>   (§16.3). Week 2 ships the engine-level assertions. The service and DB assertions land with the
>   slices that create their seams — Rounds and Matches (#48), hand-made Matches (#49), Reviews
>   (#52), and Suspension/Removal (#66) — and ADR-0016 d10 is annotated to match.
> - **`Post` gets its own gated PR (#51), after Rounds and before item 5's Reviews and item 6's
>   Prompts.** `Post` references `ReflectionPrompt`, `Review` and `Round`, and §4.4 writes
>   `post_exactly_one_origin` in the migration that creates the table. So one migration creates
>   `ReflectionPrompt`, `Review` and `Post`, with no behaviour, and Reviews and Prompts stay parallel.
>   That migration creates the three tables one PR ahead of the slices that write them: the one
>   exception to §17.2's *"those arrive with their slices"*. Prompts also waits on Rounds, for the
>   `answer_round_id` foreign key (§4.3.16).
> - **Item 9 splits by its own two reasons.** The Users table and roles (#65) follow Matches, and the
>   hand-made, XP and Leaderboard slices whose cases their tests carry. Only the sanctions (#66) follow
>   Reports, for Remove Student's auto-action (§12.7).

---

## 19. Implementation constraints and invariants

Rules every ticket inherits; a PR breaking one is not done.

1. No GET writes a domain row, except lazy session renewal and the 42 callback, which writes only a
   found Student's session or a Connect 42 link (§5.4).
2. One cookie, `pc_session`; no JWT, except the token a password check through Supabase Auth returns,
   which lives only inside that request on the server (§5.1); no token, Student data or OAuth state
   in web storage.
3. No page loads a subresource from another origin: no CDN, web font, analytics or hotlinked image.
   The only cross-origin browser traffic is the top-level navigation to and from 42's authorize page
   when a Student chooses Sign in with 42, Connect 42 or Confirm with 42 (§3.1). The browser never
   talks to Supabase: no `@supabase/*` package in `web/`, no `VITE_SUPABASE_*` variable.
4. Every domain write goes through the Unit of Work at `SERIALIZABLE`, reading inside the transaction
   everything its decision depends on; no network call inside a transaction, a call to Supabase
   included.
5. Every DB-derived socket event and every forced disconnect runs after commit.
6. Nothing a client sends over the socket performs a privileged action; `dm:send` is the only client
   event.

   > **2026-11-01 ([#249](https://github.com/ahmadmnsur/ft_transcendence/issues/249); §7.3's note)** *(uncommitted)*, **landed on `main` at `4cc1717`**:
   > `dm:send` and `dm:typing` are the only client events, and `dm:send` is the only one that writes.
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
15. No Admin sets or resets a password or touches `forty_two_id`; no application route shows a Direct
    Message to anyone but its two participants.
16. A 42 login resolves to a Student only through `Student.forty_two_id`, 42's account `id`, never
    through `Student.email`; only that number is kept from 42, and its login and email only as a
    Student submits them on the 42 sign-up form.
17. A Removed row is view-only; Suspension and Removal delete every session and drop every socket.
18. Only `Student` and `Post` are soft-deleted; every read of them applies §4.6's surface rule.
19. No log contains a password, cookie, request body, message text, file contents, query string, OAuth
    `code`/`state`, search term, Supabase key or token (§3.9); no route carries a search term in its
    path; the team project's `postgres` role keeps its four log settings.
20. Refusals reachable in normal use return 200 with `ok: false`; the console stays clean.
21. The seed writes directly only the catalogue and the two bootstrap accounts, through Supabase's
    admin create (§14.1); everything else goes through the application's own service methods. It
    deletes only in a run that writes, after its guard (§14.9).
22. No entity, column, enum value or index beyond §4 without a gated migration and the records moving
    with it; `schema.prisma` is one file; `prisma.config.ts` is the only Config and every CLI call pins
    it; no foreign key or SQL into Supabase's `auth` or `storage`, and no row-level security.
23. Six Compose services, the fallback's four loading `.env.example` alone; of the targets that start
    a stack only `make up` reads `.env`; the boot never falls back by itself; the Makefile hides no
    required setup; both boot paths work from a fresh clone and an empty database.
24. A change to stored personal data, its visibility or retention updates the Privacy Policy in the same
    PR; a change to `ReportReason` updates the Terms.
25. Tests are added only for what fails silently, inside the twelve categories.
26. Supabase is three stores and nothing more: Postgres, Storage and Auth as the place each password
    is kept (ADR-0019 d1). Only the `api` calls Supabase, and only the `api` uses the team project's
    secret key, which is never committed or sent to the browser.
27. Every file byte goes through NestJS's routes; no public bucket, no signed link; a file is written
    before its row and deleted after it (§9.8).
28. In use, only sign-up and a password change write to Supabase Auth; nobody deletes a Student's
    Supabase Auth user outside a reset or the seed's guarded run (§5.1).
29. Branch work that changes the database never runs on the team project; the team project changes
    only through `supabase/team-project.md` and Kamel's four changes by hand (§17.2).
30. The team `.env` is never committed and never handed to an evaluator (§15.4).
31. Every text the SPA shows, or gives to a screen reader, comes from the dictionary in English,
    French and Arabic, or from the legal Markdown files; until the foundation creates
    `web/src/i18n/`, from one English object per area shaped like the dictionary
    (`CONTRIBUTING.md` → *Before the foundation*). Nothing is joined or typed in code, and every
    form sets `noValidate` (§3.5.2, §3.5.5).
32. The SPA writes flow-relative classes, with `rtl:`/`ltr:` only where none exists (§3.5.2). The
    15 physical uses on `main` change with their build tickets, and once the scanner runs in the
    build, the build fails on a left or right class.

---

## 20. `/to-tickets` readiness checklist

- [x] Claimed modules and points fixed, each bullet mapped to a section (§1.3).
- [x] Every ADR rule consumed and traceable (§2.1); every delegated mechanism chosen (§2.2); every
      contradiction found resolved or reported (§2.3).
- [x] Stack, repository layout, module boundaries and frontend routes fixed (§3).
- [x] All nineteen tables with columns, keys, indexes, FKs, delete behaviour and the DB / service /
      serialization split (§4).
- [x] Authentication, sessions, CSRF, throttle, authorization matrix; OAuth mechanism specified and
      its #24-owned parts marked Blocked (§5) until 2026-10-13.
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
      contention case asserted two Posts and +40 XP, which no serial order consistent with its two held
      reads admits under M1. §10.4
      now explains why two *valid* events for one Student never contend for one Badge (reproduced on
      PostgreSQL 17.11), and §16.3 asserts the outcome that schedule actually has. **Mechanisms:**
      the `dist/` layout, `nest-cli.json`'s `entryFile` and the seed's asset path (§3.2); where the
      `starvation` cohort lives (§14.2); CI's Postgres credentials (§16.4); the fields of the
      Admin's Student detail (§6.12). **Records moved with them:** ADR-0016 d1 and d7 (that
      correction, plus the categories 8 and 10 cases above); a pointer on ADR-0010 d2;
      `CONTRIBUTING.md` → *Testing* item 9; map #1; comments on #25 and #17. Each is *uncommitted*
      until this lands on `main`.
- [x] **Records follow-up, 2026-09-24.** No rule changed. **Wording**: category 9 and the third
      entry above now name which serial orders are excluded (those consistent with both held reads);
      §10.4 states when its argument must be re-run; M4 is marked a backstop; §17.1 cites where its
      extra roles come from. **Mechanism**: §3.2 pins `rootDir`. **Records moved**: pointers on
      ADR-0007 d6 and ADR-0014 d7, the same as ADR-0010 d2's (they carry the same contention
      requirement), with matching comments on their owning tickets #11 and #10 and the map #1 note
      extended; `CONTRIBUTING.md` → *Schema changes* (raw objects in generated migrations),
      *Testing* (how the suite runs; items 2, 8 and 10), *The clean-clone check* (`make wipe` and
      the pass criteria), *Environment* (Compose ≥ 2.24.4). ADR-0011's second-pass annotations keep
      their 2026-09-23 date, the date #14, #20 and the map record. Each is *uncommitted* until this
      lands on `main`.
- [x] **Landed on `main`, 2026-09-24.** The second and third verification passes above landed at
      `3e61133`, the records follow-up at `8562a95`. Every *uncommitted* marker in those three
      entries — and on map #1 and in the issue comments they cite (#6, #10, #11, #14, #17, #20, #25)
      — is on `main`; map #1 records the same.
- [x] **Fourth pre-`/to-tickets` verification, 2026-09-24** (an independent adversarial review, each
      finding re-verified against the records before any change). **Rule-level:** none — every
      correction makes a mechanism satisfy a settled rule. **Mechanisms corrected:** the seed clears a
      stale completion record before its first write, so a failed re-run after a schema reset can no
      longer be read as complete (§14.9; ADR-0017 d10's contract); what a completion record certifies
      while the seed is still being built, and which clean-clone pass criteria bind before the full
      fixture exists, so the first infrastructure PR has a satisfiable Done (§14.9, §16.5 step 6,
      §18 item 1); one `{Skill}` value for all four seed Review sentences, ordered by name, with the
      empty-FORWARD fallback both hand-made repairs need (§14.5); `GET /api/matches/:id` is the
      pair's only, and Admins read — and the hand-made Match returns — the new `AdminMatchView`
      (§6.6, §6.13, §8.6, §9.3); no profile response carries an email, as §4.6 and ADR-0018 d4 rule
      (§6.2); an empty search `q` is no filter rather than `validation_failed` (§6.0.3); the
      pre-spec `Makefile` is replaced, not extended (§18 item 1). **Checked and left unchanged:**
      the seed's per-Round targets — a replay of §14.3–§14.8 over the fixture gives 15 matcher
      Matches in each Round and exactly 62 = 46 / 8 / 6 / 2 (74 %), with *S*, *R* and the demo
      Student all found; a proposed `Report.resolution_batch_id`, rejected: two resolutions of one
      target by one Admin sharing a millisecond need three serialized transactions inside it, and
      the only effect would be a merged audit row. **Records moved:** ADR-0017 d10 and ADR-0004 d11
      annotated; `CONTRIBUTING.md` → *The clean-clone check*; the Privacy Policy (a sign-in session
      records its expiry, not when it was made); map #1 (this pass, the landed waves above, and #26
      moved from *Open* to *Decisions so far*, which its resolution comment had claimed); #6, #13,
      #25, #26 and #27 commented. Each is *uncommitted* until this lands on `main`.
- [x] **Recheck of the fourth verification, 2026-09-24** (a second independent review of the
      corrected record). Eight of its fixes held. **Two were incomplete and are completed:** the PR
      template gains the clean-clone box §16.5 step 6 refers to, where a PR lists the criteria it
      checked, with ADR-0016 d5 annotated to match; and the Privacy Policy's two HTTPS claims now
      name the one exception, a developer's local build served over plain HTTP to the same computer
      (ADR-0004 d5). **One record caught up with a settled rule:** `CONTEXT.md` → *Report* says a
      Removal closes every open Report about the removed Student, one the removing Admin filed
      included (ADR-0011 d10, §12.7). **Checked and left unchanged:** an established socket outliving
      its session's 30-day expiry — ADR-0003 rejected re-validating the session on every socket
      event, §5.8 records the consequence, and every revocation (logout, password change, Suspension,
      Removal) still drops the socket at once; the Privacy Policy's *"other records also carry the
      time they were made"*, which covers the records about a Student listed above it — the Skill
      catalogue is not one, and a Match's covered Skills belong to the Match record, which is timed.
      **Records moved:** the PR template, ADR-0016 d5, `CONTEXT.md`, the Privacy Policy; map #1; #13
      and #25 commented. Each is *uncommitted* until this lands on `main`.
- [x] **What staging the pass line exposed, 2026-09-24.** Three things the first PRs could not
      meet. **Mechanisms:** the Done box's suite binds from the first test file, not before, because
      `npx vitest run` exits 1 with nothing to run, and `passWithNoTests` is never the answer
      (§16.8); `ci.yml` is placed in §18 item 1 and grows by steps, step 6 arriving with the seed's
      completion record and step 7 with the first test file, and step 5 seeds the fixture at its
      current version (§16.4, §18 items 1, 3, 4). **Rule-level (review):** the week-1 boot chain puts
      Kamel's own PR inside the schema gate — `prisma.config.ts`, a `schema.prisma` with no feature
      table, the seed entry — so **when the gate holder authors a gated PR, Ahmad reviews it**, and
      ADR-0005 d3's "in week 1 nobody writes schema" is read as feature schema (§17.2, §18 item 1).
      **Records moved:** ADR-0005 d3 and ADR-0016 d6 and d8 annotated; `CONTRIBUTING.md` (*Review*,
      *Done*); the PR template (the suite box, and the gate box's reviewer); map #1; #8, #25 and #28
      commented. Each is *uncommitted* until this lands on `main`.
- [x] **Sequenced on review of the ticket plan, 2026-09-24.** No rule moves. Four orderings §18
      left open are fixed:
      - the fixture port precedes the seed skeleton, because the catalogue is the fixture's Skill
        lists (ADR-0017 d8);
      - category 1's week-2 part is its engine part, and its service and DB assertions land with
        Rounds and Matches, hand-made Matches, Reviews, and Suspension/Removal;
      - `Post` gets its own gated PR after Rounds, so §4.4's CHECK sits in the creating migration
        and Reviews and Prompts stay parallel;
      - §18 item 9 splits by its own reasons: the Users table and roles follow Matches, and only
        the sanctions follow Reports.

      **Records moved:** the §18 note; ADR-0016 d10 annotated; #25 commented; map #1 noted. Each
      is *uncommitted* until this lands on `main`. The §18 note and the ADR-0016 d10 annotation
      cite `docs/ticket-plan.md`, which is committed on publication, and they name the issues of
      the tickets they describe (#29–#73).
- [x] **The ticket plan's readiness review, 2026-09-25.** No rule moves. Three corrections:
      - The legal-page sign-off is blocked by #24, because ADR-0018 *Consequences* makes it wait on
        #24's field. Remaining Dependencies 1 is annotated. The sign-off's 2026-10-15 date is
        unchanged.
      - Category 1's C6 across fresh databases sits with Reviews, and the Reviews ticket's six-Round
        run asserts all of §16.3's C3, C4, C6 and C7.
      - A hand-made Match refusing a blocked pair sits with hand-made Matches.

      **Records moved:** ADR-0016 d10 annotated to match; a correction and an addendum on #25;
      Remaining Dependencies 1 annotated. Each is *uncommitted* until this lands on `main`.
- [x] **Tickets published, 2026-09-25.** The 45 tickets of `docs/ticket-plan.md` are GitHub issues
      #29–#73, in dependency order (T01 is #29, T45 is #73).
      - Each is a sub-issue of map #1, labelled `ticket`.
      - Each has a native blocked-by edge for every edge in the plan, plus #24 on the legal sign-off
        (#69) and the identity-mapping ticket (#70).
      - Only the owners the records name are assigned: Kamel on #29; Fadel on #34, #35 and #72;
        Ahmad and Kamel on #69.
      - The plan is committed with the records.

      **Records moved:** the §18 note and the ADR-0016 d10 annotation name the issues; map #1
      noted. Each is *uncommitted* until this lands on `main`.
- [x] **Brought to the move to Supabase, 2026-10-13** ([Update the spec and the legal pages for
      Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/103)). Every section the move
      changed is corrected in place to [ADR-0019](adr/0019-supabase-hosts-the-data-and-peerconnect-keeps-the-rest.md)
      and the ADR notes it names, each rule citing its note; `main` at `62eb070` holds the text
      before. **Mechanisms chosen here**, where the records left the name or the detail to this
      document: Sign in with 42's routes, intents and outcomes (M35), sign-in's refusal codes (M36),
      the throttle's count of a wrong current password (M37), the named pause's name (§3.6.4), and
      `fortyTwoConnected` on `GET /api/me` (§6.2). The #24-owned parts of §5.6 are specified, and
      §5.6 B is no longer Blocked. `CONTRIBUTING.md` → *Testing* and `docs/ticket-plan.md` moved with
      it; the legal pages had already moved on [docs: record what the Privacy Policy and Terms say
      about Supabase](https://github.com/ahmadmnsur/ft_transcendence/pull/138).
- [ ] External decisions below — they block only the tickets that name them.

---

### Remaining Dependencies / External Decisions

Only items owned elsewhere. Nothing that `/to-spec #1` was responsible for choosing is left here.

1. **[#24 — Settle how a 42 identity maps to a Student](https://github.com/ahmadmnsur/ft_transcendence/issues/24)
   (closed 2026-10-12).** Its questions were answered on 2026-10-08 by [Settle how a 42 login finds
   its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93), and §5.6 now
   specifies each answer: 42's account `id` in `Student.forty_two_id`; a first 42 login gets a
   sign-up form whose own JSON request creates the Student, with a password and the Terms checkbox;
   Connect 42 and Disconnect 42 with the current password; nothing becomes nullable but
   `forty_two_id`; recovery through Confirm with 42, which the Terms now state; the Privacy Policy's 42
   sentence, worded on [docs: record what the Privacy Policy and Terms say about
   Supabase](https://github.com/ahmadmnsur/ft_transcendence/pull/138); and one team application,
   registered by Kamel on 2026-10-07. It blocks neither a build ticket nor the legal-page sign-off
   (#69) any more.

2. **The residue of [#26](https://github.com/ahmadmnsur/ft_transcendence/issues/26)** (closed, a fact not
   a decision): whether 42 accepts plain `http://localhost:8081/api/auth/42/callback` as a registered
   redirect URI. **It no longer matters**: `make dev` reads `.env.example` alone, so 42 is off on the
   dev overlay, and a branch that needs a real 42 sign-in runs `make up` on the base path (§5.6;
   ADR-0004 amendment's note of 2026-10-08).
3. **Legal-page sign-off inputs** (ADR-0018 Consequences): Kamel's and Hussein's **42 logins** and
   #24's field, both in since 2026-10-11 and 2026-10-12. Ahmad signs off and Kamel verifies the
   technical claims by **2026-10-15**.

   > **Updated 2026-10-09:** this read *"Kamel's and Fadel's"*. Fadel left the team on 2026-10-01,
   > and Hussein Dakdouk joined on 2026-10-04 (§17.1).

   > **Logins recorded 2026-10-11:** Kamel's 42 login is `kabbas` and Hussein's is `hdakdouk`, and
   > both legal pages carry them, so the logins no longer hold up sign-off.

   > **Moved 2026-10-14:** the sign-off and Kamel's check are due **2026-10-25** (§17.6's note of
   > 2026-10-14).
4. **[#16 — a commit from every member](https://github.com/ahmadmnsur/ft_transcendence/issues/16)
   (met)**: `en.subject.md:306`–`:312` is a rejection criterion. Every member has a commit on
   `main`, and the root `.mailmap` gives each of them one name in the author list.

   > **Met 2026-10-09:** this read *"#16 — commits from Kamel and Fadel (open):
   > `en.subject.md:306`–`:312` is a rejection criterion until each has landed a commit"*. Kamel's
   > first is `77bef58` (#81), Fadel left on 2026-10-01 without one, and Hussein, who joined on
   > 2026-10-04, landed `5d58d3c` (#127). #16 closes with the `.mailmap`.
5. **[#28 — repository governance](https://github.com/ahmadmnsur/ft_transcendence/issues/28) (open)**:
   `CODEOWNERS` (which must map `/prisma/`, `/prisma.config*`, `/prisma7.config*` and
   `/.config/prisma*`, §3.2 — the seed and reset paths sit inside `prisma/**` — and `/supabase/` and
   every `compose*.yaml`, §17.2); squashing migrations before
   defense; long-lived branches; and whether to enforce reviews and make CI a required check
   (ADR-0005 d7, ADR-0016 *Not settled*). A PR into `main` has been required since 2026-09-27.
6. **The demo script's running order** (ADR-0017 *Not settled*): a rehearsal question for whoever
   presents. The demo Student's identity is not a decision; §14.8 selects it deterministically and the
   first run records it.
7. **How the evaluation shows both language Minors** (ADR-0020 *Not settled*): which accounts, which
   screens, and when the language is switched. It is [map #139](https://github.com/ahmadmnsur/ft_transcendence/issues/139)'s
   *Not yet specified* item, and Pre-defense readiness (#73) is its likely home.

   > **Moved 2026-10-16** to Pre-defense readiness (#73), its criterion 10, by [Write the build
   > tickets for French, Arabic and right-to-left](https://github.com/ahmadmnsur/ft_transcendence/issues/148):
   > it is settled and rehearsed there.
