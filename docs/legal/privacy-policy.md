# Privacy Policy

**42 PeerConnect** · Last updated: 24 October 2026

This page explains what 42 PeerConnect records about you, why, who can see it, how long it is kept,
and what you can change. It describes the platform exactly as it works — including what it does
**not** offer, such as erasing your data.

## In short

- PeerConnect records what you give it and what you do on it: your account and profile, your Skills,
  your Matches and Reviews, your Posts and Likes, your Friends, Blocks and Direct Messages, and your
  XP and Badges.
- Your Learning Outcomes, Evidence, Private Feedback and Direct Messages are never public. Your
  profile, your Posts and the Leaderboard's top ten are visible to every signed-in Student.
  Your own Leaderboard position outside the top ten is visible only to you.
- The team's copy of PeerConnect is stored by **Supabase**, an online database service, in
  Frankfurt, Germany. Your browser never contacts Supabase.
- PeerConnect sets one cookie, to keep you signed in. It has no analytics or advertising, and your
  browser loads nothing from any other website, except when you choose **Sign in with 42**,
  **Connect 42** or **Confirm with 42**.
- What you submit can't be edited or deleted afterwards, and Direct Messages can't be unsent.
- To leave, you ask an Admin to remove your account. **Removal is final, and it is not erasure**:
  most of what you contributed stays.

## Who runs PeerConnect

42 PeerConnect is a student project, built for the ft_transcendence project of the 42 curriculum by
Ahmad (`ahmmanso`), Kamel (`kabbas`) and Hussein (`hdakdouk`). It is not run or endorsed by 42.

PeerConnect runs as separate **copies**, and each keeps its own data:

- **The team's copy** is run by its three authors. Its database, its files and the passwords that
  sign in to it are stored by **Supabase**, an online database service, in its Frankfurt, Germany
  region. A team member runs the program on their own computer; the data it reads and writes stays
  with Supabase.
- **A local copy** is what PeerConnect makes when it is started without the team's settings. It keeps
  everything this page describes on the computer that started it.

Each copy has its own **Admins**: the staff accounts that run its Rounds, publish its Reflection
Prompts and moderate it. A newly started copy contains only demo accounts created automatically,
including its first Admin and Peer Moderator, and no real person's data. The team's copy keeps what
people add to it until the team empties it.

Whoever runs a copy of PeerConnect is responsible for the data it holds and for any data-protection
law that applies to them. That law may give you rights beyond what this page describes.

## What PeerConnect records

**Your account**

- your email address and display name;
- your password, stored only as a salted hash, so nobody can read it, Admins included. It is kept by
  Supabase Auth, the sign-in software that checks it, which knows your account only by an internal
  code, never by your email address;
- when Supabase Auth last accepted your password: when you sign in with it, change it using your
  current password, or connect or disconnect 42. It records this by itself. Rarely, when a technical
  step fails, it also keeps an earlier time it accepted your password;
- if you connect 42 to your account, your 42 account number (see *Other websites and services*);
- your role — Student, Peer Moderator or Admin — and whether your account is suspended or removed.

**Your profile**

- your avatar, if you upload one;
- the Skills you can teach and the Skills you want to learn;
- your Learning Goal, which is one of the Skills you want to learn, and the sentence you write about
  why.

**Your Matches**

For every Match you are part of: who you were paired with and in which Round, which of you is the
Mentor, the Compatibility Score and its explanation (including which Skills it covers), the suggested
Mission, when each of you accepted, who declined if either of you did, and how the Match ended.

**Your Reviews**

When you submit a Review as a Mentee, its three parts are stored separately:

- your **Learning Outcome** — what you learned — with one optional **Evidence** file (PDF, PNG or
  JPEG) and its original file name;
- your **Private Feedback** on your Mentor: two written answers and an optional rating from 1 to 5;
- your **Public Takeaway**, which becomes a Post.

