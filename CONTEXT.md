# 42 PeerConnect

A peer-learning platform for 42 students: it helps them discover who can teach them,
who they can help, and what was actually learned from each interaction. Chat, friends
and the feed exist to serve that loop, not as ends in themselves.

## Language

### People

**Student**:
A 42 student using the platform to learn and to teach. Every account is a Student; Admin
and Peer Moderator are roles a Student holds, not separate kinds of person.
_Avoid_: User, member, peer

**Admin**:
The most privileged role, held by a 42 staff member: opening and closing Rounds, publishing
Reflection Prompts, managing Students and their roles, and every sanction. Staff rather than
a participant — an Admin never enters matching, whatever Skills they list.
_Avoid_: Staff, moderator, superuser

**Peer Moderator**:
A trusted Student granted one further authority: reviewing reported Posts and removing a
Post. Nothing else — never a reported Student, never a reporter's identity, never a
Suspension, a Removal, a Round or a Reflection Prompt. Unlike an Admin, a Peer Moderator is
a full participant, matched and earning XP like any Student.
_Avoid_: Moderator, mod, trusted user

**Mentor**:
The Student in a Match who teaches. Held for the duration of one Match only, never a
standing property of a Student.
_Avoid_: Teacher, tutor, coach

**Mentee**:
The Student in a Match who learns, and the one who submits the Review. Held for one
Match only.
_Avoid_: Learner, apprentice

**Presence**:
Whether a Student currently holds a live connection to the platform, shown to their
friends as online status. A Student has Presence while at least one of their connections is
live, so several open tabs are one Presence rather than several. Live state, never a record:
Presence does not survive a restart of the platform, a Student reads as offline until they
next connect, and **nothing anywhere records when a Student was last online**. That gap is
accepted, not a defect.
_Avoid_: Activity status, availability, last seen

**Friend**:
Another Student whose connection a Student asked for and who accepted. Never one-sided: a
request confers nothing until it is accepted, and either Student may end it. Friends see each
other's Presence, which is the reason the acceptance exists.
_Avoid_: Connection, contact, follower

**Direct Message**:
One private message from one Student to another. Always between exactly two Students, never a
group, and never reportable: a Student's remedy for their own inbox is a Block.
_Avoid_: Conversation, thread, chat message

**Block**:
One Student's standing refusal of contact with another. Mutual in effect whichever Student
set it: a blocked pair can never become a Match, in either direction, and a Block ends any
Friendship between them. Always a Student's own act, never an Admin's — the Admin equivalents
are Suspension and Removal.
_Avoid_: Mute, ban, ignore

**Report**:
A Student's request that staff review a Post or another Student — the only two things that
can be reported. The reporter's account of the problem is testimony, never edited by anyone,
and the reporter is never told the outcome. Not a Block: a Report asks for staff action,
where a Block withdraws contact and asks for nothing.
_Avoid_: Flag, complaint, abuse report

**Suspension**:
An Admin's reversible withdrawal of a Student's access: they are signed out at once and
cannot sign in again, and stand outside matching and every Leaderboard until it is lifted.
Their Posts remain and their XP and Streak freeze rather than revert — standing outside a
Leaderboard means not being shown on it, never losing what it measures. Not a Block: a Block
withdraws nothing and is never an Admin's to set.
_Avoid_: Ban, block, moderation block, deactivation

**Removal**:
An Admin's final withdrawal of a Student from the platform. Like a Suspension they are signed
out at once; unlike a Suspension it is never lifted, and that Student's email can never be
used again. What they contributed stays — their Posts, the Matches they were half of, the
Private Feedback they wrote — shown as a former student rather than erased, because it forms
part of other Students' records too.
_Avoid_: Deletion, purge, account closure

### The matching cycle

**Round**:
One matching cycle, opened and closed by an Admin. Not bound to a calendar week. Closing
is terminal for the Round and for every Match in it.
_Avoid_: Week, cycle, session, sprint

**Match**:
A pairing of two Students within one Round, one as Mentor and one as Mentee. It ends in exactly
one of four ways: a Review is submitted, the Round closes without one, a Student declines it, or
an Admin's sanction terminates it.
_Avoid_: Pair, pairing, connection

**Compatibility Score**:
The number shown to both Students expressing how well a Match serves their skill needs.
Never shown without its plain-language explanation, and never recalculated: the number and the
explanation are both fixed when the Match is created, so what the pair were told stays true.
_Avoid_: Match score, fit, rating

**Mission**:
The shape of meeting suggested to a Match's pair, drawn from a small fixed set — a
pair-programming session, a code review, a discussion. It says how to meet, never what
about: the Compatibility Score's explanation already names the Skills. Attached when the
Match is created and never changed afterwards, and nothing records whether the pair did
it — a Mission is a suggestion the platform makes, not a task it tracks.
_Avoid_: Task, assignment, challenge, brief

### What gets recorded

