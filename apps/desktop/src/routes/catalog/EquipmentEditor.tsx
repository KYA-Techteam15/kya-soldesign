import { useMemo, useState } from 'react';
import { validateEquipment, type Equipment } from '@ksd/catalog';
import { Dialog } from '../../ui/Dialog';
import { NumField, TextField } from '../../ui/Field';
import { useT } from '../../i18n';

type EquipmentKind = Equipment['kind'];

export function EquipmentEditor({ kind, source, onSave, onClose }: {
  readonly kind: EquipmentKind;
  readonly source?: Equipment;
  readonly onSave: (equipment: Equipment) => Promise<void>;
  readonly onClose: () => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<Equipment>(() => source ? structuredClone(source) : emptyEquipment(kind));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const validation = useMemo(() => validateEquipment(draft), [draft]);
  const errors = validation.issues.filter((issue) => issue.severity === 'error');
  const setText = (key: string, value: string) => setDraft((current) => ({ ...current, [key]: value }) as Equipment);
  const setNumber = (key: string, value: number) => setDraft((current) => ({ ...current, [key]: value }) as Equipment);
  const setNullableNumber = (key: string, value: number) => setDraft((current) => ({ ...current, [key]: value > 0 ? value : null }) as Equipment);
  const save = async () => {
    if (validation.equipment === null || errors.length > 0) return;
    setSaving(true); setSaveError(null);
    try { await onSave(validation.equipment); onClose(); }
    catch (error) { setSaveError(error instanceof Error ? error.message : 'EQUIPMENT_SAVE_FAILED'); }
    finally { setSaving(false); }
  };

  return <Dialog title={source ? t('equipment.editor.editTitle') : t('equipment.editor.addTitle')} lead={t(`equipment.editor.kind.${kind}`)} wide onClose={onClose} footer={<><span className="label">{t('equipment.editor.consistency')}</span><button type="button" className="btn" onClick={onClose}>{t('g.cancel')}</button><button type="button" className="btn-primary" disabled={saving || validation.equipment === null || errors.length > 0} onClick={() => void save()}>{saving ? t('equipment.editor.saving') : t('equipment.editor.save')}</button></>}>
    <div className="form-rows equipment-editor-common">
      <TextField label={t('catalog.manufacturer')} value={draft.manufacturer} onChange={(value) => setText('manufacturer', value)} />
      <TextField label={t('equipment.editor.model')} value={draft.model} onChange={(value) => setText('model', value)} />
    </div>
    {draft.kind === 'pv-module' && <div className="form-rows equipment-editor-fields">
      <TextField label={t('equipmentEditor.technologie')} value={draft.technology ?? ''} onChange={(value) => setDraft((current) => current.kind === 'pv-module' ? { ...current, technology: value || null } : current)} />
      <NumField label={t('equipmentEditor.puissanceNominale')} unit="Wc" value={draft.nominalPowerW} onChange={(value) => setNumber('nominalPowerW', value)} />
      <NumField label="Vmp" unit="V" value={draft.voltageAtMaximumPowerV} onChange={(value) => setNumber('voltageAtMaximumPowerV', value)} decimals={2} />
      <NumField label="Voc" unit="V" value={draft.openCircuitVoltageV} onChange={(value) => setNumber('openCircuitVoltageV', value)} decimals={2} />
      <NumField label="Imp" unit="A" value={draft.currentAtMaximumPowerA} onChange={(value) => setNumber('currentAtMaximumPowerA', value)} decimals={2} />
      <NumField label="Isc" unit="A" value={draft.shortCircuitCurrentA} onChange={(value) => setNumber('shortCircuitCurrentA', value)} decimals={2} />
      <NumField label={t('equipmentEditor.surface')} unit="m²" value={draft.areaM2 ?? 0} onChange={(value) => setNullableNumber('areaM2', value)} decimals={2} />
      <NumField label={t('equipmentEditor.coefficientPmax')} unit="/°C" value={draft.temperatureCoefficientPmaxPerC ?? 0} onChange={(value) => setDraft((current) => current.kind === 'pv-module' ? { ...current, temperatureCoefficientPmaxPerC: value } : current)} decimals={4} />
      <NumField label={t('equipmentEditor.coefficientVoc')} unit="/°C" value={draft.temperatureCoefficientVocPerC ?? 0} onChange={(value) => setDraft((current) => current.kind === 'pv-module' ? { ...current, temperatureCoefficientVocPerC: value } : current)} decimals={4} />
      <NumField label="NOCT" unit="°C" value={draft.nominalOperatingCellTemperatureC ?? 0} onChange={(value) => setNullableNumber('nominalOperatingCellTemperatureC', value)} decimals={1} />
    </div>}
    {draft.kind === 'battery' && <div className="form-rows equipment-editor-fields">
      <TextField label={t('equipmentEditor.technologie')} value={draft.technology ?? ''} onChange={(value) => setDraft((current) => current.kind === 'battery' ? { ...current, technology: value || null } : current)} />
      <NumField label={t('equipmentEditor.tensionNominale')} unit="V" value={draft.nominalVoltageV} onChange={(value) => setNumber('nominalVoltageV', value)} decimals={1} />
      <NumField label={t('equipmentEditor.capaciteNominale')} unit="Ah" value={draft.nominalCapacityAh} onChange={(value) => setNumber('nominalCapacityAh', value)} />
      <NumField label={t('equipmentEditor.energieNominale')} unit="kWh" value={draft.nominalEnergyWh / 1000} onChange={(value) => setNumber('nominalEnergyWh', value * 1000)} decimals={2} />
      <NumField label={t('equipmentEditor.profondeurUtile')} unit="%" value={(draft.usableDepthOfDischargeRatio ?? 0) * 100} onChange={(value) => setDraft((current) => current.kind === 'battery' ? { ...current, usableDepthOfDischargeRatio: value / 100 } : current)} decimals={1} />
      <NumField label={t('equipmentEditor.rendementAllerRetour')} unit="%" value={(draft.roundTripEfficiencyRatio ?? 0) * 100} onChange={(value) => setDraft((current) => current.kind === 'battery' ? { ...current, roundTripEfficiencyRatio: value / 100 } : current)} decimals={1} />
      <NumField label={t('equipmentEditor.dureeDeVie')} unit="cycles" value={draft.cycleLife ?? 0} onChange={(value) => setDraft((current) => current.kind === 'battery' ? { ...current, cycleLife: value > 0 ? Math.round(value) : null } : current)} />
    </div>}
    {draft.kind === 'inverter' && <div className="form-rows equipment-editor-fields">
      <TextField label={t('equipmentEditor.typeDOnduleur')} value={draft.inverterType ?? ''} onChange={(value) => setDraft((current) => current.kind === 'inverter' ? { ...current, inverterType: value || null } : current)} />
      <NumField label={t('equipmentEditor.puissanceAcNominale')} unit="kW" value={draft.nominalAcPowerW / 1000} onChange={(value) => setNumber('nominalAcPowerW', value * 1000)} decimals={2} />
      <NumField label={t('equipmentEditor.tensionDcNominale')} unit="V" value={draft.nominalDcVoltageV} onChange={(value) => setNumber('nominalDcVoltageV', value)} />
      <NumField label={t('equipmentEditor.puissanceDeSurcharge')} unit="kW" value={(draft.surgePowerW ?? 0) / 1000} onChange={(value) => setNullableNumber('surgePowerW', value * 1000)} decimals={2} />
      <NumField label={t('equipmentEditor.tensionAcDeSortie')} unit="V" value={draft.nominalAcVoltageV ?? 0} onChange={(value) => setNullableNumber('nominalAcVoltageV', value)} />
      <NumField label={t('loads2.rendement')} unit="%" value={(draft.efficiencyRatio ?? 0) * 100} onChange={(value) => setDraft((current) => current.kind === 'inverter' ? { ...current, efficiencyRatio: value / 100 } : current)} decimals={1} />
      <NumField label={t('equipmentEditor.puissancePvMaximale')} unit="kWc" value={(draft.pvArrayMaxPowerW ?? 0) / 1000} onChange={(value) => setNullableNumber('pvArrayMaxPowerW', value * 1000)} decimals={2} />
      <NumField label={t('equipmentEditor.mpptMinimale')} unit="V" value={draft.mpptMinVoltageV ?? 0} onChange={(value) => setNullableNumber('mpptMinVoltageV', value)} />
      <NumField label={t('equipmentEditor.mpptMaximale')} unit="V" value={draft.mpptMaxVoltageV ?? 0} onChange={(value) => setNullableNumber('mpptMaxVoltageV', value)} />
      <NumField label={t('equipmentEditor.vocPvMaximale')} unit="V" value={draft.pvOpenCircuitMaxVoltageV ?? 0} onChange={(value) => setNullableNumber('pvOpenCircuitMaxVoltageV', value)} />
      <NumField label={t('equipmentEditor.courantDeChargeMaximal')} unit="A" value={draft.maxChargingCurrentA ?? 0} onChange={(value) => setNullableNumber('maxChargingCurrentA', value)} />
    </div>}
    {errors.length > 0 && <div className="form-errors" role="alert"><b>{t('equipment.editor.correctFields')}</b><ul>{errors.map((issue) => <li key={`${issue.path}-${issue.code}`}>{issue.path || t('catalog.reference')} — {issue.message}</li>)}</ul></div>}
    {saveError && <div className="form-errors" role="alert">{saveError}</div>}
  </Dialog>;
}

function emptyEquipment(kind: EquipmentKind): Equipment {
  const common = { id: 'draft', manufacturer: '', model: '', provenance: { sourceId: 'user-catalog', sourceRecordId: 'draft', sourceSha256: '0'.repeat(64), transformationVersion: '2.0.0' }, origin: 'user' as const, version: 1, derivedFromId: null, supersedesVersion: null, archivedAt: null };
  if (kind === 'pv-module') return { ...common, kind, nominalPowerW: 0, voltageAtMaximumPowerV: 0, openCircuitVoltageV: 0, currentAtMaximumPowerA: 0, shortCircuitCurrentA: 0, technology: null, areaM2: null, temperatureCoefficientPmaxPerC: null, temperatureCoefficientVocPerC: null, nominalOperatingCellTemperatureC: null };
  if (kind === 'battery') return { ...common, kind, nominalVoltageV: 0, nominalCapacityAh: 0, nominalEnergyWh: 0, usableDepthOfDischargeRatio: null, roundTripEfficiencyRatio: null, cycleLife: null, technology: null };
  return { ...common, kind, nominalAcPowerW: 0, nominalDcVoltageV: 0, surgePowerW: null, nominalAcVoltageV: null, efficiencyRatio: null, pvArrayMaxPowerW: null, mpptMinVoltageV: null, mpptMaxVoltageV: null, pvOpenCircuitMaxVoltageV: null, pvInputsNumber: null, maxChargingCurrentA: null, maxParallelUnits: null, canBeInParallel: null, inverterType: null };
}
