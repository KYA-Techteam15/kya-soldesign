/**
 * Formatage des nombres. Centralisé, parce que la virgule décimale, l'espace
 * insécable de groupement et le rang d'arrondi sont des décisions de produit,
 * pas des détails de vue (critère B4).
 */

const NBSP = ' '; // espace fine insécable

export const fmt = (value: number, decimals = 0): string => {
  if (!Number.isFinite(value)) return '—';
  const fixed = Math.abs(value).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const sign = value < 0 ? '−' : '';
  return dec ? `${sign}${grouped},${dec}` : `${sign}${grouped}`;
};

/** Montants : jamais de décimale au-delà du millier, elle n'apporte rien. */
export const money = (value: number): string =>
  fmt(value, Math.abs(value) >= 1000 ? 0 : 0);

/** Millions, pour les comparaisons de scénarios. */
export const millions = (value: number): string => fmt(value / 1e6, 2);

export const pct = (value: number, decimals = 1): string => fmt(value, decimals);

/** Signe explicite — utilisé pour les réserves et les écarts. */
export const signed = (value: number, decimals = 1): string =>
  `${value > 0 ? '+' : ''}${fmt(value, decimals)}`;

export const dateFr = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};


type Lang = 'fr' | 'en';
const LOCALE: Record<Lang, string> = { fr: 'fr-FR', en: 'en-GB' };

/**
 * Libellé unique d'une devise, dérivé de son code ISO : « F CFA » pour XOF en
 * français, « €» pour EUR. Tous les écrans et documents l'utilisent.
 */
export const currencyLabel = (code: string, lang: Lang = 'fr'): string => {
  try {
    const part = new Intl.NumberFormat(LOCALE[lang], { style: 'currency', currency: code, currencyDisplay: 'symbol' })
      .formatToParts(0).find((item) => item.type === 'currency');
    return part?.value ?? code;
  } catch { return code; }
};

/** Date longue localisée (« 23 septembre 2026 » / « 23 September 2026 »). */
export const dateLong = (iso: string | null | undefined, lang: Lang = 'fr'): string => {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric' });
};

/** Ancienneté relative localisée. */
export const relativeTime = (iso: string, lang: Lang = 'fr'): string => {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '—';
  const format = new Intl.RelativeTimeFormat(LOCALE[lang], { numeric: 'auto' });
  const days = Math.floor((Date.now() - d) / 86_400_000);
  if (days < 30) return format.format(-days, 'day');
  return format.format(-Math.floor(days / 30), 'month');
};
