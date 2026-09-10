import { useMemo, useRef, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import type { SizingOutputV1 } from '@ksd/engine';
import { SYNOPTIC_OPTIONS } from '@ksd/diagram';
import type { ProjectViewModel } from '../../app/models/projectView';
import { buildProjectDiagram } from '../../app/diagram/projectDiagram';
import { useSettings } from '../../store/settings';
import { useUi } from '../../store/ui';
import { useT } from '../../i18n';
import { fmt } from '../../domain/format';

/**
 * Vue synoptique.
 *
 * Deux gabarits d'une même planche : la version paysage complète, destinée au
 * dossier d'exécution, et le synoptique portrait condensé, destiné au rapport.
 * L'écran montre exactement ce que le document contiendra.
 */
export function SynopticView({
  project,
  sizing,
  pending,
  catalog,
}: {
  readonly project: ProjectViewModel;
  readonly sizing: SizingOutputV1 | null;
  /** Un recalcul est en cours : le dimensionnement précédent reste valable. */
  readonly pending: boolean;
  readonly catalog: readonly Equipment[];
}) {
  const t = useT();
  const settings = useSettings();
  const lang = useUi((state) => state.lang);
  const [format, setFormat] = useState<'sheet' | 'synoptic'>('sheet');

  const built = useMemo(() => {
    if (!sizing) return null;
    return buildProjectDiagram({
      project,
      sizing,
      catalog,
      settings,
      lang,
      options: format === 'synoptic' ? SYNOPTIC_OPTIONS : undefined,
    });
  }, [project, sizing, catalog, settings, lang, format]);

  /**
   * Toute modification du projet relance la lecture du dimensionnement, qui
   * repasse par un état d'attente. Retomber sur l'écran vide à chaque frappe
   * laisserait croire que le schéma a disparu : on garde la dernière planche
   * à l'écran, signalée comme en cours de mise à jour, jusqu'à la suivante.
   */
  const lastGood = useRef<ReturnType<typeof buildProjectDiagram> | null>(null);
  if (built) lastGood.current = built;
  const diagram = built ?? (pending ? lastGood.current : null);
  const stale = built === null && diagram !== null;

  if (!diagram) {
    return (
      <section className="out is-stale">
        <div className="out-head">
          <span className="out-tag">{t('workshop.synoptic').toUpperCase()}</span>
          <h2 className="h-sec">{t('report.singleLine')}</h2>
        </div>
        <div className="stub">
          <b>{t('report.diagramUnavailable')}</b>
        </div>
      </section>
    );
  }

  const { plan, svg } = diagram;
  const download = () => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${project.details.projectNumber || 'schema'}-unifilaire.svg`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="out">
      <div className="out-head">
        <span className="out-tag">{t('workshop.synoptic').toUpperCase()}</span>
        <h2 className="h-sec">{t('report.singleLine')}</h2>
        {stale && <span className="badge warn">{t('synoptic.updating')}</span>}
        <span className="sep" />
        <div className="seg no-print">
          <button aria-selected={format === 'sheet'} onClick={() => setFormat('sheet')}>
            {t('synoptic.sheet')}
          </button>
          <button aria-selected={format === 'synoptic'} onClick={() => setFormat('synoptic')}>
            {t('synoptic.synoptic')}
          </button>
        </div>
        <button className="btn no-print" onClick={download}>
          {t('synoptic.downloadSvg')}
        </button>
      </div>

      <div className={'synoptic-sheet' + (stale ? ' is-stale' : '')} dangerouslySetInnerHTML={{ __html: svg }} />

      <div className="synoptic-facts">
        <span>
          {plan.width} × {plan.height}
        </span>
        <span>{plan.symbols.length} symboles</span>
        <span>{plan.wires.length} conducteurs</span>
        <span>{fmt(plan.smallestTextPt, 1)} pt</span>
      </div>

      {plan.issues.length > 0 && (
        <div className="synoptic-issues">
          {plan.issues.map((issue, index) => (
            <p className={`diag-line ${issue.level}`} key={index}>
              {issue.message}
            </p>
          ))}
        </div>
      )}

      {plan.bom.length > 0 && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t('report.bomReference')}</th>
                <th>{t('report.bomDesignation')}</th>
                <th>{t('report.bomCharacteristic')}</th>
                <th>{t('report.quantity')}</th>
                <th>{t('report.bomLocation')}</th>
              </tr>
            </thead>
            <tbody>
              {plan.bom.map((row) => (
                <tr key={row.reference}>
                  <td>
                    <b>{row.reference}</b>
                  </td>
                  <td>{row.designation}</td>
                  <td>{row.characteristic}</td>
                  <td className="num">{row.quantity}</td>
                  <td>{row.gridRef}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </section>
  );
}
