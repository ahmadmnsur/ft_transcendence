# The legal pages describe the model as built, and bind it

> **Under revision 2026-09-30: PeerConnect's data moves to a shared Supabase project.**
> The team settled on 2026-09-30 that Supabase provides PeerConnect's database, file storage and
> login, with Socket.IO kept ([Map: PeerConnect moves to Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/85)).
> That changes what the pages say about there being no central server, data "stored in that
> copy's own database, on that computer", backups, and the one cookie.
> [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100) settles the new text,
> before the sign-off on 2026-10-15; decision 15 keeps the pages moving with the model.
> The text below is kept as written; [Write the Supabase ADR and annotate the ADRs it changes](https://github.com/ahmadmnsur/ft_transcendence/issues/102) records what the move changes.

> **The one cookie stays, 2026-09-30.** [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91)
> keeps PeerConnect's own session: the one cookie is still `pc_session`, set by PeerConnect's
> server (decision 5), and the browser never talks to Supabase. Decision 5's one exception is still
> Sign in with 42; whether that sign-in passes through Supabase's address is for
> [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93). What the pages say about Supabase is still for
> [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100) to settle.

> **Answered 2026-10-08 by [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93): it does not.** NestJS runs Sign in
> with 42, and the browser goes only to 42's pages and back (decision 5's note). Decisions 7, 8 and
> 12 carry notes on the field kept, recovery through 42 and the 42 sign-up form.

> **Settled 2026-10-11 by [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100).** Both
> pages are corrected in place, with their *Last updated* dates (decision 15). They now name two
> kinds of copy, the team's copy, kept by Supabase in Frankfurt, and a local copy, kept on the
> computer that started it, and state each one's facts in the section that covers them. Decisions
> 1, 3, 5, 6, 7, 8 and 13 carry the notes.

`document/en.subject.md:320` requires a **Privacy Policy** and **Terms of Service** "with relevant
content"; `:323`-`:330` require them to be easily accessible from the application, to contain content
appropriate to *this* project, and not to be placeholder or empty pages; `:336` makes missing or
inadequate pages grounds for **project rejection**. It is the only mandatory item on the map that can
fail the project on its text alone, and it earns **zero module points**. ADR-0004 settled where the
pages live — SPA routes behind footer links — and left what they say open. ADR-0014 then made itself
the exhaustive list of personal data the platform holds, which is what a Privacy Policy has to
describe.

Writing the pages turned out to be mostly a matter of reading the model back to the people it
describes — and in six places the model had never said something a policy has to say: what a profile
shows, who sees an email address, whether anything is logged, what arrives from 42, how a Student
leaves, and whether anything can be read before signing up. Those are ruled here.

The shape we chose: **the pages promise exactly what the model does, including what it refuses to
do — and wherever the build could quietly break a promise, the promise becomes a rule the build
inherits.** A generic policy is what `:330` rejects; an inaccurate one is the same failure in a
different form.

