/** Stable JSON canonicalisation for the technical request. No clock, locale or global state. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new RangeError('input hash cannot encode a non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  throw new RangeError('input hash cannot encode undefined, bigint, symbol or function values');
}

/** Deterministic, synchronous 64-bit FNV-1a identifier. It is an identity hash, not a security primitive. */
export function hashTechnicalInput(value: unknown): string {
  return `fnv1a64:${fnv1a64(canonicalJson(value))}`;
}

/** Stable identity for a rejected non-canonical payload. Never represents a validated technical request. */
export function hashDiagnosticInput(value: unknown): string {
  return `diagnostic-fnv1a64:${fnv1a64(canonicalDiagnosticJson(value))}`;
}

function canonicalDiagnosticJson(value: unknown, ancestors: readonly object[] = []): string {
  if (value === undefined) return '{"$invalid":"undefined"}';
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '{"$invalidNumber":"NaN"}';
    if (value === Infinity) return '{"$invalidNumber":"Infinity"}';
    if (value === -Infinity) return '{"$invalidNumber":"-Infinity"}';
    return JSON.stringify(value);
  }
  if (typeof value === 'bigint') return `{"$invalidBigInt":${JSON.stringify(value.toString())}}`;
  if (typeof value === 'symbol') return `{"$invalidSymbol":${JSON.stringify(value.description ?? '')}}`;
  if (typeof value === 'function') return `{"$invalidFunction":${JSON.stringify(value.name)}}`;
  if (typeof value !== 'object') return `{"$invalidType":${JSON.stringify(typeof value)}}`;
  if (ancestors.includes(value)) return '{"$invalid":"circular"}';
  const nextAncestors = [...ancestors, value];
  if (Array.isArray(value)) return `[${value.map((item) => canonicalDiagnosticJson(item, nextAncestors)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalDiagnosticJson(record[key], nextAncestors)}`).join(',')}}`;
}

function fnv1a64(canonical: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= BigInt(canonical.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}
