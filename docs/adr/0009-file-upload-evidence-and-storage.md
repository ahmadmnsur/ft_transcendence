# File upload: Evidence on the Learning Outcome, and every byte in Postgres

`document/en.subject.md:536`-`:548` claims a Minor for a file upload and management system,
and its first bullet asks for "multiple file types (images, documents, etc.)". Avatars are
images, owed anyway by `:596` under standard user management, so the image half was settled
the moment ADR-0008 named avatar as a Student-editable field. The second type had no answer:
**the concept proposal mentions no upload, avatar, image, file or attachment anywhere**. Its
only "document" is the Future Learning Portfolio *export* at `:347` — a download. Both file
types are therefore subject-driven, not product-driven, and choosing a host for the second
one is a product decision against a locked concept rather than a build detail.

The shape we chose: **the second file type is Evidence — one optional file a Mentee attaches
to their Learning Outcome — and every byte lives in Postgres.** Everything below follows from
refusing to add product surface the proposal does not already imply, and from making
authorisation structural rather than enforced.

## What this ADR changes in earlier records

- **ADR-0004** is **extended, not amended**. Its named Postgres volume stays the only volume;
  decision 2 below settles that no second one is added, which is what keeps `make down` and
  the wipe target correct for files as well as rows.
- **ADR-0008** is **extended, not amended**. Its decision 8 lists avatar among the fields an
  Admin may edit, but Removal's effect on the avatar was unstated. Decision 6 below states it.
  The soft-delete scoping in its decision 6 — Student and Post, those two entities only —
  stands verbatim; neither file added here is soft-deleted.

## The decisions

1. **The second file type is Evidence, attached to the Learning Outcome.** Three other hosts
   were live and each was more expensive (see Considered options). Evidence adds no screen, no
   role and no lifecycle: the Review form is already on the critical path, the author is
   unambiguous because only a Mentee submits a Review, and the proposal already calls the
   record it feeds "evidence-based" at `:231`. The word is the domain's, not an invention.

2. **Bytes live in a `bytea` column in Postgres, never on a second volume.** ADR-0004's single
   named volume stays single, so there is no way to end up with an orphaned file or a dangling
   row across `make down` and the wipe target. More importantly every read *necessarily* passes
   through NestJS, which makes "no file is reachable without authorisation" **structural** — the
   same move as ADR-0007's derived liveness and ADR-0004's structural single origin. A file
   directory would have left one nginx `location` between the project and a failed
   access-control bullet. At a seed of ~30 Students under the caps in decision 5, the database
   bloat this trades away is not a real cost.

   > **Proxy envelope corrected 2026-09-22, extending ADR-0004 decision 2.** nginx defaults
   > `client_max_body_size` to 1 MiB, below both file caps. The locations proxying avatar and
   > Evidence uploads therefore set it explicitly to **6 MiB**: enough for one maximum-size
   > Evidence payload plus multipart framing, while the application still enforces the smaller
   > per-file caps below. Acceptance must prove a maximum-size Evidence upload reaches NestJS;
   > otherwise the proxy, not the product rule, has silently reduced the limit.

3. **No byte is ever reachable anonymously.** Every file is served by an authenticated API
   route with an opaque random id, never as a static path. "Proper access control" at `:542`
   does not mean every file is private — avatars must appear on profiles and the feed — it
   means every read is authorised. Two tiers: an avatar is readable by any signed-in Student,
   Evidence by the set in decision 4. This is what makes `:542` demonstrable in two moves: sign
   out and paste the URL for a 401, sign in as an unrelated Student for a 403.

   > **Upload-CSRF contract corrected 2026-09-22, narrowing ADR-0003 decision 10.** Its historical
   > “JSON content-type requirement on every mutation” cannot carry a file upload. Avatar and
   > Evidence create/replace routes are the only non-JSON mutation exception: they accept
   > `multipart/form-data` only when `Origin` equals `PUBLIC_ORIGIN` exactly and the request carries
   > `X-PeerConnect-CSRF: 1`; absent, `null` or mismatched Origin and a missing or different header
   > are rejected before file processing. Delete remains a JSON mutation. `SameSite=Lax` still
   > applies to every route, and no cross-origin CORS permission is added.

