/**
 * Le fil d'avancement.
 *
 * Chaque section nomme l'étape suivante et la question à laquelle elle
 * répond. C'est ce qui manquait le plus face à la maquette de l'équipe
 * offres : sans bouton « Poursuivre vers… », l'utilisateur doit revenir au
 * rail et arbitrer sept fois par dossier. Le rail reste libre — le fil
 * propose un chemin, il ne l'impose pas (critère A4).
 */

import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useT } from '../i18n';

export interface Step {
  slug: string;
  /** Clés du titre et de la question à laquelle l'écran répond. */
  label: string;
  question: string;
}

const SLUGS = ['projet', 'site', 'besoins', 'hypotheses', 'materiel', 'protections', 'chiffrage', 'dossier'] as const;
export const STEPS: Step[] = SLUGS.map((slug) => ({ slug, label: `step.${slug}.label`, question: `step.${slug}.question` }));

/** En-tête d'écran : rang, titre, et la question de l'écran. */
export function StepHead({ slug, aside }: { slug: string; aside?: React.ReactNode }) {
  const t = useT();
  const i = STEPS.findIndex((s) => s.slug === slug);
  const step = STEPS[i];
  if (!step) return null;
  return (
    <div className="stephead">
      <div className="stephead-top">
        <span className="stepbadge">
          {i + 1} <i>/</i> {STEPS.length}
        </span>
        <h1 className="h-page">{t(step.label)}</h1>
        <span className="sep" />
        {aside}
      </div>
      <p className="stephead-q">{t(step.question)}</p>
    </div>
  );
}

/**
 * Pied d'écran : l'action suivante, nommée.
 *
 * Il est rendu par la coquille de l'atelier, hors de la feuille défilante :
 * posé dans la feuille il recouvrait la dernière ligne du contenu (défaut vu
 * au rendu). Ici il occupe sa propre rangée de grille, donc il ne masque
 * jamais rien et reste visible sur les sept écrans.
 */
export function StepNext() {
  const t = useT();
  const { id } = useParams();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const slug = pathname.split('/atelier/')[1]?.split('/')[0] ?? '';
  const i = STEPS.findIndex((s) => s.slug === slug);
  if (i < 0) return null;
  const next = STEPS[i + 1];

  return (
    <div className="stepnext">
      <span className="stepnext-where">
        {t('step.position').replace('{n}', String(i + 1)).replace('{total}', String(STEPS.length))} · {t(STEPS[i]!.label)}
      </span>
      {i > 0 && (
        <button
          className="btn btn-ghost"
          onClick={() => nav(`/projet/${id}/atelier/${STEPS[i - 1]!.slug}`)}
        >
          <span aria-hidden="true">←</span> {t(STEPS[i - 1]!.label)}
        </button>
      )}
      {next ? (
        <button
          className="btn btn-primary"
          onClick={() => nav(`/projet/${id}/atelier/${next.slug}`)}
        >
          {t('step.continueTo')} {t(next.label)} <span aria-hidden="true">→</span>
        </button>
      ) : (
        <button
          className="btn btn-primary"
          onClick={() => nav(`/projet/${id}/atelier/dossier?vue=documents`)}
        >
          {t('step.printFile')} <span aria-hidden="true">↧</span>
        </button>
      )}
    </div>
  );
}
