# The rating ships, the Mentor Reputation score does not

`CONTEXT.md` has defined **Mentor Reputation** since the glossary was first written — "the single
score derived from Private Feedback, expressing how useful a Student is as a Mentor" — and four
separate decisions have ruled on where it may *not* go without anyone ever saying what it is.
ADR-0006 decision 8 kept it out of the **Compatibility Score** and the selection priority.
ADR-0008 decision 8 gave it no setter, so an Admin can never edit it. ADR-0010 decision 6 kept it
off the one **Leaderboard**, and closed by naming the hole it had found: "Mentor Reputation is now
the only shipped glossary term with no rule behind it."

The whole record said what it may not be. Nothing said what it is.

Pricing it as a Leaderboard measure also exposed that the question underneath it was open too:
**nothing on this map had ever decided whether Private Feedback carries a rating at all.** The
proposal makes the star rating *optional* at `:169`, and it is the only numeric input named
anywhere, so the score's one source was itself unsettled.

The shape we chose: **the rating ships as a component of Private Feedback; the aggregate does
not.** A Mentee may attach an optional 1–5 rating to the Private Feedback they write, the Mentor
reads every rating they have received on a private route, and no number is ever computed across
them. **Mentor Reputation goes to Version 2, with the per-skill endorsements the proposal calls
"a more detailed view of the same number."**

## The proposal contradicts itself here, and Section 15 wins

This is the first decision on this map where the two halves of the proposal disagree outright, so
the reading is recorded rather than assumed.

- **`:169`** (Section 7, MVP): Private Feedback comprises two written answers and "an optional
  star rating."
- **`:171`** (Section 7, MVP): "This private layer feeds the Mentor's reputation score
  (Section 9)."
- **`:205`** (Section 9): the roll-up sentence, tagged **_(Version 2)_**.
- **`:221`** (Section 10): "A single Mentor Reputation score, built from private session feedback
  **and (from Version 2) per-skill endorsements**" — a parenthetical that defers the per-skill
  half *specifically*, which only reads sensibly if the other half is MVP.
- **`:305`-`:315`** (Section 15, **the MVP list**): names "private feedback to the Mentor/admin"
  and "Core XP and a single participation streak." **No reputation, no rating.**
- **`:327`** (Section 16, the V2 list): "Per-skill endorsements rolling up into Mentor
  Reputation."
- **`:239`**: "Best Mentor (by Mentor Reputation)" is a **leaderboard category**, and `:329`
  defers "all leaderboard categories."

`:221` is the strongest citation for shipping the score and no ticket on this map had found it.
It loses to Section 15 on a precedent **ADR-0010 already set**: Section 10's bullet list is where
the six Badges live, and the map ships **three**, because four of them turned out to be
superlatives with no history to evaluate. This map has already ruled in writing that appearing in
Section 10's list does not place something in MVP scope — Section 15 does that, and Section 15 is
silent. Reading `:221` as scope now would retroactively argue the map owed all six badges.

## What this ADR changes in earlier records

- **ADR-0010's open consequence is answered.** "The only shipped glossary term with no rule
  behind it … It has its own ticket." This is that ticket, and the answer is that **Mentor
  Reputation remains defined in the glossary as a Version 2 concept, with no shipped aggregate
  score and no MVP computation** — what it gains is a stated scope, not a formula. ADR-0010 is
  annotated to that effect rather than rewritten: its consequence was true when written, and it
  is the record of the discovery that opened this ticket. Decision 6's rejection of Mentor
  Reputation as the Leaderboard measure is
  **strengthened, not revisited**: three of its four counts survive verbatim, and the fourth —
  "it has no formula anywhere on this map" — is now a deliberate absence rather than a gap.
