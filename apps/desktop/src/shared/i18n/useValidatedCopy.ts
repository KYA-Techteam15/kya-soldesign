import { useApplication } from '../../app/ApplicationProvider.js';
import { validatedEn } from './validated-en.js';
import { validatedFr, type ValidatedCopyKey } from './validated-fr.js';

export function useValidatedCopy() {
  const { locale } = useApplication();
  const catalog: Record<ValidatedCopyKey, string> = locale === 'fr' ? validatedFr : validatedEn;
  return (key: ValidatedCopyKey) => catalog[key];
}
