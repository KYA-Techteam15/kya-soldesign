import type { WorkshopStepProps } from './stepProps.js';
import { UnavailableCapability } from './UnavailableCapability.js';

export function FinanceStep({ project }: WorkshopStepProps) {
  return <UnavailableCapability projectId={project.id} capability="finance" titleKey="workshop.finance" />;
}
