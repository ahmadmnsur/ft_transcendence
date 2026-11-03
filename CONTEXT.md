# 42 PeerConnect

A peer-learning platform for 42 students: it helps them discover who can teach them,
who they can help, and what was actually learned from each interaction. Chat, friends
and the feed exist to serve that loop, not as ends in themselves.

## Language

Each term ends with the one French and the one Arabic word the interface writes for it.

### People

**Student**:
A 42 student using the platform to learn and to teach. Every account is a Student; Admin
and Peer Moderator are roles a Student holds, not separate kinds of person.
_Avoid_: User, member, peer
_French_: Étudiant · _Arabic_: طالب

**Admin**:
The most privileged role, held by a 42 staff member: opening and closing Rounds, publishing
Reflection Prompts, managing Students and their roles, and every sanction. Staff rather than
a participant — an Admin never enters a new Match or answers a Reflection Prompt, whatever Skills
they list. Promotion does not cancel a Match already created: that Match may still be accepted and
reviewed through its ordinary path, with its ordinary XP and Badge effects, while the Admin remains
excluded from the Leaderboard. The platform always retains at least one Admin who can sign in.
Shown as an Admin to every signed-in Student, so a Student can always find one to ask.
_Avoid_: Staff, moderator, superuser
_French_: Admin · _Arabic_: مسؤول

**Peer Moderator**:
A trusted Student granted one further authority: working the queue of open reported Posts, where
they may remove the Post or dismiss the report, and either way the platform records which of
them did it. Nothing else — never a reported Student, never a reporter's identity, never a
resolved-report audit history, a Suspension, a Removal, a Round or a Reflection Prompt. Unlike an
Admin, a Peer Moderator is a full participant, matched and earning XP like any Student.
_Avoid_: Moderator, mod, trusted user
_French_: Modérateur étudiant · _Arabic_: مشرف طلابي

**Mentor**:
The Student in a Match who teaches. Held for the duration of one Match only, never a
standing property of a Student.
_Avoid_: Teacher, tutor, coach
_French_: Mentor · _Arabic_: مرشد

**Mentee**:
The Student in a Match who learns, and the one who submits the Review. Held for one
Match only.
_Avoid_: Learner, apprentice
_French_: Mentoré · _Arabic_: مسترشد

**Presence**:
Whether a Student currently holds a live connection to the platform, shown to their
friends as online status. A Student has Presence while at least one of their connections is
live, so several open tabs are one Presence rather than several. Live state, never a record:
Presence does not survive a restart of the platform, a Student reads as offline until they
next connect, and **nothing anywhere records when a Student was last online**. That gap is
accepted, not a defect.
_Avoid_: Activity status, availability, last seen
_French_: Présence · _Arabic_: تواجد

