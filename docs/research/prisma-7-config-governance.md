# Prisma ORM 7 Config and schema-gate scope

Researched 2026-09-20 against the versioned, official Prisma ORM 7 documentation.

## Question

Does the root `prisma.config.ts` materially control the same shared
schema/migration/seed mechanisms that ADR-0005's schema gate is intended to
protect?

## Findings

- `schema` tells the Prisma CLI which schema file, or directory of `.prisma`
  files, to load. Relative paths are resolved from the Config file. In this
  project, that setting therefore selects the deliberate
  `prisma/schema.prisma` entry point.
- `migrations.path` tells Prisma where to write migration files and where to
  find them. Changing it changes migration generation and discovery rather
  than merely changing editor or build-tool metadata.
- `datasource.url` supplies the database connection used by Prisma CLI
  operations. Prisma's v7 `migrate dev`, `migrate reset`, and `migrate deploy`
  documentation specifically says the datasource URL comes from Prisma
  Config. This is the target against which migration history, drift, resets,
  and pending migrations operate; it should not be confused with the driver
  adapter passed separately to `PrismaClient` by application runtime code.
- `migrations.seed` registers the command run by `prisma db seed`. In Prisma
  ORM 7, registering that command does **not** make seeding automatic:
  `migrate dev` and `migrate reset` no longer trigger it, and seeding occurs
  only when `prisma db seed` is invoked explicitly.
- Prisma commands may expose `--config`, `--schema`, or URL overrides where
  documented. Thus the project Config is the repository's normal/default
  control point, not an unbypassable runtime invariant. That does not reduce
  the significance of changing the checked-in default.

## Filename discovery in Prisma 7.10+

Prisma ORM **7.10.0** introduced a version-specific Config name so Prisma 7
can coexist with newer Prisma versions. The official 7.10.0 release notes
state all of the following explicitly:

- new projects initialized by the Prisma 7 CLI scaffold
  `prisma7.config.ts`;
- without an explicit `--config`, the CLI searches root-level
  `prisma7.config.*`, then `.config/prisma7.*`, then existing
  `prisma.config.*` as a backwards-compatible fallback;
- the supported extensions are `.js`, `.ts`, `.mjs`, `.cjs`, `.mts`, and
  `.cts`;
- if a discovered `prisma7.config.*` exists but fails to load, the CLI reports
  that error instead of silently falling through to a legacy Config.

The narrower statement that the current Prisma 7 CLI "searches for
`prisma7.config.*` first and falls back to an existing `prisma.config.*`" is
therefore directly supportable, not merely inferred from implementation
source. It is an accurate abbreviation for **7.10+**, provided the omitted
`.config/prisma7.*` step and the explicit-`--config` override are understood.
Earlier Prisma 7 releases explain why existing projects and some older v7
reference pages use `prisma.config.ts`.

This does not require renaming this project's deliberately chosen root
`prisma.config.ts`: Prisma 7.10+ retains that name as an explicit
backwards-compatible discovery fallback. It does mean governance should name
the project's actual Config file rather than generalizing from the newer
scaffold default.

## Explicit generation and datasource fields in Prisma 7

Prisma ORM 7 separates migration and client-generation steps. The official v7
upgrade guide states that `prisma migrate dev` and `prisma db push` no longer
run `prisma generate` automatically; after a schema change, workflows that
need an updated generated client must invoke `npx prisma generate` explicitly.
This is independent of the required explicit `output` used by the
`prisma-client` generator: the output selects where generation writes, but it
does not make migration commands trigger generation.

The three former schema datasource URL fields do not all have the same v7
destination:

- `url` moved from the schema datasource block to
  `datasource.url` in Prisma Config.
- `shadowDatabaseUrl` moved from the schema datasource block to
  `datasource.shadowDatabaseUrl` in Prisma Config.
- `directUrl` did **not** become `datasource.directUrl` in Prisma Config. That
  Config property was removed in Prisma ORM 7 in favor of `url`. A project
  that previously used a separate `directUrl` for CLI migrations supplies
  that connection string as Prisma Config's `datasource.url`, because the CLI
  uses that field for migrations.

Primary evidence: the [Prisma ORM 7 upgrade
guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7), the [Prisma
Config v7 reference](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference),
and the [Prisma ORM 7.0.0
changelog](https://www.prisma.io/changelog/2025-11-19).

## Governance conclusion

Yes. `prisma.config.ts` materially overlaps a gate concerned with shared
schema, migration, and seed correctness. A change to it can redirect the
schema entry point, redirect migration creation/discovery, select the database
used by migration commands, or replace/disable the project's seed command.
Keeping the gate limited to `prisma/**` would leave those controls outside the
gate solely because the chosen Config filename lives at the repository root.

The technically coherent scope is therefore `prisma/**` **and**
`prisma.config.ts`. That conclusion changes neither authorship nor the
round-robin review rule for unrelated files: developers may still author
migrations and Config changes, while the existing gate holder reviews changes
to this shared Prisma surface.

## Primary sources

- [Prisma Config reference (ORM v7)](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)
- [Prisma schema location and configuration (ORM v7)](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/location)
- [Prisma Schema API: datasource (ORM v7)](https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference)
- [Database seeding (ORM v7)](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding)
- [`prisma migrate dev` (CLI v7)](https://www.prisma.io/docs/cli/v7/migrate/dev)
- [`prisma migrate reset` (CLI v7)](https://www.prisma.io/docs/cli/v7/migrate/reset)
- [`prisma migrate deploy` (CLI v7)](https://www.prisma.io/docs/cli/v7/migrate/deploy)
- [Prisma ORM 7.10.0 release notes: versioned Config discovery](https://github.com/prisma/orm/releases/tag/7.10.0)
- [Prisma ORM v7 CLI guide: 7.10+ generated filename and compatibility](https://www.prisma.io/docs/v7/prisma-postgres/from-the-cli)
- [Upgrade to Prisma ORM 7: explicit generation and datasource migration](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Prisma Config reference: `url`, `shadowDatabaseUrl`, and removed `directUrl`](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)
- [Prisma ORM 7.0.0 changelog: schema and Config field changes](https://www.prisma.io/changelog/2025-11-19)
