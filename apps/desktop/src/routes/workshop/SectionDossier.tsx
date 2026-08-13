/**
 * Rapport & synoptique — l'étape finale du fil.
 *
 * Le dossier était un mode séparé, atteint par un bouton de la barre haute.
 * Deux conséquences fâcheuses : le rail annonçait sept étapes alors que le
 * travail en compte huit, et l'utilisateur perdait le panneau de verdict au
 * moment précis où il en a le plus besoin — celui où il décide s'il remet le
 * document au client. Il vit désormais dans la même coquille que le reste.
 */

import { useSearchParams } from 'react-router-dom';
import { useProject } from './Stub';
import { StepHead } from '../../ui/Flow';
import { fmt } from '../../domain/format';
import { DossierSynthese } from '../dossier/DossierSynthese';
import { DossierSynoptique } from '../dossier/DossierSynoptique';
import { DossierDocuments } from '../dossier/DossierDocuments';
import { engine } from '../../engine';

type Tab = 'synthese' | 'synoptique' | 'documents';

const TABS: { key: Tab; label: string }[] = [
  { key: 'synthese', label: 'Vérifier le dossier' },
  { key: 'synoptique', label: 'Schéma de l’installation' },
  { key: 'documents', label: 'Imprimer les documents' },
];

export function SectionDossier() {
  const project = useProject();
  // La vue vit dans l'adresse : la palette de commandes peut ouvrir
  // directement le synoptique, et un lien partagé retombe au bon endroit.
  const [params, setParams] = useSearchParams();
  const asked = params.get('vue');
  const tab: Tab = TABS.some((x) => x.key === asked) ? (asked as Tab) : 'synthese';
  const setTab = (k: Tab) => setParams(k === 'synthese' ? {} : { vue: k }, { replace: true });
  const v = engine.verdict(project);
  /* L'onglet Documents porte une feuille A4 : à l'impression, elle est le
     document, et tout le reste de l'étape est de la commande d'interface. */
  const printsPaper = tab === 'documents';

  return (
    <div className={`sheet ${printsPaper ? 'prints-paper' : ''}`}>
      <StepHead
        slug="dossier"
        aside={
          <div className="seg">
            {TABS.map((x) => (
              <button
                key={x.key}
                aria-selected={tab === x.key}
                onClick={() => setTab(x.key)}
              >
                {x.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Seule la fiabilité alerte. Le SVI est une comparaison de prix avec le
          réseau local, pas un défaut du système. */}
      {!v.reliable && (
        <div className="alert">
          <div>
            <b>Le système ne tient pas les seuils de fiabilité fixés</b>
            SRI {v.sri.toFixed(2)} sous le seuil {v.sriThreshold.toFixed(2)} —
            LPSP {fmt(v.lpsp, 1)} %. Le dossier reste éditable ; revenez au
            prédimensionnement si cette indisponibilité n’est pas acceptable.
          </div>
        </div>
      )}

      {tab === 'synthese' && <DossierSynthese project={project} />}
      {tab === 'synoptique' && <DossierSynoptique project={project} />}
      {tab === 'documents' && <DossierDocuments project={project} />}
    </div>
  );
}
