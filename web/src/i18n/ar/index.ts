import type en from '../en';
import type { Checked } from '../types';
import auth from './auth';
import errors from './errors';
import legal from './legal';
import shell from './shell';

const ar = { shell, legal, auth, errors };

// Every key, plural form and placeholder English has, nothing English does
// not, no empty text and no vowel mark in its own Arabic.
export const arChecked: Checked<'ar', typeof ar, typeof en> = true;
export default ar;
