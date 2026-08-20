import type { AioSizingEnvelopeV1, AioSizingOutputV1, PresizingEnvelopeV1, PresizingProgress, SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import { AioSizingEngine, PresizingEngine } from '@ksd/engine';
import type { Locality, NormalizedHourlyProfile, WeatherSource } from '@ksd/domain';
import type { ProjectFileV1 } from '@ksd/project-format';
import type { CalculationCapabilityPort, CapabilityId, CapabilityState } from '../contracts.js';
import { unavailableCalculations } from './unavailableCalculations.js';
import { projectToAioInput, projectToPresizingInput, projectToSolarAnalysis } from './projectToAio.js';

export class AioCalculations implements CalculationCapabilityPort {
  private readonly engine = new AioSizingEngine();
  private readonly presizingEngine = new PresizingEngine();
  private readonly presizingResults = new Map<string, PresizingEnvelopeV1>();

  public constructor(
    private readonly getProject: (id: string) => ProjectFileV1 | null,
    private readonly references: { readonly localities: readonly Locality[]; readonly weatherSources: readonly WeatherSource[]; readonly loadProfiles: readonly NormalizedHourlyProfile[] },
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
      const envelope = this.presizingResults.get(projectId);
      return envelope === undefined
        ? { status: 'empty', messageKey: 'PRESIZING_NOT_RUN' }
        : { status: 'ready', runId: `${project.id}:${envelope.inputHash}`, createdAt: project.updatedAt, envelope: envelope as never };
    }
    const adapted = await projectToAioInput(project, this.references);
    if (adapted.status === 'blocked') return { status: 'empty', messageKey: adapted.issues.map((issue) => issue.code).join(',') };
    const calculated = await this.engine.calculate({ system: 'standalone-all-in-one', input: adapted.input });
    const normalizationWarnings = adapted.warnings.map((warning) => ({
      code: warning.code,
      severity: 'warning' as const,
      message: warning.message,
      sourceId: 'UI-AIO-001',
    }));
    const envelope: AioSizingEnvelopeV1 = {
      ...calculated,
      warnings: [...adapted.warnings, ...calculated.warnings],
      issues: [...normalizationWarnings, ...calculated.issues],
    };
    return {
      status: 'ready',
      runId: `${project.id}:${envelope.inputHash}`,
      createdAt: project.updatedAt,
      envelope: envelope as CapabilityState<AioSizingOutputV1> extends { status: 'ready'; envelope: infer E } ? E & { output: Output } : never,
    };
  }

  public async runPresizing(projectId: string, onProgress: (progress: PresizingProgress) => void): Promise<PresizingEnvelopeV1> {
    const project = this.getProject(projectId);
    if (project === null) throw new Error('PROJECT_NOT_FOUND');
    const adapted = await projectToPresizingInput(project, this.references);
    if (adapted.status === 'blocked') throw new Error(adapted.issues.map((issue) => issue.code).join(','));
    const envelope = await this.presizingEngine.calculate(adapted.input, onProgress, () => new Promise((resolve) => setTimeout(resolve, 0)));
    this.presizingResults.set(projectId, envelope);
    return envelope;
  }
}
