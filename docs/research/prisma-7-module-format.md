# Prisma ORM 7 `moduleFormat` behavior

Researched 2026-09-21 against the versioned, official Prisma ORM 7
documentation and the Prisma ORM 7.10.0 implementation.

## Question

Does the `prisma-client` generator default unconditionally to ESM output, or
does it infer the module format when `moduleFormat` is omitted? Is
"ESM-first" the more accurate description?

## Findings

- The documented, supported values of `moduleFormat` are `esm` and `cjs`.
  They select generated code for ECMAScript modules and CommonJS,
  respectively.
- `moduleFormat` is optional. The Prisma ORM 7 generator reference lists its
  default as **inferred from the environment** and explains that optional
  generator fields may be inferred from the environment and `tsconfig.json`.
- Omission therefore does not impose an unconditional ESM result. Prisma ORM
  7.10.0's generator implementation first reads the TypeScript configuration
  associated with the output directory. It selects CommonJS for a TypeScript
  `module` setting of `commonjs`; for `node16` or `nodenext`, it follows the
  nearest `package.json` and chooses ESM only when `type` is `module`; other
  TypeScript module settings select ESM. Without a usable TypeScript `module`
  setting, CommonJS-oriented generated/import extensions select CommonJS and
  the final fallback is ESM.
- "ESM-first" is Prisma's own description of `prisma-client` in the v7 Schema
  API. It accurately describes the generator's direction and ESM preference,
  but it is not a claim that every omitted `moduleFormat` resolves to ESM.

## Conclusion

The finding is confirmed. Saying that `prisma-client` "defaults to ESM
output" collapses environment-based inference into an unconditional default
and can incorrectly turn ESM into a project requirement. A precise
formulation is:

> `prisma-client` is ESM-first, but CommonJS remains available. The generator
> supports `moduleFormat = "esm"` or `"cjs"`; when not specified, the module
> format is inferred from the environment.

This wording keeps the project's ESM-versus-CommonJS choice open.

## Release-status check (2026-09-21)

- Prisma's current release-status page identifies Prisma ORM 8 as a release
  candidate, with general availability expected in October 2026.
- The same page says Prisma ORM 7 remains supported with bug fixes and security
  updates for 18 months after Prisma ORM 8 reaches general availability, and
  documents `^7` as the package range for projects staying on Prisma ORM 7.
- Current official pages describe Prisma ORM 8 as the "current release" while
  saying Prisma ORM 7 remains fully supported. Referring to Prisma ORM 7 as
  "the current GA line" is therefore imprecise status wording, even though it
  remains the supported stable major while Prisma ORM 8 is an RC. The durable
  project description is "the supported Prisma ORM 7 major deliberately locked
  by this project (`^7`)"; this does not change the chosen major or range.

## Primary sources

- [Generators reference (Prisma ORM v7)](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators)
- [Prisma Schema API (Prisma ORM v7)](https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference)
- [Prisma ORM 7.10.0 module-format implementation](https://github.com/prisma/prisma/blob/7.10.0/packages/client-generator-ts/src/module-format.ts)
- [Prisma ORM 7.10.0 generator dispatch](https://github.com/prisma/prisma/blob/7.10.0/packages/client-generator-ts/src/generator.ts)
- [Prisma ORM inference correction and test plan](https://github.com/prisma/prisma/pull/29712)
- [Prisma ORM release status](https://www.prisma.io/docs/orm/release-status)
- [Prisma ORM 7 overview](https://www.prisma.io/docs/orm/v7)
