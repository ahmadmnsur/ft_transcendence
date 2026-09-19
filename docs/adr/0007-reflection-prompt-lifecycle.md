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

2. **Once one Prompt exists, there is always exactly one live.** Unlike a Round, the platform
   never sits with none. This is ADR-0002 decision 9 getting what it argued for — it rejected
   Round-scoping Prompts precisely to avoid "silencing the community feed between Rounds," and
   a loop that can be switched off entirely would reintroduce that silence by another route.

3. **No draft and no scheduling.** Creating a Prompt publishes it, in one action, exactly as
   ADR-0002 decision 3 refused a draft state for Round. Scheduling from themed categories is
   Version 2 (`document/42_PeerConnect_Concept_Proposal-6.md:271`) and would need a job runner
   nothing else in this stack needs.

4. **The only repair for a bad Prompt is publishing a corrected one.** A Prompt is never edited
   and never deleted. A dead Prompt with zero answers sitting in history is harmless; a
   conditional "editable while it has no answers" guard is real complexity bought for a typo.

5. **A Prompt answer is not an entity. It is the Post.** There is no Answer table. **Post**
   carries its origin: one arm references the **Prompt** it answers, the other the **Review**
   whose **Public Takeaway** it distils. The asymmetry with Review is deliberate and is the
   whole reason this is safe — Review is a separate entity because **Private Feedback** must
   never reach the feed, and a Prompt answer is public in its entirety, so there is nothing to
   split off.

6. **XP is awarded in the same transaction that creates the Post.** This follows from decision
   5 rather than being a choice: "on submitting the answer" and "on the Post appearing" are one
   instant, so the question of which one triggers XP has no answer to give.

7. **One answer per Student per Prompt, enforced as a unique constraint on (Prompt, Student).**
   In the schema, not in a service. `document/42_PeerConnect_Concept_Proposal-6.md:225` rules
   out farming XP "through meaningless activity," and resubmitting to the same Prompt is
   exactly that.

8. **A published answer is immutable.** No edit surface, not even a window. An edit rewrites
   what the community has already liked and commented on, and it lets a clean Post become an
   abusive one after it has been seen and cleared.

   > **Rationale half-revised by ADR-0011**; the decision stands. **Likes ship, Comments do
   > not**, so "already liked **and commented on**" over-describes what the community can do to
   > a Post. The second clause carries the decision on its own — and ADR-0011 makes it concrete
   > by giving "seen and cleared" an actual name: a report resolved as `DISMISSED`.

9. **No eligibility gate: any Student may answer.** Deliberately asymmetric with ADR-0002
   decision 4, which gates the Match candidate pool on holding at least one **Skill**. A
   Student with an empty Skill list cannot be matched but can answer a Prompt, earn XP and
   appear on the feed on their first day. Recorded because the asymmetry reads as an oversight
   otherwise: it is the lighter-weight loop doing its job.

10. **Answers are visible immediately to everyone, including Students who have not answered.**
    No answer-first gate and no hold-until-close. The proposal describes the loop as immediate —
    a respondent "publishes their answer as a post, which the rest of the community can read,
    like, and comment on." Convergence between answers is the accepted cost, cheap here because
    these Prompts ask about personal experience, where there is no right answer to copy.

11. **The seed publishes one Prompt.** ADR-0004 seeds one bootstrap Admin because without it
    "no Round can open and nothing is demoable." The same property holds here: with no live
    Prompt the feed's second origin is dead and the Prompt loop cannot be shown at all.

12. **"The reflection prompt cycle" names nothing in the model.** The phrase in the proposal's
    Admin Dashboard section (`:253`) is prose for the Prompt loop; the "cycle" is the
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
- **Streak needs no new rule.** Every edge reads off the existing definitions: Streak is per
  Round and boolean, so two Prompts answered in one Round count once; an answer during an idle
  period earns XP only (ADR-0002 decision 9); and an answer to a Prompt published in an earlier
  Round attaches to the Round open at answer time, because Streak is defined on Rounds and not
  on Prompts.
- **The feed fan-out broadcast candidate is now fully specified.** A new Post reaching the
  community feed carries no privileged action, so it sidesteps ADR-0003 decision 9's boundary
  entirely — which is what made it the safer of the two candidates.
- **ADR-0004's boot seed grows by one row**, and the demo strategy now has a second fixed input
  alongside ~30 seeded Students.
- **XP amounts are still unspecified anywhere on this map.** Decision 6 settles *when* XP lands
  and says nothing about how much, and the same hole covers Level bands, the minimal Badge set
  and which single Leaderboard ships. It now has its own ticket.
