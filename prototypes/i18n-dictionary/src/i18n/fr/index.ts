import type en from '../en';
import type { Checked } from '../types';
import errors from './errors';
import inbox from './inbox';
import insights from './insights';
import matches from './matches';
import nav from './nav';

const fr = { nav, inbox, errors, insights, matches };

// Every key, plural form and placeholder English has, nothing English does
// not, and no empty text, whether or not an area file has its `satisfies`.
export const frChecked: Checked<'fr', typeof fr, typeof en> = true;
export default fr;
