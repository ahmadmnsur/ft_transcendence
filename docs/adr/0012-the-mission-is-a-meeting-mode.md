# The Mission is a meeting mode, assigned by the machine and frozen on the Match

`CONTEXT.md` defined a **Mission** as "the concrete task attached to a Match, so the pair has
something specific to do" — a definition that names no author. ADR-0009 priced a Mission brief
as the host for the uploaded file, found it the most expensive option **precisely because a
Mission has no author**, and closed by recording the gap rather than filling it: "it can no
longer be assumed away." ADR-0010 hit the same wall from the other side, parking the
**Problem Solver** badge because it "needs Mission outcomes, and who authors a Mission is still
an open question on this map."

What makes the question real rather than pedantic is ADR-0002 decision 3: **opening a Round runs
the matching atomically**, so there is no human in the loop at the instant a Match comes into
existence. A Mission is therefore chosen by the machine at that instant, or it arrives later
from someone, or it is not a stored thing at all — three different entities.

`en.subject.md` never says "mission". Not once. Mission is entirely proposal-driven —
`42_PeerConnect_Concept_Proposal-6.md:17`, `:33`, `:121`, `:131`-`:147` and `:299` — and it sits
on the proposal's own MVP list, the same list ADR-0011 half-cut when it ruled Comments out. So
its depth is a product judgement and **no claimed module point rests on it**.

The shape we chose: **a Mission is one of six fixed meeting modes, assigned round-robin at Match
creation and frozen there. Nothing authors it, nothing reads it, and it never names a Skill.**
It says *how* to meet; ADR-0006's Score explanation already says *what* about.

## What this ADR changes in earlier records

- **ADR-0009's open consequence is answered.** "Mission authorship is exposed as undecided …
  it can no longer be assumed away" — decision 1 below is that decision. ADR-0009's own choice
  of the **Learning Outcome** as Evidence's host is untouched and stands on its own reasoning.
- **ADR-0010 decision 5 is completed, not amended.** It left Problem Solver "waiting on a
  decision that has not been taken". Decision 7 takes it, and the answer is no — so Problem
  Solver is now permanently out of scope rather than pending, and the full badge set stays
  Version 2 for one reason less.
- **ADR-0008 stands unamended.** Decision 5 declines the authoring surface, so "an Admin may
  edit only what the Student themselves could edit, plus the role" needs no exception.

## The decisions

1. **A Mission has no human author. It is assigned by the machine at Match creation and frozen
   onto the Match.**

   ADR-0002 put no human at the moment a Match is created, and the two paths that create one —
   the matcher at Round open (decision 3) and an Admin's hand (decision 7) — assign a Mission by
   the same rule, with no special case. Frozen means the value never changes afterwards, which
   settles two questions that looked open:

   - **A Mission cannot change after the Match exists.** There is no edit path, for anyone.
   - **A declined-then-replaced Match does not carry its Mission over.** The question dissolves:
     ADR-0002 decision 8 terminates the declined Match, and decision 7's repair creates a *new*
     Match, which is assigned at creation like any other. Nothing carries, and no rule is needed
     to say so.

2. **A Mission names a mode of meeting, never a Skill.**

   The tempting alternative is to render the Skill into a sentence — "Teach Karim about Docker" —
   which would give the Mission an author of sorts and cost nothing. It fails on a rule the model
   does not have. ADR-0006 chooses a **direction** by coverage, not a single Skill: `forward`
   routinely holds several, and `cover(n) = 1 − 0.5ⁿ` is defined over the *count* precisely
   because no one Skill is privileged. Interpolating "the Skill" means inventing a tie-break —
   the first? the one the Learning Goal +10 fired on? all of them, comma-separated? — for a
   sentence nobody reads twice.

   It is also redundant. ADR-0006 made "never shown without its plain-language explanation" an
   invariant rather than an intention, so the Skill is already on screen in a sentence. Naming it
   again in the Mission says the same thing twice and leaves the Mission carrying nothing of its
   own.

   Mode-only is what the proposal's six examples literally are. **Not one of them names a skill**
   — every one is a shape of meeting. That gives a clean division of labour and is the job
   Section 6 claims for the Mission in the first place: to make the connection meaningful
   "instead of only requiring students to chat."