4. **Evidence is readable by the Match pair and Admins, and explicitly not by Peer Moderators.**
   The Mentor taught it, so the pair share the artefact; Admins already sit inside the Match's
   private surface by way of Private Feedback, and an uploaded file needs someone able to look
   at it when it is abused. ADR-0008 scoped a Peer Moderator to the report queue and Remove
   Post, and a Learning Outcome is not a Post — widening them here would quietly undo the
   scoping that converted advanced permissions to firm at 18 points.

   This settles an audience that was missing before this ADR: the three-way split named
   visibility for Private Feedback and the Public Takeaway, and left the **Learning Outcome's
   own readership unwritten**. `CONTEXT.md` now states it.

   > **Authorization clarified 2026-09-22.** “The Match pair” means **the Mentor and Mentee on the
   > one Match reached through this Evidence's `Review`**, not either Student's current Match and
   > not an arbitrary earlier or later Match involving the uploader. For an authenticated request,
   > the allow rule is exactly: requester id equals that Match's `mentor_id` or `mentee_id`, **or**
   > the requester's current role is `ADMIN`. A `PEER_MODERATOR` role grants no access by itself;
   > a Peer Moderator who is the originating Mentor or Mentee retains the same pair-bound access
   > as any other participant. Later Matches and role changes transfer no pair-bound access.

5. **Exactly one optional file per Learning Outcome, deletable and replaceable by the Mentee at
   any time. 5 MB for Evidence, 2 MB for an avatar; PDF, PNG and JPEG.** Optional because
   ADR-0002 makes the Review what earns XP, and a required upload would gate XP behind a file —
   an obligation this plan never agreed to. One, because "many" buys an ordering-and-listing UI
   and a per-file delete surface for no product gain. Evidence is optional and at most one
   Evidence item belongs to each Learning Outcome; the exact owning entity is settled by the
   entity map, not here.

   > **Settled by ADR-0014.** The owning entity is **`Review`**, which carries the Learning
   > Outcome (decision 1), and the bytes live in a dedicated `Evidence` table rather than a column
   > on it (decision 12) — ADR-0009 decision 2 said "a `bytea` column" without saying in which
   > table, and Prisma's default scalar selection makes a column on a hot table a silent footgun.

   **The Learning Outcome text is testimony; the Evidence is an aid.** That is what makes the
   file deletable while Posts, Prompt answers and Private Feedback are not: no one else's record
   depends on it the way the community depends on a Post or Mentor Reputation depends on Private
   Feedback. It also satisfies `:548` on the document surface instead of resting that bullet on
   "you can replace your avatar". Whether the Learning Outcome *text* is editable is a separate
   question and stays open.

   > **No longer open — answered by ADR-0014 decision 11: the text is immutable**, matching the
   > Public Takeaway and Private Feedback beside it. The sentence above is what decided it, so the
   > rule states in one line: **a Review is immutable; its one attachment is not.**

   > **The clause before that one — "Mentor Reputation depends on Private Feedback" — is
   > half-revised by ADR-0013**, and the decision stands. It names a score that does not ship:
   > **no aggregate is taken over the ratings anywhere** (ADR-0013 d4). The Post clause carries
   > the analogy on its own, and the dependency that survives is a *human* one rather than a
   > computed one — ADR-0013 d6 makes the individual Private Feedback a Mentor has received the
   > whole of their recognition, so deleting it would take away everything they get to read.
   > Evidence remains the one attachment no other record rests on, which is the point.

   > **Modification lifecycle clarified 2026-09-22.** Once the `Review` exists, only its
   > originating Mentee may create, replace or delete its Evidence, and only while authenticated
   > and neither Suspended nor Removed. The owning Match is necessarily `COMPLETED`; that terminal
   > or historical status does not close the attachment path, and a later Match is irrelevant.
   > Suspension pauses the path without touching the row, reinstatement restores it, and Removal
   > ends it permanently while the Evidence survives for the remaining authorized readers. The
   > Mentor and an Admin who is not that originating Mentee are read-only. Mutating the separate
   > `Evidence` row never edits the immutable `Review`, Learning Outcome, Private Feedback, Public
   > Takeaway or Match history.
   >
   > Replacement is atomic: authorization and complete validation of the new payload happen before
   > the unique-per-Review row changes, and a rejected or failed replacement leaves the old Evidence
   > intact. Concurrent create/replace/delete operations must have an outcome equivalent to one
   > serial order, with at most one Evidence row at every committed state.

   > **File acceptance contract clarified 2026-09-22.** Here “5 MB” means **5 MiB = 5,242,880
   > file bytes** and “2 MB” means **2 MiB = 2,097,152 file bytes**, excluding multipart framing.
   > Evidence accepts PDF, PNG or JPEG; Avatar accepts PNG or JPEG and **never PDF**. Client-side
   > checks mirror these rules for feedback, but only the server authorizes storage. The server
   > must validate the complete bytes with a format-aware parser/decoder and reject empty,
   > malformed or truncated content; a filename extension, multipart `Content-Type` or leading
   > signature alone never qualifies a file. If a supplied extension or media type claims a
   > different format from the validated bytes, reject rather than relabel it (`.jpg` and `.jpeg`
   > both name JPEG). Persist `application/pdf`, `image/png` or `image/jpeg` and the size from the
   > validated bytes, never from client metadata, and serve that canonical type with
   > `X-Content-Type-Options: nosniff`. This chooses a validation contract, not a library.

   Accepting images as well as documents is what actually satisfies `:538`. Evidence from a
   pair-programming session is most naturally a screenshot, so a document-only attachment would
   be useless for its commonest case — and one surface taking both categories makes "multiple
   file types" demonstrable **on a single screen**, rather than resting on the argument that an
   avatar over here and a PDF over there add up to two types.

