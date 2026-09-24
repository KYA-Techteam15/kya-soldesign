import { estimateMainEquipmentCost } from './economics.js';
import { SizingEngine } from './engine.js';
import type { SizingInputV1, SizingOutputV1 } from './contracts.js';
import type { OptimizationCandidate, OptimizationCosts, OptimizationRequest, OptimizationResult, SelectionScope } from './optimization-contracts.js';

export async function optimizeSizing(input: {
  readonly base: Omit<SizingInputV1, 'selectedEquipment'>;
  readonly request: OptimizationRequest;
  readonly modules: readonly SizingInputV1['selectedEquipment']['module'][];
  readonly batteries: readonly SizingInputV1['selectedEquipment']['battery'][];
  readonly inverters: readonly SizingInputV1['selectedEquipment']['inverter'][];
  readonly costs?: OptimizationCosts;
  readonly onProgress?: (progress: { readonly completed: number; readonly total: number }) => void;
  /** Rend la main à l'hôte (interface) à intervalles réguliers ; sans effet par défaut. */
  readonly yieldControl?: () => Promise<void>;
}): Promise<OptimizationResult> {
  if (!input.request.enabled) return { status: 'blocked', code: 'OPTIMIZATION_DISABLED', message: 'Optimization requires explicit activation' };
  const modules = inScope(input.modules, input.request.module);
  const batteries = inScope(input.batteries, input.request.battery);
  const inverters = inScope(input.inverters, input.request.inverter);
  const total = modules.length * batteries.length * inverters.length;
  if (total === 0) return { status: 'blocked', code: 'OPTIMIZATION_SCOPE_EMPTY', message: 'At least one eligible reference is required in each scope' };
  if (input.request.objective === 'lowest-main-equipment-cost' && !hasCompleteCosts(input.costs)) return { status: 'blocked', code: 'OPTIMIZATION_COST_OBJECTIVE_UNAVAILABLE', message: 'The cost objective requires all three specific costs' };
  const engine = new SizingEngine();
  const candidates: OptimizationCandidate[] = [];
  let completed = 0; let rejected = 0;
  for (const module of modules) for (const battery of batteries) for (const inverter of inverters) {
    const sizingInput: SizingInputV1 = { ...input.base, selectedEquipment: { module, battery, inverter } };
    const envelope = await engine.calculate(sizingInput);
    completed += 1; input.onProgress?.({ completed, total });
    if (completed % 50 === 0) await input.yieldControl?.();
    if (!envelope.output.valid) { rejected += 1; continue; }
    const metrics = metricsFor(envelope.output, input.base);
    const limits = input.request.maxOversizeRatio;
    if (metrics.pv < 0 || metrics.storage < 0 || metrics.inverter < 0 || (limits?.pv !== undefined && metrics.pv > limits.pv) || (limits?.storage !== undefined && metrics.storage > limits.storage) || (limits?.inverter !== undefined && metrics.inverter > limits.inverter)) { rejected += 1; continue; }
    const completeCost = input.costs === undefined ? null : estimateMainEquipmentCost({ pvKwc: envelope.output.pv.obtainedPowerKwc, storageKwh: envelope.output.battery.obtainedEnergyKwh, inverterKw: envelope.output.inverter.obtainedPowerKw, pvSpecificCostMinorPerKw: input.costs.pvSpecificCostMinorPerKw, storageSpecificCostMinorPerKwh: input.costs.storageSpecificCostMinorPerKwh, inverterSpecificCostMinorPerKw: input.costs.inverterSpecificCostMinorPerKw });
    candidates.push({ rank: 0, input: { module, battery, inverter }, output: envelope.output, relativeOversize: metrics, maxOversize: Math.max(metrics.pv, metrics.storage, metrics.inverter), sumOversize: metrics.pv + metrics.storage + metrics.inverter, componentCount: envelope.output.pv.totalModules + envelope.output.battery.totalUnits + envelope.output.inverter.count, completeCostMinor: completeCost?.status === 'available' ? completeCost.mainEquipmentMinor : null, stableKey: `${module.id}|${battery.id}|${inverter.id}`, justification: justificationFor(input.request.objective, metrics), status: 'proposed' });
  }
  const sorted = candidates.toSorted((left, right) => compareCandidates(left, right, input.request.objective));
  const limit = Math.max(1, Math.min(input.request.topN ?? 5, sorted.length));
  return { status: 'complete', candidates: sorted.slice(0, limit).map((candidate, index) => ({ ...candidate, rank: index + 1 })), examined: total, rejected };
}

function inScope<T extends { readonly id: string }>(items: readonly T[], scope: SelectionScope): readonly T[] {
  if (scope.mode === 'free') return items;
  if (scope.mode === 'fixed') return items.filter((item) => item.id === scope.equipmentId);
  const allowed = new Set(scope.equipmentIds); return items.filter((item) => allowed.has(item.id));
}

function metricsFor(output: SizingOutputV1, base: Omit<SizingInputV1, 'selectedEquipment'>) { return { pv: output.pv.obtainedPowerKwc / base.requiredPvPowerKw - 1, storage: output.battery.usefulEnergyKwh / base.requiredStorageKwh - 1, inverter: output.inverter.obtainedPowerKw / base.requiredInverterPowerKw - 1 }; }
function hasCompleteCosts(costs: OptimizationCosts | undefined): costs is OptimizationCosts { return costs !== undefined && [costs.pvSpecificCostMinorPerKw, costs.storageSpecificCostMinorPerKwh, costs.inverterSpecificCostMinorPerKw].every((value) => value !== null && Number.isFinite(value)); }
function completeCostRank(value: number | null): number { return value === null ? Number.POSITIVE_INFINITY : value; }
function compareCandidates(left: OptimizationCandidate, right: OptimizationCandidate, objective: OptimizationRequest['objective']): number {
  const leftKey = objective === 'closest' ? [left.maxOversize, left.sumOversize, completeCostRank(left.completeCostMinor), left.componentCount] : objective === 'lowest-main-equipment-cost' ? [completeCostRank(left.completeCostMinor), left.maxOversize, left.sumOversize, left.componentCount] : [left.componentCount, left.maxOversize, left.sumOversize, completeCostRank(left.completeCostMinor)];
  const rightKey = objective === 'closest' ? [right.maxOversize, right.sumOversize, completeCostRank(right.completeCostMinor), right.componentCount] : objective === 'lowest-main-equipment-cost' ? [completeCostRank(right.completeCostMinor), right.maxOversize, right.sumOversize, right.componentCount] : [right.componentCount, right.maxOversize, right.sumOversize, completeCostRank(right.completeCostMinor)];
  for (let index = 0; index < leftKey.length; index += 1) if (leftKey[index]! !== rightKey[index]!) return leftKey[index]! - rightKey[index]!;
  return left.stableKey.localeCompare(right.stableKey);
}
function justificationFor(objective: OptimizationRequest['objective'], metrics: { readonly pv: number; readonly storage: number; readonly inverter: number }): readonly string[] { return [`objective:${objective}`, `oversize-pv:${metrics.pv.toFixed(6)}`, `oversize-storage:${metrics.storage.toFixed(6)}`, `oversize-inverter:${metrics.inverter.toFixed(6)}`]; }
