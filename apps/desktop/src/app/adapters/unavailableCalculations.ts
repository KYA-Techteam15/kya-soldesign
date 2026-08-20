import type { CalculationCapabilityPort, CapabilityId, CapabilityState, RoadmapFeatureId } from '../contracts.js';

const owners: Readonly<Record<CapabilityId, RoadmapFeatureId>> = {
  presizing: 'AIO-001',
  sizing: 'AIO-001',
  'solar-resource': 'AIO-001',
  reliability: 'SIM-001',
  'equipment-compatibility': 'EQP-001',
  protections: 'SAFE-001',
  finance: 'FIN-001',
  dossier: 'DOC-001',
};

export const unavailableCalculations: CalculationCapabilityPort = {
  async read<Output>(_projectId: string, capability: CapabilityId): Promise<CapabilityState<Output>> {
    return {
      status: 'unavailable',
      capability,
      reasonKey: `capability.${capability}.unavailable`,
      roadmapOwner: owners[capability],
    };
  },
  async runPresizing() { throw new Error('PRESIZING_UNAVAILABLE'); },
};
