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

export const relativeFr = (iso: string): string => {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '—';
  const days = Math.floor((Date.now() - d) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 30) return `il y a ${days} jours`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'il y a 1 mois' : `il y a ${months} mois`;
};
