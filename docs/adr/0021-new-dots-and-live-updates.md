# New dots show where something waits, and more pages change without a reload

On 2026-09-18 [Lock the claimed module list](https://github.com/ahmadmnsur/ft_transcendence/issues/7) left the notification system unclaimed: *"a complete
notification system for all creation, update, and deletion actions"* (`document/en.subject.md:518`)
was *"the worst cost-to-risk ratio on the board"*, for one point. Since then a Student has learned
that something changed only on the page where it shows. A friend request, a partner's answer to a
Match, a Review about them, a live Prompt they have not answered or a new Report appears only to a
Student who opens the right page, and often only after a reload. The thread list's unread count was
the one exception (ADR-0014 d6). `docs/spec.md` §7.4 said it on purpose: *"No event is added for
Likes, declines, Reviews, Evidence, Prompt publication, reports or sanctions; those surfaces refresh
on navigation or reload."*

On 2026-11-02 Kamel settled, question by question, two changes that stay short of that module:
**New dots**, a dot on a link when something waits for the Student on that page, and **more pages
that change live**. The work is four tickets: this record, [Record New dots and live updates in ADR-0021](https://github.com/ahmadmnsur/ft_transcendence/issues/259);
[Live updates: friend requests, Match answers, Reviews and the author's like count](https://github.com/ahmadmnsur/ft_transcendence/issues/260);
[Live updates: removed Posts, new Prompts, Prompt answers and the report queue](https://github.com/ahmadmnsur/ft_transcendence/issues/261); and
[New dots: a dot on each link where something waits for you](https://github.com/ahmadmnsur/ft_transcendence/issues/262), which needs the two before it.

**The part a reader will ask about: this is not the notification system #7 refused, and claims no
point.** A New dot says only that something waits on a page, never what or how many. Nothing is
delivered, listed, kept as a history or shown outside the page's own links, and most actions show
nothing at all. The claim stays at 22 points; the subject counts at most 19 (`:1375`), so the module
would have added margin, not score, at #7's cost.

The shape we chose: **a dot that clears per sign-in, kept on the `Session` row; and events that say
"read again" rather than carrying data.**

## What this ADR changes in earlier records

Each change below is a note dated 2026-11-03 where the old wording is read:

- **ADR-0003 decision 5**: the session row holds more than `id`, `student_id` and `expires_at`. It
  also holds when that sign-in last opened each page that can show a New dot (decision 4 here). It
  still does not hold the role.
- **ADR-0010 decision 7's note of 2026-09-22**: *"no new event, toast, delivery, inbox, unread flag
  or 'seen' state"* still holds for XP, Levels and Badges. No New dot shows progress (decision 3
  here).
- **ADR-0011 decision 12**: there is now a push channel, but it carries nothing to a reporter or to
  the reported Student (decision 7 here), so the reporter still learns nothing.
- **ADR-0014 decisions 1, 6 and 8**: Private Feedback gains its own read state, `read_at`, which
  feeds the Mentor's dot and nothing else (decision 4 here); a Direct Message's `read_at` also
  feeds the Messages dot, which shows on every page, not only on the thread list; and a fourth
  room, `staff`, joins `feed`, `rounds` and `student:<id>` (decision 6 here). Decision 8's note of
  2026-09-22, *"no … per-Student socket event, notification entity, unread state or delivery
  mechanism is added"*, still holds for progress.
- **ADR-0015 decision 8's note**: an Accept, a Decline and a Review now send `match:changed`, but
  only to the Match's two Students. The dashboard does not hear it and still shows those as of the
  last load.
- **ADR-0016 decision 1**: the closed list of assertions gains three, in categories 5, 9 and 12,
  each written by the ticket that builds what it tests (Consequences here).
- **`docs/spec.md`** §1.4 (the notification system stays out), §7.4 (the sentence quoted above) and
  §10.7 (its "no unread flag" is about progress and still holds). Every other section moves with
  the ticket that builds it.

Unaffected:

- **ADR-0003 decision 9**: every new event goes from the server to the client. The one write a
  Student makes, opening a page, is an HTTP request with the CSRF checks of decision 10.
- **ADR-0018 decision 5**: nothing new sits in the browser's storage. Decision 4 of ADR-0018 (who
  sees what) and the Privacy Policy move with the data, in the PR of [New dots: a dot on each link where something waits for you](https://github.com/ahmadmnsur/ft_transcendence/issues/262)
  (ADR-0018 d15).
- **ADR-0018 decision 11**: a reported Student is still never told, and the Terms still change with
  a last-updated date and no notice.

## The decisions

1. **A New dot says that something waits, never what or how many.** A red dot (`danger-500`),
   8 px, after the link's text. The dot is hidden from screen readers, and the link's name gains
   "new" in English, French and Arabic, so the dot is never colour alone. The account menu button
   and the phone menu button show one when a link inside them has one, and the browser tab's icon
   shows one while any link has one, by swapping `favicon.svg` for a copy with a dot. Chrome,
   Firefox and Brave all show a changed icon. One component, `NewDot`, draws every dot, and one
   hook gives each place its value, so a later change of look touches one file.

2. **A link has a dot when something waits on its page and it is newer than the last time this
   sign-in opened that page.** Being on the page counts as opening it, so what arrives while the
   Student is there shows no dot. Every sign-in, on every device, starts with no page opened, so
   what still waits shows again. Two devices signed in at once each clear their own dots. Once a
   waiting thing is handled, by answering, reading or accepting, on any device, its dot is gone
   everywhere, because nothing waits any more.

3. **What waits on each link, and the page that clears it:**

   | Link | What waits | Opening this clears it |
   | --- | --- | --- |
   | Messages | an unread Direct Message to you | `/messages` or any thread |
   | Match | a Match waiting for your Accept or Decline; for the Mentee, an accepted Match with no Review | `/match` |
   | Friends | a friend request to you | `/friends` |
   | Prompts | the live Reflection Prompt, unanswered by you; never for an Admin, who does not answer | `/prompts` or the live Prompt's page |
   | Feedback | unread Private Feedback about you | `/feedback`, or that Match's page |
   | Moderation (Peer Moderator), Admin | an open Report in a group you can act on (ADR-0011 d5–d7) | `/moderation`; `/admin/reports`, with the dot also on the `/admin` home's Reports entry |

   Each dot counts exactly what its page shows, with the page's own filters for Removed Students,
   Blocks and role. Nothing about XP, Levels, Badges, Likes or the Leaderboard has a dot.

   > **Reopened 2026-11-03 by Kamel ([#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262))** *(uncommitted)*:
   > he wants a New dot when one of your own Posts gets a Like. Where it shows and what clears it
   > are settled when #262 starts; until then the sentence above holds.

4. **The openings live on the `Session` row; Private Feedback carries its own `read_at`.** Five
   nullable timestamps on `Session`, one per page a sign-in opens: Messages, Match, Friends,
   Prompts and Reports. A sign-in starts with all five empty, and they go with the row at sign-out
   or expiry. Opening Feedback is reading it, so it needs no column: `PrivateFeedback.read_at` is
   set when the Mentor opens `/feedback` or that Match's page, like a Direct Message's when its
   thread opens. It feeds the Mentor's dot and nothing else. No response carries it, so the Mentee
   who wrote the feedback is never shown whether it was read, the promise the Privacy Policy
   already makes for Direct Messages.

5. **More pages change live, and the new events say "read again".** Each is sent after its commit
   (`docs/spec.md` §3.7), and the page reads again over HTTP, through the same checks as any read:

   | Event | Room | After the commit of | Ticket |
   | --- | --- | --- | --- |
   | `friends:changed` | both Students | a friend request sent, accepted, declined or cancelled; a Friendship ended | [#260](https://github.com/ahmadmnsur/ft_transcendence/issues/260) |
   | `match:changed` | the Match's two Students | an Accept, a Decline, a Review | [#260](https://github.com/ahmadmnsur/ft_transcendence/issues/260) |
   | `prompt:published` | `feed` | a Prompt published | [#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261) |
   | `reports:changed` | `staff` | a Report filed; a group resolved | [#261](https://github.com/ahmadmnsur/ft_transcendence/issues/261) |
   | `new-dots:changed` | that sign-in's own sockets | a page opened | [#262](https://github.com/ahmadmnsur/ft_transcendence/issues/262) |

   Two carry data, because placing it needs nothing more: `post:removed { postId }` to `feed`,
   after a resolution removes a Post, and `post:likes { postId, likeCount }` to the author's room
   only, after a Like is given or taken back. A Prompt's page takes its new answers from the
   existing `post:created`. No event carries a Report, a role or Admin data, as before.

   > **Changed 2026-11-03 by Kamel ([#260](https://github.com/ahmadmnsur/ft_transcendence/issues/260))** *(uncommitted)*:
   > `post:likes { postId, likeCount }` now goes to `feed`, so every Student with the Post loaded
   > sees its count change. The payload names no one. Counts were already readable by every
   > signed-in Student. The cost is one small message to every signed-in socket per Like.

6. **Peer Moderators and Admins share a fourth room, `staff`, and a role change moves a Student's
   connections at once.** A socket joins `staff` at admission when its Student's role is
   `PEER_MODERATOR` or `ADMIN`. A role change does not end a session (ADR-0003 d6), so after it
   commits the server moves that Student's open sockets into or out of `staff`. A demoted Peer
   Moderator stops hearing the queue without reconnecting.

7. **What stays silent.** A Block, including the Friendship it deletes (`docs/spec.md` §11.2); the
   reported Student (ADR-0011 d7); the reporter's outcome (ADR-0011 d12); and a sanction, beyond
   the sign-out it already causes, including a Match it ends. Each would tell someone what the
   records promise they are not told.

8. **Out:** numbers on the dots, popups, operating-system notifications, an inbox or any list of
   what happened, and the notification system module.

## Considered options

- **Claiming the notification system** (`:518`): it would add margin, not score, since 22 points
  are claimed and 19 count, and *"all creation, update, and deletion actions"* cannot hold while a
  Block and a Report must stay silent (decision 7).
- **A number instead of a dot, a popup, or an operating-system notification**: a number needs an
  exact count per page; a popup and an operating-system notification are delivery, the first step
  of the module #7 refused.
- **A dot that means "new since you last opened the page", kept for good**: it needs a record of
  what each Student has seen, on every page, and an old Post would never stop counting. A dot that
  means "something waits" clears itself when the thing is handled.
- **Keeping the openings in the browser's storage**: no migration, and the same result on one
  browser, but a private window or cleared storage brings old dots back, a shared campus computer
  keeps a trace of what its last Student opened, and ADR-0018 d5 allows only an interface
  preference there. **In the server's memory**: lost at every restart. **A JSON column** or **a
  table of its own**: the column's shape goes unchecked, and the table's rows would have to be
  deleted first at each of the five places that delete sessions, since every foreign key is
  `Restrict`.
- **Private Feedback with no `read_at`, dotted only when it arrives during the sign-in**: feedback
  written while the Mentor was away would never show a dot.
- **Events that carry their data**: each would repeat the read's checks for Blocks, roles and
  Removed Students, and each page would have to place the data itself, which made
  [Live client reactions (§7.4)](https://github.com/ahmadmnsur/ft_transcendence/issues/61)'s feed insert long. A read again costs one HTTP request per open
  page.
- **A dot in the tab's title (`● 21 Beirut`) instead of the icon**: it works in every browser, but a
  crowded tab bar cuts the title first, and two signs on one tab say the same thing twice.
- **Live Likes for everyone**: every Like would go to every signed-in Student, for a number. Only
  the author hears their own.

  > **Taken 2026-11-03 by Kamel ([#260](https://github.com/ahmadmnsur/ft_transcendence/issues/260))** *(uncommitted)*: see decision 5's
  > note.

## Consequences

- **A migration and the Privacy Policy move together**, in [New dots: a dot on each link where something waits for you](https://github.com/ahmadmnsur/ft_transcendence/issues/262): the
  `Session` row gains five columns and `PrivateFeedback` one, the *Sign-in sessions* section and
  the Private Feedback line change in three languages, and the PR passes the schema gate. Kamel
  writes it, so Ahmad reviews it, and he also signs off the legal pages (ADR-0018 d14).
- **Each new event costs one HTTP read per page on screen that reacts to it**, and the dots read
  again on every event that can change one. A page not on screen reads on its next visit.
- **Staff members learn when the queue changes**, a Peer Moderator included when a Report names
  them, though never what changed and never a Report about themselves (ADR-0011 d7).
- **Three assertions join the suite** (ADR-0016 d1): in category 5, a `STUDENT` socket never hears
  `reports:changed` and a demoted Peer Moderator stops hearing it; in category 12, the dot rule
  across an opening, a new Direct Message and a new sign-in; in category 9, the Mentee is never
  shown `read_at`. Everything else shows on screen when it goes wrong.
- **The seed does not change.** The demo Student already has two unread Direct Messages and two
  pending friend requests (`docs/spec.md` §14.6), so the Messages and Friends dots show at the
  defense.
- **`docs/spec.md` and the README move with each ticket**: the event list, the rooms, the schema,
  the routes and the tests.

## Not settled by this decision

- **Evidence**: a Mentee's new or replaced Evidence still shows on the Mentor's screen on the next
  read. Nobody asked for it to be live.
- **The dot's look after the first try.** Decision 1 keeps it in one component so it can change;
  a change of colour or shape needs no new ADR, only that component and its screen-reader text.
