# **42 PeerConnect** 

#### **A Peer-Learning Platform for 42 Students** 

_Helping 42 students systematically discover who can teach them, who they can help, and what they can learn from each interaction._ 

_Concept Proposal for 42 Staff_ 

_Note: Italicized tags such as (MVP), (Version 2), and (Future) mark when each feature is planned to be introduced. See Sections 15–17 for the full roadmap._ 

### 1. Executive Summary 

42 PeerConnect is a peer-learning platform for 42 students, not a general social network. Its purpose is to help students systematically discover who can teach them, who they can help, and what they can actually learn from each interaction. Social features such as chat, friends, and profiles exist to support that goal; they are not the goal itself. 

The platform runs on one core loop: Discover → Match → Learn → Teach → Reflect → Grow → Meet Someone New. Every feature in this proposal exists to make one step of that loop work well, which keeps the platform focused and easy to explain rather than a collection of unrelated social features. 

Operationally, the loop runs through two complementary mechanisms. The first is a weekly 1-to-1 matching system: students are paired primarily by skill compatibility, shown why they were matched, and given a specific mission. Afterward, the Mentee records a concrete learning outcome, gives private feedback to the Mentor, and confirms one public takeaway shared with the community. The second is a 1-to-many reflection loop: periodically, the community answers a shared reflective prompt, and responses become posts the community can read and react to. Both mechanisms feed one XP pool, one participation streak, and one growing picture of what each student has learned and taught over time. 

This version of the proposal incorporates a third round of feedback, focused on making the matching transparent and fair, capturing learning more precisely, and giving 42 staff real visibility into what students are trying to learn. Sections 15–17 lay out exactly what ships in the first release versus later versions, so scope stays deliberate. 

### 2. The Core Idea 

The platform's core promise fits in one line: 

###### **Discover → Match → Learn → Teach → Reflect → Grow → Meet Someone New** 

Each step maps to a concrete part of the platform: 

- Discover — search and skill-compatibility matching (Section 4). 

- Match — weekly pairing, transparency, and acceptance (Sections 4–5). 

- Learn / Teach — the weekly mission and mentoring session (Section 6). 

- Reflect — two related moments: recording a learning outcome after a 1-to-1 session (Section 7), and answering a community reflection prompt (Section 8). 

- Grow — XP, reputation, and visible learning progress (Sections 9–11). 

- Meet Someone New — the loop repeats the following week. 

Operationally, this single loop runs through two parallel mechanisms that both feed the same profile, the same XP pool, and the same participation streak — never separate, competing systems: 

**Mentoring Loop (1-to-1):** Discover → Match → Learn & Teach → Weekly Review → Grow → Meet Someone New. 

**Reflection Loop (1-to-many):** Prompt Released → Student Reflects → Post Shared → Community Reacts & Comments → Grow → Next Prompt. 

Social features — chat, friends, likes, comments, leaderboards — support this loop by making it easier and more motivating to go through, but they are not the product's core purpose. 

42 PeerConnect – Concept Proposal 

### 3. Student Experience 

##### Student Profile 

Each student has a profile inspired by the identity and progress-oriented culture of 42: level, XP, skills, an active learning goal, badges, mentor reputation, and a running record of students helped and students learned from. This record is a simple list at launch and expands into a full visual Learning Progress view in Version 2 (Section 11). 

##### Authentication 

Students sign in with email and password. _(MVP)_ 

Sign-in with the existing 42 intranet account (OAuth 2.0), plus optional two-factor authentication (2FA). _(Version 2)_ 

##### Skills and Learning Goals 

Every student maintains two simple skill lists — Skills I Can Teach and Skills I Want to Learn — plus one optional, specific active Learning Goal (e.g., “I want to learn how to build REST APIs with Spring Boot” rather than just “I want to learn Java”). The general skill list powers weekly matching (Section 4); the Learning Goal powers more targeted discovery features described in Section 17. 

##### Social Features 

- Search students by name, skills, level, projects, or interests. 

- Add friends and manage connections. 

- Private chat between students. 

- View student profiles and learning activity. 

- Home feed containing public takeaways and reflection-prompt posts. 

- Like and comment on posts. 

- Notifications for matches, review reminders, new prompts, comments, likes, and new badges or levels earned. _(Version 2)_ 

##### Trust and Safety 

Because the platform includes chat, comments, and public posts from day one, basic safety tools are part of the initial release: 

