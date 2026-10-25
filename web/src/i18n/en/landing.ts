import type { EnGroup } from '../types';

// `/` for a signed-out visitor: what PeerConnect is, before signing in
// (§3.5.1's note of 2026-10-25). It shows no data; the example Match uses an
// invented name and says so.
export default {
  // {learn} and {teach} are the two Skill choices, set inside the sentence.
  question: 'I want to learn {learn} and I can teach {teach}.',
  learnLabel: 'A Skill you want to learn',
  teachLabel: 'A Skill you can teach',
  lead: 'Each Round, students at 42 are paired up: the Mentor teaches a Skill the Mentee wants to learn, and both see exactly why.',
  signUp: 'Sign up and list your Skills',
  example: {
    label: 'Example, with an invented name',
    title: 'Your Match in Round {number}',
    // The heading's name for assistive technology, which carries the
    // example label the eye reads on the tag above it.
    heading: 'Example, with an invented name: your Match in Round {number}',
    // The invented Student of the example Match.
    partner: 'Lina',
    // {skill} is the Skill picked to learn.
    goalLabel: '{skill} is my Learning Goal',
    // §8.3 step 4: a pair's Match runs in the direction that scores higher;
    // on equal Scores a fixed rule picks the Mentor.
    mentorWhy: '{partner} teaches your Learning Goal, so the Match scores higher with {partner} as your Mentor.',
    mentorTie: 'Without a Learning Goal, both directions score the same, and a fixed rule picks the Mentor.',
  },
  round: {
    heading: 'How a Round runs',
    skillsTitle: 'List your Skills',
    skillsBody: 'What you can teach and what you want to learn, from one catalogue every Student shares. You can single one out as your Learning Goal.',
    matchTitle: 'Get your Match',
    matchBody: 'When an Admin opens a Round, matching runs at once. Each Match has a Mentor, a Mentee and a Compatibility Score with its reasons, fixed once it is made.',
    meetTitle: 'Meet',
    meetBody: 'Accept the Match, or decline it. Its Mission suggests how to meet, such as a pair-programming session or a code review.',
    reviewTitle: 'Write the Review',
    reviewBody: 'The Mentee records what they learned. When the Review is submitted, both of you earn XP.',
  },
  review: {
    heading: 'What a Review records, and who reads it',
    intro: 'A Review has three separate parts, and none of them is edited once submitted.',
    outcomeBody: 'What the Mentee learned and can now do. Read by the two of you and by Admins.',
    feedbackBody: 'Two written answers and an optional rating from {min} to {max}. Read by the Mentor, by Admins and by the Mentee who wrote it.',
    takeawayBody: 'One line, posted on the feed for every signed-in Student. It never names the Mentor.',
  },
  prompts: {
    heading: 'Between Matches, one question for everyone',
    body: 'An Admin publishes a Reflection Prompt. You can answer it once, and your answer becomes a Post on the feed. Posts get Likes, never comments.',
    exampleLabel: 'Example Reflection Prompt',
    exampleQuestion: 'What did someone explain to you better than the documentation did?',
  },
  grow: {
    heading: 'One XP pool, ten Levels, three Badges',
    body: 'Reviews and Prompt answers feed the same XP, and your Level comes from it. A Badge, once earned, is never taken away. The Leaderboard ranks Students by XP.',
    // What earns each Badge, told to a visitor; the rules page keeps the
    // full conditions.
    badges: {
      FIRST_MENTOR: 'The first time a Mentee submits a Review of a Match where you were the Mentor.',
      KNOWLEDGE_SHARER: 'For answering three Reflection Prompts.',
      CONSISTENT_LEARNER: 'For a Streak of three Rounds, each with a completed Match or a Prompt answer.',
    },
  },
  close: {
    heading: 'Your first Match starts with two lists.',
    body: 'Sign up and list what you can teach and what you want to learn. When an Admin opens the next Round, matching includes you.',
  },
} as const satisfies EnGroup;