> **Updated 2026-10-18** (#45; ADR-0003's note of 2026-10-18): after a Student's last connection
> closes, they keep Presence through the 20-second grace window, because their friends have not been
> told otherwise; a reconnect inside it is no change at all.

> **Updated 2026-11-01** (#249; ADR-0003's note of 2026-11-01) *(uncommitted)*, **landed on `main` at `4cc1717`**: the grace window is 5
> seconds, not 20.

**New dot**:
A mark beside a link that tells a Student something waits for them on that page and is newer
than their last visit to it since they signed in: an unread Direct Message or Private Feedback, a
Match to answer or a Review to write, a friend request, the live Reflection Prompt unanswered, a
Report to act on, or another Student's Like on one of your Posts. It says that something waits, never what or how many, and it is not a
notification: nothing is delivered, listed or kept.
_Avoid_: Notification, badge, alert, unread flag
_French_: Pastille · _Arabic_: نقطة جديدة

**Friend**:
Another Student whose connection a Student asked for and who accepted. Never one-sided: a
request confers nothing until it is accepted, and either Student may end it. Friends see each
other's Presence, which is the reason the acceptance exists. A Student's list of Friends is
theirs alone: no other Student sees it.
_Avoid_: Connection, contact, follower
_French_: Ami · _Arabic_: صديق

**Direct Message**:
One private message from one Student to another. Always between exactly two Students, never a
group, and never reportable: a Student's remedy for their own inbox is a Block.
_Avoid_: Conversation, thread, chat message
_French_: Message direct · _Arabic_: رسالة مباشرة

**Block**:
One Student's standing refusal of contact with another. Mutual in effect whichever Student
set it: a blocked pair can never become a Match, in either direction, and a Block ends any
Friendship between them and any request still pending. Always a Student's own act, never an
Admin's — the Admin equivalents are Suspension and Removal.
_Avoid_: Mute, ban, ignore
_French_: Blocage · _Arabic_: حظر

**Report**:
A Student's request that staff review a Post or another Student — the only two things that
can be reported. The reporter's account of the problem is testimony, never edited by anyone,
and a reporter who is not staff is never told the outcome. A Report about an Admin or their Post
is reviewed only by another Admin; its subject cannot read the reporter. An Admin may review a
Report they filed; a Peer Moderator sees one they filed, but someone else decides it. A Removal is
not such a review: it closes every open Report about the removed Student, one the removing Admin
filed included. Not a Block:
a Report asks for staff action, where a Block withdraws contact and asks for nothing.
_Avoid_: Flag, complaint, abuse report
_French_: Signalement · _Arabic_: بلاغ

**Suspension**:
An Admin's reversible withdrawal of a Student's access: they are signed out at once and
cannot sign in again, and stand outside matching and every Leaderboard until it is lifted.
Their Posts remain and their XP and Streak freeze rather than revert — standing outside a
Leaderboard means not being shown on it, never losing what it measures. If Suspension precedes
Round close, even qualifying activity already in that Round cannot advance Streak or award
Consistent Learner; the Round is not replayed after reinstatement. Not a Block: a Block withdraws
nothing and is never an Admin's to set.
_Avoid_: Ban, block, moderation block, deactivation
_French_: Suspension · _Arabic_: تعليق

**Removal**:
An Admin's final withdrawal of a Student from the platform. Like a Suspension they are signed
out at once; unlike a Suspension it is never lifted, and that Student's email can never be
used again. Their retained account row is view-only, including to an Admin. What they contributed
stays — their Posts, the Matches they were half of, the Private Feedback they wrote — shown as a
former student rather than erased, because it forms part of other Students' records too.
_Avoid_: Deletion, purge, account closure
_French_: Exclusion · _Arabic_: استبعاد

### The matching cycle

**Round**:
One matching cycle, opened and closed by an Admin. Not bound to a calendar week. Closing
is terminal for the Round and for every Match in it.
_Avoid_: Week, cycle, session, sprint
_French_: Tour · _Arabic_: جولة

**Match**:
A pairing of two Students within one Round, one as Mentor and one as Mentee. It ends in exactly
one of four ways: a Review is submitted, the Round closes without one, a Student declines it, or
an Admin's sanction terminates it. Seen only by its two Students and by Admins: no profile lists
a Student's Matches.
_Avoid_: Pair, pairing, connection
_French_: Match · _Arabic_: مطابقة

**Compatibility Score**:
The number shown to both Students expressing how well a Match serves their skill needs.
Never shown without its plain-language explanation, and never recalculated: the number and the
explanation are both fixed when the Match is created, so what the pair were told stays true.
A Match an Admin makes by hand carries no Score at all — an Admin pairs the Students the rule
refused, so there is no honest number and none is shown.
_Avoid_: Match score, fit, rating
_French_: Score de compatibilité · _Arabic_: درجة التوافق

**Mission**:
The shape of meeting suggested to a Match's pair, drawn from a small fixed set — a
pair-programming session, a code review, a discussion. It says how to meet, never what
about: the Compatibility Score's explanation already names the Skills. Attached when the
Match is created and never changed afterwards, and nothing records whether the pair did
it — a Mission is a suggestion the platform makes, not a task it tracks.
_Avoid_: Task, assignment, challenge, brief
_French_: Mission · _Arabic_: نمط اللقاء

### What gets recorded

**Review**:
What a Mentee submits after a Match, comprising exactly three separate parts: a Learning
Outcome, Private Feedback, and a Public Takeaway. The three are never merged and, once
submitted, are never edited; Evidence remains a separate mutable attachment.
_Avoid_: Weekly review, evaluation, feedback
_French_: Bilan · _Arabic_: مراجعة

**Learning Outcome**:
The Mentee's structured record of what they learned and what they can now do that they
could not before the Match. Read by that Review's originating Match pair and by current
Admins, never by the community: only the Public Takeaway drawn from it is public.
_Avoid_: Result, lesson, achievement
_French_: Acquis d'apprentissage · _Arabic_: حصيلة التعلم

**Evidence**:
One optional file the Mentee attaches to a Review's Learning Outcome, showing what that
Review's Match produced. The originating pair and current Admins may read it — Peer Moderator
alone grants nothing — while only the originating Mentee may add, replace or delete it while
active, including after Match completion; Suspension pauses that authority and Removal ends it
without deleting the Evidence.
_Avoid_: Attachment, upload, file, proof
_French_: Justificatif · _Arabic_: دليل

**Private Feedback**:
The Mentee's assessment of the Mentor: two written answers and one optional rating of 1 to
5. Read by that Mentor, by Admins, and by the Mentee who wrote it — never by anyone else,
and never edited once submitted. The rating is one part of the assessment, sitting beside
the sentences that explain it; no score is ever derived from it.
_Avoid_: Rating, review — the assessment is never called "the rating", though the part
inside it is
_French_: Retour privé · _Arabic_: ملاحظات خاصة

**Public Takeaway**:
One short public line the Mentee confirms, distilled from their Learning Outcome.
Becomes a Post.
_Avoid_: Summary, highlight, testimonial
_French_: Point clé public · _Arabic_: خلاصة عامة

**Reflection Prompt**:
An open question published by an Admin to the whole community. Answering is optional and once
only for a participating Student — a Student whose role is `STUDENT` or `PEER_MODERATOR`; an
Admin publishes but does not answer. Exactly one Prompt is live at a time — the greatest in the
durable publication order established when Prompts are published; publication time is descriptive
and does not choose the winner — and publishing the next closes it. A closed Prompt stays readable
forever and can never be answered again.
_Avoid_: Question, poll, survey, prompt cycle
_French_: Sujet de réflexion · _Arabic_: موضوع تأمل

**Post**:
An item on the community feed. Arises only from a Public Takeaway or an answer to a
Reflection Prompt; Students cannot write free-form Posts. Never edited once published: a
Post records what was reflected at the time, and is not a document its author revises.
_Avoid_: Status, update, article
_French_: Publication · _Arabic_: منشور

**Like**:
A Student's mark of appreciation on a Post, given and withdrawn freely. It earns nothing and
cannot be reported, and it is the only thing the community may do to a Post — there are no
comments.
_Avoid_: Reaction, upvote, favourite
_French_: J'aime · _Arabic_: إعجاب

### Progress

**Skill**:
A named capability, drawn from a catalogue shared by everyone, that a Student lists either as one
they can teach or one they want to learn. The shared catalogue is what makes two Students' lists
comparable, and comparing them is what produces Matches.
_Avoid_: Tag, topic, expertise
_French_: Compétence · _Arabic_: مهارة

**Learning Goal**:
One Skill a Student has singled out from those they want to learn as the one that matters most to
them right now, together with the sentence saying why. Optional, and never a Skill they have not
listed: it names a priority among their Skills rather than something narrower than all of them.
_Avoid_: Objective, target, aim
_French_: Objectif d'apprentissage · _Arabic_: هدف التعلم

**XP**:
The single pool of points fed by both the Match loop and the Reflection Prompt loop.
Awarded only for completed, confirmed activity. Concurrent valid awards accumulate without loss;
one earning event can never pay twice.
_Avoid_: Points, score, credits
_French_: XP · _Arabic_: XP

**Level**:
The band a Student's XP places them in, expressing continued participation and
contribution. Derived from XP alone: a Level is read from the pool, never accumulated
alongside it as a second counter. There are ten bands, and the tenth is terminal — a
Student who reaches it keeps earning XP but has no Level left to gain.
_Avoid_: Rank, tier, grade
_French_: Niveau · _Arabic_: مستوى

**Streak**:
The single participation counter, measured in consecutive Rounds containing any
qualifying activity.
_Avoid_: Weekly streak, chain, run
_French_: Série · _Arabic_: مواظبة

**Mentor Reputation** _(Version 2 — not part of the MVP model)_:
The single score derived from Private Feedback, expressing how useful a Student is as
a Mentor. Nothing computes or displays it: a Mentor reads the individual Private Feedback
they have received, and no average is taken over it. Defined here because live rules still
name it: an Admin may never edit it, and it is **never** a matching measure — it plays no part
in a Compatibility Score or in who is Matched with whom, in any version. Ranking is the one
thing it may become, and only in Version 2.
_Avoid_: Karma, stars, rating
_French_: Réputation de mentor · _Arabic_: سمعة المرشد

**Badge**:
A named award a Student earns once for a specific accomplishment, and never loses.
Distinct from XP, which accumulates continuously: a Badge is a discrete, permanent mark.
Always a threshold reached, never a position held — a Badge cannot depend on what other
Students do, because nothing that another person's actions can take away could be kept
for good. What is recorded is the reaching, so a Badge outlives the condition that earned
it: a Streak that later breaks does not take back the Badge it won.
_Avoid_: Achievement, trophy, award
_French_: Badge · _Arabic_: شارة

**Learning Analytics**:
What the community as a whole is trying to learn and teach, and where its Matches are stuck:
the Skills most wanted, the Skills most offered, the gap between them, how often a Match reaches
a Review, and how Matches are distributed across the statuses. It reads each Match's status alone,
so it says where Matches stand now and how past ones ended, never how long they spent in a status
or which way they came. Always about the community, never about a named Student — that is what
separates it from a Student's own record, and it is read by Admins alone.
_Avoid_: Insights, reporting, statistics, metrics
_French_: Analytique des apprentissages · _Arabic_: تحليلات التعلم

**Leaderboard**:
A ranking of Students by one named measure. The measure is XP, and it is the only one:
there is no overall ranking of Students, and no ranking by any other measure. Only
active participants are ranked: an Admin, Suspended Student or Removed Student never appears,
however much XP they hold. The viewer's own-rank pin follows the same filter and cannot add them
back. Further measures, **Mentor Reputation** among them, are Version 2.
_Avoid_: Ranking, top list, chart
_French_: Classement · _Arabic_: لوحة الصدارة
