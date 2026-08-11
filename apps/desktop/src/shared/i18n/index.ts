import type { UiLocale } from '../../app/contracts.js';
import { en } from './en.js';
import { fr, type MessageKey } from './fr.js';

export { en } from './en.js';
export { fr, type MessageKey } from './fr.js';

export const catalogs: Readonly<Record<UiLocale, Record<MessageKey, string>>> = { fr, en };

export function translate(locale: UiLocale, key: MessageKey): string {
  const message = catalogs[locale][key];
  if (message === undefined) throw new Error(`Missing translation: ${key}`);
  return message;
}

export { I18nProvider, useT } from './I18nProvider.js';