Your Learning Outcome and Private Feedback can be re-read on the Match’s detail page by its two
Students, and through the Admin’s Match page by Admins. The Mentor also has a private list of every
Private Feedback received, newest first, including feedback from a former student. This list is never
on a profile, and ratings are never averaged or combined into a score. The Public Takeaway contains
your confirmed words, attributed to you, without a field naming your Mentor.

**Your activity in the community**

- your Posts: Public Takeaways and answers to Reflection Prompts. An answer is visible immediately
  to every signed-in Student, including those who have not answered. It cannot be edited or deleted
  by its author, and stays readable when its Prompt closes unless it is removed by moderation. For
  each answer we also record the Round open when the answer is accepted, or no Round when none is
  open, so it can count towards your Streak;
- your Likes;
- your friend requests and Friendships;
- the Blocks you set;
- your Direct Messages, and when you read each message sent to you.

**Your progress**

Your XP, your Streak, and each Badge you have earned, with the date you earned it. Your Level is
worked out from your XP rather than stored. Your profile shows your XP, Level progress, Streak and
earned Badges with their dates to every signed-in Student.

Your Streak changes only when a Round closes: it increases by one if you completed a Match as
Mentor or Mentee, or answered a Reflection Prompt during that Round, even if that answer's Post was
later removed. Without either activity it resets to zero. An answer accepted while no Round is open
does not count towards a Streak. Suspension or Removal freezes your Streak and prevents a new
Consistent Learner award at close; a skipped Round is never replayed. A Streak reaching three earns
Consistent Learner once, and the Badge stays even if your Streak later resets. Becoming an Admin
does not freeze your Streak: a completed Match from before promotion still counts.

The Leaderboard shows the ten active Students with the most XP, including Peer Moderators, with
their display names, avatars, ranks, XP and Levels. Admins, Suspended Students and Removed Students
are excluded, without changing their stored XP. If you are eligible and outside the top ten, only
you see your own additional rank, XP and Level on that page.

**Reports you file**

Who or what you reported, the reason you chose, anything you wrote, and how staff resolved it.

**Reports you resolve**

If you are a Peer Moderator or an Admin: which Reports you closed, whether you removed the Post,
dismissed them or marked them as actioned, and when.

**Sign-in sessions**

One record for each browser you are signed in on: whose it is, and when it expires.

Other records also carry the time they were made, and a Friendship also when it was accepted; a sign-in
session records only when it expires.

**What PeerConnect does not record: when you were last online.** Your Friends can see whether you are
online *now*. That status lives only in the running server's memory, is never saved, and resets
whenever the server restarts. Supabase Auth keeps the time it last accepted your password (see *Your
account*), and its logs keep each check of it (see *Logs*).

## Why PeerConnect uses it

- **To sign you in** and keep you signed in.
- **To match you.** When an Admin opens a Round, PeerConnect automatically pairs Students whose Skills
  fit: one who can teach what the other wants to learn. It uses your Skills, your Learning Goal, your
  Level, your Blocks and your past Matches. It never pairs you with someone either of you has
  blocked, and never automatically with a Student you have been matched with before. You are included
  in every Round while you list at least one Skill and your account is active; Admins are never
  matched. An Admin can also pair two Students by hand: a Match made by hand shows no Compatibility
  Score, and never crosses a Block. You can decline any Match.
- **To record what was learned.** The three parts of your Review go to three different audiences (see
  below), and your Public Takeaway joins the community feed.
- **To run the community**: the feed, Likes, Friends, online status and Direct Messages.
- **To track progress**: XP, Level, Streak, Badges and the Leaderboard.
- **To keep the community safe**: Reports, Blocks, and the moderation described in the Terms of
  Service.
- **For Learning Analytics.** Admins see community-wide figures: which Skills are most wanted and most
  offered, the gap between them, how often Matches reach a Review, and how Matches are spread across
  their statuses. These figures are about the community as a whole, never about a named Student, and
  they use Skills and Match statuses, never what anyone wrote.
