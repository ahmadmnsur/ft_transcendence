# 42 PeerConnect

A peer-learning platform for 42 students: it helps them discover who can teach them,
who they can help, and what was actually learned from each interaction. Chat, friends
and the feed exist to serve that loop, not as ends in themselves.

## Language

### People

**Student**:
A 42 student using the platform to learn and to teach. The only kind of participant.
_Avoid_: User, member, peer

**Admin**:
A 42 staff member with authority to open and close Rounds, publish Reflection Prompts,
and act on reported content.
_Avoid_: Staff, moderator, superuser

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
friends as online status. Live state, never a record: Presence does not survive a restart
of the platform, and a Student reads as offline until they next connect. That gap is
accepted, not a defect.
_Avoid_: Activity status, availability, last seen

### The matching cycle

**Round**:
One matching cycle, opened and closed by an Admin. Not bound to a calendar week. Closing
is terminal for the Round and for every Match in it.
_Avoid_: Week, cycle, session, sprint

**Match**:
A pairing of two Students within one Round, one as Mentor and one as Mentee.
_Avoid_: Pair, pairing, connection

**Compatibility Score**:
The number shown to both Students expressing how well a Match serves their skill needs.
Never shown without its plain-language explanation.
_Avoid_: Match score, fit, rating

**Mission**:
The concrete task attached to a Match, so the pair has something specific to do.
_Avoid_: Task, assignment, challenge

### What gets recorded

**Review**:
What a Mentee submits after a Match, comprising exactly three separate parts: a Learning
Outcome, Private Feedback, and a Public Takeaway. The three are never merged.
_Avoid_: Weekly review, evaluation, feedback

**Learning Outcome**:
The Mentee's structured record of what they learned and what they can now do that they
could not before the Match.
_Avoid_: Result, lesson, achievement

**Private Feedback**:
The Mentee's assessment of the Mentor, visible only to that Mentor and to Admins.
_Avoid_: Rating, review

**Public Takeaway**:
One short public line the Mentee confirms, distilled from their Learning Outcome.
Becomes a Post.
_Avoid_: Summary, highlight, testimonial

**Reflection Prompt**:
An open question published by an Admin to the whole community. Answering is optional.
_Avoid_: Question, poll, survey

**Post**:
An item on the community feed. Arises only from a Public Takeaway or an answer to a
Reflection Prompt; Students cannot write free-form Posts.
_Avoid_: Status, update, article

### Progress

**Skill**:
A named capability a Student lists either as one they can teach or one they want to
learn. Comparing those two lists across Students is what produces Matches.
_Avoid_: Tag, topic, expertise

**Learning Goal**:
One optional, specific objective a Student is currently pursuing, stated concretely
enough to act on. Narrower than the Skills they want to learn.
_Avoid_: Objective, target, aim

**XP**:
The single pool of points fed by both the Match loop and the Reflection Prompt loop.
Awarded only for completed, confirmed activity.
_Avoid_: Points, score, credits

**Streak**:
The single participation counter, measured in consecutive Rounds containing any
qualifying activity.
_Avoid_: Weekly streak, chain, run

**Mentor Reputation**:
The single score derived from Private Feedback, expressing how useful a Student is as
a Mentor.
_Avoid_: Karma, stars, rating
