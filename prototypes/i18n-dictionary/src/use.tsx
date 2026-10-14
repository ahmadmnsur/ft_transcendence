import type { ReactNode } from 'react';
import en from './i18n/en';
import { format, type Messages } from './i18n/text';

const t = en as unknown as Messages;
export const a: ReactNode = <p>{t.inbox.title}</p>;
export const b: ReactNode = format('fr', t.inbox.sentYou, { name: <bdi>Ahmad</bdi> });
export const c: ReactNode = format('ar', t.inbox.unread, { count: 3 });
export const d: ReactNode = format('ar', t.insights.gapSome, { demand: 12, supply: 1, skill: <bdi>C++</bdi> });
export const e: string = t.errors.internal_error;
import { formatText } from './i18n/text';
export const f: string = formatText('fr', t.inbox.sentYou, { name: 'Ahmad' });
