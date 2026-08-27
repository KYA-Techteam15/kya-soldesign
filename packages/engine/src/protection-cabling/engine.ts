import type { CableSizingInput, CableSizingResult, ProtectionSizingInput, ProtectionSizingResult } from './contracts.js';
export const STANDARD_SECTIONS = [1.5,2.5,4,6,10,16,25,35,50,70,95,120,150,185,240,300,400,500,630] as const;
const GPV=[2,4,6,8,10,12,15,16,20,25,32,40,50,63,80,100,125,160,200];
const GG=[10,16,20,25,32,40,50,63,80,100,125,160,200,250];
const AC=[6,10,16,20,25,32,40,50,63];
const rho={ copper:0.01851, aluminium:0.0283 } as const;
const up=(n:number, values:readonly number[])=>values.find(v=>v>=n) ?? n;
const finite=(n:number)=>Number.isFinite(n)&&n>0?n:0;
export function sizeProtectionSegment(i: ProtectionSizingInput): ProtectionSizingResult {
  let requiredA=0, voltage= i.acVoltageV || 230, kind: ProtectionSizingResult['kind']; let options:readonly number[]; let quantity=i.poles??1;
  if(i.segment==='pv_inverter'){ requiredA=1.5*finite(i.moduleIscA??0); voltage=1.2*(i.pvModulesInSeries??1)*finite(i.moduleVocV??0); kind='Fusible gPV'; options=GPV; quantity=i.pvStrings??1; }
  else if(i.segment==='inverter_battery'){ requiredA=1.25*finite(i.inverterPowerW)/(i.dcVoltageV||1); voltage=i.dcVoltageV||0; kind='Disjoncteur DC'; options=GG; }
  else { requiredA=1.25*finite(i.inverterPowerW)/(i.acVoltageV||230); voltage=i.acVoltageV||230; kind='Disjoncteur AC'; options=AC; }
  const admissible=options.filter(v=>v>=requiredA); const advised=admissible[0]??requiredA; const exact=admissible.length>0; const chosen=i.selectedCaliberA??null; const caliberA=chosen!==null&&admissible.includes(chosen)?chosen:advised;
  return {segment:i.segment,kind,requiredA,serviceVoltageV:voltage,quantity,options:admissible,caliberA,exact,overridden:caliberA!==advised};
}
export function sizeCableSegment(i: CableSizingInput): CableSizingResult {
  const current=finite(i.currentA), voltage=finite(i.voltageV), length=Math.max(0,finite(i.lengthM)); const maxDrop=i.maxDropPercent??3; const b=i.phase==='three_phase'?Math.sqrt(3):2; const factor=1; const resistivity=rho[i.material]; const theoretical=voltage===0||maxDrop<=0?0:resistivity*length*current*factor*b/(voltage*(maxDrop/100)); const thermal=current/(i.material==='copper'?5:3); const minimal=Math.max(theoretical,thermal); const normalized=up(minimal,STANDARD_SECTIONS); const drop=normalized===0||voltage===0?0:resistivity*length*current*factor*b/(normalized*voltage)*100; return {segment:i.segment,currentA:current,voltageV:voltage,minimalSection:minimal,normalizedSection:normalized,dropPercent:drop,maxDropPercent:maxDrop,thermalSection:thermal,resistivity,correctionFactor:factor};
}
export type { ProtectionSegment } from './contracts.js';
