import { useState } from 'react';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { useRuns, useUi } from '../../store/ui';
import { engine } from '../../engine';
import { fmt, signed } from '../../domain/format';
import { StepHead } from '../../ui/Flow';
import { Prov } from '../../ui/Prov';
import { readiness } from '../../domain/readiness';
import type { InverterCandidate } from '../../engine/SizingEngine';
import { EquipmentPicker, type Kind } from './EquipmentPicker';

/**
 * Marge de dimensionnement, colorée par ce qu'elle signifie.
 *
 * Les trois barres étaient vertes quel que soit le chiffre : +3 % de réserve
 * sur les modules et +22 % sur l'onduleur se lisaient pareil, alors que la
 * première est tendue et la seconde est du matériel payé pour rien. La
 * couleur remplace ici la lecture du nombre.
 */
function reserveTone(percent: number): 'short' | 'tight' | 'ok' | 'over' {
  if (percent < 0) return 'short';
  if (percent < 5) return 'tight';
  if (percent > 20) return 'over';
  return 'ok';
}

const RESERVE_HINT: Record<string, string> = {
  short: 'Sous-dimensionné : le besoin dépasse ce qui est installé.',
  tight: 'Marge mince : moins de 5 % avant de manquer.',
  ok: 'Marge saine.',
  over: 'Surdimensionné : plus de 20 % de matériel au-delà du besoin.',
};

function Reserve({ percent, ratio }: { percent: number; ratio: number }) {
  const tone = reserveTone(percent);
  return (
    <>
      <div className={`bar t-${tone}`} title={RESERVE_HINT[tone]}>
        <i style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>
      <div className="fitline">
        <span>Réserve</span>
        <b className={`res res-${tone}`}>
          {signed(percent)}
          <span className="unit">%</span>
        </b>
      </div>
    </>
  );
}

/**
 * Une valeur à couvrir, reprise du prédimensionnement.
 *
 * Ces trois nombres ne sont pas des résultats de cette étape : ce sont les
 * `pcMin`, `stMin` et `pInvMin` de l'étape précédente, rappelés ici parce
 * qu'on ne choisit pas du matériel sans savoir ce qu'il doit atteindre.
 */
function Target({
  label,
  value,
  unit,
  got,
  pending = false,
}: {
  label: string;
  value: string;
  unit: string;
  got?: { text: string; ok: boolean };
  /** Le prédimensionnement n'a pas tourné : il n'y a pas de cible, pas un zéro. */
  pending?: boolean;
}) {
  return (
    <div className="tgt">
      <span className="tgt-lbl">{label}</span>
      {pending ? (
        <span className="tgt-val">
          <b className="mut">—</b>
        </span>
      ) : (
        <span className="tgt-val">
          <b>{value}</b>
          <span className="unit">{unit}</span>
        </span>
      )}
      {!pending && got && (
        <span className={`tgt-got ${got.ok ? 'ok' : 'bad'}`}>{got.text}</span>
      )}
    </div>
  );
}

/**
 * Un choix libre, réduit à sa ligne.
 *
 * Le module et la batterie se choisissent sur catalogue : leurs fiches
 * techniques tenaient chacune un pavé de sept caractéristiques en haut de la
 * page, avant même qu'on ait choisi quoi que ce soit. Elles passent sous
 * l'infobulle — on les consulte, on ne les subit pas.
 */
function PickRow({
  role,
  code,
  maker,
  specs,
  onPick,
  index,
}: {
  role: string;
  code: string | null;
  maker: string | null;
  specs: [string, string][];
  onPick: () => void;
  index: number;
}) {
  return (
    <div className={`pickrow ${code ? '' : 'is-empty'}`}>
      <span className="pickrow-n">{index}</span>
      <span className="pickrow-role">{role}</span>
      {code ? (
        <Prov title={`${role} · ${code}`} rows={specs} source="Base locale">
          <span className="pickrow-ref">
            {code}
            {maker && <span className="mut"> · {maker}</span>}
          </span>
        </Prov>
      ) : (
        <span className="pickrow-ref mut">à choisir</span>
      )}
      <span className="sep" />
      <button className="btn" onClick={onPick}>
        {code ? 'Changer' : 'Choisir…'}
      </button>
    </div>
  );
}

