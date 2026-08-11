import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { UiLocale } from '../../app/contracts.js';
import { translate, type MessageKey } from './index.js';

type Translator = (key: MessageKey) => string;
const I18nContext = createContext<Translator | null>(null);

export function I18nProvider({ locale, children }: { readonly locale: UiLocale; readonly children: ReactNode }) {
  const value = useMemo<Translator>(() => (key) => translate(locale, key), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): Translator {
  const value = useContext(I18nContext);
  if (value === null) throw new Error('I18nProvider is required');
  return value;
}
