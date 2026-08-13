import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { engine } from '../engine';
import { useRuns, useUi } from '../store/ui';
import { fmt } from '../domain/format';
import { useT } from '../i18n';
import { DayBalance } from './DayBalance';
import { readiness, type Gate } from '../domain/readiness';
import type { Project } from '../domain/types';

/**
 * Un bloc qui n'a rien à montrer.
 *
 * Le moteur répond toujours — il applique ses formules à des zéros — et le
 * panneau affichait donc « NON VIABLE 1,05 » sur un dossier qu'on venait
 * d'ouvrir. Le logiciel Python ne fait jamais cela : page 2 les StatCards
 * partent à `N/A`, page 3 le panneau dit « Click 'Run Sizing' to see results ».
 * Ici, on dit ce qui manque et on y emmène.
 */
function Waiting({ title, gate }: { title: string; gate: Gate }) {
  const { id } = useParams();
  const nav = useNavigate();
  return (
    <div className="kpis kpi-wait">
      <div className="kpi kpi-head">
        <span className="h-sec">{title}</span>
      </div>
      <button className="kpi-wait-cta" onClick={() => nav(`/atelier/${gate.slug}/${id ?? ''}`)}>
        {gate.waiting} →
      </button>
    </div>
  );
}

/**
 * Le verdict est dans la coque, pas dans les sections : il suit l'utilisateur
 * partout dans l'atelier (critère A1).
 */
