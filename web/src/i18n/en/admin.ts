import type { Role } from '@shared/roles';
import type { StudentStatus } from '@shared/student-status';
import type { EnGroup } from '../types';

// §4.2: each role by its stored code, in `CONTEXT.md`'s words.
const roles = {
  STUDENT: 'Student',
  PEER_MODERATOR: 'Peer Moderator',
  ADMIN: 'Admin',
} as const satisfies Record<Role, string>;

// §4.3.1: the derived status, in `CONTEXT.md`'s words.
const statuses = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  REMOVED: 'Removed',
} as const satisfies Record<StudentStatus, string>;

// `/admin/users` and `/admin/users/:studentId`, the Users table (§3.5.1,
// §6.12, §12.7). A failed read or write shows the errors area's sentence for
// its code.
export default {
  roles,
  statuses,
  // `/admin`: one link to each Admin page, so the header holds a single
  // Admin link (§3.5.1). Each link's name is its page's own title.
  home: {
    title: 'Admin tools',
    description: 'Everything an Admin runs, in one place.',
    rounds: 'Open and close Rounds, follow their Matches and make a Match by hand.',
    prompts: 'Publish the next Reflection Prompt and look back at the earlier ones.',
    users: 'Find any account by name, email, role or status, change its role, edit its profile, or suspend, reinstate or remove it.',
    analytics: 'What Students want to learn and can teach, and how their Matches are going.',
    reports: 'Decide on the open Reports about Posts and Students, and look back at the resolved ones.',
  },
  // `/admin/users`: every account, Removed ones included.
  users: {
    title: 'Users',
    filtersLabel: 'Search users',
    queryLabel: 'Name or email',
    // §6.0.3: the search term is at most 60 characters.
    queryInvalid: {
      one: 'Enter up to {count} character.',
      other: 'Enter up to {count} characters.',
    },
    roleLabel: 'Role',
    anyRole: 'Any role',
    statusLabel: 'Status',
    anyStatus: 'Any status',
    submit: 'Search',
    clear: 'Clear filters',
    count: {
      one: '{count} account found',
      other: '{count} accounts found',
    },
    caption: 'Accounts',
    columns: {
      name: 'Name',
      email: 'Email',
      role: 'Role',
      status: 'Status',
    },
    emptyTitle: 'No account matches this search.',
    emptyDescription: 'Try another name or email, or clear some filters.',
  },
  // `/admin/users/:studentId`: one account, with the actions its status
  // allows (ADR-0008 d11's note).
  user: {
    loading: 'Loading this account…',
    retry: 'Try again',
    usersLink: 'All users',
    emailLabel: 'Email',
    roleLabel: 'Role',
    statusLabel: 'Status',
    publicProfileLink: 'View their public profile',
    removedNote: 'This account was removed. It stays view-only: nothing on it can change.',
    suspendedNote: 'This account is suspended. They cannot sign in until an Admin reinstates them.',
    // §12.7, §10.8: the role column of the Users table.
    role: {
      title: 'Role',
      subtitle: 'Applies from their next request, without signing them out.',
      label: 'New role',
      submit: 'Change role',
      submitting: 'Changing…',
      // ADR-0008 d9: an Admin never changes their own role.
      self: 'You cannot change your own role. Another Admin can.',
      unchanged: 'Choose a role other than their current one.',
      changed: 'Their role is now {role}.',
      confirm: {
        title: 'Change the role of {name} to {role}?',
        // §10.8: what promotion keeps and what it closes.
        toAdmin: 'An Admin is staff: never matched in a new Round, never answers a Reflection Prompt, and never on the Leaderboard. Their XP, Level, Streak, Badges and Posts stay, and a Match made before this change finishes as usual.',
        // §10.8: demotion restores both without recomputing anything.
        fromAdmin: 'They take part again: matched from the next Round, ranked on the Leaderboard, and able to answer Reflection Prompts. Nothing is recalculated.',
        // ADR-0008 d3: the Peer Moderator's one further authority.
        toModerator: 'A Peer Moderator reviews reported Posts, and otherwise takes part like any Student.',
        toStudent: 'They keep taking part as a Student, without reviewing reported Posts.',
        cancel: 'Cancel',
        confirm: 'Change role',
      },
    },
    // §12.7: Suspend, Reinstate and Remove, as the account's status allows
    // (ADR-0008 d11's note). Each asks first, saying what it ends and what it
    // keeps.
    sanctions: {
      title: 'Suspension and Removal',
      subtitle: 'A Suspension can be lifted. A Removal is final.',
      // ADR-0008 d9: an Admin never suspends or removes themselves.
      self: 'You cannot suspend or remove your own account. Another Admin can.',
      suspend: 'Suspend',
      reinstate: 'Reinstate',
      remove: 'Remove',
      working: 'Saving…',
      suspended: 'They are suspended and signed out everywhere.',
      reinstated: 'They are reinstated and can sign in again.',
      confirm: {
        suspendTitle: 'Suspend {name}?',
        // §12.7, ADR-0008 d5: what a Suspension ends and what it keeps.
        suspendBody: "They are signed out everywhere and can't sign in until an Admin reinstates them. Their Match in progress ends, and they leave matching and the Leaderboard. Their Posts, avatar, Evidence, XP and Streak stay, and Reports about them stay open.",
        // §8.1, §10.5: an Admin is never matched or ranked, so an Admin's page
        // says neither.
        suspendAdminBody: "They are signed out everywhere and can't sign in until another Admin reinstates them. Their Match in progress ends. Their Posts, avatar, Evidence, XP and Streak stay, and Reports about them stay open.",
        reinstateTitle: 'Reinstate {name}?',
        // §8.1, §8.9: a candidate again at once, so an open Round where no Match
        // of theirs stands can pair them by hand; §8.8: reinstatement revives
        // nothing.
        reinstateBody: 'They can sign in again and are ranked on the Leaderboard again. If they list a Skill, the next Round can match them, and in an open Round where they have no Match standing, an Admin can pair them by hand now. Nothing the Suspension ended comes back: an ended Match stays ended.',
        reinstateAdminBody: 'They can sign in again. Nothing the Suspension ended comes back: an ended Match stays ended.',
        removeTitle: 'Remove {name}?',
        // §12.7, ADR-0008 d7, ADR-0011 d10: final, and what stays. {tombstone}
        // is the name a Removed Student shows under (`people.tombstone`).
        removeBody: "This is final: nobody can undo it. They are signed out everywhere and can never sign in again, and their email can never be used again. Their Match in progress ends, their avatar is deleted, and every open Report about them is closed as actioned, with you recorded as the one who resolved it. Everything they wrote stays, shown under the name {tombstone}.",
        cancel: 'Cancel',
      },
    },
    // §6.12: the Student's Matches, which no profile lists (§4.6).
    matches: {
      title: 'Matches',
      caption: 'Their Matches',
      columns: {
        round: 'Round',
        role: 'Their role',
        partner: 'Partner',
        status: 'Status',
      },
      view: 'View',
      viewNamed: 'View the Match in Round {number}',
      emptyTitle: 'No Matches yet.',
    },
  },
  // The `/me` cards' sentences that speak to the Student, said about them
  // instead when an Admin edits their profile (§6.12). Every other text the
  // cards show is the profile area's own.
  cards: {
    avatar: {
      subtitle: 'Shown beside their name to every signed-in Student.',
      currentAlt: "This Student's avatar",
      saved: 'The avatar was updated.',
      removed: 'The avatar was removed. Their profile shows the default avatar.',
      confirmTitle: 'Remove this avatar?',
      confirmBody: 'Their profile will show the default avatar until a new one is uploaded.',
    },
    details: {
      subtitle: 'Their display name, and the email they sign in with. No email is sent to them.',
      saved: 'The profile was updated.',
    },
    skills: {
      subtitle: 'Both lists show on their profile, and the next Round matches them on these Skills.',
      teachHeading: 'Skills they can teach',
      learnHeading: 'Skills they want to learn',
      nothingToAdd: 'Every catalogue Skill is already listed here.',
      goalWillClear: 'Saving will clear their Learning Goal, because its Skill is no longer on their learn list.',
      saved: 'The Skills were saved.',
      goalCleared: 'Their Learning Goal was cleared, because its Skill left their learn list.',
    },
    goal: {
      subtitle: 'One Skill from their learn list that matters most to them now, with a sentence saying why.',
      chooseSkillError: 'Choose a Skill from their learn list.',
      noLearn: 'Their learn list is empty: a Learning Goal names one of its Skills.',
      saved: 'The Learning Goal was saved.',
      cleared: 'The Learning Goal was cleared.',
    },
  },
} as const satisfies EnGroup;
