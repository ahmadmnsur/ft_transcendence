# 42 PeerConnect

## Instructions

### Prerequisites

Install Docker Engine with the Compose plugin, Compose version 2.24.4 or newer, and Node 22 (22.12 or a later 22.x release). Docker runs the application, proxy and local Supabase services. Node on the host runs only the Vite development server used by the dev overlay.

### The `.env` model

`.env.example` contains fixed development values for the local Supabase fallback. Every service loads it. The fallback's Postgres, Auth, Storage, REST and gateway services load only that file, even when `.env` exists. `make local`, `make dev` and `make test` also give `api` and `proxy` only `.env.example`. Among Makefile targets, only `make up` reads `.env`: it loads `.env.example` first and an optional `.env` second for `api` and `proxy`. Bare Compose uses the same base file. A fresh clone needs no `.env`, and Compose has defaults for its two interpolated ports.

The fallback credentials are fixed. Keep the team project's `DATABASE_URL`, `SUPABASE_URL`, keys and three staff or seed passwords in the gitignored `.env`. Until the remaining checks and TLS land, a team `.env` stops the boot before any database connection; use `make local` or `make dev` for branch work. The `FT_OAUTH_CLIENT_ID` and `FT_OAUTH_CLIENT_SECRET` pair ships empty and the platform works without it. If this checkout has a database volume created by the former plain Postgres image, run `make wipe` once before booting: Supabase's Postgres image cannot reuse that data directory.

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

make test
# docker compose -p peerconnect-test --env-file .env.example -f compose.yaml -f compose.dev.yaml -f compose.local.yaml down --volumes --remove-orphans
# docker compose -p peerconnect-test --env-file .env.example -f compose.yaml -f compose.dev.yaml -f compose.local.yaml build api
# docker compose -p peerconnect-test --env-file .env.example -f compose.yaml -f compose.dev.yaml -f compose.local.yaml up -d db auth rest storage api-gw
# docker compose -p peerconnect-test --env-file .env.example -f compose.yaml -f compose.dev.yaml -f compose.local.yaml run --rm api npx vitest run
# The down command runs again on every exit, even after failure. Run one copy at a time; proxy is never started.

make logs
# docker compose logs -f

make env
# test -f .env || cp .env.example .env
# (stops with "missing .env.example" if that file is absent)
```
