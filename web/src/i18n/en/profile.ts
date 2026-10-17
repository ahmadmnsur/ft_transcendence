import type { EnGroup } from '../types';

// `/me` and `/students/:id` (§6.2). A failed read or write shows the errors
// area's sentence for its code, and a Removed Student's name is people's
// tombstone.
export default {
  me: {
    publicProfileLink: 'View your public profile',
    // §6.2: `/me` reads the profile once; while that read is pending the cards
    // keep their shells and this sentence, and a failed read has one retry.
    loading: 'Loading your profile…',
    retry: 'Try again',
  },
  details: {
    title: 'Profile details',
    subtitle: 'Your display name and the email you sign in with.',
    displayNameLabel: 'Display name',
    displayNameHint: {
      one: '{minChars}–{count} character. Shown to every signed-in Student.',
      other: '{minChars}–{count} characters. Shown to every signed-in Student.',
    },
    displayNameInvalid: {
      one: 'Enter a display name of {minChars}–{count} character.',
      other: 'Enter a display name of {minChars}–{count} characters.',
    },
    emailLabel: 'Email',
    // §4.6: the email is the owner's and the Admins' alone, never on a
    // profile.
    emailHint: 'Used only to sign in. Never shown to other Students.',
    emailInvalid: 'Enter a valid email address.',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Your profile was updated.',
    nothingToSave: 'Nothing to save.',
  },
  skills: {
    title: 'Skills',
    subtitle: 'Both lists show on your profile, and the next Round matches you on them.',
    teachHeading: 'Skills I can teach',
    learnHeading: 'Skills I want to learn',
    teachSelectLabel: 'Choose a Skill to teach',
    learnSelectLabel: 'Choose a Skill to learn',
    selectPlaceholder: 'Choose a Skill',
    add: 'Add',
    empty: 'No Skills here yet.',
    limitHint: {
      one: 'A list holds up to {count} Skill.',
      other: 'A list holds up to {count} Skills.',
    },
    nothingToAdd: 'You have listed every catalogue Skill here.',
    catalogueLoading: 'Loading the Skill catalogue…',
    chooseFirst: 'Choose a Skill to add.',
    unsaved: 'You have unsaved changes.',
    goalWillClear: 'Saving will clear your Learning Goal, because its Skill is no longer on your learn list.',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Your Skills were saved.',
    goalCleared: 'Your Learning Goal was cleared, because its Skill left your learn list.',
  },
  goal: {
    title: 'Learning Goal',
    subtitle: 'One Skill from your learn list that matters most to you now, with a sentence saying why.',
    currentHeading: 'Current Learning Goal',
    skillLabel: 'Skill',
    skillPlaceholder: 'Choose a Skill',
    chooseSkillError: 'Choose a Skill from your learn list.',
    // §6.2: the Goal names a Skill on the learn list, never one outside it.
    noLearn: 'Add a Skill to your learn list first: your Learning Goal names one of them.',
    textLabel: 'Why this Skill matters',
    textHint: {
      one: '{minChars}–{count} character.',
      other: '{minChars}–{count} characters.',
    },
    textInvalid: {
      one: 'Write a sentence of {minChars}–{count} character.',
      other: 'Write a sentence of {minChars}–{count} characters.',
    },
    save: 'Save',
    saving: 'Saving…',
    saved: 'Your Learning Goal was saved.',
    edit: 'Edit',
    cancel: 'Cancel',
    clear: 'Clear',
    clearing: 'Clearing…',
    cleared: 'Your Learning Goal was cleared.',
  },
  stats: {
    xp: 'XP',
    level: 'Level',
    streak: 'Streak',
  },
  student: {
    teachHeading: 'Skills they can teach',
    learnHeading: 'Skills they want to learn',
    teachEmpty: 'No Skills listed to teach.',
    learnEmpty: 'No Skills listed to learn.',
    goalHeading: 'Learning Goal',
    goalNone: 'No Learning Goal.',
    removedNote: 'This account was removed.',
    // While `GET /api/students/:id` is pending, the page shows this sentence.
    loading: 'Loading the profile…',
    retry: 'Try again',
  },
} as const satisfies EnGroup;