- Report a user, post, or comment. 

- Block a user. 

- Admin review queue for reported content (Section 13). 

### 4. Weekly Matching: Compatibility, Transparency & Fair Rotation 

An administrator starts a new matching round from the Admin Dashboard, and the system pairs students for that week with temporary Mentor and Mentee roles. 

Matching prioritizes skill compatibility: the system looks for pairs where one student can teach what the other wants to learn — for example, if Ahmad wants to learn Docker and Karim can teach it, while Karim wants to learn React and Ahmad can teach it, they form a strong match. 

Once a match is created, both students see an approximate Compatibility Score and a short, plain-language reason — for example, “82% match: Karim can teach Docker, which you want to learn; you can teach React, which Karim wants to learn.” This makes the pairing transparent and builds trust in the system instead of presenting matches as a black box. _(MVP)_ 

On top of compatibility, the algorithm applies further constraints: 

- Avoid matching the same two students repeatedly. 

- Balance experience or skill levels when possible. 

42 PeerConnect – Concept Proposal 

- Avoid pairing students who already interact frequently, if the goal for that student is to expand their network. 

- Fair Mentor Rotation: the algorithm also tracks how often a student has recently been chosen as a Mentor, and gives qualified but less-active mentors more opportunities instead of always routing students to the same few highest-rated mentors. This keeps mentoring opportunities — and the reputation data described in Section 10 — spread across more of the community rather than concentrated in a small group. _(MVP)_ 

> **Scope corrected 2026-09-21 by ADR-0006:** Fair Mentor Rotation was proposed here as an MVP
> feature, but it was deliberately cut from the locked MVP scope. It is **not** relabelled as
> Version 2. Availability matching below remains Version 2.

- Detect students who cannot be matched and flag them for the admin to handle manually. 

A further refinement layers each student's weekly availability (e.g., “Monday 5–8 PM, Wednesday 4–7 PM”) on top of compatibility and fairness, so the system prefers pairs who also share free time. This is introduced after the core matching logic is proven, since combining compatibility, fairness, and time-matching at once is a meaningfully harder scheduling problem. _(Version 2)_ 

### 5. Match Acceptance and Status Tracking 

Once the system proposes a match, both students receive a notification, for example: 

_“You have been matched with Karim for this week's PeerConnect mission.”_ 

Each student can accept the match or indicate they cannot participate that week. If someone declines, the system either looks for another available student or flags the case for the admin to resolve manually. 

Every weekly match carries a clear status, visible to both students and admins: 

**Status flow:** Matched → Accepted → Meeting Scheduled → Completed → Review Submitted. 

This makes the Admin Dashboard genuinely useful for the matching process itself: admins can see at a glance where students are getting stuck instead of only seeing a final pass/fail result. 

### 6. Weekly Learning Mission 

To make the matching meaningful, the weekly connection has a simple mission instead of only requiring students to chat. Examples include: 

- Teach your partner a technical concept. 

- Explain how you solved a project problem. 

- Do a short pair-programming session. 

- Review a piece of code together. 

- Discuss a technology, tool, or approach. 

- Share advice about a project or learning path. 

The objective is not to force a long meeting. Even a short, useful interaction is enough if the learning goal is achieved. 

### 7. Weekly Review: Learning Outcome, Private Feedback, and Public Takeaway 

After the weekly interaction, the Mentee completes a short review with three distinct parts that are never mixed together: 

Learning Outcome (structured, feeds Learning Progress) 

- What did you learn, specifically? 

- What can you now do that you couldn't do before this session? 

These two questions are intentionally specific rather than open-ended — they turn the session into a documented learning result, not just a completed meeting. Answers here accumulate into the student's Learning Progress view (Section 11). 

Private Feedback (visible only to the Mentor and admins) 

- How useful was the session? 

- What did the Mentor explain well, and what could be improved? 

42 PeerConnect – Concept Proposal 

###### ● An optional star rating. 

This private layer feeds the Mentor's reputation score (Section 9) but is never shown publicly, which keeps ratings honest and prevents the platform from turning into a popularity contest. 

##### Public Takeaway (becomes a community post) 

Separately, the student confirms one short, public line distilled from their Learning Outcome answers — what they learned, in their own words, with no rating or private comment attached. For example: 

_“Ahmad learned from Karim: I discovered a different approach to debugging memory issues.”_ 

