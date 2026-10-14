import type { Checked, EnGroup } from '../types';
import errors from './errors';
import inbox from './inbox';
import insights from './insights';
import matches from './matches';
import nav from './nav';

const en = { nav, inbox, errors, insights, matches } satisfies EnGroup;

// English checked against itself: no empty text, camelCase placeholders,
// every form of a plural holding the same ones, no reserved key.
export const enChecked: Checked<'en', typeof en, typeof en> = true;
export default en;
