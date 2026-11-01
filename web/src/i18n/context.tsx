import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import ar from './ar';
import en from './en';
import fr from './fr';
import { applyLanguage, storeLanguage } from './language';
import {
  format,
  formatDate,
  formatDateTime,
  formatNumber,
  formatText,
  formatTime,
  isolate,
  list,
  listText,
  over,
  type ListOptions,
  type Messages,
  type Plain,
  type Template,
  type Value,
} from './text';
import type { Language } from './types';

const dictionaries = {
  en,
  fr: over(en, fr),
  ar: over(en, ar),
} as unknown as Record<Language, Messages<typeof en>>;

export interface I18n {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Messages<typeof en>;
  format: <V>(message: Template<V>, values: V) => ReactElement;
  formatText: <V>(message: Template<V>, values: Plain<V>) => string;
  list: (items: readonly Value[], options?: ListOptions) => ReactElement;
  listText: (items: readonly (string | number)[], options?: ListOptions) => string;
  personNameText: (name: string, removed: boolean) => string;
  personNameValue: (name: string, removed: boolean) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | number) => string;
  formatTime: (date: Date | number) => string;
  formatDateTime: (date: Date | number) => string;
  errorText: (code: unknown) => string;
}

const Context = createContext<I18n | null>(null);

export function LanguageProvider({ initial, children }: { initial: Language; children: ReactNode }): React.JSX.Element {
  const [language, setLanguageState] = useState<Language>(initial);

  useLayoutEffect(() => {
    applyLanguage(language);
  }, [language]);

  const value = useMemo<I18n>(() => {
    const t = dictionaries[language];
    return {
      language,
      setLanguage: (next) => {
        storeLanguage(next);
        setLanguageState(next);
      },
      t,
      format: (message, values) => format(language, message, values),
      formatText: (message, values) => formatText(language, message, values),
      list: (items, options) => list(language, items, options),
      listText: (items, options) => listText(language, items, options),
      personNameText: (name, removed) => isolate(removed ? t.people.tombstone : name),
      personNameValue: (name, removed) => (removed ? t.people.tombstone : name),
      formatNumber: (value, options) => formatNumber(language, value, options),
      formatDate: (date) => formatDate(language, date),
      formatTime: (date) => formatTime(language, date),
      formatDateTime: (date) => formatDateTime(language, date),
      errorText: (code) => {
        if (typeof code === 'string' && Object.hasOwn(t.errors.codes, code)) {
          return t.errors.codes[code as keyof typeof t.errors.codes];
        }
        return t.errors.unknown;
      },
    };
  }, [language]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(Context);
  if (value === null) throw new Error('useI18n must be used inside LanguageProvider');
  return value;
}