Students cannot create free-form or promotional posts. All content on the main feed comes from exactly two structured sources: public takeaways from weekly reviews (this section), or responses to community reflection prompts (next section). 

### 8. Community Reflection Prompts 

Alongside the 1-to-1 mentoring loop, the platform includes a lighter-weight, 1-to-many way for students to share knowledge and experience. Periodically, the Admin releases a community prompt — an open, reflective question, not necessarily tied to a technical topic. Examples: 

- Describe how you handled a conflict at work or in a team project. 

- What is a mistake that taught you something important? 

- What is one piece of advice you'd give a first-year student? 

- What technology are you currently learning, and why? 

Answering a prompt is optional. A student who responds publishes their answer as a post, which the rest of the community can read, like, and comment on. This is the “Reflect” step of the core loop for the wider community, complementing the individual Learning Outcome captured after each 1-to-1 session (Section 7). 

Consistent participation is tracked through the same streak and XP system used for weekly matching (Section 10): answering prompts regularly builds the single participation streak and contributes to the same XP pool as mentoring activity — never a separate counter. 

Prompts can be organized into categories — Technical, Personal Growth, 42 Life, Career — so the admin can select or schedule prompts from a themed rotation instead of writing every one from scratch. _(Version 2)_ 

### 9. Skill Endorsements and Mentor Reputation 

After a mentoring session, the private feedback described in Section 7 includes a rating. Over time, these ratings can be broken down per skill, so a Mentor's profile shows what they are specifically good at teaching: 

**Karim —** Docker ⭐⭐⭐⭐⭐, Java ⭐⭐⭐⭐, Linux ⭐⭐⭐⭐⭐ 

These per-skill endorsements roll up into a single Mentor Reputation score — they are a more detailed view of the same number, not a second, competing system. _(Version 2)_ 

Combined with Fair Mentor Rotation (Section 4), reputation data reflects a broad, representative set of mentoring interactions rather than being dominated by whichever few students receive the most matches. As with private feedback, the purpose is to recognize students who genuinely help others, not to create a popularity ranking. 

### 10. Gamification and Reputation 

Gamification rewards learning and helping rather than simply spending time on the platform. There is one XP pool and one participation streak, fed by both loops: 

- XP for completing a weekly match, submitting a review, and answering a community prompt. 

- One participation streak that counts any qualifying weekly activity — a completed match or an answered prompt. 

- Levels that represent continued participation and contribution. 

42 PeerConnect – Concept Proposal 

- A single Mentor Reputation score, built from private session feedback and (from Version 2) per-skill endorsements. 

- Badges such as First Mentor, Knowledge Sharer, Problem Solver, Top Mentor, Most Improved, and Longest Learning Streak. 

XP only comes from completed, confirmed activities — a finished match, a submitted review, a published prompt response — never from passive actions like browsing or liking, so it cannot be farmed through meaningless activity. 

### 11. Learning Progress 

Once enough weekly reviews have accumulated, each student's profile includes a Learning Progress view: a simple, visual summary of the skills they've learned over time, who helped them learn each one, who they've helped in turn, and — drawing directly on the Learning Outcome answers from Section 7 — the specific things they can now do that they couldn't do before joining PeerConnect. _(Version 2)_ 

This gives account value beyond XP and badges: a student's profile becomes a real, evidence-based record of growth, not just a score. It also becomes the natural foundation for a future exportable Learning Portfolio (Section 17). 

### 12. Leaderboards 

Instead of a single popularity-based leaderboard, the platform has several categories, each reflecting a different kind of contribution: 

- Overall XP 

- Best Mentor (by Mentor Reputation) 

- Most Helpful 

- Most Improved 

- Most Active 

- Longest Streak 

- Weekly achievements 

### 13. Admin Dashboard 

Staff/Admin users have a dedicated dashboard to manage the community, the weekly matching process, and the reflectionprompt cycle. 

- View total and active students. 

- Start or schedule a weekly matching round. 

- Configure matching constraints and priorities, including fairness rotation. 

- See every match's status (Matched → Accepted → Scheduled → Completed → Reviewed) and quickly identify where students are stuck. 

- Identify students who could not be matched or who declined, and handle manual assignments. 

- Create and publish community reflection prompts. 

- Review reported users, posts, and comments, and take moderation action. 

- View basic participation and engagement statistics. 

- Select or schedule prompts from organized categories instead of creating each one individually. _(Version 2)_ 