**Review**:
What a Mentee submits after a Match, comprising exactly three separate parts: a Learning
Outcome, Private Feedback, and a Public Takeaway. The three are never merged.
_Avoid_: Weekly review, evaluation, feedback

**Learning Outcome**:
The Mentee's structured record of what they learned and what they can now do that they
could not before the Match. Read by the Match pair and by Admins, never by the community:
only the Public Takeaway drawn from it is public.
_Avoid_: Result, lesson, achievement

**Evidence**:
One optional file a Mentee attaches to their Learning Outcome, showing what the Match
actually produced. Read by whoever reads the Learning Outcome, and theirs to delete or
replace at any time — the Learning Outcome is testimony, the Evidence only an aid to it.
_Avoid_: Attachment, upload, file, proof

**Private Feedback**:
The Mentee's assessment of the Mentor: two written answers and one optional rating of 1 to
5. Read by that Mentor, by Admins, and by the Mentee who wrote it — never by anyone else,
and never edited once submitted. The rating is one part of the assessment, sitting beside
the sentences that explain it; no score is ever derived from it.
_Avoid_: Rating, review — the assessment is never called "the rating", though the part
inside it is

**Public Takeaway**:
One short public line the Mentee confirms, distilled from their Learning Outcome.
Becomes a Post.
_Avoid_: Summary, highlight, testimonial

**Reflection Prompt**:
An open question published by an Admin to the whole community. Answering is optional, and
once only. Exactly one Prompt is live at a time — the most recently published one — and
publishing the next closes it. A closed Prompt stays readable forever and can never be
answered again.
_Avoid_: Question, poll, survey, prompt cycle

**Post**:
An item on the community feed. Arises only from a Public Takeaway or an answer to a
Reflection Prompt; Students cannot write free-form Posts. Never edited once published: a
Post records what was reflected at the time, and is not a document its author revises.
_Avoid_: Status, update, article

**Like**:
A Student's mark of appreciation on a Post, given and withdrawn freely. It earns nothing and
cannot be reported, and it is the only thing the community may do to a Post — there are no
comments.
_Avoid_: Reaction, upvote, favourite

### Progress

**Skill**:
A named capability, drawn from a catalogue shared by everyone, that a Student lists either as one
they can teach or one they want to learn. The shared catalogue is what makes two Students' lists
comparable, and comparing them is what produces Matches.
_Avoid_: Tag, topic, expertise

**Learning Goal**:
One Skill a Student has singled out from those they want to learn as the one that matters most to
them right now, together with the sentence saying why. Optional, and never a Skill they have not
listed: it names a priority among their Skills rather than something narrower than all of them.
_Avoid_: Objective, target, aim

**XP**:
The single pool of points fed by both the Match loop and the Reflection Prompt loop.
Awarded only for completed, confirmed activity.
_Avoid_: Points, score, credits

**Level**:
The band a Student's XP places them in, expressing continued participation and
contribution. Derived from XP alone: a Level is read from the pool, never accumulated
alongside it as a second counter. There are ten bands, and the tenth is terminal — a
Student who reaches it keeps earning XP but has no Level left to gain.
_Avoid_: Rank, tier, grade

**Streak**:
The single participation counter, measured in consecutive Rounds containing any
qualifying activity.
_Avoid_: Weekly streak, chain, run

**Mentor Reputation** _(Version 2 — not part of the MVP model)_:
The single score derived from Private Feedback, expressing how useful a Student is as
a Mentor. Nothing computes or displays it: a Mentor reads the individual Private Feedback
they have received, and no average is taken over it. Defined here because live rules still
name it: an Admin may never edit it, and it is **never** a matching measure — it plays no part
in a Compatibility Score or in who is Matched with whom, in any version. Ranking is the one
thing it may become, and only in Version 2.
_Avoid_: Karma, stars, rating

**Badge**:
A named award a Student earns once for a specific accomplishment, and never loses.
Distinct from XP, which accumulates continuously: a Badge is a discrete, permanent mark.
Always a threshold reached, never a position held — a Badge cannot depend on what other
Students do, because nothing that another person's actions can take away could be kept
for good. What is recorded is the reaching, so a Badge outlives the condition that earned
it: a Streak that later breaks does not take back the Badge it won.
_Avoid_: Achievement, trophy, award

**Learning Analytics**:
What the community as a whole is trying to learn and teach, and where its Matches stall: the
Skills most wanted, the Skills most offered, the gap between them, and how often a Match reaches
a Review. Always about the community, never about a named Student — that is what separates it
from a Student's own record, and it is read by Admins alone.
_Avoid_: Insights, reporting, statistics, metrics

**Leaderboard**:
A ranking of Students by one named measure. The measure is XP, and it is the only one:
there is no overall ranking of Students, and no ranking by any other measure. Only
participants are ranked: an Admin is staff and never appears, however much XP they hold.
Further measures, **Mentor Reputation** among them, are Version 2.
_Avoid_: Ranking, top list, chart
