# Deployment: three containers behind one nginx proxy, localhost-only, self-signed TLS

> **Amended 2026-09-19 — read the section at the end before implementing `.env.example`.**
> The module-claim decision claimed OAuth 2.0, which falsifies one sentence of **decision 9**
> and adds two variables. Decision 9's text below stands as originally written.

The subject's entire requirement for deployment is `document/en.subject.md:314` — a
containerisation solution (Docker, Podman, or equivalent) that runs with **a single
command** — plus HTTPS for every browser-to-backend connection (`:383`), credentials in a
gitignored `.env` with a committed `.env.example` (`:371`), and a console free of warnings
and errors in the latest Chrome (`:316`-`:318`). It asks for nothing else. In particular it
never mentions a public URL, a domain, or a port: `localhost`, `hostname`, `domain name`,
`publicly accessible` and `port` have **zero occurrences** in the document, and exactly one
line contains "deploy" (`:314`).

We read that literally. **There is no deployed environment.** The project runs on any
machine with a container runtime, at `https://localhost:8443`, and "deployment" means the
single command works from a clean clone. Hosting earns zero module points — the DevOps
majors are out of scope — so a public host would buy a domain, DNS, certificate renewal,
real secret management and a second environment to keep alive for six weeks, against
nothing the subject asks for.

This ADR exists mostly to answer four questions a future reader will otherwise ask: why
there is no public deployment, why the certificate is self-signed, why the port is not 443,
and why there is no `SESSION_SECRET`.

## The decisions

1. **Three services: `proxy` (nginx), `api` (NestJS), `db` (Postgres).** Microservices are
   out of scope and a fourth container for static files would only front files the proxy
   already serves.

2. **The proxy is what makes single origin structural.** ADR-0003 requires the bundle, the
   HTTP API and the socket.io endpoint to share one scheme, host and port; with a proxy in
   front, that is a property of the topology rather than something the application has to
   remember to arrange. `/` is static, `/api` and `/socket.io` are proxied to `api`, and the
   socket is reached as `wss` on the same origin, never on a port of its own.

3. **The React bundle is built in a multi-stage build and served by the proxy** in
   production. NestJS serving its own static files and terminating TLS was the two-container
   alternative; it makes TLS, caching and compression application concerns and couples a
   certificate swap to an application restart.

4. **Development keeps the proxy and gains HMR.** A dev overlay points `/` at the Vite dev
   server with websocket upgrade, so dev is single-origin too. The obvious alternative —
   Vite on `:5173`, API on `:3000` — is split-origin and ADR-0003 forbids it. The overlay
   only overrides; it never duplicates the base Compose file.

5. **Development is `http://localhost`, and that is a contract, not a default.** Chrome
   treats `http://localhost` as a trustworthy origin, so the `Secure` cookie from ADR-0003
   decision 1 is set and sent there. Any dev setup on a LAN IP or a custom hostname
   **silently drops the session cookie**, so the README states localhost as a rule. Anyone
   needing LAN access runs the production command, not the overlay.

6. **TLS terminates at the proxy with a self-signed certificate generated at image build.**
   No key is ever committed. The evaluator clicks through one interstitial. `mkcert` was the
   tempting alternative and needs `sudo` on every machine, including the evaluator's, to
   install a root CA into their trust store — a large imposition to save one click. Caddy's
   `tls internal` produces the same untrusted-root interstitial unless its root is installed,
   and adds a tool the team would have to explain at defense.

7. **The proxy binds `8443`, with `8080` listening only to redirect to it.** Binding
   privileged port 443 assumes a root-capable daemon, which nobody controls on a cluster
   machine: `:314` explicitly permits Podman, whose default installation is rootless. The
   subject sets no port requirement at all, and `Secure` cookies are indifferent to port
   number, so the cost is an uglier URL and the gain is one fewer class of "works on my
   machine".

8. **`make up` is the single command, and bare `docker compose up --build` must also work
   end-to-end.** The Makefile carries convenience targets (`dev`, `down`, `seed`, `logs`)
   and is never a hiding place for required setup. Because `.env` is gitignored, a clean
   clone has none, and an evaluator who must hand-write one was never running a single
   command: `.env.example` therefore carries **working development defaults** and `make up`
   copies it into place when `.env` is absent.

