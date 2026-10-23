import type { Checked, EnGroup } from '../types';
import admin from './admin';
import auth from './auth';
import design from './design';
import errors from './errors';
import feed from './feed';
import legal from './legal';
import matching from './matching';
import people from './people';
import profile from './profile';
import reviews from './reviews';
import shell from './shell';
import social from './social';
import messages from './messages';
import prompts from './prompts';
import progress from './progress';
import leaderboard from './leaderboard';
import reports from './reports';
import analytics from './analytics';

const en = { shell, legal, auth, errors, people, profile, design, social, messages, matching, prompts, reviews, feed, progress, leaderboard, reports, admin, analytics } satisfies EnGroup;

// English checked against itself: no empty text, camelCase placeholders,
// every form of a plural holding the same ones, no reserved key.
export const enChecked: Checked<'en', typeof en, typeof en> = true;
export default en;
