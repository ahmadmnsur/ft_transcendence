# Session cookies over JWT, and a single authorization path

> **Under revision 2026-09-30: login moves to Supabase Auth.**
> The team settled on 2026-09-30 that Supabase provides PeerConnect's database, file storage and
> login, with Socket.IO kept ([Map: PeerConnect moves to Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/85)).
> Supabase Auth hashes passwords with bcrypt, not argon2id (decision 3), and issues its own tokens.
> Which decisions below survive is settled by
> [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91) (the cookie, the check on
> each request and on the socket handshake, CSRF) and
> [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92) (passwords, sign-out, Suspension, Removal).
> The text below is kept as written; [Write the Supabase ADR and annotate the ADRs it changes](https://github.com/ahmadmnsur/ft_transcendence/issues/102) records what the move changes.
>
> > **Recorded 2026-10-12 in [ADR-0019](0019-supabase-hosts-the-data-and-peerconnect-keeps-the-rest.md)**,
> > which sums up the move to Supabase and names which of this ADR's decisions carry its notes.

> **Settled in part 2026-09-30 by [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91):
> PeerConnect keeps its own session.** Supabase Auth holds the account and checks the password;
> PeerConnect's `Session` row, behind the one `pc_session` cookie, decides who is signed in. The
> browser never talks to Supabase, and resolving the session on a request or a socket handshake
> never calls Supabase Auth. Decisions 1, 2, 4, 5, 7, 8 and 9, and decision 10's CSRF defence,
> stand as written; decisions 1 and 5 carry a note each. Signing a Student out at once is still
> deleting their `Session` rows (decision 6). Still with
> [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92): decision 3, what decision 6's events also do in Supabase Auth,
> decision 10's throttle and its one generic refusal, and decision 11. Still with
> [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93): what Sign in with 42 does with the cookie and its callback
> (the notes on decisions 1 and 10 about it).

> **Settled 2026-10-02 by [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92): the accounts.** Each Student has one
> Supabase Auth user with the Student's own id. It keeps only the password: its login is
> `<id>@peerconnect.invalid`, a reserved name that can never receive mail, and the real email stays
> in `Student.email` alone. Decision 1's password grant is used. Decision 3 is replaced (bcrypt, by
> Supabase Auth). Decision 6 now says what its events do in Supabase Auth. Decision 10's throttle
> stands and its one generic refusal is replaced. Decision 11 stands. Each carries a note. Still with
> [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93): what Sign in with 42 does with the cookie and its callback,
> and whether a Student it creates has a Supabase Auth user.

> **Settled 2026-10-08 by [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93): Sign in with 42.** NestJS runs
> the 42 flow itself, and Supabase Auth takes no part in it. A 42 login finds its Student by 42's
> account `id`, stored in `Student.forty_two_id`, never by email. A 42 account that no Student holds
> gets a sign-up form, and the Student it creates has a password and a Supabase Auth user like
> every other. A signed-in Student can connect or disconnect 42 with their current password, and a
> Student who connected it can set a new password after confirming with 42. Decisions 6, 10 and
> 11 carry a note each. Decision 1's notes on the attempt cookie stand, except that on a first 42
> login the sign-up form's request replaces the attempt cookie, not the callback (decision 10's
> note).

The subject mandates email-and-password authentication with hashed, salted storage
(`document/en.subject.md:377`) and HTTPS for every browser-to-backend connection (`:383`),
and **nothing else**. In particular it never mentions JWT: zero occurrences of "JWT" or
"JSON Web Token" in the whole document. The previous ft_transcendence subject required it,
so a future reader will reasonably assume we forgot. We didn't — the token choice was free,
and we spent it on **an opaque session id in an httpOnly cookie, with session rows in
Postgres**, because the credential we need is one that can be *withdrawn*.

## The decisions