export function VerdictPanel({ project }: { project: Project }) {
  const t = useT();
  const toggleVerdict = useUi((s) => s.toggleVerdict);
  const setComputeMs = useUi((s) => s.setComputeMs);
  const { pathname } = useLocation();
  const { id } = useParams();
  const nav = useNavigate();

  /* Le graphe s'ouvre de lui-même sur l'étape des besoins, où il commente
     directement la saisie en cours, et se replie en bande ailleurs : sur les
     autres étapes il reste consultable d'un clic sans repousser le verdict
     sous la ligne de flottaison. */
  const onLoads = pathname.endsWith('/besoins');

  // Durée réelle du passage du moteur — c'est ce qu'affiche la barre d'état
  const started = performance.now();
  const v = engine.verdict(project);
  const elapsed = performance.now() - started;
  useEffect(() => {
    setComputeMs(elapsed);
  }, [elapsed, setComputeMs]);

  const r = readiness(project);
  const runs = useRuns(project.id);
  /* Le SVI vient du prédimensionnement : tant qu'il n'a pas tourné, il n'y a
     pas de verdict à rendre, seulement un dossier en cours de constitution. */
  const hasVerdict = r.presizing.ready && runs.presizedOnce;
  const hasSizing = r.sizing.ready && runs.sizedOnce;

  /* Une fois le matériel dimensionné, le panneau cesse de rappeler les
     minimums : il montre ce qui est réellement monté. C'est la différence
     entre « il faut au moins 8,39 kWc » et « 8,64 kWc sont installés ». */
  const verify = hasSizing ? engine.verify(project) : null;
  const system = verify
    ? {
        pv: verify.pvPeakKwc,
        storage: verify.storageKwh,
        inverter: verify.inverterKw,
        production: verify.annualProductionKwh,
      }
    : {
        pv: v.pvPeakKwc,
        storage: v.storageKwh,
        inverter: v.inverterKw,
        production: v.annualProductionKwh,
      };

  // Échelle 0 → 1,6 avec le seuil à 1 : la position par rapport à 1 est l'information
  const scale = 1.6;
  const fill = Math.min(100, (v.svi / scale) * 100);
  const thresholdAt = (1 / scale) * 100;

  return (
    <aside className="pane pane-right">
      {!hasVerdict ? (
        /* Pas de jauge, pas de grand chiffre : le seul geste utile est
           d'aller produire ce qui manque. */
        <div className="verdict is-wait">
          <div className="verdict-head">
            <h2 className="h-sec">{t('v.viability')}</h2>
            <span className="sep" style={{ flex: 1 }} />
            {!onLoads && (
              <button
                className="toggle"
                onClick={toggleVerdict}
                title="Replier le panneau"
              >
                ›
              </button>
            )}
          </div>
          <p className="verdict-say">
            {r.presizing.ready
              ? 'Lancez le prédimensionnement pour obtenir le coût du kWh et le verdict.'
              : `${r.presizing.waiting} — le verdict en dépend.`}
          </p>
        </div>
      ) : (
      <div className={`verdict ${v.viable ? 'is-ok' : 'is-bad'}`}>
        <div className="verdict-head">
          <div>
            <h2 className="h-sec">{t('v.viability')}</h2>
            <div className="verdict-val">{fmt(v.svi, 2)}</div>
          </div>
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className={`badge ${v.viable ? 'ok' : 'bad'}`}>
              {v.viable ? t('v.viable') : t('v.notViable')}
            </span>
            {/* Sur l'étape des besoins, le profil doit rester sous les yeux :
                le panneau y est acquis, on ne le replie pas. */}
            {!onLoads && (
              <button
                className="toggle"
                onClick={toggleVerdict}
                title="Replier le panneau — une encoche le rouvre au bord droit"
              >
                ›
              </button>
            )}
          </span>
        </div>
        <p className="verdict-say">
          {v.viable
            ? `Viable de justesse : ${fmt((1 - v.svi) * 100, 0)} % sous le seuil.`
            : `Le coût du kWh dépasse le tarif de référence de ${fmt((v.svi - 1) * 100, 0)} %.`}
        </p>
        <div className="gauge">
          <span className="fill" style={{ width: `${fill}%` }} />
          <span className="thr" style={{ left: `${thresholdAt}%` }} />
        </div>
        <div className="gauge-scale">
          <span className="lo">0</span>
          <span className="at" style={{ left: `${thresholdAt}%` }}>
            {t('v.threshold')} 1,00
          </span>
          <span className="hi">1,60</span>
        </div>
      </div>
      )}

      {/* Après le verdict : le SVI est le jugement de l'étude, il ne se lit
          pas au prix d'un défilement. Le graphe explique d'où il vient. */}
      {/* Sur l'étape des besoins, le graphe commente la saisie en cours : il
          y est acquis, sans bouton pour le faire disparaître. */}
      <DayBalance project={project} defaultOpen={onLoads} pinned={onLoads} />

      {hasSizing && v.blockingIssues.length > 0 && (
        // Ces points relèvent de l'arbitrage, pas de l'erreur : le rouge est
        // réservé à ce qui empêche vraiment de continuer.
        <div className="alert warn">
          <div>
            <b>
              {v.blockingIssues.length}{' '}
              {v.blockingIssues.length > 1 ? t('v.toDecidePlural') : t('v.toDecide')}
            </b>
            {v.blockingIssues[0].label} — {v.blockingIssues[0].detail}.
          </div>
        </div>
      )}

      {!hasVerdict ? (
        <Waiting title={t('v.reliability')} gate={r.presizing} />
      ) : (
      /* Une seule liste pour les trois familles, donc un seul ascenseur.

         Deux cadres séparés donnaient deux courses indépendantes : on faisait
         défiler la fiabilité sans que l'économie bouge, et une ligne finissait
         coupée en haut de chaque cadre. Les en-têtes de famille restent
         collants pendant la course — on sait toujours de quoi relève le nombre
         qu'on lit. */
      <div className="kpis kpis-all">
        <div className="kpi kpi-head">
          <span className="h-sec">{t('v.reliability')}</span>
          {/* D'où viennent LPSP, LOLP et SRI : du balayage théorique, ou de la
              simulation du matériel réellement retenu. */}
          <span className="prov-tag">
            {verify ? t('v.simulated') : t('v.theoretical')}
          </span>
        </div>
        <div className="kpi">
          <span>SRI</span>
          <span>
            <b>{fmt(v.sri, 2)}</b>
            <span className="delta">
              {t('v.threshold')} {fmt(v.sriThreshold, 4)}
            </span>
          </span>
        </div>
        <div className="kpi">
          <span>LPSP · LOLP</span>
          <span>
            <b>{fmt(v.lpsp, 1)}</b>
            <span className="unit">%</span> <b>{fmt(v.lolp, 1)}</b>
            <span className="unit">%</span>
          </span>
        </div>

        <div className="kpi kpi-head">
          <span className="h-sec">
            {verify ? t('v.systemChosen') : t('v.systemMinimum')}
          </span>
        </div>
        <div className="kpi">
          <span>{t('v.peakPower')}</span>
          <span>
            <b>{fmt(system.pv, 2)}</b>
            <span className="unit">kWc</span>
          </span>
        </div>
        <div className="kpi">
          <span>{t('v.storage')}</span>
          <span>
            <b>{fmt(system.storage, 1)}</b>
            <span className="unit">kWh</span>
          </span>
        </div>
        <div className="kpi">
          <span>{t('v.inverter')}</span>
          <span>
            <b>{fmt(system.inverter, 1)}</b>
            <span className="unit">kW</span>
          </span>
        </div>
        <div className="kpi">
          <span>{t('v.production')}</span>
          <span>
            <b>{fmt(system.production)}</b>
            <span className="unit">kWh/an</span>
          </span>
        </div>

        {/* L'économie n'a de sens qu'avec des prix saisis : un prix du Wc
            calculé sur des valeurs par défaut est un devis que personne n'a
            établi. */}
        <div className="kpi kpi-head">
          <span className="h-sec">{t('v.economy')}</span>
          <span className="prov-tag">
            {verify ? t('v.simulated') : t('v.theoretical')}
          </span>
        </div>
        {!r.costing.ready ? (
          <button
            className="kpi-wait-cta"
            onClick={() => nav(`/atelier/${r.costing.slug}/${id ?? ''}`)}
          >
            {r.costing.waiting} →
          </button>
        ) : (
          <>
        <div className="kpi">
          <span>{t('v.lcoe')}</span>
          <span>
            <b>{fmt(v.lcoeActualized)}</b>
            <span className="unit">FCFA/kWh</span>
          </span>
        </div>
        {/* Le prix du Wc est un repère de chiffrage, pas un élément du
            verdict : il vit sur sa page, avec les prix qui le produisent. */}
        <div className="kpi">
          <span>{t('v.totalTtc')}</span>
          <span>
            <b>{fmt(v.totalTtc)}</b>
            <span className="unit">FCFA</span>
          </span>
        </div>
          </>
        )}
      </div>
      )}
    </aside>
  );
}
