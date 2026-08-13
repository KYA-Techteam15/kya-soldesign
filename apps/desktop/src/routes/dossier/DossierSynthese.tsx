import { engine } from '../../engine';
import { fmt } from '../../domain/format';
import { sectionStates } from '../../domain/completion';
import { STEPS } from '../../ui/Flow';
import type { Project } from '../../domain/types';

/**
 * Ce que l'on remet, en une lecture.
 *
 * La liste précédente alignait dix lignes plates : elle répétait le panneau de
 * droite et laissait les deux tiers de l'écran vides. On sépare ici ce qui
 * sera livré (le système), ce qu'il coûte, et l'état du dossier étape par
 * étape — la seule information que ni le panneau ni le rail ne donnent d'un
 * seul coup d'œil.
 */
export function DossierSynthese({ project }: { project: Project }) {
  const v = engine.verdict(project);
  const z = engine.size(project);
  const c = engine.costing(project);
  const life = engine.lifecycle(project);
  const states = sectionStates(project);

  const system: [string, string][] = [
    ['Puissance crête', `${fmt(z.pvArray?.obtainedW ?? 0)} Wc`],
    [
      'Modules',
      `${z.pvArray?.count ?? 0} × ${z.module?.power ?? 0} Wc · ${z.pvArray?.series ?? 0}S × ${z.pvArray?.parallel ?? 0}P`,
    ],
    [
      'Parc de batteries',
      `${z.bank?.count ?? 0} × ${z.battery?.capacity ?? 0} Ah · ${fmt(z.bank?.obtainedAh ?? 0)} Ah`,
    ],
    [
      'Onduleurs',
      `${z.inverters?.count ?? 0} × ${fmt((z.inverter?.nominal_power ?? 0) / 1000, 1)} kW`,
    ],
    ['Production annuelle', `${fmt(v.annualProductionKwh)} kWh/an`],
  ];

  const money: [string, string][] = [
    ['Prix de revient', `${fmt(c.totalCost)} FCFA`],
    ['Vente HT', `${fmt(c.totalSaleHt)} FCFA`],
    [`TVA ${fmt(project.costing.tvaPercent)} %`, `${fmt(c.tvaAmount)} FCFA`],
    ['Total TTC', `${fmt(v.totalTtc)} FCFA`],
    ['LCOE actualisé', `${fmt(v.lcoeActualized)} FCFA/kWh`],
    ['Coût sur le cycle de vie', `${fmt(life.totalLifecycleCost / 1e6, 1)} MFCFA`],
  ];

  return (
    <>
      <div className="form-grid">
        <section>
          <div className="tbl-title">
            <h2 className="h-sec">Système livré</h2>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <tbody>
                {system.map(([k, val]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td className="num">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="tbl-title">
            <h2 className="h-sec">Prix remis</h2>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <tbody>
                {money.map(([k, val]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td className="num">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section>
        <div className="tbl-title">
          <h2 className="h-sec">État du dossier</h2>
          <span className="label">
            ce qui reste à compléter avant de remettre le document
          </span>
        </div>
        <div className="tbl-wrap" style={{ padding: 'var(--sp-2) var(--sp-3)' }}>
          {STEPS.filter((s) => s.slug !== 'dossier').map((s) => {
            const st = states[s.slug];
            if (!st) return null;
            return (
              <div key={s.slug} className="checkline">
                <i className={`st st-${st.level}`} />
                <b>{s.label}</b>
                <span>
                  {st.missing.length === 0 ? 'complet' : st.missing.join(' · ')}
                </span>
                <span className="when">{st.meta}</span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