Settled with Ahmad, the Product Owner and the ticket's named owner, on
[Settle the Privacy Policy and Terms of Service content](https://github.com/ahmadmnsur/ft_transcendence/issues/13).
The draft texts are [`docs/legal/privacy-policy.md`](../legal/privacy-policy.md) and
[`docs/legal/terms-of-service.md`](../legal/terms-of-service.md).

## What this ADR changes in earlier records

- **ADR-0004's *Not settled* item is settled, and "SPA routes behind footer links" is sharpened
  rather than changed**: sign-in, sign-up and the two pages are the **only routes readable signed
  out**, and the footer shows on every screen (decision 12). Every service's container log gains a
  **size cap with rotation** in Compose (decision 6). ADR-0004 is extended, not amended.
- **ADR-0003 is extended three times.** Decision 1's session cookie becomes the product's **only**
  cookie (decision 5). Decision 10's sign-in throttle keeps its counts **in memory only**
  (decision 6). Decision 11's missing password reset gains its other half: **no Admin may set or
  reset a Student's password** (decision 8).
- **ADR-0008 decision 8's list of Admin-editable fields leaves out the password, and the omission is
  now deliberate** (decision 8). **Admins are labelled as Admins** wherever other Students see them,
  and the Peer Moderator role is not shown (decision 4). Its considered-options sentence *"nothing in
  PeerConnect currently sits behind no login"* gains four exceptions, none of them holding Student
  data; the guest-role reasoning it supports is unaffected. Removal itself is unchanged and stays
  Admin-only — a Student reaches it **on request** (decision 3).
- **ADR-0011 decision 4's reason list is now also the Terms' conduct list** (decision 9), so changing
  one changes the other.
- **ADR-0005 decision 5's schema gate and ADR-0016 decision 6's Done list each gain one check**: a
  change to personal data moves the Privacy Policy in the same PR (decision 15).
- **ADR-0014's consequence about `#13` is discharged.** The Privacy Policy restates its entity set in
  plain language, and moves with it.
- **[Settle how a 42 identity maps to a Student](https://github.com/ahmadmnsur/ft_transcendence/issues/24)**,
  still open, inherits three constraints (decisions 7 and 12). It has no ADR yet, so they are
  recorded on the ticket.

## The decisions

1. **The pages speak in the product's voice, with one honest section on who runs a copy.**
   PeerConnect has no deployed environment (ADR-0004): each copy runs on the machine where someone
   started it, and its data lives in that machine's Postgres volume. Writing the pages as though a 42
   campus ran the platform would be false and would speak for a real organisation; writing them as a
   school project throughout is how a page comes to read as a placeholder. So every data practice is
   stated in the ordinary voice of the product, and one short section — *Who runs PeerConnect* — says
   the rest: a student project by Ahmad, Kamel and Fadel, listed by 42 login; not run or endorsed by
   42; each copy run by whoever started it, its data on that machine, its Admins that copy's staff
   accounts; a fresh copy holding only the fictional Students ADR-0017 seeds.

   > **Under revision 2026-09-30** (see the note at the top): with a shared Supabase project, a copy's data may
   > no longer live only on the machine that runs it. [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100) settles what this section says.

   > **Wording corrected 2026-09-23.** *"Only the fictional Students ADR-0017 seeds"* reads as
   > though a fresh copy had no staff accounts. **A fresh copy contains only seeded demo accounts
   > and no real user data**: ADR-0017's thirty Students plus the bootstrap Admin and Peer
   > Moderator (ADR-0004 d11, ADR-0008 d12). Those two are Student records holding a role, like
   > every account (ADR-0008 d1).

   > **Roster updated 2026-10-09.** Fadel left the team on 2026-10-01 and Hussein Dakdouk joined on
   > 2026-10-04, so the section names Ahmad, Kamel and Hussein. The Privacy Policy reads so since
   > 2026-10-09.

   > **Two kinds of copy, 2026-10-11 by [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100).**
   > "There is no central PeerConnect server" and "stored in that copy's own database, on that
   > computer" are gone. **The team's copy**, run by the three authors, keeps its database, its
   > files and the passwords that sign in to it with Supabase, in Frankfurt, Germany; a team member
   > runs the program on their own computer. **A local copy**, which PeerConnect makes when it
   > starts without the team's settings, keeps everything on that computer (ADR-0004 d1's note of
   > 2026-10-03). The responsibility sentence stands, and for the team's copy it is the authors'.
   >
   > - **Supabase is named** as storing the team's copy for the team and using it for nothing
   >   else; its Data Processing Addendum, part of its terms on every plan, makes it the team's
   >   processor. The pages say its backups, logs and the companies it uses may be outside
   >   Frankfurt, link nothing, and still name no law (decision 2).
   > - **Each copy's facts sit in the section that covers them**: who can open it directly,
   >   encryption, backups, emptying it, logs (decision 6's note) and, in the Terms, availability
   >   (decision 13's note).
   > - **Only the team, and Supabase as its host, can open the team's copy directly**: Kamel and
   >   Ahmad through the dashboard, or anyone holding the team `.env`, which the team gives to no
   >   one, an evaluator included. That changes ADR-0004 d9's note of 2026-10-03, which handed the
   >   `.env` to each evaluator (its note of 2026-10-11).

2. **No law is named and no compliance is claimed.** A GDPR-shaped policy — a controller, lawful
   bases, the eight rights — would name a controller that does not exist and promise what this model
   withholds by design: erasure (ADR-0008 d6-d7), export (never built; the GDPR Minor at `:915` was
   never claimed), and a view of the Reports about oneself (none exists, ADR-0011 d7). Instead the
   pages describe what the software does, and one sentence places the rest where it belongs:
   **whoever runs a copy is responsible for the data it holds and for any data-protection law that
   applies to them, which may give people rights beyond what the pages describe.** That keeps the
   list of in-app choices from reading as the whole of anyone's rights.

3. **A Student leaves by asking an Admin, who performs an ordinary Removal. There is no self-service
   deletion, and the pages say Removal is not erasure.** ADR-0008 already has the mechanism; what no
   record said was how a Student reaches it. A "Remove my account" button was the alternative — one
   endpoint, one dialog, one test — and it loses on ADR-0008 decision 7's burned email: with
   institutional addresses, one mis-click would lock a student out of PeerConnect for good, and an
   Admin is the natural confirmation step for a final act. A Student who only wants to stop can
   already remove their Skills, which takes them out of the candidate pool (ADR-0008 d2), and sign
   out; Removal itself deletes only the sessions and the avatar, and everything else stays. The pages
   state exactly what it keeps and deletes, from ADR-0008 d6-d7, ADR-0009 d6, ADR-0011 d10's Removal
   note, ADR-0013 d8 and ADR-0014 d6.

   > **Two more things kept, 2026-10-11 by [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100).**
   > The Privacy Policy's Removal list gains the password's hash, kept by Supabase Auth so that a
   > password sign-in says the account was removed only after the right password (ADR-0008 d7's
   > note of 2026-10-02), and the 42 account number, so that 42 account can never make a new Student
   > (ADR-0008 d7's note of 2026-10-08). Sign in with 42 says the account was removed too, once 42
   > confirms the connected account.

4. **Who sees what is ruled here wherever no record had ruled it.** The recorded rows stand as their
   ADRs set them. The new rows:

   | Data | Who can see it |
   | --- | --- |
   | A profile: display name, avatar, Skills, Learning Goal and its sentence, XP, Level, Streak, Badges, the Student's Posts | every signed-in Student |
   | Who liked a Post (ADR-0014 d5 left the audience open) | every signed-in Student |
   | Email | the Student and Admins — never on a profile or in search |
   | A friends list | its owner only |
   | Match history | the pair and Admins. No profile lists a Student's Matches, and a Takeaway Post never names the Mentor |
   | A Block | the Student who set it. The other Student is not told; Admins do not see Blocks, though a hand-made Match across one is refused (ADR-0006 d10) |
   | The read state of a Direct Message | its recipient only, as their unread count. **No read receipt** is ever shown to the sender |
   | Role | Admins carry a visible Admin label; the Peer Moderator role is not shown to other Students |
   | Signed out | nothing but sign-in, sign-up and the two pages |

   **Match history is the row with product weight.** The proposal's `:55` puts "a running record of
   students helped and students learned from" on the profile, but that is the Learning Progress view,
   Version 2 at `:233` — and naming the Mentor on a Takeaway Post would make every pairing public
   through the feed. **The Admin label exists so decision 3 is actionable**: "ask an Admin" is
   useless inside the app if nothing says who the Admins are. **The Peer Moderator role stays
   unlabelled** because it is a queue permission, not a status, and advertising it invites exactly
   the pressure from friends that ADR-0011 decision 8 left open and answered with attribution. **No
   read receipts** follows ADR-0014 decision 6's own note that read state "belongs to the other
   participant".

5. **One cookie, and the browser fetches nothing from anyone else.** ADR-0003 decision 1's session
   cookie is the only cookie. Any other browser storage holds interface preferences only, never
   information about a Student. **No analytics, no advertising, and nothing loaded from another
   server**: fonts, icons and scripts are bundled; no link previews; no hotlinked images — no
   Gravatar, no 42 photo. The browser talks to PeerConnect alone, **except when a Student chooses
   Sign in with 42**. The pages explain the absence of a cookie banner **as a consequence of this
   design** — one cookie, needed to sign in — never as a claim about privacy law in general.

   > **Carried through Sign in with 42, 2026-09-23 before `/to-spec #1`.** ADR-0003 d10's
   > annotation makes a one-time `state` mandatory on the 42 callback, bound to the initiating
   > browser. That binding uses **this same cookie**: no second cookie, and no web storage.
   >
   > - **Before a session exists**, the single HttpOnly cookie temporarily identifies the
   >   pre-authentication attempt, whose `state` is kept server-side.
   > - **After a successful callback**, it is replaced by a newly issued opaque session id. The
   >   attempt identifier never becomes the session id.
   > - **If a session already exists**, the attempt is bound through that session instead, and
   >   the session id is not displaced.
   >
   > So the cookie holds either a session id or, when no session exists, one attempt identifier:
   > still one cookie, still needed to sign in. `/to-spec #1` chooses how the attempt identifier
   > is represented in the cookie, where its server-side state lives, its expiry and single-use
   > behaviour, and the callback's verification order.

   > **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §5.2, §5.6; M6 to M8): the
   > cookie is `pc_session=s.<token>` for a session and `a.<token>` for an attempt; the attempt's
   > `state`, PKCE verifier and intent live in an in-memory store for 10 minutes, one live attempt
   > per browser (a new start deletes the one its cookie names), taken on first use; the callback
   > checks cookie, attempt, expiry and `state` before exchanging the code, and only then issues a
   > new session id. The Privacy Policy's cookie paragraph names the attempt identifier.

   > **Still the one exception, 2026-10-08 by [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93).** NestJS runs
   > Sign in with 42 itself. The browser goes to 42's own pages and back to PeerConnect, never to
   > Supabase's address. Connect 42 and Confirm with 42 make the same trip, under the same cookie.

   > **The cookie paragraph stays true, 2026-10-11 by [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100).**
   > The note *The one cookie stays, 2026-09-30* at the top kept `pc_session`; this says the page's
   > paragraph is unchanged too. It is still one random session identifier, sent only to PeerConnect
   > over HTTPS, unreadable by page scripts, ending after 30 days without use or at sign-out, and the
   > attempt identifier for at most ten minutes during a Sign in with 42. Connect 42 and Confirm with
   > 42 run signed in, so they bind through the session (the note of 2026-09-23 above) and change
   > nothing the paragraph says. The pages' one exception now names all three trips to 42, in *In
   > short* and *Other websites and services*, and *Other websites and services* adds that the
   > browser never contacts Supabase.

6. **Logs are disclosed, kept clean and capped, and the sign-in throttle lives in memory.** nginx
   logs every request by default and Docker keeps that output on the host; saying nothing would be an
   omission an evaluator catches with `docker compose logs`. The pages disclose the request log in
   nginx's standard fields — time, network address, method and path, status, response size, referring
   page, browser type — and bind the rule that **no log ever contains a password, a cookie, a request
   body, message text or file contents**. Never logging a request body is what keeps passwords out of
   logs, so the rule is worth having for its own sake. **Every service's container log is capped with
   rotation in Compose**, so the pages can say old entries are overwritten automatically; the numbers
   are engineering defaults for `/to-spec`. **ADR-0003 decision 10's throttle counts live in memory
   only** and are never persisted.

   > **"Path" means without the query string, 2026-09-23 before `/to-spec #1`.** nginx's default
   > request field is the whole request line, query string included. That would log the 42
   > callback's `code` and `state` and any search terms, none of which "method and path" discloses.
   > The referring page has the same problem: within one site, browsers send it in full, query
   > string included, so every request made from a page whose address carries a search or a
   > callback's parameters would log them again. The pages' promise wins: **the request log records
   > the path and the referring page without their query strings**, and `/to-spec #1` sets the log
   > format that does it. The other disclosed fields are unchanged. nginx's error log is a separate
   > question, under *Not settled*.

   > **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §3.9; M10): a custom
   > `log_format` whose path and referrer are cut at the first `?`, with no `$request`, `$args` or
   > cookie field.

   > **The storage services' logs, 2026-10-11 by [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100).**
   > The request log stays on the computer that runs the program. The services that store a copy's
   > data now log PeerConnect's requests to them, and the Privacy Policy discloses those logs too:
   >
   > - **On the team's copy**, Supabase keeps its API gateway, Auth, Storage and Postgres logs. The
   >   team sees them for up to a day on the Free plan (Auth's audit events for an hour), and Supabase keeps them
   >   for its own operations and security, for a period it does not publish.
   > - **On a local copy**, the same services' container logs stay on the computer, capped like the
   >   others.
   > - **What they hold**: the time, the path and PeerConnect's server address, never a browser's,
   >   since the browser never contacts Supabase (decision 5). Auth's events name the account by
   >   `<id>@peerconnect.invalid`, never the real email
   >   ([Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92)). No schema of them has
   >   a request body, a password or a cookie (Supabase's log field reference and Supabase Auth
   >   v2.197.0's request logger, read 2026-10-11).
   >
   > **This decision's rule now binds the team project too**, and it did not hold there. The hosted
   > database logs a failed query with its `DETAIL`, which can print the whole failing row, a Post's
   > text included, and logs any query of 10 seconds or more with its values. The fallback's `db`
   > command turns this off (`docs/spec.md` §3.9, M13), but a hosted project takes no command-line
   > settings. `log_error_verbosity` cannot help either: the `postgres` role may not set it, and the
   > hosted `csvlog` keeps `DETAIL` whatever it says. So the `postgres` role carries four settings,
   > `log_min_messages = fatal`, `log_min_error_statement = panic`,
   > `auto_explain.log_min_duration = -1` and `log_statement = none`. They are recorded in
   > [`supabase/team-project.md`](../../supabase/team-project.md) and applied by Kamel once the record
   > merges. Supabase's own Auth and Storage roles keep Supabase's defaults, which only Supabase can
   > change; their rows hold no Student's text and no real email.

7. **From 42, PeerConnect keeps only what the identity mapping needs, and no Admin action may ever
   make a 42 login reach a Student.** ADR-0004's module-claim amendment already uses the 42 token once
   and discards it. But 42's `/v2/me` returns name, photo, campus, level, every project and grade and
   the current seat, and a naive implementation stores the whole response. **The rule: keep only the
   42 identity field(s) the mapping actually requires, plus values the Student explicitly chooses to
   have represented in PeerConnect; never the photo, grades, projects, level, campus or location.**
   The exact field is #24's to choose.

   The second half protects decision 4's Direct Message row. ADR-0008 decision 8 lets an Admin edit a
   Student's email, so **if a 42 login were linked to an account by email, an Admin could set a
   Student's email to their own 42 address, sign in with 42, and land in that Student's account and
   messages.** #24 must choose a mapping no Admin action can steer — email-based auto-linking cannot
   satisfy that while ADR-0008 decision 8 stands.

   > **Sharpened 2026-09-23 before `/to-spec #1` — the key is an immutable 42 identifier, whatever
   > ADR-0008 says.** The authoritative key for resolving a 42 login to a Student is an **immutable
   > identifier 42 assigns to the account**. `Student.email` is an account and profile field: the
   > password sign-in address, editable by the Student and by an Admin (ADR-0008 d8). It is never
   > the lookup key for a 42 login, so editing it, by an Admin included, can never change which
   > Student a 42 login resolves to. This holds whether or not ADR-0008 decision 8 later changes. It
   > binds #24 without settling the rest: which 42 field is immutable, and whether a first login
   > links, creates or is refused, stay #24's.

   > **The field named, 2026-10-08 by [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93).** PeerConnect keeps
   > 42's account `id`, a number 42 never changes, in `Student.forty_two_id`; never the `login` or
   > the `email`, which can change. Of `/v2/me`, every 42 login uses the `id`. The `login` and
   > `email` are used only when no Student holds that `id`: they pre-fill the sign-up form, both
   > editable, and are kept only as what the Student submits as display name and email. That is
   > this decision's "values the Student explicitly chooses". Otherwise they stay in memory with
   > the attempt and are gone within ten minutes. Nothing else from `/v2/me` is read, and the
   > token is still used once and discarded.
   >
   > - The Student can **Disconnect 42** from their profile, with their current password, which
   >   clears the number.
   > - A Removed Student's row keeps it (ADR-0008 d7's note).
   > - No Admin action sets, changes or clears it (ADR-0008 d8's note).
   > - A Student created through 42 is an ordinary Student with a password. There is no 42-only
   >   kind of Student and no 42-only feature: `forty_two_id` proves a 42 account, not a current
   >   42 Beirut student (map #85, *Out of scope*).
   >
   > The Privacy Policy's marked 42 sentence can now be written; [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100) words it.
   >
   > > **Worded 2026-10-11 by [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100).** The marker is gone.
   > > *Other websites and services* says PeerConnect keeps the 42 account number to recognise the
   > > Student; that the sign-up form suggests the 42 login as display name and the 42 email, kept
   > > only if kept; and that Disconnect 42 forgets the number. *Your account*, *Your choices* and
   > > *Leaving PeerConnect* name it too.

8. **No Admin may set or reset a Student's password, so a forgotten password cannot be recovered, and
   the pages say so.** ADR-0003 decision 11 ships no reset and PeerConnect sends no email; ADR-0008
   decision 8's editable fields omit the password. The omission is now deliberate, because an Admin
   who could set a password could sign in as any Student and read their Direct Messages — the same
   hole decision 7 closes on the 42 side. The Terms tell Students plainly that a forgotten password
   cannot be reset. Fixing recovery would be a new decision, not an edit to this one.

   > **Recovery through 42, 2026-10-08 by [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93): the new decision
   > this one asked for.** A Student who connected 42 can set a new password without the current
   > one, within ten minutes of **Confirm with 42** on their signed-in profile (ADR-0003 d11's
   > note). No Admin gains anything: an Admin still sets no password and cannot touch the 42 link
   > (ADR-0008 d8's note), so the hole this decision closes stays closed. The Terms' line changes
   > to say that a forgotten password can be reset only through 42, and only by a Student who
   > connected it; [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100) words it. A Student who never
   > connected 42 is where this decision left them.
   >
   > > **Worded 2026-10-11 by [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100).** The Privacy
   > > Policy's limits and the Terms' section 2 say a forgotten password can be reset only through
   > > 42, and only by a Student who connected it: sign in with 42, Confirm with 42 on the profile,
   > > then a new password within ten minutes. The Terms add that whoever can sign in to the
   > > connected 42 account can sign in to the PeerConnect account and set a new password, the risk
   > > [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93)'s resolution recorded on 2026-10-09. A password reset by
   > > email would be a new decision, outside the map that moved PeerConnect to Supabase.

9. **The Terms' conduct rules are the Report reasons, plus five rules of PeerConnect's own.** ADR-0011
   decision 4's reasons — Harassment, Spam, Inappropriate content — are what a Report enforces, so
   they are the rules the Terms state. The five: **honest testimony** (Reviews, Takeaways, Prompt
   answers, Private Feedback and Reports are one's own truthful account, and no Review is submitted
   for a Match that never happened — a path to XP the model cannot detect); **learning, not handing
   over answers** (no sharing or requesting solutions to graded 42 projects or exams; 42's own rules
   still apply); **one personal account** (no impersonation, no sharing); **files** one has the right
   to share, and nobody else's personal data; and **leave the platform alone** (no attacking or
   probing it, no reaching data one is not meant to see).

   > **Noted 2026-10-13 by [Settle what counts as user-facing text](https://github.com/ahmadmnsur/ft_transcendence/issues/142):** the coupling holds in
   > French and Arabic too. The report form's labels for the three shared reasons use exactly the
   > words of each language's Terms (ADR-0011 decision 4's note of this date). How the Terms exist in
   > three languages is [Settle how the legal pages exist in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/143)'s to decide.

10. **Students keep ownership; PeerConnect's licence is to store, show and retain, and nothing else.**
    Store it; show it to the audiences decision 4 and the recorded rows define; retain it according to
    the retention rules, including after Removal. **Excluded outright**: publication outside
    PeerConnect, export, sale, advertising, AI training, and any future use the Terms do not describe
    — the Version 2 Knowledge Base (proposal `:350`) and Learning Portfolio (`:356`) would need the
    Terms changed first. **The pages say near the top that submissions are permanent**: Posts, all
    three parts of a Review and Prompt answers (ADR-0007 d8, ADR-0014 d11, ADR-0013 d7) and Reports
    (ADR-0011 d4) cannot be edited or deleted even by their author, a Direct Message cannot be unsent
    (ADR-0014 d6 records no delete path), and only Evidence and the avatar are deletable. A Post
    removed by moderation leaves the feed and its text is kept (ADR-0008 d6).

11. **Moderation is described as it works, including the uncomfortable parts.** Three sanctions and
    who holds each (ADR-0008 d3, d5). **A reported Student is never told**: there is no notification
    system (#7) and no surface shows a Student a Report about them (ADR-0011 d7). **A reporter never
    learns the outcome** (ADR-0011 d12). **Admins may edit a Student's display name, email, avatar,
    Skills and Learning Goal — never their password, XP, Badges or anything they wrote** (ADR-0008 d8,
    decision 8 above). **There is no formal appeal**: an Admin may lift a Suspension, and nobody can
    reverse a Removal. No appeal process is invented to make the page read better.

12. **Acceptance is a required checkbox, validated on both sides and not stored; four routes are
    readable signed out.** `:381` requires every form input to be validated in both the frontend and
    the backend, and the checkbox — *I agree to the Terms of Service and have read the Privacy Policy*
    — is one. **Not stored**: an account can exist only if the box was ticked, so a
    `terms_accepted_at` column would be a schema change for proof nobody asks for. **Nobody can agree
    to terms they cannot read**, so sign-in, sign-up and the two pages are the only routes readable
    signed out, and the footer shows on every screen. **If #24 lets a 42 login create a Student, that
    path requires the same acceptance.**

    > **Scoped 2026-09-23.** "An account can exist only if the box was ticked" holds for every
    > account a person creates, through sign-up or #24's 42 path. The seed creates the only others:
    > its demo Students and the bootstrap Admin and Peer Moderator (ADR-0004 d11, ADR-0008 d12,
    > ADR-0017), none of which is a real person's sign-up.

    > **The 42 path, 2026-10-08 by [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93).** A 42 login with
    > no Student does create one, through a sign-up form with the same checkbox, validated on both
    > sides and not stored. Connecting 42 to an existing account creates no account and asks for
    > no new acceptance.

13. **Every settled limit is stated plainly.** Everything is kept for as long as the copy's database
    exists — no automatic deletion, no backups, and a wipe erases everything — with the exceptions
    listed: sessions (ADR-0003 d4, d6), the avatar (ADR-0009 d6), Evidence on its Mentee's delete or
    replace, a removed Skill (past Matches keep theirs, ADR-0014 d9), Likes and Friendships (ADR-0014
    d4-d5), and Presence, never stored (ADR-0003). The database is not encrypted at rest and messages
    are not end-to-end encrypted, so **whoever runs a copy can read everything, Direct Messages
    included**. PeerConnect sends no email. A copy is provided as it is, runs only while its machine
    does, verifies nobody's Skills or identity or whether a meeting happened, and meetings happen
    off-platform under campus rules. **Changes carry a last-updated date and no notice** — the
    notification system was refused (#7) — and **the wording claims no legal effect from continued
    use**, since nothing the project can establish would support one.

    > **Under revision 2026-09-30** (see the note at the top): "kept for as long as the copy's database exists"
    > and "no backups" depend on where the data lives, and Supabase may keep backups we cannot restore
    > ([Find out what Supabase's free plan means for PeerConnect](https://github.com/ahmadmnsur/ft_transcendence/issues/89)). [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100) settles the new text.

    > **Two layers, clarified 2026-09-23.** "Whoever runs a copy can read everything, Direct Messages
    > included" and the Direct Message promise do not conflict. **In the application**, a Direct
    > Message is visible to its two participants only: no role, Admin included, can open it, which
    > decisions 7 and 8 protect. **At the database level**, whoever runs the copy can read what is
    > stored, because nothing is encrypted at rest. The pages state both, each at its own layer.

    > **The two files' deletion, refined 2026-10-05 by [Settle how avatars and Evidence are stored and served on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/94).** The avatar
    > and Evidence files live in Supabase Storage, and each is deleted right after the database
    > change that drops it: a replace, a delete, or the avatar's Removal. If that delete fails, the
    > `api`'s cleanup deletes the file within two hours, as long as the `api` runs and its hourly
    > cleanup succeeds: a stopped `api` counts from its next start, and a failed run, which is only
    > logged, waits for the next one. The cleanup runs every hour and deletes only files more than an
    > hour old (ADR-0009 decision 2's note).
    >
    > That cleanup is an automatic deletion, so this decision's "no automatic deletion" no longer
    > holds for files no row names: a replaced or deleted file, and the file of a save that failed,
    > which can stay up to two hours. [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100) words both for the pages.

    > **The limits on Supabase, 2026-10-11 by [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100).**
    > Each limit now says what holds for each kind of copy (decision 1's note of that date).
    >
    > - **Automatic deletion.** "Nothing is deleted automatically" now excepts a file no record uses
    >   any more, deleted within two hours as long as PeerConnect is running and can reach its file
    >   storage. The avatar and Evidence lines carry the same condition (the note above).
    > - **Backups.** PeerConnect keeps none, and on the Free plan the team has none it can restore
    >   the team's copy from. Supabase may keep its own copies of that copy's database: a pause takes
    >   one, and its Data Processing Addendum speaks of daily backups by default, which its docs and
    >   pricing deny for Free. So the page says something deleted can remain in them until Supabase
    >   deletes them. A local copy has none. The Terms say "no backups to count on" and "no backups
    >   the team can restore" ([Find out what Supabase's free plan means for PeerConnect](https://github.com/ahmadmnsur/ft_transcendence/issues/89)).
    > - **Encryption.** Supabase encrypts the team project's disks and backups (AES-256, its Data
    >   Processing Addendum's security schedule), so "not encrypted at rest" no longer holds for the
    >   team's copy; it still holds for a local copy. Disk encryption stops no one who can open the
    >   database, so the limit is now worded as who can: only the team, and Supabase as its host,
    >   for the team's copy (decision 1's note); whoever runs it, for a local copy. Both layers of the
    >   note of 2026-09-23 stand.
    > - **Emptying a copy.** The team empties the team's copy, with `make reset-team`; whoever runs
    >   a local copy wipes it.
    > - **What Supabase Auth records by itself** joins *Your account*: the hash; the time Supabase
    >   Auth last accepted the password (`last_sign_in_at`, which cannot be turned off), and rarely
    >   an earlier one, when an accepted check's own sign-out fails and its Supabase Auth session
    >   row stays; and only the internal login, never the real email
    >   ([Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92)). Every accepted check moves that
    >   time, since the password grant cannot tell them apart: a sign-in, a password change's check
    >   of the current password (ADR-0003's note of 2026-10-02), and Connect 42's and Disconnect 42's
    >   ([Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93)). A refused check does not, and a
    >   password set after Confirm with 42 has no check. "Does not record when you were last online"
    >   stays, and points to that time and to the logs, which keep each check. The logs' only
    >   sign-outs are those that follow an accepted check: each check's Supabase Auth session is
    >   signed out at once (ADR-0003 d1's note of 2026-09-30), and a PeerConnect sign-out writes
    >   nothing to Supabase Auth (ADR-0003 d6's note of 2026-10-02).
    > - **Availability.** The Terms' section 8 adds that Supabase can pause the team's copy until the
    >   team resumes it.

14. **The canonical text is `docs/legal/privacy-policy.md` and `docs/legal/terms-of-service.md`; the
    frontend bundles and renders it with no network fetch.** How it renders is `/to-spec`'s call; if
    that needs a Markdown library, it is a stack addition and goes through the map. **Drafted from
    this ADR on 2026-09-23. Ahmad edits and signs off; Kamel verifies the technical claims** — the
    cookie, the logs, TLS, storage and 42. **The week-4 deadline stands for sign-off and the pages
    being live**, end of week 4 (2026-10-15), and now falls on review rather than on writing from
    scratch.

15. **The Privacy Policy moves with personal data, in the same PR.** Once it exists it is a record of
    the data model in plain language, and it goes stale the first time someone adds a column. Any PR
    that changes what personal data is stored, who can see it, or how long it is kept updates the
    Privacy Policy in that PR — and the Terms, where a conduct rule or a sanction moves. The rule is
    written into `CONTRIBUTING.md`, one box in the PR template's Done list (ADR-0016 d6), the schema
    gate's review (ADR-0005 d5), and `docs/agents/issue-tracker.md` → *Record propagation*, so a
    *decision* that changes visibility or retention reaches the pages too. **The pages are corrected
    in place, not annotated**: they are user-facing text rather than a record an evaluator audits,
    and git keeps their history.

## Considered options

**A GDPR-shaped policy** (rejected, decision 2). The conventional shape, and what an evaluator may
expect to see. It names a controller that does not exist, promises erasure, export and access this
model withholds by design, and invites comparison with the unclaimed GDPR Minor.

**Written as though a 42 campus runs PeerConnect** (rejected, decision 1). Reads most like a real
product; it is false, and it speaks for a real organisation. **Written as a school project
throughout** (rejected, same): honest, and the quickest route to a page that reads as a placeholder
under `:330`.

**A self-service "Remove my account"** (rejected, decision 3). Cheap and conventional. Rejected
because Removal burns the email permanently (ADR-0008 d7), and a final act on an institutional
identity wants a human confirmation step.

**Turning nginx access logging off** (rejected, decision 6). Nothing to disclose, and nothing to
debug with during a defense. **Uncapped logs** (rejected, same): honest to describe as kept "until
cleared", but they grow without limit on a machine nobody is watching.

**A notice line instead of a checkbox, or a checkbox with a stored `terms_accepted_at`** (rejected,
decision 12). The notice leaves no validated input and no demonstrable acceptance; the column is a
schema change for proof nobody asks for.

**An Admin password reset** (not pursued, decision 8). It would close the forgotten-password gap and
open the account-takeover path that decision 4's Direct Message row cannot survive.

## Consequences

- **The two pages exist as drafts, and sign-off is blocked on two facts**: Kamel's and Fadel's 42
  logins, which the project roster does not record (`CONTRIBUTING.md` lists names only, and the
  repository's GitHub usernames are not 42 logins); and the exact 42 field, which #24 settles. Both
  carry visible markers in the drafts, so neither can ship unnoticed.

  > **The 42 field settled 2026-10-08 by [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93):** 42's
  > account `id` (decision 7's note). Its marker is replaced when [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100) words
  > the sentence. The 42 logins' markers are not this ticket's.
  >
  > > **Replaced 2026-10-11** (decision 7's note of that date), so neither page carries a marker.

  > **Updated 2026-10-09 — the logins still needed are Kamel's and Hussein's.** Fadel left the team
  > on 2026-10-01, and Hussein Dakdouk joined on 2026-10-04. Ahmad's is `ahmmanso`. Tracked on
  > [Legal pages sign-off](https://github.com/ahmadmnsur/ft_transcendence/issues/69).

  > **Logins recorded 2026-10-11.** Kamel's 42 login is `kabbas` and Hussein's is `hdakdouk`. Both
  > pages name every author by login since that date, so the logins no longer block sign-off.
- **`/to-spec` inherits binding rules**: one cookie; no third-party fetching; log hygiene and a
  Compose log cap; the throttle in memory; no Admin-set password; decision 4's visibility rows, the
  Admin label and no read receipts; four signed-out routes with the footer everywhere; the signup
  checkbox; and Removal on request only.
- **Decision 4's Direct Message promise rests on decisions 7 and 8.** Either an Admin password reset
  or an Admin-steerable 42 link would silently falsify the page.
- **ADR-0011's reason enum and the Terms are coupled.** Adding or renaming a reason changes the Terms
  in the same PR.
- **"Ask an Admin by Direct Message" assumes a Student can message any Student.** No record restricts
  Direct Messages to Friends; if `/to-spec` does, the Contact sections change.
- **No module point moves.** This is mandatory-part work with the highest rejection risk on the map;
  the writing risk moves from week 4 to week 1, and week 4 keeps the review.

## Not settled by this decision

- **The exact 42 identity field(s)** — owned by
  [Settle how a 42 identity maps to a Student](https://github.com/ahmadmnsur/ft_transcendence/issues/24),
  under decision 7's constraints.

  > **Settled 2026-10-08 by [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93):** 42's account `id`, in
  > `Student.forty_two_id` (decision 7's note of that date).
- **The rendering mechanism and the log cap's numbers** — `/to-spec`.

  > **Settled 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §3.5.4, §15.1; M12, M22).
  > The pages are bundled with Vite's `?raw` and rendered by a project-owned subset renderer that
  > fails the build on any construct it does not support, so no Markdown library is added and the
  > map's stack is unchanged. Every service's container log is `json-file` capped at `max-size:
  > 10m`, `max-file: 3`.
- **Whether a Block can be lifted.** No record says; the pages promise neither. If `/to-spec` adds
  it, the Privacy Policy's retention list gains it.

  > **Settled 2026-09-23 by `/to-spec #1`: it can** ([`docs/spec.md`](../spec.md) §11.3, §2.3 R1;
  > M23). "No record says" was not quite so: ADR-0011 d7's 2026-09-22 note and ADR-0016 d1's tenth
  > category both race a *"Block create/remove"*, a test that needs removal to exist. The blocker
  > may delete their own Block; it restores nothing. The Privacy Policy's retention list and choices
  > now say so.
- **What nginx's error log may hold** *(added 2026-09-23)*. Its format is fixed: every entry about
  a request appends the full request line and the referring page, query strings included, which
  decision 6's annotation keeps out of the request log. Either the error log is configured so no
  such entry is written, giving up some proxy diagnostics, or the Privacy Policy discloses it as a
  second log that can hold them. Kamel's technical sign-off (decision 14) is the natural owner.

  > **Settled 2026-09-23 by `/to-spec #1`: no such entry is written** ([`docs/spec.md`](../spec.md)
  > §3.9; M11). The proxy's own `nginx.conf` sets the http-level `error_log` to `/dev/null`, where
  > every entry written while handling a request goes, and keeps a main-level `error_log /dev/stderr
  > warn` for process-level messages, which nginx writes without request context. The Privacy
  > Policy's single disclosed request log stays exactly true; the diagnostic cost is accepted, the
  > request log's status field still showing every 413, 502 and 504. Kamel's technical verification
  > still applies.
