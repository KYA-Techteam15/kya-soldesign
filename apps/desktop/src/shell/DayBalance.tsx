/**
 * Profil de charge et irradiance — le graphe permanent du tableau de bord.
 *
 * Transposition de `MainGraphWidget` (« Load Profile & Irradiance ») :
 *
 *   - barres de charge sur l'axe gauche, en kW ;
 *   - deux niveaux superposés, comme `peak_power_bars` (orange, Z 10) et
 *     `real_power_bars` (teal, Z 11) : la partie orange qui dépasse est la
 *     réserve de démarrage des inductifs, ce que l'onduleur doit encaisser
 *     au-delà de ce que le site consomme ;
 *   - courbe d'irradiance orange pointillée sur l'axe droit, en W/m², comme
 *     `irradiance_curve` sur son second ViewBox.
 *
 * Les trois axes portent leur unité et leurs graduations : sans elles on lit
 * une forme, pas des valeurs, ce qui n'a pas de sens dans un outil de
 * dimensionnement.
 *
 * Les deux axes sont indépendants — c'est le parti du widget d'origine. Un
 * croisement visuel n'est donc pas une égalité physique ; ce que la
 * superposition montre, c'est la concordance des heures : la pointe de
 * consommation tombe-t-elle quand le soleil est là, ou après ?
 */

import { useEffect, useMemo, useState } from 'react';
import type { Project } from '../domain/types';
import { engine } from '../engine';
import { fmt } from '../domain/format';
import { annualMeanIrradiance } from '../domain/tmy';
import { Prov } from '../ui/Prov';

// Repère de tracé. Les marges laissent la place aux graduations chiffrées.
const W = 320;
const H = 132;
const PAD_L = 34;
const PAD_R = 38;
const PAD_T = 10;
const PAD_B = 20;

/** Graduation lisible : 1, 2 ou 5 fois une puissance de dix. */
function niceScale(max: number, ticks = 3): { top: number; steps: number[] } {
  if (!(max > 0)) return { top: 1, steps: [0, 1] };
  const rough = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step;
  const steps: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) steps.push(v);
  return { top, steps };
}

/** Décimales nécessaires pour que deux graduations voisines diffèrent.
    Sans cela, un parc de 0,11 kW affichait « 0,0 » sur les trois paliers. */
function tickDecimals(step: number): number {
  if (step >= 1) return 0;
  return Math.min(3, Math.ceil(-Math.log10(step)));
}

