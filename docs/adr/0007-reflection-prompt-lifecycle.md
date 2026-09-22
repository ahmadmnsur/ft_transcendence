# The Reflection Prompt lifecycle: one live Prompt, published only, and the answer is the Post

`CONTEXT.md` said only that a **Reflection Prompt** is "an open question published by an Admin
to the whole community." ADR-0002 decision 9 decoupled the Prompt loop from **Rounds** and
settled what an answer earns during an idle period, but the Prompt's own life was nowhere in
the model — and the Prompt loop is in shipped scope, so the entity set cannot be drawn without
it.

The shape we chose: **a Prompt has exactly one event in its life, publication, and publishing
one closes the previous. The answer is not an entity; it is the Post.** Everything below
follows from refusing to give either the Prompt or its answer a state machine.

## The decisions

1. **Publishing a Prompt closes the previous one, and liveness is derived, never stored.** The
   live Prompt is the most recently published one; there is no `status` column and no
   close action on the Admin Dashboard. This is ADR-0002 decision 6's move applied again —
   "unmatched" is derived from Match rows, "live" is derived from publication order — and it
   makes "at most one live Prompt" **structural** rather than an invariant someone has to
   enforce, the way ADR-0004 made single origin structural. An answer submitted after
   supersession is **rejected**, not absorbed into the closed Prompt: a hard boundary, like
   ADR-0002 decision 5, with no grace period. A closed Prompt stays readable forever; closing
   is about answering only, and its Posts are untouched.

   > **Concurrency contract added 2026-09-21, before `/to-spec #1`.** Prompt publication,
   > Prompt-answer submission and Round closure must have outcomes equivalent to one logical
   > serial execution at every boundary they share. The order respects real-time completion: if
   > one transaction commits before another request begins, it comes first. For transactions that
   > overlap, request arrival, request start, response time and wall-clock timestamp alone do not
   > choose the winner. The implementation specification may choose the PostgreSQL locking or
   > transaction mechanism; the observable order below is the requirement.
   >
   > Prompt publication has the deterministic total-order key **`(published_at, id)`**, compared
   > lexicographically; the greatest key is the one live Prompt. `published_at` alone is not an
   > order because two publications may share it, while `id` is unique (UUIDv7 under ADR-0014 d10).
   > Every live/closed decision uses that same key.
   >
   > - **Publication versus answer:** the answer may commit only when its Prompt is the greatest
   >   publication key at the answer transaction's serialization point. If the new publication is
   >   ordered first, the old-Prompt answer is rejected with no Post, XP, Badge progress or Streak
   >   contribution. If the answer is ordered first, it commits in full before supersession.
   > - **Two publications:** both may commit, but their keys totally order them; exactly the greater
   >   one is live. Equal `published_at` values cannot produce two live Prompts.
   > - **Answer versus Round closure:** an accepted answer belongs, for Streak purposes, to the
   >   Round (if any) open at the answer transaction's serialization point. If the answer is ordered
   >   before closure, that closure observes it as qualifying activity. If closure is ordered first,
   >   the answer cannot contribute to the closed Round; it earns the normal Prompt XP and Badge
   >   progress, and attaches to whatever Round is then open or to none. Starting the request before
   >   closure does not grandfather it into that Round.
   > - **Duplicate or retried answer:** `UNIQUE (prompt_id, author_id)` permits at most one committed
   >   Post. Post creation, the 20-XP award, Knowledge Sharer evaluation and the answer's Streak
   >   contribution are one atomic success. One concurrent attempt may win; every other attempt gets
   >   the already-answered outcome and creates or awards nothing. A rolled-back attempt awards
   >   nothing and does not prevent a later retry from becoming the one success.

   > **Concurrency-order correction, 2026-09-21.** The `(published_at, id)` rule above does not
   > satisfy the real-time guarantee and is superseded. Prompt publication, Prompt-answer
   > submission and Round closure use one logical database serialization boundary for the state
   > they share. If transaction A commits before request B begins, A precedes B. If transactions
   > overlap, either legal order may be selected, but the database must establish one total order
   > and every committed result must be equivalent to that order. Request timing, response timing,
   > `published_at` and `id` do not select it; `/to-spec #1` chooses the locking or transaction
   > mechanism.
   >
   > Every committed publication receives a **unique, durable publication-order value** at that
   > serialization boundary. The values increase in the established publication order, and the
   > committed Prompt with the greatest value is the one live Prompt. Thus two overlapping
   > publications may both commit, but receive distinct order values and have exactly one greatest
   > member. `published_at` remains descriptive metadata, not an ordering authority. In the bullets
   > above, “publication key” now means this durable publication-order value. Publication versus
   > answer and answer versus Round close are resolved at this same boundary.
   >
   > **Streak-atomicity correction, 2026-09-21.** In the preceding bullets, an answer's “Streak
   > contribution” means establishing the accepted answer as qualifying activity for the Round, if
   > any, open at the answer's serialization point; it does **not** mean updating `Student.streak`.
   > The answer transaction atomically creates the Post, awards 20 XP, evaluates Knowledge Sharer
   > and establishes that qualifying activity, or rolls all of them back. The Round-close
   > transaction determines whether the closing Round contained qualifying activity and updates
   > the stored Streak under ADR-0014 d7, skipping Suspended and Removed Students under ADR-0008.
   > A close ordered after an accepted answer observes that whole success; a close ordered first
   > observes none of it for the closing Round.

