import type en from '../en';
import type { Checked } from '../types';
import auth from './auth';
import errors from './errors';
import legal from './legal';
import people from './people';
import profile from './profile';
import shell from './shell';

const fr = { shell, legal, auth, errors, people, profile };

// Every key, plural form and placeholder English has, nothing English does
// not, and no empty text, whether or not an area file has its `satisfies`.
export const frChecked: Checked<'fr', typeof fr, typeof en> = true;
export default fr;