- **To troubleshoot** the platform, using the request logs described below.

PeerConnect uses your data for nothing else. It shows no advertising, sells nothing, and does not use
your data to train AI models. It shares nothing with anyone outside PeerConnect, except **Supabase**,
which stores the team's copy for the team and uses it for nothing else. It never sends you email:
your email address is used only to sign in.

## Who can see what

| What | Who can see it in PeerConnect |
| --- | --- |
| Your profile: display name, avatar, Skills, Learning Goal and its sentence, XP, Level, Streak, Badges and your Posts | every signed-in Student |
| Posts, and who liked each one | every signed-in Student |
| The Leaderboard: the top ten eligible Students by XP | every signed-in Student |
| Your own position outside the top ten, when eligible | you alone |
| Whether you are online now | your Friends only |
| Your email address | you and Admins — never shown on your profile or in search |
| Your list of Friends | you only |
| A friend request you sent or received, while it waits for an answer | you and the other Student only |
| Your Matches: who you were paired with, their status, the Compatibility Score and its explanation, the suggested Mission, which of you has accepted and, for Admins, which of you declined | the two of you, and Admins. No profile lists anyone's Matches, and a Public Takeaway never names the Mentor |
| Your Learning Outcome and Evidence | the two Students in that Match, and Admins |
| Private Feedback, including its rating | the Mentor it is about, Admins, and you, its author. It is **not anonymous**: the Mentor sees that it came from you |
| Direct Messages | only the two Students in the conversation — not Admins, not Peer Moderators. The sender is never shown whether you have read a message |
| Your Blocks | you only. The other Student is not told, though they may notice they can no longer message you, send you a friend request or be matched with you |
| A Report you file | Admins, who can see that you filed it. Peer Moderators, who review reported Posts, never see who filed a Report. The Student you report, or whose Post you report, is never told |
| A Report you resolve, as a Peer Moderator or an Admin | Admins, who see who closed each Report, how and when. Not the Student it was about, and not the Student who filed it |
| Learning Analytics | Admins only, and only community-wide figures |
| Your role, and whether your account is suspended or removed | you, and Admins in their list of every account. Other Students see a removed account only as a former student (see *Leaving PeerConnect*). Admins are labelled as Admins wherever other Students see them. The Peer Moderator role is not shown to other Students |

Someone who is not signed in can see nothing but the sign-in and sign-up pages and these two policy
pages.

**Admins can edit your display name, email address, avatar, Skills and Learning Goal** — for example
to remove an offensive name — but never your password, your XP or Badges, or anything you wrote.

## Cookies and your browser

PeerConnect sets **one cookie**: a random identifier for your sign-in session. It is sent only to
PeerConnect and only over HTTPS — or, on a developer's local build, over a connection that never
leaves that computer — and page scripts cannot read it. It stops working after 30 days
without use, or as soon as you sign out. While a **Sign in with 42** is in progress, the same cookie
holds a random identifier for that sign-in attempt instead, for at most ten minutes, until the
attempt succeeds or fails.

PeerConnect shows no cookie banner because of how it is built: its single cookie is needed for
signing in, and it sets no other cookie. If PeerConnect stores anything else in your browser, it is
an interface preference, never information about you.

## Other websites and services

Your browser talks to PeerConnect alone. PeerConnect loads no fonts, scripts, images or other content
from other websites, shows no link previews, and contains no analytics, advertising or tracking
tools. Your browser never contacts Supabase either: PeerConnect's server fetches every avatar and
Evidence file from the copy's own file storage, and checks who may see it before sending it.