3. **One text, shown identically to both Students.**

   ADR-0006 gives a Match a direction, so the model *could* address each side separately. It
   should not. A per-side Mission would be the only thing in the model that renders differently
   to the two halves of one Match: the **Compatibility Score** is defined as "the number shown to
   **both** Students", and the **Review**'s three-way split is about *who may read at all*, not
   about two wordings of one thing. It would also double the content forever for nothing the
   model consumes, given decision 7.

   The cost is real and is paid once, in decision 4: two of the proposal's six are
   Mentor-addressed and read wrong to a Mentee.

4. **The six modes are fixed and canonical.** Declaration order is the assignment order.

   | Value | Text |
   | --- | --- |
   | `TECHNICAL_CONCEPT` | Work through a technical concept together. |
   | `PROJECT_PROBLEM` | Walk through how one of you solved a project problem. |
   | `PAIR_PROGRAMMING` | Do a short pair-programming session. |
   | `CODE_REVIEW` | Review a piece of code together. |
   | `TECHNOLOGY_DISCUSSION` | Discuss a technology, tool, or approach. |
   | `ADVICE` | Share advice about a project or learning path. |

   Four are the proposal's verbatim (`:139`, `:141`, `:143`, `:145`). The first two are reworded
   from `:135` ("Teach your partner a technical concept") and `:137` ("Explain how you solved a
   project problem"), which address the Mentor and read wrong to a Mentee under decision 3. The
   rewording drops "your partner" and "you solved"; nothing else about them changes.

5. **A Prisma enum, not a table — so there are no seed rows and no authoring surface.**

   A seeded `Mission` template table with a foreign key on Match is the conventional shape and
   has the map's own seed precedent behind it (ADR-0004's bootstrap Admin, ADR-0007's one Prompt,
   ADR-0008's one Peer Moderator). It loses anyway, because **it collapses into an enum with
   extra steps the moment it is held to "frozen"**: if Match stores a foreign key and someone
   edits a template row, every past Match's Mission silently rewrites itself, which is the
   opposite of frozen. Copy the text onto the Match at creation to prevent that and the table is
   a one-time seed source with a dead foreign key beside it.

   An enum also makes immutability **structural** rather than a rule anyone has to enforce — the
   same move ADR-0007 used for Prompt liveness and ADR-0002 for "unmatched". And it keeps
   ADR-0008 whole: a Mission template is not "what the Student themselves could edit, plus the
   role", so a managed table means a new admin screen, against a decision that deliberately
   refused per-Match editors, for zero claimed points.

   One practical consequence worth having: the enum value is `PAIR_PROGRAMMING` and the sentence
   lives in the frontend, so **decision 4's rewording is a UI change, not a migration**. It never
   touches the schema gate ADR-0005 put on `prisma/**`.

6. **One of the six is picked round-robin by the Match's index within its Round**, wrapping at
   six.

   Uniform random is the obvious alternative and costs something specific: **it makes Match
   creation non-deterministic.** ADR-0006 built the matcher as a pure function run exactly once
   per Round, reproducible from its inputs and measured across six Rounds on a 30-Student cohort.
   Injecting a random draw into that transaction spends that property on flavour text nothing
   reads.

   Round-robin is also better in the demo the whole map is optimised for: random can hand you
   three identical Missions in a row, where round-robin **guarantees all six appear in any Round
   of six or more Matches**. An Admin's hand-made Match takes its index from the count of Matches
   already in that Round, so decision 1's "no special case" holds literally.

   ADR-0006 decision 9 set the precedent: `id ASC` over hashing, because the bias it would have
   guarded against "was measured rather than assumed, and it is not there." Do not reach for
   randomness when an ordered rule serves.

7. **A Mission is text and nothing else.** No completion state, no checkbox, no status, no XP,
   and nothing in the model reads it.

   ADR-0010 settled that "**no action in this model completes a Match and none is to be added**",
   and a mark-done control is exactly that action arriving under another name. It would also
   reopen the XP-timing question ADR-0010 closed by collapsing `:213`'s three line items into one
   transaction on Review submission.

   So **Problem Solver is permanently out of scope, not pending.** ADR-0010 could only park it;
   there is no Mission outcome for it to read, and this decision declines to create one. That
   leaves all four of the badges ADR-0010 could not build accounted for: three are superlatives
   with no history to evaluate, and the fourth waited on this.

## Considered options

**An Admin authors one Mission per Round, published when the Round opens** (rejected,
decision 1). The most seductive option, and the only one that answers "who authors a Mission, and
when" with a person and a moment that already exists. It reads the proposal correctly, too — "the
weekly connection has a simple mission" is singular. It loses on a modelling argument rather than
a cost one: **the Admin already publishes a per-cycle, community-wide, free-text artifact with its
own publication lifecycle, and that is the Reflection Prompt.** A per-Round Mission is a second
one, and the map would carry two near-identical concepts differing only in audience. Secondly,
ADR-0001's whole argument for Round existing was that several must complete inside an hour-long
defense slot; a required compose step per Round is friction in exactly that demo, and an optional
one reads blank in it.

**The Mentee's Learning Goal is the Mission** (rejected, decision 1). Already in the model,
already human-authored, already feeding the Score's +10 bonus — the only option where the author
is a person who has written one. It dies on the glossary's own word: a Learning Goal is
**optional**, so some pairs get no Mission at all, and it is mutable, so the rest would watch
theirs drift after the Round opened. It is also the Mentee's alone, leaving the Mentor's side of
a supposedly shared task unwritten.

**Striking Mission from the model entirely** (rejected). ADR-0011 cut Comments off the same MVP
line at `:305`, so the precedent exists, and `en.subject.md` asks for nothing here. But ADR-0011
paid for that cut with a specific bill — a new entity, a third `removed_at`, a third report
target, mutable replies under immutable testimony. A Mission costs one enum column and no
runtime behaviour. There is nothing to cut.

**A per-Match Admin-authored brief** (rejected, decision 1). What ADR-0009 priced and refused.
An Admin composing ~15 briefs per Round is unworkable in a defense slot, and it needs the
per-Match editor ADR-0008 declined.

**The pair chooses their own Mission from the list** (rejected, decision 1). It adds a state to
the Match flow that the proposal's own status flow at `:127` does not have — Matched → Accepted →
Meeting Scheduled → Completed → Review Submitted — plus a rule for what happens when the two
disagree, and a second consent step beside accept/decline.

## Consequences

- **`CONTEXT.md` sharpens Mission.** "The concrete task attached to a Match" overstated it in
  both directions: a mode is not *concrete*, and "task" implied something to complete.
- **The entity map gains one column, not an entity.** Match carries a non-null Mission enum,
  written at creation and never updated. Handed to
  [#10](https://github.com/ahmadmnsur/ft_transcendence/issues/10), along with the ordering
  requirement decision 6 puts on Match creation within a Round.
- **The seed owes no Missions.** A negative input for the demo strategy, alongside ADR-0009's
  "the seed needs no avatar images" — every seeded Match carries one for free, and there is
  nothing to fabricate.
- **The Mission is the first thing in the shipped model that nothing reads.** Worth naming so
  nobody later mistakes the absence for an oversight: no query filters on it, no badge tests it,
  no XP rule consults it, and the Review does not reference it. It exists to be displayed on the
  Match, and that is the whole of it.
- **No claimed module point depends on this decision.** `en.subject.md` never mentions a mission,
  so the 18 points are unaffected whichever way it had gone. Stated plainly so nobody defends it
  as a module obligation later; it is in scope because the proposal's MVP asks for it.
- **Adding a seventh mode is a migration**, and therefore goes through ADR-0005's schema gate.
  Accepted deliberately: six modes cover the meeting shapes the proposal imagined, and the
  friction is a feature if someone proposes a seventh.
