# Prisma 7 on Supabase Postgres

Checked 2026-09-30 against the Supabase docs, the Supabase Postgres image source
(`supabase/postgres`, commit `b361654`), the Supabase CLI source (`supabase/cli`, tag
`v2.118.0`), the Prisma ORM 7 docs, the `@prisma/adapter-pg` source at tag `7.10.0` (the Prisma
version in `package-lock.json`), the PostgreSQL 17 docs, the Docker docs and the node-postgres
docs. No live Supabase project or local stack was run. Where a fact comes only from reading
source, or only from a user report, it says so.

Ticket: [#86](https://github.com/ahmadmnsur/ft_transcendence/issues/86), part of the map
[#85](https://github.com/ahmadmnsur/ft_transcendence/issues/85).

## Question

Which facts decide how PeerConnect's Prisma 7 setup connects to Supabase Postgres, both on the
team project (free plan) and on a laptop running `supabase start`? Four bullets: the connection
for the Unit of Work (`docs/spec.md` §3.6.2) and for `prisma migrate`; the permissions of the
role PeerConnect connects as (§14.9, §16.2); Supabase's own `auth` and `storage` schemas; and
the local stack's `DATABASE_URL` and whether the `api` container reaches it.

## Short answer

- The direct, session-mode and transaction-mode connections can all carry the Unit of Work's
  interactive `SERIALIZABLE` transactions through `@prisma/adapter-pg`, because the adapter holds one pooled client from
  `BEGIN` to `COMMIT` and does not name its prepared statements by default. On the free plan the
  direct connection is IPv6 only. The shared pooler (session and transaction mode) is IPv4.
- `prisma migrate deploy` and `migrate dev` need a direct or session-mode connection, never
  transaction mode. In Prisma 7 the CLI reads that URL from `datasource.url` in
  `prisma.config.ts`. The runtime URL goes to `PrismaPg` in code.
- The default `postgres` role is not a superuser, but it has `CREATEDB` and owns the `postgres`
  database, on both hosted and local stacks. So `COMMENT ON DATABASE`, `TRUNCATE` of its own
  tables, and `CREATE`/`DROP DATABASE` of a database it created are all allowed. This was read
  from source and the PostgreSQL rules, not run.
- Prisma only touches `public` unless `schemas` lists more. Supabase says not to list `auth` or
  `storage`, and `postgres` can no longer create objects in them.
- Locally the URL is `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. From inside the
  `api` container, `127.0.0.1` is the container itself. It needs `host.docker.internal:54322`
  (plus `host-gateway` on Linux Docker Engine) or a shared Docker network.

## 1. Connection

### What Supabase offers

| Mode | Host:port | User | Free plan IP | Prepared statements and session state |
| --- | --- | --- | --- | --- |
| Direct | `db.<ref>.supabase.co:5432` | `postgres` | IPv6 only | All supported |
| Shared pooler, session mode | `aws-<n>-<region>.pooler.supabase.com:5432` | `postgres.<ref>` | IPv4 | All supported |
| Shared pooler, transaction mode | `aws-<n>-<region>.pooler.supabase.com:6543` | `postgres.<ref>` | IPv4 | No prepared statements, no session state, no pipelining |
| Dedicated pooler (PgBouncer) | `db.<ref>.supabase.co:6543` | `postgres` | Not on the free plan | Transaction mode only |

Source: [Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres),
sections *Endpoints and IP versions* and *Transaction mode limitations*. Details from that page:

- "The shared pooler is IPv4-only on every plan, in both session and transaction mode."
- The IPv4 add-on is not dual-stack. It swaps the direct host's IPv6 record for an IPv4 one. It
  is for Pro plans and above
  ([IPv4 and IPv6 compatibility](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP)).
  **Rules out** IPv4 on the direct connection for a free project.
- In transaction mode, "anything that depends on session state doesn't survive between
  transactions": `SET`/`RESET`, session-level advisory locks, `LISTEN`/`NOTIFY`, temporary
  tables, `WITH HOLD` cursors, prepared statements and query pipelining. "Direct connections and
  session mode support all four, so none of this applies to either."
- Supabase recommends the direct connection for "persistent backends, such as VMs and
  long-running containers", and session mode as the alternative on an IPv4-only network.
- Supabase's IPv4 and IPv6 page lists GitHub Actions among IPv4-only platforms
  ([IPv4 and IPv6 compatibility](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP)).
  A CI runner therefore cannot reach a free project's direct connection.

### How `@prisma/adapter-pg` runs an interactive transaction

Read from the adapter source at tag `7.10.0`:

- `startTransaction` checks out one client from the `pg.Pool`, sends `BEGIN`, then
  `SET TRANSACTION ISOLATION LEVEL <level>` on the same client
  ([`pg.ts` L208-L243](https://github.com/prisma/orm/blob/7.10.0/packages/adapter-pg/src/pg.ts#L208-L243)).
  Prisma's transaction manager then sends an explicit `COMMIT` or `ROLLBACK` as SQL
  ([`transaction-manager.ts` L78-L79](https://github.com/prisma/orm/blob/7.10.0/packages/client-engine-runtime/src/transaction-manager/transaction-manager.ts#L78-L79)).
  So every statement of the transaction, including the isolation level, is inside one
  `BEGIN … COMMIT` block. A transaction-mode pooler keeps one server connection for exactly that
  block. Prisma's own docs say transaction mode "offers a connection for every transaction – a
  requirement for the Prisma Client to work with PgBouncer"
  ([PgBouncer](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/pgbouncer)).
- Queries pass `name: statementNameGenerator?.(query)`. With no generator the name is
  `undefined`, and the option's comment says "If not provided, prepared statements are not
  cached" ([`pg.ts` L101-L120, L188-L193](https://github.com/prisma/orm/blob/7.10.0/packages/adapter-pg/src/pg.ts#L101-L120)).
  node-postgres then uses an unnamed statement
  ([node-postgres queries](https://node-postgres.com/features/queries)). Supabase's fix for
  node-postgres in transaction mode is exactly this: omit `name`
  ([Disabling prepared statements](https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL)).
  **Rules in** transaction mode with the adapter's defaults. **Rules out** setting
  `statementNameGenerator` on a transaction-mode URL.
- node-postgres does not pipeline by default: "By default node-postgres waits for each query to
  complete before sending the next one"
  ([Pipelining](https://node-postgres.com/features/pipelining)). The adapter does not turn it on.
- `pgbouncer=true` appears in both vendors' docs for transaction mode
  ([Supabase Prisma quickstart](https://supabase.com/docs/guides/database/prisma),
  [Prisma PgBouncer](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/pgbouncer)).
  The adapter source never reads it. It is a URL parameter of Prisma's pre-7 engine, like
  `connection_limit`, which Prisma 7 replaces with the `pg` pool option `max` (default `10`)
  ([Connection pool](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool)).
  **Not confirmed:** what node-postgres does with the unknown parameter. It was not tested.

### Retries on `P2034`, `40001` and `40P01`

- The adapter maps SQLSTATE `40001` and `40P01` to `TransactionWriteConflict`
  ([`errors.ts` L169-L173](https://github.com/prisma/orm/blob/7.10.0/packages/adapter-pg/src/errors.ts#L169-L173)),
  which Prisma reports as `P2034`
  ([`user-facing-error.ts` L172-L173](https://github.com/prisma/orm/blob/7.10.0/packages/client-engine-runtime/src/user-facing-error.ts#L172-L173)).
  It keeps the original SQLSTATE as `originalCode`. Prisma's docs show a retry loop on `P2034`
  ([Transactions](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions)).
- Supavisor speaks the Postgres wire protocol and "acts as a messenger between the database and
  the client" ([Supavisor FAQ](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI)).
  **Not confirmed:** no Supabase page says in so many words that error SQLSTATEs pass through
  unchanged. Nothing found says they do not.
- A retry opens a new transaction, which in transaction mode may land on a different server
  connection. The Unit of Work re-runs all of `work`, so nothing carries over between attempts.

### Pool size

- Session mode gives each client its own server connection, capped by the project's "Pool
  Size" per user and database
  ([Prisma troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting),
  *Max client connections reached*). The adapter's `pg.Pool` opens up to `max` (default `10`)
  clients.
- In transaction mode the pooler keeps an idle server connection for 5 minutes. In session mode
  it closes it when the client leaves
  ([Supavisor FAQ](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI)).

### TLS (applies to every hosted option)

node-postgres maps `sslmode=require` to full certificate checking unless `uselibpqcompat=true`
is set ([pg-connection-string](https://github.com/brianc/node-postgres/blob/master/packages/pg-connection-string/README.md)).
Supabase publishes its own server root certificate for clients that verify
([Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres), *SSL*).
**Not confirmed:** whether Node's default trust store accepts Supabase's certificate. Not tested.

### Which connection `migrate deploy` and `migrate dev` need

- The Prisma schema engine "is designed to use a single connection to the database, and does
  not support connection pooling with PgBouncer". The fix is a direct connection for CLI
  commands ([PgBouncer](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/pgbouncer)).
- `migrate deploy`, `migrate dev` and `migrate resolve` take an advisory lock
  ([Development and production](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production)).
  Session-level advisory locks do not survive transaction mode (Supabase, above).
  **Rules out** transaction mode (port 6543) for any `prisma migrate` command.
- Both Supabase's Prisma quickstart and Prisma's Supabase page use the session pooler
  (port 5432 on the pooler host) as the CLI URL, and name the direct connection as the other
  choice ([Supabase Prisma quickstart](https://supabase.com/docs/guides/database/prisma),
  [Prisma Supabase page](https://www.prisma.io/docs/orm/v6/overview/databases/supabase)).
  **Rules in** direct and session mode.
- **How Prisma 7 expresses it.** `directUrl` was removed. The CLI uses `datasource.url` from
  `prisma.config.ts`. `datasource.shadowDatabaseUrl` is the only other connection key
  ([Config reference](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)).
  "If you were previously using `directUrl` to run migrations then you need to pass the
  `directUrl` value in the `url` field of `prisma.config.ts`"
  ([Upgrade to v7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)). The runtime URL is
  whatever the code passes to `new PrismaPg(...)`. So a split setup is two environment
  variables: one read by `prisma.config.ts`, one read by the code that builds the adapter. The
  repository's `prisma.config.ts` reads `DATABASE_URL` today.
- **`migrate deploy`** does not use a shadow database
  ([Shadow database](https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/shadow-database)).
- **`migrate dev`** creates and drops a temporary shadow database on the same server unless
  `shadowDatabaseUrl` is set. For PostgreSQL "the user must be a super user or have `CREATEDB`
  privilege" ([Shadow database](https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/shadow-database)).
  `postgres` has `CREATEDB` (section 2).
  - The shadow database is a fresh database, so it has none of Supabase's schemas. A migration
    that uses the `extensions` schema then fails there
    ([prisma/orm#26231](https://github.com/prisma/orm/issues/26231), open). Prisma 7 has
    `migrations.initShadowDb` for SQL that should run on the shadow database first
    ([Config reference](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)).
    PeerConnect's schema uses no extension today.
  - A 2024 user report says `migrate dev` through the session pooler failed to drop the shadow
    database ("is being accessed by other users")
    ([prisma/orm#22779](https://github.com/prisma/orm/issues/22779), open). **Not confirmed** on
    Prisma 7.
- `migrate dev` and `migrate reset` "should never be used in a production environment"
  ([Development and production](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production)).
  That applies to a shared hosted team project.

### What this rules in or out

| Use | Direct (free plan) | Session pooler | Transaction pooler |
| --- | --- | --- | --- |
| Unit of Work through `adapter-pg` | In, if the host has IPv6 | In | In, with the adapter's default unnamed statements |
| `migrate deploy` | In, if the host has IPv6 | In | Out |
| `migrate dev` (auto shadow DB) | In, if the host has IPv6 | In, with a reported drop failure | Out |
| From an IPv4-only network or GitHub Actions | Out | In | In |

## 2. Permissions of the `postgres` role

### What the role is

- Supabase: "Superuser access is not given"
  ([Roles, superuser access and unsupported operations](https://supabase.com/docs/guides/database/postgres/roles-superuser)).
  The listed unsupported operations do not include any of the four below.
- The image demotes it with
  `ALTER ROLE postgres NOSUPERUSER CREATEDB CREATEROLE LOGIN REPLICATION BYPASSRLS`
  ([`10000000000000_demote-postgres.sql` L22](https://github.com/supabase/postgres/blob/b36165476f28c34448acbcc712a05d26213183ed/migrations/db/migrations/10000000000000_demote-postgres.sql#L22)),
  and grants it `pg_signal_backend`
  ([`20240606060239_grant_predefined_roles_to_postgres.sql` L2](https://github.com/supabase/postgres/blob/b36165476f28c34448acbcc712a05d26213183ed/migrations/db/migrations/20240606060239_grant_predefined_roles_to_postgres.sql#L2)).
- It owns the `postgres` database. The Docker image runs `alter database postgres owner to
  postgres` when it creates the role
  ([`migrate.sh` L36-L37](https://github.com/supabase/postgres/blob/b36165476f28c34448acbcc712a05d26213183ed/migrations/db/migrate.sh#L36-L37)),
  and the hosted machine image does the same
  ([`ansible/playbook.yml` L111](https://github.com/supabase/postgres/blob/b36165476f28c34448acbcc712a05d26213183ed/ansible/playbook.yml#L111)).
- The local CLI stack runs the same image and scripts. The CLI then only sets the password
  (`ALTER USER postgres WITH PASSWORD`)
  ([CLI `schema.sql`](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/internal/db/start/templates/schema.sql)).
  So the local role should match the hosted one. **Read from source, not run.**

### The four operations

| Operation (spec) | PostgreSQL rule | `postgres`, hosted and local |
| --- | --- | --- |
| `COMMENT ON DATABASE <current>` (§14.9) | "only the object's owner can set the comment" ([COMMENT](https://www.postgresql.org/docs/17/sql-comment.html)) | Allowed on `postgres`, which it owns, and on any database it creates |
| `TRUNCATE` the domain tables (§14.9, §16.2) | needs the `TRUNCATE` privilege; tables referenced by foreign keys must be in the same statement or use `CASCADE` ([TRUNCATE](https://www.postgresql.org/docs/17/sql-truncate.html)) | Allowed on tables it owns: every table its migrations create when they run as `postgres` |
| `CREATE DATABASE` (§16.2) | "you must be a superuser or have the special `CREATEDB` privilege"; not in a transaction block ([CREATE DATABASE](https://www.postgresql.org/docs/17/sql-createdatabase.html)) | Allowed (`CREATEDB`) |
| `DROP DATABASE … WITH (FORCE)` (§16.2) | only the owner; not while connected to it; not in a transaction block; `FORCE` terminates only connections the user may end with `pg_terminate_backend`, and fails if others remain ([DROP DATABASE](https://www.postgresql.org/docs/17/sql-dropdatabase.html)) | Allowed on a database it created. It holds `pg_signal_backend` |

Related facts:

- Supabase's Supavisor FAQ shows `CREATE DATABASE another_database` as a normal thing to do on a
  project ([Supavisor FAQ](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI)).
- A new database is cloned from `template1`
  ([CREATE DATABASE](https://www.postgresql.org/docs/17/sql-createdatabase.html)). Supabase's
  setup scripts target the `postgres` database, and a search of `supabase/postgres` found no
  change to `template1`. So a test database would have no `auth`, `storage` or `extensions`
  schema. **Inferred from source, not run.**
- **The custom `prisma` role in Supabase's Prisma quickstart differs.** It is created with
  `bypassrls createdb` and `grant "prisma" to "postgres"`
  ([Supabase Prisma quickstart](https://supabase.com/docs/guides/database/prisma)). That makes
  `postgres` a member of `prisma`, not the other way round. So `prisma` can create and drop
  its own databases and truncate its own tables, but it does not own the `postgres` database.
  **Rules out** `COMMENT ON DATABASE postgres` for that role, by the PostgreSQL rule above.
- Through transaction mode the pooler may keep idle server connections to a database for
  5 minutes (above). A plain `DROP DATABASE` would then fail. `WITH (FORCE)` ends them, since
  they log in as the same role. **Not tested.**
- None of this was run against a live project. A live check would be
  `select rolsuper, rolcreatedb from pg_roles where rolname = current_user` and
  `select pg_get_userbyid(datdba) from pg_database where datname = current_database()`.

## 3. Supabase's own schemas (`auth`, `storage`)

- Prisma manages the schema named by the connection string's `schema` argument, default
  `public` ([PostgreSQL](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql)).
  More schemas need a `schemas` list in the `datasource` block
  ([Multi-schema](https://www.prisma.io/docs/orm/v7/prisma-schema/data-model/multi-schema)).
  With the adapter, the runtime schema is the `schema` option of `PrismaPg`. The repository's
  `prisma/schema.prisma` has no `schemas` list, so Prisma works in `public` only.
- Supabase's Prisma troubleshooting page: "Supabase may update managed schemas like auth and
  storage to introduce new features. Granting Prisma access to these schemas can lead to drift
  during updates." It also says "Referencing these schemas directly will cause schema drift in
  the future. It is best to remove references to these schemas from your migrations", and shows
  copying `auth.users` rows into a `public` table with triggers instead
  ([Prisma troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting)).
  **Rules out** listing `auth` or `storage` in `schemas` or referencing them in migrations.
- Since the 2025-04-21 image migration, `postgres` has no `CREATE` on the `auth` or `storage`
  schemas and is no longer a member of their admin roles
  ([`20250421084701_revoke_admin_roles_from_postgres.sql` L2-L17](https://github.com/supabase/postgres/blob/b36165476f28c34448acbcc712a05d26213183ed/migrations/db/migrations/20250421084701_revoke_admin_roles_from_postgres.sql#L2-L17)).
  A Prisma migration run as `postgres` cannot create objects there anyway.
- `prisma migrate reset` drops and recreates the managed schema on PostgreSQL
  ([Development and production](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production)).
  Supabase's initial schema grants `usage on schema public` to `anon`, `authenticated` and
  `service_role`
  ([`00000000000000-initial-schema.sql` L39-L42](https://github.com/supabase/postgres/blob/b36165476f28c34448acbcc712a05d26213183ed/migrations/db/init-scripts/00000000000000-initial-schema.sql#L39-L42)),
  and a dropped `public` loses those grants. **Inferred.** A user report says `migrate reset`
  broke Supabase Auth on a hosted project. A Supabase maintainer closed it saying not to run
  reset there ([supabase/supabase#33278](https://github.com/supabase/supabase/issues/33278)).
  The report does not show the Prisma schema, so the cause is **not confirmed**.
- **Related: Data API exposure of Prisma's tables.** The same initial schema sets default
  privileges so that new `public` tables are granted to `anon`, `authenticated` and
  `service_role` (L40-L42 above). Supabase now removes those defaults at project creation when
  the "Default privileges for new entities" toggle is off. The local CLI removes them by default
  since 2026-05-30, and its `auto_expose_new_tables` opt-out goes away on 2026-10-30
  ([CLI `start.go` L391-L416](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/internal/db/start/start.go#L391-L416)).
  Supabase's Prisma quickstart says to turn the Data API off "if you plan to solely use Prisma"
  ([Supabase Prisma quickstart](https://supabase.com/docs/guides/database/prisma)). **Not
  confirmed:** which setting the team project was created with.

## 4. Locally

### The connection string

- `supabase start` and `supabase status` print
  `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
  ([CLI getting started](https://supabase.com/docs/guides/local-development/cli/getting-started)).
  The CLI builds it from the `postgres` user, the password (default `postgres`), a host and
  `[db] port` (default `54322`)
  ([`status.go` L52](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/internal/status/status.go#L52),
  [`config.go` L465](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/pkg/config/config.go#L465),
  [`config.toml` template L33-L51](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/pkg/config/templates/config.toml#L33-L51)).
- The host is `127.0.0.1` unless `SUPABASE_SERVICES_HOSTNAME` is set, or `DOCKER_HOST` points
  at a TCP daemon
  ([`misc.go` L304-L318](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/internal/utils/misc.go#L304-L318)).
- The local pooler is off by default (`[db.pooler] enabled = false`, port `54329`, transaction
  mode when on) (same `config.toml` template). So by default only a direct connection exists
  locally. Transaction-mode limits will not show up locally unless the pooler is turned on.
- `[db] shadow_port = 54320` is the CLI's own shadow database for `supabase db diff`. It has
  nothing to do with Prisma's shadow database.
- `postgres` should have the same rights locally as on the hosted project (section 2, read
  from source).

### Whether the `api` container reaches it

- Inside a container, `127.0.0.1` is the container itself. The printed URL does not work
  unchanged from the `api` container.
- The CLI publishes the database's container port `5432` as host port `54322` with no host
  address ([`start.go` L117-L120](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/internal/db/start/start.go#L117-L120)).
  Docker then "publishes ports to all host addresses (`0.0.0.0` and `[::]`)"
  ([Port publishing](https://docs.docker.com/engine/network/port-publishing/)).
- **Option A: `host.docker.internal:54322`.** On Docker Desktop, `host.docker.internal`
  "resolves to the internal IP address of your host"
  ([Docker Desktop networking how-tos](https://docs.docker.com/desktop/features/networking/networking-how-tos/)).
  Supabase's own docs tell local edge functions, which run in containers, to use it instead of
  `localhost` ([CLI getting started](https://supabase.com/docs/guides/local-development/cli/getting-started)).
  On Linux Docker Engine the name does not exist by default. It needs
  `extra_hosts: ["host.docker.internal:host-gateway"]`. `host-gateway` "resolves to the IPv4
  address of the default bridge" ([dockerd](https://docs.docker.com/reference/cli/dockerd/)).
  **Not tested.** A host firewall between the bridge and the host could still block it.
- **Option B: join Supabase's Docker network.** The CLI puts its containers on
  `supabase_network_<project_id>`, and the database container is `supabase_db_<project_id>`
  with the aliases `db` and `db.supabase.internal`
  ([`utils/config.go` L36, L57-L64](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/internal/utils/config.go#L36)).
  A Compose service on that network, declared as an external network, would use port `5432`,
  not `54322`. `project_id` comes from `supabase/config.toml`.
- **Option C: `supabase start --network-id <network>`** makes the CLI "use the specified docker
  network instead of a generated one"
  ([`cmd/root.go` L342](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/cmd/root.go#L342)).
- **Reaching the hosted project from a container.** On the free plan the direct connection is
  IPv6 only. Docker's docs say "IPv6 is only supported on Docker daemons running on Linux
  hosts", and a network gets IPv6 only when it is turned on (`enable_ipv6: true` in Compose)
  ([IPv6](https://docs.docker.com/engine/daemon/ipv6/)). The shared pooler is IPv4, so it does
  not depend on this. **Not tested.**

## Not confirmed

- Any behaviour on a live hosted project or a running local stack. Nothing was run.
- That Supavisor passes SQLSTATE `40001`/`40P01` through unchanged.
- What node-postgres does with `pgbouncer=true` in the URL.
- Whether `migrate dev` through the session pooler still fails to drop its shadow database on
  Prisma 7 ([prisma/orm#22779](https://github.com/prisma/orm/issues/22779)).
- That a new database on Supabase has no Supabase schemas (inferred from source).
- Whether Node accepts Supabase's server certificate with `sslmode=require`.
- Which Data API default-privilege setting the team project has.
- Whether `host.docker.internal` via `host-gateway` reaches port `54322` on the team's Linux
  machines.
- Whether the team's laptops and the school network have IPv6.

## Primary sources

Supabase docs (all read 2026-09-30):

- [Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Prisma quickstart](https://supabase.com/docs/guides/database/prisma)
- [Troubleshooting Prisma errors](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting)
- [Postgres roles](https://supabase.com/docs/guides/database/postgres/roles)
- [Roles, superuser access and unsupported operations](https://supabase.com/docs/guides/database/postgres/roles-superuser)
- [Supavisor FAQ](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI)
- [Disabling prepared statements](https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL)
- [IPv4 and IPv6 compatibility](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP)
- [CLI getting started](https://supabase.com/docs/guides/local-development/cli/getting-started)

Supabase source:

- `supabase/postgres` at [`b361654`](https://github.com/supabase/postgres/tree/b36165476f28c34448acbcc712a05d26213183ed):
  `migrations/db/migrate.sh`, `migrations/db/init-scripts/00000000000000-initial-schema.sql`,
  `migrations/db/migrations/10000000000000_demote-postgres.sql`,
  `migrations/db/migrations/20240606060239_grant_predefined_roles_to_postgres.sql`,
  `migrations/db/migrations/20250421084701_revoke_admin_roles_from_postgres.sql`,
  `ansible/playbook.yml`
- `supabase/cli` at [`v2.118.0`](https://github.com/supabase/cli/tree/v2.118.0/apps/cli-go):
  `internal/status/status.go`, `internal/utils/misc.go`, `internal/utils/config.go`,
  `internal/db/start/start.go`, `internal/db/start/templates/schema.sql`, `pkg/config/config.go`,
  `pkg/config/templates/config.toml`, `cmd/root.go`

Prisma ORM 7 docs:

- [PgBouncer](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/pgbouncer)
- [Connection pool](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool)
- [Transactions](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions)
- [Shadow database](https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/shadow-database)
- [Development and production](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production)
- [Config reference](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)
- [Upgrade to v7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [PostgreSQL](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql)
- [Multi-schema](https://www.prisma.io/docs/orm/v7/prisma-schema/data-model/multi-schema)
- [Supabase](https://www.prisma.io/docs/orm/v6/overview/databases/supabase) (served under the v6
  path, but written for `prisma.config.ts`)

Prisma source, `prisma/orm` at [`7.10.0`](https://github.com/prisma/orm/tree/7.10.0):
`packages/adapter-pg/src/pg.ts`, `packages/adapter-pg/src/errors.ts`,
`packages/client-engine-runtime/src/user-facing-error.ts`,
`packages/client-engine-runtime/src/transaction-manager/transaction-manager.ts`.

PostgreSQL 17 docs: [COMMENT](https://www.postgresql.org/docs/17/sql-comment.html),
[TRUNCATE](https://www.postgresql.org/docs/17/sql-truncate.html),
[CREATE DATABASE](https://www.postgresql.org/docs/17/sql-createdatabase.html),
[DROP DATABASE](https://www.postgresql.org/docs/17/sql-dropdatabase.html).

Docker docs: [Port publishing](https://docs.docker.com/engine/network/port-publishing/),
[Docker Desktop networking how-tos](https://docs.docker.com/desktop/features/networking/networking-how-tos/),
[dockerd `host-gateway`](https://docs.docker.com/reference/cli/dockerd/),
[IPv6](https://docs.docker.com/engine/daemon/ipv6/).

node-postgres: [Queries](https://node-postgres.com/features/queries),
[Pipelining](https://node-postgres.com/features/pipelining),
[pg-connection-string](https://github.com/brianc/node-postgres/blob/master/packages/pg-connection-string/README.md).

Issues (user reports, not vendor statements):
[prisma/orm#22779](https://github.com/prisma/orm/issues/22779),
[prisma/orm#26231](https://github.com/prisma/orm/issues/26231),
[supabase/supabase#33278](https://github.com/supabase/supabase/issues/33278).
