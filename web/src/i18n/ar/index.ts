import type en from '../en';
import type { Checked } from '../types';
import auth from './auth';
import design from './design';
import errors from './errors';
import legal from './legal';
import matching from './matching';
import people from './people';
import profile from './profile';
import reviews from './reviews';
import shell from './shell';
import social from './social';
import messages from './messages';
import prompts from './prompts';

const ar = { shell, legal, auth, errors, people, profile, design, social, messages, matching, prompts, reviews };

// Every key, plural form and placeholder English has, nothing English does
// not, no empty text and no vowel mark in its own Arabic.
export const arChecked: Checked<'ar', typeof ar, typeof en> = true;
export default ar;
