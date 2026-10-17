import { ApiProtocolError, ApiRefusalError } from '../api/client';

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

// The one sentence for a failed write: a refusal or a protocol error names its
// own text by `code`; anything else (a network failure, an unexpected throw)
// shows the generic text.
export function profileFailureMessage(error: unknown): string {
  if (error instanceof ApiRefusalError || error instanceof ApiProtocolError) {
    return profileErrorMessage(error.code);
  }
  return profileErrorMessage(undefined);
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

// §3.5.2, §3.5.5: a count's text is one entry per plural form. English needs
// `one` and `other`, chosen by `Intl.PluralRules`; only those exist until the
// dictionary does. `{count}`, like every other number, is written by
// `formatNumber` inside `formatText`.
export type CountForms = { one: string; other: string };

const pluralRules = new Intl.PluralRules('en-GB');

export function formatCount(
  forms: CountForms,
  count: number,
  values: Record<string, string | number> = {},
): string {
  return formatText(pluralRules.select(count) === 'one' ? forms.one : forms.other, {
    ...values,
    count,
  });
}

// §3.5.2: where markup cannot go (`<option>`, `title`, `aria-label`), a
// Skill or display name sits between U+2068 and U+2069, so `C++` never
// reorders on an Arabic page. Names are never translated. This gives way to
// `PersonName`'s plain-text helper and `SkillName`'s when the language
// tickets add them.
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
} as const;