1. **An opaque session id in an httpOnly, Secure, SameSite=Lax cookie.** No JWT anywhere in
   the product. The session row is the authority; the cookie is just a pointer to it.

   > **Made the only cookie, 2026-09-23 by ADR-0018 d5.** This is the one cookie the product
   > sets, and any other browser storage holds interface preferences only. The Privacy Policy
   > promises exactly that, and explains the absence of a cookie banner as a consequence of it.

   > **What the cookie may point to, 2026-09-23 (ADR-0018 d5's annotation, decision 10's).** Before
   > any session exists, during Sign in with 42, the same cookie points to the pre-authentication
   > attempt; a successful callback replaces it with a newly issued session id. Its attributes are
   > unchanged, and `SameSite=Lax` is what carries it to the callback, a cross-site top-level GET
   > from 42. `Strict` would drop it.

   > **Held through the move to Supabase, 2026-09-30 by [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91).**
   > "No JWT anywhere in the product" still holds for the browser and for every session check. If
   > sign-in checks the password through Supabase Auth's password grant ([Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92)
   > decides), the access token it returns is a JWT that lives only inside that one sign-in
   > request on PeerConnect's server: it is used once to sign that Supabase Auth session out, and is
   > never stored, logged or sent to the browser; the refresh token is dropped with it. If that
   > sign-out fails, the sign-in still succeeds. "Session" alone still means PeerConnect's
   > `Session` row; Supabase's is always written "Supabase Auth session".

   > **The password grant is used, 2026-10-02 by [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92).** Sign-in checks
   > the password through it, and so does a password change's check of the current password, so
   > the note above applies to both.

2. **One origin.** The React bundle, the HTTP API and the socket.io endpoint are served from
   the same scheme, host and port as the browser sees them, behind a single reverse proxy.
   This is a hard constraint on the deployment shape, not a preference: it keeps the session
   cookie, the HTTP API and the socket.io handshake on a single origin, so the cookie travels
   **same-site and needs no cross-origin configuration to carry it**. Splitting the origin
   would require a separate cross-origin CORS configuration for credentialed browser requests
   — an explicit credentialed origin allowlist, since `*` is not permitted once credentials
   are sent — and, **where the split is also cross-site**, `SameSite=None` on the cookie as
   well. Either way it **adds a cross-origin security boundary this architecture deliberately
   avoids**.

3. **argon2id for passwords**, via `@node-rs/argon2` (prebuilt binaries, so the container
   build needs no native toolchain), at the OWASP floor of m = 19 MiB, t = 2, p = 1. The
   salt is generated and embedded by the library, which is what satisfies "salted" at `:377`.

   > **Under revision 2026-09-30** (see the note at the top): Supabase Auth hashes passwords with bcrypt.
   > [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92) settles what replaces this decision.

   > **Replaced 2026-10-02 by [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92).** Supabase Auth hashes every
   > password it sets with bcrypt at cost 10 and a salt per hash, and neither is a setting.
   > argon2id cannot be kept. Supabase's admin create accepts an imported argon2id hash and checks
   > it as argon2id, but its admin update takes only a plain password, so the first change would
   > turn that hash into bcrypt. OWASP's Password Storage Cheat Sheet allows bcrypt for legacy
   > systems, *"with a work factor of 10 or more and with a password limit of 72 bytes"*, and
   > `en.subject.md:377`'s "hashed and salted" is met. So a password is **at least 8 characters
   > and at most 72 bytes** in UTF-8 (an accented or Arabic letter counts 2), with no composition
   > rule. The frontend checks both, and the API checks them again before it calls Supabase Auth;
   > the Supabase project's own minimum length is set to 8 too. PeerConnect no longer hashes or
   > stores a password: `Student.password_hash` goes, and `@node-rs/argon2` with it.

4. **Sliding expiry, 30 days of inactivity, renewed lazily.** `expires_at` is only rewritten
   when it is more than an hour old, so an authenticated request is not also a database
   write. Cookie `Max-Age` is derived from `expires_at`, keeping the browser-side and
   server-side expiry aligned. There is no absolute cap.

