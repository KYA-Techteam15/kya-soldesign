import type { NamedProfile } from '../../../app/models/projectView';
import { useCatalog } from '../../../app/CatalogProvider';
import { fmt } from '../../../domain/format';
import { useT } from '../../../i18n';
import { DraftNumberInput } from './DraftNumberInput';

type Meter = NonNullable<NamedProfile['meter']>;

export const emptyMeter = (): Meter => ({
  observedEnergy: 0, observedDays: null, normalizedProfileId: null, forceYEn: false, targetYEn: null,
  meterAmperage: 0, networkType: 'single_phase', morningPeakStart: '', morningPeakEnd: '', eveningPeakStart: '', eveningPeakEnd: '',
  peakImportance: 0, targetQualityFactor: 0,
});

/** Estimation depuis la facture : énergie observée, période, profil sourcé, part consommée au soleil. */
export function MeterForm({ meter, mutate, calculatedShare }: {
  readonly meter: Meter;
  readonly mutate: (change: (meter: Meter) => void) => void;
  /** Part de l'énergie consommée au soleil calculée, 0–1 ; `null` si indisponible. */
  readonly calculatedShare: number | null;
}) {
  const t = useT();
  const { loadProfiles } = useCatalog();
  return (
    <section>
      <div className="tbl-title"><h2 className="h-sec">{t('loads2.estimationDepuisLaFacture')}</h2></div>
      <div className="form-rows">
        <label>
          <span>{t('loads.observedEnergy')}</span>
          <span className="uf">
            <DraftNumberInput value={meter.observedEnergy} onCommit={(value) => { if (value !== null && value >= 0) mutate((target) => { target.observedEnergy = value; }); }} />
            <span className="uf-unit">kWh</span>
          </span>
        </label>
        <label><span>{t('loads.observedDays')}</span><DraftNumberInput inputMode="numeric" nullable value={meter.observedDays} onCommit={(value) => { if (value === null || (Number.isInteger(value) && value > 0)) mutate((target) => { target.observedDays = value; }); }} /></label>
        <label><span>{t('loads.sourcedProfile')}</span><select value={meter.normalizedProfileId ?? ''} onChange={(event) => mutate((target) => { target.normalizedProfileId = event.target.value || null; })}><option value="">{t('loads.chooseProfile')}</option>{loadProfiles.map((item) => <option key={item.id} value={item.id}>{item.displayName} · {item.provenance.sourceRecordId}</option>)}</select></label>
        <div className="yen-controls" style={{ gridColumn: '1 / -1' }}>
          <label className="checkline">
            <input type="checkbox" checked={meter.forceYEn} onChange={(event) => mutate((target) => { target.forceYEn = event.target.checked; })} />
            <span>{t('loads.forceYEn')}</span>
          </label>
          {meter.forceYEn && <label><span>{t('loads.targetYEn')}</span><span className="uf"><DraftNumberInput value={meter.targetYEn === null ? null : meter.targetYEn * 100} nullable format={(value) => fmt(value, 1)} onCommit={(value) => mutate((target) => { target.targetYEn = value === null ? null : Math.min(100, Math.max(0, value)) / 100; })} /><span className="uf-unit">%</span></span></label>}
          <div className="yen-result" role="status">
            <span>{t('loads.calculatedYEn')}</span>
            <b>{calculatedShare === null ? '—' : `${fmt(calculatedShare * 100, 1)} %`}</b>
          </div>
        </div>
      </div>
    </section>
  );
}
