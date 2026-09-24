import type { CompatibleInverterCandidate, RetainedSystemSimulationV1, AioSizingEnvelopeV1, AioSizingOutputV1, PresizingEnvelopeV1, PresizingProgress, SizingEnvelopeV1, SizingProgress, SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import { AioSizingEngine, FinanceEngine, PresizingEngine, SizingEngine, compatibleInverters, hashInput, simulateRetainedSystem } from '@ksd/engine';
import { memoize } from '../calculation/memo.js';
import type { Equipment } from '@ksd/catalog';
import type { Locality, NormalizedHourlyProfile, WeatherSource } from '@ksd/domain';
import type { ProjectFileV1 } from '@ksd/project-format';
import type { CalculationCapabilityPort, CapabilityId, CapabilityState } from '../contracts.js';
import { unavailableCalculations } from './unavailableCalculations.js';
import { isIssuedSnapshotId } from '../models/projectLifecycle.js';
import { projectToAioInput, projectToFinanceInput, projectToPresizingInput, projectToSizingInput, projectToSolarAnalysis } from './projectToAio.js';

export class AioCalculations implements CalculationCapabilityPort {
  private readonly engine = new AioSizingEngine();
  private readonly presizingEngine = new PresizingEngine();
  private readonly sizingEngine = new SizingEngine();
  private readonly financeEngine = new FinanceEngine();
  private readonly presizingResults = new Map<string, PresizingEnvelopeV1>();

  public constructor(
    private readonly getProject: (id: string) => ProjectFileV1 | null,
    private readonly references: { readonly localities: readonly Locality[]; readonly weatherSources: readonly WeatherSource[]; readonly loadProfiles: readonly NormalizedHourlyProfile[]; readonly equipment?: readonly Equipment[] },
    private readonly saveProject: (project: ProjectFileV1) => void = () => undefined,
  ) {}

  public async read<Output>(projectId: string, capability: CapabilityId): Promise<CapabilityState<Output>> {
    if (capability !== 'presizing' && capability !== 'sizing' && capability !== 'solar-resource' && capability !== 'finance') return unavailableCalculations.read(projectId, capability);
    const project = this.getProject(projectId);
    if (project === null) return { status: 'error', code: 'PROJECT_NOT_FOUND', messageKey: 'state.projectNotFound', retryable: false };
    // Version émise : ses calculs font foi tels qu'ils ont été remis, même si le catalogue a
    // évolué depuis ; les documents doivent se réimprimer à l'identique.
    if (isIssuedSnapshotId(projectId) && (capability === 'presizing' || capability === 'sizing')) {
      const frozen = capability === 'presizing' ? project.lastCalculation : project.sizingCalculation ?? null;
      return frozen === null
        ? { status: 'empty', messageKey: capability === 'presizing' ? 'PRESIZING_NOT_RUN' : 'SIZING_NOT_RUN' }
        : { status: 'ready', runId: `${projectId}:${frozen.inputHash}`, createdAt: project.updatedAt, envelope: frozen as never };
    }
    if (capability === 'solar-resource') {
      const solarAnalysis = projectToSolarAnalysis(project, this.references);
      if (solarAnalysis === null) return { status: 'empty', messageKey: 'WEATHER_FILE_MISSING' };
      return {
        status: 'ready',
        runId: `${project.id}:${solarAnalysis.inputHash}`,
        createdAt: project.updatedAt,
        envelope: solarAnalysis as CapabilityState<SolarResourceAnalysisOutputV1> extends { status: 'ready'; envelope: infer E } ? E & { output: Output } : never,
      };
    }
    if (capability === 'presizing') {
      const adapted = await projectToPresizingInput(project, this.references);
      if (adapted.status === 'blocked') return { status: 'empty', messageKey: adapted.issues.map((issue) => issue.code).join(',') };
      const envelope = (project.lastCalculation ?? this.presizingResults.get(projectId)) as PresizingEnvelopeV1 | undefined;
      if (envelope === undefined) return { status: 'empty', messageKey: 'PRESIZING_NOT_RUN' };
      const currentHash = hash(JSON.stringify(adapted.input));
      return envelope.inputHash !== currentHash
        ? { status: 'stale', previousRunId: `${project.id}:${envelope.inputHash}`, previousInputHash: envelope.inputHash, currentInputHash: currentHash, reasonKey: 'state.calculationStale' }
        : { status: 'ready', runId: `${project.id}:${envelope.inputHash}`, createdAt: project.updatedAt, envelope: envelope as never };
    }
    if (capability === 'finance') {
      // Le chiffrage décrit le système retenu : il n'existe pas sans un
      // dimensionnement valide calculé sur les entrées et la sélection actuelles.
      const sizing = await this.sizingFreshness(project);
      if (sizing.status === 'stale') return { status: 'stale', previousRunId: `${project.id}:${sizing.previousHash}`, previousInputHash: sizing.previousHash, currentInputHash: sizing.currentHash, reasonKey: 'state.sizingStale' };
      if (sizing.status !== 'ready') return { status: 'empty', messageKey: sizing.code };
      const cacheKey = `${project.id}:${project.updatedAt}`;
      const adapted = await projectToFinanceInput(project, this.references);
      if (adapted.status === 'blocked') return { status: 'empty', messageKey: adapted.issues.map((issue) => issue.code).join(',') };
      const envelope = this.financeCache(cacheKey, () => this.financeEngine.calculate(adapted.input));
      return { status: 'ready', runId: `${project.id}:${envelope.inputHash}`, createdAt: project.updatedAt, envelope: envelope as never };
    }
    if (this.references.equipment === undefined) return this.readLegacySizing<Output>(project);
    const adapted = projectToSizingInput(project, this.references.equipment);
    if (adapted.status === 'blocked') return { status: 'empty', messageKey: adapted.issues.map((issue) => issue.code).join(',') };
    const envelope = project.sizingCalculation as SizingEnvelopeV1 | null | undefined;
    if (envelope === undefined || envelope === null) return { status: 'empty', messageKey: 'SIZING_NOT_RUN' };
    const currentHash = hash(JSON.stringify(adapted.input));
    if (envelope.inputHash !== currentHash) return { status: 'stale', previousRunId: project.id + ':' + envelope.inputHash, previousInputHash: envelope.inputHash, currentInputHash: currentHash, reasonKey: 'state.calculationStale' };
    // Le système retenu a été dimensionné pour les besoins du prédimensionnement :
    // si celui-ci est périmé (charge, météo, hypothèses modifiées), le système l'est aussi.
    if (await this.presizingIsStale(project)) return { status: 'stale', previousRunId: project.id + ':' + envelope.inputHash, previousInputHash: envelope.inputHash, currentInputHash: currentHash, reasonKey: 'state.presizingStale' };
    return {
      status: 'ready',
      runId: `${project.id}:${envelope.inputHash}`,
      createdAt: project.updatedAt,
      envelope: envelope as never,
    };
  }

  private readonly financeCache = memoize<ReturnType<FinanceEngine['calculate']>>(16);

  /** Le dimensionnement enregistré correspond-il encore aux entrées et à la sélection ? */
  /** Le prédimensionnement enregistré correspond-il encore aux entrées ? */
  private async presizingIsStale(project: ProjectFileV1): Promise<boolean> {
    const envelope = project.lastCalculation as PresizingEnvelopeV1 | null;
    if (envelope === null) return false;
    const adapted = await projectToPresizingInput(project, this.references);
    return adapted.status === 'ready' && hash(JSON.stringify(adapted.input)) !== envelope.inputHash;
  }

  private async sizingFreshness(project: ProjectFileV1): Promise<{ readonly status: 'ready' } | { readonly status: 'stale'; readonly previousHash: string; readonly currentHash: string } | { readonly status: 'missing'; readonly code: string }> {
    const envelope = project.sizingCalculation as SizingEnvelopeV1 | null | undefined;
    if (envelope === undefined || envelope === null) return { status: 'missing', code: 'SIZING_NOT_RUN' };
    if (this.references.equipment === undefined || isIssuedSnapshotId(project.id)) return envelope.output.valid ? { status: 'ready' } : { status: 'missing', code: 'SIZING_INVALID' };
    const adapted = projectToSizingInput(project, this.references.equipment);
    if (adapted.status === 'blocked') return { status: 'missing', code: adapted.issues.map((issue) => issue.code).join(',') };
    const currentHash = hashInput(adapted.input);
    if (currentHash !== envelope.inputHash || await this.presizingIsStale(project)) return { status: 'stale', previousHash: envelope.inputHash, currentHash };
    return envelope.output.valid ? { status: 'ready' } : { status: 'missing', code: 'SIZING_INVALID' };
  }

  private async readLegacySizing<Output>(project: ProjectFileV1): Promise<CapabilityState<Output>> {
    const adapted = await projectToAioInput(project, this.references);
    if (adapted.status === 'blocked') return { status: 'empty', messageKey: adapted.issues.map((issue) => issue.code).join(',') };
    const calculated = await this.engine.calculate({ system: 'standalone-all-in-one', input: adapted.input });
    const normalizationWarnings = adapted.warnings.map((warning) => ({ code: warning.code, severity: 'warning' as const, message: warning.message, sourceId: 'UI-AIO-001' }));
    const envelope: AioSizingEnvelopeV1 = { ...calculated, warnings: [...adapted.warnings, ...calculated.warnings], issues: [...normalizationWarnings, ...calculated.issues] };
    return { status: 'ready', runId: project.id + ':' + envelope.inputHash, createdAt: project.updatedAt, envelope: envelope as CapabilityState<AioSizingOutputV1> extends { status: 'ready'; envelope: infer E } ? E & { output: Output } : never };
  }

  public async runPresizing(projectId: string, onProgress: (progress: PresizingProgress) => void): Promise<PresizingEnvelopeV1> {
    const project = this.getProject(projectId);
    if (project === null) throw new Error('PROJECT_NOT_FOUND');
    if (project.issue?.locked === true) throw new Error('PROJECT_ISSUED');
    const adapted = await projectToPresizingInput(project, this.references);
    if (adapted.status === 'blocked') throw new Error(adapted.issues.map((issue) => issue.code).join(','));
    const envelope = await this.presizingEngine.calculate(adapted.input, onProgress, () => new Promise((resolve) => setTimeout(resolve, 0)));
    this.presizingResults.set(projectId, envelope);
    this.saveProject({ ...project, updatedAt: new Date().toISOString(), lastCalculation: envelope });
    return envelope;
  }

  public async runSizing(projectId: string, onProgress: (progress: SizingProgress) => void): Promise<SizingEnvelopeV1> {
    const project = this.getProject(projectId);
    if (project === null) throw new Error('PROJECT_NOT_FOUND');
    if (project.issue?.locked === true) throw new Error('PROJECT_ISSUED');
    if (this.references.equipment === undefined) throw new Error('EQUIPMENT_CATALOG_MISSING');
    const adapted = projectToSizingInput(project, this.references.equipment);
    if (adapted.status === 'blocked') throw new Error(adapted.issues.map((issue) => issue.code).join(','));
    const envelope = await this.sizingEngine.calculate(adapted.input, onProgress, () => new Promise((resolve) => setTimeout(resolve, 0)));
    this.saveProject({ ...project, updatedAt: new Date().toISOString(), sizingCalculation: envelope });
    return envelope;
  }

  public async compatibleInverters(projectId: string): Promise<readonly CompatibleInverterCandidate[]> {
    const project = this.getProject(projectId);
    if (project === null || this.references.equipment === undefined) return [];
    const selected = project.selectedEquipmentIds;
    if (selected[0] === null || selected[1] === null) return [];
    const seedInverter = this.references.equipment.find((item) => item.kind === 'inverter');
    if (seedInverter === undefined) return [];
    const base = projectToSizingInput({ ...project, selectedEquipmentIds: [selected[0], selected[1], selected[2] ?? seedInverter.id] }, this.references.equipment);
    if (base.status === 'blocked') return [];
    const inverters = this.references.equipment.filter((item) => item.kind === 'inverter');
    const snapshots = inverters.map((item) => ({ id: item.id, acPowerW: item.nominalAcPowerW, dcVoltageV: item.nominalDcVoltageV, surgePowerW: item.surgePowerW, mpptMinV: item.mpptMinVoltageV, mpptMaxV: item.mpptMaxVoltageV, pvMaxPowerW: item.pvArrayMaxPowerW, vocMaxV: item.pvOpenCircuitMaxVoltageV, maxChargingCurrentA: item.maxChargingCurrentA, maxParallelUnits: item.maxParallelUnits, canBeInParallel: item.canBeInParallel }));
    return compatibleInverters(base.input, snapshots);
  }

  /**
   * Simule sur l'année des systèmes candidats, avec la charge, la météo et les rendements du projet :
   * les propositions de l'optimisation affichent un SRI et une LPSP simulés, pas ceux du
   * prédimensionnement. `null` si le projet ne permet pas encore de simuler.
   */
  public async simulateSystems(projectId: string, systems: readonly { readonly pvPeakKw: number; readonly storageKwh: number; readonly inverterKw: number }[]): Promise<readonly RetainedSystemSimulationV1[] | null> {
    const project = this.getProject(projectId);
    if (project === null) return null;
    const adapted = await projectToPresizingInput(project, this.references);
    if (adapted.status !== 'ready') return null;
    const p = adapted.input;
    const hourlyLoadKwh = p.hourlyLoadWh.map((value) => value / 1000);
    return systems.map((system) => simulateRetainedSystem({ ...system, hourlyLoadKwh, hourlyPoaWm2: p.hourlyPoaWm2, systemPerformanceRatio: p.systemPr, inverterEfficiencyRatio: p.inverterEfficiency, batteryEfficiencyRatio: p.batteryEfficiency }));
  }
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return (result >>> 0).toString(16).padStart(8, '0');
}
