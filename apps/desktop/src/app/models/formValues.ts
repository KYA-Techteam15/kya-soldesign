export type FieldResult<Value> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly message: string };

export function parseOptionalDecimal(
  raw: string,
  constraints: { readonly min?: number; readonly maxExclusive?: number; readonly max?: number } = {},
): FieldResult<number | null> {
  const normalized = raw.trim().replace(',', '.').replaceAll(' ', '');
  if (normalized === '') return { ok: true, value: null };
  const value = Number(normalized);
  if (!Number.isFinite(value)) return { ok: false, message: 'Nombre invalide' };
  if (constraints.min !== undefined && value < constraints.min) {
    return { ok: false, message: `La valeur minimale est ${constraints.min}` };
  }
  if (constraints.max !== undefined && value > constraints.max) {
    return { ok: false, message: `La valeur maximale est ${constraints.max}` };
  }
  if (constraints.maxExclusive !== undefined && value >= constraints.maxExclusive) {
    return { ok: false, message: `La valeur doit être inférieure à ${constraints.maxExclusive}` };
  }
  return { ok: true, value };
}

export function parseRequiredInteger(raw: string, minimum = 1): FieldResult<number> {
  const parsed = parseOptionalDecimal(raw, { min: minimum });
  if (!parsed.ok) return parsed;
  if (parsed.value === null) return { ok: false, message: 'Valeur requise' };
  if (!Number.isInteger(parsed.value)) return { ok: false, message: 'Un nombre entier est requis' };
  return { ok: true, value: parsed.value };
}

export function parseOptionalPercent(raw: string): FieldResult<number | null> {
  const parsed = parseOptionalDecimal(raw, { min: 0, max: 100 });
  return parsed.ok
    ? { ok: true, value: parsed.value === null ? null : parsed.value / 100 }
    : parsed;
}

export function formatOptionalDecimal(value: number | null, decimals = 2): string {
  if (value === null) return '';
  return value.toFixed(decimals).replace(/(?:[.,]0+|([.,]\d+?)0+)$/, '$1').replace('.', ',');
}

export function formatOptionalPercent(value: number | null): string {
  return value === null ? '' : formatOptionalDecimal(value * 100);
}
