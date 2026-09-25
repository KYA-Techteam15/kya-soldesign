import type { ProjectFileV1 } from '@ksd/project-format';
import { projectFileToView, projectViewToFile } from '../models/projectAdapters.js';
import type { ApplicationSettingsV2 } from '../models/applicationSettings.js';

export function applyProjectDefaults(file: ProjectFileV1, settings: ApplicationSettingsV2): ProjectFileV1 {
  const view = projectFileToView(file); const d = settings.defaults;
  view.assumptions.systemPr = d.reliability.performanceRatioPercent; view.assumptions.lpspMax = d.reliability.maxLpspPercent; view.assumptions.lolpMax = d.reliability.maxLolpPercent;
  view.assumptions.inverterYield = d.conversion.inverterEfficiencyPercent; view.assumptions.batteryYield = d.conversion.batteryEfficiencyPercent;
  view.assumptions.pvSpecificCost = d.equipmentCosts.pvSpecificCost; view.assumptions.batterySpecificCost = d.equipmentCosts.batterySpecificCost; view.assumptions.inverterSpecificCost = d.equipmentCosts.inverterSpecificCost; view.assumptions.pvMargin = d.equipmentCosts.pvMarginPercent; view.assumptions.batteryMargin = d.equipmentCosts.batteryMarginPercent; view.assumptions.inverterMargin = d.equipmentCosts.inverterMarginPercent;
  view.costing.tvaPercent = d.commercial.vatPercent; view.costing.offerValidity = d.commercial.offerValidityDays; view.costing.productWarranty = d.commercial.warrantyMonths; view.costing.deliveryTime = d.commercial.deliveryDays; view.costing.reductionPercent = d.commercial.discountPercent; view.costing.downPaymentPercent = d.commercial.downPaymentPercent; view.currency = d.equipmentCosts.currencyCode;
  // Le chargé de projet habituel est proposé ; il reste modifiable dossier par dossier.
  if (!view.details.followerName && settings.company.officer.trim()) view.details.followerName = settings.company.officer.trim();
  if (!view.details.projectDate) view.details.projectDate = new Date().toISOString().slice(0, 10);
  return projectViewToFile(view);
}