2. **Once one Prompt exists, there is always exactly one live.** Unlike a Round, the platform
   never sits with none. This is ADR-0002 decision 9 getting what it argued for — it rejected
   Round-scoping Prompts precisely to avoid "silencing the community feed between Rounds," and
   a loop that can be switched off entirely would reintroduce that silence by another route.

3. **No draft and no scheduling.** Creating a Prompt publishes it, in one action, exactly as
   ADR-0002 decision 3 refused a draft state for Round. Scheduling from themed categories is
   Version 2 (`document/42_PeerConnect_Concept_Proposal-6.md:275`) and would need a job runner
   nothing else in this stack needs.

4. **The only repair for a bad Prompt is publishing a corrected one.** A Prompt is never edited
   and never deleted. A dead Prompt with zero answers sitting in history is harmless; a
   conditional "editable while it has no answers" guard is real complexity bought for a typo.

   > **Accepted MVP risk, 2026-09-21.** If an Admin publishes inappropriate or sensitive Prompt
   > content, there is no emergency edit, delete, rollback or tombstone. Publishing a corrected
   > Prompt closes it for answering, but the original remains readable. This follows the existing
   > moderation boundary — ADR-0008 d5–d6 and ADR-0011 d2 act on Posts or Students, not Prompts —
   > and is accepted for MVP without adding a moderation capability or entity.

5. **A Prompt answer is not an entity. It is the Post.** There is no Answer table. **Post**
   carries its origin: one arm references the **Prompt** it answers, the other the **Review**
   whose **Public Takeaway** it distils. The asymmetry with Review is deliberate and is the
   whole reason this is safe — Review is a separate entity because **Private Feedback** must
   never reach the feed, and a Prompt answer is public in its entirety, so there is nothing to
   split off.

6. **XP is awarded in the same transaction that creates the Post.** This follows from decision
   5 rather than being a choice: "on submitting the answer" and "on the Post appearing" are one
   instant, so the question of which one triggers XP has no answer to give.

   > **Cross-path XP ordering added by ADR-0010, 2026-09-22.** This atomic unit is unchanged, but
   > a successful Prompt-answer transaction and any Review transaction awarding XP to the same
   > Student must have outcomes equivalent to one serial order. Both increments accumulate, and
   > Badge thresholds are evaluated against that order, so overlapping valid earning events cannot
   > lose XP or miss the threshold crossing. ADR-0014's unique BadgeAward pair remains the duplicate
   > arbiter; `/to-spec #1` chooses the database transaction or locking mechanism.

   > **Badge contention outcome corrected by ADR-0010, 2026-09-22.** A valid Prompt answer cannot be
   > rejected or lose its XP solely because another distinct valid event wins a concurrent insert of
   > the same BadgeAward. Both events and their XP must eventually commit exactly once while only one
   > BadgeAward exists. An aborted attempt commits nothing and may be retried transparently; decision
   > 7's existing `(Prompt, Student)` uniqueness prevents that retry from paying the answer twice.
   > `/to-spec #1` still chooses the PostgreSQL mechanism.

7. **One answer per Student per Prompt, enforced as a unique constraint on (Prompt, Student).**
   In the schema, not in a service. `document/42_PeerConnect_Concept_Proposal-6.md:229` rules
   out farming XP "through meaningless activity," and resubmitting to the same Prompt is
   exactly that.

