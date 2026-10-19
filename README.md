# 42 PeerConnect

## Instructions

### Prerequisites

Install Docker Engine with the Compose plugin, Compose version 2.24.4 or newer, and Node 22 (22.12 or a later 22.x release). Docker runs the application, proxy and local Supabase services. Node on the host runs only the Vite development server used by the dev overlay.

The repository checks out every text file with LF on every machine, Windows included, through `.gitattributes`. Without it Windows checkouts would use CRLF, which breaks shell scripts run from the checkout. A Windows checkout made before `.gitattributes` was added keeps its CRLF files until they are checked out again. `git status` stays clean on such a checkout, so check it with:

```bash
git ls-files --eol | grep w/crlf
```

It prints nothing once the checkout uses LF.

`git reset --hard` discards uncommitted changes, so commit or stash them first. To fix an old checkout once, run from the repository root:

```bash
git rm --cached -r -q .
git reset --hard
```

or clone the repository again.

### The `.env` model

`.env.example` contains fixed development values for the local Supabase fallback. Every service loads it. The fallback's Postgres, Auth, Storage and gateway services load only that file, even when `.env` exists. `make local`, `make dev` and `make test` also give `api` and `proxy` only `.env.example`. Among Makefile targets that start a stack, only `make up` reads `.env`: it loads `.env.example` first and an optional `.env` second for `api` and `proxy`. `make reset-team` reads it the same way, to find the team project it empties. Bare Compose uses the same base file. A fresh clone needs no `.env`, and Compose has defaults for its two interpolated ports.

The fallback credentials are fixed. A team member who runs the team project keeps its values in the gitignored `.env`, and only those: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD`, `MODERATOR_PASSWORD`, `SEED_STUDENT_PASSWORD`, and the `FT_OAUTH_CLIENT_ID` and `FT_OAUTH_CLIENT_SECRET` pair. Every other value comes from `.env.example`, so the team `.env` is never a copy of it. Set the three passwords to values other than the defaults before the first boot on the team project. Paste `DATABASE_URL` as the dashboard's Session pooler string with no TLS settings: on the team project the `api` and `prisma migrate` replace any TLS setting it carries and verify the connection themselves against Supabase's certificate, `supabase/prod-ca-2021.crt`. Add no other query parameter: the boot check refuses every one but the TLS settings, because `pg` takes the user, password, host and port from a parameter before the URL's own, so it could connect somewhere the check never saw. That includes `connect_timeout`: `prisma migrate` already waits up to 30 seconds for the pooler, so remove it if your `.env` has one. The team values pass between members privately and are never committed. *Running the team project*, below, says how it boots. The `FT_OAUTH_CLIENT_ID` and `FT_OAUTH_CLIENT_SECRET` pair ships empty and the platform works without it. If this checkout has a database volume created by the former plain Postgres image, run `make wipe` once before booting: Supabase's Postgres image cannot reuse that data directory. If this checkout has a `.env` that the old `make up` copied, delete it: it still has `POSTGRES_USER=peerconnect`, and `make up` writes a fresh copy of `.env.example` when `.env` is absent.

The team project's settings, its members' roles and the few changes ever made to it by hand are recorded in [`supabase/team-project.md`](supabase/team-project.md).

### Boot commands

Production path, from a clean checkout:

```bash
docker compose up --build
```

The same stack through the convenience target, which copies `.env.example` to `.env` when `.env` is absent first:

```bash
make up
```

Both serve the application at `https://localhost:8443`. Port 8080 only redirects to it.

To run the production image on the fallback regardless of `.env`:

```bash
make local
```

Development path:

```bash
docker compose --env-file .env.example -f compose.yaml -f compose.dev.yaml -f compose.local.yaml up --build
```

or:

```bash
make dev
```

It serves the application at `http://localhost:8081`.

### Running the team project

With the team `.env` in place, `make up` boots the team project, and so does bare `docker compose up --build`, which reads the same `.env`. `make local`, `make dev` and `make test` never read `.env` and always run the fallback.

The boot check runs first, before anything touches a database. It checks, in order, that the values are present and well formed, that `DATABASE_URL` and `SUPABASE_URL` name one target, that Supabase Auth and Storage accept the two keys, and that the database accepts `DATABASE_URL`. A failure stops the boot and names the problem, never printing a key, a password or a whole URL:

