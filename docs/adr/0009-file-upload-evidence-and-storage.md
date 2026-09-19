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

3. **No byte is ever reachable anonymously.** Every file is served by an authenticated API
   route with an opaque random id, never as a static path. "Proper access control" at `:542`
   does not mean every file is private — avatars must appear on profiles and the feed — it
   means every read is authorised. Two tiers: an avatar is readable by any signed-in Student,
   Evidence by the set in decision 4. This is what makes `:542` demonstrable in two moves: sign
   out and paste the URL for a 401, sign in as an unrelated Student for a 403.

4. **Evidence is readable by the Match pair and Admins, and explicitly not by Peer Moderators.**
   The Mentor taught it, so the pair share the artefact; Admins already sit inside the Match's
   private surface by way of Private Feedback, and an uploaded file needs someone able to look
   at it when it is abused. ADR-0008 scoped a Peer Moderator to the report queue and Remove
   Post, and a Learning Outcome is not a Post — widening them here would quietly undo the
   scoping that converted advanced permissions to firm at 18 points.

   This settles an audience that was missing before this ADR: the three-way split named
   visibility for Private Feedback and the Public Takeaway, and left the **Learning Outcome's
   own readership unwritten**. `CONTEXT.md` now states it.

5. **Exactly one optional file per Learning Outcome, deletable and replaceable by the Mentee at
   any time. 5 MB for Evidence, 2 MB for an avatar; PDF, PNG and JPEG.** Optional because
   ADR-0002 makes the Review what earns XP, and a required upload would gate XP behind a file —
   an obligation this plan never agreed to. One, because "many" buys an ordering-and-listing UI
   and a per-file delete surface for no product gain. Evidence is optional and at most one
   Evidence item belongs to each Learning Outcome; the exact owning entity is settled by the
   entity map, not here.

   **The Learning Outcome text is testimony; the Evidence is an aid.** That is what makes the
   file deletable while Posts, Prompt answers and Private Feedback are not: no one else's record
   depends on it the way the community depends on a Post or Mentor Reputation depends on Private
   Feedback. It also satisfies `:548` on the document surface instead of resting that bullet on
   "you can replace your avatar". Whether the Learning Outcome *text* is editable is a separate
   question and stays open.

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
- **The seed needs no avatar images.** Seeded Students carry the default avatar; one or two
  real uploads during the demo are enough to show the surface.
- **Mission authorship is exposed as undecided.** Pricing the Mission-brief option found that
  nothing in the plan says who writes a Mission or when. It is not this decision's to make, but
  it can no longer be assumed away.
