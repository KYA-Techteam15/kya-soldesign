import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Equipment } from '@ksd/catalog';
import type { OptimizationCandidate, OptimizationRequest, OptimizationResult, RetainedSystemSimulationV1, SelectionScope } from '@ksd/engine';
import { Dialog } from '../../ui/Dialog';
import { NumField } from '../../ui/Field';
import type { EquipmentFamily } from '../../app/models/applicationSettings';
import type { ProjectViewModel } from '../../app/models/projectView';
import { runSizingOptimization, type OptimizationRequirements } from '../../app/services/sizingOptimization';
import { useCalculationService } from '../../app/CalculationProvider';
import { useSettings } from '../../store/settings';
import { useUi } from '../../store/ui';
import { currencyLabel, fmt, signed } from '../../domain/format';
import { fill, useT } from '../../i18n';

type Source = 'favorites' | 'fixed' | 'all';
type Objective = OptimizationRequest['objective'];
type Phase = { readonly step: 'setup' } | { readonly step: 'running'; readonly completed: number; readonly total: number } | { readonly step: 'simulating' } | { readonly step: 'done'; readonly result: OptimizationResult; readonly simulations: readonly (RetainedSystemSimulationV1 | null)[] };

/** Durées moyennes mesurées : examen d'une combinaison, simulation annuelle d'un candidat. */
const MS_PER_COMBINATION = 0.4;
const MS_PER_SIMULATION = 60;

const eligible = (item: Equipment) => item.archivedAt == null && item.calculationEligibility?.state !== 'ineligible';

/**
 * Optimisation du dimensionnement : quelles références combiner, dans quel but, puis les meilleures
 * propositions simulées heure par heure. Rien n'est retenu sans « Retenir ».
 */
