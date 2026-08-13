import { useState } from 'react';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { useRuns, useUi } from '../../store/ui';
import { engine } from '../../engine';
import { fmt } from '../../domain/format';
import { NumField } from '../../ui/Field';
import { StepHead } from '../../ui/Flow';
import { Dialog } from '../../ui/Dialog';

/* Les trois volets du dialogue reprennent les trois onglets de la page 2 du
   logiciel — Technical / Costs & Investment / Lifetime & Maintenance — avec la
   référence économique rangée près des coûts, comme le fait `_create_costs_page`
   sous le titre « Economic Reference (Grid) ». */
const FAMILIES = [
  { key: 'tech', label: 'Technique', hint: 'rendements, seuils, tension du parc' },
  { key: 'costs', label: 'Coûts & référence', hint: 'coûts spécifiques, marges, tarif réseau' },
  { key: 'life', label: 'Durées de vie', hint: 'remplacements, entretien, actualisation' },
] as const;
type Family = (typeof FAMILIES)[number]['key'];

/**
 * Une valeur produite par le moteur.
 *
 * Volontairement différente d'un `ReadField` : celui-ci imite une saisie pour
 * les données reprises d'ailleurs (le pays déduit du code localité), alors
 * qu'ici on annonce un calcul. D'où le chiffre large et le libellé au-dessus
 * en petites capitales — l'inverse de la hiérarchie d'un formulaire.
 *
 * `lead` marque les valeurs qui commandent la suite de l'étude ; `tone` colore
 * celles qui se lisent contre un seuil.
 */
function Out({
  label,
  value,
  unit,
  note,
  lead = false,
  tone,
  pending = false,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  lead?: boolean;
  tone?: 'ok' | 'bad';
  /** Le calcul n'a pas encore tourné : on n'invente pas de chiffre. */
  pending?: boolean;
}) {
  if (pending) {
    return (
      <div className={`out-cell ${lead ? 'is-lead' : ''} is-pending`}>
        <span className="out-lbl">{label}</span>
        <span className="out-val">
          <b>—</b>
        </span>
      </div>
    );
  }
  return (
    <div className={`out-cell ${lead ? 'is-lead' : ''} ${tone ? `t-${tone}` : ''}`}>
      <span className="out-lbl">{label}</span>
      <span className="out-val">
        <b>{value}</b>
        {unit && <span className="unit">{unit}</span>}
      </span>
      {note && <span className="out-note">{note}</span>}
    </div>
  );
}