```text
Supabase check failed: Auth rejected SUPABASE_SECRET_KEY (401)
Supabase check failed: https://<ref>.supabase.co answered 540: the project is paused
```

A paused project answers `540`, and only Kamel, its Owner, can resume it ([`supabase/team-project.md`](supabase/team-project.md)). The boot never falls back by itself: to use the fallback on purpose, run `make local` or `make dev`.

Branch work runs under `make dev` or `make local`. A branch that changes the database (a migration, which any boot applies, or written data) never runs `make up` on the team project: migrations reach it only through `make up` on `main`, after review ([`CONTRIBUTING.md`](CONTRIBUTING.md) → *Schema changes* → *Supabase*). A branch that only reads data may run `make up` to see the team project's data, without hot reload.

A boot that writes the seed's fixture on the team project can take minutes, so the `api` has up to 15 minutes to turn healthy.

### The two resets

`make reset-local` empties the local fallback and `make reset-team` empties the team project, so the next boot seeds afresh. Each deletes the rows of our tables and every Supabase Auth user, not only what the seed made, through the seed's own emptying; the files in `avatars` and `evidence` join them once uploads are built. Each keeps the tables and migrations, the project or the stack, its settings, the buckets and the keys. There is no single command for both, and neither runs inside `make up`. `make wipe` is different again: it drops the fallback's volumes.

Each checks the values it reads as the boot check's first two steps do, and refuses unless they name its own target. Each takes the seed's lock and refuses, deleting nothing, while a seed is running on that target. Then it reads Supabase Auth's user list once, so a wrong `SUPABASE_SECRET_KEY` or an Auth that does not answer refuses before anything is deleted. Its first write clears the seed's completion record, so a reset that stops partway is finished by running it again.

- **`make reset-local`** reads `.env.example` alone, as `make local` does, so a `.env` never reaches it. Stop the stack first with `make down`, which keeps the volumes: a running `api` would go on serving the emptied database. Then boot again with `make local` or `make dev`.
- **`make reset-team`** is Kamel's to run ([`supabase/team-project.md`](supabase/team-project.md) → *Changes by hand*). It runs only from `main` with no uncommitted change, untracked files included, equal to `origin/main` after a fetch. It reads `.env`, refuses unless `DATABASE_URL` and `SUPABASE_URL` name the team project with one ref, then prints that ref and asks for it to be typed. Every stack connected to the team project is stopped first. Then run `make up` from the same checkout, and keep every other stack stopped until that boot has written the fixture.

### Certificate interstitial

The production proxy uses a self-signed certificate generated at image build time. The browser shows a trust warning on first visit. Accept the exception for `localhost` to continue. The key and certificate exist only inside the local image and are never committed.

### Dev overlay and host Vite

`make dev` brings up the base services with the dev and local overlays. It does not start Vite. Run Vite on the host as a separate step. From a fresh clone, install the web dependencies first:

```bash
npm --prefix web ci
```

Then start Vite:

```bash
npm --prefix web run dev -- --host <address> --port 5173 --strictPort
```

Replace `<address>` with the verified host-side bridge address, the address the proxy container reaches as `host.docker.internal`. On the reference machine this verified as `172.17.0.1`, which is an observation about that machine, not a constant.

Find and verify the address in this order. Resolve the name from inside the dev proxy container:

```bash
docker compose --env-file .env.example -f compose.yaml -f compose.dev.yaml -f compose.local.yaml exec proxy getent hosts host.docker.internal
```

Confirm the host owns that address:

```bash
ip -4 addr
```

Start Vite bound to it with the command above, then confirm Vite listens only there:

```bash
ss -ltn
```

