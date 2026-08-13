import { useState } from 'react';
import { TopBar } from '../shell/TopBar';
import { StatusBar } from '../shell/StatusBar';
import { batteries, inverters, modules } from '../data/reference';
import { fmt } from '../domain/format';
import { useT } from '../i18n';

type Tab = 'modules' | 'batteries' | 'inverters';

export function CatalogRoute() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('modules');
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const match = (...fields: string[]) =>
    !needle || fields.some((f) => f.toLowerCase().includes(needle));

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
            {tab === 'modules' && (
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
                    .filter((m) => match(m.code, m.maker))
                    .slice(0, 60)
                    .map((m) => (
                      <tr key={m.id}>
                        <td>{m.code}</td>
                        <td>{m.maker}</td>
                        <td className="num">{fmt(m.power)}</td>
                        <td className="num">{fmt(m.vmp, 2)}</td>
                        <td className="num">{fmt(m.voc_stc, 2)}</td>
                        <td className="num">{fmt(m.imp_stc, 2)}</td>
                        <td className="num">{fmt(m.area, 2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {tab === 'batteries' && (
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
                    .filter((b) => match(b.code, b.maker, b.technology))
                    .slice(0, 60)
                    .map((b) => (
                      <tr key={b.id}>
                        <td>{b.code}</td>
                        <td>{b.maker}</td>
                        <td>{b.technology}</td>
                        <td className="num">{fmt(b.capacity)}</td>
                        <td className="num">{fmt(b.voltage)}</td>
                        <td className="num">{fmt(b.max_dod)}</td>
                        <td className="num">{fmt(b.round_trip_efficiency)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {tab === 'inverters' && (
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
                    .filter((i) => match(i.code, i.maker, i.inverter_type))
                    .slice(0, 60)
                    .map((i) => (
                      <tr key={i.id}>
                        <td>{i.code}</td>
                        <td>{i.maker}</td>
                        <td>{i.inverter_type}</td>
                        <td className="num">{fmt(i.nominal_power)}</td>
                        <td className="num">{fmt(i.nominal_dc_voltage)}</td>
                        <td className="num">{fmt(i.efficiency)}</td>
                        <td className="num">{fmt(i.pv_array_max_power ?? 0)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="label">
            60 premières lignes affichées — pagination et édition en phase 4.
          </p>
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