export function SectionHypotheses() {
  const project = useProject();
  const update = useProjects((s) => s.update);
  const a = project.assumptions;
  const pre = engine.presize(project);
  const [family, setFamily] = useState<Family>('tech');
  const [open, setOpen] = useState(false);
  /* La simulation coûte cher : `presizingResults` balaie 121 combinaisons et
     lance une simulation horaire de 8760 pas pour chacune. Le logiciel ne
     recalcule donc jamais à la frappe — il a un bouton RUN CALCULATION et une
     barre de progression. On garde ce contrat, et on rend visible l'écart
     entre ce qui est affiché et ce qui est saisi, comme
     `results_match_current_inputs` le fait côté Python.

     L'état est maintenant dans la coque : le dimensionnement s'appuie sur ces
     minimums, et le panneau de droite doit savoir s'il affiche un résultat ou
     un souvenir. Le garder ici en `useState` revenait à l'oublier dès qu'on
     changeait d'étape. */
  const runs = useRuns(project.id);
  const markRun = useUi((s) => s.markRun);
  const invalidateRun = useUi((s) => s.invalidateRun);
  const [busy, setBusy] = useState(false);
  const ran = runs.presizedAt !== null;
  /* Trois états, pas deux. « Jamais lancé » n'est pas « périmé » : le premier
     n'a rien à montrer — page 2 du logiciel, les StatCards partent à `N/A` —
     le second garde à l'écran le calcul précédent, comme `_mark_results_stale`.
     On distingue les deux par la présence d'un passage antérieur. */
  const stale = !ran;
  const virgin = stale && !runs.presizedOnce;

  const set = (k: keyof typeof a) => (v: number) => {
    invalidateRun(project.id, 'presizing');
    update((p) => {
      (p.assumptions[k] as number) = v;
    });
  };

  const run = () => {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      markRun(project.id, 'presizing');
    }, 900);
  };

  return (
    <div className="sheet">
      <StepHead
        slug="hypotheses"
        aside={
          <button className="btn" onClick={() => setOpen(true)}>
            Hypothèses de calcul…
          </button>
        }
      />

      {/* Les quatre valeurs qu'on ajuste pour ce site précis. Le reste ne
          change pas d'un dossier à l'autre et vit dans le dialogue. */}
      <section>
        <h2 className="h-sec">Critères de l’étude</h2>
        <div className="form-rows">
          <NumField label="LPSP maximale" unit="%" value={a.lpspMax} onChange={set('lpspMax')} decimals={1} />
          <NumField label="LOLP maximale" unit="%" value={a.lolpMax} onChange={set('lolpMax')} decimals={1} />
          <NumField label="Tarif réseau de référence" unit="FCFA/kWh" value={a.lcoeGrid} onChange={set('lcoeGrid')} />
        </div>
      </section>

      {/* Le geste qui produit tout ce qui suit. Il est seul sur sa ligne,
          entre les entrées et les résultats, dans le sens de lecture : on
          saisit, on lance, on lit. */}
      <div className={`runbar ${stale ? 'is-stale' : ''}`}>
        {/* `btn-ok` et non `btn-primary` : l'orange de l'avancement est déjà
            pris par le pied de page, et un calcul ne fait pas avancer le
            dossier — il le renseigne. */}
        <button className="btn btn-ok btn-run" onClick={run} disabled={busy}>
          {busy
            ? 'Calcul en cours…'
            : virgin
              ? 'Lancer le prédimensionnement'
              : stale
                ? 'Relancer le prédimensionnement'
                : 'Prédimensionnement à jour'}
        </button>
        <span className="runbar-note">
          {busy
            ? '121 combinaisons · simulation horaire sur 8 760 h'
            : virgin
              ? 'Aucun calcul lancé pour ce dossier — les résultats sont vides.'
              : stale
                ? 'Les critères ont changé — les valeurs ci-dessous datent du calcul précédent.'
                : `Résultats à jour · ${pre.evaluatedConfigs} combinaisons évaluées`}
        </span>
      </div>

      {/* Ce que le prédimensionnement produit : des minimums que l'étape
          suivante devra couvrir avec du matériel réel — `pcMin`, `stMin`,
          `pInvMin` côté moteur.

          Les résultats vivaient dans le même gabarit que les saisies : même
          taille, même alignement, même colonne. Rien ne disait où finissait
          ce qu'on écrit et où commençait ce que la machine répond. Ils
          passent donc sur fond propre, en chiffres larges, précédés d'un
          repère « calculé ». */}
      <section className={`out ${stale ? 'is-stale' : ''}`}>
        <div className="out-head">
          <span className="out-tag">
            {virgin ? 'en attente' : stale ? 'à recalculer' : 'calculé'}
          </span>
          <h2 className="h-sec">Système minimal à installer</h2>
          <span className="sep" />
          {!virgin && (
            <span className="label">
              α_f {fmt(pre.alphaFavorable, 2)} · α_nf {fmt(pre.alphaUnfavorable, 2)}
            </span>
          )}
        </div>
        <div className="out-grid">
          <Out label="Puissance crête du champ PV" value={fmt(pre.minPvPeakKwc, 2)} unit="kWc" lead pending={virgin} />
          <Out label="Puissance onduleur minimale" value={fmt(pre.minInverterKw, 1)} unit="kW" lead pending={virgin} />
          <Out label="Énergie stockée minimale" value={fmt(pre.minStorageKwh, 1)} unit="kWh" lead pending={virgin} />
          <Out
            label="Production annuelle"
            value={fmt(pre.annualProductionKwh)}
            unit="kWh/an"
            pending={virgin}
          />
        </div>
      </section>

      <section className={`out ${stale ? 'is-stale' : ''}`}>
        <div className="out-head">
          <span className="out-tag">
            {virgin ? 'en attente' : stale ? 'à recalculer' : 'calculé'}
          </span>
          <h2 className="h-sec">Fiabilité & économie</h2>
          <span className="sep" />
          {!virgin && (
            <span className={`badge ${pre.reliable ? 'ok' : 'bad'}`}>
              {pre.reliable ? 'seuils tenus' : 'seuils non tenus'}
            </span>
          )}
        </div>
        <div className="out-grid">
          <Out label="LPSP" value={fmt(pre.lpsp, 1)} unit="%" note={`seuil ${fmt(a.lpspMax, 1)} %`}
            tone={pre.lpsp <= a.lpspMax ? 'ok' : 'bad'} pending={virgin} />
          <Out label="LOLP" value={fmt(pre.lolp, 1)} unit="%" note={`seuil ${fmt(a.lolpMax, 1)} %`}
            tone={pre.lolp <= a.lolpMax ? 'ok' : 'bad'} pending={virgin} />
          <Out label="SRI" value={fmt(pre.sri, 2)} note={`seuil ${fmt(pre.sriThreshold, 2)}`}
            tone={pre.reliable ? 'ok' : 'bad'} pending={virgin} />
          <Out label="Coût du kWh produit" value={fmt(pre.lcoeActualized)} unit="FCFA/kWh" note="LCOE actualisé" lead pending={virgin} />
          <Out
            label="SVI"
            value={fmt(pre.svi, 2)}
            note={
              pre.viable
                ? `${fmt((1 - pre.svi) * 100, 0)} % sous le tarif réseau`
                : `${fmt((pre.svi - 1) * 100, 0)} % au-dessus du tarif réseau`
            }
            lead
            pending={virgin}
          />
          <Out label="CO₂ évité" value={fmt(pre.co2AvoidedKg / 1000, 1)} unit="t" note={`sur ${fmt(a.projectLifetime)} ans`} pending={virgin} />
        </div>
      </section>

      {open && (
        <Dialog
          title="Hypothèses de calcul"
          lead={FAMILIES.find((f) => f.key === family)?.hint}
          wide
          onClose={() => setOpen(false)}
          footer={
            <button className="btn-primary" onClick={() => setOpen(false)}>
              Fermer
            </button>
          }
        >
          <div className="seg" role="tablist" style={{ marginBottom: 'var(--sp-4)' }}>
            {FAMILIES.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={family === f.key}
                onClick={() => setFamily(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {family === 'tech' && (
          <div className="form-rows">
          <NumField label="Performance ratio" unit="%" value={a.systemPr} onChange={set('systemPr')} decimals={1} />
          <NumField label="Rendement onduleur" unit="%" value={a.inverterYield} onChange={set('inverterYield')} decimals={1} />
          <NumField label="Rendement batterie" unit="%" value={a.batteryYield} onChange={set('batteryYield')} decimals={1} />
          <NumField label="Tension du parc" unit="V" value={a.batteryVoltage} onChange={set('batteryVoltage')} />
          <NumField label="Profondeur de décharge" unit="%" value={a.batteryDod} onChange={set('batteryDod')} decimals={1} />
          <NumField label="Seuil d’irradiance minimale" unit="W/m²" value={project.load.irMin}
            onChange={(v) => update((p) => { p.load.irMin = v; })} />
          </div>
        )}

        {family === 'costs' && (
          <div className="form-rows">
          <NumField label="Coût PV" unit="FCFA/kWc" value={a.pvSpecificCost} onChange={set('pvSpecificCost')} />
          <NumField label="Marge PV" unit="%" value={a.pvMargin} onChange={set('pvMargin')} decimals={1} />
          <NumField label="Coût batterie" unit="FCFA/kWh" value={a.batterySpecificCost} onChange={set('batterySpecificCost')} />
          <NumField label="Marge batterie" unit="%" value={a.batteryMargin} onChange={set('batteryMargin')} decimals={1} />
          <NumField label="Coût onduleur" unit="FCFA/kW" value={a.inverterSpecificCost} onChange={set('inverterSpecificCost')} />
          <NumField label="Marge onduleur" unit="%" value={a.inverterMargin} onChange={set('inverterMargin')} decimals={1} />
          <NumField label="Facteur d’émission" unit="kgCO₂/kWh" value={a.emissionFactor} onChange={set('emissionFactor')} decimals={2} />
          <NumField label="Taux d’autoconsommation" unit="%" value={a.autoConsumptionRate} onChange={set('autoConsumptionRate')} decimals={1} />
          </div>
        )}

        {family === 'life' && (
          <div className="form-rows">
          <NumField label="Durée de vie du projet" unit="ans" value={a.projectLifetime} onChange={set('projectLifetime')} />
          <NumField label="Modules PV" unit="ans" value={a.pvLifetime} onChange={set('pvLifetime')} />
          <NumField label="Batteries" unit="ans" value={a.batteryLifetime} onChange={set('batteryLifetime')} />
          <NumField label="Onduleur" unit="ans" value={a.inverterLifetime} onChange={set('inverterLifetime')} />
          <NumField label="Maintenance PV" unit="%/an" value={a.pvMaintenance} onChange={set('pvMaintenance')} decimals={1} />
          <NumField label="Maintenance batterie" unit="%/an" value={a.batteryMaintenance} onChange={set('batteryMaintenance')} decimals={1} />
          <NumField label="Maintenance onduleur" unit="%/an" value={a.inverterMaintenance} onChange={set('inverterMaintenance')} decimals={1} />
          <NumField label="Taux d’actualisation" unit="%" value={a.actualizationRate} onChange={set('actualizationRate')} decimals={1} />
          </div>
        )}
        </Dialog>
      )}
    </div>
  );
}
