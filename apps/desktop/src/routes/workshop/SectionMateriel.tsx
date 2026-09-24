import { useEffect, useMemo, useRef, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import type { CompatibleInverterCandidate, OptimizationCandidate, OptimizationRequest, OptimizationResult, PresizingOutputV1, SizingOutputV1 } from '@ksd/engine';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { useCatalog } from '../../app/CatalogProvider';
import { useCalculationService, useCalculationState } from '../../app/CalculationProvider';
import { fmt, signed } from '../../domain/format';
import { StepHead } from '../../ui/Flow';
import { Prov } from '../../ui/Prov';
import { EquipmentPicker, type Kind } from './EquipmentPicker';
import { OptimizationSettings } from './OptimizationSettings';
import { OptimizationResults } from './OptimizationResults';
import { runSizingOptimization, candidateSelection } from '../../app/services/sizingOptimization';
import { resolveDesignColdTemperatureC } from '../../app/adapters/projectToAio';
import { useT } from '../../i18n';
import { calculationErrorKey } from '../../app/models/calculationErrors';

type Inverter = Extract<Equipment, { kind: 'inverter' }>;

function reserveTone(percent: number): 'short' | 'tight' | 'ok' | 'over' {
  if (percent < 0) return 'short';
  if (percent < 5) return 'tight';
  if (percent > 20) return 'over';
  return 'ok';
}

function Reserve({ percent, ratio }: { readonly percent: number; readonly ratio: number }) {
  const t = useT();
  const tone = reserveTone(percent);
  return <><div className={`bar t-${tone}`}><i style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div><div className="fitline"><span>{t('equipment.reserve')}</span><b className={`res res-${tone}`}>{signed(percent)}<span className="unit">%</span></b></div></>;
}

function Target({ label, value, unit, decimals, got }: { readonly label: string; readonly value: number | null; readonly unit: string; readonly decimals: number; readonly got?: { readonly text: string; readonly ok: boolean } }) {
  return <div className="tgt"><span className="tgt-lbl">{label}</span><span className="tgt-val"><b className={value === null ? 'mut' : ''}>{value === null ? '—' : fmt(value, decimals)}</b>{value !== null && <span className="unit">{unit}</span>}</span>{value !== null && got && <span className={`tgt-got ${got.ok ? 'ok' : 'bad'}`}>{got.text}</span>}</div>;
}

function useEquipmentFacts(): (item: Equipment) => [string, string][] {
  const t = useT();
  return (item) => {
    if (item.kind === 'pv-module') return [[t('equipment.fact.type'), item.technology ?? '—'], [t('equipment.fact.power'), `${fmt(item.nominalPowerW)} Wc`], ['Vmp · Voc', `${fmt(item.voltageAtMaximumPowerV, 1)} · ${fmt(item.openCircuitVoltageV, 1)} V`], ['Imp · Isc', `${fmt(item.currentAtMaximumPowerA, 2)} · ${fmt(item.shortCircuitCurrentA, 2)} A`], [t('equipment.fact.vocCoefficient'), item.temperatureCoefficientVocPerC == null ? '—' : `${fmt(item.temperatureCoefficientVocPerC * 100, 2)} %/°C`]];
    if (item.kind === 'battery') return [[t('equipment.fact.technology'), item.technology ?? '—'], [t('equipment.fact.capacity'), `${fmt(item.nominalCapacityAh ?? 0)} Ah`], [t('equipment.fact.voltage'), `${fmt(item.nominalVoltageV ?? 0)} V`], [t('equipment.fact.energy'), `${fmt(item.nominalEnergyWh / 1000, 2)} kWh`], [t('equipment.fact.dod'), `${fmt((item.usableDepthOfDischargeRatio ?? 0) * 100)} %`], [t('equipment.fact.cycles'), fmt(item.cycleLife ?? 0)]];
    return [[t('equipment.fact.type'), item.inverterType ?? '—'], [t('equipment.fact.power'), `${fmt(item.nominalAcPowerW / 1000, 1)} kW`], [t('equipment.fact.dcVoltage'), `${fmt(item.nominalDcVoltageV)} Vdc`], ['MPPT', `${fmt(item.mpptMinVoltageV ?? 0)}–${fmt(item.mpptMaxVoltageV ?? 0)} V`], ['Voc max', `${fmt(item.pvOpenCircuitMaxVoltageV ?? 0)} V`], [t('equipment.fact.efficiency'), `${fmt((item.efficiencyRatio ?? 0) * 100, 1)} %`]];
  };
}

function PickRow({ index, role, equipment, onPick }: { readonly index: number; readonly role: string; readonly equipment: Equipment | null; readonly onPick: () => void }) {
  const t = useT();
  const facts = useEquipmentFacts();
  return <div className={`pickrow ${equipment ? '' : 'is-empty'}`}><span className="pickrow-n">{index}</span><span className="pickrow-role">{role}</span>{equipment ? <Prov title={`${role} · ${equipment.model}`} rows={facts(equipment)} source={t('equipment.localCatalog')}><span className="pickrow-ref">{equipment.model}<span className="mut"> · {equipment.manufacturer}</span></span></Prov> : <span className="pickrow-ref mut">{t('equipment.toChoose')}</span>}<span className="sep" /><button className="btn" onClick={onPick}>{equipment ? t('equipment.change') : t('equipment.choose')}</button></div>;
}

interface Candidate { readonly equipment: Inverter; readonly engine: CompatibleInverterCandidate; readonly batteryVoltage: number; readonly reservePercent: number }

function CandidateRow({ candidate, selected, onSelect }: { readonly candidate: Candidate; readonly selected: boolean; readonly onSelect: () => void }) {
  const tone = reserveTone(candidate.reservePercent);
  const { engine } = candidate;
  return <button className={`cand ${selected ? 'is-sel' : ''}`} onClick={onSelect} aria-pressed={selected}><span className="cand-ref">{candidate.equipment.model}<span className="mut"> · {candidate.equipment.manufacturer}</span></span><span className="cand-pow"><b>{fmt(candidate.equipment.nominalAcPowerW / 1000, 1)}</b><span className="unit"> kW</span>{engine.inverterCount > 1 && <span className="mut"> × {engine.inverterCount}</span>}</span><span className="cand-cfg">{engine.modulesInSeries}S×{engine.stringsInParallel}P PV · {engine.batteryUnitsInSeries}S×{engine.batteryStringsInParallel}P bat · {fmt(engine.batteryUnitsInSeries * candidate.batteryVoltage)} V</span><span className={`res res-${tone}`}>{signed(candidate.reservePercent)}<span className="unit">%</span></span></button>;
}

function CmpRow({ label, base, got, unit, decimals = 1 }: { readonly label: string; readonly base: number; readonly got: number; readonly unit: string; readonly decimals?: number }) {
  const delta = base === 0 ? 0 : (got / base - 1) * 100;
  return <tr><td className="name">{label}</td><td className="num mut">{fmt(base, decimals)}<span className="unit"> {unit}</span></td><td className="num"><b>{fmt(got, decimals)}<span className="unit"> {unit}</span></b></td><td className="num mut">{base === 0 ? '—' : `${signed(delta)} %`}</td></tr>;
}

const DEFAULT_OPTIMIZATION_REQUEST: OptimizationRequest = { enabled: false, module: { mode: 'free' }, battery: { mode: 'free' }, inverter: { mode: 'free' }, objective: 'closest' };

export function SectionMateriel() {
  const t = useT();
  const project = useProject();
  const update = useProjects((state) => state.update);
  const { equipment } = useCatalog();
  const [showOptimizationSettings, setShowOptimizationSettings] = useState(false);
  const [optimizationRequest, setOptimizationRequest] = useState<OptimizationRequest>(DEFAULT_OPTIMIZATION_REQUEST);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [optimizationRunning, setOptimizationRunning] = useState(false);
  const service = useCalculationService();
  const presizing = useCalculationState<PresizingOutputV1>(project.id, 'presizing', project.updatedAt);
  const sizing = useCalculationState<SizingOutputV1>(project.id, 'sizing', project.updatedAt);
  const [picker, setPicker] = useState<Kind | null>(null);
  const [engineCandidates, setEngineCandidates] = useState<readonly CompatibleInverterCandidate[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestedSizingKey = useRef<string | null>(null);
  const inverterCount = equipment.filter((x) => x.kind === 'inverter').length;
  const selected = useMemo(() => ({
    module: equipment.find((x): x is Extract<Equipment, { kind: 'pv-module' }> => x.kind === 'pv-module' && x.id === project.selection.moduleId) ?? null,
    battery: equipment.find((x): x is Extract<Equipment, { kind: 'battery' }> => x.kind === 'battery' && x.id === project.selection.batteryId) ?? null,
    inverter: equipment.find((x): x is Inverter => x.kind === 'inverter' && x.id === project.selection.inverterId) ?? null,
  }), [equipment, project.selection]);
  const pre = presizing.status === 'ready' ? presizing.envelope.output.selected : null;
  const result = sizing.status === 'ready' ? sizing.envelope.output : null;
  const coldTemperatureC = resolveDesignColdTemperatureC(project.site.designColdTemperatureC, project.site.downloadedSource?.ambientTemperatureMinC);
  /* Relancer quand la sélection change OU quand le résultat enregistré est
     périmé (charge, météo, température ou prédimensionnement modifiés). */
  const sizingRequestKey = [project.id, project.selection.moduleId ?? '', project.selection.batteryId ?? '', project.selection.inverterId ?? '', sizing.status === 'stale' ? sizing.currentInputHash : ''].join(':');

  useEffect(() => {
    let active = true;
    if (!selected.module || !selected.battery || !service.compatibleInverters || !pre) { setEngineCandidates([]); return () => { active = false; }; }
    void service.compatibleInverters(project.id).then((items) => { if (active) setEngineCandidates(items); });
    return () => { active = false; };
  }, [project.id, project.selection.moduleId, project.selection.batteryId, pre, coldTemperatureC, service]);

  const candidates = useMemo<Candidate[]>(() => engineCandidates.flatMap((engine) => {
    const inverter = equipment.find((x): x is Inverter => x.kind === 'inverter' && x.id === engine.inverterId);
    if (!inverter || !selected.battery || !pre) return [];
    return [{ equipment: inverter, engine, batteryVoltage: selected.battery.nominalVoltageV ?? 0, reservePercent: (engine.inverterCount * inverter.nominalAcPowerW / 1000 / pre.inverterKw - 1) * 100 }];
  }), [engineCandidates, equipment, pre, selected.battery]);
  const compatibleIds = useMemo(() => candidates.map((candidate) => candidate.equipment.id), [candidates]);

  const pick = (kind: Kind, id: string) => { update((draft) => { if (kind === 'module') draft.selection.moduleId = id; if (kind === 'battery') draft.selection.batteryId = id; if (kind === 'inverter') draft.selection.inverterId = id; if (kind !== 'inverter') draft.selection.inverterId = null; }); setPicker(null); setError(null); };

  const runOptimization = (request: OptimizationRequest) => {
    if (!pre) return;
    if (coldTemperatureC === null) { setError('COLD_TEMPERATURE_MISSING'); return; }
    setOptimizationRequest(request);
    setShowOptimizationSettings(false);
    setOptimizationRunning(true);
    void runSizingOptimization({ project, requirements: { pvKw: pre.pvPeakKw, storageKwh: pre.storageKwh, inverterKw: pre.inverterKw }, equipment, request, coldTemperatureC })
      .then((outcome) => setOptimizationResult(outcome))
      .finally(() => setOptimizationRunning(false));
  };
  const applyOptimizationCandidate = (candidate: OptimizationCandidate) => {
    const selection = candidateSelection(candidate);
    update((draft) => { draft.selection.moduleId = selection.moduleId; draft.selection.batteryId = selection.batteryId; draft.selection.inverterId = selection.inverterId; });
    setOptimizationResult(null);
    setError(null);
  };

  useEffect(() => {
    if (!selected.module || !selected.battery || !selected.inverter || !service.runSizing || !pre) return;
    if (sizing.status === 'ready' && sizing.envelope.output.selectedEquipment.inverterId === selected.inverter.id && sizing.envelope.output.selectedEquipment.moduleId === selected.module.id && sizing.envelope.output.selectedEquipment.batteryId === selected.battery.id) { setRunning(false); return; }
    if (sizing.status === 'loading' || lastRequestedSizingKey.current === sizingRequestKey) return;
    lastRequestedSizingKey.current = sizingRequestKey;
    let active = true; setRunning(true); setError(null);
    void service.runSizing(project.id, () => undefined)
      .then(() => { if (active) setRunning(false); })
      .catch((cause: unknown) => { if (active) { setRunning(false); setError(cause instanceof Error ? cause.message : 'SIZING_FAILED'); } });
    return () => { active = false; };
  }, [pre, project.id, selected, service, sizing, sizingRequestKey]);

  const mountedStorage = result?.battery.usefulEnergyKwh ?? null;
  const satisfied = result === null ? 0 : 4 - Math.min(4, result.compatibility.issues.length);
  return <div className="sheet">
    <StepHead slug="materiel" aside={pre ? undefined : <span className="label">{t('equipment.presizingRequired')}</span>} />
    <section className="targets">
      <span className="targets-tag">{t('equipment.toCover')}</span>
      <Target label={t('equipment.pvField')} value={pre?.pvPeakKw ?? null} unit="kWc" decimals={2} got={result ? { text: `${fmt(result.pv.obtainedPowerKwc, 2)} kWc ${t('equipment.mounted')}`, ok: result.pv.marginRatio >= 0 } : undefined} />
      <Target label={t('equipment.storage')} value={pre?.storageKwh ?? null} unit="kWh" decimals={1} got={mountedStorage == null ? undefined : { text: `${fmt(mountedStorage, 1)} kWh ${t('equipment.mounted')}`, ok: result!.battery.marginRatio >= 0 }} />
      <Target label={t('equipment.inverter')} value={pre?.inverterKw ?? null} unit="kW" decimals={1} got={result ? { text: `${fmt(result.inverter.obtainedPowerKw, 1)} kW ${t('equipment.mounted')}`, ok: result.inverter.marginRatio >= 0 } : undefined} />
    </section>
    {!pre && <div className="alert warn"><div><b>{t('equipment.minimumsUnavailable')}</b> {t('equipment.minimumsUnavailableHelp')}</div></div>}
    {pre && coldTemperatureC === null && <div className="alert warn"><div><b>{t('equipment.coldMissing')}</b> {t('site.temperatureRequiredHelp')}</div></div>}
    <section>
      <div className="tbl-title"><h2 className="h-sec">{t('equipment.catalogComponents')}</h2><span className="sep" />{pre && <button className="btn" onClick={() => setShowOptimizationSettings(true)}>{t('optimization.entryButton')}</button>}</div>
      <div className="picklist"><PickRow index={1} role={t('equipment.module')} equipment={selected.module} onPick={() => setPicker('module')} /><PickRow index={2} role={t('equipment.battery')} equipment={selected.battery} onPick={() => setPicker('battery')} /></div>
    </section>
    <section>
      <div className="tbl-title"><h2 className="h-sec"><span className="pickrow-n">3</span> {t('equipment.compatibleInverter')}</h2><span className="sep" />{selected.module && selected.battery && <span className="label">{candidates.length} {t('equipment.compatibleOf')} {inverterCount}{candidates.length > 0 && ` · ${fmt(Math.min(...candidates.map((x) => x.equipment.nominalAcPowerW)) / 1000, 1)}–${fmt(Math.max(...candidates.map((x) => x.equipment.nominalAcPowerW)) / 1000, 1)} kW`}</span>}</div>
      {!selected.module || !selected.battery ? <div className="hint-box">{t('equipment.chooseModuleBatteryFirst')}</div>
        : candidates.length === 0 ? <div className="alert warn"><div><b>{t('equipment.noInverter')}</b> {t('equipment.noInverterHelp')}</div></div>
          : <div className="candlist">{candidates.slice(0, 4).map((candidate) => <CandidateRow key={candidate.equipment.id} candidate={candidate} selected={candidate.equipment.id === selected.inverter?.id} onSelect={() => pick('inverter', candidate.equipment.id)} />)}{candidates.length > 4 && <button className="btn cand-more" onClick={() => setPicker('inverter')}>{t('equipment.seeOthers').replace('{count}', String(candidates.length - 4))}</button>}</div>}
    </section>
    <div className={`runbar ${result ? '' : 'is-stale'}`} role="status">
      <span className={`btn btn-ok btn-run ${running ? 'is-busy' : ''}`}>{running ? t('equipment.running') : result ? t('equipment.upToDate') : sizing.status === 'stale' ? t('completion.stale') : t('equipment.selectInverter')}</span>
      <span className="runbar-note">{running ? t('equipment.runningNote') : result ? t('equipment.constraintsMet').replace('{count}', String(satisfied)) : t('equipment.immediateNote')}</span>
    </div>
    {error && <div className="alert warn" role="alert"><div><b>{t('equipment.sizingFailed')}</b> {t(calculationErrorKey(error))}</div></div>}
    {result && <>
      <section className="out">
        <div className="out-head"><span className="out-tag">{t('costing.calculated')}</span><h2 className="h-sec">{t('dossier.retained')}</h2><span className="sep" /><span className="label">{result.compatibility.issues.length} {t('equipment.pointsToSettle')}</span></div>
        {result.compatibility.issues.length + result.compatibility.warnings.length > 0 && <ul className="issue-list">{[...result.compatibility.issues, ...result.compatibility.warnings].map((issue) => <li key={issue.code} className={issue.severity === 'error' ? 'is-error' : ''}>{t(calculationErrorKey(issue.code))}</li>)}</ul>}
        <div className="fitgrid">
          <div className="fitcell"><span className="out-lbl">{t('equipment.pvField')} · {result.pv.modulesInSeries}S × {result.pv.stringsInParallel}P = {result.pv.totalModules} {t('dossier.modules')}</span><div className="fitline"><span>{t('equipment.required')}</span><b>{fmt(result.pv.requiredPowerKwc * 1000)}<span className="unit"> W</span></b></div><div className="fitline"><span>{t('equipment.obtained')}</span><b>{fmt(result.pv.obtainedPowerKwc * 1000)}<span className="unit"> W</span></b></div><div className="fitline"><span>{t('equipment.vocCold')}</span><b>{fmt(result.pv.vocColdV, 1)}<span className="unit"> V</span></b></div><Reserve percent={result.pv.marginRatio * 100} ratio={result.pv.requiredPowerKwc / result.pv.obtainedPowerKwc} /></div>
          <div className="fitcell"><span className="out-lbl">{t('equipment.batteryBank')} · {result.battery.unitsInSeries}S × {result.battery.stringsInParallel}P = {result.battery.totalUnits} {t('dossier.units')}</span><div className="fitline"><span>{t('equipment.required')}</span><b>{fmt(result.battery.requiredEnergyKwh, 1)}<span className="unit"> kWh</span></b></div><div className="fitline"><span>{t('equipment.obtainedUseful')}</span><b>{fmt(result.battery.usefulEnergyKwh, 1)}<span className="unit"> kWh</span></b></div><Reserve percent={result.battery.marginRatio * 100} ratio={result.battery.requiredEnergyKwh / result.battery.usefulEnergyKwh} /></div>
          <div className="fitcell"><span className="out-lbl">{t('dossier.inverters')} · {result.inverter.count} {t('equipment.inParallel')}</span><div className="fitline"><span>{t('equipment.required')}</span><b>{fmt(result.inverter.requiredPowerKw * 1000)}<span className="unit"> W</span></b></div><div className="fitline"><span>{t('equipment.obtained')}</span><b>{fmt(result.inverter.obtainedPowerKw * 1000)}<span className="unit"> W</span></b></div><Reserve percent={result.inverter.marginRatio * 100} ratio={result.inverter.requiredPowerKw / result.inverter.obtainedPowerKw} /></div>
        </div>
      </section>
      {pre && <section className="out"><div className="out-head"><span className="out-tag">{t('costing.simulated')}</span><h2 className="h-sec">{t('equipment.retainedVsPresized')}</h2><span className="sep" /><span className={`badge ${result.valid ? 'ok' : 'bad'}`}>{result.valid ? t('equipment.thresholdsMet') : t('equipment.thresholdsExceeded')}</span></div><div className="tbl-wrap"><table className="tbl t-cmp"><thead><tr><th>{t('costing.cmp.quantity')}</th><th>{t('costing.cmp.presized')}</th><th>{t('costing.cmp.retained')}</th><th>{t('costing.cmp.delta')}</th></tr></thead><tbody><CmpRow label={t('costing.cmp.peak')} base={pre.pvPeakKw} got={result.pv.obtainedPowerKwc} unit="kWc" decimals={2} /><CmpRow label={t('equipment.storage')} base={pre.storageKwh} got={result.battery.usefulEnergyKwh} unit="kWh" /><CmpRow label={t('equipment.inverter')} base={pre.inverterKw} got={result.inverter.obtainedPowerKw} unit="kW" /></tbody></table></div></section>}
    </>}
    {picker && <EquipmentPicker kind={picker} project={project} equipment={picker === 'inverter' ? equipment.filter((x) => compatibleIds.includes(x.id)) : equipment} compatibleIds={compatibleIds} onPick={(id) => pick(picker, id)} onClose={() => setPicker(null)} />}
    {showOptimizationSettings && <OptimizationSettings equipment={equipment} initial={optimizationRequest} onClose={() => setShowOptimizationSettings(false)} onRun={runOptimization} />}
    {optimizationRunning && <div className="scrim"><div className="modal" role="dialog" aria-modal="true" aria-label={t('optimization.settingsTitle')}><div className="body"><p className="label">{t('optimization.run')}…</p></div></div></div>}
    {optimizationResult && !optimizationRunning && <OptimizationResults result={optimizationResult} request={optimizationRequest} equipment={equipment} onApply={applyOptimizationCandidate} onClose={() => setOptimizationResult(null)} />}
  </div>;
}
