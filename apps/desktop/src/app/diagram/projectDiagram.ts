import type { Equipment } from '@ksd/catalog';
import { cableDesignCurrent, sizeCableSegment, sizeProtectionSegment, type CableSizingResult, type ProtectionSizingResult, type SizingOutputV1 } from '@ksd/engine';
import {
  EN_LABELS,
  FR_LABELS,
  SYNOPTIC_OPTIONS,
  generateSingleLineDiagram,
  type DiagramOptions,
  type GeneratedDiagram,
} from '@ksd/diagram';
import type { ApplicationSettingsV2 } from '../models/applicationSettings';
import type { CableSegment, ProjectViewModel } from '../models/projectView';
import { dateFr } from '../../domain/format';

/**
 * Adaptateur projet → schéma unifilaire.
 *
 * Les protections et les câbles sont recalculés ici avec les mêmes fonctions
 * que la page « Protections et câblerie » et que `ReportA4` : le plan, le
 * tableau du rapport et l'écran affichent nécessairement les mêmes calibres.
 */

const SEGMENTS: readonly CableSegment[] = ['pv_inverter', 'inverter_battery', 'inverter_load'];

const pick = (catalog: readonly Equipment[], id: string | null): Equipment | undefined =>
  catalog.find((item) => item.id === id);

const productName = (equipment: Equipment | undefined): string | null =>
  equipment ? `${equipment.manufacturer} · ${equipment.model}` : null;

export interface ProjectDiagramInput {
  readonly project: ProjectViewModel;
  readonly sizing: SizingOutputV1;
  readonly catalog: readonly Equipment[];
  readonly settings: Pick<ApplicationSettingsV2, 'company'>;
  readonly lang: 'fr' | 'en';
  readonly options?: Partial<DiagramOptions>;
}

/**
 * Protections et câbles d'un projet : seule fonction appelée par la page
 * « Protections et câblerie », le schéma et les documents. Sans dimensionnement,
 * les courants restent inconnus et chaque tronçon est « indisponible ».
 */
export function projectProtections(
  project: ProjectViewModel,
  sizing: SizingOutputV1 | null,
  catalog: readonly Equipment[],
): { protections: ProtectionSizingResult[]; cables: CableSizingResult[] } {
  const module = pick(catalog, project.selection.moduleId);
  const inverter = pick(catalog, project.selection.inverterId);
  const pv = module?.kind === 'pv-module' ? module : undefined;
  const inv = inverter?.kind === 'inverter' ? inverter : undefined;

  const inverterPowerW = sizing === null ? 0 : sizing.inverter.obtainedPowerKw * 1000;
  const dcVoltageV = sizing === null ? 0 : sizing.battery.bankVoltageV;

  const protections = SEGMENTS.map((segment) => {
    const choice = project.protections.find((item) => item.segment === segment);
    return sizeProtectionSegment({
      segment,
      moduleIscA: pv?.shortCircuitCurrentA,
      moduleVocV: pv?.openCircuitVoltageV,
      pvStrings: sizing?.pv.stringsInParallel || 1,
      pvModulesInSeries: sizing?.pv.modulesInSeries || 1,
      ...(sizing && sizing.pv.vocColdV > 0 ? { stringVocColdV: sizing.pv.vocColdV } : {}),
      inverterPowerW,
      dcVoltageV,
      acVoltageV: inv?.nominalAcVoltageV ?? 230,
      inverterEfficiencyRatio: project.assumptions.inverterYield / 100,
      selectedCaliberA: choice?.caliberA ?? null,
      selectedType: choice?.type ?? null,
    });
  });

  const cables = project.cables.map((cable) => {
    const protection = protections.find((item) => item.segment === cable.segment);
    // Sans calibre retenu, la section est calculée sur le calibre suggéré et reste provisoire.
    const design = protection ? cableDesignCurrent(protection) : { currentA: 0, basis: 'selected-rating' as const };
    return sizeCableSegment({
      segment: cable.segment,
      currentA: design.currentA,
      currentBasis: design.basis,
      voltageV: protection?.serviceVoltageV ?? 0,
      lengthM: cable.length,
      material: cable.material,
      installation: cable.installation,
      phase: cable.segment === 'inverter_load' ? 'single_phase' : 'dc',
      maxDropPercent: cable.maxVoltageDropPercent,
      ambientTemperatureC: project.site.downloadedSource?.ambientTemperatureMaxC ?? null,
    });
  });

  return { protections, cables };
}

/** Produit le schéma unifilaire d'un projet, planche et SVG compris. */
export function buildProjectDiagram(input: ProjectDiagramInput): GeneratedDiagram {
  const { project, sizing, catalog, settings, lang } = input;
  const { protections, cables } = projectProtections(project, sizing, catalog);

  const module = pick(catalog, project.selection.moduleId);
  const battery = pick(catalog, project.selection.batteryId);
  const inverter = pick(catalog, project.selection.inverterId);
  const pv = module?.kind === 'pv-module' ? module : undefined;
  const bat = battery?.kind === 'battery' ? battery : undefined;
  const inv = inverter?.kind === 'inverter' ? inverter : undefined;

  const lengths: Partial<Record<CableSegment, number>> = {};
  for (const cable of project.cables) lengths[cable.segment] = cable.length;

  return generateSingleLineDiagram({
    systemType: project.systemType,
    sizing,
    protections,
    cables,
    cableLengthsM: lengths,
    module: pv
      ? {
          powerW: pv.nominalPowerW,
          vocV: pv.openCircuitVoltageV,
          iscA: pv.shortCircuitCurrentA,
          product: productName(pv),
        }
      : null,
    battery: bat
      ? { voltageV: bat.nominalVoltageV, capacityAh: bat.nominalCapacityAh, product: productName(bat) }
      : null,
    inverter: inv ? { acVoltageV: inv.nominalAcVoltageV ?? null, product: productName(inv) } : null,
    title: {
      company: settings.company.name || 'KYA-SolDesign',
      project: project.name,
      client: project.details.clientName,
      reference: project.details.projectNumber,
      location: project.details.projectLocation || project.site.region,
      date: dateFr(project.details.projectDate),
      author: project.details.followerName,
      sheet: '1/1',
    },
    labels: lang === 'en' ? EN_LABELS : FR_LABELS,
    options: input.options,
  });
}

/** Gabarit condensé, destiné au rapport et à l'offre en page portrait. */
export const synopticOptions = SYNOPTIC_OPTIONS;
