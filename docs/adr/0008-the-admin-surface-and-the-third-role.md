# The admin surface: a third role, three sanctions, and soft-deleted Students and Posts

> **Annotated 2026-10-02 for the move to Supabase.** [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92) settled
> that each Student's password is kept by a Supabase Auth user with the Student's own id, which
> holds no real email, and that no sanction writes to Supabase Auth. Decisions 5, 7, 8, 9 and 12
> carry notes. The text below is kept as written; [Write the Supabase ADR and annotate the ADRs it changes](https://github.com/ahmadmnsur/ft_transcendence/issues/102) records
> what the move changes.

The claimed **advanced permissions** module asks for three things: user CRUD, roles
management, and different views per role. Only the third was paid for. ADR-0003 decision 5
makes a role change *propagate* immediately, but propagating a role change is not the same
as building the surface that changes it, and ADR-0002 decision 1 refused a second
privileged role outright — leaving "roles management" as a single Student↔Admin boolean
against a bullet whose own examples name four kinds.

The shape we chose: **a third role that already had a job, one Users table that is also the
roles surface, and a soft delete on Student and Post so that nothing in the model ever needs to
revoke XP.**

## What this ADR changes in earlier records

- **ADR-0002 decision 1.** Its operative rule — *only an Admin may open or close a Round* —
  stands **verbatim**: a Peer Moderator never gains Round control. Only its supporting
  clause ("`CONTEXT.md` defines exactly one privileged role; we are not leaving a seam for a
  second one") is revised. ADR-0002 wrote its own escape hatch — "Peer Moderator stays
  Future work and gets its own decision if it ever arrives" — and this is that decision.
- **ADR-0002 decision 4.** Its candidate-pool rule is **narrowed**: a **Skill** listed is no
  longer the whole test, since it silently readmits a promoted Admin and a suspended Student.
- **ADR-0003 decision 5.** **Widened** from "the Admin role" to *the* role, now one of three,
  and the same query gains the Suspension and Removal check.
- **ADR-0003 decision 6.** Its "moderation block" is renamed **Suspension**. The mechanism
  is untouched; the word was wrong, because ADR-0006 later gave **Block** to the
  peer-to-peer act and a peer Block must never delete anyone's sessions.
- **ADR-0004.** The seed gains a bootstrap **Peer Moderator** alongside the bootstrap Admin.
- **ADR-0007.** Its open choice — "either the delete is soft, or XP becomes a ledger" — is
  resolved to **soft**. XP never becomes a ledger.

## The decisions

1. **Three roles on one entity, exactly one role each.** A `Student` row carries a `role`
   enum of `STUDENT`, `PEER_MODERATOR`, `ADMIN`. Not a set: ADR-0003 decision 5 reads *the*
   role, singular, in the same query that resolves the session, and the three form a
   capability ladder where multiplicity buys nothing. This was already implicit in decision
   5; it is stated here because the entity-set work depends on it.

   > **Role visibility ruled 2026-09-23 by ADR-0018 d4.** An Admin is labelled as an Admin
   > wherever other Students see them, so a Student can find one to ask for a Removal (decision 7
   > below). The Peer Moderator role is not shown to other Students: it is a queue permission,
   > not a status, and advertising it invites the pressure from friends that ADR-0011 decision 8
   > answered with attribution.

2. **A Peer Moderator is a participating Student; an Admin is not, by an explicit rule.** The
   Peer Moderator is matched, earns XP and appears on Leaderboards — "trusted student" is the
   entire point. **An Admin is excluded from the candidate pool by a rule, not by
   circumstance.** ADR-0002 decision 4 admits every Student with at least one **Skill**
   listed, and a Student *promoted* to Admin already has Skills — so "a staff Admin lists no
   Skills" holds only for a seeded one and fails the moment anyone is promoted. The pool test
   is therefore **Skill listed _and_ role is not `ADMIN`**. **Matches** already open when a
   Student is promoted stand — they finish what they started — but they are not a candidate in
   any later **Round** while they hold the role, and demotion restores candidacy with no
   further rule.

   > **Candidate-pool correction, 2026-09-21.** “Skill listed and role is not `ADMIN`” above is
   > incomplete. The operative predicate is: **at least one Skill listed, role is not `ADMIN`, and
   > the Student is active — neither Suspended nor Removed**. Demotion restores candidacy only if
   > the Student is also active and still lists a Skill. This is the same rule already propagated
   > to ADR-0002 d4; it governs both automatic matching and the “currently unmatched” requirement
   > for an Admin's hand-made Match in ADR-0006 d10.
   >
   > Candidate eligibility is evaluated at the Match-creation transaction's logical serialization
   > point. A role or sanction change affecting a Student and automatic or manual Match creation
   > involving that Student must have outcomes equivalent to one serial order. If exclusion by
   > `ADMIN`, Suspension or Removal comes first, no new Match may include the Student. If Match
   > creation comes first, later promotion leaves that Match standing as ruled above, while later
   > Suspension or Removal applies decision 5 to it if it is still in progress. `/to-spec #1`
   > chooses the database transaction or locking mechanism.

   > **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §3.6, §8.1; M1): each such
   > operation is one PostgreSQL `SERIALIZABLE` transaction, retried automatically on a
   > serialization failure, that reads inside itself everything its decision depends on; §3.6.3
   > lists what this race reads.

   > **Prompt-loop consequence made explicit 2026-09-21.** “An Admin is not [a participating
   > Student]” governs both primary loops, not matching alone. A role of `STUDENT` or
   > `PEER_MODERATOR` may answer a Reflection Prompt; `ADMIN` may publish one but may not answer.
   > That path therefore gives an Admin no Prompt-answer Post, XP, Level movement, Streak
   > contribution or Knowledge Sharer progress. Promotion retains all earlier Posts, XP, derived
   > Level, Streak and permanent BadgeAwards, and the existing Leaderboard filter continues to
   > hide the Admin. Demotion restores eligibility. The standing-Match exception above is
   > untouched, and role alone does not gain the Streak freeze reserved in decisions 5–6 for
   > Suspension and Removal.

3. **The Peer Moderator's authority is the report queue and Remove Post, and nothing else.**
   Suspend Student, Remove Student, Round control, Prompt publication and roles management
   all stay Admin-only. This is verbatim the proposal's own Future item at
   `42_PeerConnect_Concept_Proposal-6.md:283` — "help review flagged content without full
   admin access" — which is what distinguishes it from a role invented to be counted.

   > **Sharpened by ADR-0011.** "The report queue" is precisely the ***Post*-report queue**.
   > The sanctions for a reported **Student** are Suspension and Removal, which this same
   > decision reserves to Admins, so a report a Peer Moderator can neither action nor escalate
   > does not appear in their list at all. The authority above is unchanged; its surface is now
   > named.

   > **Visibility boundary completed by ADR-0011, 2026-09-22.** That surface is the queue of
   > **open** Post-report groups that pass the whole-group conflict guard in decision 10. Resolved
   > Reports are retained for Admin audit and do not become a Peer Moderator history view. This
   > narrows no action the role held; it prevents “the report queue” from silently growing into
   > historical moderation access.

4. **All privileged-role assignment is manual, by an Admin, always.** No OAuth claim grants
   a role; no XP, **Level** or **Mentor Reputation** threshold auto-promotes. An
   auto-promotion rule would be a second, invisible roles-management path competing with the
   surface this module is claimed on, and deriving a privileged role from XP would make XP a
   security boundary — reopening exactly the farming pressure ADR-0007 worked to close.

5. **Exactly three sanctions: Remove a Post, Suspend a Student, Remove a Student.** Posts are
   immutable and Prompts are never deleted (ADR-0007), so removing a **Post** is the only
   mutation moderation has against Prompt-loop content. **Suspension is reversible** and that
   is what makes it a distinct act rather than a slow Removal: it deletes every session and
   force-disconnects live sockets through ADR-0003 decisions 6 and 8 unchanged, blocks login,
   drops the Student from the candidate pool, and terminates open **Matches** through
   ADR-0002 decision 8's termination machinery — **but a Suspension is not a decline.** It
   reuses the *mechanism* (the Match ends, both Students drop back to unmatched, only an Admin
   repairs it) and not the *label*: the other Student did not decline and must not be recorded
   as having done so, and the suspended Student did not either. The Match status flow therefore
   needs a distinct administrative-termination cause alongside decline. Posts stay; XP and
   **Streak** freeze rather than revert. **Removal does all of the same at the session layer**
   — every session deleted, every live socket dropped. **Suspension and Removal are
   indistinguishable to the authentication layer**; they diverge only at login, where a
   Suspension can be lifted and a Removal never is. Without this stated, a Student removed
   while signed in would keep a valid cookie for up to the thirty days ADR-0003 decision 4
   allows.

   > **Removal and matching clarified, 2026-09-21.** Removal performs every participation effect
   > of Suspension: it excludes the Student from matching, terminates every still-in-progress Match
   > (`MATCHED` or `ACCEPTED`) with the administrative-termination cause, and freezes XP and Streak,
   > in addition to deleting sessions, dropping sockets and blocking login. A completed Match and
   > its awards remain history. The difference is finality, not Match handling. Together with
   > decision 2's serialization rule, a committed Suspension or Removal can never leave or create
   > an in-progress Match for that Student.

   > **Administrative-termination consequence corrected, 2026-09-22.** The parenthesis above
   > saying “both Students drop back to unmatched” applies to a Decline under ADR-0002 d8, not to
   > a Suspension or Removal. *Unmatched* requires membership in the candidate pool (ADR-0002 d6),
   > so the sanctioned Student is outside the pool and cannot derive as unmatched. Only the other
   > Student becomes unmatched, and only if they still satisfy the candidate predicate. The system
   > still does not search automatically for a replacement; an Admin may repair that remaining
   > candidate by hand. The `TERMINATED_BY_ADMIN` cause and retained Match history are unchanged.

   > **Review/award boundary clarified 2026-09-22 before `/to-spec #1`.** The standing-Match
   > exception in decision 2 includes the ordinary Match-bound actions needed to finish it: a
   > promoted Mentee may accept and submit the Review for a Match created before promotion. A valid
   > Review still pays both Students and evaluates First Mentor even if either now holds `ADMIN`;
   > the Admin's retained XP and BadgeAwards are hidden from the Leaderboard, and role alone creates
   > no freeze. Suspension or Removal instead serializes against Review submission. Review first
   > completes the Match and its awards survive the later sanction; sanction first changes an
   > in-progress Match to `TERMINATED_BY_ADMIN`, after which no Review, Match XP or Match Badge
   > progress may commit. Reinstatement does not reopen the terminated Match. This is the Match-loop
   > exception to decision 2's Prompt rule, not a way for an Admin to enter a new Match.

   > **Leaderboard-filter scope corrected 2026-09-22 by ADR-0010.** “XP and BadgeAwards are hidden
   > from the Leaderboard” above must not be implemented as a role-based concealment of either
   > record. Promotion preserves XP, its derived Level and every permanent BadgeAward, all of which
   > remain available through the ordinary profile/history surfaces. The only hidden output is the
   > Admin's XP-ranked Leaderboard row, including the personal-rank pin; BadgeAwards are not part of
   > that projection. Demotion makes the retained XP rank-eligible again without restoring or
   > recomputing any history.

   > **Round-close freeze boundary clarified 2026-09-22.** Suspension or Removal serializes with
   > Round close for the affected Student. Sanction first means the close skips both the Streak
   > update and Consistent Learner evaluation, even when that Round already contains qualifying
   > activity; the Round is not replayed after reinstatement. Close first may update Streak and
   > award the Badge, both of which the later sanction preserves. Promotion to `ADMIN` does not
   > invoke this skip, because role alone has no Streak freeze.

   > **Report consequence added by ADR-0011, 2026-09-22.** Final Removal of a Student and the
   > transition of every open Report targeting that Student to `ACTIONED` are one transaction,
   > attributed to the removing Admin. The retained Student tombstone and every historical Report
   > survive. Suspension remains reversible and does not resolve Reports automatically; an Admin
   > resolves those explicitly. This changes no sanction count and preserves the distinction
   > between Suspension and Removal.

   > **On Supabase, 2026-10-02 by [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92).** Neither sanction writes to
   > Supabase Auth: no ban, no delete. Each stays one PeerConnect transaction, and the flags it
   > sets are what sign-in and session resolution refuse on. A Supabase ban would add a second
   > write that can fail halfway, and Supabase answers `user_banned` before it checks the password,
   > which would tell anyone who knows the email. The two stay indistinguishable to the
   > authentication layer: neither can be signed in, and session resolution refuses both alike.
   > "They diverge only at login" now includes the message: after the right password, sign-in
   > tells the Student which one applies (ADR-0003 d10's note).

6. **Soft delete on Student and Post — those two entities only.** A `removed_at` on `Student`
   and a `removed_at` on `Post`. **No other entity gets one**: **Match**, **Review**, **Round**
   and **Reflection Prompt** are untouched, because a Prompt is never deleted and a Post is
   immutable (ADR-0007), and the other three are records of things that happened. Read this
   literally when modelling the schema; "soft delete" is not a policy applied to the whole
   model. The
   row and every relation survive, so the other Student's Match history, a Mentor's
   **Private Feedback** and the unique `(Prompt, Student)` answer slot all hold. That last
   one is the point: a hard delete would free the slot and let answer → delete → answer award
   XP twice, and nothing in this model revokes XP. A removed Student renders as a tombstone
   everywhere, leaves every **Leaderboard** and the candidate pool, and cannot log in. The
   subject's "delete users" is satisfied — the account is gone from the platform — and
   nothing in `en.subject.md` demands a dropped row. **"Leaves every Leaderboard" means
   filtered from the result, never erased from the measure**: a suspended or removed Student
   keeps their XP and **Mentor Reputation**, those values are simply never displayed, and the
   Students beneath them close up the ranks. No score is recomputed or revised — it is the
   same read-time filter every other path applies, which is the whole point of the flag being
   a flag.

   > **Narrowed by ADR-0013: in MVP there is no Mentor Reputation to keep.** The score is Version
   > 2 and **no aggregate is computed or displayed anywhere** (ADR-0013 d3, d4), so the rule above
   > reads on **XP** alone. ADR-0013 d9 deliberately left this decision, d4 and d8 unamended,
   > because all three stay correct with the term defined and out of scope — a rule that protects
   > a value costs nothing when the value is absent. This note exists so the sentence is not read
   > as evidence that one exists. **The individual Private Feedback a suspended or removed Student
   > wrote does survive** (d6 above, ADR-0013 d8) and still renders to its Mentor, attributed to
   > the tombstone; that is the thing being preserved here, not a score.

   > **Leaderboard pin clarified 2026-09-22 by ADR-0010.** “Filtered from the result” applies to
   > both the top ten and the viewer's own-rank pin. Only an active `STUDENT` or `PEER_MODERATOR`
   > receives that pin. An `ADMIN`, Suspended Student or Removed Student gets no rank row; the pin
   > cannot add a filtered viewer back. Demotion and reinstatement expose the retained XP under the
   > ordinary ranking rules, while Removal remains final.

7. **Removal is final by policy, not by data loss, and the email burns.** The soft delete
   exists for referential integrity, never as an undo buffer; there is no reinstate action
   for a removed Student, because Suspension already covers every case where you would want
   one back. The surviving row keeps its email under the unique constraint, so that address
   can never register again — the right default where identity is institutional, and what
   stops removal being a formality someone re-registers around an hour later.

   > **How a Student reaches it, 2026-09-23 by ADR-0018 d3.** A Student who wants to leave asks
   > an Admin, who performs this ordinary Removal. There is no self-service deletion: a one-click
   > act that burns an institutional email for good wants a human confirmation step. The Privacy
   > Policy says plainly that Removal is final and is not erasure, and lists what it keeps. The
   > mechanism and its Admin-only authority are unchanged.

   > **The email still burns on Supabase, 2026-10-02 by [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92).** Supabase
   > Auth never holds the real email, so `Student.email`'s unique index alone burns it, as above.
   > The removed Student's Supabase Auth user, with its password hash, is kept as well, never
   > deleted. Deleting it would save about a kilobyte, but sign-in could then no longer check a
   > removed person's password: it would have to tell anyone who types that email about the
   > Removal, or tell the owner their password is wrong. The kept hash is one more thing Removal
   > keeps, for [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100) to list.
   >
   > > **Listed 2026-10-11 by [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100):** the Privacy Policy's
   > > *Leaving PeerConnect* says the hash stays with Supabase Auth, so that only the owner, with the
   > > right password, is told the account was removed (ADR-0018 d3's note).

   > **The 42 account burns too, 2026-10-08 by [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93).** The removed row
   > keeps `Student.forty_two_id`, like its email, so the 42 account it holds can never make a new
   > Student. Once 42 confirms that account, Sign in with 42 answers "This account was removed and
   > can't sign in again.", and Connect 42 on another account refuses it as connected elsewhere.
   > This matters more than the email: a new email is free, a new 42 account is not. A Student who
   > left by asking (ADR-0018 d3) can come back only through email-and-password sign-up with a new
   > email. The 42 account number is one more thing Removal keeps, for
   > [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100) to list.
   >
   > > **Listed 2026-10-11 by [Settle what the Privacy Policy and Terms say about Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/100):** the Privacy Policy's
   > > *Leaving PeerConnect* says the number stays, so that 42 account can never make a new account
   > > (ADR-0018 d3's note).

8. **An Admin may edit only what the Student themselves could edit, plus the role.** Display
   name, email, avatar, **Learning Goal**, **Skills**. Never XP, Level, Streak, **Badges** or
   Mentor Reputation — all derived, and derived values have no setter by construction. Never
   any part of a **Review** or a Post: that is someone else's testimony, and `CONTEXT.md`
   already says a Post is never edited once published. Against abusive free text the lever is
   Suspension, not a silent rewrite.

   > **Removed-row correction, 2026-09-21.** This edit authority applies only while the Student is
   > Active or Suspended. A Removed Student is **view-only**: no display-name, email, avatar,
   > Learning Goal, Skill or role edit, and no further suspend, reinstate or remove action. In
   > particular the retained email cannot be changed, so its unique row continues to burn the
   > original address exactly as decision 7 requires. This adds no mechanism; it makes Removal's
   > existing finality and ADR-0009 d6's permanent default-avatar result operative.

   > **The password's absence made deliberate, 2026-09-23 by ADR-0018 d8.** The list above omits
   > the password, and an Admin may never set or reset one. An Admin who could would be able to
   > sign in as any Student and read their Direct Messages, which the Privacy Policy promises no
   > Admin can do. A forgotten password is therefore unrecoverable, and the Terms of Service say
   > so, together with this decision's edit authority.

   > **An email edit stays one PeerConnect transaction, 2026-10-02 by [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92).**
   > Supabase Auth logs a Student in by their id, not their email, so changing the email, by the
   > Student or by an Admin, writes `Student.email` alone. Supabase Auth is not touched and no mail
   > can be sent. The password is still absent from this list: Supabase's admin update, which a
   > password change uses, is never offered as an Admin action.

   > **`forty_two_id` is never an Admin's, 2026-10-08 by [Settle how a 42 login finds its Student on Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/93).** The
   > list above stays as written: an Admin may not set, change or clear a Student's
   > `forty_two_id`. Only the Student connects or disconnects 42, from their own profile and with
   > their current password (ADR-0003 d10's note). An Admin's email edit cannot steer a 42 login
   > either, since a 42 login never reads the email (ADR-0018 d7).

9. **Three guards against locking the platform out.** An Admin may not change their own role;
   may not suspend or remove themselves; and the last remaining Admin may not be demoted or
   removed. The first two alone are already sufficient, but the third costs three lines and
   "try to remove the last admin" is exactly what an evaluator pokes at. Without these, one
   click leaves a platform where no **Round** can open and no **Reflection Prompt** can be
   published, with no in-app repair.

   > **Active-Admin invariant and concurrency contract, 2026-09-21.** “Last remaining Admin” means
   > the last Student with role `ADMIN` who is neither Suspended nor Removed — an Admin who cannot
   > authenticate cannot keep the platform operable. The sentence above that the first two guards
   > are sufficient is superseded for concurrent cross-actions. Every demotion, Suspension or
   > Removal that can reduce that active-Admin set must have outcomes equivalent to one serial order
   > and may commit only if at least one active Admin remains afterward. Thus two Admins cannot
   > concurrently
   > demote, suspend or remove each other and both succeed. The self-action guards above remain;
   > `/to-spec #1` chooses the database transaction or locking mechanism.

   > **Chosen 2026-09-23 by `/to-spec #1`** ([`docs/spec.md`](../spec.md) §3.6, §12.7; M1): each
   > role change, Suspension and Removal is one PostgreSQL `SERIALIZABLE` transaction, retried
   > automatically on a serialization failure, that reads the set of active Admins inside itself
   > whenever it could shrink it.

   > **Held through the move to Supabase, 2026-10-02 by [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92).** The
   > guards read PeerConnect's own flags, unchanged, and nothing in PeerConnect deletes a Student's
   > Supabase Auth user, so no action inside the platform can leave an active Admin unable to sign
   > in. The one delete PeerConnect makes is at sign-up: the Supabase Auth user of a concurrent
   > duplicate that lost to the unique email, which never became a Student. A
   > member of the Supabase project could still delete one in Supabase's dashboard, outside the
   > platform, as direct SQL always could. Who may do that is for
   > [Settle how the schema gate covers Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/97). No repair code is added.

   > **Answered 2026-10-10 by [Settle how the schema gate covers Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/97): nobody does.** Kamel, the Supabase
   > project's Owner, is the only member who changes it by hand, and Ahmad stays a Developer, a role
   > that can still create and delete Supabase Auth users in the dashboard (Supabase's access-control
   > table, read 2026-10-09). Nobody deletes or edits a Student's Supabase Auth user, a Removed
   > Student's included, except through `make reset-team`, which deletes every Supabase Auth user
   > together with every row of our tables, so no Student is left without one (ADR-0004 d11). The
   > one other deletion allowed is Kamel's, of a Supabase Auth user whose id no Student has, which a
   > crash during sign-up can leave. `supabase/team-project.md` lists both with the other changes
   > made by hand (ADR-0005 d5's note of 2026-10-10). The dashboard and the team `.env`, which the
   > project's two members and each evaluator hold, can both do it, so this is a rule the team
   > keeps, as direct SQL always was. Still no repair code.

   > **Widened 2026-10-11 by [Settle how the seed creates accounts and files on
   > Supabase](https://github.com/ahmadmnsur/ft_transcendence/issues/98):** PeerConnect's seed
   > deletes Supabase Auth users too, on both targets, but only in a run that writes its fixture,
   > after deleting every row of our tables, and only once it has checked that every Student is one
   > it makes. If one is not, it deletes nothing and fails (ADR-0017 d10's note of 2026-10-11). So
   > a Student a person made with any other email never loses its Supabase Auth user to the seed,
   > and, as with `make reset-team`, no Student is left without one. Sign-up's duplicate is no
   > longer the only delete PeerConnect makes.

10. **A Peer Moderator may not act on a report concerning their own Post, or one involving a
    Student in a mutual Block with them.** Both escalate to an Admin. The report queue is the
    one place a Peer Moderator holds power over a peer, and "the moderator deleted the
    complaint about themselves" is the first hole anyone looks for. Admins need no such
    guard: they sit outside the participation graph.

    > **Widened twice by ADR-0011, and the first is a correction.** (1) The Block test must read
    > **a Block in either direction**, not "a mutual Block": **Block** is stored directed and
    > evaluated either-way (ADR-0006 decision 2; `CONTEXT.md` "mutual in effect whichever
    > Student set it"), so implemented literally as "both have blocked each other" this guard
    > would almost never fire, the common case being one-sided. (2) It also covers **reports the
    > moderator filed**, not only reports concerning their own Post — a Peer Moderator is a full
    > participating Student who may report, and nothing here stopped them actioning their own
    > complaint. ADR-0011 decision 8 adds that the hole this guard does *not* close is their
    > **friends**, answered by attribution rather than by a narrower permission.

    > **Applied to the derived group by ADR-0011, 2026-09-22.** A Peer Moderator action resolves
    > every `OPEN` Report for one Post, so the guard is evaluated over the whole group: its Post
    > author and every open reporter. If the moderator owns the Post, filed any row, or has a Block
    > in either direction with the author or any reporter, the entire group is absent and remains
    > open for an Admin. Filtering only the conflicting rows and then resolving the rest would let
    > the moderator resolve a complaint this decision forbids them to touch. The action endpoint
    > re-runs ADR-0003's session/current-role/sanction authorization, so a stale queue read grants no
    > authority. Block edges are evaluated at the action serialization point; a concurrent Block
    > create/remove is ordered with the action. ADR-0003's existing “next request” role boundary is
    > otherwise unchanged.

    > **Admin self-interest correction by ADR-0011, 2026-09-22.** “Admins need no such guard”
    > remains true for participation-graph conflicts, but not when an Admin is the direct subject
    > or a reporter. A group targeting that Admin's Student row or their Post is hidden from that
    > Admin in both the open queue and resolved audit. Any open group or resolved batch containing
    > a Report they filed is hidden as well, so promotion cannot reveal that complaint's outcome.
    > Another Admin may read and resolve it; with no eligible other Admin an open group stays
    > `OPEN`. This makes ADR-0011's staff-misconduct, own-complaint and no-feedback guards survive a
    > later role change.

11. **One Users table in the admin dashboard, and roles management is its role column.**
    Search, plus name / email / role / status (active, suspended, removed), with row actions
    for view, edit, change role, suspend or reinstate, and remove. **No separate Roles
    screen** — decision 4 makes manual assignment the only path, so such a screen would hold
    three hard-coded rows and no CRUD, reading worse than putting the control where the users
    are. ADR-0003 decision 9 binds: all of it over HTTP, never the socket.

    > **State-specific actions clarified, 2026-09-21.** The action list above is a union, not a set
    > offered on every row. An **Active** Student may be viewed, edited, have their role changed,
    > be suspended or be removed. A **Suspended** Student may be viewed, edited, have their role
    > changed, be reinstated or be removed. A **Removed** Student may only be viewed. Removal is
    > the terminal status and takes precedence over Suspension for display; it has no reinstate or
    > other mutation path. Decision 9's active-Admin invariant further restricts actions on Admins.

12. **The seed creates one bootstrap Admin and one bootstrap Peer Moderator**, the latter a
    fully participating Student with Skills. ADR-0004 seeded an Admin because without one
    nothing is demoable; with three roles the same argument covers the Peer Moderator, since
    creating one by hand costs minutes of a defense slot. **Its credentials come from `.env`
    on exactly the pattern ADR-0004 decision 9 set** — `MODERATOR_EMAIL` and
    `MODERATOR_PASSWORD` alongside the existing `ADMIN_EMAIL` and `ADMIN_PASSWORD`, shipping
    with working development defaults in `.env.example`, because ADR-0004 decision 8 requires
    a clean clone to run on one command with nothing hand-written. The warning ADR-0004
    already attaches to `ADMIN_PASSWORD` extends to `MODERATOR_PASSWORD`: these are real
    credentials for a throwaway database and must be changed anywhere others can reach.

    > **Clarified 2026-09-20 by ADR-0004 d8/d11 — "from `.env`" is not the bare path's
    > source.** The seed reads the resolved container environment. Committed `.env.example`
    > supplies the throwaway localhost defaults as the required first `env_file`; optional,
    > gitignored `.env` is loaded later and overrides it. The two moderator variables and
    > their values are unchanged, and the bootstrap Peer Moderator exists on both boot paths.

    > **Created through Supabase Auth, 2026-10-02 by [Settle how accounts work on Supabase Auth](https://github.com/ahmadmnsur/ft_transcendence/issues/92).** The seed makes
    > both accounts the way sign-up makes every account: Supabase's admin create with the `.env`
    > password, then the `Student` row with its role. The four variables are unchanged.
    > `ADMIN_PASSWORD` and `MODERATOR_PASSWORD` must now also fit ADR-0003 d3's note: 8 characters
    > to 72 bytes.

## Considered options

**Two roles, arguing that Admin↔Student assignment *is* roles management** (rejected,
decision 1). The default, and the cheaper path. Rejected because `en.subject.md:626` names
"admin, user, guest, moderator, etc." and a checkbox labelled *is admin* offered as a Major
module is the shortcut `:951` warns about — one that invites the evaluator to look harder at
everything else on the list.

**A cheap non-privileged third role purely to have three** (ruled out permanently by the
module-claim decision, not by this ADR). A role that exists only to be counted is the same
shortcut. Peer Moderator earns its place by having a job that already existed in the product
and that 42 staff realistically will not do at volume.

**Hard delete, with XP as a revocable ledger** (rejected, decision 6). The alternative
ADR-0007 left open. A ledger is a second accounting system built solely so that one delete
path stays honest, and it would have to be threaded through every XP award in both loops.
Soft delete closes the same hole with one nullable column.

**Anonymising in place — clearing the row's fields rather than flagging it** (rejected,
decision 6). Tells a better "delete means delete" story, but frees the email for
re-registration, destroys the Private Feedback a Mentor can still read, and costs a scrub
routine per field. The tombstone render achieves the same visible outcome.

**A guest role, for unauthenticated feed access** (not pursued). It would cover the fourth of
`:626`'s named examples, but nothing in PeerConnect currently sits behind no login, so it is
a product change — and a public feed of Students' **Public Takeaways** is a privacy decision
this map never made.

> **Four signed-out routes, 2026-09-23 by ADR-0018 d12.** Sign-in, sign-up, the Privacy Policy
> and the Terms of Service are readable without signing in, because a visitor has to be able to
> read the terms the signup checkbox asks them to accept. None of the four holds Student data, so
> the reasoning above is unaffected: the feed and every Student surface still sit behind login.

## Consequences

- **The advanced permissions module converts from contingent to firm.** All three bullets at
  `en.subject.md:622`-`:628` are met, so the claimed list is firm at 18 points against a
  threshold of 14. The **Friday 2026-10-02** contingency checkpoint and the **Monday
  2026-10-05** ruling are discharged early, and the matching-engine custom-Major fallback is
  not needed.
- **Suspension and Removal share one mechanism** — a flag on the Student row plus session
  deletion — differing only in reversibility and finality. Moderation therefore invents no
  second mechanism, which is what the map's moderation-depth question asked for.
- **Every read path over Students and Posts must filter `removed_at`.** This is the standing
  cost of decision 6, paid in every slice that touches those two entities, not once. No other
  entity carries the flag, so no other read path pays it.

  > **Corrected 2026-09-21.** “Filter” means **apply the removal policy**, not universally append
  > `WHERE removed_at IS NULL`. Discovery and participation surfaces exclude Removed Students;
  > the normal feed excludes Removed Posts. Historical relations retain a Removed Student as the
  > tombstone decision 6 requires, and the Admin Users table includes Removed rows as view-only so
  > decision 11's `removed` status is observable. Every read must inspect `removed_at`; whether it
  > excludes or renders a tombstone is determined by the already-set surface rule.

  > **Writes aimed at a Removed Student, 2026-09-23 before `/to-spec #1`.** "Participation
  > excludes Removed Students" covers writes as well as reads. No new Direct Message, friend
  > request or acceptance of one of their pending requests may target a Removed Student, just as
  > ADR-0011 already refuses a new Report against one. What exists stays readable as history:
  > their threads, Posts and Matches render the tombstone.
- **The Match status flow gains a requirement**: an administrative termination must be
  distinguishable from a decline (decision 5). Enumerating the statuses — including which
  count as "live" for ADR-0002 decision 6's derived *unmatched* — remains the entity-set
  ticket's work, not this ADR's.
- **The three-dashboard split is what makes bullet 3 demonstrable**: Admin sees everything,
  Peer Moderator sees only the report queue, Student sees no dashboard at all.

  > **Visibility wording narrowed by ADR-0011, 2026-09-22.** “Admin sees everything” means the
  > full operational and audit surfaces subject to the direct-conflict guard: an Admin does not see
  > open or resolved Reports about themselves/their Post, or a resolution batch containing a Report
  > they filed. “The report queue” for a Peer Moderator means eligible open Post groups only,
  > without reporter identity or resolved history. The three views remain distinct and the
  > advanced-permissions claim is unchanged.
- **The report queue itself is still unspecified.** What can be reported, what a report
  record holds, and what the reporter sees afterwards are not settled here.

  > **Settled by ADR-0011.** Two targets, a Post and a Student; one table with two nullable
  > foreign keys; a queue grouped by target; and the reporter is told nothing. It also found
  > that `:87`'s third target, a Comment, does not exist in this model — and ruled that it
  > never will.
