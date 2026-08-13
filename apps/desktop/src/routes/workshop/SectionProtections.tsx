import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { engine } from '../../engine';
import { fmt } from '../../domain/format';
import { Prov } from '../../ui/Prov';
import { StepHead } from '../../ui/Flow';
import type { CableSegment } from '../../domain/types';

const LABEL: Record<CableSegment, string> = {
  pv_inverter: 'PV → Onduleur',
  inverter_battery: 'Onduleur → Batterie',
  inverter_load: 'Onduleur → Charges',
};

export function SectionProtections() {
  const project = useProject();
  const update = useProjects((s) => s.update);
  const cables = engine.cables(project);
  const protections = engine.protections(project);

  const num = (v: string) => {
    const p = Number.parseFloat(v.replace(',', '.'));
    return Number.isFinite(p) ? p : 0;
  };

  return (
    <div className="sheet">
      <StepHead
        slug="protections"
        aside={
          <span className="label">
            Le calibre borne le courant ; la section du câble en découle.
          </span>
        }
      />

      {/* ------------------------------------------------------------ Protections
          En premier, parce que le calibre retenu est ce qui dimensionne le
          câble aval — `ksd_app` passe le calibre en entrée du calcul de
          section (`'current': caliber`). L'ordre inverse laissait croire que
          la protection découle du conducteur. */}
      <section>
        <div className="tbl-title">
          <h2 className="h-sec">Protections</h2>
          <span className="label">calibre normalisé, conseillé mais modifiable</span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl t-prot">
            <thead>
              <tr>
                <th>Segment</th>
                <th>Type</th>
                <th className="derived">Courant requis<span className="unit">A</span></th>
                <th className="pick">Calibre retenu<span className="unit">A</span></th>
                <th className="derived">Tension<span className="unit">V</span></th>
                <th className="derived">Qté</th>
                <th>État</th>
              </tr>
            </thead>
            <tbody>
              {protections.map((p) => (
                <tr key={`${p.segment}-${p.kind}`}>
                  <td>{LABEL[p.segment]}</td>
                  <td>{p.kind}</td>
                  <td className="derived num">
                    <Prov
                      title="Courant à couvrir"
                      formula={
                        p.segment === 'pv_inverter'
                          ? 'I ≥ 1,25 × Isc du module'
                          : 'I ≥ P onduleur / U de service'
                      }
                      rows={[
                        ['Courant requis', `${fmt(p.requiredA, 2)} A`],
                        ['Calibres admissibles', p.options.length ? p.options.join(' · ') : 'aucun au catalogue'],
                      ]}
                      source="Protections · calibres normalisés"
                    >
                      {fmt(p.requiredA, 1)}
                    </Prov>
                  </td>
                  <td className="pick">
                    {p.options.length > 0 ? (
                      <select
                        className="cell-in"
                        aria-label={`Calibre ${LABEL[p.segment]}`}
                        value={p.caliberA}
                        onChange={(e) =>
                          update((d) => {
                            const row = d.protections.find((x) => x.segment === p.segment);
                            if (row) row.caliberA = Number(e.target.value);
                          })
                        }
                      >
                        {p.options.map((o) => (
                          <option key={o} value={o}>
                            {fmt(o)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="num">{fmt(p.caliberA, 2)}</span>
                    )}
                  </td>
                  <td className="derived num">{fmt(p.serviceVoltageV)}</td>
                  <td className="derived num">{p.quantity}</td>
                  <td>
                    {!p.exact ? (
                      <span className="badge bad">hors catalogue</span>
                    ) : p.overridden ? (
                      <span className="badge warn">imposé</span>
                    ) : (
                      <span className="badge ok">conseillé</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="label" style={{ marginTop: 6 }}>
          Si aucun calibre normalisé ne dépasse le courant calculé, la valeur calculée est
          conservée et signalée — jamais arrondie en silence.
        </p>
      </section>

      <section>
        <div className="tbl-title">
          <h2 className="h-sec">Câbles</h2>
          <span className="label">
            dimensionnés pour le calibre retenu ci-dessus — la section normalisée est celle
            qui sera commandée
          </span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl t-cables">
            <thead>
              <tr>
                <th>Segment</th>
                <th>Longueur<span className="unit">m</span></th>
                <th className="pick">Matériau</th>
                <th className="pick">Pose</th>
                <th className="derived">Courant<span className="unit">A</span></th>
                <th className="derived">Chute<span className="unit">%</span></th>
                <th className="derived">Section min.<span className="unit">mm²</span></th>
                <th className="derived">Normalisée<span className="unit">mm²</span></th>
              </tr>
            </thead>
            <tbody>
              {project.cables.map((c, i) => {
                const r = cables[i];
                return (
                  <tr key={c.segment}>
                    <td>{LABEL[c.segment]}</td>
                    <td>
                      <input
                        className="cell-in"
                        aria-label={`Longueur ${LABEL[c.segment]}`}
                        value={c.length}
                        onChange={(e) =>
                          update((p) => { p.cables[i].length = num(e.target.value); })
                        }
                      />
                    </td>
                    <td className="pick">
                      <select
                        className="cell-in"
                        aria-label={`Matériau ${LABEL[c.segment]}`}
                        value={c.material}
                        onChange={(e) =>
                          update((p) => {
                            p.cables[i].material = e.target.value as 'copper' | 'aluminium';
                          })
                        }
                      >
                        <option value="copper">Cuivre</option>
                        <option value="aluminium">Aluminium</option>
                      </select>
                    </td>
                    <td className="pick">
                      <select
                        className="cell-in"
                        aria-label={`Pose ${LABEL[c.segment]}`}
                        value={c.installation}
                        onChange={(e) =>
                          update((p) => {
                            p.cables[i].installation = e.target.value as 'buried' | 'not_buried';
                          })
                        }
                      >
                        <option value="not_buried">Aérien</option>
                        <option value="buried">Enterré</option>
                      </select>
                    </td>
                    <td className="derived num">{fmt(r.currentA, 1)}</td>
                    <td className="derived num">{fmt(r.dropPercent, 1)}</td>
                    <td className="derived num">{fmt(r.minimalSection, 1)}</td>
                    <td className="derived num">
                      <Prov
                        title="Section normalisée"
                        formula="S = 2 ρ L I / (ΔU × U)"
                        rows={[
                          ['Résistivité', c.material === 'copper' ? '0,01724 Ω·mm²/m' : '0,0282 Ω·mm²/m'],
                          ['Longueur', `${fmt(c.length)} m`],
                          ['Courant', `${fmt(r.currentA, 1)} A`],
                          ['Tension de service', `${fmt(r.voltageV, 1)} V`],
                          ['Chute admissible', `${fmt(r.dropPercent, 1)} %`],
                          ['Section calculée', `${fmt(r.minimalSection, 1)} mm²`],
                        ]}
                        source="Câblage · valeurs normalisées CEI"
                      >
                        <b>{fmt(r.normalizedSection, 1)}</b>
                      </Prov>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>


    </div>
  );
}
