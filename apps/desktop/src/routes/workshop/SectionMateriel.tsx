import { useEffect, useMemo, useRef, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import type { PresizingOutputV1, SizingOutputV1 } from '@ksd/engine';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { useCatalog } from '../../app/CatalogProvider';
import { useCalculationService, useCalculationState } from '../../app/CalculationProvider';
import { fmt, signed } from '../../domain/format';
import { StepHead } from '../../ui/Flow';
import { Prov } from '../../ui/Prov';
import { EquipmentPicker, type Kind } from './EquipmentPicker';

function reserveTone(percent: number): 'short' | 'tight' | 'ok' | 'over' {
  if (percent < 0) return 'short';
  if (percent < 5) return 'tight';
  if (percent > 20) return 'over';
  return 'ok';
}

function Reserve({ percent, ratio }: { readonly percent: number; readonly ratio: number }) {
  const tone = reserveTone(percent);
  return <><div className={`bar t-${tone}`}><i style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div><div className="fitline"><span>Réserve</span><b className={`res res-${tone}`}>{signed(percent)}<span className="unit">%</span></b></div></>;
}

function Target({ label, value, unit, got }: { readonly label: string; readonly value: number | null; readonly unit: string; readonly got?: { readonly text: string; readonly ok: boolean } }) {
  return <div className="tgt"><span className="tgt-lbl">{label}</span><span className="tgt-val"><b className={value === null ? 'mut' : ''}>{value === null ? '—' : fmt(value, label === 'Champ PV' ? 2 : 1)}</b>{value !== null && <span className="unit">{unit}</span>}</span>{value !== null && got && <span className={`tgt-got ${got.ok ? 'ok' : 'bad'}`}>{got.text}</span>}</div>;
}

function equipmentFacts(item: Equipment): [string, string][] {
  if (item.kind === 'pv-module') return [['Type', item.technology ?? '—'], ['Puissance', `${fmt(item.nominalPowerW)} Wc`], ['Vmp · Voc', `${fmt(item.voltageAtMaximumPowerV, 1)} · ${fmt(item.openCircuitVoltageV, 1)} V`], ['Imp · Isc', `${fmt(item.currentAtMaximumPowerA, 2)} · ${fmt(item.shortCircuitCurrentA, 2)} A`], ['Surface', `${fmt(item.areaM2 ?? 0, 2)} m²`]];
  if (item.kind === 'battery') return [['Technologie', item.technology ?? '—'], ['Capacité', `${fmt(item.nominalCapacityAh ?? 0)} Ah`], ['Tension', `${fmt(item.nominalVoltageV ?? 0)} V`], ['Énergie', `${fmt(item.nominalEnergyWh / 1000, 2)} kWh`], ['DoD utile', `${fmt((item.usableDepthOfDischargeRatio ?? 0) * 100)} %`], ['Rendement', `${fmt((item.roundTripEfficiencyRatio ?? 0) * 100)} %`], ['Cycles', fmt(item.cycleLife ?? 0)]];
  return [['Type', item.inverterType ?? '—'], ['Puissance', `${fmt(item.nominalAcPowerW / 1000, 1)} kW`], ['Tension DC', `${fmt(item.nominalDcVoltageV)} Vdc`], ['Plage MPPT', `${fmt(item.mpptMinVoltageV ?? 0)}–${fmt(item.mpptMaxVoltageV ?? 0)} V`], ['Voc max', `${fmt(item.pvOpenCircuitMaxVoltageV ?? 0)} V`], ['Rendement', `${fmt((item.efficiencyRatio ?? 0) * 100, 1)} %`]];
}

function PickRow({ index, role, equipment, onPick }: { readonly index: number; readonly role: string; readonly equipment: Equipment | null; readonly onPick: () => void }) {
  return <div className={`pickrow ${equipment ? '' : 'is-empty'}`}><span className="pickrow-n">{index}</span><span className="pickrow-role">{role}</span>{equipment ? <Prov title={`${role} · ${equipment.model}`} rows={equipmentFacts(equipment)} source="Base locale"><span className="pickrow-ref">{equipment.model}<span className="mut"> · {equipment.manufacturer}</span></span></Prov> : <span className="pickrow-ref mut">à choisir</span>}<span className="sep" /><button className="btn" onClick={onPick}>{equipment ? 'Changer' : 'Choisir…'}</button></div>;
}

interface Candidate { readonly equipment: Extract<Equipment, { kind: 'inverter' }>; readonly count: number; readonly pvSeries: number; readonly pvParallel: number; readonly batterySeries: number; readonly batteryParallel: number; readonly batteryVoltage: number; readonly reservePercent: number }

function CandidateRow({ candidate, selected, onSelect }: { readonly candidate: Candidate; readonly selected: boolean; readonly onSelect: () => void }) {
  const tone = reserveTone(candidate.reservePercent);
  return <button className={`cand ${selected ? 'is-sel' : ''}`} onClick={onSelect} aria-pressed={selected}><span className="cand-ref">{candidate.equipment.model}<span className="mut"> · {candidate.equipment.manufacturer}</span></span><span className="cand-pow"><b>{fmt(candidate.equipment.nominalAcPowerW / 1000, 1)}</b><span className="unit"> kW</span>{candidate.count > 1 && <span className="mut"> × {candidate.count}</span>}</span><span className="cand-cfg">{candidate.pvSeries}S×{candidate.pvParallel}P PV · {candidate.batterySeries}S×{candidate.batteryParallel}P bat · {fmt(candidate.batterySeries * candidate.batteryVoltage)} V</span><span className={`res res-${tone}`}>{signed(candidate.reservePercent)}<span className="unit">%</span></span></button>;
}

function CmpRow({ label, base, got, unit, decimals = 1 }: { readonly label: string; readonly base: number; readonly got: number; readonly unit: string; readonly decimals?: number }) {
  const delta = base === 0 ? 0 : (got / base - 1) * 100;
  return <tr><td className="name">{label}</td><td className="num mut">{fmt(base, decimals)}<span className="unit"> {unit}</span></td><td className="num"><b>{fmt(got, decimals)}<span className="unit"> {unit}</span></b></td><td className="num mut">{base === 0 ? '—' : `${signed(delta)} %`}</td></tr>;
}

export function SectionMateriel() {
  const project = useProject();
  const update = useProjects((state) => state.update);
  const { equipment } = useCatalog();
  const service = useCalculationService();
  const presizing = useCalculationState<PresizingOutputV1>(project.id, 'presizing', project.updatedAt);
  const sizing = useCalculationState<SizingOutputV1>(project.id, 'sizing', project.updatedAt);
  const [picker, setPicker] = useState<Kind | null>(null);
  const [compatibleIds, setCompatibleIds] = useState<readonly string[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestedSizingKey = useRef<string | null>(null);
  const selected = useMemo(() => ({
    module: equipment.find((x): x is Extract<Equipment, { kind: 'pv-module' }> => x.kind === 'pv-module' && x.id === project.selection.moduleId) ?? null,
    battery: equipment.find((x): x is Extract<Equipment, { kind: 'battery' }> => x.kind === 'battery' && x.id === project.selection.batteryId) ?? null,
    inverter: equipment.find((x): x is Extract<Equipment, { kind: 'inverter' }> => x.kind === 'inverter' && x.id === project.selection.inverterId) ?? null,
  }), [equipment, project.selection]);
  const pre = presizing.status === 'ready' ? presizing.envelope.output.selected : null;
  const result = sizing.status === 'ready' ? sizing.envelope.output : null;
  const sizingSelectionKey = [
    project.id,
    project.selection.moduleId ?? '',
    project.selection.batteryId ?? '',
    project.selection.inverterId ?? '',
  ].join(':');
  const resultMatchesSelection = result !== null
    && result.selectedEquipment.moduleId === project.selection.moduleId
    && result.selectedEquipment.batteryId === project.selection.batteryId
    && result.selectedEquipment.inverterId === project.selection.inverterId;

  useEffect(() => {
    let active = true;
    if (!selected.module || !selected.battery || !service.compatibleInverterIds) { setCompatibleIds([]); return () => { active = false; }; }
    void service.compatibleInverterIds(project.id).then((ids) => { if (active) setCompatibleIds(ids); });
    return () => { active = false; };
  }, [project.id, project.selection.moduleId, project.selection.batteryId, service]);

  const candidates = useMemo<Candidate[]>(() => compatibleIds.flatMap((id) => {
    const inverter = equipment.find((x): x is Extract<Equipment, { kind: 'inverter' }> => x.kind === 'inverter' && x.id === id);
    if (!inverter || !selected.module || !selected.battery || !pre) return [];
    const batteryVoltage = selected.battery.nominalVoltageV ?? 1;
    const batterySeries = Math.max(1, Math.ceil(inverter.nominalDcVoltageV / batteryVoltage));
    const batteryParallel = Math.max(1, Math.ceil((pre.storageKwh * 1000 / Math.max(selected.battery.usableDepthOfDischargeRatio ?? 1, .01)) / (batterySeries * selected.battery.nominalEnergyWh)));
    const count = Math.max(1, Math.ceil(pre.inverterKw / (inverter.nominalAcPowerW / 1000)));
    let pvSeries = 1; let pvParallel = 1;
    outer: for (let ns = 1; ns <= 20; ns += 1) for (let np = 1; np <= 200; np += 1) { const vmp = ns * selected.module.voltageAtMaximumPowerV; const power = ns * np * selected.module.nominalPowerW; if (power / 1000 >= pre.pvPeakKw && (inverter.mpptMinVoltageV == null || vmp >= inverter.mpptMinVoltageV) && (inverter.mpptMaxVoltageV == null || vmp <= inverter.mpptMaxVoltageV) && (inverter.pvArrayMaxPowerW == null || power <= inverter.pvArrayMaxPowerW)) { pvSeries = ns; pvParallel = np; break outer; } }
    return [{ equipment: inverter, count, pvSeries, pvParallel, batterySeries, batteryParallel, batteryVoltage, reservePercent: (count * inverter.nominalAcPowerW / 1000 / pre.inverterKw - 1) * 100 }];
  }), [compatibleIds, equipment, pre, selected.battery, selected.module]);

  const pick = (kind: Kind, id: string) => { update((draft) => { if (kind === 'module') draft.selection.moduleId = id; if (kind === 'battery') draft.selection.batteryId = id; if (kind === 'inverter') draft.selection.inverterId = id; if (kind !== 'inverter') draft.selection.inverterId = null; }); setPicker(null); setError(null); };

  useEffect(() => {
    if (!selected.module || !selected.battery || !selected.inverter || !service.runSizing) return;
    if (resultMatchesSelection) {
      lastRequestedSizingKey.current = sizingSelectionKey;
      setRunning(false);
      return;
    }
    if (lastRequestedSizingKey.current === sizingSelectionKey) return;
    lastRequestedSizingKey.current = sizingSelectionKey;
    let active = true; setRunning(true); setError(null);
    void service.runSizing(project.id, () => undefined).then(() => { if (active) setRunning(false); }).catch((cause: unknown) => { if (active) { lastRequestedSizingKey.current = null; setRunning(false); setError(cause instanceof Error ? cause.message : 'Dimensionnement impossible'); } });
    return () => { active = false; };
  }, [project.id, project.selection.moduleId, project.selection.batteryId, project.selection.inverterId, resultMatchesSelection, service, sizingSelectionKey]);

  const mountedStorage = result?.battery.usefulEnergyKwh ?? null;
  return <div className="sheet">
    <StepHead slug="materiel" aside={<span className="label">{equipment.filter((x) => x.kind === 'inverter').length} onduleurs · {pre ? '121 combinaisons en amont' : 'prédimensionnement requis'}</span>} />
    <section className="targets"><span className="targets-tag">à couvrir</span><Target label="Champ PV" value={pre?.pvPeakKw ?? null} unit="kWc" got={result ? { text: `${fmt(result.pv.obtainedPowerKwc, 2)} kWc montés`, ok: result.pv.marginRatio >= 0 } : undefined} /><Target label="Stockage" value={pre?.storageKwh ?? null} unit="kWh" got={mountedStorage == null ? undefined : { text: `${fmt(mountedStorage, 1)} kWh montés`, ok: result!.battery.marginRatio >= 0 }} /><Target label="Onduleur" value={pre?.inverterKw ?? null} unit="kW" got={result ? { text: `${fmt(result.inverter.obtainedPowerKw, 1)} kW montés`, ok: result.inverter.marginRatio >= 0 } : undefined} /></section>
    {!pre && <div className="alert warn"><div><b>Minimums indisponibles — </b>lancez le prédimensionnement à l’étape précédente pour savoir ce que le matériel doit couvrir.</div></div>}
    <section><h2 className="h-sec">Composants au catalogue</h2><div className="picklist"><PickRow index={1} role="Module" equipment={selected.module} onPick={() => setPicker('module')} /><PickRow index={2} role="Batterie" equipment={selected.battery} onPick={() => setPicker('battery')} /></div></section>
    <section><div className="tbl-title"><h2 className="h-sec"><span className="pickrow-n">3</span> Onduleur compatible</h2><span className="sep" />{selected.module && selected.battery && <span className="label">{candidates.length} compatibles sur {equipment.filter((x) => x.kind === 'inverter').length}{candidates.length > 0 && ` · ${fmt(Math.min(...candidates.map((x) => x.equipment.nominalAcPowerW)) / 1000, 1)}–${fmt(Math.max(...candidates.map((x) => x.equipment.nominalAcPowerW)) / 1000, 1)} kW`}</span>}</div>{!selected.module || !selected.battery ? <div className="hint-box">Choisissez d’abord un module et une batterie : la tension du parc et la puissance à tenir découlent des deux, et c’est ce qui détermine les onduleurs recevables.</div> : candidates.length === 0 ? <div className="alert warn"><div><b>Aucun onduleur recevable — </b>revoyez le module ou la batterie retenue.</div></div> : <div className="candlist">{candidates.slice(0, 4).map((candidate) => <CandidateRow key={candidate.equipment.id} candidate={candidate} selected={candidate.equipment.id === selected.inverter?.id} onSelect={() => pick('inverter', candidate.equipment.id)} />)}{candidates.length > 4 && <button className="btn cand-more" onClick={() => setPicker('inverter')}>Voir les {candidates.length - 4} autres au catalogue</button>}</div>}</section>
    <div className={`runbar ${result ? '' : 'is-stale'}`}><span className={`btn btn-ok btn-run ${running ? 'is-busy' : ''}`}>{running ? 'Calcul en cours…' : result ? 'Dimensionnement à jour' : 'Sélectionnez un onduleur'}</span><span className="runbar-note">{running ? 'Vérification des contraintes sur le matériel retenu' : result ? `${result.compatibility.issues.length === 0 ? 4 : 4 - result.compatibility.issues.length} contraintes satisfaites sur 4` : 'Le résultat est calculé immédiatement après la sélection.'}</span></div>
    {error && <div className="alert warn"><div><b>Dimensionnement impossible — </b>{error}</div></div>}
    {result && <><section className="out"><div className="out-head"><span className="out-tag">calculé</span><h2 className="h-sec">Système retenu</h2><span className="sep" /><span className="label">{result.compatibility.issues.length} point{result.compatibility.issues.length > 1 ? 's' : ''} à trancher</span></div><div className="fitgrid"><div className="fitcell"><span className="out-lbl">Champ PV · {result.pv.modulesInSeries}S × {result.pv.stringsInParallel}P = {result.pv.totalModules} modules</span><div className="fitline"><span>Requis</span><b>{fmt(result.pv.requiredPowerKwc * 1000)}<span className="unit"> W</span></b></div><div className="fitline"><span>Obtenu</span><b>{fmt(result.pv.obtainedPowerKwc * 1000)}<span className="unit"> W</span></b></div><Reserve percent={result.pv.marginRatio * 100} ratio={result.pv.requiredPowerKwc / result.pv.obtainedPowerKwc} /></div><div className="fitcell"><span className="out-lbl">Parc batteries · {result.battery.unitsInSeries}S × {result.battery.stringsInParallel}P = {result.battery.totalUnits} unités</span><div className="fitline"><span>Requis</span><b>{fmt(result.battery.requiredEnergyKwh, 1)}<span className="unit"> kWh</span></b></div><div className="fitline"><span>Obtenu utile</span><b>{fmt(result.battery.usefulEnergyKwh, 1)}<span className="unit"> kWh</span></b></div><Reserve percent={result.battery.marginRatio * 100} ratio={result.battery.requiredEnergyKwh / result.battery.usefulEnergyKwh} /></div><div className="fitcell"><span className="out-lbl">Onduleurs · {result.inverter.count} en parallèle</span><div className="fitline"><span>Requis</span><b>{fmt(result.inverter.requiredPowerKw * 1000)}<span className="unit"> W</span></b></div><div className="fitline"><span>Obtenu</span><b>{fmt(result.inverter.obtainedPowerKw * 1000)}<span className="unit"> W</span></b></div><Reserve percent={result.inverter.marginRatio * 100} ratio={result.inverter.requiredPowerKw / result.inverter.obtainedPowerKw} /></div></div></section>
    {pre && <section className="out"><div className="out-head"><span className="out-tag">simulé</span><h2 className="h-sec">Simulation du système retenu</h2><span className="sep" /><span className={`badge ${result.valid ? 'ok' : 'bad'}`}>{result.valid ? 'Seuils tenus' : 'Seuils dépassés'}</span></div><div className="tbl-wrap"><table className="tbl t-cmp"><thead><tr><th>Grandeur</th><th>Prédimensionné</th><th>Système retenu</th><th>Écart</th></tr></thead><tbody><CmpRow label="Puissance crête" base={pre.pvPeakKw} got={result.pv.obtainedPowerKwc} unit="kWc" decimals={2} /><CmpRow label="Stockage" base={pre.storageKwh} got={result.battery.usefulEnergyKwh} unit="kWh" /><CmpRow label="Onduleur" base={pre.inverterKw} got={result.inverter.obtainedPowerKw} unit="kW" /></tbody></table></div></section>}
    </>}
    {picker && <EquipmentPicker kind={picker} project={project} equipment={picker === 'inverter' ? equipment.filter((x) => compatibleIds.includes(x.id)) : equipment} compatibleIds={compatibleIds} onPick={(id) => pick(picker, id)} onClose={() => setPicker(null)} />}
  </div>;
}