export function DayBalance({
  project,
  defaultOpen = false,
  pinned = false,
}: {
  project: Project;
  defaultOpen?: boolean;
  /** Le graphe commente la saisie en cours : on ne peut pas le replier. */
  pinned?: boolean;
}) {
  const balance = engine.loadBalance(project);
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  // Changer d'étape rétablit l'état voulu par la section, sans figer un
  // choix fait ailleurs.
  useEffect(() => setCollapsed(!defaultOpen), [defaultOpen]);
  const open = pinned || !collapsed;

  const model = useMemo(() => {
    const s = project.site;
    const load = balance.hourlyKw;
    const peak = balance.hourlyPeakKw;
    const hasWeather = s.monthlyIrradiation.some((v) => v > 0);
    const hasLoad = load.some((v) => v > 0);

    // Irradiance en plan des modules, W/m², moyenne sur l'année entière.
    const irr = hasWeather
      ? annualMeanIrradiance(s.latitude, s.tilt, s.azimuth, s.monthlyIrradiation)
      : new Array(24).fill(0);

    return {
      load,
      peak,
      irr,
      hasWeather,
      hasLoad,
      kw: niceScale(Math.max(...peak, ...load, 0)),
      wm2: niceScale(Math.max(...irr, 0)),
    };
  }, [project, balance]);

  if (!model.hasLoad && !model.hasWeather) {
    return (
      <div className="dayb is-empty">
        <div className="dayb-head">
          <span className="h-sec">Profil de charge &amp; irradiance</span>
        </div>
        <p className="dayb-none">
          Ajoutez des appareils à l’étape Besoins et chargez une série météo à l’étape Site.
        </p>
      </div>
    );
  }

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const base = H - PAD_B;
  const slot = plotW / 24;
  const barW = slot * 0.62;

  const xBar = (h: number) => PAD_L + h * slot + (slot - barW) / 2;
  const xLine = (h: number) => PAD_L + h * slot + slot / 2;
  const yKw = (v: number) => base - (v / model.kw.top) * plotH;
  const yIrr = (v: number) => base - (v / model.wm2.top) * plotH;

  const irrPath = model.irr.map((v, h) => `${xLine(h)},${yIrr(v)}`).join(' ');
  const peakHour = balance.peakHourIndex;

  return (
    <div className={`dayb ${open ? '' : 'is-shut'}`}>
      <div className="dayb-head">
        <span className="h-sec">Charge &amp; irradiance</span>
        <span className="sep" />
        {!pinned && (
          <button
            className="toggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={open}
            title={open ? 'Replier le graphe' : 'Afficher le graphe'}
          >
            {open ? '▾' : '▸'}
          </button>
        )}
      </div>

      {open && (
        <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="dayb-plot"
        role="img"
        aria-label={`Profil de charge horaire jusqu'à ${fmt(model.kw.top, 1)} kW et irradiance jusqu'à ${fmt(model.wm2.top, 0)} W/m²`}
      >
        {/* Grille horizontale calée sur les graduations de l'axe des kW */}
        {model.kw.steps.map((v) => (
          <line
            key={`g${v}`}
            x1={PAD_L}
            y1={yKw(v)}
            x2={W - PAD_R}
            y2={yKw(v)}
            className="dayb-grid"
          />
        ))}

        {/* Axe gauche — puissance */}
        {model.kw.steps.map((v) => (
          <text key={`kw${v}`} x={PAD_L - 4} y={yKw(v) + 3} className="dayb-tick t-left">
            {fmt(v, tickDecimals(model.kw.steps[1] ?? model.kw.top))}
          </text>
        ))}

        {/* Axe droit — irradiance, seulement s'il y a une série météo */}
        {model.hasWeather &&
          model.wm2.steps.map((v) => (
            <text key={`ir${v}`} x={W - PAD_R + 4} y={yIrr(v) + 3} className="dayb-tick t-right">
              {fmt(v, 0)}
            </text>
          ))}

        {/* Barres : la pointe de démarrage d'abord, la consommation par-dessus.
            L'orange visible est donc l'écart entre les deux, pas un total. */}
        {model.peak.map((v, h) => {
          const y = yKw(v);
          return (
            <rect
              key={`p${h}`}
              x={xBar(h)}
              y={y}
              width={barW}
              height={Math.max(base - y, 0)}
              className="dayb-bar-peak"
            />
          );
        })}
        {model.load.map((v, h) => {
          const y = yKw(v);
          return (
            <rect
              key={`l${h}`}
              x={xBar(h)}
              y={y}
              width={barW}
              height={Math.max(base - y, 0)}
              className={`dayb-bar-load ${h === peakHour ? 'is-peak' : ''}`}
            />
          );
        })}

        {model.hasWeather && <polyline className="dayb-irr" points={irrPath} />}

        <line x1={PAD_L} y1={base} x2={W - PAD_R} y2={base} className="dayb-axis" />
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={base} className="dayb-axis" />
        {model.hasWeather && (
          <line x1={W - PAD_R} y1={PAD_T} x2={W - PAD_R} y2={base} className="dayb-axis is-irr" />
        )}

        {/* Heures : quatre repères suffisent, vingt-quatre seraient illisibles */}
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={`h${h}`} x={xLine(h)} y={H - 6} className="dayb-tick t-hour">
            {h}
          </text>
        ))}
      </svg>

      <div className="dayb-units">
        <span className="u-left">kW</span>
        {/* La légende occupe la ligne des unités : l'axe des heures se lit
            de lui-même avec ses chiffres, il n'a pas besoin d'être nommé. */}
        <span className="dayb-key">
          <i className="k-load" /> charge
        </span>
        <span className="dayb-key">
          <i className="k-peak" /> démarrage
        </span>
        {model.hasWeather && (
          <span className="dayb-key">
            <i className="k-irr" /> irradiance
          </span>
        )}
        {model.hasWeather && <span className="u-right">W/m²</span>}
      </div>
        </>
      )}

      {/* Les quatre valeurs clés du tableau de bord d'origine : Total Energy,
          Total Power, Peak Power, Quality Factor. */}
      <div className="dayb-stats">
        <span>
          <b>{fmt(balance.dailyEnergyWh / 1000, 2)}</b>
          <i>kWh/j</i>
        </span>
        <span>
          <b>{fmt(balance.realPowerW / 1000, 2)}</b>
          <i>kW total</i>
        </span>
        <span>
          <b>{fmt(balance.peakPowerW / 1000, 2)}</b>
          <i>kW pointe</i>
        </span>
        <span>
          <Prov
            title="Facteur de qualité de la demande"
            formula="γ = puissance moyenne / puissance de pointe horaire"
            rows={[
              ['Puissance moyenne', `${fmt(balance.meanPowerKw, 2)} kW`],
              ['Pointe horaire', `${fmt(balance.peakHourKw, 2)} kW à ${balance.peakHourIndex} h`],
              ['Énergie journalière', `${fmt(balance.dailyEnergyWh / 1000, 2)} kWh`],
            ]}
            source="Plus γ est proche de 1, plus la demande est plate — donc moins il faut de stockage."
          >
            <b>{fmt(balance.qualityFactor, 2)}</b>
            <i>γ</i>
          </Prov>
        </span>
      </div>
    </div>
  );
}