9. **`.env.example` holds** `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
   `DATABASE_URL`, `NODE_ENV`, `PUBLIC_ORIGIN`, `HTTPS_PORT`, `HTTP_PORT`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD` — with a header comment saying these are development defaults and the
   admin password must be changed for any shared use. This project has no third-party
   secrets to hold.

   > **Two later decisions add four entries, and this is the complete current list.** The
   > module-claim amendment at the end of this ADR adds `FT_OAUTH_CLIENT_ID` and
   > `FT_OAUTH_CLIENT_SECRET`, which ship **empty** and falsify the closing sentence above.
   > **ADR-0008 decision 12 adds `MODERATOR_EMAIL` and `MODERATOR_PASSWORD`** for the bootstrap
   > Peer Moderator, explicitly "on exactly the pattern decision 9 set" — so unlike the OAuth
   > pair they **do** ship with working development defaults, decision 8's one-command clean
   > clone still holds, and the warning this decision attaches to `ADMIN_PASSWORD` extends to
   > them. Recorded here because decision 9 is what anyone writing `.env.example` reads, and
   > until this note the moderator pair lived only in ADR-0008. **ADR-0017 adds a fifteenth**,
   > `SEED_STUDENT_PASSWORD`, shared by all thirty seeded Students — without it an evaluator can
   > reach the platform only as staff, and the Student view is where the product lives.

10. **There is no `SESSION_SECRET`, deliberately.** ADR-0003 decision 1 makes the session id
    opaque with the database row as the authority, so there is nothing to sign. Recorded
    because "every app has one" is a reflex, and a variable that does nothing is worse than
    no variable: a future reader would assume it mattered.

11. **Boot is: wait on the `db` healthcheck, run migrations, run an idempotent seed.** The
    seed creates exactly one bootstrap **Admin** from `.env`. Without it a fresh machine
    produces a platform where nobody can open a **Round**, so there is no **Match** and
    nothing to demonstrate.

    > **Extended by ADR-0008.** The seed also creates one bootstrap **Peer Moderator**, a
    > fully participating Student with **Skills**. Same argument, applied to the third role:
    > without it, demonstrating the per-role views costs minutes of a defense slot.

    Postgres uses a named volume; `make down` keeps data and a separate target wipes it.

    > **Sized by ADR-0017, and it is no longer small.** The seed now drives the real write paths
    > to produce four closed Rounds, 62 Matches, 46 Reviews and four Reflection Prompts, and
    > **stays on this boot path** — decision 8's rule that the Makefile is never a hiding place for
    > required setup is what keeps it here, since the fixture is what makes the claimed modules
    > demonstrable. **Idempotence now means "if any Round exists, skip"** rather than per-row
    > upserts.

12. **Kamel owns this slice in week 1, and it is a gate rather than parallel work.** Every
    vertical feature slice needs the single command working before it can start. The budget
    is roughly 3-4 days including the `README.md` "Instructions" section that `:1242`
    requires. The work earns zero module points, which is exactly why it is owned by name
    instead of being absorbed into a feature slice.

## Considered options

**A public deployment on a VPS with Let's Encrypt** (rejected, decision 1 and the preamble).
It would remove the interstitial and give mentors a URL. It also adds a domain, DNS, renewal,
production secret handling and a second environment that must stay working for six weeks, for
zero points, against a schedule where time is the binding constraint and hosting is not
graded.

**Two containers, NestJS serving static files and terminating TLS** (rejected, decision 3).
Saves a container, charges for it by moving TLS, caching and compression into the
application and by making single origin a thing the app arranges rather than a fact about
the topology.

**`mkcert`, and Caddy's `tls internal`** (rejected, decision 6). Both were live options and
both trade one click for either a root CA installed on the evaluator's machine or an
unfamiliar tool in the stack.

**A single Compose file with no dev overlay** (rejected, decision 4). Simpler and honest
about dev/prod parity, but it charges a container rebuild for every one-line change across
six weeks and three developers.

## Consequences

- **The pre-defense checklist gains three items**: run the production command from a clean
  clone; expect the self-signed interstitial; and **verify the console is free of errors
  after accepting the certificate**. The third is a check, not an assumption — `:316`-`:318`
  makes a clean console mandatory and an untrusted certificate is the most likely source of
  a violation.
- **The README is now on the critical path**, and carries more than this decision: `:1242`
  wants prerequisites and step-by-step instructions, and II.1.1 wants the team roster and a
  Project Management section. `README.md` does not exist yet.
- **The `.env.example` defaults are real credentials for a throwaway database.** Anyone
  running this where others can reach it must change `ADMIN_PASSWORD`, which is why the file
  says so at the top.
