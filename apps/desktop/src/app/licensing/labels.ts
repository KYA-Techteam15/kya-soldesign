/**
 * Libellés d'une licence qui tolèrent l'inconnu (spec 012, T061) : la plateforme peut ajouter des
 * éditions ou des durées sans nouvelle version du logiciel.
 */
type Translate = (key: string) => string;

/** « Commerciale », sinon le code tel quel (édition ajoutée depuis cette version). */
export function editionLabel(t: Translate, edition: string): string {
  const key = `license.edition.${edition}`;
  const label = t(key);
  return label === key ? edition : label;
}

/** « 1 an », sinon « 14 jours » pour un code `<jours>d`, sinon le code tel quel. */
export function planLabel(t: Translate, plan: string): string {
  const key = `license.plan.${plan}`;
  const label = t(key);
  if (label !== key) return label;
  const days = /^(\d+)d$/u.exec(plan)?.[1];
  return days ? t(days === '1' ? 'license.daysOne' : 'license.days').replace('{count}', days) : plan;
}

/** Texte du filigrane imposé : celui de l'édition connue, sinon un texte générique. */
export function watermarkLabel(t: Translate, watermark: string): string {
  const key = `license.watermark.${watermark}`;
  const label = t(key);
  return label === key ? t('license.watermark.generic') : label;
}