- **ADR-0008 stands unamended**, and this is why decision 4 keeps the glossary entry. Decision 8
  ("Never XP, Level, Streak, **Badges** or Mentor Reputation — all derived, and derived values
  have no setter") and decision 6 ("keeps their XP and **Mentor Reputation**") both name the term.
  Deleting it would have forced reference rewrites through decisions that are still correct as
  written; marking it Version 2 leaves every one of them standing.
- **ADR-0006 stands unamended.** Decision 8 kept Mentor Reputation out of the Score when the score
  merely had no formula; it now has no existence. The Score explanation invariant is untouched.
- **ADR-0011's "a report is testimony, like Private Feedback" is extended, not amended.** Decision
  6 applies the immutability that analogy assumed, and decision 7 finds the one place the analogy
  does *not* carry: a reporter learns nothing, but a Mentee reads what they wrote.

## The decisions

1. **Private Feedback carries an optional 1–5 rating in MVP.** One nullable `smallint` with a
   `CHECK` of 1–5, on the Private Feedback row. Optional as `:169` says, not required: making it
   mandatory would override the proposal's explicit wording to serve a consumer this ADR removes.

2. **Private Feedback comprises exactly three parts: two written answers and the optional
   rating.** The rating is a *component of the testimony*, not the input to a statistic. "How
   useful was the session?" is already one of the two written prompts, so the stars are that same
   question quantified, sitting beside the sentence that explains it.

3. **The Mentor Reputation score does not ship. It is Version 2, together with the per-skill
   endorsements `:205` calls "a more detailed view of the same number, not a second, competing
   system."** Shipping the roll-up without the breakdown ships half of one number and splits a
   single proposal section across two versions; shipping neither keeps Section 9 intact as a unit.

4. **No aggregate over the ratings is computed or displayed anywhere, by anything, including as
   a UI convenience.** A mean shown only to the Mentor is Mentor Reputation under another name and
   is refused on the same grounds. This is stated as an absolute precisely because it is cheap —
   `AVG(rating) WHERE mentor_id = ?` is one line, and the rule has to be able to stop one line.

5. **A Mentor reads the Private Feedback they have received on a private route, never on the
   profile page.** `en.subject.md:600` makes the profile page a shared surface; hanging private
   testimony there would put one viewer check between the project and a `CONTEXT.md` guarantee.
   Routing is the stronger guarantee — the same reasoning ADR-0009 used to put Evidence in
   Postgres so every read necessarily passes through NestJS. Admins read it through the admin
   surface, as ADR-0008 already provides.

6. **The list is every Private Feedback received, each with its optional rating, newest first.**
   This is the honest replacement for the score: five entries with their stars tell a Mentor
   everything a mean of those five would have, without inventing a statistic, without a formula
   to defend, and without disclosing anything to anyone who could not already read it.

7. **A Mentee may re-read the Private Feedback they wrote, and may never edit it.** "Visible only
   to that Mentor and to Admins" was written to say who the feedback is *about*; it was never a
   ruling that the author loses their own words. The Mentee can already re-read the **Learning
   Outcome** and the **Public Takeaway** from the same submission, so write-only would make one of
   three parts of one Review vanish from its author's view for no stated reason.

8. **Private Feedback from a Removed Student still appears in the Mentor's list, attributed to
   the tombstone.** ADR-0008 explicitly keeps "the Private Feedback they wrote". Hiding it would
   be this map's first case of withdrawing testimony ADR-0008 preserved, and it would silently
   remove something the Mentor has already read.

9. **The glossary keeps the Mentor Reputation entry, marked Version 2.** See decision 4 under
   *What this ADR changes in earlier records*: three live ADR rules reference the term, and all
   three remain correct with it defined and out of scope. **Leaderboard's definition is corrected
   to XP**, which was owed regardless — "a ranking … such as XP or Mentor Reputation" offers a
   choice ADR-0010 had already closed.

## Considered options

**The score ships, public on the profile** (rejected, decision 3). Where `:201` actually puts it,
and the natural counterweight to an XP table that pays a Mentee 120 per Match against a Mentor's
80. It is ADR-0010's privacy objection made **worse**, not better. On a Leaderboard the leak is by
rank; on a profile a Mentor with exactly one Mentee publishes that Mentee's private rating
verbatim, under a heading, to a Mentee who knows they were the only one — against a `CONTEXT.md`
line that says "visible only to that Mentor and to Admins."

**The score ships, readable only by the Mentor and Admins** (rejected, decision 3). Survives the
privacy objection completely: same readership as its source, nothing disclosed. Rejected because
**at demo scale it is a mean over 0–3 optional ratings** — ~30 seeded Students, one Match per
Student per Round, six Rounds, roughly half of those as Mentor — shown to the one person who can
already read every rating in full. A plain mean is dominated by n=1; a shrunk mean at n≤3 *is* the
prior, so the number displayed is essentially a constant someone picked. It adds no information to
the screen it sits on.

**A required rating** (rejected, decision 1). The obvious fix for a sparse sample, and it
contradicts the proposal's own word "optional" in order to feed a score this ADR does not ship.

**No rating in MVP** (rejected, decision 1). The third reading available, and the tidiest if the
score is cut — with no aggregate, the rating's stated purpose at `:171` is gone. Rejected because
`:169` puts it in Section 7, which is unambiguously MVP, and because the rating stands on its own
as testimony a human reads: it is the quantified form of a question Private Feedback already asks
in words.

**Deleting the Mentor Reputation glossary entry** (rejected, decision 9). A glossary is the
vocabulary of the thing being built, and a V2-marked entry can read as an invitation to build
toward it. Rejected because ADR-0008 decisions 4, 6 and 8 all name the term in rules that are
still correct, so deletion buys tidiness with three rewrites of live decisions. Keeping it
marked is the cheaper honest record.

**The feedback list on the profile page behind a viewer check** (rejected, decision 5). One `if`
in a shared template, and it works. Rejected on ADR-0009's precedent that a structural guarantee
beats a conditional one when the thing guarded is private by definition.

## Consequences

- **`CONTEXT.md` sharpens Private Feedback, marks Mentor Reputation Version 2, and corrects
  Leaderboard.** Private Feedback gains its three parts and its readership — the Mentor, Admins,
  **and the Mentee who wrote it** — and keeps *Avoid: Rating* scoped to naming the **entity**,
  which is the confusion that made the score look inevitable in the first place. Leaderboard stops
  offering a measure that does not exist.
- **The entity map gains one nullable column, not an entity.** Private Feedback carries
  `rating smallint NULL CHECK (rating BETWEEN 1 AND 5)`. Handed to
  [#10](https://github.com/ahmadmnsur/ft_transcendence/issues/10). There is no reputation column,
  no materialised view and nothing to recompute — consistent with ADR-0008 decision 8, which had
  already ruled the score has no setter.
- **No claimed module point depends on this decision either way.** `en.subject.md` mentions
  reputation **once**, at `:1052`, inside the Forum Platform project idea — not PeerConnect, not a
  module. Issue [#7](https://github.com/ahmadmnsur/ft_transcendence/issues/7) had already found
  that `:850`'s closed list makes Mentor Reputation uncountable toward Gamification's three, and
  ADR-0010 spent the one pulled-forward Leaderboard on XP. The 18 points are untouched.
- **Nothing in shipped scope measures the *quality* of mentoring — only its quantity.** Stated
  plainly so nobody later reads it as an oversight. XP pays for completing a Match, First Mentor
  pays for the first one, and a Mentor who runs ten excellent sessions is recognised identically
  to one who ran a single poor one. The recognition a good Mentor gets is decision 6's list: the
  actual sentences their Mentees wrote. A quality signal needs a sample this project's six Rounds
  cannot produce.
- **The demo needs a Mentor account with Private Feedback already received.** The private route is
  empty for a Student who has never mentored, so an eighth demo-strategy input joins ADR-0010's
  "the seed cannot produce Badges or a Streak by setting XP": whichever way the seed fabricates
  Review history, at least one seeded Review must carry a rating, and ratings should vary so the
  list shows something worth looking at.
- **Adding the score in Version 2 needs no migration.** It is a query over rows this ADR already
  ships. What V2 buys is the per-skill breakdown, which does need schema — the endorsement has to
  name a **Skill** — so the expensive half is the half that was deferred.