- **Nothing in the product may assume a fixed origin string.** `PUBLIC_ORIGIN` exists so the
  port and scheme live in one place; hardcoding `https://localhost:8443` anywhere defeats it.
- **This decision earns no module points and must not grow.** The four infrastructure
  majors are out of scope, and the pull to add monitoring, a WAF or a second environment
  because the Compose file is already open is the thing this ADR is meant to stop.

## Not settled by this decision

- **The content of the Privacy Policy and Terms of Service pages.** Their location is
  settled — SPA routes behind footer links, per `:320`-`:330` — but what they say and who
  writes them is a separate decision, and inadequate pages are grounds for project
  rejection (`:336`). **Owned by
  [Settle the Privacy Policy and Terms of Service content](https://github.com/ahmadmnsur/ft_transcendence/issues/13)**,
  which ADR-0014 unblocked and supplied with its subject matter — that ADR is the exhaustive list
  of personal data the platform holds.
- **What fixture data makes every claimed module demonstrable.** Decision 11 settles the
  mechanism and the bootstrap Admin only; the demo strategy is still open.

## Amended by the module-claim decision (2026-09-19)

[Lock the claimed module list](https://github.com/ahmadmnsur/ft_transcendence/issues/7)
claimed **OAuth 2.0** (`document/en.subject.md:620`) as a module. **Decisions 1-8, 10 and 11
stand exactly as written**; this section records only what changed, following ADR-0002's
precedent of extending a record rather than rewriting it.

### What changed in decision 9

**Its closing sentence — "This project has no third-party secrets to hold" — is no longer
true.** The 42 intranet OAuth application's credentials are the project's first third-party
secret, and the only one so far.

`.env.example` gains two entries:

- `FT_OAUTH_CLIENT_ID`
- `FT_OAUTH_CLIENT_SECRET`

**The 42 intranet labels these `UID` and `SECRET`** on the application page. The mapping is
recorded here because a name mismatch between a dashboard and an env file is exactly where a
transcription error happens, and the resulting failure — a valid-looking credential that is
silently rejected — is expensive to debug.

**No callback variable is added.** The redirect URI is derived from `PUBLIC_ORIGIN`, per this
ADR's own consequence that nothing in the product may assume a fixed origin string. The
route's path is not settled here; whatever it becomes, **the URI registered on the 42 intranet
must match the derived value exactly**, or the flow fails at its last hop.

### The tension with decision 8, and the rule that resolves it

Decision 8 requires `.env.example` to carry **working development defaults**, so a clean clone
runs with a single command and an evaluator never hand-writes a file. **OAuth credentials
cannot have working defaults**: they belong to an application someone registered under their
own 42 account, and they are secret.

The two entries therefore ship **empty**, and the tension resolves as a rule on the product
rather than on the file: **the platform must boot and be fully usable with OAuth
unconfigured.** Email-and-password is the mandatory baseline (`document/en.subject.md:377`);
OAuth is additive on top of it. An absent `FT_OAUTH_CLIENT_ID` hides or disables the 42
sign-in control and **must never be a boot failure or a runtime error**. Without this rule, an
evaluator running the single command from a clean clone meets a broken application — precisely
the outcome decision 8 exists to prevent.

### ADR-0003 is unaffected

Decision 1 of ADR-0003 — "No JWT anywhere in the product" — still holds, and a future reader
should not read OAuth as contradicting it. The token returned by 42 is used **once**,
server-side, to read the Student's identity, and is then discarded. What the browser receives
is the same opaque session id in the same httpOnly cookie, backed by the same session row.
**OAuth adds a second way to *establish* a session, never a second credential to *carry* one**,
so the single authorization path ADR-0003 defends survives intact.

### Not settled by this amendment

- **How a 42 identity maps to a Student**, and what happens when a 42 login arrives for an
  email that already holds a password account — link, reject, or create a duplicate.
- **Whether email-and-password signup stays open** to new Students once 42 OAuth exists.
- **Who registers the application**, and whether one shared app serves all three developers or
  each registers their own against their own `PUBLIC_ORIGIN`.

> **All three are now owned by
> [Settle how a 42 identity maps to a Student](https://github.com/ahmadmnsur/ft_transcendence/issues/24)**,
> opened by the ticket-to-record audit on 2026-09-19 after finding that no ticket had picked them up
> — the same gap ADR-0010 decision 7 and ADR-0015 decision 1 each closed for their own module. One
> of the three options is already foreclosed: `Student.email` is unique and survives a **Removal**
> (ADR-0008 d7), so "create a duplicate" cannot happen, and the choice is link or reject.
