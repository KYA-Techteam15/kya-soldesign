import type { WorkshopStepProps } from './stepProps.js';
import { UnavailableCapability } from './UnavailableCapability.js';

export function ProtectionStep({ project }: WorkshopStepProps) {
  return <UnavailableCapability projectId={project.id} capability="protections" titleKey="workshop.protections" />;
}