The one exception is **42**, and only when you choose **Sign in with 42**, **Connect 42** (to link 42
to your account) or **Confirm with 42** (to set a forgotten password). Your browser then goes to 42's
own sign-in page, and PeerConnect asks 42 who you are. PeerConnect keeps your **42 account number**,
to recognise you when you sign in with 42. When no account has that number yet, PeerConnect's sign-up
form suggests your 42 login as your display name and your 42 email address; they are kept only if you
keep them. You can disconnect 42 from your profile at any time, with your current password; that
forgets the number. PeerConnect never keeps your 42 photo, grades, projects, level, campus or location,
and it uses 42's access token once and then discards it.

The team's copy is stored by Supabase in its Frankfurt, Germany region. Supabase's backups and logs,
and the companies it uses to run its service, may be in other places, under Supabase's own terms.

## Logs

To help fix problems, PeerConnect's web server keeps a log of the requests it receives: the time, the
network address each request came from, the method and path requested, the result, the size of the
response, the page that linked to it, and your browser type. The log stays on the computer running
the program, is capped in size, and its oldest entries are overwritten automatically.

The services that store a copy's data keep their own logs of PeerConnect's requests to them: the time,
what was asked for, and the address of PeerConnect's server, never your browser's. They include each
check of your password, the sign-out that follows an accepted one, and each password change on your
account, under its internal code rather than your email address. For the team's copy, Supabase keeps these logs: the team can see
them for up to a day, and Supabase keeps them for its own operations and security, for a period it
sets. For a local copy, they stay on that computer, capped and overwritten like the request log.

**No log ever contains a password, a cookie, the content of what you submit, message text or a
file.**

To slow down password guessing, PeerConnect counts recent sign-in and sign-up attempts, and the wrong
passwords typed when you change your password or connect or disconnect 42, by network address and
email address. Those counts live only in the server's memory and are never saved.

## How long your data is kept

Everything PeerConnect records is kept for as long as the copy's database exists. Nothing is deleted
automatically, except a file that no record uses any more, such as the file of an upload that could
not be saved: PeerConnect deletes it within two hours, as long as it is running and can reach its
file storage. Whoever runs a copy can empty it, which erases everything in it; for the team's copy,
that is the team.

PeerConnect keeps no backups. The team has none it can restore the team's copy from, but Supabase may
keep its own backup copies of that copy's database, under its own terms, so something deleted in
PeerConnect can remain in them until Supabase deletes them. A local copy has no backups at all.

Some things end sooner:

- **Sessions.** Signing out ends that session. Changing your password, a Suspension or a Removal ends
  all of them. An unused session stops working after 30 days.
- **Your avatar** is deleted when you replace or remove it, and when your account is removed, or
  within two hours if that deletion fails, as long as PeerConnect is running and can reach its file
  storage.
- **Evidence** is deleted when its Mentee deletes or replaces it, or within two hours if that deletion
  fails, as long as PeerConnect is running and can reach its file storage. It is not deleted when an
  account is removed.
- **A Skill** leaves your profile when you remove it. Past Matches keep the Skills they were made on,
  because a Match's explanation never changes.
- **Your Learning Goal** and its sentence are deleted when you clear them, or when its Skill leaves
  your learn list.
- **A Like** is deleted when you take it back, **a Friendship** when either of you ends it, and **a
  Block** when you lift it.
- **A friend request** is deleted when the Student it was sent to declines it or you cancel it; when
  it is accepted, it becomes your Friendship. **A Block** deletes any Friendship or friend request
  between the two of you, whichever of you set it.
- **Online status** is never stored, and **attempt counts** (sign-in, sign-up and wrong passwords)
  live only in memory.

Some things are permanent:

- **Direct Messages** can't be deleted, even after either Student's account is removed.
- **Posts, Reviews, Private Feedback, answers to Reflection Prompts and Reports** can't be edited or
  deleted once submitted. A Post removed by moderation leaves the feed, but its text is kept, and
  Admins can still read it in their record of resolved Reports. Its Likes are kept too: once a Post
  is removed, a Like on it can't be taken back.
- **Badges** are never taken away.
- **The email address of a removed account** can never be used again.

