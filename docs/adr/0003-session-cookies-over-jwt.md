# Session cookies over JWT, and a single authorization path

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

2. **One origin.** The React bundle, the HTTP API and the socket.io endpoint are served from
   the same scheme, host and port as the browser sees them, behind a single reverse proxy.
   This is a hard constraint on the deployment shape, not a preference — the cookie strategy
   collapses without it.

3. **argon2id for passwords**, via `@node-rs/argon2` (prebuilt binaries, so the container
   build needs no native toolchain), at the OWASP floor of m = 19 MiB, t = 2, p = 1. The
   salt is generated and embedded by the library, which is what satisfies "salted" at `:377`.

4. **Sliding expiry, 30 days of inactivity, renewed lazily.** `expires_at` is only rewritten
   when it is more than an hour old, so an authenticated request is not also a database
   write. Cookie `Max-Age` tracks `expires_at` so the two cannot disagree. There is no
   absolute cap.

5. **The session row holds `id`, `student_id`, `expires_at` — and not the role.** The
   **Admin** role is read from the Student row in the same query that resolves the session.

   > **Widened by ADR-0008.** There are now three roles, so what this query reads is **the
   > role**, not "the Admin role" — `STUDENT`, `PEER_MODERATOR` or `ADMIN`. The same query
   > also reads the **Suspension** and **Removal** flags, and **resolution fails if either is
   > set**. In principle no such session exists, since both sanctions delete every session;
   > the check costs one condition in a query already reading the Student row, and it is what
   > makes "suspended and removed are indistinguishable at the authentication layer" a rule
   > the code enforces rather than an intention.

6. **What kills a session:** logout deletes that row; a password change or a moderation
   block deletes *every* row for that Student. A **role change deletes nothing** — decision 5
   means it takes effect on the next request.

   > **Renamed by ADR-0008.** "Moderation block" here is now **Suspension**. ADR-0006 later
   > gave **Block** to the peer-to-peer act, and a peer Block must never delete anyone's
   > sessions. The mechanism is unchanged; only the word was wrong.

7. **The socket authenticates by the same cookie**, which same-origin socket.io replays on
   every handshake, including every reconnect. There is no token to pass, refresh, or
   re-present: the reconnect story is that there isn't one. A rejected handshake must stop
   the client retrying and send it to login, overriding socket.io's infinite reconnect.

8. **Deleting a Student's sessions force-disconnects their live sockets**, through the same
   in-memory registry that already backs **Presence**. Without this, a blocked Student keeps
   messaging over an already-authenticated socket.

9. **No privileged action is ever exposed over the socket.** Opening and closing a **Round**,
   publishing a **Reflection Prompt**, acting on reported content and user CRUD are all HTTP,
   where the role check from decision 5 lives. The socket carries **Presence** and 1:1 direct
   messages, nothing else.

10. **CSRF is answered by SameSite=Lax plus a JSON content-type requirement** on every
    mutation — a cross-site form cannot set `application/json` without a preflight that
    same-origin policy then blocks. Login and signup are throttled (5 attempts per 15
    minutes, keyed on IP and email) and fail with one generic message, so login cannot be
    used to enumerate accounts.

11. **Logout ships. Email verification and password reset do not.** Neither is mandated by
    either source; both are Version 2 under the standing "anything not shipped is Version 2"
    rule. Email verification in particular would put SMTP deliverability on the critical path
    of a live defense.

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
  browsers treat `http://localhost` as trustworthy, so `Secure` cookies work, but any dev
  setup on a LAN IP or custom hostname will silently drop the session cookie.
- **A Session entity enters the data model**, owned by nobody's feature slice — it is
  infrastructure that every slice reads through.
- **Presence is process-local and not durable.** A backend restart reads every Student as
  offline until they reconnect. Recorded in `CONTEXT.md` as accepted, not a defect; a shared
  presence store would be the fix, and it is scope creep while there is exactly one backend
  container.
- **Whoever settles moderation depth inherits decision 6**, and should wire "block" into
  session deletion rather than inventing a second mechanism.
- **Decision 9 is a rule to hold, not a fact to observe.** The pressure to put a privileged
  action on the socket "because it's already open" will arrive during implementation; giving
  in re-creates a second authorization path that nothing else in the system checks.
- **The public API cannot use this credential.** A cookie is a browser mechanism; a script or
  external consumer has no session to present, so the public-API module needs a credential of
  its own. That question is now on the map.
