import type { Checked, EnGroup } from '../types';
import auth from './auth';
import errors from './errors';
import legal from './legal';
import shell from './shell';

const en = { shell, legal, auth, errors } satisfies EnGroup;

// English checked against itself: no empty text, camelCase placeholders,
// every form of a plural holding the same ones, no reserved key.
export const enChecked: Checked<'en', typeof en, typeof en> = true;
export default en;
