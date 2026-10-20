import type { InProgressStatus, MatchStatus, Mission } from '@shared/matches';
import type { EnGroup } from '../types';

// §4.2, ADR-0012 d4: the six Mission sentences, keyed by the stored code. A
// rewording, or a translation, may never make a code describe another mode of
// meeting (ADR-0012 d1's notes).
const missions = {
  TECHNICAL_CONCEPT: 'Work through a technical concept together.',
  PROJECT_PROBLEM: 'Walk through how one of you solved a project problem.',
  PAIR_PROGRAMMING: 'Do a short pair-programming session.',
  CODE_REVIEW: 'Review a piece of code together.',
  TECHNOLOGY_DISCUSSION: 'Discuss a technology, tool, or approach.',
  ADVICE: 'Share advice about a project or learning path.',
} as const satisfies Record<Mission, string>;

// §8.8: each Match status as a short label.
const statuses = {
  MATCHED: 'Matched',
  ACCEPTED: 'Accepted',
  COMPLETED: 'Completed',
  LAPSED: 'Lapsed',
  DECLINED: 'Declined',
  TERMINATED_BY_ADMIN: 'Ended by an Admin',
} as const satisfies Record<MatchStatus, string>;

// What an ended Match's status means, shown under it. A Match in progress
// shows who has accepted instead.
const endings = {
  COMPLETED: 'The Mentee submitted the Review.',
  LAPSED: 'The Round closed before this Match was completed.',
  DECLINED: 'One of the two Students declined this Match.',
  TERMINATED_BY_ADMIN: 'An Admin ended this Match.',
} as const satisfies Record<Exclude<MatchStatus, InProgressStatus>, string>;

