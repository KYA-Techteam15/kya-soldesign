import type { WorkshopStepProps } from './stepProps.js';
import { UnavailableCapability } from './UnavailableCapability.js';

export function PresizingStep({ project }: WorkshopStepProps) {
  return <UnavailableCapability projectId={project.id} capability="presizing" titleKey="workshop.presizing" />;
}
