import { useState } from 'react';
import { engine } from '../../engine';
import { fmt } from '../../domain/format';
import type { Project } from '../../domain/types';

/** Schéma unifilaire, entièrement dérivé du dimensionnement courant. */
export function DossierSynoptique({ project }: { project: Project }) {
  const [zoom, setZoom] = useState(1);
  const z = engine.size(project);
  const cables = engine.cables(project);
  const prot = engine.protections(project);
  const balance = engine.loadBalance(project);
  const v = engine.verdict(project);

  const cable = (seg: string) => cables.find((c) => c.segment === seg);
  const protection = (seg: string) => prot.find((p) => p.segment === seg);

  return (
    <>
      <div className="rowline">
        <span className="label">
          Généré depuis le dimensionnement — toute modification du matériel le met à jour.
        </span>
        <span className="sep" />
        <button className="btn" onClick={() => setZoom((x) => Math.max(0.6, x - 0.2))}>
          Zoom −
        </button>
        <span className="label" style={{ fontFamily: 'var(--font-mono)' }}>
          {Math.round(zoom * 100)} %
        </span>
        <button className="btn" onClick={() => setZoom((x) => Math.min(2, x + 0.2))}>
          Zoom +
        </button>
        <button className="btn" onClick={() => setZoom(1)}>
          Ajuster
        </button>
      </div>

      <div className="tbl-wrap" style={{ padding: 'var(--sp-4)', overflow: 'auto' }}>
        <svg
          viewBox="0 0 720 200"
          style={{ width: `${zoom * 100}%`, height: 'auto', display: 'block' }}
          role="img"
          aria-label="Schéma unifilaire de l’installation"
        >
          <g
            fontFamily="var(--font-sans)"
            fontSize="10"
            fill="var(--text)"
            stroke="none"
          >
            {/* Champ PV */}
            <rect x="8" y="46" width="130" height="70" fill="var(--surface)" stroke="var(--border-strong)" />
            <text x="20" y="66" fontWeight="600">Champ PV</text>
            <text x="20" y="82" fontFamily="var(--font-mono)">
              {z.pvArray?.count ?? 0} × {fmt(z.module?.power ?? 0)} Wc
            </text>
            <text x="20" y="97" fontFamily="var(--font-mono)" fill="var(--text-muted)">
              {fmt(z.pvArray?.obtainedW ?? 0)} Wc · {z.pvArray?.series}S{z.pvArray?.parallel}P
            </text>
            <text x="20" y="110" fontFamily="var(--font-mono)" fill="var(--text-muted)">
              {fmt(z.stringVoltageVoc, 0)} V Voc
            </text>

            {/* Liaison DC PV */}
            <line x1="138" y1="81" x2="212" y2="81" stroke="var(--text)" />
            <rect x="163" y="73" width="16" height="16" fill="var(--accent)" stroke="var(--text)" />
            <text x="142" y="66" fontSize="9" fill="var(--text-muted)">
              {fmt(cable('pv_inverter')?.normalizedSection ?? 0, 0)} mm² · {fmt(project.cables[0]?.length ?? 0)} m
            </text>
            <text x="142" y="104" fontSize="9" fill="var(--text-muted)">
              {protection('pv_inverter')?.kind}
            </text>
            <text x="142" y="116" fontSize="9" fill="var(--text-muted)">
              {fmt(protection('pv_inverter')?.caliberA ?? 0)} A × {protection('pv_inverter')?.quantity}
            </text>

            {/* Onduleurs */}
            <rect x="212" y="34" width="140" height="94" fill="var(--surface)" stroke="var(--text)" strokeWidth="1.4" />
            <text x="224" y="54" fontWeight="600">Onduleurs hybrides</text>
            <text x="224" y="70" fontFamily="var(--font-mono)">
              {z.inverters?.count ?? 0} × {z.inverter?.code ?? '—'}
            </text>
            <text x="224" y="85" fontFamily="var(--font-mono)" fill="var(--text-muted)">
              {fmt((z.inverters?.obtainedW ?? 0) / 1000, 1)} kW · {fmt(z.inverter?.nominal_dc_voltage ?? 0)} Vdc
            </text>
            <text x="224" y="100" fontFamily="var(--font-mono)" fill="var(--text-muted)">
              MPPT {fmt(z.inverter?.mppt_min_voltage ?? 0)}–{fmt(z.inverter?.mppt_max_voltage ?? 0)} V
            </text>
            <text x="224" y="115" fontFamily="var(--font-mono)" fill="var(--text-muted)">
              η {fmt(z.inverter?.efficiency ?? 0)} %
            </text>

            {/* Batteries */}
            <line x1="282" y1="128" x2="282" y2="162" stroke="var(--text)" />
            <rect x="274" y="134" width="16" height="16" fill="var(--accent)" stroke="var(--text)" />
            <text x="298" y="146" fontSize="9" fill="var(--text-muted)">
              {protection('inverter_battery')?.kind} {fmt(protection('inverter_battery')?.caliberA ?? 0)} A ·{' '}
              {fmt(cable('inverter_battery')?.normalizedSection ?? 0, 0)} mm²
            </text>
            <rect x="168" y="160" width="150" height="32" fill="var(--surface)" stroke="var(--border-strong)" />
            <text x="180" y="174" fontWeight="600" fontSize="9">Parc de batteries</text>
            <text x="180" y="186" fontFamily="var(--font-mono)">
              {z.bank?.count ?? 0} × {fmt(z.battery?.capacity ?? 0)} Ah · {fmt(v.storageKwh, 1)} kWh
            </text>

            {/* Liaison AC */}
            <line x1="352" y1="81" x2="446" y2="81" stroke="var(--text)" />
            <rect x="391" y="73" width="16" height="16" fill="var(--accent)" stroke="var(--text)" />
            <text x="358" y="66" fontSize="9" fill="var(--text-muted)">
              {fmt(z.inverter?.nominal_ac_voltage ?? 0)} V · 50 Hz
            </text>
            <text x="358" y="104" fontSize="9" fill="var(--text-muted)">
              {protection('inverter_load')?.kind}
            </text>
            <text x="358" y="116" fontSize="9" fill="var(--text-muted)">
              {fmt(protection('inverter_load')?.caliberA ?? 0)} A ·{' '}
              {fmt(cable('inverter_load')?.normalizedSection ?? 0, 0)} mm²
            </text>

            {/* Charges */}
            <rect x="446" y="34" width="140" height="94" fill="var(--surface)" stroke="var(--border-strong)" />
            <text x="458" y="54" fontWeight="600">Charges</text>
            <text x="458" y="70" fontFamily="var(--font-mono)">
              {balance.classic.length + balance.inductive.length} postes
            </text>
            <text x="458" y="85" fontFamily="var(--font-mono)" fill="var(--text-muted)">
              {fmt(balance.realPowerW)} W · {fmt(balance.dailyEnergyWh / 1000, 2)} kWh/j
            </text>
            <text x="458" y="100" fontFamily="var(--font-mono)" fill="var(--text-muted)">
              pointe {fmt(balance.peakPowerW)} W
            </text>
            <text x="458" y="115" fontFamily="var(--font-mono)" fill="var(--text-muted)">
              γ {fmt(balance.qualityFactor, 2)}
            </text>

            {/* Encart fiabilité — l'état tient au SRI, seul indicateur qui dise
                quelque chose du système. Le SVI se lit juste en dessous comme
                une comparaison de prix. */}
            <rect
              x="600" y="46" width="112" height="70"
              fill={v.reliable ? 'var(--ok-soft)' : 'var(--danger-soft)'}
              stroke={v.reliable ? 'var(--ok)' : 'var(--danger)'}
            />
            <text x="612" y="64" fontSize="9" letterSpacing="0.6"
              fill={v.reliable ? 'var(--ok-strong)' : 'var(--danger)'}>
              {v.reliable ? 'SEUILS TENUS' : 'SEUILS NON TENUS'}
            </text>
            <text x="612" y="84" fontFamily="var(--font-mono)" fontSize="13" fontWeight="600">
              SVI {fmt(v.svi, 2)}
            </text>
            <text x="612" y="100" fontSize="9" fill="var(--text-muted)">
              SRI {fmt(v.sri, 2)} · LPSP {fmt(v.lpsp, 1)} %
            </text>
          </g>
        </svg>
      </div>

      <div className="kpis">
        <div className="kpi kpi-head">
          <span className="h-sec">Segments</span>
        </div>
        {cables.map((c) => {
          const p = prot.find((x) => x.segment === c.segment);
          return (
            <div className="kpi" key={c.segment}>
              <span>
                {c.segment === 'pv_inverter'
                  ? 'PV → Onduleur'
                  : c.segment === 'inverter_battery'
                    ? 'Onduleur → Batterie'
                    : 'Onduleur → Charges'}
              </span>
              <span>
                <b>{fmt(c.normalizedSection, 1)}</b>
                <span className="unit">mm²</span> · <b>{fmt(p?.caliberA ?? 0)}</b>
                <span className="unit">A</span> · <b>{fmt(c.currentA, 1)}</b>
                <span className="unit">A calculés</span>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
