export * from './contracts.js';
export * from './labels.js';
export * from './symbols.js';
export * from './topology.js';
export { layoutDiagram } from './layout/index.js';
export { renderDiagramSvg } from './render.js';

import type { DiagramPlan, SingleLineTopology } from './contracts.js';
import type { DiagramLabels } from './labels.js';
import { FR_LABELS } from './labels.js';
import { buildTopology, type TopologySource } from './topology.js';
import { layoutDiagram } from './layout/index.js';
import { renderDiagramSvg } from './render.js';

export interface GeneratedDiagram {
  readonly topology: SingleLineTopology;
  readonly plan: DiagramPlan;
  readonly svg: string;
}

/** Chaîne complète : dimensionnement → topologie → planche → SVG. */
export function generateSingleLineDiagram(source: TopologySource): GeneratedDiagram {
  const labels: DiagramLabels = source.labels ?? FR_LABELS;
  const topology = buildTopology(source);
  const plan = layoutDiagram(topology, labels);
  return { topology, plan, svg: renderDiagramSvg(plan, labels) };
}
