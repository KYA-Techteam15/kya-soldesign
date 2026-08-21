import type { AioSizingEnvelopeV1, AioSizingOutputV1, PresizingEnvelopeV1, PresizingProgress, SizingEnvelopeV1, SizingProgress, SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import { AioSizingEngine, PresizingEngine, SizingEngine, compatibleInverters } from '@ksd/engine';
import type { Equipment } from '@ksd/catalog';
import type { Locality, NormalizedHourlyProfile, WeatherSource } from '@ksd/domain';
import type { ProjectFileV1 } from '@ksd/project-format';
import type { CalculationCapabilityPort, CapabilityId, CapabilityState } from '../contracts.js';
import { unavailableCalculations } from './unavailableCalculations.js';
import { projectToAioInput, projectToPresizingInput, projectToSizingInput, projectToSolarAnalysis } from './projectToAio.js';

export class AioCalculations implements CalculationCapabilityPort {
  private readonly engine = new AioSizingEngine();
  private readonly presizingEngine = new PresizingEngine();
  private readonly sizingEngine = new SizingEngine();
  private readonly presizingResults = new Map<string, PresizingEnvelopeV1>();

  public constructor(
    private readonly getProject: (id: string) => ProjectFileV1 | null,
    private readonly references: { readonly localities: readonly Locality[]; readonly weatherSources: readonly WeatherSource[]; readonly loadProfiles: readonly NormalizedHourlyProfile[]; readonly equipment?: readonly Equipment[] },
    private readonly saveProject: (project: ProjectFileV1) => void = () => undefined,
  ) {}

  public async read<Output>(projectId: string, capability: CapabilityId): Promise<CapabilityState<Output>> {
    if (capability !== 'presizing' && capability !== 'sizing' && capability !== 'solar-resource') return unavailableCalculations.read(projectId, capability);
    const project = this.getProject(projectId);
    if (project === null) return { status: 'error', code: 'PROJECT_NOT_FOUND', messageKey: 'state.projectNotFound', retryable: false };
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
    if (this.references.equipment === undefined) return this.readLegacySizing<Output>(project);
    const adapted = projectToSizingInput(project, this.references.equipment);
    if (adapted.status === 'blocked') return { status: 'empty', messageKey: adapted.issues.map((issue) => issue.code).join(',') };
    const envelope = project.sizingCalculation as SizingEnvelopeV1 | null | undefined;
    if (envelope === undefined || envelope === null) return { status: 'empty', messageKey: 'SIZING_NOT_RUN' };
    const currentHash = hash(JSON.stringify(adapted.input));
    if (envelope.inputHash !== currentHash) return { status: 'stale', previousRunId: project.id + ':' + envelope.inputHash, previousInputHash: envelope.inputHash, currentInputHash: currentHash, reasonKey: 'state.calculationStale' };
    return {
      status: 'ready',
      runId: `${project.id}:${envelope.inputHash}`,
      createdAt: project.updatedAt,
      envelope: envelope as never,
    };
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
    if (this.references.equipment === undefined) throw new Error('EQUIPMENT_CATALOG_MISSING');
    const adapted = projectToSizingInput(project, this.references.equipment);
    if (adapted.status === 'blocked') throw new Error(adapted.issues.map((issue) => issue.code).join(','));
    const envelope = await this.sizingEngine.calculate(adapted.input, onProgress, () => new Promise((resolve) => setTimeout(resolve, 0)));
    this.saveProject({ ...project, updatedAt: new Date().toISOString(), sizingCalculation: envelope });
    return envelope;
  }

  public async compatibleInverterIds(projectId: string): Promise<readonly string[]> {
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
    return compatibleInverters(base.input, snapshots).map((candidate) => candidate.inverterId);
  }
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return (result >>> 0).toString(16).padStart(8, '0');
}
