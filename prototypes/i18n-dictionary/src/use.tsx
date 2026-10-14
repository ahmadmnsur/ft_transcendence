import type { ReactNode } from 'react';
import type { ErrorCode } from './codes';
import en from './i18n/en';
import { format, formatText, list, type Messages } from './i18n/text';

// Call sites, as a component would write them.
const t = en as unknown as Messages<typeof en>;
export const a: ReactNode = <p>{t.inbox.title}</p>;
export const b: ReactNode = format('fr', t.inbox.sentYou, { name: <bdi>Ahmad</bdi> });
export const c: ReactNode = format('ar', t.inbox.unread, { count: 3 });
export const d: ReactNode = format('ar', t.insights.gapSome, { demand: 12, supply: 1, skill: <bdi>C++</bdi> });
export const e = (code: ErrorCode): string => t.errors[code];
export const f: string = formatText('ar', t.inbox.sentYou, { name: 'Ahmad' });
export const g: ReactNode = format('fr', t.matches.evidenceLimit, { size: 2048 });
export const h: ReactNode = format('ar', t.matches.canTeach, { partner: <bdi>Ahmad</bdi>, skills: list('ar', ['Docker', 'Git', 'C++']) });
