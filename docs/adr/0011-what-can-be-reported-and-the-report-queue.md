# What can be reported: two targets, a grouped queue, and a moderator who cannot see the reporter

ADR-0008 gave the **Peer Moderator** one remit — the report queue and **Remove Post** — and
banked the advanced permissions module's last 2 points on the three-dashboard split being
demonstrable. It then closed by admitting the gap: "the report queue itself is still
unspecified." Nothing on this map had ever defined what a report is, so the one role added to
the plan was scoped to a surface that did not exist.

`en.subject.md` asks for **no** reporting anywhere. Its only moderation mention is Content
moderation AI (`:694`), a Minor never claimed. Reporting is therefore entirely
proposal-driven — `42_PeerConnect_Concept_Proposal-6.md:87`, `:91`, `:267` and `:309`, all of
it in the proposal's own MVP — and its depth is a product judgement, not a grading one. What
makes it non-optional is ADR-0008: without a queue, the Peer Moderator's dashboard is an empty
screen and bullet 3 has nothing to show.

The shape we chose: **two report targets, one table with two nullable foreign keys, a queue
grouped by target, and three read-time filters that between them keep a peer moderator out of
every place they could do social damage.**

## What this ADR changes in earlier records

- **ADR-0008 decision 10.** Its conflict-of-interest guard is **widened twice**. First, the
  Block test: decision 10 says "a Student in a **mutual** Block", but **Block** is stored
  directed and evaluated in either direction (ADR-0006 decision 2, "blocked in either
  direction"; `CONTEXT.md`, "mutual in effect whichever Student set it"). Implemented literally
  as "both have blocked each other" the guard would almost never fire, because the common case
  is one-sided — it must test **a Block in either direction**. Second, its subject: decision 10
  covers a report *concerning* a moderator's own Post, but a Peer Moderator is a full
  participating Student who may also **file** reports, and nothing stopped them actioning their
  own complaint. The guard now covers reports they filed as well.
- **ADR-0008 decision 3.** "The report queue" is **sharpened** to the *Post*-report queue. The
  sanctions for a Student report are Suspend and Remove, which the same decision reserves to
  Admins, so a Student report a Peer Moderator can neither action nor escalate has no business
  in their list. Their authority is unchanged; its surface is now named precisely.
- **ADR-0007 decision 8.** Its rationale for Post immutability — "an edit rewrites what the
  community has already liked **and commented on**" — half survives. Likes ship; Comments do
  not (decision 1). The decision itself is untouched: its second clause, that an edit "lets a
  clean Post become an abusive one after it has been seen and cleared", is load-bearing on its
  own, and this ADR makes that clause concrete by giving the cleared state a name.
- **ADR-0009.** The question it handed here is answered: **Evidence is not reportable**, so its
  visibility rule — the Match pair and Admins, explicitly not Peer Moderators — stands
  **unamended**.
- **The proposal's `:87`.** "Report a user, post, or comment" names three targets; the third is
  moot from decision 1 onward.

## The decisions

1. **Likes ship; Comments do not.** `:87`'s third target is a Comment, and the proposal's own
   MVP list carries "Home feed with likes and comments" (`:305`) and "Like and comment on posts"
   (`:79`) — yet no ticket on this map had ever mentioned either and `CONTEXT.md` defined
   neither. The map's standing default said Version 2, the proposal's MVP said ship, and nobody
   had ruled. **A Like is one table with a unique constraint and no moderation surface**: it
   keeps the feed from being a wall of text in a defense slot and half-satisfies `:305`. **A
   Comment is a new entity, a third `removed_at` amending ADR-0008 decision 6, a third report
   target, and mutable community content hanging off deliberately immutable testimony** — for
   zero claimed points inside a six-week budget. Recorded here rather than left implicit because
   the cut is what makes the target set two rather than three.

2. **Exactly two report targets: a Post and a Student.** A **Post** because Remove Post is the
   only mutation moderation has against content (ADR-0008 decision 5). A **Student** because
   Suspend and Remove are Student-level, so a Student report is the only way the community can
   ever trigger them. **A direct message is not reportable**: ADR-0008 decision 5 fixes *exactly
   three* sanctions and none of them acts on a message, so a reportable DM is a queue item
   nobody can action — and it would put a *peer* moderator inside private conversations.
   **Evidence is not reportable** either, for the reason ADR-0009 anticipated: it would place an
   item in the queue that the role built for the queue cannot open. Abuse in either routes
   through the Student report, which only an Admin sees, so neither needs a target of its own
   and no existing visibility rule is widened. `:309` pairs "report and block" precisely because
   **Block** is the remedy a Student holds for their own inbox.

3. **One `Report` table with two nullable foreign keys — `post_id` and `reported_student_id` —
   and a CHECK that exactly one is non-null.** Real foreign keys, and the database enforces the
   target rule, which is the same schema-over-service discipline as ADR-0007 decision 7 and the
   Post-origin rule. A polymorphic `target_type` + `target_id` would discard referential
   integrity for a generality needed exactly twice; two tables would make every queue read a
   UNION. The role split in decision 7 then falls out of this shape as one `WHERE` clause.

4. **A report carries a small reason enum, optional capped free text, its reporter, and nothing
   else — and it is immutable once filed.** Neither source constrains this: `:87` and `:309` are
   the entire specification. The enum is deliberately tiny and non-legalistic — Harassment,
   Spam, Inappropriate content, Other — so the queue is triageable at a glance; the free text is
   where the complaint actually lives. **A report is testimony, like Private Feedback**, so
   ADR-0008 decision 8's bar on editing someone else's testimony covers it and no Admin may
   rewrite one. **Nothing is denormalised for the conflict-of-interest guards**: the Post's
   author arrives through the foreign key and the Block test is a query, so both evaluate at
   read time.

5. **One report per reporter per target, as a unique constraint, and the queue groups by
   target with a count.** The constraint is ADR-0007 decision 7's precedent, and it matters more
   here: decision 12 gives the reporter no feedback, so re-reporting is the natural "did that
   work?" reflex and the database is the right place to refuse it. Grouping is what makes the
   queue usable — a moderator acts on the Post, not on each complaint about it — and the count
   is triage signal that costs nothing. One action resolves the whole group.

6. **Three states on the report row — `OPEN`, `ACTIONED`, `DISMISSED` — plus `resolved_by` and
   `resolved_at`. No case entity, and escalation is not a state.** The group in decision 5 is a
   `GROUP BY` at read time; resolving one updates its open rows in a single transaction. A
   `ModerationCase` keyed by target would materialise a derived grouping, which this map has
   already refused twice — "unmatched is derived, never stored" (ADR-0002) and Prompt liveness
   derived rather than a status column (ADR-0007) — and it would be the same mistake a third
   time. **Escalation is a read-time filter, not a transition**: a report ADR-0008 decision 10
   bars a Peer Moderator from is simply absent from their list and still `OPEN` in the Admin's.
   Making it a state would require a moderator *action* to mark it — the exact button decision
   10 exists to deny them — and would create a state only one role can leave.

7. **The Peer Moderator's queue is Post reports; Student reports are Admin-only.** One `WHERE`
   clause on decision 3's shape: a Peer Moderator reads `post_id IS NOT NULL`, an Admin reads
   everything. This is what makes decision 2's routing honest — DM and Evidence abuse reach a
   queue only an Admin can see.

8. **A Peer Moderator may dismiss as well as remove, and every moderation action records who
   took it.** ADR-0008 decision 10 guarded *acting on* reports but never split the two, and
   dismissal is the cheaper power to abuse: a removal is visible, since the Post vanishes and
   its author notices, while a dismissal changes nothing and the complaint is gone. **The real
   hole is that decision 10 covers a moderator's own Post and their Blocks but not their
   friends.** Removing the dismiss button does not close it — a moderator who can only remove
   leaves the queue to rot or removes marginal Posts because removal is the only button, which
   is strictly worse. Attribution plus an Admin who can read resolved items closes it instead,
   which is why decision 6 keeps `resolved_by` and why resolution never deletes the row.

9. **A Peer Moderator never sees who filed a report; an Admin always does.** ADR-0008 decision
   10 supplies the reasoning verbatim — "Admins need no such guard: they sit outside the
   participation graph" — and a Peer Moderator sits squarely inside it, so showing them the
   reporter creates a retaliation vector within the student body. The reporter is **stored**
   regardless: decision 5's constraint needs it, the conflict-of-interest check needs it, and an
   Admin's judgement needs it. It is withheld from exactly one role's read.

10. **Removing a Post auto-resolves its open reports; a Suspension does not.** Remove Post sets
    every open report on that Post to `ACTIONED` in the same transaction, with the remover as
    `resolved_by` — otherwise the queue keeps showing a Post that is already gone and a second
    moderator removes it again. **A Suspension resolves nothing automatically**: it is
    reversible, and the report is the record of *why* it was applied, so auto-resolving would
    erase the reason at the moment the sanction lands. The asymmetry is targeting — Remove Post
    hits the exact Post a report names, one to one, while a Suspension hits a Student who may
    carry several unrelated reports. An Admin resolves those explicitly, which is also the
    attribution decision 8 wants.

11. **Any signed-in Student may file a report, never against themselves or their own Post.**
    Including a Peer Moderator, who is a full participating Student (ADR-0008 decision 2) — hence
    the guard widening above. A suspended Student cannot sign in at all (ADR-0008 decision 5), so
    that case needs no rule. **Reporting an Admin stays allowed**: staff misconduct is exactly
    what a report channel is for, and by decision 7 a Student report is Admin-only reading
    anyway, so it routes to other Admins with no new machinery. Already-removed targets need no
    rule either — reports are filed from surfaces that already filter `removed_at`, which is
    ADR-0008 decision 6's standing cost paid everywhere.

12. **The reporter learns nothing.** An honest confirmation at submit time and no status surface
    at all. The module claim refused the notification system outright, so there is no push
    channel; the only alternative was a pull-based "my reports" list, and that reports
    moderation outcomes about a third party to the person who complained. The outcomes that
    matter are visible anyway — a removed Post leaves the feed, a suspended Student stops
    appearing.

13. **Reporting and Block stay separate in the model, and are offered together in the UI.**
    `CONTEXT.md` says a Block is "always a Student's own act"; a report is a request for staff
    action. Auto-Blocking on report would be worse than untidy: ADR-0006 makes **Block** a hard
    matching constraint, so filing a report would silently shrink the target's candidate pool
    and anyone could degrade a peer's matching by reporting them. The flow still offers both,
    because `:309` pairs them and a harassed Student wants both.

## Considered options

**A `ModerationCase` entity keyed by the reported thing, with reports attached** (rejected,
decision 6). The tidier object model, and it gives the grouped queue a row of its own to carry
state. Rejected because the grouping is derivable and this map has twice chosen to derive rather
than store exactly this kind of thing; a case row also needs its own lifecycle, and two
lifecycles for one moderation act is how "actioned case containing open reports" becomes
possible.

**A polymorphic target (`target_type` + `target_id`)** (rejected, decision 3). The conventional
answer, and it extends to a third target for free. But there is no third target — decision 1
removed the only candidate — and it buys that extensibility by giving up foreign keys, on a map
whose schema rules are consistently enforced by the database rather than by services.

**Reportable direct messages** (rejected, decision 2). The strongest case for it is that
harassment in PeerConnect is likeliest to happen in a DM, not on a feed of Public Takeaways. It
loses on mechanism rather than on principle: ADR-0008 fixed three sanctions and none acts on a
message, so the moderator's only available response to a reported DM is a Suspension they may
not apply — and reporting the Student reaches that same lever through a queue only Admins read.
The remaining gap is evidential, not procedural: an Admin judging a DM report has the reporter's
free text and no transcript. Accepted, because the alternative is a peer moderator with a
warrant to read private conversations.

**Letting the reporter track their report** (rejected, decision 12). Better manners, and it
would make dismissal feel accountable to the one person who cared. Rejected because the thing
being reported back is a moderation outcome concerning someone else, and because it turns every
dismissal into an argument with no appeal mechanism to route it to.

**Auto-Block on reporting a Student** (rejected, decision 13). Convenient, and it is what most
platforms do. Here it collides with ADR-0006: **Block** is a hard matching constraint, so a
report would carry a matching side effect and reporting would become a way to degrade another
Student's candidate pool.

**Shipping Comments** (rejected, decision 1). Faithful to the proposal's MVP list, and comments
are the feature that makes a feed feel like a community rather than a noticeboard. Rejected on
cost and on blast radius: a third soft-deleted entity, a third report target, and mutable
replies under Posts the model went out of its way to make immutable.

## Consequences

- **The Peer Moderator's dashboard now has something on it**, so advanced permissions'
  "different views per role" is demonstrable and the 2 points that took the claimed list to a
  firm 18 rest on a real surface. This was the gap ADR-0008 left open and the reason this
  decision sat on the critical path.
- **Removing a Post does not revoke its XP.** ADR-0008 decision 6 is explicit that "nothing in
  this model revokes XP" — that is *why* the delete is soft — so an abusive Prompt answer keeps
  its 20 XP after removal. Recorded rather than fixed: revoking would reopen the ledger question
  ADR-0007 and ADR-0008 closed together, for one uncomfortable case. **Reporting itself pays no
  XP in either direction**; ADR-0010's table is closed.
- **One table, three read-time filters.** The role filter (decision 7), the
  conflict-of-interest filter (decision 6 with ADR-0008 decision 10 as widened), and the
  withheld reporter identity (decision 9). All three are read concerns on one entity, and every
  path that renders a report pays them — the same standing-cost shape as ADR-0008's `removed_at`
  filter.
- **No entity gains a soft delete.** ADR-0008 decision 6's "those two entities only, read this
  literally" survives intact: `Report` carries states, not a `removed_at`.
- **Likes are now in shipped scope and entirely unspecified** — revocable or not, count-only or
  who-liked, self-like permitted or not. Handed to the entity-set ticket, exactly as ADR-0003
  handed it `Friend`, rather than half-defined in the glossary now.

  > **Settled by ADR-0014 decision 5: revocable by deleting the row, who-liked readable, and
  > self-like permitted with no rule** — a Like awards no XP and is not reportable, so there is
  > nothing to farm and nothing to moderate. `Friend` landed there too (decision 4), as a directed
  > request with an acceptance. `CONTEXT.md` now defines both.
- **Comments are out of scope** for this project, and the map records them as such.
- **Reporting satisfies no claimed module bullet directly.** Worth stating plainly so nobody
  defends it as one: it is in scope because the proposal's MVP asks for it and because ADR-0008
  built a role around it, not because `en.subject.md` does.