/** Une proposition d'onduleur, avec la configuration complète qu'elle impose. */
function CandidateRow({
  c,
  selected,
  onSelect,
}: {
  c: InverterCandidate;
  selected: boolean;
  onSelect: () => void;
}) {
  const tone = reserveTone(c.reservePercent);
  return (
    <button
      className={`cand ${selected ? 'is-sel' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="cand-ref">
        {c.inverter.code}
        <span className="mut"> · {c.inverter.maker}</span>
      </span>
      <span className="cand-pow">
        <b>{fmt(c.inverter.nominal_power / 1000, 1)}</b>
        <span className="unit">kW</span>
        {c.count > 1 && <span className="mut"> × {c.count}</span>}
      </span>
      {/* La configuration n'est pas une décision séparée : `get_compatible_inverters`
          renvoie le montage du champ et du parc avec chaque candidat. */}
      <span className="cand-cfg">
        {c.pvSeries}S×{c.pvParallel}P PV · {c.bankSeries}S×{c.bankParallel}P bat ·{' '}
        {fmt(c.bankVoltage, 0)} V
      </span>
      <span className={`res res-${tone}`}>
        {signed(c.reservePercent)}
        <span className="unit">%</span>
      </span>
    </button>
  );
}

/**
 * Une ligne du comparatif théorique / retenu.
 *
 * L'écart est signé et coloré selon ce qu'il signifie : pour les puissances
 * et le stockage, au-dessus du plancher est neutre (c'est le principe du
 * matériel discret) ; pour la fiabilité, moins de LPSP/LOLP et plus de SRI
 * est un gain, et on le dit.
 */
function CmpRow({
  label,
  base,
  got,
  unit,
  decimals = 1,
  betterWhen = 'high',
  hint,
}: {
  label: string;
  base: number;
  got: number;
  unit: string;
  decimals?: number;
  /** 'high' : plus c'est haut, mieux c'est (SRI, production). 'low' : LPSP. */
  betterWhen?: 'high' | 'low' | 'none';
  hint?: string;
}) {
  const delta = base !== 0 ? ((got - base) / base) * 100 : 0;
  const tone =
    betterWhen === 'none'
      ? ''
      : betterWhen === 'high'
        ? delta >= 0
          ? 'ok'
          : 'bad'
        : delta <= 0
          ? 'ok'
          : 'bad';
  return (
    <tr>
      <td className="name">
        {label}
        {hint && <span className="mut"> · {hint}</span>}
      </td>
      <td className="num mut">
        {fmt(base, decimals)}
        <span className="unit"> {unit}</span>
      </td>
      <td className="num">
        <b>
          {fmt(got, decimals)}
          <span className="unit"> {unit}</span>
        </b>
      </td>
      <td className={`num ${tone ? `cmp-${tone}` : 'mut'}`}>
        {base !== 0 ? `${signed(delta)} %` : '—'}
      </td>
    </tr>
  );
}

export function SectionMateriel() {
  const project = useProject();
  const update = useProjects((s) => s.update);
  const ask = useUi((s) => s.ask);
  const notify = useUi((s) => s.notify);
  const markRun = useUi((s) => s.markRun);
  const invalidateRun = useUi((s) => s.invalidateRun);
  const runs = useRuns(project.id);

  const r = readiness(project);
  const pre = engine.presize(project);
  const compat = engine.compatibleInverters(project);
  const z = engine.size(project);
  /* La vérification n'existe que si le trio est complet — `verify` renvoie
     null sinon, et le comparatif n'a alors aucune colonne « retenu ». */
  const verify = engine.verify(project);

  const [picker, setPicker] = useState<Kind | null>(null);
  const [busy, setBusy] = useState(false);

  const sized = runs.sizedAt !== null;
  const virgin = !sized && !runs.sizedOnce;
  /* Les minimums viennent de l'étape 4 : sans son passage, il n'y a rien à
     couvrir, et un « 0,00 kWc » se lirait comme une cible atteinte. */
  const noTargets = !r.presizing.ready || !runs.presizedOnce;

  const applyPick = (kind: Kind, id: string) => {
    update((p) => {
      if (kind === 'module') p.selection.moduleId = id;
      if (kind === 'battery') p.selection.batteryId = id;
      if (kind === 'inverter') p.selection.inverterId = id;
      /* `_drop_incompatible_inverter_selections` efface l'onduleur dès que le
         module ou la batterie change : la compatibilité a été établie sur
         l'ancien couple, elle ne vaut plus rien. */
      if (kind !== 'inverter') p.selection.inverterId = null;
    });
    invalidateRun(project.id, 'sizing');
    setPicker(null);
  };

  const pick = (kind: Kind, id: string) => {
    const losesInverter = kind !== 'inverter' && Boolean(project.selection.inverterId);
    if (!losesInverter) {
      applyPick(kind, id);
      return;
    }
    /* On prévient avant de défaire un choix que l'utilisateur a fait lui-même. */
    ask({
      title: 'L’onduleur retenu sera écarté',
      message:
        'Sa compatibilité a été établie avec le module et la batterie actuels. En changer oblige à reprendre le choix parmi les onduleurs compatibles avec le nouveau couple.',
      confirmLabel: 'Changer quand même',
      onConfirm: () => applyPick(kind, id),
    });
  };

  const run = () => {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      markRun(project.id, 'sizing');
      notify({ kind: 'success', title: 'Dimensionnement établi' });
    }, 700);
  };

  const bothPicked = Boolean(z.module && z.battery);
  const selectedId = project.selection.inverterId;

  return (
    <div className="sheet">
      <StepHead
        slug="materiel"
        aside={
          <span className="label">
            {compat.examined} onduleurs · {pre.evaluatedConfigs} combinaisons en amont
          </span>
        }
      />

      {/* --------------------------------------------------- Ce qu'il faut couvrir */}
      <section className="targets">
        <span className="targets-tag">à couvrir</span>
        <Target
          label="Champ PV"
          value={fmt(pre.minPvPeakKwc, 2)}
          unit="kWc"
          pending={noTargets}
          got={
            z.pvArray
              ? {
                  text: `${fmt(z.pvArray.obtainedW / 1000, 2)} kWc montés`,
                  ok: z.pvArray.obtainedW >= z.pvArray.requiredW,
                }
              : undefined
          }
        />
        <Target
          label="Stockage"
          value={fmt(pre.minStorageKwh, 1)}
          unit="kWh"
          pending={noTargets}
          got={
            z.bank
              ? {
                  /* Le parc se monte en Ah, mais le minimum est une énergie :
                     comparer 45 kWh à 1 000 Ah ne veut rien dire tant qu'on
                     n'a pas repassé la tension du parc. */
                  text: `${fmt((z.bank.obtainedAh * project.assumptions.batteryVoltage) / 1000, 1)} kWh montés`,
                  ok: z.bank.obtainedAh >= z.bank.requiredAh,
                }
              : undefined
          }
        />
        <Target
          label="Onduleur"
          value={fmt(pre.minInverterKw, 1)}
          unit="kW"
          pending={noTargets}
          got={
            z.inverters
              ? {
                  text: `${fmt(z.inverters.obtainedW / 1000, 1)} kW montés`,
                  ok: z.inverters.obtainedW >= z.inverters.requiredW,
                }
              : undefined
          }
        />
      </section>

      {noTargets && (
        <div className="alert warn">
          <div>
            <b>Minimums indisponibles — </b>
            {r.presizing.ready
              ? 'lancez le prédimensionnement à l’étape précédente pour savoir ce que le matériel doit couvrir.'
              : `${r.presizing.waiting.toLowerCase()} avant de choisir du matériel.`}
          </div>
        </div>
      )}

      {/* --------------------------------------------------- Les deux choix libres */}
      <section>
        <h2 className="h-sec">Composants au catalogue</h2>
        <div className="picklist">
          <PickRow
            index={1}
            role="Module"
            code={z.module?.code ?? null}
            maker={z.module?.maker ?? null}
            specs={
              z.module
                ? [
                    ['Type', z.module.module_type],
                    ['Puissance', `${fmt(z.module.power)} Wc`],
                    ['Vmp · Voc', `${fmt(z.module.vmp, 1)} · ${fmt(z.module.voc_stc, 1)} V`],
                    ['Imp · Isc', `${fmt(z.module.imp_stc, 2)} · ${fmt(z.module.isc_stc, 2)} A`],
                    ['Surface', `${fmt(z.module.area, 2)} m²`],
                  ]
                : []
            }
            onPick={() => setPicker('module')}
          />
          <PickRow
            index={2}
            role="Batterie"
            code={z.battery?.code ?? null}
            maker={z.battery?.maker ?? null}
            specs={
              z.battery
                ? [
                    ['Technologie', z.battery.technology],
                    ['Capacité', `${fmt(z.battery.capacity)} Ah`],
                    ['Tension', `${fmt(z.battery.voltage)} V`],
                    ['DoD max', `${fmt(z.battery.max_dod)} %`],
                    ['Rendement', `${fmt(z.battery.round_trip_efficiency)} %`],
                  ]
                : []
            }
            onPick={() => setPicker('battery')}
          />
        </div>
      </section>

      {/* --------------------------------------------------- L'onduleur déduit */}
      <section>
        <div className="tbl-title">
          <h2 className="h-sec">
            <span className="pickrow-n">3</span> Onduleur compatible
          </h2>
          <span className="sep" />
          {bothPicked && (
            <span className="label">
              {compat.candidates.length} compatibles sur {compat.examined} ·{' '}
              {fmt(compat.powerMinW / 1000, 1)}–{fmt(compat.powerMaxW / 1000, 1)} kW ·
              Vdc ≥ {fmt(compat.minDcVoltage, 0)} V
            </span>
          )}
        </div>

        {!bothPicked ? (
          /* Le logiciel ne cherche pas d'onduleur avant d'avoir les deux autres :
             « if not module or not battery: continue ». La liste n'est pas vide,
             elle n'existe pas encore. */
          <div className="hint-box">
            Choisissez d’abord un module et une batterie : la tension du parc et la
            puissance à tenir découlent des deux, et c’est ce qui détermine les
            onduleurs recevables.
          </div>
        ) : compat.candidates.length === 0 ? (
          <div className="alert warn">
            <div>
              <b>Aucun onduleur recevable — </b>
              aucune référence de la base ne tient {fmt(compat.minDcVoltage, 0)} V
              continus dans la plage {fmt(compat.powerMinW / 1000, 1)}–
              {fmt(compat.powerMaxW / 1000, 1)} kW. Revoyez la batterie.
            </div>
          </div>
        ) : (
          <div className="candlist">
            {compat.candidates.slice(0, 4).map((c) => (
              <CandidateRow
                key={c.inverter.id}
                c={c}
                selected={c.inverter.id === selectedId}
                onSelect={() => pick('inverter', c.inverter.id)}
              />
            ))}
            {compat.candidates.length > 4 && (
              <button className="btn cand-more" onClick={() => setPicker('inverter')}>
                Voir les {compat.candidates.length - 4} autres au catalogue
              </button>
            )}
          </div>
        )}
      </section>

      {/* --------------------------------------------------- Le calcul */}
      <div className={`runbar ${!sized ? 'is-stale' : ''}`}>
        <button
          /* Le rang « validation », pas « avancement » : ce bouton produit un
             résultat, il ne fait pas passer à l'étape suivante. L'orange reste
             au pied de page, un seul par écran. */
          className="btn btn-ok btn-run"
          onClick={run}
          disabled={busy || !r.sizing.ready}
        >
          {busy
            ? 'Calcul en cours…'
            : virgin
              ? 'Lancer le dimensionnement'
              : sized
                ? 'Dimensionnement à jour'
                : 'Relancer le dimensionnement'}
        </button>
        <span className="runbar-note">
          {busy
            ? 'Vérification des contraintes sur le matériel retenu'
            : !r.sizing.ready
              ? r.sizing.waiting
              : virgin
                ? 'Le matériel est choisi — reste à vérifier qu’il tient ensemble.'
                : sized
                  ? `${z.constraints.filter((c) => c.satisfied).length} contraintes satisfaites sur ${z.constraints.length}`
                  : 'La sélection a changé — les contraintes ci-dessous datent du calcul précédent.'}
        </span>
      </div>

      {/* --------------------------------------------------- Le résultat */}
      {!virgin && (
        <section className={`out ${!sized ? 'is-stale' : ''}`}>
          <div className="out-head">
            <span className="out-tag">{sized ? 'calculé' : 'à recalculer'}</span>
            <h2 className="h-sec">Système retenu</h2>
            <span className="sep" />
            <span className="label">
              {z.constraints.filter((c) => !c.satisfied).length} point
              {z.constraints.filter((c) => !c.satisfied).length > 1 ? 's' : ''} à
              trancher
            </span>
          </div>

          <div className="fitgrid">
            {z.pvArray && (
              <div className="fitcell">
                <span className="out-lbl">
                  Champ PV · {z.pvArray.series}S × {z.pvArray.parallel}P ={' '}
                  {z.pvArray.count} modules
                </span>
                <div className="fitline"><span>Requis</span><b>{fmt(z.pvArray.requiredW)}<span className="unit">W</span></b></div>
                <div className="fitline"><span>Obtenu</span><b>{fmt(z.pvArray.obtainedW)}<span className="unit">W</span></b></div>
                <Reserve
                  percent={z.pvArray.reservePercent}
                  ratio={z.pvArray.requiredW / z.pvArray.obtainedW}
                />
              </div>
            )}
            {z.bank && (
              <div className="fitcell">
                <span className="out-lbl">
                  Parc batteries · {z.bank.series}S × {z.bank.parallel}P ={' '}
                  {z.bank.count} unités
                </span>
                <div className="fitline"><span>Requis</span><b>{fmt(z.bank.requiredAh)}<span className="unit">Ah</span></b></div>
                <div className="fitline"><span>Obtenu</span><b>{fmt(z.bank.obtainedAh)}<span className="unit">Ah</span></b></div>
                <Reserve
                  percent={z.bank.reservePercent}
                  ratio={z.bank.requiredAh / z.bank.obtainedAh}
                />
              </div>
            )}
            {z.inverters && (
              <div className="fitcell">
                <span className="out-lbl">
                  Onduleurs · {z.inverters.count} en parallèle
                </span>
                <div className="fitline"><span>Requis</span><b>{fmt(z.inverters.requiredW)}<span className="unit">W</span></b></div>
                <div className="fitline"><span>Obtenu</span><b>{fmt(z.inverters.obtainedW)}<span className="unit">W</span></b></div>
                <Reserve
                  percent={z.inverters.reservePercent}
                  ratio={z.inverters.requiredW / z.inverters.obtainedW}
                />
              </div>
            )}
          </div>

          {/* Seuls les points en défaut sont écrits. Les contraintes tenues
              n'appellent aucune décision : les lister toutes faisait payer
              quatre lignes pour n'en signaler qu'une. Leur compte suffit. */}
          {z.constraints.some((c) => !c.satisfied) && (
            <div className="checklist">
              {z.constraints
                .filter((c) => !c.satisfied)
                .map((c) => (
                  <div key={c.id} className="check fail">
                    {c.label} — {c.detail}
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {/* --------------------------------------- La simulation du système retenu

          La boucle de vérification : ce que vaut le matériel monté, mesuré
          contre le plancher du prédimensionnement. Physique uniquement — les
          prix n'existent qu'au chiffrage, la comparaison LCOE/SVI vit
          là-bas. */}
      {!virgin && verify && (
        <section className={`out ${!sized ? 'is-stale' : ''}`}>
          <div className="out-head">
            <span className="out-tag">{sized ? 'simulé' : 'à resimuler'}</span>
            <h2 className="h-sec">Simulation du système retenu</h2>
            <span className="sep" />
            <span className={`badge ${verify.reliable ? 'ok' : 'bad'}`}>
              {verify.reliable ? 'Seuils tenus' : 'Seuils dépassés'}
            </span>
          </div>

          <div className="tbl-wrap">
            <table className="tbl t-cmp">
              <thead>
                <tr>
                  <th>Grandeur</th>
                  <th>Prédimensionné</th>
                  <th>Système retenu</th>
                  <th>Écart</th>
                </tr>
              </thead>
              <tbody>
                <CmpRow
                  label="Puissance crête"
                  base={pre.minPvPeakKwc}
                  got={verify.pvPeakKwc}
                  unit="kWc"
                  decimals={2}
                  betterWhen="none"
                />
                <CmpRow
                  label="Stockage"
                  base={pre.minStorageKwh}
                  got={verify.storageKwh}
                  unit="kWh"
                  betterWhen="none"
                />
                <CmpRow
                  label="Onduleur"
                  base={pre.minInverterKw}
                  got={verify.inverterKw}
                  unit="kW"
                  betterWhen="none"
                />
                <CmpRow
                  label="Production annuelle"
                  base={pre.annualProductionKwh}
                  got={verify.annualProductionKwh}
                  unit="kWh/an"
                  decimals={0}
                  betterWhen="high"
                />
                <CmpRow
                  label="LPSP"
                  base={pre.lpsp}
                  got={verify.lpsp}
                  unit="%"
                  betterWhen="low"
                  hint={`seuil ${fmt(project.assumptions.lpspMax, 1)} %`}
                />
                <CmpRow
                  label="LOLP"
                  base={pre.lolp}
                  got={verify.lolp}
                  unit="%"
                  betterWhen="low"
                  hint={`seuil ${fmt(project.assumptions.lolpMax, 1)} %`}
                />
                <CmpRow
                  label="SRI"
                  base={pre.sri}
                  got={verify.sri}
                  unit=""
                  decimals={2}
                  betterWhen="high"
                  hint={`seuil ${fmt(verify.sriThreshold, 4)}`}
                />
              </tbody>
            </table>
          </div>
        </section>
      )}

      {picker && (
        <EquipmentPicker
          kind={picker}
          project={project}
          onPick={(id) => pick(picker, id)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