## How your data is protected

- Your password is salted and hashed, so nobody can see it, Admins included.
- Every connection to PeerConnect uses HTTPS. The one exception is a developer's local build, which
  serves plain HTTP and only to the same computer, so its traffic never crosses a network.
- For the team's copy, PeerConnect's server reaches Supabase only over encrypted connections whose
  certificates it checks.
- Page scripts cannot read your session cookie, and changing your password signs you out everywhere.
- Files are never public: each request for an avatar or an Evidence file is checked against who is
  allowed to see it.
- Inside PeerConnect, only the two Students in a conversation can read its Direct Messages.

And the limits:

- **Whoever can open a copy's database directly can read everything in it, Direct Messages
  included.** Supabase encrypts the team's copy on its disks, but that protects only the disks. A local
  copy is not encrypted at all, and Direct Messages are not end-to-end encrypted. Only the team, and
  Supabase as its host, can open the team's copy directly: the team through Supabase's dashboard or
  with the copy's settings, which it gives to no one, an evaluator included. Whoever runs a local
  copy can open it. That is access to the database itself, outside PeerConnect: inside PeerConnect, no
  account, an Admin's included, can open another Student's Direct Messages.
- **There are no backups to count on.** If a copy's database is lost, everything in it is lost.
- **A forgotten password can be reset only through 42**, and only if you connected 42 to your
  account: sign in with 42, choose **Confirm with 42** on your profile, then set a new password within
  ten minutes. Otherwise it can't be reset: PeerConnect sends no email, and no Admin can set your
  password.

## Your choices

In PeerConnect you can:

- view and edit your profile: display name, email address, avatar, Skills and Learning Goal;
- change your password, and sign out;
- connect 42 to your account, or disconnect it;
- stop being matched, by removing all your Skills;
- decline any Match;
- Block another Student, and lift a Block you set;
- cancel a friend request you sent, decline one you received, end a Friendship, or take back a Like;
- delete or replace your Evidence, and remove or replace your avatar;
- ask an Admin to remove your account (see below).

PeerConnect does **not** let you:

- download a copy of your data;
- erase your data;
- edit or delete a Post, a Review, Private Feedback, an answer to a Reflection Prompt or a Report once
  submitted, or a Direct Message once sent;
- see Reports filed about you, or look back at Reports you filed.

## Leaving PeerConnect

PeerConnect has no "delete my account" button. To leave, ask an Admin to **remove** your account.

**Removal is final, and it is not erasure.** When your account is removed:

- you are signed out everywhere and can never sign in again;
- your email address stays in the database for good, so it can never be registered again;
- your password's hash stays with Supabase Auth, so that a password sign-in says the account was
  removed only after the right password;
- if you connected 42, your 42 account number stays too, so that 42 account can never make a new
  account;
- your avatar is deleted;
- your account record stays in the database, where only Admins can view it and nobody can change it;
- everywhere else you appear as a former student. Your Posts stay on the feed. Your Matches stay in
  the other Students' histories. Your Learning Outcomes, Evidence and Private Feedback stay readable
  by the same people as before. Your Direct Messages stay visible to the other Student;
- you leave matching and the Leaderboard, a Match you are in the middle of ends, and any Reports
  about you that are still open are closed.

This is because what you contributed is also part of other Students' records: a Mentor's feedback, a
conversation, a Match two people shared.

If you only want to stop taking part, you don't need Removal: remove your Skills, so you are no longer
matched, and sign out.

## Contact

For anything about your account — Removal, a correction, a Suspension — contact an **Admin** of your
copy, in person or by Direct Message. Admins are labelled as Admins in PeerConnect.

For questions about this page, contact its authors on the 42 intranet: `ahmmanso`, `kabbas` and
`hdakdouk`.

## Changes to this page

The date at the top shows when this page last changed. PeerConnect sends no notice of changes, so
check back from time to time.
