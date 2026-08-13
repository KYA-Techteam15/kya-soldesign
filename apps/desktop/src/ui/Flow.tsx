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
import { useUi } from '../store/ui';

export interface Step {
  slug: string;
  label: string;
  /** La question à laquelle l'écran répond, affichée sous le titre. */
  question: string;
}

export const STEPS: Step[] = [
  {
    slug: 'projet',
    label: 'Identification du projet',
    question: 'Pour qui travaille-t-on, et où se trouve le site ?',
  },
  {
    slug: 'site',
    label: 'Choix du site',
    question: 'Quel soleil reçoit ce site, et sous quelle orientation ?',
  },
  {
    slug: 'besoins',
    label: 'Bilan des consommations',
    question:
      "Combien d'énergie faut-il, et à quelles heures ? Toute erreur ici se propage au reste de l'étude.",
  },
  {
    slug: 'hypotheses',
    label: 'Prédimensionnement',
    question:
      'Ce projet est-il faisable, et à quel ordre de prix — avant même de choisir une référence au catalogue ?',
  },
  {
    slug: 'materiel',
    label: 'Dimensionnement',
    question: 'Avec quel matériel réel, et les contraintes sont-elles tenues ?',
  },
  {
    slug: 'protections',
    label: 'Choix des éléments de protection et de la câblerie',
    question: 'Quels calibres de protection, et quelles sections de câble en découlent ?',
  },
  {
    slug: 'chiffrage',
    label: 'Évaluation financière',
    question: 'Quel prix de vente, et que reste-t-il comme marge ?',
  },
  {
    slug: 'dossier',
    label: 'Vue synoptique et rapports',
    question: 'Que remet-on au client, et le dossier tient-il debout ?',
  },
];

const STEP_LABEL_EN: Record<string, string> = {
  projet: 'Project identification', site: 'Site selection', besoins: 'Consumption assessment',
  hypotheses: 'Pre-sizing', materiel: 'Equipment sizing', protections: 'Protection devices and wiring selection',
  chiffrage: 'Financial assessment', dossier: 'System diagram & reports',
};
const STEP_QUESTION_EN: Record<string, string> = {
  projet: 'Who is the project for, and where is the site?',
  site: 'What solar resource reaches this site, and at what orientation?',
  besoins: 'How much energy is needed, and at what times? Any error here affects the rest of the study.',
  hypotheses: 'Is this project feasible, and at what order of cost—before choosing catalog equipment?',
  materiel: 'Which real equipment should be used, and are the constraints met?',
  protections: 'Which protection ratings and cable sections follow?',
  chiffrage: 'What is the sale price, and what margin remains?',
  dossier: 'What is delivered to the client, and is the file coherent?',
};

/** En-tête d'écran : rang, titre, et la question de l'écran. */
export function StepHead({ slug, aside }: { slug: string; aside?: React.ReactNode }) {
  const lang = useUi((state) => state.lang);
  const i = STEPS.findIndex((s) => s.slug === slug);
  const step = STEPS[i];
  if (!step) return null;
  return (
    <div className="stephead">
      <div className="stephead-top">
        <span className="stepbadge">
          {i + 1} <i>/</i> {STEPS.length}
        </span>
        <h1 className="h-page">{lang === 'en' ? STEP_LABEL_EN[step.slug] ?? step.label : step.label}</h1>
        <span className="sep" />
        {aside}
      </div>
      <p className="stephead-q">{lang === 'en' ? STEP_QUESTION_EN[step.slug] ?? step.question : step.question}</p>
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
        Étape {i + 1} sur {STEPS.length} · {STEPS[i]!.label}
      </span>
      {i > 0 && (
        <button
          className="btn btn-ghost"
          onClick={() => nav(`/projet/${id}/atelier/${STEPS[i - 1]!.slug}`)}
        >
          <span aria-hidden="true">←</span> {STEPS[i - 1]!.label}
        </button>
      )}
      {next ? (
        <button
          className="btn btn-primary"
          onClick={() => nav(`/projet/${id}/atelier/${next.slug}`)}
        >
          Poursuivre vers {next.label} <span aria-hidden="true">→</span>
        </button>
      ) : (
        <button
          className="btn btn-primary"
          onClick={() => window.print()}
        >
          Imprimer le dossier <span aria-hidden="true">↧</span>
        </button>
      )}
    </div>
  );
}
