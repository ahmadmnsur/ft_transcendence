# How Supabase Storage keeps files private

Checked 2026-09-30 against:

- the official Supabase docs, read from their source at commit
  [`ad0ed2c`](https://github.com/supabase/supabase/tree/ad0ed2cdbc90ca72e5cf260834e3ee8028c0a492/apps/docs/content/guides/storage)
  (2026-09-30);
- the Storage server source, [`supabase/storage`](https://github.com/supabase/storage) at release
  `v1.79.26` (2026-09-29, the latest), and at `v1.77.0`, the image the CLI pins for the local stack;
- the Storage client source in [`supabase/supabase-js`](https://github.com/supabase/supabase-js) at
  `v2.117.2` (2026-09-25);
- the Supabase CLI source, [`supabase/cli`](https://github.com/supabase/cli) at `v2.118.0`
  (2026-09-25).

Nothing was run against a hosted project or a local stack. Every claim below comes from a doc page
or a source file, linked beside it. Points that could not be confirmed are marked **Not confirmed**
and collected at the end.

This note states facts and what each one rules in or out. It makes no design decision for
PeerConnect.

## Question (issue #88)

What does Supabase Storage offer for avatars and Evidence?

1. **Private buckets**: who can read an object, and whether our server can upload, read, replace and
   delete with its own key while the browser never contacts Supabase (ADR-0009 d3, ADR-0018 d5, and
   the CSP's `img-src 'self'`, `docs/spec.md` §3.10).
2. **Streaming a file through NestJS versus a signed link**: what a signed link allows, and to whom,
   until it expires.
3. **Limits**: size per file (our caps are 2 MiB for an avatar and 5 MiB for Evidence), allowed types,
   bucket settings.
4. **Crash safety**: whether replacing or deleting a file can be made safe against a failure between
   the file and its database row (ADR-0009 d5, §9.4: at most one Evidence, replaced atomically).
5. **The local Supabase stack**: which of these it supports.

## Short answer

A private bucket with no access policies is closed to everyone except a holder of the project's
secret key. A NestJS server holding that key can upload, stream, replace and delete objects, so the
browser never has to contact Supabase. A signed link is the opposite: anyone who holds it can read
the object until it expires, and it points at the Supabase host, which our CSP blocks. There is no
transaction that covers both a Storage object and one of our rows, and object versioning is switched
off, so a crash between the two can leave them out of step; what Storage does give is an atomic
replace of one path, a create-only upload, and a metadata table we can read to find leftovers. The
local stack runs the same Storage server, with a few hosted-only features missing.

## 1. Private buckets

**Who can read an object**

- Buckets are private by default. In a private bucket, "all operations are subject to access control
  via RLS policies", and "this also applies when downloading assets"
  ([Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)).
- The policies are Postgres Row Level Security policies on the `storage.objects` table. "By default
  Storage does not allow any uploads to buckets without RLS policies"
  ([Access control](https://supabase.com/docs/guides/storage/security/access-control)). Reads in a
  private bucket are also policy-checked: the authenticated download route looks the object up
  through RLS when the bucket is not public
  ([`getObject.ts` v1.79.26](https://github.com/supabase/storage/blob/v1.79.26/src/http/routes/object/getObject.ts)).
  So a private bucket with no policies gives nothing to the publishable key or to a signed-in user's
  token.
- The only two ways to download from a private bucket are a request with an `Authorization` header,
  or a signed URL ([Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals),
  [Serving assets](https://supabase.com/docs/guides/storage/serving/downloads)).
- A public bucket "bypasses access controls for both retrieving and serving files": "anyone who
  possesses the asset URL can readily access the file". Uploads, deletes, moves and copies are still
  controlled ([Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)).

**The server's own key**

- A secret key (`sb_secret_...`), or the legacy `service_role` key, maps to the `service_role`
  Postgres role, which has `BYPASSRLS`
  ([API keys](https://supabase.com/docs/guides/getting-started/api-keys)). For Storage: "Service keys
  entirely bypass RLS policies, granting you unrestricted access to all Storage APIs"
  ([Access control](https://supabase.com/docs/guides/storage/security/access-control)).
- The secret key must never reach a browser. Supabase also refuses it from one: it "matches on the
  `User-Agent` header and returns HTTP 401 Unauthorized"
  ([API keys](https://supabase.com/docs/guides/getting-started/api-keys)).
- The JavaScript client runs in Node and takes the file as a `Buffer`, a Node stream or a web stream
  ([`StorageFileApi.ts` v2.117.2](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/storage-js/src/packages/StorageFileApi.ts)).
  With the secret key, a server can call `upload` (create, or overwrite with `upsert: true`),
  `update` (replace), `download`, `remove`, `move`, `copy`, `info`, `exists` and `createSignedUrl`.
  All of these are HTTPS calls from the server to `https://<project>.supabase.co/storage/v1`.
- Storage keeps its metadata in a `storage` schema inside the project's own Postgres database. It can
  be queried by SQL, but must be treated as read-only: "All operations, including uploading, copying,
  moving, and deleting, should **exclusively go through the API**"
  ([Storage schema](https://supabase.com/docs/guides/storage/schema/design)).

**Rules in / out**

- Rules in: a private bucket with no policies, used only by NestJS with the secret key. The browser
  then talks to PeerConnect alone, which fits ADR-0018 d5 and `connect-src 'self'`.
- Rules out: a public bucket for either file. Anyone with the URL could read it, which fails ADR-0009
  d3 ("no byte is ever reachable anonymously").

## 2. Streaming through NestJS versus a signed link

**Streaming through the server**

- The server can fetch `GET /storage/v1/object/authenticated/<bucket>/<path>` with its key
  ([Serving assets](https://supabase.com/docs/guides/storage/serving/downloads)). In the JavaScript
  client, `download(path).asStream()` returns the response body as a `ReadableStream`; plain
  `download(path)` reads the whole file into a `Blob` first
  ([`BlobDownloadBuilder.ts`](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/storage-js/src/packages/BlobDownloadBuilder.ts),
  [`StreamDownloadBuilder.ts`](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/storage-js/src/packages/StreamDownloadBuilder.ts)).
- Storage streams the body back with `Content-Type` (the type stored at upload), `Content-Length`,
  `ETag`, `Last-Modified` and `Accept-Ranges: bytes`, and it honours `Range` and `If-None-Match`
  ([`renderer.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/renderer/renderer.ts),
  [`backend/file.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/backend/file.ts)).
- So NestJS can pipe the object to the browser under its own route and set its own headers
  (`X-Content-Type-Options: nosniff`, `Cache-Control: no-store`). The browser sees only
  `https://localhost:8443`. **Yes: the browser never has to contact Supabase.**
- Cost of this path: every byte passes through NestJS. On the hosted project, what Storage sends to
  NestJS counts as Storage egress. The Free plan includes 5 GB uncached and 5 GB cached egress a month
  ([Egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress)).
- The hosted Storage API sits behind a CDN. For private buckets, access "is checked on a per user
  level" ([CDN](https://supabase.com/docs/guides/storage/cdn/fundamentals)). The docs warn that
  overwriting a file at the same path can serve stale content while the CDN catches up, and
  recommend uploading to a new path instead
  ([Standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)).
  **Not confirmed**: whether a server-key read can receive a stale cached copy after a same-path
  replace.

**What a signed link allows, and to whom**

- `createSignedUrl(path, expiresIn)` needs `select` permission (or the secret key), and the object
  must exist when the link is made
  ([`StorageFileApi.ts`](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/storage-js/src/packages/StorageFileApi.ts),
  [`object.ts` `signObjectUrl`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/object.ts)).
- The token is a JWT signed with a per-project URL-signing key. It carries the bucket and path, a
  "download" scope, an expiry, and optionally a pinned version. It carries **no user identity**
  ([`object.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/object.ts),
  [`jwt.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/internal/auth/jwt.ts)).
- The signed route needs no `Authorization` header. It checks the token's signature, scope, path and
  expiry, then reads the object as a superuser, with no RLS
  ([`getSignedObject.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/http/routes/object/getSignedObject.ts)).
  So **anyone who holds the link can download the object until it expires**, signed in or not.
- The link serves whatever object is at that path when it is used, unless it was pinned to a version.
  After a replace at the same path, an old link returns the new file. After a delete, it returns
  "not found" (same source).
- `expiresIn` is in seconds, with a minimum of 1. The server sets no practical maximum
  ([`getSignedURL.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/http/routes/object/getSignedURL.ts)).
- A single link cannot be revoked. Signed links are signed with a key separate from the Auth keys,
  so rotating Auth keys does not affect them; "If you need to revoke signed URLs, contact Supabase
  support" ([Serving assets](https://supabase.com/docs/guides/storage/serving/downloads)).
- With the Smart CDN (Pro plan and above), a cached response for a signed link "can continue to be
  served for the same signed URL until the CDN cache duration expires, even if the token in that URL
  has already expired"; the docs advise deleting the object to cut off access
  ([Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn)).
- The link points at the Supabase host, for example
  `https://<project>.supabase.co/storage/v1/object/sign/<bucket>/<path>?token=...`
  ([`StorageFileApi.ts`](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/storage-js/src/packages/StorageFileApi.ts)).
- Signed **upload** links also exist: `createSignedUploadUrl` gives a token, valid for 2 hours, that
  lets its holder upload to one path without further authentication (same file).

**Rules in / out**

- Rules in: streaming through NestJS. It keeps the browser same-origin, and every read goes through
  our own authorisation (ADR-0009 d3, d4).
- Rules out, under the current records: giving the browser a signed link. `img-src 'self'`,
  `frame-src 'self'` and `connect-src 'self'` (§3.10) block the Supabase host, ADR-0018 d5 says the
  browser fetches nothing from anyone else, and a pasted signed link works for anyone until it
  expires, which breaks ADR-0009 d3's "sign out and paste the URL for a 401".
- The same holds for signed upload links: the browser would have to send the file to Supabase.

## 3. Limits

**Size per file**

- A project-wide limit applies to all buckets. On the Free plan it "can't exceed 50 MB"; on Pro and
  Team it can go up to 500 GB. A bucket's own limit cannot be higher than the global one
  ([Limits](https://supabase.com/docs/guides/storage/uploads/file-limits)).
- Both our caps, 2 MiB and 5 MiB, fit well under 50 MB.
- The standard upload "is ideal for small files that are not larger than 6MB"; resumable (TUS)
  uploads are recommended above that
  ([Standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)). Both our
  files fit the standard upload.
- The limit is enforced on the bytes sent. A multipart upload is cut at the limit and rejected as
  `EntityTooLarge` (413). A raw upload whose `Content-Length` is above the limit is rejected before
  any byte is stored
  ([`uploader.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/uploader.ts),
  [Error codes](https://supabase.com/docs/guides/storage/debugging/error-codes)).
- **Unit trap.** Through the Storage API, a size written as text uses decimal units: `"5MB"` is
  5,000,000 bytes, and only `GB`, `MB`, `KB` and `B` are accepted. A plain integer is a byte count
  ([`limits.ts` `parseFileSizeToBytes`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/limits.ts),
  [`file-size-limit.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/http/schemas/file-size-limit.ts)).
  The CLI's `config.toml` reads sizes with 1024-based units, so `"5MB"` or `"5MiB"` there is
  5,242,880 bytes
  ([`size-units.ts`](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/size-units.ts)).
  Our caps (2,097,152 and 5,242,880 bytes) are exact only as integers through the API, or as MiB in
  `config.toml`.

**Allowed types**

- A bucket can list `allowed_mime_types`, as exact types or `type/*`
  ([Creating buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets),
  [`validators/mime-type.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/validators/mime-type.ts)).
- The check compares the **declared** type: the multipart `contentType` field or part type, or the
  request's `Content-Type` header. Storage never inspects the bytes
  ([`uploader.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/uploader.ts)).
  The type Storage stores, and later serves, is that declared type.
- The JavaScript client sends `text/plain;charset=UTF-8` for a `Buffer` or stream unless
  `contentType` is given, and `Cache-Control: max-age=3600` unless `cacheControl` is given
  ([`StorageFileApi.ts`](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/storage-js/src/packages/StorageFileApi.ts),
  [`types.ts`](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/storage-js/src/lib/types.ts)).
- **Not confirmed**: whether Storage adds `X-Content-Type-Options: nosniff` to its own responses. A
  search of the Storage source found no such header.

**Bucket settings and plan quotas**

- A bucket has `public` (default false), `file_size_limit` and `allowed_mime_types`. They can be set
  through the API, the dashboard, SQL on `storage.buckets`, or `config.toml` for the local stack
  ([Creating buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets),
  [Storage schema](https://supabase.com/docs/guides/storage/schema/design)).
- Object names may use letters, digits, whitespace and the listed punctuation
  ([Limits](https://supabase.com/docs/guides/storage/uploads/file-limits)).
- The Free plan includes 1 GB of stored files, averaged over the billing period
  ([Storage size](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size)).
- Image transformations are "enabled for Pro Plan and above", so not on the Free plan
  ([Image transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)).
  §9.7 previews the original file, so nothing in the spec needs them.
- The Smart CDN, which invalidates cached copies after an update or delete, and manual cache purge
  are both Pro plan and above ([Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn),
  [Purge](https://supabase.com/docs/guides/storage/cdn/purge-cdn-cache)).

**Rules in / out**

- Rules in: Supabase's size limit as a second guard behind our own caps.
- Rules out: bucket type rules as the check on file type. They trust a label, so §9.5's validation of
  the bytes stays with NestJS. The type NestJS declares at upload is the one Storage will store.

## 4. Crash safety

**No transaction covers both sides**

- The Storage server writes its metadata row in its own transaction, on its own database connection
  (locally, as the role `supabase_storage_admin`)
  ([`uploader.ts` `completeUpload`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/uploader.ts),
  [`storage.service.ts`](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/commands/start/services/storage.service.ts)).
  A NestJS database transaction cannot include a Storage upload or delete. The docs describe no
  two-phase commit or callback that would join them.

**What Storage makes atomic on its own side**

- **One upload is atomic for readers.** The bytes are written first under a new internal version
  key. Then one transaction, under a lock on that object, points the metadata row at the new version.
  Then a queued job deletes the old version's bytes. If the upload or the commit fails, the new bytes
  are queued for deletion and the old object stays as it was
  ([`uploader.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/uploader.ts),
  [`locator.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/locator.ts),
  [`object-admin-delete.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/events/objects/object-admin-delete.ts)).
  A reader sees the old file or the new one, never half of one.
- **Create-only upload.** Without upsert, an upload to a path that already exists fails with "already
  exists" (the upload guide says `400 Asset Already Exists`; the error-code list says
  `409 KeyAlreadyExists`). When two clients race for the same path, the first to finish wins
  ([Standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads),
  [Error codes](https://supabase.com/docs/guides/storage/debugging/error-codes)).
- **Overwrite is last-writer-wins.** With `x-upsert: true` (or `update()`), the last upload to finish
  wins (same guide). There is no condition on a previous version or ETag. The REST upload accepts no
  `If-Match`. The S3-compatible `PutObject` lists no conditional headers; only reads and the copy
  source of `CopyObject` take conditions
  ([S3 compatibility](https://supabase.com/docs/guides/storage/s3/compatibility)).
- **Delete.** `remove()` deletes the metadata rows and the bytes inside one Storage-side step. A path
  that does not exist is skipped without an error; the reply lists only what was deleted
  ([`object.ts` `deleteObjects`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/object.ts)).
  Deleted objects "are permanently removed and not recoverable". Deleting rows from
  `storage.objects` by SQL leaves the bytes orphaned and still billed
  ([Delete objects](https://supabase.com/docs/guides/storage/management/delete-objects),
  [Storage schema](https://supabase.com/docs/guides/storage/schema/design)).
- **Move and copy** exist. A move copies the bytes to a new version, then renames the row in one
  transaction, then queues the old bytes for deletion
  ([`object.ts` `moveObject`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/object.ts)).

**No object versioning**

- "S3 versioning is not supported. … Deleted objects are permanently removed and cannot be restored"
  ([S3 compatibility](https://supabase.com/docs/guides/storage/s3/compatibility)).
- The server has a versioning schema in progress, but a database check keeps every bucket's
  `versioning_status` at `DISABLED` (`buckets_versioning_dark_check`,
  [migration 0062](https://github.com/supabase/storage/blob/v1.79.26/migrations/tenant/0062-object-versioning-core.sql)).
- The newest client and server accept a `versionId` on download, info, signing and delete. It names
  the internal version of an object, and a version-pinned delete removes only that exact version
  ([`StorageFileApi.ts` `remove`](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/storage-js/src/packages/StorageFileApi.ts)).
  **Not confirmed**: whether a version-pinned delete acts as "delete only if still this version" while
  versioning is disabled, on the hosted service or locally. It is not in the guides.

**What we can see after a crash**

- `storage.objects` holds `bucket_id`, `name`, `version`, `created_at`, `updated_at` and a `metadata`
  object, in the same database as our tables. The docs allow querying it directly
  ([Storage schema](https://supabase.com/docs/guides/storage/schema/design)). So objects that no row
  of ours points to can be found by a read. Removing them must still go through the API.

**Rules in / out**

- Rules out: one atomic commit covering both the object and our row, and undoing a bad replace from
  an old version.
- Rules in: orderings where a crash can leave, at worst, an object that no row points to, never a row
  that points to nothing. Storage's create-only upload, its atomic same-path replace, its idempotent
  delete, and the readable `storage.objects` table are the pieces such an ordering can use. The docs'
  own advice to upload to a new path rather than overwrite points the same way. Which ordering
  PeerConnect uses is a design decision this note does not make.

## 5. The local Supabase stack

- `supabase start` runs the whole stack in Docker, Storage included, at
  `http://127.0.0.1:54321/storage/v1`
  ([CLI getting started](https://supabase.com/docs/guides/local-development/cli/getting-started)).
- CLI `v2.118.0` pins `supabase/storage-api:v1.77.0` (released 2026-09-11). The latest Storage
  release is `v1.79.26` (2026-09-29)
  ([CLI `Dockerfile`](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/pkg/config/templates/Dockerfile)).
  **Not confirmed**: which Storage version the hosted service runs. One difference between the two
  tags: `v1.79.26` repeats the "already exists" check when it commits a create-only upload;
  `v1.77.0` checks only before it writes the bytes
  ([`uploader.ts` v1.77.0](https://github.com/supabase/storage/blob/v1.77.0/src/storage/uploader.ts)).
- Locally, files are kept on disk (`STORAGE_BACKEND=file`) in a Docker named volume; metadata is in
  the local Postgres `storage` schema
  ([`storage.service.ts`](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/commands/start/services/storage.service.ts)).
- It is the same Storage server, so private and public buckets, RLS, the secret key, upload, upsert,
  update, remove, move, copy, signed links and signed upload links (valid 7,200 seconds locally) are
  all present. Resumable uploads (`/storage/v1/upload/resumable`) and the S3 protocol are on by
  default (same file, and the
  [`config.toml` template](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/pkg/config/templates/config.toml)).
  These were read from config and source, not run.
- `supabase start` prints a publishable key and a secret key; "the local secret key takes the place of
  the local `service_role` key" ([API keys](https://supabase.com/docs/guides/getting-started/api-keys)).
- The global file size limit defaults to `50MiB`, the same ceiling as the hosted Free plan
  (`[storage] file_size_limit`).
- Buckets can be declared in `config.toml` under `[storage.buckets.<name>]`, with `public` (default
  false), `file_size_limit`, `allowed_mime_types` and `objects_path`
  ([CLI config reference](https://supabase.com/docs/guides/local-development/cli/config),
  [`packages/config/src/storage.ts`](https://github.com/supabase/cli/blob/v2.118.0/packages/config/src/storage.ts)).
  `supabase start` creates them. `supabase seed buckets` applies them again, and with `--linked` it
  applies them to the hosted project
  ([`seed buckets`](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/commands/seed/buckets/SIDE_EFFECTS.md)).
- Image transformations are off by default. `[storage.image_transformation] enabled = true` starts an
  image service locally, but the hosted Free plan does not offer them
  ([`start.gates.ts`](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/commands/start/start.gates.ts)).
- The local stack has no CDN among its services (CLI `Dockerfile`). Caching, stale reads after a
  replace, and the Smart CDN can only be seen on the hosted project.
- **Not confirmed**: how a NestJS container on our Docker Compose network reaches the local Storage
  API. Inside a container, `127.0.0.1` is the container itself; the CLI guide uses
  `host.docker.internal` for its own functions reaching the local database.
- **Not confirmed**: whether stored files survive `supabase stop`. The guide says only that it stops
  "without resetting your local database".

**Rules in / out**

- Rules in: the same private-bucket, server-key and streaming path on every developer's machine, with
  buckets and their limits declared once in `config.toml`.
- Rules out: testing CDN behaviour, or anything that depends on the hosted Storage version, on the
  local stack alone.

## Not confirmed

- Which Storage server version the hosted service runs.
- Whether a server-key read on the hosted project can get a stale CDN copy after a same-path replace.
- Whether a version-pinned delete works as a compare-and-delete while versioning is disabled.
- Whether Storage sets `X-Content-Type-Options: nosniff` on its own responses (not found in source).
- How a NestJS container reaches the local Storage API, and whether stored files survive
  `supabase stop`.
- Nothing here was run against a live project or a local stack.

## Primary sources

Docs (source at commit `ad0ed2c`, read 2026-09-30):

- [Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Creating buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets)
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Serving assets](https://supabase.com/docs/guides/storage/serving/downloads)
- [Standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- [Resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- [Limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Storage schema](https://supabase.com/docs/guides/storage/schema/design)
- [Delete objects](https://supabase.com/docs/guides/storage/management/delete-objects)
- [Storage CDN](https://supabase.com/docs/guides/storage/cdn/fundamentals),
  [Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn),
  [Purge CDN cache](https://supabase.com/docs/guides/storage/cdn/purge-cdn-cache)
- [S3 compatibility](https://supabase.com/docs/guides/storage/s3/compatibility)
- [Image transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)
- [Error codes](https://supabase.com/docs/guides/storage/debugging/error-codes)
- [API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Storage size](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size),
  [Egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress)
- [CLI getting started](https://supabase.com/docs/guides/local-development/cli/getting-started),
  [CLI config reference](https://supabase.com/docs/guides/local-development/cli/config)

Source code:

- `supabase/storage` `v1.79.26`:
  [`src/storage/uploader.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/uploader.ts),
  [`src/storage/object.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/object.ts),
  [`src/storage/limits.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/limits.ts),
  [`src/storage/validators/mime-type.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/validators/mime-type.ts),
  [`src/storage/renderer/renderer.ts`](https://github.com/supabase/storage/blob/v1.79.26/src/storage/renderer/renderer.ts),
  [`src/http/routes/object/`](https://github.com/supabase/storage/tree/v1.79.26/src/http/routes/object),
  [`migrations/tenant/0062-object-versioning-core.sql`](https://github.com/supabase/storage/blob/v1.79.26/migrations/tenant/0062-object-versioning-core.sql)
- `supabase/storage` `v1.77.0`:
  [`src/storage/uploader.ts`](https://github.com/supabase/storage/blob/v1.77.0/src/storage/uploader.ts)
- `supabase/supabase-js` `v2.117.2`:
  [`packages/core/storage-js/src/packages/`](https://github.com/supabase/supabase-js/tree/v2.117.2/packages/core/storage-js/src/packages),
  [`packages/core/storage-js/src/lib/types.ts`](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/storage-js/src/lib/types.ts)
- `supabase/cli` `v2.118.0`:
  [`apps/cli-go/pkg/config/templates/config.toml`](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/pkg/config/templates/config.toml),
  [`apps/cli-go/pkg/config/templates/Dockerfile`](https://github.com/supabase/cli/blob/v2.118.0/apps/cli-go/pkg/config/templates/Dockerfile),
  [`apps/cli/src/commands/start/services/storage.service.ts`](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/commands/start/services/storage.service.ts),
  [`packages/config/src/storage.ts`](https://github.com/supabase/cli/blob/v2.118.0/packages/config/src/storage.ts)