##### Learning Analytics 

Beyond managing matches, the dashboard shows 42 staff the community's actual learning needs: the most requested skills to learn, the most available skills to teach, the resulting supply/demand gaps, the overall match completion rate, and where in the status flow (Section 5) matches most often stall. This turns the dashboard into a real signal for planning workshops or resources, not just an operations tool. _(Version 2)_ 

42 PeerConnect – Concept Proposal 

- Grant a limited Peer Moderator role to trusted students, letting them help review flagged content without full admin access. _(Future)_ 

### 14. Why This Could Be Valuable for 42 

The platform does not try to replace the existing 42 learning model. Instead, it gives students a structured, transparent way to find each other for learning, backed by real evidence of what was actually learned and taught — not just activity counts. For 42 staff, the Learning Analytics view (Section 13) turns everyday student interactions into visibility into what the community actually wants to learn, which can directly inform workshops, resources, or curriculum support. 

### 15. Suggested MVP (Version 1) 

The first version focuses on making the core loop work end-to-end, with just enough structure around it to be transparent, fair, and safe for real students: 

- Authentication (email/password) and student profiles, including skills and one active Learning Goal. 

- Student search and friend system. 

- Skill-compatibility-based weekly matching, with a visible Compatibility Score and match explanation, fair mentor rotation, and basic constraints (no repeats, balanced experience). 

> **Scope corrected 2026-09-21 by ADR-0006:** Section 15 is the proposal's authoritative MVP
> list, so this line records Fair Mentor Rotation as an original MVP item. The locked project scope
> subsequently removes Rotation from MVP; it does not defer or relabel it as Version 2. The rest of
> this matching line is unchanged.

- Match acceptance/decline and full status tracking. 

- Private chat. 

- Weekly learning mission. 

- Weekly review: structured learning-outcome questions, private feedback to the Mentor/admin, and a confirmed public takeaway post. 

- A single, admin-created community reflection prompt cycle, with optional student responses as posts. 

- Home feed with likes and comments. 

- Core XP and a single participation streak, based on completed matches, submitted reviews, and answered prompts. 

- Basic Trust and Safety: report and block. 

- Admin dashboard covering matching, prompts, and moderation. 

This keeps the first release centered on the core loop (Section 2) without the extra layers that are valuable but not essential to prove the concept. 

### 16. Planned Enhancements (Version 2) 

Once the core loop is validated, the next version adds the features that make the experience richer and more informative without changing its foundation: 

- 42 intranet OAuth sign-in and optional 2FA. 

- Availability-based matching layered on top of compatibility and fairness. 

- Full notification system. 

- Reflection prompt categories and admin scheduling. 

- Per-skill endorsements rolling up into Mentor Reputation. 

- Full badge set and all leaderboard categories. 

- The Learning Progress view (Section 11). 

- Admin Learning Analytics (Section 13). 

### 17. Future Possibilities (Exploratory) 

**Goal- and Problem-Based Discovery:** Beyond matching on a registered Learning Goal (Section 3), a student could describe a specific, immediate problem — e.g., “I don't understand Docker networking” — and the system would suggest both students who can help and relevant past Takeaways or Knowledge Base entries addressing that exact problem. 

42 PeerConnect – Concept Proposal 

**Knowledge Base:** Over time, public takeaways and reflection responses accumulate into a searchable knowledge base organized by skill or topic, so knowledge shared in a session or prompt response isn't lost once the interaction ends — and becomes the data source for Problem-Based Discovery above. 

**Study Groups / Learning Circles:** Allow students to form small persistent groups around a shared learning goal, separate from weekly matching, with their own feed and membership. 

**Skill Gap Visualization:** A chart comparing a student's current skills against the skills expected for upcoming curriculum projects, with suggested mentors to help close the gap. 

**Personal Learning Portfolio Export:** Let a student export their Learning Progress (Section 11) — mentors they learned from, skills covered, badges earned — as a shareable document for a CV or personal record. 

**AI-Assisted Matching:** Use skills, goals, availability, fairness history, and feedback together to continuously improve future pairings. 

**Cross-Campus Matching:** Eventually connect students from different 42 campuses for international peer-learning connections. 

18. Proposed Core Concept 

## **42 PeerConnect** 

_“Discover someone to learn from. Learn something. Teach something. Reflect on it. Grow together.”_ 

42 PeerConnect – Concept Proposal 