// `/match`, `/matches`, `/matches/:matchId` and the Admin's `/admin/rounds`,
// `/admin/rounds/:roundId` and `/admin/matches/:matchId` (§3.5.1, §6.6,
// §6.13, §8.11). A failed read or write shows the errors area's sentence for
// its code, and a Removed Student's name is people's tombstone.
export default {
  missions,
  statuses,
  endings,
  // The parts of a Match both its pair and Admins see.
  match: {
    roundNumber: 'Round {number}',
    statusLabel: 'Status',
    missionLabel: 'Mission',
    scoreLabel: 'Compatibility Score',
    // The Score is never shown without its explanation sentence (§8.11).
    scoreValue: '{score} out of {max}',
    // §8.11: a hand-made Match has no Score and shows this instead.
    handMade: 'Matched by an Admin',
    mentorLabel: 'Mentor',
    menteeLabel: 'Mentee',
    retry: 'Try again',
  },
  // A Match as one of its pair reads it (§6.6, §8.11).
  pair: {
    youAreMentor: 'You are the Mentor.',
    youAreMentee: 'You are the Mentee.',
    partnerTeachesYou: '{partner} can teach you {skills}.',
    youTeachPartner: 'You can teach {partner} {skills}.',
    goalYours: 'This Match covers your Learning Goal.',
    goalPartners: "This Match covers {partner}'s Learning Goal.",
    neitherAccepted: 'Neither of you has accepted yet.',
    youAccepted: 'You accepted. Waiting for {partner}.',
    partnerAccepted: '{partner} accepted. Waiting for you.',
    bothAccepted: 'You both accepted.',
    accept: 'Accept',
    accepting: 'Accepting…',
    decline: 'Decline',
    declining: 'Declining…',
    accepted: 'You accepted this Match.',
    declined: 'You declined this Match.',
    // §8.5: a decline is final, and nothing searches for a replacement
    // (ADR-0002 d8). No later Round's matching proposes the pair again
    // (§8.3), though an Admin's hand-made Match may (§8.6), so the promise is
    // about Rounds alone.
    declineConfirm: {
      title: 'Decline this Match with {partner}?',
      body: 'You will both be unmatched in Round {number}, and nothing looks for a new Match for you. No later Round pairs you two again automatically.',
      keep: 'Keep Match',
      confirm: 'Decline Match',
    },
  },
  // `/match`: the signed-in Student's Match in the open Round.
  current: {
    title: 'Your Match',
    loading: 'Loading your Match…',
    noRoundTitle: 'No Round is open.',
    noRoundDescription: 'Your Match shows here once an Admin opens the next Round.',
    noMatchTitle: 'You have no Match in Round {number}.',
    noMatchDescription: 'Matching pairs Students when a Round opens, from the Skills they can teach and want to learn.',
    historyLink: 'Your Match history',
  },
  // `/matches`: the signed-in Student's own Matches, every status.
  history: {
    title: 'Match history',
    caption: 'Your Matches',
    columns: {
      round: 'Round',
      partner: 'Partner',
      role: 'Your role',
      status: 'Status',
    },
    // Each row's link; its accessible name starts with the visible text.
    view: 'View',
    viewNamed: 'View your Match in Round {number}',
    emptyTitle: 'You have no Matches yet.',
    emptyDescription: 'A Match is made when an Admin opens a Round.',
    currentLink: 'Your Match in the open Round',
  },
  // `/matches/:matchId`.
  detail: {
    title: 'Match in Round {number}',
    loading: 'Loading this Match…',
    historyLink: 'Back to your Match history',
  },
  // `/admin/rounds`: opening and closing Rounds, and every Round so far.
  rounds: {
    title: 'Rounds',
    loading: 'Loading the Rounds…',
    currentTitle: 'Current Round',
    openNow: 'Round {number} is open.',
    openedOn: 'Opened on {date}',
    closedOn: 'Closed on {date}',
    noneOpen: 'No Round is open.',
    noneOpenDescription: 'Opening a Round matches every candidate at once.',
    open: 'Open a Round',
    opening: 'Opening…',
    close: 'Close Round {number}',
    closing: 'Closing…',
    viewRound: 'View Round {number}',
    // §8.4: matching runs once, at open, over every candidate (§8.1).
    openConfirm: {
      title: 'Open a new Round?',
      body: 'Matching runs at once over every Student who lists a Skill and is not an Admin, suspended or removed. An open Round stays until an Admin closes it.',
      cancel: 'Cancel',
      confirm: 'Open Round',
    },
    // §8.7: close is irreversible, and a lapsed Match pays nothing.
    closeConfirm: {
      title: 'Close Round {number}?',
      body: 'Every Match still in progress lapses and earns nothing. A closed Round can never be opened again.',
      cancel: 'Keep it open',
      confirm: 'Close Round',
    },
    opened: {
      one: 'Round {number} opened with {count} Match.',
      other: 'Round {number} opened with {count} Matches.',
    },
    openedUnmatched: {
      one: '{count} Student is unmatched.',
      other: '{count} Students are unmatched.',
    },
    closed: {
      one: 'Round {number} closed. {count} Match lapsed.',
      other: 'Round {number} closed. {count} Matches lapsed.',
    },
    caption: 'Every Round',
    columns: {
      round: 'Round',
      opened: 'Opened',
      closed: 'Closed',
    },
    stillOpen: 'Open',
    emptyTitle: 'No Round has been opened yet.',
  },
  // §8.9: the open Round's unmatched Students, derived when read.
  unmatched: {
    title: 'Unmatched Students',
    subtitle: 'Candidates with no Match standing in this Round, worked out when the page loads.',
    empty: 'Every candidate has a Match in this Round.',
    loading: 'Loading the unmatched Students…',
  },
  handMade: {
    description: 'Choose two unmatched Students. Their Skills and Learning Goals determine who is Mentor. This Match shows no Compatibility Score.',
    identify: 'Names can repeat. Match the reference beside each name to the list below, and check their profile before creating the Match.',
    studentOption: '{name} ({reference})',
    viewProfile: 'View profile (opens in a new tab)',
    first: 'First Student',
    second: 'Second Student',
    choose: 'Choose a Student',
    create: 'Create a hand-made Match',
    creating: 'Creating…',
    created: 'The hand-made Match was created.',
    view: 'View Match',
  },
  // `/admin/rounds/:roundId`: one Round's Matches.
  round: {
    title: 'Round {number}',
    loading: 'Loading this Round…',
    matchesTitle: 'Matches',
    caption: 'Matches in this Round',
    columns: {
      mentor: 'Mentor',
      mentee: 'Mentee',
      status: 'Status',
      mission: 'Mission',
    },
    view: 'View',
    viewNamed: 'View the Match of {mentor} and {mentee}',
    emptyTitle: 'This Round has no Matches.',
    roundsLink: 'All Rounds',
  },
  // `/admin/matches/:matchId`: any Match, both participants named.
  adminMatch: {
    mentorTeachesMentee: '{mentor} can teach {mentee} {skills}.',
    menteeTeachesMentor: '{mentee} can teach {mentor} {skills}.',
    goal: "This Match covers {mentee}'s Learning Goal.",
    accepted: '{name} accepted.',
    notAccepted: '{name} has not accepted.',
    declinedBy: '{name} declined this Match.',
  },
} as const satisfies EnGroup;