Confirm the overlay reaches it: `http://localhost:8081/` returns the Vite page and `http://localhost:8081/api/health` returns `{"status":"ok"}`. If `http://localhost:8081` answers 502 with "Host Vite is not answering", host Vite is not running or is not bound to the verified address. Confirm HMR through the proxy: with the page open at `http://localhost:8081`, edit a file under `web/src` and the page updates in place without a full reload. Confirm Vite is bound only to the bridge address: `ss -ltn` shows port 5173 only there, and a request to the machine's own LAN address on port 5173 is refused. That refusal is not proof of isolation: Linux accepts a packet for any of its own addresses on any interface, so a LAN peer that routes the bridge address via this host still reaches Vite whenever the LAN-facing firewall zone admits TCP 5173. Close it on the LAN-facing zone or interface, never on the Docker bridges (the proxy reaches Vite through one, which firewalld places in its `docker` zone):

```bash
sudo firewall-cmd --zone=<LAN zone> --add-rich-rule='rule port port="5173" protocol="tcp" reject'
```

Find the zone with `firewall-cmd --get-zone-of-interface=<LAN interface>` and add `--permanent` to keep the rule. Without firewalld:

```bash
sudo iptables -I INPUT -i <LAN interface> -p tcp --dport 5173 -j REJECT
```

Test it from a second machine on the LAN: `sudo ip route add <address>/32 via <host LAN address>`, then `curl -m 3 http://<address>:5173/` must fail; remove the route after. On the reference machine the HMR check and the bind check passed, the LAN zone (`FedoraWorkstation`) carries the reject rule at runtime and permanently, and a phone on the same Wi-Fi could not reach `http://<host LAN address>:5173`. A phone cannot add a route, so the routed test itself was not run there; the zone rule covers that case, because it rejects TCP 5173 arriving on the LAN interface whatever the destination address. The Vite configuration sets `server.hmr.clientPort` to 8081 and allows the repository root for file serving. Do not set `server.host` in the configuration and do not pass a bare `--host` flag.

LAN restriction: never bind Vite to `0.0.0.0`, `::` or a bare `--host` without an address. A bridge address alone is not proof of isolation on a routed LAN, so check from another machine on the same network that Vite is not reachable there, and use the host firewall if needed. Vite must never be a separately reachable LAN service.

### After a dependency change

The dev overlay's `api` keeps `/app/node_modules` in an anonymous volume, and `up` reuses that volume from the previous container. After a change to the root `package.json` or `package-lock.json`, a new dependency stays missing until the volume is replaced. Stop the stack before starting the overlay again:

```bash
docker compose down
make dev
```

or replace the volume in one step:

```bash
docker compose --env-file .env.example -f compose.yaml -f compose.dev.yaml -f compose.local.yaml up --build -V
```

After a change to `web/package.json` or `web/package-lock.json`, run `npm --prefix web ci` again before starting host Vite.

### Makefile targets

Each target is convenience over Compose. The full command runs as written.

```bash
make up
# make env, then docker compose up --build

make local
# docker compose --env-file .env.example -f compose.yaml -f compose.local.yaml up --build

make dev
# docker compose --env-file .env.example -f compose.yaml -f compose.dev.yaml -f compose.local.yaml up --build

make down
# docker compose down

make wipe
# docker compose down --volumes --remove-orphans (includes the Storage volume)

make seed
# docker compose exec api npx prisma db seed --config prisma.config.ts

make reset-team
# sh prisma/reset/require-main.sh
# docker compose run --rm --build --no-deps api node dist/prisma/reset/main.js team

make reset-local
# docker compose --env-file .env.example -f compose.yaml -f compose.local.yaml run --rm --build api node dist/prisma/reset/main.js local

make test
# docker compose -p peerconnect-test --env-file .env.example -f compose.yaml -f compose.dev.yaml -f compose.local.yaml down --volumes --remove-orphans
# docker compose -p peerconnect-test --env-file .env.example -f compose.yaml -f compose.dev.yaml -f compose.local.yaml build api
# docker compose -p peerconnect-test --env-file .env.example -f compose.yaml -f compose.dev.yaml -f compose.local.yaml up -d db auth storage api-gw
# docker compose -p peerconnect-test --env-file .env.example -f compose.yaml -f compose.dev.yaml -f compose.local.yaml run --rm api npx vitest run
# The down command runs again on every exit, even after failure. Run one copy at a time; proxy is never started.

make logs
# docker compose logs -f

make env
# test -f .env || cp .env.example .env
# (stops with "missing .env.example" if that file is absent)
```