8. **A published answer is immutable.** No edit surface, not even a window. An edit rewrites
   what the community has already liked and commented on, and it lets a clean Post become an
   abusive one after it has been seen and cleared.

   > **Rationale half-revised by ADR-0011**; the decision stands. **Likes ship, Comments do
   > not**, so "already liked **and commented on**" over-describes what the community can do to
   > a Post. The second clause carries the decision on its own — and ADR-0011 makes it concrete
   > by giving "seen and cleared" an actual name: a report resolved as `DISMISSED`.

9. **No eligibility gate: any signed-in Student may answer.** Deliberately asymmetric with
   ADR-0002 decision 4, which gates the Match candidate pool on holding at least one **Skill**. A
   Student with an empty Skill list cannot be matched but can answer a Prompt, earn XP and
   appear on the feed on their first day. Recorded because the asymmetry reads as an oversight
   otherwise: it is the lighter-weight loop doing its job.

   **A Suspended or Removed Student cannot sign in at all** (ADR-0008 d5), so that case needs no
   rule here — the same reasoning ADR-0011 decision 11 applies to filing a report, and now the
   same phrasing. The gate this decision refuses is an *eligibility* gate; the sanction gate sits
   at the authentication layer and is paid once, for everything.

   > **Narrowed 2026-09-21 by the role semantics ADR-0008 established after this decision.**
   > “No eligibility gate” means **no Skill-list or matching-eligibility gate**; it does not make
   > staff a participant. A signed-in Student whose role is `STUDENT` or `PEER_MODERATOR` may
   > answer. A Student whose role is `ADMIN` may publish Prompts but **may not answer them**.
   >
   > While a Student holds `ADMIN`, the Prompt path therefore creates no answer Post, awards no
   > Prompt XP, cannot move Level, contributes nothing to Streak, makes no progress toward
   > Knowledge Sharer and cannot put a new Prompt-origin Post on the feed. Promotion does not erase
   > history: existing XP and its derived Level, Streak value, BadgeAwards and Posts remain, and
   > the Admin stays filtered from the Leaderboard. Demotion restores Prompt eligibility. This
   > correction does not alter ADR-0008 d2's rule that a Match already open at promotion may finish,
   > and it invents no Admin-specific Streak freeze; ADR-0014 d7 continues to govern Round close.

10. **Answers are visible immediately to everyone, including Students who have not answered.**
    No answer-first gate and no hold-until-close. The proposal describes the loop as immediate —
    a respondent "publishes their answer as a post, which the rest of the community can read,
    like, and comment on." Convergence between answers is the accepted cost, cheap here because
    these Prompts ask about personal experience, where there is no right answer to copy.

11. **The seed publishes one Prompt.** ADR-0004 seeds one bootstrap Admin because without it
    "no Round can open and nothing is demoable." The same property holds here: with no live
    Prompt the feed's second origin is dead and the Prompt loop cannot be shown at all.

    > **Extended by ADR-0017: four, not one.** One live Prompt is enough for *this* decision and
    > stays the rule — but **Knowledge Sharer** requires three Prompts answered (ADR-0010 d4), and
    > decision 1 above allows exactly one live at a time, so three must already have been closed
    > by supersession before a Student can hold the Badge. The seed publishes **four in sequence**:
    > three closed, one live. Nothing here changes; this decision was sized before that Badge
    > existed.

12. **"The reflection prompt cycle" names nothing in the model.** The phrase in the proposal's
    Admin Dashboard section (`:257`) is prose for the Prompt loop; the "cycle" is the
    publication ordering over Prompts. No entity and no glossary entry — ADR-0001's argument
    for getting "weekly" out of the domain language applies to "cycle" word for word.

## Considered options

**An explicit Admin close, mirroring Round** (rejected, decision 1). It buys the ability to
have zero live Prompts, which decision 2 does not want, and pays a second Admin action and a
status column for it. The proposal's dashboard lists "Create and publish community reflection
prompts" and no close action, unlike Round, where starting one is explicit.

**Prompts never close** (rejected, decision 1). N simultaneously answerable Prompts is an XP
farm — answer all of them in one sitting — and it makes "the current Prompt" a phrase the model
cannot evaluate.

