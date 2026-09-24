import { useEffect, useState } from 'react';
import type { PresizingEnvelopeV1, PresizingProgress } from '@ksd/engine';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { NumField } from '../../ui/Field';
import { StepHead } from '../../ui/Flow';
import { Dialog } from '../../ui/Dialog';
import { useCalculationService, useCalculationState } from '../../app/CalculationProvider';
import { CapabilityNotice } from '../../ui/CapabilityNotice';
import { useT } from '../../i18n';
import { EconomicAssumptionsPanel } from './EconomicAssumptionsPanel';

const FAMILIES = [
  { key: 'tech', label: 'presizing2.technique', hint: 'presizing2.rendementsEtSeuilsDe' },
  { key: 'costs', label: 'presizing2.coutsReference', hint: 'presizing2.coutsSpecifiquesMargesTarif' },
  { key: 'life', label: 'presizing2.dureesDeVie', hint: 'presizing2.remplacementsEntretien' },
] as const;
type Family = (typeof FAMILIES)[number]['key'];

function PendingValue({ label, unit, lead = false }: { readonly label: string; readonly unit?: string; readonly lead?: boolean }) {
  return <div className={`out-cell is-pending ${lead ? 'is-lead' : ''}`}><span className="out-lbl">{label}</span><span className="out-val"><b>—</b>{unit && <span className="unit">{unit}</span>}</span></div>;
}

function ResultValue({ label, value, unit, lead = false, digits = 2 }: { readonly label: string; readonly value: number; readonly unit?: string; readonly lead?: boolean; readonly digits?: number }) {
  return <div className={`out-cell ${lead ? 'is-lead' : ''}`}><span className="out-lbl">{label}</span><span className="out-val"><b>{value.toLocaleString(undefined, { maximumFractionDigits: digits })}</b>{unit && <span className="unit">{unit}</span>}</span></div>;
}

