import type { Checked, EnGroup } from '../types';
import auth from './auth';
import design from './design';
import errors from './errors';
import legal from './legal';
import people from './people';
import profile from './profile';
import shell from './shell';
import social from './social';

const en = { shell, legal, auth, errors, people, profile, design, social } satisfies EnGroup;

// English checked against itself: no empty text, camelCase placeholders,
// every form of a plural holding the same ones, no reserved key.
export const enChecked: Checked<'en', typeof en, typeof en> = true;
export default en;
