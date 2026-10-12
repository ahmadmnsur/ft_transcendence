# The entity set: nineteen tables, a Review split across three homes, and one invariant the schema cannot hold

> **Under revision 2026-09-30: tables change with the move to Supabase.**
> The team settled on 2026-09-30 that Supabase provides PeerConnect's database, file storage and
> login, with Socket.IO kept ([Map: PeerConnect moves to Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/85)).
> The bytes of the two byte tables (decision 12) move to Supabase Storage. Whether `Session` and
> `Student.password_hash` stay, and whether the count of nineteen tables changes, is still open:
> [Settle which tables change for Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/96) settles which tables, columns and constraints, after [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91) and [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92).
> The text below is kept as written; [Write the Supabase ADR and annotate the ADRs it changes](https://github.com/ahmadmnsur/ft_transcendence/issues/102) records what the move changes.

> **`Session` stays, 2026-09-30.** [Settle how the browser and the socket prove who is signed in](https://github.com/ahmadmnsur/ft_transcendence/issues/91)
> keeps PeerConnect's own session, so the `Session` table stays as ADR-0003 has it. Whether
> `Student.password_hash` stays, and whether the count of nineteen tables changes, is still open
> for [Settle which tables change for Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/96).

> **`Student.password_hash` goes, 2026-10-02.** [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92) moves the
> password to a Supabase Auth user with the Student's own id, so PeerConnect stores no hash. A
> `password_version` number takes the column's place: it is what sign-in re-checks against a
> password change (ADR-0003 d6's note). `Student.email` stays and stays unique: it is the only
> copy of the real email. [Settle which tables change for Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/96) still records the column change and
> whether the count of nineteen tables moves.

> **`Student.display_name_search` joins, 2026-10-02.** [Settle what the database stores in French
> and Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/95) adds no translation columns,
> but `Student` gains one column: the display name folded for search (lower case, NFKD, combining
> marks dropped, `ة` → `ه`, `ى` → `ي`, no tatweel), so `احمد` finds `أحمد` and `helene` finds
> `Hélène`. One function, `foldName` in `src/shared/`, folds both the stored name and the search
> text, and one helper, `nameFields`, returns both fields; every path that writes a name saves
> them together. The schema does not hold the copy's agreement with `display_name`: like decision
> 13's rule that a Takeaway `Post`'s author is its Review's Mentee, it is a service rule, held by
> `nameFields`. Name search
> matches the column with Prisma `contains` on `foldName(q)`, in place of `ILIKE` on the display
> name. It is plain Prisma and adds no raw-SQL step; the count stays at the nine of the
> *Consequences* count note of 2026-10-02. The API never returns the column. It is a copy of the
> display name and follows it everywhere, Removal included, so it is no new kind of personal data
> and the Privacy Policy is unchanged; [Settle what the Privacy Policy and Terms say about
> Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100) confirms the wording.
> [Settle which tables change for
> Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/96) still records the column
> change and whether the count of nineteen tables moves.
>
> > **Confirmed 2026-10-11 by [Settle what the Privacy Policy and Terms say about
> > Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100):** the Privacy Policy does
> > not change for `display_name_search`. It lists the display name, and the column is a copy of it
> > that is never shown.

> **`Student.forty_two_id` joins, 2026-10-08.** [Settle how a 42 login finds its Student on
> Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93) adds one column: 42's
> account `id`, a nullable unique integer. It is set when a Student signs up through 42 or connects
> 42, and cleared when they disconnect it; a Removed row keeps it (ADR-0008 d7's note). A 42 login
> finds its Student by this column alone, never by `Student.email` (ADR-0018 d7). It is a plain
> Prisma unique index and adds no raw-SQL step. [Settle which tables change for
> Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/96) still records the column
> change and whether the count of nineteen tables moves.

> **Settled 2026-10-10 by [Settle which tables change for
> Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/96).** This answers every
> "still open" and "still records" in the notes above and in decision 12's note of 2026-10-05. The
> count stays **nineteen tables and nine enums**. `Session`, `Avatar` and `Evidence` all stay, and
> no new table is needed: the 42 sign-up draft and the Confirm with 42 permission are kept in
> memory (ADR-0003's notes on decisions 10 and 11). The full list of changes:
>
> - `Student`: `password_hash` goes, and `password_version` (integer, not null, default 0) takes
>   its place. `email` stays unique. `display_name_search` and `forty_two_id` (integer, nullable,
>   unique) join. `display_name` gets the `und-x-icu` collation.
> - `Avatar` and `Evidence` drop `bytes` and gain no path column (decision 12's note).
> - No foreign key from our tables into Supabase's `auth` or `storage` schemas (ADR-0016's *Not
>   settled* note of 2026-10-04). A Student shares its id with its Supabase Auth user, and a file
>   is named by its row's token.
> - No row-level security and no grants step. The team project's Data API is off, and the fallback
>   runs no REST service ([Create PeerConnect's Supabase organization and team
>   project](https://github.com/ahmadmnsur/ft_transcendence/issues/90); ADR-0004 decision 1's note
>   of 2026-10-04).
> - `Student.id`, `Avatar.token` and `Evidence.token` lose their Prisma default (decision 10's
>   note).
>
> Raw SQL stays at **nine** steps, or **eleven** if the `partialIndexes` preview feature is declined
> (the *Consequences* count note of 2026-10-10).

`document/en.subject.md:373` requires "a clear schema and well-defined relations", and `:1280`-`:1284`
requires the schema to be *documented* — tables, relationships, key fields and data types. Twelve
tickets have decided what this platform does; none of them has said what tables it has. This ADR is
that map. It is the last structural decision on the plan and everything before it is an input.

The shape we chose: **each of a Review's three parts lives where its readership is already
structural, every invariant the database can express is expressed there, and the one it cannot is
named rather than assumed.**

## What this ADR changes in earlier records

- **ADR-0002 decision 6 — a correction, and the rule it states is currently a live bug.**
  *Unmatched* is derived as "no Match in that Round **in a live status**". Read literally a
  `COMPLETED` Match is not live, so the Students who did exactly what the platform asked would
  derive as *unmatched* for that Round. The partition the rule needs is **standing** versus
  **repudiated**, not live versus terminal. Decision 2 below names both sets; the intent of
  ADR-0002 decision 6 is untouched, only the word was wrong.
- **ADR-0006 decision 1 — the Learning Goal bonus was unimplementable as written.** It fires when
  "`forward` contains the Mentee's **Learning Goal**", where `forward` is a set of **Skills** — but
  `CONTEXT.md` defined a Learning Goal as a free-text objective *narrower than* the Skills wanted,
  which can never be an element of that set. Decision 3 below makes the Goal a reference to one of
  the Student's own `LEARN` Skills, which is what the bonus always meant. The Score rule itself is
  unchanged and the prototype's calibration stands.
- **ADR-0009 decision 3 stands unamended.** It requires an "opaque random id" on every file route.
  **UUIDv7 encodes a millisecond timestamp by construction — it is unguessable but not opaque** — so
  rather than weaken the rule to fit the identifier, the two file tables carry their own `uuid(4)`
  token, and that is what appears in the route (decision 10).
- **ADR-0010 decision 4 — widened from two write paths to three.** Badges are tested "inside the
  same transaction that awards the XP", on "the two existing write paths". **Streak** can only change
  when a **Round** closes, so **Consistent Learner** is tested there too. No sweep of the Student
  table looking for conditions that have started holding, and no scheduled job: ADR-0001's promise is
  intact. There is simply a third transaction in which a threshold is tested once and never
  re-examined.
- **The `#15` hand-off's "avatar is a field on Student, not an entity" is refined to a table.**
  ADR-0009 decision 2 says the bytes live in "a `bytea` column" and never says in which table.
  Decision 12 puts both files in dedicated tables; the ADR's text is unaffected.
- **ADR-0011 decision 3's partial unique indexes need no raw migration.** Prisma expresses them
  natively under its `partialIndexes` preview feature. `CHECK` constraints still have no native
  support and remain raw SQL, as that ADR assumed.

## The entity set

Nineteen tables and nine enums. Every identifier is `uuid(7)` unless noted.

| # | Entity | Holds |
| --- | --- | --- |
| 1 | `Student` | The account. Role, XP, Streak, Learning Goal, the two sanction flags. |
| 2 | `Session` | ADR-0003's opaque session row: `id`, `student_id`, `expires_at`. |
| 3 | `Avatar` | 0..1 per Student. Bytes, plus the route token. |
| 4 | `Skill` | The shared catalogue. Seeded, extended by migration only. |
| 5 | `StudentSkill` | A Student's teach/learn lists, one table with a `kind` enum. |
| 6 | `Block` | Directed, evaluated either-way (ADR-0006 d10). |
| 7 | `Friendship` | Directed request, accepted or pending. |
| 8 | `DirectMessage` | 1:1 chat. No Conversation entity. |
| 9 | `Round` | `opened_at`, nullable `closed_at`; state derived from the latter. |
| 10 | `Match` | The pair, its Mission, its frozen Score, its status. |
| 11 | `MatchSkillCoverage` | The frozen explanation state: which Skills, which direction. |
| 12 | `Review` | The Learning Outcome. Owns the Evidence. |
| 13 | `PrivateFeedback` | Two answers and the optional rating. Its own table on purpose. |
| 14 | `Evidence` | 0..1 per Review. Bytes, plus the route token. |
| 15 | `ReflectionPrompt` | Question and `published_at`. No status column (ADR-0007 d1). |
| 16 | `Post` | The feed item, carrying its origin and the Public Takeaway text. |
| 17 | `Like` | Revocable, attributed. |
| 18 | `Report` | ADR-0011's two nullable targets and three states. |
| 19 | `BadgeAward` | One row per Badge earned, never deleted. |

Enums: `Role`, `SkillKind`, `FriendshipStatus`, `MatchStatus`, `Mission`, `CoverageDirection`,
`ReportReason`, `ReportState`, `Badge`.

> **Rows 3 and 14 corrected 2026-10-10 by [Settle which tables change for
> Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/96).** `Avatar` and `Evidence` no
> longer hold bytes. Each file is in a private Supabase Storage bucket, named by its row's token,
> and the row keeps the token, `mime`, `size` and `uploaded_at` (plus `filename` for Evidence), as
> decision 12's note of 2026-10-05 has it. The rest of the table stands; the top note of
> 2026-10-10 lists every column the move changes.

> **Student lifecycle clarified 2026-09-21 by ADR-0008.** The two sanction flags expose exactly
> one dashboard status: Removed takes precedence, otherwise Suspended, otherwise Active. A Removed
> row is terminal and view-only, and its retained email cannot be changed. Mutations that can
> reduce the set of active Admins — role `ADMIN` and neither flag set — serialize and may commit
> only while at least one active Admin remains. No new entity or sanction-history table is added.

> **Prompt-order clarification, 2026-09-21.** The `ReflectionPrompt` row above needs no status
> column and no new sequence column. ADR-0007 now defines publication order totally as
> `(published_at, id)`; `id` is already the UUIDv7 primary key from decision 10. The live Prompt is
> the greatest key, including when two rows share `published_at`.

> **Corrected 2026-09-21 by ADR-0007's real-time ordering contract.** The preceding
> `(published_at, id)` and “no new sequence column” clarification is superseded. It cannot guarantee
> that a publication committed before a later request began is ordered first. Each
> `ReflectionPrompt` therefore needs a unique, durable, comparable publication-order value assigned
> at the shared database serialization boundary; its representation and mechanism belong to
> `/to-spec #1`. `published_at` remains descriptive metadata. No Prompt status or lifecycle entity
> is added, and the live Prompt remains derived as the greatest committed publication order.

> **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §3.6, §4.3; M1–M3, M5, M6).
> Every domain write is one `SERIALIZABLE` transaction with bounded retry.
> `ReflectionPrompt.publication_order` is a `bigint UNIQUE`, assigned `max + 1` inside the
> publishing transaction. **One mechanism column is added**: `Post.answer_round_id`, the Round open
> at a Prompt answer's serialization point, which is how the answer "establishes qualifying
> activity" (ADR-0007 d1) — a timestamp cannot stand for a serialization point. It is a nullable
> column, not an entity or a participation row. Two notes on this table: `Session.id` is the noted
> exception to `uuid(7)` (an opaque token's SHA-256, ADR-0003 d1); and the Learning Goal's ownership
> half is a composite FK `(id, learning_goal_student_skill_id) → StudentSkill(student_id, id)`, its
> `LEARN` half a service check (decision 3's note).

**What is deliberately not here**, each already ruled and each worth re-reading as a set, because the
absences are what keep this model small: no queue or enrolment entity and no candidate-pool table
(ADR-0002 d6); no Prompt-answer entity (ADR-0007 d5); no Mission table (ADR-0012 d5); no
`ModerationCase` (ADR-0011 d6); no `Comment` (ADR-0011 d1); no Presence column (ADR-0003); no
reputation column, aggregate or materialised view (ADR-0013 d4); no XP ledger and no ranking history
(ADR-0008 d6); no `Conversation` (decision 6); and no per-Round participation row (ADR-0010's
standing warning). **Five of those are derived-not-stored rulings.** Anything that reintroduces one
is reversing a decision, not adding a feature.

## The relation map

```
Student ──1:0..1── Avatar
Student ──1:N───── Session
Student ──1:N───── StudentSkill ──N:1── Skill
Student ──0..1:1── StudentSkill                 (learning_goal_student_skill_id)
Student ──1:N───── Block ──N:1── Student        (directed; unique on the ordered pair)
Student ──1:N───── Friendship ──N:1── Student   (directed; unique on the UNORDERED pair)
Student ──1:N───── DirectMessage ──N:1── Student
Student ──1:N───── BadgeAward                   (unique on (student, badge))
Student ──1:N───── Like ──N:1── Post            (unique on the pair)

Round ──1:N────── Match ──N:1── Student         (mentor_id)
                  Match ──N:1── Student         (mentee_id)
Match ──1:N────── MatchSkillCoverage ──N:1── Skill
Match ──1:0..1─── Review ──1:0..1── PrivateFeedback
                  Review ──1:0..1── Evidence
                  Review ──1:0..1── Post         (the Takeaway arm)

ReflectionPrompt ──1:N── Post                    (the Prompt arm; unique on (prompt, author))
Post ──N:1── Student                             (author_id)

Report ──N:1── Student                           (reporter_id)
Report ──N:0..1── Post          ┐ exactly one non-null,
Report ──N:0..1── Student       ┘ by CHECK (ADR-0011 d3)
Report ──N:0..1── Student                        (resolved_by_id)
```

Every `Match` reaches a `Round`; every `Review` reaches exactly one `Match`; no `Post` reaches both
arms. Those three sentences are the whole shape.

> **Report integrity completed 2026-09-22 by ADR-0011.** The relation map above is accompanied by
> the two target-specific partial unique indexes from ADR-0011 d5. The row also has two further
> CHECKs: `(reported_student_id IS NULL OR reporter_id <> reported_student_id)`, and the resolution
> tuple invariant under which `OPEN` has null `resolved_by_id`/`resolved_at` while `ACTIONED` and
> `DISMISSED` have both non-null. A Post self-report still needs a service check through immutable
> `Post.author_id`; PostgreSQL row CHECKs cannot inspect the referenced table. Report state changes
> and target mutation follow ADR-0011's whole-group transaction and serialization contract; no
> `ModerationCase` or other relation is added.

## The decisions

1. **A Review is three parts in three homes, one per readership.** `Review` carries the **Learning
   Outcome** and owns the **Evidence**, read by the Match pair and Admins. `PrivateFeedback` is its
   own table, read by the Mentor, Admins and its author, and carries the optional rating. The
   **Public Takeaway** is the `body` of its **Post**, read by everyone.

   > **Evidence authorization clarified 2026-09-22 by ADR-0009.** Resolve its audience through
   > `Evidence.review_id -> Review.match_id`: that one Match's `mentor_id` and `mentee_id`, plus a
   > requester whose current role is `ADMIN`. No current-Match lookup and no scan of other
   > historical Matches grants access. `PEER_MODERATOR` grants none by itself, while a moderator
   > who belongs to the originating pair keeps pair-bound access.

   The alternative — one row with three columns — is cheaper by two tables and is how most teams
   would write it. It loses on the standing preference this map has applied five times: ADR-0007
   derived Prompt liveness rather than storing it, ADR-0009 put Evidence in Postgres so every read
   *necessarily* passes through Nest, ADR-0013 gave private testimony a route rather than a viewer
   check. Each time the reasoning was the same — make the guarantee structural rather than a rule
   someone must remember. `CONTEXT.md` says the three parts "are never merged"; with one table that
   is a discipline every query must observe, and a single forgotten `select` puts **Private
   Feedback** on the community feed. With three, the feed query cannot reach it, because reaching it
   means naming the table.

   Putting the Takeaway on the Post is what makes the split exactly three rather than two: the Post
   *is* the public surface, so that part needs no table of its own to be structurally public. **Soft
   delete is what makes it safe** — Remove Post sets `removed_at` and the text survives, so
   moderation never destroys part of a Review and ADR-0008 decision 8 holds. This also matches
   ADR-0007 decision 5 word for word: Post's second arm "references the **Review** whose Public
   Takeaway it distils."

2. **Six Match statuses, partitioned into standing and repudiated.**

   | Status | Meaning | |
   | --- | --- | --- |
   | `MATCHED` | Created; not yet accepted by both | standing |
   | `ACCEPTED` | Both accepted | standing |
   | `COMPLETED` | Review submitted | standing |
   | `LAPSED` | Round closed with no Review | standing |
   | `DECLINED` | Either Student declined (ADR-0002 d8) | **repudiated** |
   | `TERMINATED_BY_ADMIN` | A Suspension or Removal ended it (ADR-0008 d5) | **repudiated** |

   **The names are the proposal's, not new ones.** `42_PeerConnect_Concept_Proposal-6.md:131`
   states a status flow outright — *"Matched → Accepted → Meeting Scheduled → Completed → Review
   Submitted"* — and `:265` repeats it for the admin dashboard. `MATCHED`, `ACCEPTED` and
   `COMPLETED` are taken from it verbatim rather than translated into a parallel vocabulary.

   **Three of the proposal's five states are deliberately not here, and adopting its first word is
   not adopting its flow.** *Meeting Scheduled* has nothing to record — there is no meeting entity,
   ADR-0007 decision 3 refused scheduling outright, and ADR-0012 decision 7 confirmed nothing tracks
   whether a pair did their **Mission**. *Completed* and *Review Submitted* collapse into one state
   because ADR-0010 decision 1 makes submitting the Review the only trigger and **`COMPLETED` just
   *means* the Review landed**: no action in this model completes a Match, and none is to be added.
   What the six add that the five lack are the two ways a Match can end badly — `DECLINED` and
   `TERMINATED_BY_ADMIN` — which the proposal's happy path never enumerated.

   ⚠️ **`MATCHED` the status is narrower than "matched" the adjective, and ADR-0002 decision 6 means
   the adjective.** A Student with an `ACCEPTED` Match is matched; they are not in status `MATCHED`.
   The two nest rather than conflict, but the misreading to guard against is deriving *unmatched* as
   "no Match in status `MATCHED`", which would report every Student who accepted their Match as
   unmatched — the same class of error as the "live status" wording this ADR corrects above.

   **`LAPSED` is the terminal state ADR-0002 required** — "finalised by Round close without a
   Review", distinct from `COMPLETED` so that the XP and Streak queries can tell a real success from
   an abandonment. **`TERMINATED_BY_ADMIN` is the distinct administrative cause ADR-0008 decision 5
   required**: it reuses decline's mechanism and refuses its label, because neither Student declined
   and recording it as a decline misattributes the act.

   Acceptance is two-sided and carried as `mentor_accepted_at` / `mentee_accepted_at` rather than as
   further statuses, so "one has accepted" needs no state of its own. `declined_by_id` records which
   Student declined — nullable, and null for every other status, which is what keeps a Suspension
   from being silently attributed to the other party.

   **ADR-0002 decision 6's *unmatched* reads the standing set**: a candidate with no Match in that
   Round in a standing status. A Student whose only Match was declined is unmatched even though a row
   exists; a Student whose Match lapsed is not unmatched, because they were matched and the Round
   simply ended.

   > **Review cardinality and terminal transitions made explicit 2026-09-22 before `/to-spec #1`.**
   > The existing `Match 1:0..1 Review` relation means `Review.match_id` is unique in the database;
   > it is the final arbiter for duplicate and retried submissions, not a service-only pre-check.
   > Only `ACCEPTED -> COMPLETED` may create that Review. Review creation, its `PrivateFeedback` and
   > Takeaway `Post`, the status transition, both Match XP line items and First Mentor evaluation are
   > one atomic success, so a uniqueness loser rolls back every award. Review submission serializes
   > with `LAPSED`, `DECLINED` and `TERMINATED_BY_ADMIN`: whichever transition is ordered first wins,
   > and no terminal Match can later acquire a Review. Promotion to `ADMIN` is not a terminal
   > transition and leaves the pre-existing Match eligible for that ordinary path under ADR-0008 d2.

3. **`Skill` is a catalogue entity, and the Learning Goal is one of the Student's own `LEARN`
   Skills.** `Skill(id, name unique)`, seeded and extended by migration — **no admin CRUD screen**,
   on ADR-0008 decision 11's reasoning that a screen holding a fixed list reads worse than no screen.
   A Student's two lists are rows in one `StudentSkill(student_id, skill_id, kind)` table, unique on
   all three.

   A catalogue rather than free text because **ADR-0006 is a set intersection and its correctness
   depends on exact identity**: with free text, "Docker", "docker" and "Docker basics" are three
   Skills and the matcher silently under-matches. It also hands the claimed **advanced search** Minor
   its filter as a dropdown rather than a text box.

   `Student.learning_goal_student_skill_id` references the join row, not the `Skill` — so the Goal is
   necessarily one the Student *listed as wanting to learn*, and `learning_goal_text` beside it holds
   the sentence that is actually displayed. This is what makes ADR-0006's `+10` bonus a well-formed
   test rather than a string comparison, and it reads as what the rule meant all along: the Mentor
   teaches the one Skill the Mentee cares most about right now.

   > **Integrity corrected 2026-09-23 before `/to-spec #1`.** "Necessarily" overstated the model. A
   > plain foreign key on `learning_goal_student_skill_id` guarantees only that *some*
   > `StudentSkill` row exists, so it would accept another Student's row or a `TEACH` row. The rule
   > is a contract that must hold at every commit, whoever writes the Goal — the Student, or an
   > Admin under ADR-0008 d8: a set Goal references a `StudentSkill` row with the **same
   > `student_id`** and **`kind = LEARN`**, and `learning_goal_text` is never left set without that
   > reference. Removing the Goal's Skill from the list therefore either clears the Goal or is
   > refused. A composite reference on `(student_id, id)` can hold the ownership half in the
   > schema, which this ADR's shape prefers where it is expressible; the `LEARN` half needs a
   > service check or a fixed-kind column. `/to-spec #1` chooses. `CONTEXT.md`'s "never a Skill they
   > have not listed" and ADR-0006's `+10` test are unchanged.

   > **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §4.3.1, §4.3.5, §6.2; M5):
   > the ownership half is the composite FK `(id, learning_goal_student_skill_id) →
   > StudentSkill(student_id, id)` (`MATCH SIMPLE`, so a null Goal is unchecked), whose target is a
   > `UNIQUE (student_id, id)` on `StudentSkill`; the `LEARN` kind and the text ⇔ reference pairing
   > are service checks. Removing the Goal's Skill from the list **clears** both Goal columns in the
   > same transaction, and a list edit that keeps the Skill keeps its row, and so its Goal.

4. **A Friendship is a directed request with an acceptance, and a Block ends one.**
   `Friendship(requester_id, addressee_id, status, created_at, responded_at)`, unique on the
   **unordered** pair via a unique index on `(LEAST(a,b), GREATEST(a,b))`.

   `en.subject.md:504` says only "add/remove friends", with no accept step — but `:598` and
   `CONTEXT.md` make friendship the thing that **discloses Presence**, and one-sided adding would
   publish a Student's online status without their consent. The accept step costs one enum and one
   pending list, and ADR-0002 already built the accept/decline pattern.

   **A Block in either direction bars a new request and ends an existing Friendship** — a new rule,
   and the only sensible reading of "a standing refusal of contact". Remove is a hard delete:
   ADR-0008 decision 6 scoped `removed_at` to two entities and this ADR reads that literally
   throughout.

   > **Concurrency boundary clarified 2026-09-23 before `/to-spec #1`.** "Ends an existing
   > Friendship" means the `Friendship` row, **pending or accepted**, so a request cannot outlive a
   > Block and be accepted afterwards. "Bars a new request" and "ends" are a check and a delete: run
   > concurrently, a request can pass its check and insert after the Block's delete found nothing to
   > end, leaving a Block and a Friendship row between the same two Students. A Block's creation and
   > a new request between the same pair must have outcomes equivalent to one serial order: Block
   > first, the request is rejected; request first, the Block ends it. No Block and Friendship row
   > between the same pair coexist at any commit. `/to-spec #1` chooses the mechanism; no entity or
   > column is added.

   > **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §3.6, §6.4, §11.2; M1): the
   > Block and the request are each one PostgreSQL `SERIALIZABLE` transaction, retried
   > automatically on a serialization failure. The Block reads the pair's `Friendship` rows and
   > deletes any, pending or accepted; the request reads the pair's Block rows in both directions
   > and is refused with `friend_request_unavailable` if one exists. So the two have one serial
   > order, and no Block and Friendship row coexist at any commit. No entity or column is added.

   > **What a Block does not end, 2026-09-23 (ADR-0006 d10's annotation).** A Match already made
   > between the pair stands. The blocking Student may decline it while it is in progress, and a
   > finished Match stays history.

   > **Visibility ruled 2026-09-23 by ADR-0018 d4.** A Student's friends list is shown to that
   > Student alone. A Block is shown only to the Student who set it; the other Student is not told.
   > Presence still reaches accepted Friends exactly as above.

5. **A Like is revocable, attributed, and may be given to one's own Post.**
   `Like(post_id, student_id, created_at)`, unique on the pair, unliking deletes the row, and who
   liked a Post is readable. Self-like is **permitted with no rule**: a Like awards no XP (ADR-0010's
   table is closed) and is not reportable (ADR-0011), so there is nothing to farm and nothing to
   moderate, and a guard would be a cross-table check bought purely for appearances.

   > **Audience ruled 2026-09-23 by ADR-0018 d4.** "Who liked a Post is readable" means readable
   > by every signed-in Student, the same audience as the Post itself.

6. **No Conversation entity; `DirectMessage` carries its own read state.**
   `DirectMessage(id, sender_id, recipient_id, body, created_at, read_at NULL)`. A 1:1 thread is a
   query over the unordered pair — the same derived-not-stored move as *unmatched*, Prompt liveness
   and ADR-0011's report group, and the fourth time this map has refused to materialise a grouping.

   `read_at` is set in bulk when a thread is opened. **This is not the notification system `#7`
   refused**: there is no delivery, no inbox and no cross-surface push, only a column the thread list
   counts. One nullable timestamp is the difference between a chat that demonstrates and one that
   does not. Direct messages survive a **Removal**, like every other record outside the two
   soft-deleted entities.

   > **Read-state scope clarified 2026-09-23 before `/to-spec #1`.** "Set in bulk when a thread is
   > opened" covers only the messages addressed to the Student who opens it: rows whose
   > `recipient_id` is the opener and whose `read_at` is still null. Opening a thread never touches
   > the messages the opener sent, because their read state belongs to the other participant. A
   > thread is read only by its two participants, so no other Student and no Admin can set
   > `read_at`.

   > **Request shape clarified 2026-09-23 by ADR-0003 d10.** "When a thread is opened" names the
   > Student's action, not the read that loads the thread. Marking read is its own non-GET
   > mutation, issued when the thread is opened, because no GET may change a domain row. Scope,
   > column and count are unchanged.

   > **No read receipts, 2026-09-23 by ADR-0018 d4.** `read_at` feeds its recipient's unread count
   > and nothing else: the sender is never shown whether a message has been read. That follows the
   > note above that read state belongs to the other participant, and the Privacy Policy promises it.

7. **Streak is a stored integer on Student, recomputed in the Round-close transaction.** For every
   Student, that transaction asks whether the closing Round contained qualifying activity:
   increment if so, reset to zero if not, **and skip Students who are Suspended or Removed**.

   Stored rather than derived because **ADR-0008 decision 6 says a Suspension makes Streak *freeze***,
   and a derived Streak cannot freeze — the suspended Rounds contain no activity, so it would break.
   Freezing needs either a stored counter or a history of suspensions, and ADR-0008 refused history
   outright. Skipping the flagged rows is what makes the freeze literal: the value does not change,
   so it resumes on reinstatement rather than restarting.

   Round close is the only moment at which "a Round contained no activity" becomes knowable, so
   **Consistent Learner is tested there**, widening ADR-0010 decision 4 to three write paths. This is
   still a threshold tested once inside a real transaction and never re-examined, which is the whole
   of that decision's guarantee — and still no scheduled job, because closing a Round is an Admin's
   action.

   **XP stays a plain integer column** and Badges are `BadgeAward(student_id, badge, awarded_at)`
   unique on the pair, the `Badge` being an enum on ADR-0012's reasoning exactly: three fixed values,
   frozen, with no authoring surface, so a table would collapse into an enum with extra steps.

   > **XP and Badge concurrency clarified 2026-09-22 by ADR-0010.** The unique BadgeAward pair above
   > already guarantees that concurrent transactions cannot award the same Badge twice; no second
   > idempotency mechanism or award ledger is added. Separately, all successful XP-award transactions
   > touching the same Student must be equivalent to one serial order, so atomic increments cannot be
   > lost and threshold evaluation cannot miss the transaction that crosses it. The existing unique
   > pair remains the final arbiter if two transactions attempt the same BadgeAward.

   > **BadgeAward conflict outcome corrected 2026-09-22 before `/to-spec #1`.** The unique pair
   > prevents duplicate rows, but a raw uniqueness failure must not permanently abort a distinct,
   > otherwise valid earning event. When two valid Review/Prompt events for one Student contend for
   > the same Badge, both event records and XP increments eventually commit exactly once, one and only
   > one BadgeAward exists, and the contender converges on that existing award. An aborted database
   > attempt commits none of its changes and may be retried transparently; the existing Review Match
   > uniqueness and Prompt-answer `(Prompt, Student)` uniqueness keep that retry from paying twice.
   > This is different from a duplicate or retried submission of the same event, whose event constraint
   > still admits no second event or XP. The PostgreSQL conflict/serialization mechanism is left to
   > `/to-spec #1`; the model adds no second ledger or deferred award path.

   > **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §10.4; M1, M4): every XP
   > path updates the Student row inside a `SERIALIZABLE` transaction, so paths paying one Student
   > serialize; a BadgeAward insert is `ON CONFLICT DO NOTHING`, and a contender that aborts is
   > re-run whole, finds the Badge and still commits its own event and XP.

   > **Noted 2026-09-24 before `/to-tickets`: the contention outcome above is never reached**
   > ([`docs/spec.md`](../spec.md) §10.4). No schedule puts two valid events for one Student in
   > flight against one Badge: First Mentor would need two `ACCEPTED` Matches with one Mentor at
   > once, Consistent Learner is written only by the one Round close, and two Knowledge Sharer
   > answers need a publication between their reads, which makes the older answer a pivot that is
   > cancelled and then refused as superseded (ADR-0007 d1). The rule stands; the unique pair and the
   > conflict-safe insert remain the backstop. Same pointer as ADR-0010 d2.

   > **Prompt-answer serialization clarified 2026-09-21.** ADR-0007 orders an answer against a
   > concurrent Round close. An answer ordered before the close is visible to this transaction as
   > qualifying activity; one ordered after it cannot contribute to the closed Round, regardless
   > of request start time. An `ADMIN` cannot create a Prompt answer, so that path contributes
   > nothing while the role is held. This adds no Admin-specific skip/freeze here: only Suspended
   > and Removed Students are skipped, and an already-open Match surviving promotion remains
   > governed by ADR-0008 d2.

   > **Sanction ordering and Consistent Learner clarified 2026-09-22.** For each affected Student,
   > Suspension or Removal and Round close must be equivalent to one serial order. Sanction first
   > skips the stored Streak update and the Consistent Learner test as one unit, regardless of
   > qualifying activity earlier in that Round. Close first may increment Streak and insert the
   > unique BadgeAward before the later sanction freezes them. A skipped Round is never replayed;
   > reinstatement resumes from the frozen integer on a later Round. `ADMIN` remains deliberately
   > outside this skip because ADR-0008 gives role alone no freeze.

8. **The socket is outbound-only for everything except a direct message, and there are three rooms.**
   This is what lets the claimed WebSockets Major have a broadcast at all — the only socket surface
   in scope was 1:1 DMs, which are unicast.

   ADR-0003 decision 9 bars a privileged **action** on the socket. A server→client event is not an
   action: nothing the client sends does anything, so no second authorization path is created and the
   decision holds exactly as written. Stating the rule as *outbound-only, except DMs* is what keeps it
   holding under the pressure that will arrive during implementation.

   Three rooms: a global `feed` room carrying `post:created` with the full payload, so *N* clients
   cost one broadcast rather than *N* refetches; a global `rounds` room carrying `round:opened` and
   `round:closed`; and a per-Student `student:<id>` room for DMs and the unicast "your Match is
   ready", which is a room rather than a socket lookup so that multiple tabs work. **Round *close* is
   the demo** — Round *open* is naturally unicast, since each Student wants their own Match, whereas
   close carries one identical payload to everyone and is the sharpest evidence of "efficient message
   broadcasting" the model can produce.

   > **Consistent Learner refresh clarified 2026-09-22 by ADR-0010.** The existing `round:closed`
   > event remains identical and content-free. An open profile uses it only as an invalidation signal
   > and re-queries the authenticated viewer's own progress over HTTP; the ordinary Badge list then
   > reflects any Consistent Learner award committed by Round close. No Badge payload, per-Student
   > socket event, notification entity, unread state or delivery mechanism is added.

9. **The entire explanation state is frozen on the Match, not merely the Score.** `Match` carries
   `compatibility_score smallint NULL` (null for an Admin's hand-made Match, ADR-0006 d10) and
   `goal_bonus_applied boolean`; `MatchSkillCoverage(match_id, skill_id, direction)` freezes the
   forward and reverse Skill sets. Every input to the displayed sentence is written once at Match
   creation and never updated.

   Freezing the number alone is the tempting half-measure and it fails: ADR-0006's consequence makes
   "never shown without its plain-language explanation" an **invariant**, so a recomputed sentence
   beside a frozen number is a Match whose reason drifts away from its Score the moment a Student
   edits their Skills. That is ADR-0012's argument for a Mission enum, applied to the other thing
   written at Match creation — an editable row behind a foreign key silently rewrites the past.

   Storing the coverage as rows rather than as a rendered string keeps it queryable, and **that query
   is the only genuine insight the claimed analytics Minor has access to**: which Skills the platform
   actually *covers*, as opposed to which Skills Students merely list.

   > **Hand-made Matches too, 2026-09-23 (ADR-0006 d10's annotation).** A hand-made Match is
   > oriented by ADR-0006 steps 3–4, and its coverage rows are that orientation's `forward` and
   > `reverse` sets, possibly empty. Only the Score is withheld (`NULL`). So `MatchSkillCoverage`
   > covers every Match, whichever path made it.

10. **`uuid(7)` is the identifier everywhere, and the two file tables carry a separate `uuid(4)`
    route token.** Two records want opposite things from one identifier. ADR-0006 decisions 4 and 9
    and ADR-0010 decision 6 break ties on "the lower Student id" and need that order stable and
    correlated with registration — ADR-0006 rejected hashing on a *measured* roster-position bias,
    which only means anything if ids are ordered. ADR-0009 decision 3 wants an opaque random id on
    every file route, and sequential integers would make every Student enumerable.

    UUIDv7 is time-ordered, so every existing tie-break survives unchanged, and non-enumerable, so
    the integer's problem does not arise. **It is not, however, opaque: UUIDv7 encodes a millisecond
    timestamp by construction.** Rather than amend ADR-0009 to match whatever the identifier happens
    to be, `Avatar` and `Evidence` each carry a `token uuid @default(uuid(4)) @unique`, and the route
    carries the token. One column on two tables, and ADR-0009 stands unamended.

    > **Three defaults removed 2026-10-10 by [Settle which tables change for
    > Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/96).** On Supabase, NestJS
    > makes three of these values before it writes their row: `Student.id` before it creates the
    > Supabase Auth user that shares it (ADR-0003's top note of 2026-10-02), and each `token`
    > before it uploads the file the token names (ADR-0009 decision 2's note). So `Student.id`,
    > `Avatar.token` and `Evidence.token` have no `@default` in the Prisma schema. A create that
    > forgets a token fails to compile: every create input Prisma generates requires it. A create
    > that forgets `Student.id` still compiles, because the Learning Goal's composite foreign key
    > (decision 3's note of 2026-09-23) makes `id` a relation field, which Prisma's checked create
    > input leaves out. The database then refuses the row, since `id` is not null and has no
    > default. Sign-up therefore passes `id` with the other scalar fields. With a default, either
    > create would write a row that names no Supabase Auth user or no file. A required field only
    > catches a value that is missing: writing the id the Supabase Auth user got, and the token
    > that was uploaded, is still the path's job. `Student.id` is still a UUIDv7, made with the
    > `uuid` package's `v7()`, the function Prisma's `uuid(7)` uses, so id order still follows
    > creation order. A token is still a random UUIDv4 (`randomUUID()`), so ADR-0009 decision 3
    > still holds. Every other `uuid` identifier keeps `@default(uuid(7))`.

11. **A Review is immutable; its one attachment is not.** The Learning Outcome text gets no edit
    path, for anyone, matching the Public Takeaway (immutable by the Post rule) and Private Feedback
    (ADR-0013 d7). ADR-0009 decision 5 left this open and its own sentence settles it — *"the Learning
    Outcome text is testimony; the Evidence is an aid. That is what makes the file deletable while
    Posts, Prompt answers and Private Feedback are not."* An Admin was already barred by ADR-0008
    decision 8.

    > **Attachment lifecycle clarified 2026-09-22 by ADR-0009.** The separate Evidence row remains
    > mutable after the owning Match is `COMPLETED`: only that Match's Mentee may create, replace or
    > delete it while able to authenticate. Suspension pauses the path, reinstatement restores it,
    > and Removal ends it without deleting the row. Validation precedes an atomic replacement, so
    > failure leaves the previous row intact; concurrent mutations serialize and the `review_id`
    > uniqueness continues to hold at every commit. None of these operations updates the Review.

12. **The bytes live in two dedicated tables, not in columns on Student and Review.**
    `Avatar(student_id unique, token, bytes, mime, size, uploaded_at)` and
    `Evidence(review_id unique, token, bytes, mime, size, filename, uploaded_at)`.

    > **Under revision 2026-09-30** (see the note at the top): the bytes move to Supabase Storage. [Settle which tables change for Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/96)
    > settles what these two tables keep.

    > **Answered 2026-10-05 by [Settle how avatars and Evidence are stored and served on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/94).** Both tables stay, so the count stays
    > nineteen, and both drop `bytes`: the file is in a private Supabase Storage bucket (ADR-0009
    > decision 2's note). `Avatar` keeps `id`, `student_id`, `token`, `mime`, `size` and
    > `uploaded_at`; `Evidence` keeps `id`, `review_id`, `token`, `mime`, `size`, `filename` and
    > `uploaded_at`. The token, new on every upload, is also the file's name in its bucket, so there
    > is no path column. `mime` and `size` stay so the Match detail shows them without calling
    > Storage, and files are served with the validated type. [Settle which tables change for Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/96) records the
    > column change with the others.

    > **Stored metadata clarified 2026-09-22 by ADR-0009.** `mime` and `size` are server-derived
    > facts about validated bytes, never trusted upload metadata. The accepted sets are Evidence
    > = PDF/PNG/JPEG and Avatar = PNG/JPEG, under the exact byte caps in ADR-0009 decision 5.

    The deciding argument is mechanical rather than aesthetic: **Prisma selects every scalar field by
    default**, so a `bytea` column on `Student` means `student.findMany()` drags two megabytes per row
    unless every call site remembers `select` — a footgun that fires silently, on the busiest table in
    the model. A separate table makes the bytes unreachable by accident instead of by discipline,
    which is decision 1's argument in a different suit. Both are also genuinely 0..1 with their own
    replace-and-delete lifecycle, and neither is soft-deleted (ADR-0008 d6, ADR-0009 d6).

    > **The `bytea` argument is historical since 2026-10-05.** The bytes left both tables
    > ([Settle how avatars and Evidence are stored and served on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/94), the note of that date above), so the Prisma
    > selection cost no longer applies. The tables stay for the reason this paragraph's last sentence
    > gives: each file is 0..1 with its own replace-and-delete lifecycle. Evidence has a second: a
    > Review is never updated (decision 11), so its replaceable attachment cannot be columns on it.

13. **Four invariants move into the database; one cannot, and is named rather than assumed.**

    Expressible, and taken:
    - **At most one open Round** — `CREATE UNIQUE INDEX ON "Round" ((closed_at IS NULL)) WHERE
      closed_at IS NULL`. ADR-0002 decision 2 states this as "one line: no Round may be opened while
      another is open" and leaves it to a service; it is one line in the schema instead.
    - **One answer per (Prompt, Student)** — a plain `UNIQUE (prompt_id, author_id)` on `Post`. The
      nullable column is **not** ADR-0011's trap here: many Takeaway Posts *should* coexist with a
      null `prompt_id`, so distinct NULLs are the wanted behaviour rather than a hole.
    - **Exactly one origin per Post, exactly one target per Report, `rating BETWEEN 1 AND 5`** —
      `CHECK` constraints, raw SQL, since Prisma has no native support.
    - **No repeated pairing** — an index on `(LEAST(mentor_id, mentee_id), GREATEST(…))` turns
      ADR-0006 step 2's no-repeats test into one index hit instead of a two-way scan.

    > **Scope corrected 2026-09-23 before `/to-spec #1`: no-repeats is not a database invariant.**
    > The bullet above describes a lookup, and the Consequences count it as a plain expression index
    > beside the two unique ones. It must stay **non-unique**: ADR-0006 d10 exempts an Admin's
    > hand-made Match from no-repeats, so a unique index would reject a repair the rules allow. The
    > rule is held by the matcher's step 2, which this index only makes cheap. Three of the four
    > items above move into the database; this one is a lookup aid. It covers every `Match` row,
    > with no status predicate, because ADR-0006 step 2's "previously Matched" counts every status.

    > **Report CHECK set extended 2026-09-22 by ADR-0011.** Two row invariants were missing from
    > the historical list: a Student-target Report cannot name its reporter, and Report state must
    > agree with both attribution fields. They are database CHECKs, not service conventions. The
    > exactly-one-target CHECK and the two partial unique indexes remain unchanged.

    > **Prompt concurrency attached to the existing shape, 2026-09-21.** The unique answer index
    > remains the final arbiter for duplicate and retried submissions: at most one Post commits for
    > `(Prompt, Student)`, and ADR-0007 keeps that Post, its XP award, Knowledge Sharer evaluation
    > and Streak contribution in one atomic success. Concurrent Prompt publications are ordered by
    > `(published_at, id)`, and answer/publication plus answer/Round-close outcomes must serialize
    > as ADR-0007 d1 specifies. No Answer entity, Prompt status or sequence column is added; the
    > implementation specification chooses the locking or transaction mechanism.

    > **Corrected 2026-09-21 by ADR-0007.** Concurrent publications use the durable publication
    > order described above, not `(published_at, id)`. The atomic answer success creates the Post,
    > awards its XP, evaluates Knowledge Sharer and establishes qualifying Round activity; it does
    > not update the stored Streak. Only the serialized Round-close transaction updates
    > `Student.streak` under decision 7, skipping Suspended and Removed Students. The unique answer
    > index and the prohibition on an Answer entity or Prompt status remain unchanged.

    **Not expressible: at most one standing Match per Student per Round.** The Student sits in either
    `mentor_id` or `mentee_id`, so no unique index reaches them both. Holding it structurally would
    mean splitting a Match's two sides into participant rows and paying a join on every read of the
    central entity in the model. **We do not.** ADR-0006 already calls it "a loop invariant, not a
    filter", and it is recorded here as the one rule the schema does not hold — the Admin's hand-made
    Match (ADR-0002 d7) being the path where it can actually be violated. Two smaller denormalisation
    invariants sit in the same category: a Takeaway `Post`'s `author_id` must equal its Review's
    Mentee, and a `Report`'s reporter must not be its target (ADR-0011 d11).

    > **Enforcement point settled, 2026-09-21 — see ADR-0006 decision 10's clarification.** The
    > schema still cannot express this invariant (unchanged); what moved is that it is no longer
    > merely named as a risk for the Admin's hand-made Match. ADR-0006 now states explicitly that a
    > manual Match requires both Students to be currently unmatched for the Round, and that the
    > service creating it must check this before writing the row, since the database will not.

    > **Concurrency corrected 2026-09-23 by ADR-0006 d10.** A check before the write is not enough
    > on its own: two concurrent hand-made creations could each pass it for the same Student and
    > both commit. ADR-0006 d10 now makes the test and the insert one unit at the Match-creation
    > serialization point, with creations that share a Student equivalent to one serial order. The
    > invariant stays in the service category and the schema is unchanged.

    > **Report self-target correction 2026-09-22.** The paragraph above remains right about a
    > Post target: determining whether `reporter_id = Post.author_id` crosses a table and stays a
    > service invariant. It was too broad about a Student target, which is expressible on the
    > Report row and is now enforced by CHECK. The Takeaway-author and standing-Match invariants
    > remain in the service category.

## Considered options

**One `Review` table with three columns** (rejected, decision 1). Two tables cheaper and the shape
most teams would reach for. Rejected because it converts `CONTEXT.md`'s "never merged" from a
structural fact into a discipline observed by every query that ever touches a Review, where the
failure mode is Private Feedback on the public feed.

**Three tables plus a `PublicTakeaway` entity** (rejected, decision 1). The symmetrical version, and
it buys nothing: the Post already *is* the structurally public surface, so a fourth table would give
the Takeaway a second home rather than a first one — and it would leave the Post's own `body` column
needing an explanation for the Prompt arm.

**Free-text Skill lists as Postgres arrays** (rejected, decision 3). One column per list, no join
table, no catalogue to seed. It quietly breaks the matcher: ADR-0006 is a set intersection, so any
spelling variance under-matches, and the failure is invisible — pairs simply never form, and nothing
reports that they didn't.

**A `Conversation` entity for direct messages** (rejected, decision 6), and **a `last_read_at` per
(student, peer) pair** (rejected, same) — which is a conversation entity arriving by the back door.

**Deriving Streak by query** (rejected, decision 7). Cheaper, no stored counter, no Round-close
write, and it keeps ADR-0010's two write paths exactly as written. It cannot honour ADR-0008's
freeze: a suspended Student's Rounds contain no activity, so a derived Streak breaks where the
record says it holds. Choosing it would have meant amending ADR-0008 to match the implementation.

**Feed fan-out alone, or Round broadcast alone** (rejected, decision 8). Feed-only sidesteps the
ADR-0003 boundary question entirely but gives the weaker demo; Round-only leaves the fully-specified
surface unused. Both cost one room each.

**Integer primary keys** (rejected, decision 10), which read most naturally against "the lower
Student id" but make every Student enumerable. **Amending ADR-0009 to call UUIDv7 opaque** (rejected,
same) — it is not, and one `uuid(4)` column on two tables is cheaper than a weakened rule.

**Splitting `Match` into participant rows** to make one-standing-Match-per-Round enforceable
(rejected, decision 13). It is the only structural fix available and it taxes every read of the
model's central entity, to hold a rule the matcher already holds as a loop invariant.

## Consequences

- **The advanced search Minor is now fully determined and needs no ticket.** The research flagged
  filters, sorting and pagination as its gap; decision 3's catalogue supplies the filter (by
  Skill-taught, Skill-wanted, Learning Goal presence) as a bounded dropdown, and sorting and paging
  are TanStack over `Student`. This is the cheapest claimed point on the list and it is now
  specified.

  > **Two mechanisms added 2026-10-02 by [Settle what the database stores in French and
  > Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/95).** Name search matches a
  > folded copy of the display name (the top note of 2026-10-02), and the name sort relies on the
  > column collation of the ninth raw-SQL step (the count note of 2026-10-02 below). The filters,
  > paging and the rest of this bullet stand.
- **The user activity analytics Minor is not.** Decision 9 gives it the one aggregate the model could
  not otherwise produce, but nothing has decided what the dashboard *shows* or what counts as an
  insight — and `#17` set the precedent that an unmet module bullet nobody owns means the point is
  not firm. Ticketed separately.
- **Every read path over Students and Posts filters `removed_at`**, unchanged from ADR-0008, and
  seventeen tables pay nothing. Reading decision 6 of that ADR literally is what kept the count at
  two.

  > **Corrected 2026-09-21 by ADR-0008.** Every such read must **apply** `removed_at`, but exclusion
  > is surface-specific: discovery, participation and the normal feed exclude removed rows;
  > historical Student relations render the retained row as a tombstone; and the Admin Users table
  > includes Removed Students as view-only. This is still exactly two soft-deleted entities.
- **Six raw-SQL migration steps, or eight if the `partialIndexes` preview feature is not taken.**
  **Three** `CHECK` constraints — exactly one origin per `Post`, exactly one target per `Report`,
  and `rating BETWEEN 1 AND 5` — plus two expression-based unique indexes (Friendship's unordered
  pair from decision 4, Round's single-open from decision 13) and one expression index
  (no-repeats). ADR-0011's two partial unique indexes are raw only if the preview feature is
  declined; the note at the top of this ADR takes it, so the working number is **six**. Kamel's
  schema gate (ADR-0005) reviews these rather than authoring them, as that ADR requires.

  > **Corrected 2026-09-19: this read "nine … four `CHECK` constraints".** Decision 13 names
  > three CHECKs and there is no fourth — the obvious candidate, a `Report`'s reporter not being
  > its target, is listed in that same decision as **not expressible** and left to the
  > application. The count also read as nine unconditionally while the header note takes the
  > preview feature, which removes two. Nothing about the schema changes; the gate now has a
  > number it can check off.

  > **Count revised 2026-09-22 by ADR-0011's final audit.** Two newly explicit Report CHECKs make
  > the current working count **eight raw-SQL migration steps**: five CHECKs (Post origin, Report
  > target, Report Student self-target, Report resolution tuple, rating range), two expression
  > unique indexes and the no-repeats expression index. If the `partialIndexes` preview feature is
  > declined, ADR-0011's two target-specific unique indexes raise that count to **ten**. The earlier
  > “six or eight” and “there is no fourth” paragraphs remain as history, not the operative count.

  > **Count revised 2026-10-02 by [Settle what the database stores in French and
  > Arabic](https://github.com/ahmadmnsur/ft_transcendence/issues/95).** A ninth hand-written step
  > joins the eight, in the migration that creates `Student`:
  > `ALTER TABLE "Student" ALTER COLUMN display_name TYPE text COLLATE "und-x-icu";`. It holds no
  > invariant. It gives display names the same collation on every stack: the hosted Supabase
  > database's default, `C.UTF-8`, sorts by code point (`Zineb` before `ahmad`, `Élodie` after
  > `zineb`), a local stack's default may differ, and Prisma's `orderBy` cannot name a collation.
  > Two stacks on different ICU versions can still order some names differently, and an ICU
  > upgrade under one database can shift its order, which PostgreSQL then reports as a collation
  > version mismatch. Prisma does not represent the step, so it falls under
  > [`docs/spec.md`](../spec.md) §4.4's gate rule for generated migrations, as the other eight do:
  > a later `ALTER COLUMN … TYPE` silently puts the column back on the database default, which
  > test category 2 catches. The working count is **nine**, or **eleven** if the `partialIndexes`
  > preview feature is declined.

  > **Count confirmed 2026-10-10 by [Settle which tables change for
  > Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/96).** The move to Supabase adds
  > no raw-SQL step: `password_version`, `display_name_search` and `forty_two_id` are plain Prisma,
  > and no row-level security or grants step is added. The working count stays **nine**, or
  > **eleven** if the `partialIndexes` preview feature is declined.
- **The seed gains an input that was not on the map's list: the Skill catalogue.** Without it no
  Student can list anything, no Match can form and the matcher has no inputs — it joins the bootstrap
  Admin, the Peer Moderator and the one Reflection Prompt as something without which nothing is
  demoable. Friendships, Likes and direct messages need seeding too, for the same reason `#20`
  required a reported Post: the surfaces exist but demonstrate nothing empty.
- **`#13`, the Privacy Policy and Terms of Service, is unblocked and now has its subject matter.**
  This ADR is the exhaustive list of what personal data the platform holds — including the two
  `bytea` stores, the retained `DirectMessage` bodies, and the fact that a Removal keeps the row and
  burns the email forever.

  > **A `last_seen_at` write was listed here and no such column exists**, found by the
  > ticket-to-record audit on 2026-09-19. It contradicted this ADR's own entity table and the
  > "no Presence column (ADR-0003)" line in its deliberate-absence list, in the same file.
  > **ADR-0003 now rules the column out explicitly**, so `#13` must not describe the platform as
  > recording when a Student was last online — it records only whether they are online now, and
  > that is not stored at all.

  > **Discharged 2026-09-23 by ADR-0018.** `docs/legal/privacy-policy.md` restates this entity set
  > in plain language, and it says what the audit above required: online now, never last seen. The
  > policy now moves with this file: a PR that changes what personal data is stored, who can see it
  > or how long it is kept updates the policy in the same PR (ADR-0018 d15).

  > **The two `bytea` stores changed 2026-10-05 by [Settle how avatars and Evidence are stored and served on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/94).** The
  > files are in two private Supabase Storage buckets, and the two tables keep only their metadata
  > (decision 12's notes). What the Privacy Policy says about it is [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100)'s.
  >
  > > **Said 2026-10-11 by [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100).** The policy's
  > > *Other websites and services* says the server fetches every avatar and Evidence file from the
  > > copy's own file storage, Supabase's for the team's copy, and the browser never contacts
  > > Supabase. *How long your data is kept* adds the two-hour cleanup of a file no record uses
  > > (ADR-0018 d13's notes).
- **`document/en.subject.md:1280`-`:1284`'s documentation requirement is satisfied by this file**, or
  by a diagram generated from the schema it describes: tables, relationships, key fields and data
  types are all above.
- **Nothing in the model reads Mission, and nothing reads Streak except Consistent Learner.** Both
  were recorded before this ADR and both survive it. The list of things that exist only to be
  displayed is now Mission and the frozen explanation state; everything else has a consumer.
