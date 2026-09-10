import type { CableSizingInput, CableSizingResult, ProtectionSizingInput, ProtectionSizingResult, ProtectionType } from './contracts.js';
export const STANDARD_SECTIONS = [1.5,2.5,4,6,10,16,25,35,50,70,95,120,150,185,240,300,400,500,630] as const;
const GPV=[2,4,6,8,10,12,15,16,20,25,32,40,50,63,80,100,125,160,200];
const GG=[10,16,20,25,32,40,50,63,80,100,125,160,200,250];
const AC=[6,10,16,20,25,32,40,50,63];
const rho={ copper:0.01851, aluminium:0.0283 } as const;
const up=(n:number, values:readonly number[])=>values.find(v=>v>=n) ?? null;
const finite=(n:number)=>Number.isFinite(n)&&n>0?n:0;
export function sizeProtectionSegment(i: ProtectionSizingInput): ProtectionSizingResult {
  let requiredA=0, voltage= i.acVoltageV || 230, recommended: ProtectionType; let quantity=i.poles??1; const allowedTypes: readonly ProtectionType[] = i.segment === 'pv_inverter' ? ['Fusible gPV', 'Disjoncteur DC'] : i.segment === 'inverter_battery' ? ['Fusible gG', 'Disjoncteur DC'] : ['Disjoncteur AC'];
  if(i.segment==='pv_inverter'){ requiredA=1.5*finite(i.moduleIscA??0); voltage=1.2*(i.pvModulesInSeries??1)*finite(i.moduleVocV??0); recommended='Fusible gPV'; quantity=i.pvStrings??1; }
  else if(i.segment==='inverter_battery'){ requiredA=1.25*finite(i.inverterPowerW)/(i.dcVoltageV||1); voltage=i.dcVoltageV||0; recommended='Disjoncteur DC'; quantity=i.poles??1; }
  else { requiredA=1.25*finite(i.inverterPowerW)/(i.acVoltageV||230); voltage=i.acVoltageV||230; recommended='Disjoncteur AC'; quantity=i.poles??1; }
  const legacyAuto = i.selectedType === undefined;
  const selectedType = legacyAuto ? recommended : i.selectedType ?? null;
  // Sans courant à couvrir, aucun calibre ne peut être déclaré valable : tous
  // les passeraient. Le segment est indisponible tant que le dimensionnement
  // n'a rien produit, plutôt que « validé » contre une exigence nulle.
  const sizeable = requiredA > 0;
  const options = selectedType === null || !sizeable ? [] : ratingSeries(selectedType).filter((value) => value >= requiredA && (i.maximumCurrentA === null || i.maximumCurrentA === undefined || value <= i.maximumCurrentA));
  const selectedRating = i.selectedCaliberA ?? null;
  const usesFallback = sizeable && selectedType !== null && options.length === 0;
  const caliberA = !sizeable ? null : selectedRating !== null && options.includes(selectedRating) ? selectedRating : options[0] ?? (usesFallback ? requiredA : null);
  const state = !sizeable ? 'unavailable' : selectedType === null ? 'awaiting-type' : usesFallback ? 'estimated' : caliberA === null ? 'awaiting-rating' : 'valid';
  return { segment:i.segment, kind:selectedType ?? recommended, allowedTypes, selectedType:legacyAuto ? null : selectedType, requiredA, minimumCurrentA:requiredA, maximumCurrentA:i.maximumCurrentA ?? null, serviceVoltageV:voltage, quantity, options, compatibleRatingsA:options, caliberA, selectedRatingA:caliberA, exact:state === 'valid', overridden:caliberA !== null && options.length > 0 && caliberA !== options[0], state, methodVersion:'core-v1' };
}
export function sizeCableSegment(i: CableSizingInput): CableSizingResult {
  const current=finite(i.currentA), voltage=finite(i.voltageV), length=Math.max(0,finite(i.lengthM)); const maxDrop=i.maxDropPercent ?? 3; const b=i.phase==='three_phase'?Math.sqrt(3):2; const factor=1; const resistivity=rho[i.material]; const issues:string[]=[]; if(current<=0) issues.push('CURRENT_MISSING'); if(voltage<=0) issues.push('VOLTAGE_MISSING'); if(length<=0) issues.push('LENGTH_INVALID'); if(maxDrop<=0) issues.push('MAX_VOLTAGE_DROP_INVALID'); if(issues.length>0) return {segment:i.segment,state:'blocked',currentA:current,voltageV:voltage,minimalSection:0,normalizedSection:0,dropPercent:0,maxDropPercent:maxDrop,thermalSection:0,voltageDropSection:0,governingConstraint:'thermal',resistivity,correctionFactor:factor,issues}; const voltageDropSection=resistivity*length*current*factor*b/(voltage*(maxDrop/100)); const thermal=current/(i.material==='copper'?5:3); const minimal=Math.max(voltageDropSection,thermal); const normalized=up(minimal,STANDARD_SECTIONS); const drop=normalized===null||voltage===0?0:resistivity*length*current*factor*b/(normalized*voltage)*100; const governingConstraint=voltageDropSection>thermal?'voltage-drop':'thermal'; return {segment:i.segment,state:normalized===null?'unavailable':'valid',currentA:current,voltageV:voltage,minimalSection:minimal,normalizedSection:normalized??0,dropPercent:drop,maxDropPercent:maxDrop,thermalSection:thermal,voltageDropSection,governingConstraint,resistivity,correctionFactor:factor,issues:normalized===null?['NO_STANDARD_SECTION']:[]};
}
export type { ProtectionSegment } from './contracts.js';

function ratingSeries(type: ProtectionType): readonly number[] { return type === 'Fusible gPV' ? GPV : type === 'Fusible gG' ? GG : type === 'Disjoncteur AC' ? AC : GPV; }