export function OptimizationDialog({ project, equipment, requirements, coldTemperatureC, onRetain, onClose }: {
  readonly project: ProjectViewModel;
  readonly equipment: readonly Equipment[];
  readonly requirements: OptimizationRequirements;
  readonly coldTemperatureC: number;
  readonly onRetain: (candidate: OptimizationCandidate) => void;
  readonly onClose: () => void;
}) {
  const t = useT();
  const lang = useUi((state) => state.lang);
  const sizing = useSettings((state) => state.sizing);
  const service = useCalculationService();
  const abort = useRef<AbortController | null>(null);

  const catalog = useMemo(() => ({
    module: equipment.filter((item) => item.kind === 'pv-module' && eligible(item)),
    battery: equipment.filter((item) => item.kind === 'battery' && eligible(item)),
    inverter: equipment.filter((item) => item.kind === 'inverter' && eligible(item)),
  }), [equipment]);
  const favorites = useMemo(() => ({
    module: sizing.favorites.module.filter((id) => catalog.module.some((item) => item.id === id)),
    battery: sizing.favorites.battery.filter((id) => catalog.battery.some((item) => item.id === id)),
    inverter: sizing.favorites.inverter.filter((id) => catalog.inverter.some((item) => item.id === id)),
  }), [catalog, sizing.favorites]);
  const selectedId = { module: project.selection.moduleId, battery: project.selection.batteryId, inverter: project.selection.inverterId };

  const [sources, setSources] = useState<Record<EquipmentFamily, Source>>(() => ({
    module: favorites.module.length > 0 ? 'favorites' : 'fixed',
    battery: favorites.battery.length > 0 ? 'favorites' : 'fixed',
    inverter: favorites.inverter.length > 0 ? 'favorites' : 'all',
  }));
  const [fixed, setFixed] = useState<Record<EquipmentFamily, string>>(() => ({
    module: selectedId.module ?? favorites.module[0] ?? catalog.module[0]?.id ?? '',
    battery: selectedId.battery ?? favorites.battery[0] ?? catalog.battery[0]?.id ?? '',
    inverter: selectedId.inverter ?? favorites.inverter[0] ?? catalog.inverter[0]?.id ?? '',
  }));
  const [objective, setObjective] = useState<Objective>('closest');
  const [limits, setLimits] = useState<{ pv?: number; storage?: number; inverter?: number }>({});
  const [phase, setPhase] = useState<Phase>({ step: 'setup' });

  const scope = (family: EquipmentFamily): SelectionScope => sources[family] === 'favorites' ? { mode: 'shortlist', equipmentIds: favorites[family] } : sources[family] === 'fixed' ? { mode: 'fixed', equipmentId: fixed[family] } : { mode: 'free' };
  const count = (family: EquipmentFamily) => sources[family] === 'favorites' ? favorites[family].length : sources[family] === 'fixed' ? (fixed[family] ? 1 : 0) : catalog[family].length;
  const combinations = count('module') * count('battery') * count('inverter');
  const estimateS = (combinations * MS_PER_COMBINATION + sizing.proposals * MS_PER_SIMULATION) / 1000;
  const find = (id: string) => equipment.find((candidate) => candidate.id === id);
  const label = (id: string) => find(id)?.model ?? id;
  const maker = (id: string) => find(id)?.manufacturer;
  const money = currencyLabel(project.currency, lang);

  const run = async () => {
    const controller = new AbortController();
    abort.current = controller;
    setPhase({ step: 'running', completed: 0, total: combinations });
    try {
      const request: OptimizationRequest = { enabled: true, module: scope('module'), battery: scope('battery'), inverter: scope('inverter'), objective, topN: sizing.proposals, ...(Object.keys(limits).length > 0 ? { maxOversizeRatio: limits } : {}) };
      const result = await runSizingOptimization({ project, requirements, equipment, request, coldTemperatureC, signal: controller.signal, onProgress: (progress) => setPhase({ step: 'running', ...progress }) });
      if (result.status !== 'complete' || result.candidates.length === 0 || service.simulateSystems === undefined) { setPhase({ step: 'done', result, simulations: [] }); return; }
      setPhase({ step: 'simulating' });
      const simulations = await service.simulateSystems(project.id, result.candidates.map((candidate) => ({ pvPeakKw: candidate.output.pv.obtainedPowerKwc, storageKwh: candidate.output.battery.usefulEnergyKwh, inverterKw: candidate.output.inverter.obtainedPowerKw })));
      setPhase({ step: 'done', result, simulations: simulations ?? [] });
    } catch (error) {
      setPhase({ step: 'setup' });
      if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
    }
  };

  const families: readonly EquipmentFamily[] = ['module', 'battery', 'inverter'];
  const done = phase.step === 'done' ? phase : null;

  return (
    <Dialog title={t('optimization.settingsTitle')} lead={t('optimization.dialogLead')} extraWide onClose={() => { abort.current?.abort(); onClose(); }}
      footer={<>
        <span className="label">{t('optimization.nothingRetained')}</span>
        <span className="sep" />
        {phase.step === 'running' || phase.step === 'simulating'
          ? <button type="button" className="btn" onClick={() => abort.current?.abort()}>{t('g.cancel')}</button>
          : <>
            <button type="button" className="btn btn-ghost" onClick={onClose}>{t('g.close')}</button>
            <button type="button" className="btn btn-ok" disabled={combinations === 0} onClick={() => void run()}>{done ? t('optimization.runAgain') : t('optimization.run')}</button>
          </>}
      </>}>
      <div className="opt-dialog">
        <section className="opt-block">
          <h3>① {t('optimization.referencesTitle')}</h3>
          {families.map((family) => (
            <div className="opt-source" key={family}>
              <b>{t(`optimization.family.${family}`)}</b>
              <label className={favorites[family].length === 0 ? 'is-disabled' : ''}>
                <input type="radio" name={`src-${family}`} checked={sources[family] === 'favorites'} disabled={favorites[family].length === 0} onChange={() => setSources((current) => ({ ...current, [family]: 'favorites' }))} />
                {t('catalog.myReferences')} <span className="label">{favorites[family].length}{sizing.caps[family] === null ? '' : ` / ${sizing.caps[family]} max`}</span>
              </label>
              <label>
                <input type="radio" name={`src-${family}`} checked={sources[family] === 'fixed'} onChange={() => setSources((current) => ({ ...current, [family]: 'fixed' }))} />
                {t('optimization.scopeFixed')}
                {sources[family] === 'fixed' && (
                  <select aria-label={`${t(`optimization.family.${family}`)} · ${t('optimization.scopeFixed')}`} value={fixed[family]} onChange={(event) => setFixed((current) => ({ ...current, [family]: event.target.value }))}>
                    {(favorites[family].length > 0 ? [...favorites[family].map((id) => catalog[family].find((item) => item.id === id)!), ...catalog[family].filter((item) => !favorites[family].includes(item.id))] : catalog[family]).map((item) => <option key={item.id} value={item.id}>{favorites[family].includes(item.id) ? '★ ' : ''}{item.manufacturer} {item.model}</option>)}
                  </select>
                )}
              </label>
              {family === 'inverter' && (
                <label>
                  <input type="radio" name="src-inverter" checked={sources.inverter === 'all'} onChange={() => setSources((current) => ({ ...current, inverter: 'all' }))} />
                  {fill(t('optimization.allCompatibleInverters'), { count: catalog.inverter.length })}
                </label>
              )}
            </div>
          ))}
          <p className="label">
            {fill(t('optimization.combinationCount'), { a: count('module'), b: count('battery'), c: count('inverter'), total: fmt(combinations, 0) })}
            {' · '}{estimateS < 1 ? t('optimization.underOneSecond') : fill(t('optimization.aboutSeconds'), { s: fmt(Math.ceil(estimateS), 0) })}
            {' · '}<Link to="/catalogue">{t('optimization.manageReferences')}</Link>
          </p>
        </section>

        <section className="opt-block">
          <h3>② {t('optimization.objectiveTitle')}</h3>
          {(['closest', 'lowest-main-equipment-cost', 'fewest-components'] as const).map((key) => (
            <label className="opt-objective-choice" key={key}>
              <input type="radio" name="objective" checked={objective === key} onChange={() => setObjective(key)} />
              <b>{t(`optimization.objective.${key}`)}</b> <span className="label">{t(`optimization.objective.${key}.hint`)}</span>
            </label>
          ))}
          <details className="opt-limits">
            <summary>{t('optimization.limitsTitle')}</summary>
            <div className="form-rows opt-limit-fields">
              <NumField label={t('optimization.limitPv')} unit="%" value={(limits.pv ?? 0) * 100} onChange={(value) => setLimits((current) => ({ ...current, pv: value > 0 ? value / 100 : undefined }))} decimals={0} />
              <NumField label={t('optimization.limitStorage')} unit="%" value={(limits.storage ?? 0) * 100} onChange={(value) => setLimits((current) => ({ ...current, storage: value > 0 ? value / 100 : undefined }))} decimals={0} />
              <NumField label={t('optimization.limitInverter')} unit="%" value={(limits.inverter ?? 0) * 100} onChange={(value) => setLimits((current) => ({ ...current, inverter: value > 0 ? value / 100 : undefined }))} decimals={0} />
            </div>
            <p className="label">{t('optimization.limitsHint')}</p>
          </details>
        </section>

        {(phase.step === 'running' || phase.step === 'simulating') && (
          <section className="opt-block" role="status">
            <h3>③ {t('optimization.resultsTitle')}</h3>
            <progress max={phase.step === 'running' ? Math.max(1, phase.total) : 1} value={phase.step === 'running' ? phase.completed : 1} />
            <span className="label">{phase.step === 'running' ? fill(t('optimization.examining'), { completed: fmt(phase.completed, 0), total: fmt(phase.total, 0) }) : t('optimization.simulating')}</span>
          </section>
        )}

        {done && (
          <section className="opt-block">
            <h3>③ {t('optimization.resultsTitle')}</h3>
            {done.result.status === 'blocked' && <div className="alert warn"><div><b>{done.result.code === 'OPTIMIZATION_SCOPE_EMPTY' ? t('optimization.blockedScopeEmpty') : t('optimization.blockedCostUnavailable')}</b></div></div>}
            {done.result.status === 'complete' && <>
              <p className="label">{fill(t('optimization.resultsSummary'), { examined: fmt(done.result.examined, 0), valid: fmt(done.result.examined - done.result.rejected, 0), simulated: done.simulations.length })}</p>
              {done.result.candidates.length === 0 ? <div className="alert warn"><div>{t('optimization.noCandidate')}</div></div> : (
                <div className="tbl-wrap">
                  <table className="tbl opt-table">
                    <thead><tr><th>#</th><th>{t('optimization.family.module')}</th><th>{t('optimization.family.battery')}</th><th>{t('optimization.family.inverter')}</th><th>SRI</th><th>LPSP</th><th>{t('optimization.cost')}<span className="unit">{money}</span></th><th /></tr></thead>
                    <tbody>
                      {done.result.candidates.map((candidate, index) => {
                        const simulation = done.simulations[index] ?? null;
                        return (
                          <tr key={candidate.stableKey} className={candidate.rank === 1 ? 'is-best' : undefined}>
                            <td>{candidate.rank}</td>
                            <td><b>{candidate.output.pv.totalModules} ×</b> <span title={maker(candidate.input.module.id)}>{label(candidate.input.module.id)}</span><br /><span className="label">{fmt(candidate.output.pv.obtainedPowerKwc, 2)} kWc · {signed(candidate.relativeOversize.pv * 100, 0)} %</span></td>
                            <td><b>{candidate.output.battery.totalUnits} ×</b> <span title={maker(candidate.input.battery.id)}>{label(candidate.input.battery.id)}</span><br /><span className="label">{fmt(candidate.output.battery.usefulEnergyKwh, 1)} kWh · {signed(candidate.relativeOversize.storage * 100, 0)} %</span></td>
                            <td><b>{candidate.output.inverter.count} ×</b> <span title={maker(candidate.input.inverter.id)}>{label(candidate.input.inverter.id)}</span><br /><span className="label">{fmt(candidate.output.inverter.obtainedPowerKw, 1)} kW · {signed(candidate.relativeOversize.inverter * 100, 0)} %</span></td>
                            <td className="num">{simulation === null ? '—' : fmt(simulation.sri, 3)}</td>
                            <td className="num">{simulation === null ? '—' : `${fmt(simulation.lpsp * 100, 1)} %`}</td>
                            <td className="num">{candidate.completeCostMinor === null ? '—' : fmt(candidate.completeCostMinor, 0)}</td>
                            <td><button type="button" className="btn btn-ok" onClick={() => onRetain(candidate)}>{t('optimization.retain')}</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="label">{t('optimization.simulatedNote')}</p>
            </>}
          </section>
        )}
      </div>
    </Dialog>
  );
}
