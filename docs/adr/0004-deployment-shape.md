# Deployment: three containers behind one nginx proxy, localhost-only, self-signed TLS

> **Amended 2026-09-19 — read the section at the end before implementing `.env.example`.**
> The module-claim decision claimed OAuth 2.0, which falsifies one sentence of **decision 9**
> and adds two variables. Decision 9's text below stands as originally written.

The subject's entire requirement for deployment is `document/en.subject.md:314` — a
containerisation solution (Docker, Podman, or equivalent) that runs with a **single
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

> **Qualified 2026-09-20 — the portability claim above is too broad.** The deployment
> contract is a clean clone using the supported Docker Compose setup, at
> `https://localhost:8443`; "deployment" means its single command works from that clone.
> A container runtime alone does not establish compatibility with the Compose and
> host-networking requirements below. The subject permits Podman or equivalent; this
> record neither rules them out nor establishes that they satisfy those requirements.

This ADR exists mostly to answer four questions a future reader will otherwise ask: why
there is no public deployment, why the certificate is self-signed, why the port is not 443,
and why there is no `SESSION_SECRET`.

## The decisions

1. **Three services:** **`proxy`** (nginx), **`api`** (NestJS), **`db`** (Postgres).
   Microservices are out of scope and a fourth container for static files would only front
   files the proxy already serves.

2. **The proxy is what makes single origin structural.** ADR-0003 requires the bundle, the
   HTTP API and the socket.io endpoint to share one scheme, host and port; with a proxy in
   front, that is a property of the topology rather than something the application has to
   remember to arrange. `/` is static, `/api` and `/socket.io` are proxied to `api`, and the
   socket is reached as `wss` on the same origin, never on a port of its own.

   > **Scoped 2026-09-20 — `wss` describes the supported deployment path.** Both `make up`
   > and bare `docker compose up --build` expose the application at
   > `https://localhost:8443`, so browser-to-backend traffic and the socket satisfy
   > `document/en.subject.md:383`. Decision 5's plain-HTTP overlay is developer tooling,
   > not the deployment path used for evaluation; there the same-origin socket and HMR
   > upgrades use `ws` behind the dev proxy.

   > **Hardened by ADR-0003 decision 7 on 2026-09-20.** Browser Socket.IO uses WebSocket
   > transport only; Engine.IO HTTP long-polling fallback is disabled. nginx preserves the
   > `Origin` header and WebSocket upgrade on `/socket.io`, and the API's Engine.IO admission
   > gate accepts the connection only when `Origin` exactly matches the path's configured
   > `PUBLIC_ORIGIN`: `https://localhost:8443` for the base path or
   > `http://localhost:8081` for the development overlay. This is still one-origin routing;
   > it adds no origin and no environment variable.

   > **Upload envelope extended 2026-09-22 by ADR-0009.** nginx's
   > [documented default](https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size)
   > `client_max_body_size` is 1 MiB, which would reject both a valid 2 MiB Avatar and a valid
   > 5 MiB Evidence file before NestJS could apply the product rule. The locations proxying those
   > upload routes set the request limit explicitly to **6 MiB**. That is a transport envelope for
   > one file plus multipart framing, not a new file cap: the application remains authoritative at
   > 2 MiB for Avatar and 5 MiB for Evidence, and a maximum-size Evidence upload must reach it.

3. **The React bundle is built in a multi-stage build and served by the proxy** in
   production. NestJS serving its own static files and terminating TLS was the two-container
   alternative; it makes TLS, caching and compression application concerns and couples a
   certificate swap to an application restart.