5. **The session row holds `id`, `student_id`, `expires_at` — and not the role.** The
   **Admin** role is read from the Student row in the same query that resolves the session.

   > **Widened by ADR-0008.** There are now three roles, so what this query reads is **the
   > role**, not "the Admin role" — `STUDENT`, `PEER_MODERATOR` or `ADMIN`. The same query
   > also reads the **Suspension** and **Removal** flags, and **resolution fails if either is
   > set**. In principle no such session exists, since both sanctions delete every session;
   > the check costs one condition in a query already reading the Student row, and it is what
   > makes "suspended and removed are indistinguishable at the authentication layer" a rule
   > the code enforces rather than an intention.

   > **Kept inside PeerConnect's tables, 2026-09-30 by [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91).**
   > This query reads PeerConnect's own tables only, never Supabase's `auth` tables, and resolving a
   > session, on a request or a socket handshake, never calls Supabase Auth. So the Suspension and
   > Removal flags it refuses on stay in PeerConnect's tables, whatever
   > [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92) does with Supabase bans; a ban there would only stop the
   > password check.

6. **What kills a session:** logout deletes that row; a password change or a moderation
   **Suspension** deletes *every* row for that Student. A **role change deletes nothing** —
   decision 5 means it takes effect on the next request.

   > **Renamed by ADR-0008.** "Moderation block" here is now **Suspension**. ADR-0006 later
   > gave **Block** to the peer-to-peer act, and a peer Block must never delete anyone's
   > sessions. The mechanism is unchanged; only the word was wrong.

   > **Removal propagation completed 2026-09-22 by ADR-0008 d5.** Removal also deletes every
   > session for that Student and triggers decision 8's live-socket disconnection. Both sanctions
   > are rejected during session resolution under decision 5; they differ only in that Suspension
   > may be lifted while Removal is final.

   > **What these events do in Supabase Auth, 2026-10-02 by [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92).**
   > Logout, Suspension, reinstatement and Removal write nothing there. Signing out stays deleting
   > `Session` rows, and a Suspended or Removed Student keeps their Supabase Auth user: no ban, no
   > delete. PeerConnect's own flags do the refusing.
   >
   > A password change is the one event that writes to Supabase Auth, in this order:
   > 1. check the current password through Supabase Auth;
   > 2. delete every session of the Student;
   > 3. set the new password with Supabase's admin update, by id;
   > 4. delete every session again.
   >
   > A `password_version` number on the Student replaces the hash that this decision's race check
   > re-read (`docs/spec.md` §5.1 and §3.6.3). Sign-in reads it before asking Supabase Auth, then
   > re-reads it and creates the session only if it is unchanged, in the same `SERIALIZABLE`
   > transaction. Steps 2 and 4 are each one `SERIALIZABLE` transaction that raises it and deletes
   > the sessions. The change reads the number before step 1 too, and step 2 refuses with
   > `password_incorrect` if it moved since then, so two password changes cannot both go through.
   >
   > So a sign-in with the old password is either deleted or refused, unless the change crashes
   > between steps 3 and 4. Step 4 catches a sign-in that lands between steps 2 and 3, while the
   > old password still works. Step 2 makes a crash before step 3 safe: signed out everywhere,
   > password unchanged. A crash between steps 3 and 4 leaves the new password set and at most a
   > session created in that gap. That is accepted.

   > **Not enough alone, 2026-10-14 by [Accounts and sessions: sign-up, sign-in, sign-out, password change](https://github.com/ahmadmnsur/ft_transcendence/issues/36).**
   > The version check above does not stop two password changes on its own. A second change can
   > start during the first one's gap between steps 2 and 3, on a session signed in with the old
   > password, which still works there. It reads the version the first change has already raised, so
   > its own step 2 lets it through, and whichever admin update comes last wins. A per-Student lock,
   > taken just before step 2 and held through step 4, serializes the changes: one that waited finds
   > the version moved and is refused with `password_incorrect`, a lost race that decision 10's
   > throttle does not count. The lock is in memory, like the throttle, so it relies on a single
   > `api` process (`docs/spec.md` §15.1); a second process would bring the race back.

   > **A password set through 42, 2026-10-08 by [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93).** A Student who
   > connected 42 may set a new password without the current one, after **Confirm with 42**
   > (decision 11's note). It is the password change above with step 1 replaced: the confirmation
   > stands where the check of the current password stood. Steps 2 to 4, the `password_version`
   > guards and the signing out everywhere stand as written.

7. **The socket authenticates by the same cookie**, which same-origin socket.io replays on
   every handshake, including every reconnect. There is no token to pass, refresh, or
   re-present: the reconnect story is that there isn't one. A rejected handshake must stop
   the client retrying and send it to login, overriding socket.io's infinite reconnect.

   > **Hardened 2026-09-20 — browser origin is a separate handshake authorization.** The
   > browser Socket.IO client uses **WebSocket transport only**; Engine.IO HTTP long-polling
   > fallback is disabled. Every initial connection and reconnect therefore carries the
   > browser's `Origin`. At the Engine.IO admission gate (`allowRequest` or the framework
   > equivalent), require that header to equal the configured `PUBLIC_ORIGIN` exactly and
   > reject an absent, `null` or mismatched value **before** resolving the session cookie. A
   > valid session never bypasses this check. Socket.IO CORS configuration is not a substitute:
   > it governs HTTP long-polling, not WebSocket connection authorization. The product has no
   > non-browser socket client, so there is no origin-less exception.
   >
   > The origin gate runs on every reconnect. Its rejection is terminal for that connection
   > attempt and stops automatic retry under the rule above, but it leaves the session row
   > untouched. The existing send-to-login path applies when session authentication fails;
   > origin rejection by itself surfaces an origin/configuration error. ADR-0004 supplies the
   > one allowed value per path: `https://localhost:8443` in production and
   > `http://localhost:8081` in development.

8. **Deleting a Student's sessions force-disconnects their live sockets**, through the same
   in-memory registry that already backs **Presence**. Without this, a suspended Student keeps
   messaging over an already-authenticated socket.

9. **No privileged action is ever exposed over the socket.** Opening and closing a **Round**,
   publishing a **Reflection Prompt**, acting on reported content and user CRUD are all HTTP,
   where the role check from decision 5 lives. The socket carries **Presence** and 1:1 direct
   messages, nothing else.

   > **Extended by ADR-0014 decision 8; noted 2026-09-23.** The last sentence describes the
   > socket as it stood then. ADR-0014 later added outbound, server-to-client events:
   > `post:created` to the feed, `round:opened` and `round:closed` to everyone, and each
   > Student's own Match-ready event. ADR-0010 and ADR-0015 read those as refresh signals.
   > **The rule above is unchanged**: nothing a client sends over the socket performs a
   > privileged action, and a direct message is the only write a client sends.

10. **CSRF is answered by SameSite=Lax plus a JSON content-type requirement** on every
    mutation — a cross-site HTML form cannot submit `application/json`; a script attempt
    would require a CORS preflight that the same-origin deployment does not authorize. Login
    and signup are throttled (5 attempts per 15 minutes, keyed on IP and email) and failure
    responses use one generic message, reducing account-enumeration signals.

    > **Narrowed 2026-09-22 by ADR-0009.** “Every mutation” cannot be literal for file uploads
    > without inventing base64-in-JSON. Avatar and Evidence create/replace routes are the only
    > exception: `multipart/form-data` is accepted only with `Origin === PUBLIC_ORIGIN` and
    > `X-PeerConnect-CSRF: 1`, both checked before file processing; an absent, `null` or mismatched
    > Origin and a missing or different header are rejected. A cross-site form cannot set that
    > header and a cross-origin script cannot pass the preflight because no CORS permission is
    > added. File deletion and every non-upload mutation remain JSON-only; `SameSite=Lax` remains.

    > **Throttle storage fixed 2026-09-23 by ADR-0018 d6.** The attempt counts keyed on IP and
    > email live in memory only and are never persisted; the Privacy Policy discloses them in
    > exactly those terms. The numbers above remain engineering defaults.

    > **Clarified 2026-09-23 before `/to-spec #1` — three things this decision left implicit.**
    >
    > - **No GET request creates, changes or deletes a domain row.** The defence above depends on
    >   it: `SameSite=Lax` still sends the cookie on a cross-site top-level GET, and a GET has no
    >   JSON body to require. So marking a thread read (ADR-0014 d6) and logout are their own
    >   non-GET mutations, never side effects of a read. Exactly two GET-time writes fall outside
    >   this rule: decision 4's lazy session-expiry renewal, which only updates the caller's own
    >   session, and the OAuth callback that creates the session (below).
    > - **The 42 OAuth callback must carry `state`.** The provider redirects the browser to the
    >   callback, so it is a GET that creates a session, and the JSON requirement cannot protect
    >   it. The flow therefore uses a one-time `state` value bound to the initiating browser
    >   **through the single cookie** (ADR-0018 d5's annotation): before a session exists, that
    >   cookie temporarily identifies the attempt, and a successful callback replaces it with a
    >   newly issued session id. No second cookie and no web storage. The callback checks `state`
    >   before any session exists. RFC 9700 §2.1 makes that binding (*"Clients MUST prevent
    >   Cross-Site Request Forgery"*). PKCE may be added as defence in depth (§2.1.1), but **`state`
    >   stays mandatory unless a later record explicitly establishes a demonstrably equivalent
    >   browser-binding mechanism.** Starting the attempt adds no third GET exception: it is a
    >   non-GET request, or it writes no domain row. This constrains the flow, not #24's identity
    >   mapping.
    > - **The throttle key is the client address together with the submitted email — never the
    >   address alone.** The API is reachable only through nginx (ADR-0004 d2, d7), and every
    >   supported browser sits on the same machine. An address-only bucket would therefore be one
    >   bucket for the whole platform: five failures by anyone would lock everyone out. **nginx is
    >   the only trusted proxy.** It supplies the client address from the peer address it observed
    >   itself, overwriting any forwarding header the browser sent. The API takes the client address
    >   only from that nginx-set value, and never trusts a browser-supplied forwarding header.
    >   `/to-spec #1` chooses the framework and proxy configuration that does this. The numbers stay
    >   engineering defaults.

    > **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §5.5; M9): every proxied
    > nginx location sets `X-Real-IP` and `X-Forwarded-For` to `$remote_addr`, overwriting whatever
    > the browser sent; the API reads the client address only from `X-Real-IP`, and Express `trust
    > proxy` stays off.

    > **The callback exception's reach, noted 2026-09-23 for #24.** "Exactly two GET-time writes"
    > names the callback that *creates a session*. ADR-0018 d5 later added a callback reached while
    > a session already exists, which creates none. And if #24 lets a 42 login link an identity or
    > create a Student, the callback would write a domain row that is not a session. The `state`
    > check protects every callback write alike, so the defence holds either way. What this
    > decision does not yet say is whether those writes fall inside the exception or move to a
    > following non-GET request. #24 records which, together with its linking rule.

    > **Throttle kept, one generic refusal replaced, 2026-10-02 by [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92).**
    > The throttle stands as written. Sign-in now says what is wrong, checked in this order:
    > 1. No Student holds the email: "No account uses this email."
    > 2. Supabase Auth refuses the password: "Wrong password." (`password_incorrect`)
    > 3. Only after the right password, Removed: "This account was removed and can't sign in
    >    again."
    > 4. Only after the right password, Suspended: "Your account is suspended. Contact an Admin."
    >
    > A sanction is therefore told only to someone who holds the password, never to someone who
    > only knows the email. Saying that an email has no account discloses nothing new, because
    > sign-up's `email_unavailable` already answers that for any email, Removed rows included. For
    > the same reason the dummy hash that evened out the timing for unknown emails
    > (`docs/spec.md` §5.1) is dropped.
    >
    > Two answers come from Supabase Auth itself:
    > - A Supabase 429, from its shared per-IP bucket (accepted by [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91)),
    >   answers `too_many_attempts` and is not counted as the Student's failure.
    > - Supabase Auth unreachable answers `busy_retry_later`, never `invalid_credentials`.
    >
    > Sign-up never uses Supabase's public `/signup` or its bucket. Accounts are created through
    > the admin API with the secret key, and the project's public sign-up is switched off, so no
    > account can be made except through PeerConnect.

    > **The callback's writes, 2026-10-08 by [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93)**, answering the note
    > on the callback exception's reach. The callback may write two things, both after the `state`
    > check:
    > - the session it creates for the Student a 42 login finds, the exception as first written;
    > - the link a signed-in Student asked for with **Connect 42**: `Student.forty_two_id` set on
    >   their own row, refused if another row already holds that 42 account.
    >
    > **Connect 42 and Disconnect 42 ask for the current password**, checked through Supabase Auth
    > as a password change's step 1 is: Connect 42 when it starts, before the trip to 42, and
    > Disconnect 42 in its own JSON request. The `state` check proves the callback came back to the
    > browser that started the trip, not that the person at that browser owns the account. Without
    > the password, someone at a computer left signed in could put their own 42 account on the
    > owner's row and keep it after the owner's next password change. A Student who signed up
    > through 42 is already connected, and one who signed up with a password knows it.
    >
    > That is the exception's whole reach. A 42 account that no Student holds creates nothing in
    > the callback. The callback still uses the attempt's `state` and PKCE verifier once, as for
    > any 42 login. Then, under the same cookie, it keeps a sign-up draft in memory until the
    > attempt's ten minutes end: the 42 `id`, with the 42 login and email as suggestions. The
    > browser goes to a sign-up form. The Student is created by that form's JSON request, which
    > runs the ordinary sign-up's checks and transaction, Terms checkbox included (ADR-0018 d12),
    > and also writes `forty_two_id` and uses the draft up. Its new session replaces the attempt
    > cookie.
    >
    > **The 42 sign-up form's request says it comes from that form**, so it can never be taken for
    > an ordinary sign-up. The attempt cookie ends with the draft (`Max-Age` ten minutes), and
    > after that the browser sends none. A request without its cookie, or whose draft has expired,
    > would otherwise look exactly like an ordinary sign-up and succeed without `forty_two_id`. So
    > it is refused with the 42 failure below, and never becomes an ordinary sign-up. An ordinary
    > sign-up never uses a draft, even while one is live in that browser. A 42 sign-up form that
    > goes through therefore always creates an account connected to that 42 account. Someone who
    > leaves it for the ordinary sign-up page creates an ordinary account, and can connect 42
    > later with their password. **Confirm with 42** (decision 11's note) writes no row in the
    > callback either.
    >
    > Sign in with 42 now tells a sanction the way sign-in does (the note above). Once 42 has
    > confirmed the account, a Removed Student reads "This account was removed and can't sign in
    > again." and a Suspended one "Your account is suspended. Contact an Admin." 42's confirmation
    > stands where the right password does: it proves who is signing in. Every other failure keeps
    > one message, "Sign in with 42 failed. Try again.": cancelled on 42's page, an expired or
    > unknown attempt, a `state` mismatch, or 42 unreachable.

    > **The throttle widened, 2026-10-13 by [Update the spec and the legal pages for
    > Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/103), Kamel's choice.** A wrong
    > current password also counts: the password change, Connect 42's start and Disconnect 42 share
    > one check of it through Supabase Auth (the notes above), and each refusal counts as a failed
    > attempt under the signed-in Student's own email and the client address, so someone at a
    > computer left signed in cannot keep guessing, as they could while only Supabase's shared
    > per-IP limit slowed them. A new password set after Confirm with 42 checks no password and is
    > not throttled.
    > The limit, the window, the key and the in-memory store stand. A lost race, a sanction told
    > after the right password, a Supabase `429` and Supabase Auth unreachable count as nothing
    > (`docs/spec.md` §5.5, M37). The Privacy Policy's sentence on attempt counts moves with it
    > (ADR-0018 d6).

11. **Logout ships. Email verification and password reset do not.** Neither is mandated by
    either source; both are Version 2 under the standing "anything not shipped is Version 2"
    rule. Email verification in particular would put SMTP deliverability on the critical path
    of a live defense.

    > **Extended 2026-09-23 by ADR-0018 d8 — no Admin may set or reset a password either.**
    > With no reset link and no email, a forgotten password cannot be recovered, and the Terms of
    > Service say so. An Admin-set password was the obvious repair and is refused: an Admin who
    > could set one could sign in as any Student and read their Direct Messages, which the
    > Privacy Policy promises no Admin can do. ADR-0008 decision 8's editable fields already
    > omitted the password; the omission is now deliberate.

    > **Stands, 2026-10-02 by [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92).** Supabase Auth sends no mail on
    > PeerConnect's paths: accounts are created already confirmed through the admin API, and its
    > users hold no real email. Password reset by email is ruled out of scope on
    > [Map: PeerConnect moves to Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/85) as a later effort, in which PeerConnect would send the email itself and
    > Supabase Auth would only set the new password. The admin update a password change uses is
    > never offered as an Admin action (ADR-0018 d8).

    > **Recovery through 42, 2026-10-08 by [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93).** A Student who
    > connected 42 can recover a forgotten password. Signed in, for example through Sign in with 42,
    > they press **Confirm with 42** on their profile and go to 42 and back. For the next ten
    > minutes they may set a new password once, without the current one (decision 6's note). The
    > confirmation must return the 42 account that Student connected; anything else fails like any
    > 42 failure. The permission lives in memory, bound to the session like a Connect 42 attempt,
    > and is never a database row. The new-password request takes it, and checks that the Student's
    > connected 42 account is still the one confirmed.
    >
    > A PeerConnect session alone cannot change the password: Confirm with 42 also needs the
    > connected 42 account, signed in in that browser. If the 42 intranet is still signed in there,
    > 42 may send the browser straight back without asking for anything; it is plain OAuth 2.0,
    > with no way to ask for a fresh login. So whoever controls the connected 42 account in a
    > browser controls the PeerConnect account, as they already could through Sign in with 42, and
    > PeerConnect cannot tell them apart. Connect 42 asks for the current password (decision 10's
    > note), so a session left open cannot attach another 42 account and use it here. Email
    > verification and reset by email still do not ship, an Admin still sets no password (ADR-0018
    > d8's note), and a Student who never connected 42 still cannot recover a forgotten password.

**The numbers in decisions 3, 4 and 10 are engineering defaults, not citations.** The subject
sets no figure for session length, renewal threshold or rate limit. Change them freely; the
shape above is what this ADR is defending.

## Considered options

**A JWT in memory with a refresh token in a cookie** (rejected, decision 1). This is the
answer most ft_transcendence teams reach for, which is exactly why it is written down here.
It buys origin-independence we don't want — we're behind one proxy regardless — and charges
for it three times: hand-written token passing into the socket handshake, a
refresh-then-reconnect dance for a token that expired while the socket was down, and a
denylist for revocation, which is the session table we would have just avoided building. At
three developers and six weeks, it is the more expensive option that solves a problem we
don't have.

**A JWT in `localStorage`** (rejected, decision 1). Readable by any XSS, in a product whose
feed renders Student-authored **Posts**.

**Denormalising the role onto the session row** (rejected, decision 5). Saves a join and
costs freshness. The advanced-permissions module is short a roles-management surface, and its
demo is an Admin changing a role and the app behaving differently *at once*; a stale role
claim turns that into a logout-and-back-in.

**Re-validating the session on every socket event** (rejected, decision 8). Correct, and a
database read per chat message.

## Consequences

- **The deployment shape is now partly decided.** TLS terminates at one proxy and the socket
  is reached as `wss` on the same origin. What remains open there is local development:
  `http://localhost` is treated as a trustworthy origin for this cookie contract, so the
  `Secure` cookie is set and sent there — but an **HTTP** dev setup on a LAN IP or a custom
  hostname is not a secure context and would not receive the `Secure` session cookie.

  > **Closed by ADR-0004 decision 5, and narrowed further on 2026-09-20.** Local development is
  > not open: `http://localhost` is a contract, not a default. As of 2026-09-20 **LAN access is
  > out of scope on both paths** — the production command is no longer the escape hatch decision 5
  > originally offered — and ADR-0004 decision 7 now publishes the proxy on `127.0.0.1` only, so
  > the contract is enforced by the binding. The mechanism this bullet names is unchanged and is
  > still the reason.

  > **Completed by ADR-0004 on 2026-09-20 — each path now has its own structural binding.**
  > Decision 7's `127.0.0.1:8443` and `127.0.0.1:8080` bindings enforce production locality;
  > the dev overlay separately publishes nginx on `127.0.0.1:8081`, making
  > `http://localhost:8081` the supported development origin. The production socket uses
  > `wss`; the developer-only HTTP overlay uses same-origin `ws` and HMR through nginx.
- **A Session entity enters the data model**, owned by nobody's feature slice — it is
  infrastructure that every slice reads through.
- **Presence is process-local and not durable.** A backend restart reads every Student as
  offline until they reconnect. Recorded in `CONTEXT.md` as accepted, not a defect; a shared
  presence store would be the fix, and it is scope creep while there is exactly one backend
  container.

  > **Completed 2026-09-19 by the ticket-to-record audit, and one thing ruled out.** Two details
  > settled on [#5](https://github.com/ahmadmnsur/ft_transcendence/issues/5) never reached any
  > record: a Student holds Presence **while at least one connection is live**, so multiple tabs
  > are a connection count rather than a boolean; and **offline is broadcast after a 20-second
  > grace window**, so a reload does not flicker a Student out to their friends. Both are
  > engineering defaults in the sense decisions 3, 4 and 10 are — the shape is what matters, not
  > the number. `CONTEXT.md` now carries the first.
  >
  > **There is no `last_seen_at`, deliberately.** Same shape as ADR-0004 decision 10's absent
  > `SESSION_SECRET`, and recorded for the same reason: a reader who finds the column named
  > elsewhere would assume it mattered. It was asserted by #5, #10 and #13 and by one clause of
  > ADR-0014, every time citing *this* ADR, which has never mentioned it. It contradicts
  > `CONTEXT.md`'s "live state, **never a record**" and its `_Avoid_: last seen`, and ADR-0014's
  > own entity set excludes it by name ("no Presence column"). `document/en.subject.md:598` asks
  > for **online status** and nothing else, so the column earns no module point, has no consumer
  > anywhere in the model, and would put a timestamped record of every Student's habits into the
  > Privacy Policy for a profile line neither source asks for. **Presence is whether a Student is
  > online now; when they were last online is not recorded at all.**
- **Whoever settles moderation depth inherits decision 6**, and should wire the moderation
  **Suspension** into session deletion rather than inventing a second mechanism.
- **Decision 9 is a rule to hold, not a fact to observe.** The pressure to put a privileged
  action on the socket "because it's already open" will arrive during implementation; giving
  in re-creates a second authorization path that nothing else in the system checks.
- **The public API cannot use this credential.** A cookie is a browser mechanism; a script or
  external consumer has no session to present, so the public-API module needs a credential of
  its own. That question is now on the map.

  > **Closed by removing the module, not by answering it.** The module-claim decision dropped
  > the public API — the most expensive claim on the list — and OAuth 2.0 plus additional-browser
  > support replaced its 2 points, which ruled
  > [#12](https://github.com/ahmadmnsur/ft_transcendence/issues/12) out of scope. With no public
  > API there are no non-browser consumers to authenticate. **This ADR needed no amendment and got
  > none: the session cookie is the product's only credential**, which is a simplification rather
  > than a gap. OAuth later added a second way to *establish* a session and never a second
  > credential to carry one (ADR-0004's module-claim amendment).
