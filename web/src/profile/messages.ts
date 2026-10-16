// §3.5.2 and CONTRIBUTING.md → "Text ships in three languages", *Before the
// foundation*: until `web/src/i18n/` exists, every text these screens show
// lives in `profileCopy` below, one English object shaped like the
// dictionary. The SPA never displays the server's `message`: it picks its
// own text by `code` from the map below, and an unknown code or a
// non-envelope response shows the generic sentence (§6.15).
const GENERIC = 'Something went wrong. Try again.';

const MESSAGES: Record<string, string> = {
  email_unavailable: 'This email is already in use.',
  goal_skill_not_listed: 'That Skill is not on your learn list. Choose one of your learn Skills.',
  validation_failed: 'Check the highlighted fields and try again.',
  busy_retry_later: 'The server is busy. Try again in a moment.',
};

export function profileErrorMessage(code: unknown): string {
  if (typeof code === 'string' && MESSAGES[code] !== undefined) return MESSAGES[code];
  return GENERIC;
}

// §3.5.2: numbers are written by `Intl`, never by hand. One formatter for
// every number these screens show. §3.5.5: the SPA is English until the
// dictionary exists, so the locale is English whatever the browser's
// language; the language ticket swaps this for the current language's
// locale.
const numberFormat = new Intl.NumberFormat('en-GB');

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

// A sentence with values is one message with `{camelCase}` placeholders,
// kept in the text and filled at render time: never pieces joined in a
// component, and no limit typed by hand (§3.5.2). The placeholders are
// named after the `LIMITS` key they take their value from (§6.0.3), so the
// text moves into the dictionary unchanged. Numbers go through
// `formatNumber`, strings as they are.
export function formatText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    if (!(key in values)) return whole;
    const value = values[key];
    return typeof value === 'number' ? formatNumber(value) : value;
  });
}

// §3.5.2: where markup cannot go (`<option>`, `title`, `aria-label`), a
// Skill or display name sits between U+2068 and U+2069, so `C++` never
// reorders on an Arabic page. Names are never translated.
export function isolateName(name: string): string {
  return `\u2068${name}\u2069`;
}

export const profileCopy = {
  genericError: GENERIC,
  // §4.6: a Removed Student renders as this tombstone, whatever the API's
  // `displayName` says.
  tombstone: 'Former student',
  me: {
    publicProfileLink: 'View your public profile',
  },
  details: {
    title: 'Profile details',
    subtitle: 'Shown to every signed-in Student wherever you appear.',
    displayNameLabel: 'Display name',
    displayNameHint: '{minChars}–{maxChars} characters. Shown to every signed-in Student.',
    displayNameInvalid: 'Enter a display name of {minChars}–{maxChars} characters.',
    emailLabel: 'Email',
    // §4.6: the email is the owner's and the Admins' alone, never on a
    // profile.
    emailHint: 'Used only to sign in. Never shown to other Students.',
    emailInvalid: 'Enter a valid email address.',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Your profile was updated.',
  },
  skills: {
    title: 'Skills',
    subtitle: 'Both lists show on your profile.',
    teachHeading: 'Skills I can teach',
    learnHeading: 'Skills I want to learn',
    teachSelectLabel: 'Choose a Skill to teach',
    learnSelectLabel: 'Choose a Skill to learn',
    selectPlaceholder: 'Choose a Skill',
    add: 'Add',
    empty: 'No Skills here yet.',
    limitHint: 'A list holds up to {maxItems} Skills.',
    nothingToAdd: 'You have listed every catalogue Skill here.',
    chooseFirst: 'Choose a Skill to add.',
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
    textHint: '{minChars}–{maxChars} characters.',
    textInvalid: 'Write a sentence of {minChars}–{maxChars} characters.',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Your Learning Goal was saved.',
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
    retry: 'Try again',
  },
} as const;