4. **Development keeps the proxy and gains HMR.** A dev overlay points `/` at the Vite dev
   server with websocket upgrade, so dev is single-origin too. The obvious alternative —
   Vite on `:5173`, API on `:3000` — is split-origin and ADR-0003 forbids it. The overlay
   only overrides; it never duplicates the base Compose file.

   > **Settled 2026-09-20 — the Vite dev server runs on the host, not in a container.** This
   > decision named the dev server without saying where it runs, and **decision 1 fixes the
   > base model at three services**. Rather than add a fourth, the dev server is a **host
   > process** the developer runs alongside the stack. The overlay's nginx reaches it through
   > the **host gateway** — `host.docker.internal`, which on Linux needs an
   > `extra_hosts: ["host.docker.internal:host-gateway"]` entry on the `proxy` service — and
   > proxies both `/` and the HMR websocket upgrade to it, so the browser still sees exactly
   > one origin. **The host Vite process is not a Compose service and does not change the
   > three-service base model** — no service is added to either Compose file, so the overlay still only overrides and never duplicates the base.
   >
   > The host Vite process must listen on the host address reachable through `host.docker.internal`; the development setup must not expose the Vite server as a separately reachable LAN service.
   >
   > **Specified 2026-09-20 — choose and verify the bind address for the actual setup.**
   > On native Linux Docker Engine with a host-side bridge, set Vite's `server.host` (or
   > `--host`) explicitly to the host-side bridge address used by `proxy`'s
   > `host.docker.internal` mapping, after verifying it is assigned to the host.
   > Docker's `host-gateway` defaults to the default bridge address but can be overridden;
   > neither a fixed IP nor the Compose network's gateway may be assumed. Binding only to
   > `127.0.0.1` does not accept connections addressed to that bridge IP.
   > This is not a universal interface prescription: Docker Desktop's bridge is inside a VM,
   > and other networking arrangements require a verified host binding appropriate to them.
   > Do not fall back silently to `0.0.0.0`, `::` or `--host` without an address. Any wildcard
   > binding requires explicit host firewall restrictions that prevent LAN access to Vite.
   > The infrastructure slice must document the bind command and any required restrictions,
   > and verify both nginx-to-Vite HTTP/HMR reachability and absence of direct LAN access
   > to Vite; binding a bridge address alone is not proof of isolation on a routed LAN.
   > See [Docker's host-gateway configuration](https://docs.docker.com/reference/cli/dockerd/#configure-host-gateway-ip),
   > [Docker Desktop networking](https://docs.docker.com/desktop/features/networking/), and
   > [Vite's `server.host`](https://vite.dev/config/server-options.html#server-host).
   >
   > ⚠️ **`make dev` does not start it.** That target brings up base plus overlay only, so the
   > host `vite` process is a separate step the infrastructure slice must document in the
   > README. Recorded rather than fixed.

5. **Development is `http://localhost`, and that is a contract, not a default.**
   *(Clarified 2026-09-20: "`http://localhost`" here names the localhost development
   host/origin family, not port 80 — the concrete supported development origin, specified
   later in this decision, is `http://localhost:8081`.)* Chrome
   treats `http://localhost` as a trustworthy origin, so the `Secure` cookie from ADR-0003
   decision 1 is set and sent there. An **HTTP** dev setup on a LAN IP or a custom hostname
   would not receive the `Secure` session cookie, so the README states localhost as a rule.
   **LAN access is out of scope, so the README states localhost as the only supported development origin.**

   > **Corrected 2026-09-20 — LAN access is out of scope, and the last sentence no longer
   > holds.** The escape hatch above — *"anyone needing LAN access runs the production
   > command"* — is withdrawn. **Both development and production are accessed through
   > localhost**, and a setup on a LAN IP or a custom hostname is outside the deployment
   > contract on either path, not merely on the HTTP overlay. The mechanism above is
   > unchanged and is still the reason: over plain **HTTP**, only `localhost` and loopback are
   > treated as trustworthy origins, so the `Secure` cookie is dropped anywhere else. (An
   > HTTPS dev origin would carry it — that path is simply out of scope, not broken.)
   > **Decision 7's loopback binding is what makes this structural** rather than advisory.

   > **Clarified 2026-09-20 — the correction's referent is historical.** In the correction
   > above, "the last sentence" and "the escape hatch above" name the sentence as originally
   > written, not the active replacement immediately before it. The quoted sentence remains
   > only as evidence of the withdrawn rule.

   > **Specified 2026-09-20 — the dev proxy has its own loopback-only port.** The overlay
   > publishes nginx on **`127.0.0.1:8081`**, so the supported development origin is
   > **`http://localhost:8081`**. The overlay sets the `api` container's `PUBLIC_ORIGIN` to
   > that value; the base path uses `https://localhost:8443`. This adds no environment entry:
   > `HTTP_PORT` and `HTTPS_PORT` remain the two production ports. The browser still reaches
   > Vite, the API and HMR only through nginx, and the host Vite process remains a separate
   > process that `make dev` does not start. Decision 7 enforces production locality; this
   > overlay binding enforces development locality.

6. **TLS terminates at the proxy with a self-signed certificate generated at image build.**
   No key is ever committed. The evaluator clicks through one interstitial. `mkcert` was the
   tempting alternative and requires installing a local CA into the evaluator's trust store,
   which adds a machine-level trust setup step that the self-signed certificate avoids — a
   large imposition to save one click. Caddy's `tls internal` requires its internal CA to be
   trusted by the evaluator's browser or operating system to avoid the trust warning, and
   adds a tool the team would have to explain at defense.

   > **Clarified 2026-09-20 — the private key can exist inside the resulting local image.**
   > The certificate and private key are build artifacts of the local image, not repository secrets; the image must not be published or reused as a shared credential-bearing artifact.

7. **The proxy binds `8443`, with `8080` listening only to redirect to it.** Publishing host
   port 443 may require elevated host privileges or configuration under rootless runtimes,
   while `8443` does not. The subject sets no port requirement at all, and `Secure` cookies
   are indifferent to port number, so the cost is an uglier URL and the gain is one fewer
   class of "works on my machine".

   > **Narrowed 2026-09-20 — both ports are published on loopback only.** The proxy
   > publishes HTTPS on **`127.0.0.1:8443`** and the redirect listener on
   > **`127.0.0.1:8080`**, not on every interface. The port numbers, the origin string
   > `https://localhost:8443` and every argument above are unchanged; what is added is that
   > **decision 5's localhost-only contract is now enforced by the binding** instead of
   > being left to the caller. ⚠️ This names the two production ports only — the dev
   > overlay's own plain-HTTP port (decision 4) is not addressed here.

   > **Completed 2026-09-20 — the development port is now addressed by decision 5.** The
   > warning above records the earlier gap. The overlay publishes nginx on
   > **`127.0.0.1:8081`**; the production bindings remain exactly
   > **`127.0.0.1:8443`** and **`127.0.0.1:8080`**.

8. **`make up` is the single command, and bare `docker compose up --build` must also work
   end-to-end.** The Makefile carries convenience targets (`dev`, `down`, `seed`, `logs`)
   and is never a hiding place for required setup. Because `.env` is gitignored, a clean
   clone has none, and an evaluator who must hand-write one was never running a single
   command: `.env.example` therefore carries **working development defaults** and `make up`
   copies it into place when `.env` is absent.

   > **Sharpened 2026-09-20 — the two boot paths are independent.** `make up` may
   > materialize `.env` as part of its documented setup, but bare `docker compose up --build`
   > must work from a fresh clone **without relying on anything the Makefile has created, or
   > on any command having been run first**. The Compose/configuration design therefore has
   > to supply whatever defaults or environment resolution the bare path needs on its own.
   > This closes the reading the sentence above invites — that bare Compose inherits the
   > `.env` copy — and it is the guard that keeps required setup out of the Makefile.
   > ADR-0008 decision 12 and ADR-0017 decision 10 both rest on that guard.
   >
   > **What that obliges, concretely:** the base Compose configuration must remain
   > **self-sufficient when `.env` is absent** — every variable required for **Compose
   > interpolation** must have a Compose-level default (for example `${VAR:-default}`) or
   > otherwise be resolved without `.env`. An optional `env_file` may additionally supply
   > **container** environment variables, but it must not be relied on to satisfy Compose
   > interpolation. And **the Makefile must not be required to create configuration before
   > the bare Compose path can start**: `make up` may create `.env`, bare
   > `docker compose up --build` must work from a fresh clone without it, and the Makefile
   > never hides required setup.

   > **Resolved 2026-09-20 — the two paths use the same ordered environment sources.** Each
   > service that needs container configuration loads committed `.env.example` first as the
   > required `env_file`, then local `.env` as an optional later `env_file`; later values
   > override earlier ones. The supported Docker Compose setup must therefore support
   > `env_file.required: false` (Compose 2.24 or newer). `.env.example` supplies the working,
   > throwaway localhost defaults for a bare clean-clone boot; gitignored `.env` is the only
   > place for local or shared-use credential overrides. `make up` still materializes `.env`
   > from the example when absent, while bare Compose simply ignores the absent optional file.
   > This supplies **container** variables only. Every value used while Compose parses the
   > model still needs its own `${VAR:-default}` or another `.env`-independent resolution,
   > exactly as the paragraph above requires. No variable is added to decision 9's list.

9. **`.env.example` holds** `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
   `DATABASE_URL`, `NODE_ENV`, `PUBLIC_ORIGIN`, `HTTPS_PORT`, `HTTP_PORT`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD` — with a header comment saying these are development defaults and the
   admin password must be changed for any shared use. This project has no third-party
   secrets to hold.

   > **Consolidated 2026-09-20 — the authoritative list is fifteen entries, and it is here.**
   > The ten above are what this decision settled; five were added by three later decisions,
   > and until now a writer of `.env.example` had to assemble them from the narration below.
   > The full set:
   >
   > `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`, `NODE_ENV`,
   > `PUBLIC_ORIGIN`, `HTTPS_PORT`, `HTTP_PORT`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   > `FT_OAUTH_CLIENT_ID`, `FT_OAUTH_CLIENT_SECRET`, `MODERATOR_EMAIL`, `MODERATOR_PASSWORD`,
   > `SEED_STUDENT_PASSWORD`.
   >
   > The header comment widens with the list: the defaults are development defaults **where
   > applicable**, and **staff credentials must be changed for any shared use**. The OAuth
   > pair is the deliberate exception — it ships **empty**, and the platform must stay fully
   > usable with OAuth unconfigured. `SEED_STUDENT_PASSWORD` is a development-only credential
   > shared by all thirty seeded Students, never a production one, and carries the same
   > change-it warning. No third-party secret beyond `FT_OAUTH_CLIENT_SECRET` exists.
   >
   > **Two later decisions add four entries.**
   > **Corrected 2026-09-20 — it is three later decisions and five entries.** The headline
   > above undercounts both, because it was written before ADR-0017 landed and the count was
   > never revisited. The additions are `FT_OAUTH_CLIENT_ID` and `FT_OAUTH_CLIENT_SECRET`
   > (the module-claim amendment at the end of this ADR), `MODERATOR_EMAIL` and
   > `MODERATOR_PASSWORD` (**ADR-0008 decision 12**), and `SEED_STUDENT_PASSWORD`
   > (**ADR-0017**) — **three decisions, five entries**, which is exactly what carries this
   > decision's ten to the fifteen consolidated above. The narration that follows already
   > names all three decisions; only this headline was left at the old count.
   > **Also corrected 2026-09-20:** this sentence originally continued with
   > "...and this is the complete current list". It was not — ADR-0017 later added a
   > fifteenth. The consolidated list above is authoritative; what follows is kept as the
   > historical narration of how the list accumulated, not as a second source of truth.
   >
   > The module-claim amendment at the end of this ADR adds `FT_OAUTH_CLIENT_ID` and
   > `FT_OAUTH_CLIENT_SECRET`, which ship **empty**. **ADR-0008 decision 12 adds
   > `MODERATOR_EMAIL` and `MODERATOR_PASSWORD`** for the bootstrap Peer Moderator, explicitly
   > "on exactly the pattern decision 9 set" — so unlike the OAuth pair they **do** ship with
   > working development defaults, decision 8's one-command clean clone still holds, and the
   > warning this decision attaches to `ADMIN_PASSWORD` extends to them. Recorded here because
   > decision 9 is what anyone writing `.env.example` reads, and until this note the moderator
   > pair lived only in ADR-0008. **ADR-0017 adds `SEED_STUDENT_PASSWORD`** shared by all thirty
   > seeded Students — without it an evaluator can reach the platform only as staff, and the
   > Student view is where the product lives.

10. **There is no `SESSION_SECRET`, deliberately.** ADR-0003 decision 1 makes the session id
    opaque with the database row as the authority, so there is nothing to sign. Recorded
    because "every app has one" is a reflex, and a variable that does nothing is worse than
    no variable: a future reader would assume it mattered.

11. **Boot is: wait on the `db` healthcheck, run migrations, run an idempotent seed.** The
    seed creates exactly one bootstrap **Admin** from `.env`. Without it a fresh machine
    produces a platform where nobody can open a **Round**, so there is no **Match** and
    nothing to demonstrate.

    > **Clarified 2026-09-20 — "from `.env`" describes the original `make up` path, not the
    > seed's only source.** The seed reads the resolved container environment. Bare Compose
    > receives its defaults from `.env.example`; when local `.env` exists, its later
    > `env_file` entry overrides those values. The bootstrap Admin exists on both boot paths.

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

**A public deployment on a VPS with Let's Encrypt** (rejected, preamble).
It would remove the interstitial and give mentors a URL. It also adds a domain, DNS, renewal,
production secret handling and a second environment that must stay working for six weeks, for
zero points, against a schedule where time is the binding constraint and hosting is not
graded.

**Two containers, NestJS serving static files and terminating TLS** (rejected, decision 3).
Saves a container, charges for it by moving TLS, caching and compression into the
application and by making single origin a thing the app arranges rather than a fact about the
topology.

**`mkcert`, and Caddy's `tls internal`** (rejected, decision 6). Both were live options and
both trade one click for either a root CA installed on the evaluator's machine or an
unfamiliar tool in the stack.

**A single Compose file with no dev overlay** (rejected, decision 4). Simpler and honest
about dev/prod parity, but it charges a container rebuild for every one-line change across
six weeks and three developers.

## Consequences

* **The pre-defense checklist gains three items**: run the production command from a clean
  clone; expect the self-signed interstitial; and **verify the console is free of errors
  after accepting the certificate**. The third is a check, not an assumption — `:316`-`:318`
  makes a clean console mandatory and an untrusted certificate is the most likely source of
  a violation.
* **The README is now on the critical path**, and carries more than this decision: `:1242`
  wants prerequisites and step-by-step instructions, and II.1.1 wants the team roster and a
  Project Management section. `README.md` does not exist yet.
* **The `.env.example` defaults are real credentials for a throwaway database.** Anyone
  running this where others can reach it must change `ADMIN_PASSWORD`, which is why the file
  says so at the top. *(**Widened 2026-09-20**: and `MODERATOR_PASSWORD` and
  `SEED_STUDENT_PASSWORD`, on decision 9's consolidated list. ADR-0008 d12 and ADR-0017 each
  extended this warning to the entry they added; this is the first time all three are named
  in one place.)*
* **Application code must not duplicate the configured origin.** `PUBLIC_ORIGIN` is the single
  configuration source for the supported localhost origin, so scheme and port live in one
  place; hardcoding `https://localhost:8443` anywhere defeats it.

  > **Clarified 2026-09-20 — one value is resolved per Compose path.** The base path sets
  > `PUBLIC_ORIGIN=https://localhost:8443`; the dev overlay overrides it with
  > `PUBLIC_ORIGIN=http://localhost:8081`. Application code still reads one source, and no
  > callback variable is introduced. Whether one 42 OAuth application can register both
  > exact redirect origins remains the factual question owned by issue #26.

  > **Resolved 2026-09-21 by issue #26 — yes, one application can register both.** `redirect_uri`
  > on a 42 application is stored as a single whitespace/newline-delimited field (the platform is
  > a Doorkeeper OAuth2 provider); each entry is validated and matched independently, so
  > `https://localhost:8443` and `http://localhost:8081` can both sit on one registration.
  > Matching is **exact string comparison** (RFC 6749 §3.1.2.3) — the RFC 8252 §7.3 loopback-port
  > exception applies only to a numeric loopback IP, not the hostname `localhost`, so each
  > registered `localhost` origin still needs its port to match exactly, and non-default ports are
  > otherwise unrestricted. **This is a Doorkeeper/RFC-level inference, not a 42-confirmed fact**:
  > 42's own documentation and the live application-registration form are both behind a 42 login
  > and could not be reached. One question stays open — whether 42's deployment permits plain
  > `http://` for a `localhost` redirect URI, since Doorkeeper's own default rejects non-HTTPS
  > redirect URIs outside development and 42's override (if any) is exactly what the login wall
  > hides. Full findings and citations: `docs/research/42-oauth-redirect-uris.md`. Fed to
  > [#24](https://github.com/ahmadmnsur/ft_transcendence/issues/24) as an input to its
  > who-registers-the-application question.
* **This decision earns no module points and must not grow.** The four infrastructure
  majors are out of scope, and the pull to add monitoring, a WAF or a second environment
  because the Compose file is already open is the thing this ADR is meant to stop.

## Not settled by this decision

* **The content of the Privacy Policy and Terms of Service pages.** Their location is
  settled — SPA routes behind footer links, per `:320`-`:330` — but what they say and who
  writes them is a separate decision, and inadequate pages are grounds for project rejection
  (`:336`). **Owned by** [**Settle the Privacy Policy and Terms of Service content**](https://github.com/ahmadmnsur/ft_transcendence/issues/13),
  which ADR-0014 unblocked and supplied with its subject matter — that ADR is the exhaustive
  list of personal data the platform holds.

* **What fixture data makes every claimed module demonstrable.** Decision 11 settles the
  mechanism and the bootstrap Admin only; the demo strategy is still open.

  > **Corrected 2026-09-20 by ADR-0017:** the demo strategy is now settled. The seed drives the
  > real write paths rather than writing end-state rows: four closed Rounds, 62 Matches,
  > 46 Reviews, four Reflection Prompts and a social graph, with the platform left **idle**
  > so the demo opens the fifth Round on stage. It stays on decision 11's boot path. See the
  > note on decision 11 for what idempotence now means, and on decision 9 for the
  > `SEED_STUDENT_PASSWORD` it adds.

## Amended by the module-claim decision (2026-09-19)

[Lock the claimed module list](https://github.com/ahmadmnsur/ft_transcendence/issues/7)
claimed **OAuth 2.0** (`document/en.subject.md:620`) as a module. **Decisions 1-8, 10 and 11
stand exactly as written**; this section records only what changed, following ADR-0002's
precedent of extending a record rather than rewriting it.

> **Scope note added 2026-09-20.** *"Stand exactly as written"* describes what **this amendment**
> touched on 2026-09-19 — decision 9 and nothing else. It is not a claim that those decisions are
> untouched since: decisions **5**, **7** and **8** each gained a dated correction on 2026-09-20,
> visible above. None of them bears on OAuth.

### What changed in decision 9

**Its closing sentence — "This project has no third-party secrets to hold" — is no longer
true.** The 42 intranet application's client credentials are the project's first third-party
OAuth configuration: `FT_OAUTH_CLIENT_ID` identifies the registered application, while
`FT_OAUTH_CLIENT_SECRET` is the confidential secret.

`.env.example` gains two entries:

* `FT_OAUTH_CLIENT_ID`
* `FT_OAUTH_CLIENT_SECRET`

**The 42 intranet labels these `UID` and `SECRET`** on the application page. The mapping is
recorded here because a name mismatch between a dashboard and an env file is exactly where a
transcription error happens, and the resulting failure — a valid-looking credential that is
silently rejected — is expensive to debug.

**No callback variable is added.** The redirect URI is derived from `PUBLIC_ORIGIN`, per this
ADR's own consequence that application code must not duplicate the configured origin. The
route's path is not settled here; whatever it becomes, **the URI registered on the 42 intranet
must match the derived value exactly**, or the flow fails at its last hop.

### The tension with decision 8, and the rule that resolves it

Decision 8 requires `.env.example` to carry **working development defaults**, so a clean clone
runs with a single command and an evaluator never hand-writes a file. **OAuth credentials
cannot have working defaults**: they belong to an application someone registered under their
own 42 account, and `FT_OAUTH_CLIENT_SECRET` is confidential.

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

* **How a 42 identity maps to a Student**, and what happens when a 42 login arrives for an
  email that already holds a password account — link, reject, or create a duplicate.
* **Whether email-and-password signup stays open** to new Students once 42 OAuth exists.
* **Who registers the application**, and whether one shared app serves all three developers or
  each registers their own against their own `PUBLIC_ORIGIN`.

> **All three are now owned by**
> [**Settle how a 42 identity maps to a Student**](https://github.com/ahmadmnsur/ft_transcendence/issues/24),
> opened by the ticket-to-record audit on 2026-09-19 after finding that no ticket had picked them up
> — the same gap ADR-0010 decision 7 and ADR-0015 decision 1 each closed for their own module. One
> of the three options is already foreclosed: `Student.email` is unique and survives a **Removal**
> (ADR-0008 d7), so "create a duplicate" cannot happen, and the choice is link or reject.

> **Corrected 2026-09-20 — email-and-password signup is not open to decision.** The subject
> requires Students to be able to sign up and log in and makes email-and-password the minimum
> authentication method (`document/en.subject.md:375`-`:379`), so password signup stays open
> when OAuth is configured. Issue #24 still owns how a 42 identity maps to a **Student** and
> whether an unmatched 42 identity may create a Student through OAuth or must first use the
> password-signup path; it also owns who registers the OAuth application. The "all three"
> ownership sentence above is therefore historical: two questions remain, and the identity
> question has gained this narrower account-creation branch.
