import type { LoadCompositionView } from '../../../app/models/projectView';
import { fmt } from '../../../domain/format';
import { fill, useT } from '../../../i18n';
import { MONTH_KEYS } from './LoadHeatmap';

const inPeriod = (monthDay: string, start: string, end: string) => start <= end ? monthDay >= start && monthDay <= end : monthDay >= start || monthDay <= end;

/** Profil attribué, pour un type de jour, au milieu de chaque mois ; `null` si aucune période ne couvre la date. */
export function composedMonthStrip(composition: LoadCompositionView, dayGroupId: string): readonly (string | null)[] {
  return MONTH_KEYS.map((_, month) => {
    const monthDay = `${String(month + 1).padStart(2, '0')}-15`;
    const period = composition.calendar.periods.find((candidate) => inPeriod(monthDay, candidate.startMonthDay, candidate.endMonthDay));
    return period === undefined ? null : composition.calendar.assignments.find((item) => item.periodId === period.id && item.dayGroupId === dayGroupId)?.profileId ?? null;
  });
}

/** L'année qu'on compose : quel profil tombe sur quel mois, pour chaque type de jour. Un trou apparaît hachuré. */
export function YearPreview({ composition }: { readonly composition: LoadCompositionView }) {
  const t = useT();
  const profiles = new Map(composition.profiles.map((profile) => [profile.id, profile]));
  const groupLabel = (kind: string) => kind === 'workweek' ? t('loads.calendarWorkweek') : kind === 'weekend' ? t('loads.calendarWeekend') : t('loads.calendarAllDays');
  return (
    <div className="year-preview">
      <div className="year-strip" role="table" aria-label={t('loads.composedYearTitle')}>
        <div className="ys-row ys-head" role="row"><span role="columnheader" />{MONTH_KEYS.map((key) => <span key={key} role="columnheader">{t(key).slice(0, 3)}</span>)}</div>
        {composition.calendar.dayGroups.map((group) => (
          <div className="ys-row" role="row" key={group.id}>
            <span role="rowheader">{groupLabel(group.kind)}</span>
            {composedMonthStrip(composition, group.id).map((profileId, month) => {
              const profile = profileId === null ? undefined : profiles.get(profileId);
              return <span key={month} role="cell" className={profile === undefined ? 'ys-gap' : ''} style={profile === undefined ? undefined : { background: profile.color }} title={profile?.name ?? t('loads.composedNoProfile')} />;
            })}
          </div>
        ))}
      </div>
      <div className="ys-legend">
        {composition.profiles.map((profile) => <span key={profile.id}><i style={{ background: profile.color }} />{profile.name}</span>)}
      </div>
    </div>
  );
}

/**
 * Année composée, vue dans la page. Les chiffres annuels viennent de la série construite sur la
 * météo du site, quand elle existe.
 */
export function ComposedSummary({ composition, annualKwh, peakKw, onEdit }: {
  readonly composition: LoadCompositionView;
  readonly annualKwh: number | null;
  readonly peakKw: number | null;
  readonly onEdit: () => void;
}) {
  const t = useT();
  const organization = composition.organization === 'workweek-weekend' ? t('composed.ouvresWeekEnd') : composition.organization === 'periods' ? t('loads.composedPeriods') : t('loads.composedPeriodDays');
  return (
    <section className="composed-year">
      <div className="tbl-title">
        <h2 className="h-sec">{t('loads.composedYearTitle')}</h2>
        <span className="label">{organization}</span>
        <span className="sep" />
        <button type="button" className="btn btn-primary" onClick={onEdit}>{t('loads.composedEdit')}</button>
      </div>
      <YearPreview composition={composition} />
      <p className="label">
        {fill(t('loads.composedStats'), { periods: composition.calendar.periods.length, profiles: composition.profiles.length })}
        {annualKwh !== null && ` · ${fmt(annualKwh, 0)} ${t('loads2.kwhAn')}`}
        {peakKw !== null && ` · ${t('loads.annualPeak').toLowerCase()} ${fmt(peakKw, 2)} kW`}
      </p>
    </section>
  );
}
