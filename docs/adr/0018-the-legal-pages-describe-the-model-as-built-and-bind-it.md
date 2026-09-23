# The legal pages describe the model as built, and bind it

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

   > **Wording corrected 2026-09-23.** *"Only the fictional Students ADR-0017 seeds"* reads as
   > though a fresh copy had no staff accounts. **A fresh copy contains only seeded demo accounts
   > and no real user data**: ADR-0017's thirty Students plus the bootstrap Admin and Peer
   > Moderator (ADR-0004 d11, ADR-0008 d12). Those two are Student records holding a role, like
   > every account (ADR-0008 d1).

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

8. **No Admin may set or reset a Student's password, so a forgotten password cannot be recovered, and
   the pages say so.** ADR-0003 decision 11 ships no reset and PeerConnect sends no email; ADR-0008
   decision 8's editable fields omit the password. The omission is now deliberate, because an Admin
   who could set a password could sign in as any Student and read their Direct Messages — the same
   hole decision 7 closes on the 42 side. The Terms tell Students plainly that a forgotten password
   cannot be reset. Fixing recovery would be a new decision, not an edit to this one.

9. **The Terms' conduct rules are the Report reasons, plus five rules of PeerConnect's own.** ADR-0011
   decision 4's reasons — Harassment, Spam, Inappropriate content — are what a Report enforces, so
   they are the rules the Terms state. The five: **honest testimony** (Reviews, Takeaways, Prompt
   answers, Private Feedback and Reports are one's own truthful account, and no Review is submitted
   for a Match that never happened — a path to XP the model cannot detect); **learning, not handing
   over answers** (no sharing or requesting solutions to graded 42 projects or exams; 42's own rules
   still apply); **one personal account** (no impersonation, no sharing); **files** one has the right
   to share, and nobody else's personal data; and **leave the platform alone** (no attacking or
   probing it, no reaching data one is not meant to see).

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

    > **Two layers, clarified 2026-09-23.** "Whoever runs a copy can read everything, Direct Messages
    > included" and the Direct Message promise do not conflict. **In the application**, a Direct
    > Message is visible to its two participants only: no role, Admin included, can open it, which
    > decisions 7 and 8 protect. **At the database level**, whoever runs the copy can read what is
    > stored, because nothing is encrypted at rest. The pages state both, each at its own layer.

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
- **The rendering mechanism and the log cap's numbers** — `/to-spec`.

  > **Settled 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §3.5.4, §15.1; M12, M22).
  > The pages are bundled with Vite's `?raw` and rendered by a project-owned subset renderer that
  > fails the build on any construct it does not support, so no Markdown library is added and the
  > map's stack is unchanged. Every service's container log is `json-file` capped at `max-size:
  > 10m`, `max-file: 3`.
- **Whether a Block can be lifted.** No record says; the pages promise neither. If `/to-spec` adds
  it, the Privacy Policy's retention list gains it.

  > **Settled 2026-09-23 by `/to-spec #1`: it can** ([`docs/spec.md`](../spec.md) §11.3, §2.3 C1;
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
