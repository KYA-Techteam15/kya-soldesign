import type { Project } from '../../domain/types.js';

/**
 * Shape consumed by the validated UI. It is a projection, never a persistence
 * contract or a calculation request. The alias is temporary until the copied
 * prototype type file is deleted in Phase 5.
 */
export type ProjectViewModel = Project;