**A separate Answer entity, for symmetry with Review** (rejected, decision 5). Symmetry for its
own sake. Review splits because one of its three parts must stay private; a Prompt answer has
no private part, so an Answer table would be a row that exists only to be joined to its Post.

**Editing a Prompt while it has zero answers** (rejected, decision 4). Conditional mutability
is a guard, a test and a race, bought for typo repair that a second publication already
handles.

**Holding answers back until the Prompt closes** (rejected, decision 10). It makes the feed
silent about the Prompt currently being answered, which is the exact failure ADR-0002 decision
9 rejected Round-scoping to avoid.

**Round-scoping Prompts** is not reconsidered here. ADR-0002 decision 9 settled it, and this
ADR extends that record rather than reopening it.

## Consequences

- **Post needs an origin discriminator with exactly two arms, enforced in the schema.** Not in a
  service — the entity-set ticket already requires this of Post, and decision 5 fixes what the
  two arms point at.
- **Prompt has no status column.** A reader who goes looking for one should be sent to decision
  1; absence is the decision, not an omission.
- **Publishing is destructive and has no undo.** An Admin who publishes by mistake has
  permanently closed the previous Prompt. Accepted: the repair is another publication, and
  nothing that was answered is lost.
- **Moderation must soft-delete a Prompt-answer Post, or XP becomes farmable.** A hard delete
  frees the unique `(Prompt, Student)` slot, so answer → delete → answer awards XP twice unless
  XP is revoked — and nothing anywhere in this model revokes XP. This is a hard constraint on
  whatever settles delete semantics, not a preference.

  > **Settled by ADR-0008: soft, everywhere.** A `removed_at` column rather than a hard delete,
  > so the surviving row keeps the `(Prompt, Student)` slot occupied for one nullable column and
  > **XP never becomes a ledger** — the constraint above is met without revoking anything.
  > ADR-0011 later recorded the accepted cost: **removing a Post does not revoke its XP**, so an
  > abusive Prompt answer keeps its 20 XP after removal.
- **Streak needs no new rule.** Every edge reads off the existing definitions: **a Round either
  contained qualifying activity or it did not**, so two Prompts answered in one Round count once;
  an answer during an idle period earns XP only (ADR-0002 decision 9); and an answer to a Prompt
  published in an earlier Round attaches to the Round open at answer time, because Streak is
  defined on Rounds and not on Prompts.

  > **This read "Streak is per Round and boolean", which was loose even when written and is now
  > wrong.** **Streak is a stored integer on `Student`, recomputed in the Round-close transaction**
  > (ADR-0014 d7): incremented when the closing Round held qualifying activity, reset to zero when
  > it did not, and **skipped for Suspended and Removed Students**, which is what makes ADR-0008's
  > freeze literal rather than a restart. What is boolean is each Round's **contribution** — the
  > only part this consequence ever needed, and still the reason two Prompts in one Round count
  > once. ADR-0014 did not back-reference this record, so the note lands here.
  >
  > **Serialized 2026-09-21.** “At answer time” now means the answer transaction's logical
  > serialization point under decision 1's concurrency contract. A concurrent Round close either
  > observes the whole accepted answer or precedes it; it can never observe half of Post + XP or
  > attach the answer to the Round merely because the request started earlier.
- **The feed fan-out broadcast candidate is now fully specified.** A new Post reaching the
  community feed carries no privileged action, so it sidesteps ADR-0003 decision 9's boundary
  entirely — which is what made it the safer of the two candidates.
- **ADR-0004's boot seed grows by one row**, and the demo strategy now has a second fixed input
  alongside ~30 seeded Students.
- **XP amounts are still unspecified anywhere on this map.** Decision 6 settles *when* XP lands
  and says nothing about how much, and the same hole covers Level bands, the minimal Badge set
  and which single Leaderboard ships. It now has its own ticket.

  > **Filled by ADR-0010**, which is that ticket resolving. **A Prompt answer pays 20 XP** in the
  > transaction decision 6 defines, against 120 for a Mentee's Match and 80 for a Mentor's — and
  > that **1:6 ratio is the only governor**, deliberately, because this ADR refused scheduling and
  > set no publishing cap. `Level = min(10, 1 + floor(XP / 250))`, three Badges, and one
  > Leaderboard by XP. **Knowledge Sharer** — three Prompts answered — is the Badge that reads
  > this loop.