6. **Removal replaces the avatar with the default and deletes that file outright; Evidence
   survives.** The two files diverge because an avatar is identity and Evidence is contribution.
   `CONTEXT.md` already shows a removed Student as a former student rather than erasing them, so
   the face follows the name; their Evidence stays readable by the Mentor and Admins exactly as
   before, on the same precedent that keeps "the Private Feedback they wrote". Neither file is
   soft-deleted — ADR-0008 scoped that to Student and Post only.

   One accepted consequence, recorded rather than discovered later: **a removed Student loses the
   delete that decision 5 gave them**, because they can never sign in again. That is Removal
   being final by policy, the same category of accepted gap as ADR-0003's Presence.

   > **Removed-row finality clarified 2026-09-21 by ADR-0008.** A Removed Student is view-only,
   > including to an Admin. No later avatar edit can recreate the deleted file; the default avatar
   > remains final. Evidence survival is unchanged.

7. **A Suspension touches neither file.** It is reversible and destroys nothing; their Posts
   remain, so their avatar and Evidence do too.

## Considered options

**A Mission brief** (rejected, decision 1). The most tempting host, and the most expensive: a
Mission has no author. The proposal's `:133`-`:145` reads as a fixed list of one-line tasks, and
ADR-0002 made Match creation automatic at Round open, so there is no human in the loop to write
a brief. Choosing it would have forced a Mission-authorship decision this ticket did not own.

**Match material shared between Mentor and Mentee** (rejected, decision 1). Effectively file
sharing in chat. It builds an upload surface into the one module deliberately kept thin —
persisted 1:1 DMs only — and every file-sharing bullet in the subject lives in advanced chat,
which the module-claim decision put out of scope. It also has the messiest access control, per
pair and per message, interacting with **Block**.

**Dropping the file upload module** (rejected, decision 1). 18 points falls to 17 and still
clears the threshold of 14. Rejected because avatars are owed by `:596` regardless, so the
module is roughly one nullable relation away from free; dropping it discards a point for nothing.

**Reading "multiple file types" as multiple image formats** (rejected, decision 5). PNG, JPEG
and WebP on one avatar surface is the cheapest reading of `:538` and the least defensible: the
bullet's own examples name two categories, and a defense would reasonably expect to see both.

**A second named volume for files** (rejected, decision 2). Conventional and it streams better.
Rejected because it means two stores to keep in sync across `make down` and the wipe target, and
it leaves a live route to failing `:542` that no amount of care in the API can close.

## Consequences

- **`CONTEXT.md` gains Evidence** and **sharpens Learning Outcome** with the audience decision 4
  settled. The avatar gets no entry — it is a field on a profile, not a concept.
- **The entity map now has a fifth known hard spot.** At most one Evidence belongs to each
  Learning Outcome, so whichever entity ends up carrying the Learning Outcome carries it —
  which bears directly on the "one entity or three?" question already open there.
- **Whether an attachment is reportable is now a question for the report queue**, and a sharp
  one: if Evidence is reportable, the one role built for reviewing reports cannot see it.

  > **Answered by ADR-0011: it is not.** Exactly the bind named here is why — it would place an
  > item in the queue that the queue's own role cannot open. Abuse in Evidence is reported as a
  > **Student**, which only an Admin reads, so **the visibility rule above stands unamended**.
- **The seed needs no avatar images.** Seeded Students carry the default avatar; one or two
  real uploads during the demo are enough to show the surface.
- **Mission authorship is exposed as undecided.** Pricing the Mission-brief option found that
  nothing in the plan says who writes a Mission or when. It is not this decision's to make, but
  it can no longer be assumed away.

  > **Answered by ADR-0012: nobody writes one.** A Mission is one of six fixed meeting modes,
  > assigned by the machine at Match creation and frozen there. So the Mission-brief option was
  > priced against an authorship that was never going to arrive, and **decision 1 stands** — the
  > Learning Outcome remains Evidence's host on its own reasoning.
