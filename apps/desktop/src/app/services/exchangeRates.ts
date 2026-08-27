import { validateRate, type ExchangeRateRecord } from '../models/applicationSettings.js';

export function createManualRate(baseCurrencyCode: string, quoteCurrencyCode: string, decimalRate: string, observedAtIso: string, sourceLabel: string): ExchangeRateRecord {
  return validateRate({ baseCurrencyCode, quoteCurrencyCode, decimalRate: normalizeDecimal(decimalRate), mode: 'manual', sourceLabel, sourceLocator: null, observedAtIso, fetchedAtIso: null });
}

function normalizeDecimal(value: string): string {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/u.test(normalized)) throw new Error('SETTINGS_INVALID_RATE');
  return normalized.replace(/^0+(?=\d)/u, '');
}
