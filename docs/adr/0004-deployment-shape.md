# Deployment: three containers behind one nginx proxy, localhost-only, self-signed TLS

> **Amended 2026-09-19 — read the section at the end before implementing `.env.example`.**
> The module-claim decision claimed OAuth 2.0, which falsifies one sentence of **decision 9**
> and adds two variables. Decision 9's text below stands as originally written.

> **Under revision 2026-09-30: the database moves to Supabase.**
> The team settled on 2026-09-30 that Supabase provides PeerConnect's database, file storage and
> login, with Socket.IO kept ([Map: PeerConnect moves to Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/85)).
> There is one team Supabase project, plus a local Supabase stack on each developer's machine for
> branch work; only code merged into `main` runs against the team project. The `.env` with real
> keys is handed to the evaluator at the defense, and `.env.example` gains every Supabase variable.
> What replaces the `db` service (decision 1), decision 9's list and the boot chain (decision 11),
> and whether both boot paths still hold (decision 8), is settled by
> [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101). There is still no public
> deployment of the application, and hosting it stays outside that map; but the team project is
> hosted infrastructure that must be kept available, since a free project with too little activity
> for a week is paused ([Find out what Supabase's free plan means for PeerConnect](https://github.com/ahmadmnsur/ft_transcendence/issues/89)).
> The text below is kept as written; [Write the Supabase ADR and annotate the ADRs it changes](https://github.com/ahmadmnsur/ft_transcendence/issues/102) records what the move changes.
>
> > **Recorded 2026-10-12 in [ADR-0019](0019-supabase-hosts-the-data-and-peerconnect-keeps-the-rest.md)**,
> > which sums up the move to Supabase and names which of this ADR's decisions carry its notes.

> **Settled 2026-10-03 by [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101): `make up` runs on the team
> project.** When `.env` holds the team project's values, `make up` runs PeerConnect on it: work on
> `main`, and the defense, where the evaluator is handed that `.env`. With no `.env`, or with the
> copy of `.env.example` that `make up` puts in its place, a **fallback** starts instead: Supabase's
> own Postgres, Auth, Storage and gateway inside Compose, with the local values in `.env.example`.
> The fallback keeps a fresh clone and bare `docker compose up --build` working (decision 8), and
> it is where branch work runs, under `make dev` and `make local`, which run the fallback
> whatever `.env` holds: of the targets that start a stack, only `make up` reads `.env`. Wrong,
> unusable or mixed values stop the
> boot and name the problem; the boot never switches to the fallback by itself. Decisions 1, 8, 9
> and 11 and the first Consequence carry a note each. One sentence above is narrowed: besides
> `main`, branch work that neither migrates nor writes data may run against the team project
> (decision 8's note).

> **Changed 2026-10-11 by [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100): the evaluator is no longer
> handed the `.env`.** The defense still runs on the team project, from a team member's own
> computer, and only the team holds the team `.env` (decision 9's note of that date). "The handed
> `.env`" in the notes below now names the team `.env` used at the defense.

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

> **Qualified 2026-09-30** (see the note at the top): "no deployed environment" still means no public
> deployment of the application. The shared Supabase project is hosted infrastructure, though, and a
> free project can pause; [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101) decides how it stays available.

> **Settled 2026-10-03 by [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101).** Kamel, the project's Owner, keeps it
> active and checks it before each defense. Only he can resume it: Ahmad stays a Developer. There is
> no keep-alive job and no paid plan. A paused project answers `540` on its Auth and Storage
> addresses, and the boot check, the boot chain's first step (decision 8's note), stops `make up`
> with that message. If it is paused on defense day anyway, the last resort is the fallback:
> `make local` (decision 8's note).

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

   > **Under revision 2026-09-30** (see the note at the top): the database moves to Supabase.
   > [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101) settles what replaces the `db` service.

   > **Settled 2026-10-03 by [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101): the fallback replaces `db`.**
   > `db` becomes Supabase's Postgres image, and three Supabase services join it:
   >
   > - **Auth**, given the five settings [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92) asks for as environment
   >   variables (`GOTRUE_DISABLE_SIGNUP`, `GOTRUE_PASSWORD_MIN_LENGTH`,
   >   `GOTRUE_EXTERNAL_EMAIL_ENABLED`, `GOTRUE_MAILER_AUTOCONFIRM`,
   >   `GOTRUE_AUDIT_LOG_DISABLE_POSTGRES`), so it behaves like the team project's;
   > - **Storage**, whose files live in a named volume;
   > - Supabase's **gateway**, which serves both under one `SUPABASE_URL` as the team project does,
   >   so the `api` has one code path.
   >
   > That makes six services, or seven if Storage still needs Supabase's REST service, which
   > Supabase's own Compose file makes it depend on; that is checked when it is built. They are
   > pinned to the versions in Supabase's own Docker setup. Studio, Realtime (Socket.IO stays), Edge
   > Functions, the image resizer and the pooler are left out. Only `proxy` publishes a port, so
   > nothing of the fallback is reachable from outside the machine.
   >
   > **The fallback's containers start on both targets and never read the team values.** They sit
   > unused when `.env` points at the team project. A team `.env` sets the `api`'s connection
   > values, `DATABASE_URL` and the `SUPABASE_*` entries, and the three passwords of decision 9's
   > note, never the fallback's own names such as `POSTGRES_PASSWORD`.
   >
   > **That separation is built, not inherited.** Supabase's own images read some of the `api`'s
   > names: Storage takes its database connection from `DATABASE_URL`, the gateway reads
   > `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`, and Auth falls back to `DATABASE_URL`
   > when `GOTRUE_DB_DATABASE_URL` is unset. Through the shared `env_file` chain a team `.env`
   > would reach them, and overriding a few names in a service's `environment:` would still leave
   > it every other team value. So **the fallback's services load `.env.example` alone, never
   > `.env`**, while under `make up` the `api` and `proxy` keep both: this narrows decision 8's
   > 2026-09-20 note, and so does the overlay of decision 8's note, under which the `api` and
   > `proxy` load `.env.example` alone too.
   > The gateway then reads the fallback's own `SUPABASE_*` keys from `.env.example`, and Storage's
   > and Auth's database URLs, which use their own roles, are written in each service's own
   > `environment:` as plain values, with no `${…}`: Compose fills `${…}` from the shell and
   > `.env`, never from `env_file`, so any `${…}` there would let `.env` change it. The two URLs
   > repeat `.env.example`'s `POSTGRES_PASSWORD`, because Supabase's Postgres image gives Storage's
   > and Auth's roles that password when it initializes, so the two files change together. The
   > fallback's values therefore come only from `.env.example` and `compose.yaml`, and `.env`
   > cannot change them, which suits a stack nothing outside the machine can reach. The build checks it: with a
   > team `.env` in place, `docker compose config` shows no team value in any fallback service.
   >
   > **The fallback's credentials are fixed, and `.env` is for the team values.** Under `make up`
   > the `api` still reads `.env` over `.env.example`, so a `.env` that changes `POSTGRES_*` and
   > `DATABASE_URL` together passes the rule below but points the `api` at a password the
   > fallback's database never read. The fallback runs under `make dev`, `make local` and
   > `make test`, which never read `.env`, or under `make up` with no `.env` or a copy of
   > `.env.example`, and step 4 of the check (decision 8's note) says so when it refuses the
   > fallback's database. Changing `POSTGRES_PASSWORD` in `.env` for shared use no longer applies:
   > shared use is the team project.
   >
   > So the fallback's `db` always initializes from `.env.example`'s password, a team `.env`
   > cannot leave the fallback unable to start, and the last resort above still works. The rule
   > that `DATABASE_URL` matches `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` applies to
   > the fallback alone.

   > **Settled 2026-10-04 by [Local Supabase fallback: Compose services, make targets, environment check and CI](https://github.com/ahmadmnsur/ft_transcendence/issues/121): six services.**
   > Storage v1.74.0 talks to Postgres directly and does not need Supabase's REST service, so it is
   > left out. With it, the committed publishable key could read and write tables in `public`
   > through `/rest/v1/`, while the team project was created with its Data API off.

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

   > **Logging bound 2026-09-23 by ADR-0018 d6.** The proxy's request log stays on, in nginx's
   > standard fields, and the Privacy Policy discloses it. No log, nginx's or the API's, may
   > contain a password, a cookie, a request body, message text or file contents. **Every
   > service's container log is capped with rotation in the Compose file**, so the policy can say
   > old entries are overwritten automatically; the cap's numbers are engineering defaults for
   > `/to-spec #1`. No service, port or environment variable is added.

   > **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §15.1; M12): every
   > service's container log uses the `json-file` driver with `max-size: 10m` and `max-file: 3`, set
   > once as a top-level `x-logging` anchor that each service references. The numbers stay
   > engineering defaults.

   > **Except the query string, 2026-09-23 (ADR-0018 d6's annotation).** The request log records
   > the path and the referring page without their query strings, so neither the 42 callback's
   > `code` and `state` nor search terms reach it. `/to-spec #1` sets the log format. What nginx's
   > error log may hold is open under ADR-0018's *Not settled*.

   > **Both set 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §3.9; M10, M11): a
   > custom `log_format` with query-stripped path and referrer, and no request-context error entry
   > written at all.

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
   >
   > **Clarified 2026-09-24 — project toolchain floor is `>= 2.24.4`.** The `2.24` above is the
   > narrow `env_file.required` capability floor (2.24.0), not the project floor. The dev overlay
   > uses the `!override` tag, which exists only from Compose 2.24.4 — the first docker/compose
   > release carrying compose-go's `!override` support — so `docs/spec.md` §3.3, §15.2, §17.5 read
   > `>= 2.24.4`.

   > **Both boot paths still hold, settled 2026-10-03 by [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101).** From a
   > fresh clone, `make up` and bare `docker compose up --build` boot on the fallback with
   > `.env.example`'s values, so nothing above moves. The copy of `.env.example` that `make up`
   > leaves as `.env` still selects the fallback. A `.env` holding the team project's values, later
   > in the same order of sources, points the `api` at the team project instead, under `make up`.
   > The fallback's services are one exception to that order: they load `.env.example` alone
   > (decision 1's note). The overlay below is the other: under `make local`, `make dev` and
   > `make test`, the `api` and `proxy` load it alone too.
   >
   > **Wrong values stop the boot and say which.** The check is the boot chain's **first step**,
   > before `prisma migrate deploy` (decision 11's note), so nothing touches a database before it
   > passes. In order, it checks that:
   >
   > 1. every value is present and well formed;
   > 2. the values name **one target**: `DATABASE_URL` and `SUPABASE_URL` both point at the
   >    fallback's services, or both carry the same project ref, in the pooler user
   >    `postgres.<ref>` and in `https://<ref>.supabase.co`. Compose layers `.env` over
   >    `.env.example` one variable at a time, so a `.env` that misses one value would otherwise run
   >    the database on one target and Auth and Storage on the other, each accepting its own values;
   > 3. Supabase Auth and Supabase Storage accept the keys. They come before the database because
   >    only their HTTP addresses answer `540` for a paused project; the pooler just refuses the
   >    connection;
   > 4. the database accepts `DATABASE_URL`. On the fallback, a refusal says to use `make dev` or
   >    `make local`, or to remove `.env` or replace it with a copy of `.env.example`, since the
   >    fallback's database never reads `.env` (decision 1's note).
   >
   > A failure ends the boot with the problem named, for example
   > `Supabase check failed: Auth rejected SUPABASE_SECRET_KEY (401)` or
   > `Supabase check failed: https://<ref>.supabase.co answered 540: the project is paused`. The
   > boot never falls back by itself: an evaluator who believes they are on the team project must
   > never be quietly on an empty local copy. To use the fallback on purpose, run `make local` or
   > `make dev`.
   >
   > **Of the targets that start a stack, only `make up` reads `.env`.** A small overlay gives the
   > `api` and `proxy` `.env.example`
   > alone with `!override`, the way `compose.dev.yaml` overrides the proxy's ports, and
   > `--env-file .env.example` keeps Compose's own `${…}` off `.env` too. Every other target that
   > starts a stack uses both, so the targets are:
   >
   > - **`make up`:** the production image, on `.env`'s target: the team project for `main` and the
   >   defense, and the fallback with no `.env`, so a fresh clone and bare
   >   `docker compose up --build` still work;
   > - **`make local`:** the production image, always on the fallback: destructive tests, the
   >   reset's local runs, and the last resort on defense day;
   > - **`make dev`:** the dev image with hot reload (decision 4), always on the fallback. This is
   >   where branches are coded, and it runs the dev boot chain, migrations and seed included;
   > - **`make test`:** the same files as `make dev`, `compose.yaml`, `compose.dev.yaml` and the
   >   overlay, with `--env-file .env.example`, since the suite needs the `api` dev container
   >   (below).
   >
   > Like the others, these targets are conveniences over Compose, and nothing required hides in
   > them. The rest: `make reset-team` reads `.env` too, to find the team project, and
   > `make reset-local` reads `.env.example` alone (decision 11's note); `make seed` runs in
   > whichever stack is up; `make down`, `make wipe` and `make logs` act on the local containers
   > and volumes.
   >
   > **Which branch runs where.** Branch work runs under `make dev` or `make local`, whatever `.env`
   > holds. Branch work that changes the database, a migration (which any boot applies) or written
   > data, never runs `make up`; branch work that only reads data may, to see the team project's
   > data, without hot reload. The team values pass between members privately and are never
   > committed. `.gitignore` gains `.env.*` with `!.env.example`, so a second file such as
   > `.env.team` cannot be committed by mistake.
   >
   > **The suite never runs with the team values.** The harness drops and recreates
   > `<database of DATABASE_URL>_test` and truncates between tests (`docs/spec.md` §16.2), and it
   > will create accounts through Supabase Auth, so on the team values it would build test
   > databases and test users on the team project, and two members testing at once would drop each
   > other's. `make test` runs the suite in place of the boot chain, so the check above never runs
   > there. So **`make test` runs on `make dev`'s files plus the overlay above**, keeping the `api`
   > dev container with its dev dependencies and `nginx` (§16.2), and reads `.env.example` alone
   > for both `DATABASE_URL` and `SUPABASE_URL`. That settles the guard this note first left to
   > [Settle how tests and CI run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/99); what else the suite and CI need stays that ticket's.

   > **Settled 2026-10-04 by [Settle how tests and CI run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/99): `make test` runs a copy of its own.**
   > It keeps the files and values above and adds a Compose project name of its own, for example
   > `peerconnect-test`, so it never shares `make dev`'s or `make local`'s containers and volumes.
   > Supabase Auth and Storage write each test's users and files to their own database, which would
   > otherwise be the developer's. The copy starts from empty, any copy an interrupted run left is
   > removed first, and the copy is deleted with its volumes when the run ends, so `make wipe`
   > never needs to reach it. **One `make test` runs at a time per machine:** every copy has the
   > same project name, so a second run's first step would delete a running copy, and the first run
   > would fail partway with errors that look real. It never starts `proxy`, so it publishes no
   > port. CI runs the same copy (ADR-0016 d8's note of 2026-10-04). Like the other targets it hides
   > nothing required: it
   > is Compose with a project name. The harness itself still refuses any `DATABASE_URL` or
   > `SUPABASE_URL` that is not the fallback's, with the check `make reset-local` runs, since
   > `npx vitest run` can be typed outside `make test` and `prisma.config.ts` loads `.env` itself.

9. **`.env.example` holds** `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
   `DATABASE_URL`, `NODE_ENV`, `PUBLIC_ORIGIN`, `HTTPS_PORT`, `HTTP_PORT`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD` — with a header comment saying these are development defaults and the
   admin password must be changed for any shared use. This project has no third-party
   secrets to hold.

   > **Under revision 2026-09-30** (see the note at the top): `.env.example` gains every Supabase variable;
   > [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101) settles the list.

   > **Settled 2026-10-03 by [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101).** The `api` reads three new
   > entries: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` for the password grant, and
   > `SUPABASE_SECRET_KEY` for admin create, admin update and Storage. The web bundle reads none of
   > them, so there is still no `VITE_` entry ([Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91)). In `.env.example`
   > they hold the fallback's values and `DATABASE_URL` points at the fallback's Postgres; the team
   > project's values go in `.env` only. The fallback's containers also need a fixed local signing
   > secret and the keys made from it. Like `POSTGRES_PASSWORD`, these are development defaults that
   > work only against the fallback. The PR that writes `.env.example` fixes their exact names and
   > brings the count below up to date.
   >
   > `ADMIN_PASSWORD`, `MODERATOR_PASSWORD` and `SEED_STUDENT_PASSWORD` are now Supabase Auth
   > passwords, so each must be 8 characters to 72 bytes
   > ([Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92)); today's defaults fit. The team project is shared use, so the
   > warning above applies: a team `.env` sets all three, to values other than the defaults, before
   > the first boot there. The seed creates the bootstrap Admin, the Peer Moderator and the thirty
   > Students once, at that boot (decision 11's note), and their passwords stay. The evaluator reads
   > them in the handed `.env`. Any account can change its own password in the app, though, and the
   > team project's data stays between defenses, so one defense can leave a seeded password that the
   > next defense's `.env` no longer opens. The pre-defense run signs in as each of the three
   > (the first Consequence's note), and if a password no longer works, Kamel runs `make reset-team`
   > before the defense (decision 11's note), which creates the accounts afresh from the `.env`,
   > and the three sign-ins run again. Nothing is repaired in place: the handed `.env` never carries a changed password, and nobody
   > needs to know what an evaluator typed.
   >
   > **The handed `.env` is not rotated.** It holds the `postgres` role's password and the secret
   > key, which bypasses every bucket policy, so whoever has it can read and change every account
   > and file on the team project, and each evaluator keeps a copy. It is not rotated after a
   > defense, by Kamel's choice: the `.env` is handed over only so the code runs at the evaluation,
   > and the team accepts that an evaluator keeps that access afterwards. Rotating stays cheap if
   > that changes: secret keys can be created and revoked one at a time, and the database password
   > is one reset.
   > [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100) says who can see the data.
   >
   > > **Changed 2026-10-11 by [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100), by Kamel: no
   > > evaluator holds the `.env`.** A defense runs on a team member's own computer, and the
   > > evaluator is told only the three sign-in passwords, `ADMIN_PASSWORD`, `MODERATOR_PASSWORD` and
   > > `SEED_STUDENT_PASSWORD`, which the paragraph above had them read in the `.env`. If a defense
   > > ever runs on another computer, never one an evaluator controls, a team member puts the `.env`
   > > there, shows it to nobody, and at the end runs `make down` and deletes it: `compose.yaml` gives
   > > the `.env` to the `api` and `proxy` containers through `env_file`, and they keep its values
   > > until `make down` removes them. So "each evaluator keeps a copy" no longer holds: only the team holds
   > > the database password and the secret key. It is still not rotated after a defense. This is
   > > what the Privacy Policy now says: only the team, and Supabase as its host, can open the team's
   > > copy directly (ADR-0018 d1's note of 2026-10-11). The project's two members also read it
   > > through the dashboard ([`supabase/team-project.md`](../../supabase/team-project.md)).

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

   > **Updated 2026-10-04 by [Local Supabase fallback: Compose services, make targets, environment check and CI](https://github.com/ahmadmnsur/ft_transcendence/issues/121).**
   > `.env.example` now has **27 entries**. The fifteen above remain, and the added entries are
   > `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `ANON_KEY`,
   > `SERVICE_ROLE_KEY`, `GOTRUE_JWT_KEYS`, `JWT_JWKS`, `GOTRUE_JWT_SECRET`,
   > `AUTH_JWT_SECRET`, `SERVICE_KEY`, `ANON_KEY_ASYMMETRIC` and `SERVICE_ROLE_KEY_ASYMMETRIC`.
   > Auth and Storage use their image-specific aliases for the same fixed local signing
   > secret or keys. All twenty-seven values belong to the fallback; the team project's values
   > belong in `.env`.

10. **There is no `SESSION_SECRET`, deliberately.** ADR-0003 decision 1 makes the session id
    opaque with the database row as the authority, so there is nothing to sign. Recorded
    because "every app has one" is a reflex, and a variable that does nothing is worse than
    no variable: a future reader would assume it mattered.

11. **Boot is: wait on the `db` healthcheck, run migrations, run an idempotent seed.** The
    seed creates exactly one bootstrap **Admin** from `.env`. Without it a fresh machine
    produces a platform where nobody can open a **Round**, so there is no **Match** and
    nothing to demonstrate.

    > **Under revision 2026-09-30** (see the note at the top): [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101) settles what the boot chain does
    > once the database is Supabase's, including against the team project.

    > **Settled 2026-10-03 by [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101): the chain is the same on both
    > targets.** The check (decision 8's note), then migrations, then the seed. On the team
    > project, `prisma migrate deploy` and the `api` share one `DATABASE_URL`, the **session
    > pooler** (`aws-<n>-eu-central-1.pooler.supabase.com:5432`). The direct connection is IPv6-only
    > on the free plan, and the transaction pooler drops the lock `prisma migrate` holds. A test on the
    > team project on 2026-10-03 ran two colliding `SERIALIZABLE` transactions and a deadlock through
    > it: `40001` (*"could not serialize access due to concurrent update"*) and `40P01` (*"deadlock
    > detected"*) came back unchanged, so the Unit of Work's retry works through the pooler.
    >
    > **The `api`'s pool is capped.** In session mode the pooler accepts at most the project's
    > *Pool Size* clients per role and database, and refuses the next with "Max client connections
    > reached" after a wait. node-postgres's pool opens up to 10 by default
    > (`src/core/prisma.service.ts`), so two members' stacks on `main` at once, plus
    > `prisma migrate deploy` and the seed, can go past it. The `api`'s pool is capped so that two
    > stacks fit, and the build checks the number against the project's Pool Size.
    >
    > **The connection is encrypted and verified.** The same test found that Node does not trust the
    > pooler's certificate (`SELF_SIGNED_CERT_IN_CHAIN`): Supabase signs it with its own certificate
    > authority. Left alone, the driver either refuses it (`sslmode=require` verifies in
    > node-postgres) or, with no TLS setting in the URL, connects unencrypted. So the `api` and
    > `prisma migrate` verify against Supabase's CA certificate, a public file from the project's SSL
    > configuration; the build wires it in. The project also enforces SSL on incoming connections, so
    > an unencrypted connection is refused and the boot check names it.
    >
    > > **Built 2026-10-06 by [Team project database: verified TLS and the api's pool cap](https://github.com/ahmadmnsur/ft_transcendence/issues/124).**
    > > Supabase's certificate is committed as `supabase/prod-ca-2021.crt` (*Supabase Root 2021 CA*,
    > > valid until 2031-04-26). When `DATABASE_URL` and `SUPABASE_URL` name the team project,
    > > `src/core/prisma.service.ts` gives the `api`'s pool that certificate with full verification,
    > > and first removes every TLS setting the URL carries (each `ssl…` key and `uselibpqcompat`):
    > > node-postgres lays the URL's settings over its config, so a pasted `?sslmode=no-verify` would
    > > otherwise switch the check off. For `prisma migrate`, whose engine takes TLS from the URL
    > > only, `prisma.config.ts` sets `sslmode=require`, `sslaccept=strict` and `sslcert=<absolute
    > > path>` on the query of a URL on Supabase's pooler, replacing any the URL has; the engine does
    > > not find a relative path. The handed `.env` keeps the plain Session pooler string. A wrong or
    > > missing certificate stops both connections, whatever TLS settings the URL carries. The pool
    > > is capped at 5: two stacks of 5, plus `prisma migrate deploy` and the seed, fit the project's
    > > Pool Size of 15, its default for the Nano compute size, with 3 to spare.
    >
    > **The seed on the team project.** It writes its fixture at the first boot there, and every
    > later boot skips it until the reset below, so the data a demo adds stays (ADR-0017 d10). That
    > has a cost the fallback never had, where every evaluator started from an empty volume: each
    > defense after the first starts from the team project's accumulated data, not from the seed's
    > idle end state. The four-Round start and the Round 5 demo beat (ADR-0017 d1, and d4 on the
    > open-Round stall panel) hold only after the first seed or a reset. Before each defense,
    > no Round is left open, since only one can be (ADR-0002 d2).
    >
    > **Two reset commands, one fixed target each.** `make reset-team` empties the team project and
    > `make reset-local` the fallback, so the next boot seeds afresh. Each deletes the rows of our
    > tables (the tables and migrations stay), **every** Supabase Auth user and **every** file in
    > PeerConnect's buckets, not only what the seed made, since pre-defense checks and defenses add
    > accounts and files too. Each leaves the project or the stack itself, its settings, the
    > buckets and the keys.
    >
    > - **`make reset-local`** reads `.env.example` alone, as `make local` does.
    > - **`make reset-team`** reads `.env`, prints the project ref it is about to empty, and asks for
    >   it to be typed before it deletes anything.
    >
    > **Each checks, then clears the completion record, then deletes.**
    >
    > 1. **It checks what it read** with the boot check's steps 1 and 2 (decision 8's note), since
    >    neither reset runs the boot chain. `make reset-team` refuses unless `DATABASE_URL` and
    >    `SUPABASE_URL` both name the team project with the same ref, and only then prints that ref
    >    and asks for it; with no `.env`, or a copy of `.env.example`, it has no ref and refuses.
    >    `make reset-local` refuses unless both name the fallback. A mixed `.env` would otherwise
    >    delete Auth users and files on one target and rows on the other.
    > 2. **Its first write clears the seed's completion record** (`COMMENT ON DATABASE … IS NULL`),
    >    the way the seed clears a stale one (`docs/spec.md` §14.9). A reset that stops partway
    >    then leaves no marker over the rows left, and the next boot truncates and seeds from the
    >    start; with the marker still there, it would log "seed already complete" over half a
    >    fixture.
    >
    >    > **Narrowed 2026-10-11 by [Settle how the seed creates accounts and files on
    >    > Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/98):** if the reset stopped
    >    > before deleting our rows and a Student the seed does not make is left, the seed's guard
    >    > stops that boot instead, deleting nothing, and running the reset again finishes it
    >    > (ADR-0017 d10's note of 2026-10-11).
    > 3. Then it deletes.
    >
    > There is no single command for both: wanting a fresh local copy must never empty the shared
    > project, and the reset's local test must never reach it. `make wipe` is different again: it
    > drops the fallback's volumes without running the reset's deletions through Auth and Storage.
    >
    > **Kamel runs `make reset-team` whenever he chooses**, never as part of `make up`:
    >
    > - when the seed's fixture changes;
    > - when the pre-defense run finds anything an earlier defense changed in the way: a changed
    >   password, or a suspended, demoted or removed account. The reset is the one remedy for all of
    >   them, and the only one for a removed account, since Removal has no reinstate (ADR-0008);
    > - whenever a defense should start from the seed's end state.
    >
    > So the data stays between defenses by default, but nothing relies on it: anything a demo
    > needs comes from the seed, and the reset deletes everything else, rehearsal sign-ups, an
    > earlier defense's accounts and files, and test data from work on `main`.
    >
    > **It is proven on the fallback first,** with `make reset-local` under `make local`: boot; add
    > a sign-up and an avatar the seed did not make; reset; boot again; check that only the seed's
    > accounts and files are left, with four closed Rounds and none open.
    >
    > On the team project, the boot's stale-fixture warning names `make reset-team` and says Kamel
    > runs it; on the fallback it keeps naming `make wipe`, which removes only the local volumes,
    > the fallback's database and files, and never touches the team project. How the reset removes
    > them is
    > [Settle how the seed creates accounts and files on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/98)'s, and so is the failed-run path: §14.9's retry
    > truncates our tables, but the Supabase Auth users and files a failed run created stay, on
    > both targets.
    >
    > > **Answered 2026-10-11 by [Settle how the seed creates accounts and files on
    > > Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/98):** one function deletes
    > > for both resets and for the seed's retry, and the retry now deletes those Supabase Auth users
    > > and files too (this decision's note of 2026-10-11, below).
    >
    > **One seed at a time on a shared database.** Truncating "no marker, rows present" is safe
    > because a database without a marker can hold only a failed attempt's rows (`docs/spec.md`
    > §14.9). On the team project another stack's seed can be running, or a serving stack writing.
    > So the seed holds a session advisory lock for its whole run and re-reads the marker once it
    > has it (the session pooler keeps such locks), and the reset, and the first boot after it, run
    > with no other stack connected to the team project.
    >
    > Once the application is public, which is outside this record, the reset command would delete
    > real accounts, and the seeded Students share one known password: hosting revisits both.

    > **One step added 2026-10-05 by [Settle how avatars and Evidence are stored and served on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/94): the buckets.**
    > **The seed's first step, on every run,** makes sure PeerConnect's two Storage buckets exist,
    > `avatars` and `evidence`, private and with their caps and types (ADR-0009 decision 2's note):
    > it creates a missing one and sets back one whose settings differ, for example one made public
    > in the dashboard. It comes before the seed checks whether its fixture is complete, so a run
    > that then skips the fixture still does it, and before *R*'s avatar and Evidence are uploaded.
    > Being in the seed, it runs wherever the seed runs: in the boot chain after the check, under
    > `make seed`, and in CI, which runs the migration, the seed and the suite without the boot
    > chain (`.github/workflows/ci.yml`). It does the same on the team project and the fallback,
    > and the test harness runs the same code for buckets of its own, `test-avatars` and
    > `test-evidence` (ADR-0016 d1's note). A failure stops the seed, and with it the boot, and
    > names the bucket, as the check does (decision 8's note), since every upload would fail after
    > it. The resets keep the buckets; `make wipe` drops the fallback's, and the next boot creates
    > them again.
    >
    > Separately, the `api` deletes leftover files, ones no row names that are more than an hour
    > old, when it starts and every hour while it runs (ADR-0009 decision 2's note), never by
    > itself in the test harness. That cleanup never stops the boot: a failure is logged and the
    > `api` starts.

    > **Answered 2026-10-11 by [Settle how the seed creates accounts and files on
    > Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/98): how the resets delete, and
    > the failed-run path.** ADR-0017 d10's note of the same date has the seed's side.
    >
    > - **One function deletes, for both resets and the seed.** It deletes the rows of our tables,
    >   then every Supabase Auth user, then every file in the `avatars` and `evidence` buckets,
    >   through Supabase's admin APIs, never by SQL into the `auth` or `storage` schemas, and it
    >   lists each set whole before deleting any of it. Each reset runs it after clearing the
    >   completion record. The seed runs it before writing its fixture, so a failed attempt's
    >   Supabase Auth users and files go with its rows, after a check that every Student is one the
    >   seed makes; if one is not, the seed deletes nothing and fails. The resets skip that check,
    >   since deleting every account is what they are for.
    > - **The resets take the seed's lock.** After the checks of step 1, and after the typed ref on
    >   the team project, each reset tries the advisory lock the seed holds, on a connection of its
    >   own, and refuses before any write, saying a seed is running on that target, while a seed
    >   holds it. Otherwise it keeps the lock until it has deleted, so a seed that starts meanwhile
    >   waits. Holding it, the reset clears the completion record on the lock's connection, then
    >   deletes. As in the seed, losing that connection stops the reset at once, with no reconnect,
    >   and the connection sends TCP keepalives every few seconds. The lock is never taken through
    >   the `api`'s pool: Prisma gives a connection back after each operation, so the lock's session
    >   would not be held, and an idle one is closed after 10 seconds (ADR-0017 d10's note of
    >   2026-10-11).
    > - **The lock's connection is one more on the session pooler.** The pool cap above counted the
    >   seed as one connection: 2 × 5 + 2, with 3 to spare. With its lock on a connection of its own,
    >   the seed takes two, so the sum is 13 of the Pool Size of 15, with 2 to spare. It still fits;
    >   the comment in `src/core/prisma.service.ts` changes with the build.
    > - **`make reset-team` runs only from an up-to-date `main`.** Before its checks above, it
    >   refuses unless the checkout is on `main`, has no uncommitted change and, after a fetch,
    >   equals `origin/main`: the reset is code (`prisma/reset/**`), and the boot after it writes the
    >   fixture of whatever checkout runs `make up`. When it finishes, it says to run `make up` from
    >   the same checkout. `make reset-local` has no such check, and `make up` on a branch is
    >   unchanged: branch work that only reads data may still use the team project (decision 8's
    >   note).
    > - **The `api`'s healthcheck allows 15 minutes.** A boot that writes the fixture on the team
    >   project takes minutes. With `start_period` at 180 s, three failed checks after it mark the
    >   `api` unhealthy, and the proxy, which waits for a healthy `api`, never starts, although the
    >   seed carries on. At `start_period: 900s` a normal boot is unchanged, healthy within one
    >   5-second interval of the `api` answering, and a failed seed still exits at once, so only a
    >   boot that hangs is reported later.

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

    > **Corrected 2026-09-23 by ADR-0017 decision 10.** "If any Round exists, skip" does not
    > survive a failed first attempt, which leaves a Round behind. Idempotence now means that a boot
    > either finds a completed seed and skips it, or brings the fixture to completion; the skip test
    > recognises completion, and a failed attempt fails loudly. `/to-spec #1` chooses the mechanism.
    > The seed stays on the boot path, for `make up` and bare Compose alike.

    > **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §14.9, §15.5; M14): a
    > completion record and a reset-and-retry. The record is a fixed, versioned `COMMENT ON
    > DATABASE`, written as the seed's last statement only after every end-state assertion passes.
    > A boot finding the current record skips the seed; an older fixture's record skips it with a
    > warning naming `make wipe`; no record over empty domain tables runs it; and no record over
    > existing rows truncates the nineteen domain tables (never `_prisma_migrations`) and runs it
    > from the start, which is safe because the API serves only after the seed completes. A record
    > over empty domain tables is stale — Prisma's PostgreSQL reset drops the schema, not the
    > database — so that boot seeds too. Any failure exits non-zero and `api` stays down. ADR-0017
    > d10 carries the same choice.

    > **Stale record cleared before the re-run, 2026-09-24 before `/to-tickets`**
    > ([`docs/spec.md`](../spec.md) §14.9; ADR-0017 d10's annotation). "That boot seeds too" now clears
    > the stale record as its first write. Left in place, a re-run that failed partway would leave it
    > above partial rows and the next boot would skip them as complete. The boot sequence and the
    > idempotence requirement above are unchanged.

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

  > **Sharpened 2026-09-23 — "the production command" is both boot paths, each from its own
  > fresh clone.** Decision 8's 2026-09-20 note makes `make up` and bare
  > `docker compose up --build` independent, and ADR-0016 decision 5 keeps this check on the
  > pre-defense list. Run back-to-back in one clone, the second inherits the `.env` the first
  > wrote and proves nothing. `CONTRIBUTING.md` → *The clean-clone check* is the procedure; the
  > other two items are unchanged.

  > **And each from an empty database, noted 2026-09-23 (ADR-0016 d5).** Clones of this project
  > share a Compose project name, and so a Postgres volume. A check starts with no container or
  > volume left under that name, or it reuses a database that is already migrated and seeded.

  > **One more run before each defense, 2026-10-03 by [Settle how make up and the defense run with Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/101).** The checks
  > above run on the fallback, from fresh clones, unchanged. Before each defense the handed `.env`
  > is tried as well: `make up` boots on the team project; the bootstrap Admin, the Peer Moderator
  > and the demo Student sign in with the handed `.env`'s passwords; one sign-up succeeds, which
  > also confirms that the team project accepts `<id>@peerconnect.invalid` logins
  > ([Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92)); and one avatar upload succeeds.
  >
  > If anything an earlier defense changed is in the way, a changed password or a suspended,
  > demoted or removed account, Kamel runs `make reset-team` before the defense (decision 11's
  > note); nothing is repaired in place. He then boots with `make up` and runs the three sign-ins
  > again, so the defense is never the first sign-in after a reset. The sign-up and the upload are
  > not repeated: they prove the project's settings and buckets, which the reset keeps, and
  > repeating them would put an account and a file the seed did not make back into the fresh
  > project. Unless Kamel resets, the run's writes stay in the team project's data, which the
  > defense starts from, and before the defense no Round is left open.
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

  > **Settled 2026-09-23 by ADR-0018.** The drafts are `docs/legal/privacy-policy.md` and
  > `docs/legal/terms-of-service.md`: Ahmad signs them off, Kamel verifies the technical claims,
  > and the end of week 4 stays the deadline for sign-off and live pages. **The location above
  > stands, sharpened rather than changed**: sign-in, sign-up and the two pages are the only
  > routes readable signed out, and the footer shows on every screen, because the signup
  > checkbox (ADR-0018 d12) links terms a visitor has to be able to read before an account
  > exists.
  >
  > > **Noted 2026-10-13 by [Settle how the legal pages exist in three languages](https://github.com/ahmadmnsur/ft_transcendence/issues/143):** the
  > > deadline covers the English pages. Their French and Arabic translations come later, on their
  > > own build ticket finished before [Pre-defense readiness](https://github.com/ahmadmnsur/ft_transcendence/issues/73), and Ahmad signs them off
  > > before they merge (ADR-0018 decision 14's note of this date).
  >
  > > **Moved 2026-10-14 by [Legal pages sign-off](https://github.com/ahmadmnsur/ft_transcendence/issues/69):** the sign-off is now due 2026-10-25, in
  > > week 6. The pages have been live since 2026-10-11, before the old date (ADR-0018 decision
  > > 14's note of 2026-10-14).

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

> **Route fixed 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §5.6; M8): `GET
> /api/auth/42/callback`, so the registered URI is `${PUBLIC_ORIGIN}/api/auth/42/callback`. Still no
> callback variable.

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

> **One binding requirement on the flow, noted 2026-09-23 (ADR-0003 d10's annotation).** The
> callback is a GET that creates a session, which ADR-0003's JSON-only defence cannot cover. It
> is protected by a one-time `state` bound to the initiating browser through the single session
> cookie, never a second cookie or web storage (ADR-0018 d5's annotation), and checked before any
> session exists. The identity mapping stays #24's.

> **The same holds for Supabase Auth, 2026-09-30 by [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91).**
> If sign-in checks the password through Supabase Auth's password grant, the access token it
> returns is a JWT, used once on the server to sign that Supabase Auth session out, then dropped
> with its refresh token, never stored, logged or sent to the browser (ADR-0003 decision 1's note).
> Like 42's token above, it helps establish a session and never carries one.

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

> **Constrained 2026-09-23 by ADR-0018 decision 7, as sharpened.** However #24 settles linking,
> creation or rejection, a 42 login resolves to a Student only through an **immutable 42 account
> identifier**, never through `Student.email`. So an email edit, an Admin's included, can never
> change which Student a 42 login reaches. The "email that already holds a password account"
> framing above describes the situation #24 must handle, not a lookup key.

> **Settled 2026-10-08 by [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93)**, which answers #24's questions
> for Supabase under ADR-0018 decision 7.
>
> - **The mapping.** A 42 login finds its Student by 42's account `id`, a number 42 never
>   changes, stored in `Student.forty_two_id`. A 42 account that no Student holds gets a sign-up
>   form pre-filled with the 42 login and email, both editable, and creates a Student with a
>   password through the Terms checkbox. A signed-in Student can **Connect 42** or
>   **Disconnect 42** on their profile, with their current password. Nothing links by email: an
>   email that already holds an account gets sign-up's `email_unavailable`, and the form tells its
>   owner to sign in with their password and connect 42.
> - **Email-and-password sign-up stays open**, as the 2026-09-20 note says, and every Student now
>   has a password, whichever way they signed up.
> - **Who registers the application: Kamel, once, for the team.** He registered an application
>   named PeerConnect under his 42 account on 2026-10-07: scope `public`, one redirect URI,
>   `https://localhost:8443/api/auth/42/callback`. Its `UID` and `SECRET` live only in the team
>   `.env` handed to the evaluator, and Kamel gives them to Ahmad privately, never through the
>   repository. `.env.example` keeps both empty, so this amendment's rule stands: a clean clone
>   boots with the 42 button hidden.
>
>   > **Changed 2026-10-11 by [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100):** the team `.env` is no
>   > longer handed to the evaluator, so the 42 application's `UID` and `SECRET` stay with the team
>   > like the rest of it (decision 9's note of 2026-10-11).
> - **Where 42 is on.** `make local`, `make dev` and `make test` read `.env.example` alone, so 42
>   is off on them and `http://localhost:8081` is not registered. The open question of
>   2026-09-21, whether 42 accepts plain `http://` for `localhost`, no longer matters. A branch
>   that needs a real 42 sign-in runs `make up` with a `.env` holding only the two `FT_OAUTH_*`
>   lines: its database and Supabase values then come from `.env.example`, so it boots the local
>   fallback. If PeerConnect is hosted later (map #85, *Out of scope*), the hosted callback is a
>   second line on the same application, and `PUBLIC_ORIGIN` names the host.
> - **The secret expires.** 42 sets `secret_valid_until` 28 days after a secret is made (the
>   first one: 2026-11-04) and returns it with every token. The `api` logs a warning at each token
>   exchange once fewer than seven days are left, and checking the date is on the pre-defense
>   checklist. An expired secret fails every trip to 42 (Sign in, Connect and Confirm with 42);
>   email-and-password sign-in is unaffected.
>
> Verified on 2026-10-07 with the team application's keys: a token request answers `scope:
> public`, `expires_in: 7200` and `secret_valid_until`. Whether 42 checks PKCE is still
> unconfirmed. The flow sends it as defence in depth, and the first real sign-in shows whether 42
> accepts it.
>
> Note, 2026-10-16: the first real round trip answered the token exchange with HTTP 200 while
> sending the `code_verifier`, so 42 accepts PKCE. Whether 42 checks the verifier is still
> unconfirmed: no exchange with a wrong one has been tried.