export function SectionHypotheses() {
  const t = useT();
  const project = useProject();
  const update = useProjects((state) => state.update);
  const assumptions = project.assumptions;
  const money = project.currency;
  const state = useCalculationState(project.id, 'presizing', project.updatedAt);
  const service = useCalculationService();
  const [family, setFamily] = useState<Family>('tech');
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<PresizingEnvelopeV1 | null>(null);
  const [progress, setProgress] = useState<PresizingProgress | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    setProgress(null);
    setRunError(null);
    if (state.status === 'ready') setResult(state.envelope as PresizingEnvelopeV1);
    else setResult(null);
  }, [project.updatedAt, state]);
  const set = (key: keyof typeof assumptions) => (value: number) => update((draft) => { (draft.assumptions[key] as number) = value; });
  const run = async () => {
    if (service.runPresizing === undefined) return;
    setRunning(true); setRunError(null); setProgress(null);
    try { setResult(await service.runPresizing(project.id, setProgress)); }
    catch (error) { setRunError(error instanceof Error ? error.message : 'PRESIZING_FAILED'); }
    finally { setRunning(false); }
  };
  const output = result?.output ?? null;
  const candidate = output?.selected ?? null;

  return <div className="sheet">
    <StepHead slug="hypotheses" aside={<button className="btn" onClick={() => setOpen(true)}>{t('presizing.assumptions')}</button>} />
    <section><h2 className="h-sec">{t('presizing2.criteresDeLEtude')}</h2><div className="form-rows">
      <NumField label={t('presizing2.lpspMaximale')} unit="%" value={assumptions.lpspMax} onChange={set('lpspMax')} decimals={1} />
      <NumField label={t('presizing2.lolpMaximale')} unit="%" value={assumptions.lolpMax} onChange={set('lolpMax')} decimals={1} />
      <NumField label={t('presizing2.tarifReseauDeReference')} unit={`${money}/kWh`} value={assumptions.lcoeGrid} onChange={set('lcoeGrid')} />
    </div></section>
    <div className={`runbar ${result === null ? 'is-stale' : ''}`}><button className="btn btn-ok btn-run" disabled={running || service.runPresizing === undefined} onClick={() => void run()}>{running ? t('presizing.running') : t('presizing.run')}</button><span className="runbar-note">{running && progress ? `${progress.completed} / ${progress.total}` : result === null ? t('presizing.readyToRun') : `${t('presizing.method')} ${result.engineVersion}`}</span></div>
    {running && progress && <progress value={progress.completed} max={progress.total} aria-label={t('presizing.progress')} />}
    {runError !== null && <div className="empty" role="alert"><b>{t('presizing.blocked')}</b><span>{runError}</span></div>}
    {result === null && !running && runError === null && <CapabilityNotice capability="presizing" state={state} compact />}
    <section className={`out ${candidate === null ? 'is-stale' : ''}`}><div className="out-head"><span className={`out-tag ${output?.reliable ? 'ok' : ''}`}>{output === null ? t('g.unavailable') : output.reliable ? t('presizing.reliable') : t('presizing.unreliable')}</span><h2 className="h-sec">{t('presizing.minimumSystem')}</h2></div><div className="out-grid">
      {candidate === null ? <><PendingValue label={t('presizing2.puissanceCreteDuChamp')} unit="kWc" lead /><PendingValue label={t('presizing2.puissanceOnduleurMinimale')} unit="kW" lead /><PendingValue label={t('presizing2.energieStockeeMinimale')} unit="kWh" lead /><PendingValue label={t('presizing2.productionAnnuelle')} unit="kWh/an" /></> : <>
        <ResultValue label={t('presizing2.puissanceCreteDuChamp')} value={candidate.pvPeakKw} unit="kWc" lead />
        <ResultValue label={t('presizing2.puissanceOnduleurMinimale')} value={candidate.inverterKw} unit="kW" lead />
        <ResultValue label={t('presizing2.energieStockeeMinimale')} value={candidate.storageKwh} unit="kWh" lead />
        <ResultValue label={t('presizing2.productionAnnuelle')} value={candidate.annualProductionKwh} unit="kWh/an" digits={0} />
      </>}
    </div></section>
    <section className={`out ${candidate === null ? 'is-stale' : ''}`}><div className="out-head"><span className={`out-tag ${output?.viable ? 'ok' : ''}`}>{output === null ? t('g.unavailable') : output.viable ? t('presizing.viable') : t('presizing.notViable')}</span><h2 className="h-sec">{t('presizing2.fiabiliteAmpEconomie')}</h2></div><div className="out-grid">
      {candidate === null || output === null ? [t('presizing2.energieServie'), 'LPSP', 'LOLP', 'SRI', t('presizing2.coutCycleDeVie'), t('presizing2.coutDuKwhProduit'), 'SVI', t('presizing2.coEvite'), t('presizing2.facteurCarbone')].map((label) => <PendingValue key={label} label={label} />) : <>
        <ResultValue label={t('presizing2.energieServie')} value={candidate.servedEnergyKwh} unit="kWh/an" digits={0} />
        <ResultValue label="LPSP" value={candidate.lpsp * 100} unit="%" /><ResultValue label="LOLP" value={candidate.lolp * 100} unit="%" />
        <ResultValue label="SRI" value={candidate.sri} digits={3} /><ResultValue label={t('presizing2.sriMinimum')} value={output.sriMin} digits={3} />
        <ResultValue label={t('presizing2.coutCycleDeVie')} value={candidate.lcc} unit={money} digits={0} />
        <ResultValue label={t('presizing2.coutDuKwhProduit')} value={candidate.lcoe} unit={`${money}/kWh`} /><ResultValue label="SVI" value={candidate.svi} digits={3} />
        <ResultValue label={t('presizing2.coEvite')} value={candidate.co2AvoidedKg} unit="kg/an" digits={0} />
        <ResultValue label={t('presizing2.facteurCarbone')} value={candidate.carbonFactorKgPerKwh} unit="kgCO₂/kWh" digits={3} />
      </>}
    </div></section>
    {open && <Dialog title={t('presizing2.hypothesesDeCalcul')} lead={t(FAMILIES.find((item) => item.key === family)?.hint ?? '')} wide onClose={() => setOpen(false)} footer={<button className="btn-primary" onClick={() => setOpen(false)}>{t('g.close')}</button>}>
      <div className="seg" role="tablist" style={{ marginBottom: 'var(--sp-4)' }}>{FAMILIES.map((item) => <button key={item.key} role="tab" aria-selected={family === item.key} onClick={() => setFamily(item.key)}>{t(item.label)}</button>)}</div>
      {family === 'tech' && <div className="form-rows">
        <NumField label={t('presizing2.performanceRatio')} unit="%" value={assumptions.systemPr} onChange={set('systemPr')} decimals={1} />
        <NumField label={t('presizing2.rendementOnduleur')} unit="%" value={assumptions.inverterYield} onChange={set('inverterYield')} decimals={1} />
        <NumField label={t('presizing2.rendementBatterie')} unit="%" value={assumptions.batteryYield} onChange={set('batteryYield')} decimals={1} />
        <NumField label={t('presizing2.seuilDIrradianceMinimale')} unit="W/m²" value={project.load.irMin} onChange={(value) => update((draft) => { draft.load.irMin = value; })} />
      </div>}
      {family === 'costs' && <EconomicAssumptionsPanel currency={money} assumptions={assumptions} onSet={(key, value) => set(key)(value)} onSetMode={(component, mode) => update((draft) => { if (component === 'pv') draft.assumptions.pvCostInputMode = mode; else if (component === 'storage') draft.assumptions.storageCostInputMode = mode; else draft.assumptions.inverterCostInputMode = mode; })} onApplyReference={(component, price, size, specificCost) => update((draft) => { if (component === 'pv') { draft.assumptions.pvReferencePrice = price; draft.assumptions.pvReferencePowerW = size; draft.assumptions.pvSpecificCost = specificCost; draft.assumptions.pvCostInputMode = 'component'; } else if (component === 'storage') { draft.assumptions.storageReferencePrice = price; draft.assumptions.storageReferenceKwh = size; draft.assumptions.batterySpecificCost = specificCost; draft.assumptions.storageCostInputMode = 'component'; } else { draft.assumptions.inverterReferencePrice = price; draft.assumptions.inverterReferencePowerW = size; draft.assumptions.inverterSpecificCost = specificCost; draft.assumptions.inverterCostInputMode = 'component'; } })} />}
      {family === 'life' && <div className="form-rows">
        <NumField label={t('presizing2.dureeDeVieDu')} unit="ans" value={assumptions.projectLifetime} onChange={set('projectLifetime')} />
        <NumField label={t('presizing2.modulesPv')} unit="ans" value={assumptions.pvLifetime} onChange={set('pvLifetime')} />
        <NumField label={t('presizing2.batteries')} unit="ans" value={assumptions.batteryLifetime} onChange={set('batteryLifetime')} />
        <NumField label={t('presizing2.onduleur')} unit="ans" value={assumptions.inverterLifetime} onChange={set('inverterLifetime')} />
        <NumField label={t('presizing2.maintenancePv')} unit="%/an" value={assumptions.pvMaintenance} onChange={set('pvMaintenance')} decimals={1} />
        <NumField label={t('presizing2.maintenanceBatterie')} unit="%/an" value={assumptions.batteryMaintenance} onChange={set('batteryMaintenance')} decimals={1} />
        <NumField label={t('presizing2.maintenanceOnduleur')} unit="%/an" value={assumptions.inverterMaintenance} onChange={set('inverterMaintenance')} decimals={1} />
        <NumField label={t('presizing2.tauxDActualisation')} unit="%" value={assumptions.actualizationRate} onChange={set('actualizationRate')} decimals={1} />
      </div>}
    </Dialog>}
  </div>;
}
