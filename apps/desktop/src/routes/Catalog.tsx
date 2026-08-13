import { useMemo, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import { TopBar } from '../shell/TopBar';
import { StatusBar } from '../shell/StatusBar';
import { fmt } from '../domain/format';
import { useT } from '../i18n';
import { useCatalog } from '../app/CatalogProvider';

type Tab = 'modules' | 'batteries' | 'inverters';
type PvModule = Extract<Equipment, { readonly kind: 'pv-module' }>;
type Battery = Extract<Equipment, { readonly kind: 'battery' }>;
type Inverter = Extract<Equipment, { readonly kind: 'inverter' }>;

export function CatalogRoute() {
  const t = useT();
  const { equipment, status, errorCode, retry, summary } = useCatalog();
  const [tab, setTab] = useState<Tab>('modules');
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const match = (...fields: string[]) =>
    !needle || fields.some((f) => f.toLowerCase().includes(needle));
  const modules = useMemo(
    () => equipment.filter((item): item is PvModule => item.kind === 'pv-module'),
    [equipment],
  );
  const batteries = useMemo(
    () => equipment.filter((item): item is Battery => item.kind === 'battery'),
    [equipment],
  );
  const inverters = useMemo(
    () => equipment.filter((item): item is Inverter => item.kind === 'inverter'),
    [equipment],
  );

  return (
    <div className="page">
      <TopBar back="/accueil" />
      <div className="page-body">
        <div className="page-inner">
          <div className="rowline">
            <h1 className="page-title">{t('home.catalog')}</h1>
            <div className="seg">
              <button aria-selected={tab === 'modules'} onClick={() => setTab('modules')}>
                Modules ({modules.length})
              </button>
              <button
                aria-selected={tab === 'batteries'}
                onClick={() => setTab('batteries')}
              >
                Batteries ({batteries.length})
              </button>
              <button
                aria-selected={tab === 'inverters'}
                onClick={() => setTab('inverters')}
              >
                Onduleurs ({inverters.length})
              </button>
            </div>
            <span className="sep" />
            <input
              className="hdr-search"
              style={{ width: 260 }}
              placeholder="Filtrer par code ou fabricant…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="tbl-wrap">
            {status === 'loading' && (
              <div className="empty" role="status"><b>Chargement du catalogue…</b></div>
            )}
            {status === 'error' && (
              <div className="empty" role="alert">
                <b>Le catalogue canonique est indisponible.</b>
                <span>{errorCode}</span>
                <button className="btn" onClick={retry}>Réessayer</button>
              </div>
            )}
            {status === 'ready' && tab === 'modules' && (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Fabricant</th>
                    <th>
                      Puissance<span className="unit">Wc</span>
                    </th>
                    <th>
                      Vmp<span className="unit">V</span>
                    </th>
                    <th>
                      Voc<span className="unit">V</span>
                    </th>
                    <th>
                      Imp<span className="unit">A</span>
                    </th>
                    <th>
                      Surface<span className="unit">m²</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {modules
                    .filter((m) => match(m.model, m.manufacturer))
                    .slice(0, 60)
                    .map((m) => (
                      <tr key={m.id} title={`Source : ${m.provenance.sourceId}`}>
                        <td>{m.model}</td>
                        <td>{m.manufacturer}</td>
                        <td className="num">{fmt(m.nominalPowerW)}</td>
                        <td className="num">{fmt(m.voltageAtMaximumPowerV, 2)}</td>
                        <td className="num">{fmt(m.openCircuitVoltageV, 2)}</td>
                        <td className="num">{fmt(m.currentAtMaximumPowerA, 2)}</td>
                        <td className="num">{m.areaM2 === null ? '—' : fmt(m.areaM2, 2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {status === 'ready' && tab === 'batteries' && (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Fabricant</th>
                    <th>Technologie</th>
                    <th>
                      Capacité<span className="unit">Ah</span>
                    </th>
                    <th>
                      Tension<span className="unit">V</span>
                    </th>
                    <th>
                      DoD<span className="unit">%</span>
                    </th>
                    <th>
                      Rendement<span className="unit">%</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {batteries
                    .filter((b) => match(b.model, b.manufacturer, b.technology ?? ''))
                    .slice(0, 60)
                    .map((b) => (
                      <tr key={b.id} title={`Source : ${b.provenance.sourceId}`}>
                        <td>{b.model}</td>
                        <td>{b.manufacturer}</td>
                        <td>{b.technology ?? '—'}</td>
                        <td className="num">{fmt(b.nominalCapacityAh)}</td>
                        <td className="num">{fmt(b.nominalVoltageV)}</td>
                        <td className="num">{b.usableDepthOfDischargeRatio === null ? '—' : fmt(b.usableDepthOfDischargeRatio * 100)}</td>
                        <td className="num">{b.roundTripEfficiencyRatio === null ? '—' : fmt(b.roundTripEfficiencyRatio * 100)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {status === 'ready' && tab === 'inverters' && (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Fabricant</th>
                    <th>Type</th>
                    <th>
                      Puissance<span className="unit">W</span>
                    </th>
                    <th>
                      Vdc<span className="unit">V</span>
                    </th>
                    <th>
                      Rendement<span className="unit">%</span>
                    </th>
                    <th>
                      PV max<span className="unit">W</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inverters
                    .filter((i) => match(i.model, i.manufacturer, i.inverterType ?? ''))
                    .slice(0, 60)
                    .map((i) => (
                      <tr key={i.id} title={`Source : ${i.provenance.sourceId}`}>
                        <td>{i.model}</td>
                        <td>{i.manufacturer}</td>
                        <td>{i.inverterType ?? '—'}</td>
                        <td className="num">{fmt(i.nominalAcPowerW)}</td>
                        <td className="num">{fmt(i.nominalDcVoltageV)}</td>
                        <td className="num">{i.efficiencyRatio === null ? '—' : fmt(i.efficiencyRatio * 100)}</td>
                        <td className="num">{i.pvArrayMaxPowerW === null ? '—' : fmt(i.pvArrayMaxPowerW)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="label">
            60 premières lignes affichées — données canoniques validées
            {summary && ` · ${summary.warnings} avertissement(s) qualité`}
          </p>
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
