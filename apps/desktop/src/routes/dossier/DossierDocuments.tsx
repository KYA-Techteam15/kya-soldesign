import { useEffect, useRef, useState } from 'react';
import { engine } from '../../engine';
import { useUi } from '../../store/ui';
import { ReportA4, type DocKind } from './ReportA4';
import type { Project } from '../../domain/types';

const DOCS: { key: DocKind; label: string; note: string; locked?: boolean }[] = [
  { key: 'rapport', label: 'Rapport technique & commercial', note: 'Remis au client' },
  { key: 'offre', label: 'Offre technique interne', note: 'Usage interne' },
  { key: 'proforma', label: 'Facture proforma', note: 'Remise au client' },
  {
    key: 'dossier_exec',
    label: 'Dossier d’exécution',
    note: 'Édition KYA uniquement',
    locked: true,
  },
];

/* Le projet n'embarque pas de bibliothèque d'icônes : celle-ci reprend le
   tracé de l'imprimante de lucide, au même gabarit de 16 px. */
function PrinterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </svg>
  );
}

export function DossierDocuments({ project }: { project: Project }) {
  const notify = useUi((s) => s.notify);
  const v = engine.verdict(project);
  const [preview, setPreview] = useState<DocKind | null>('rapport');
  const previewRef = useRef<HTMLDivElement>(null);
  /* Le premier aperçu est celui d'ouverture : il ne doit pas emporter la vue
     alors que l'utilisateur n'a rien demandé. Seuls les suivants défilent. */
  const asked = useRef(false);

  useEffect(() => {
    if (!preview || !asked.current) return;
    previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [preview]);

  /* Un aperçu demandé depuis la liste : on l'affiche et on y emmène. */
  const show = (kind: DocKind) => {
    asked.current = true;
    setPreview(kind);
  };

  return (
    <>
      {/* Le SVI ne bloque plus rien : il compare le coût du kWh produit au
          tarif réseau, ce qui dépend du pays et de l'année. Un dossier hors
          réseau ou motivé par la décarbonation se défend au-dessus de 1. */}
      {!v.reliable && (
        <div className="alert">
          <div>
            <b>Seuils de fiabilité non tenus</b>
            SRI {v.sri.toFixed(2)} sous le seuil {v.sriThreshold.toFixed(2)}. Le
            document reste éditable, mais signalez-le au client.
          </div>
        </div>
      )}

      <div className="proj-list">
        {DOCS.map((d) => (
          <div key={d.key} className="proj-row">
            <button
              style={{ textAlign: 'left' }}
              disabled={d.locked}
              onClick={() => show(d.key)}
            >
              <b>{d.label}</b>
              <small>{d.note}</small>
            </button>
            <span className="when">{d.locked ? 'verrouillé' : 'A4 · 2 pages'}</span>
            <button
              /* L'aplat de charte marque l'avancement, pas une sélection :
                 trois lignes primaires proposaient trois fois « l'action à
                 faire ». La ligne retenue se signale par son état. */
              className="btn"
              aria-pressed={preview === d.key}
              disabled={d.locked}
              onClick={() => {
                show(d.key);
                notify({
                  kind: 'success',
                  title: `${d.label} prêt`,
                  detail: 'Ctrl P pour imprimer ou enregistrer en PDF.',
                });
              }}
            >
              {d.locked ? 'licence' : 'Aperçu'}
            </button>
            {/* Imprimer sans passer par l'aperçu. Le document doit d'abord
                être celui qui est monté : on l'affiche, puis on imprime une
                fois le rendu posé. */}
            {!d.locked && (
              <button
                className="btn btn-icon"
                title={`Imprimer — ${d.label}`}
                aria-label={`Imprimer ${d.label}`}
                onClick={() => {
                  show(d.key);
                  window.setTimeout(() => window.print(), 120);
                }}
              >
                <PrinterIcon />
              </button>
            )}
          </div>
        ))}
      </div>

      {preview && (
        /* `paper-wrap` porte l'ancre de défilement et reste, à l'impression,
           le seul enfant conservé de l'étape. */
        <div className="paper-wrap" ref={previewRef}>
          <div className="rowline no-print">
            <h2 className="h-sec">Aperçu avant impression</h2>
            <span className="sep" />
            <span className="label">
              Format A4 · les marges d’impression sont celles du document final
            </span>
            {/* Le pied d'étape porte déjà « Imprimer le dossier » en primaire. */}
            <button className="btn" onClick={() => window.print()}>
              Imprimer / PDF
            </button>
          </div>
          <ReportA4 project={project} kind={preview} />
        </div>
      )}
    </>
  );
}
