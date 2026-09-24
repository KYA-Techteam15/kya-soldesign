import type { CableSizingResult, ProtectionSizingResult, ProtectionType, SizingOutputV1 } from '@ksd/engine';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { StepHead } from '../../ui/Flow';
import { Prov } from '../../ui/Prov';
import { fmt } from '../../domain/format';
import { useCatalog } from '../../app/CatalogProvider';
import { useCalculationState } from '../../app/CalculationProvider';
import { projectProtections } from '../../app/diagram/projectDiagram';
import { DecimalInput } from '../../ui/DecimalInput';
import type { CableSegment, ProjectViewModel } from '../../app/models/projectView';
import { useT } from '../../i18n';

const SEGMENT_KEY: Record<CableSegment, string> = {
  pv_inverter: 'protections.segment.pvInverter',
  inverter_battery: 'protections.segment.inverterBattery',
  inverter_load: 'protections.segment.inverterLoad',
};

const PROTECTION_STATE: Record<ProtectionSizingResult['state'], { readonly key: string; readonly tone: 'ok' | 'warn' | 'bad' }> = {
  valid: { key: 'protections.state.valid', tone: 'ok' },
  'awaiting-type': { key: 'protections.state.awaitingType', tone: 'warn' },
  'awaiting-rating': { key: 'protections.state.awaitingRating', tone: 'warn' },
  'out-of-range': { key: 'protections.state.outOfRange', tone: 'bad' },
  unavailable: { key: 'protections.state.unavailable', tone: 'bad' },
};

const CABLE_STATE: Record<CableSizingResult['state'], string> = {
  valid: 'cables.state.valid',
  blocked: 'cables.state.blocked',
  unavailable: 'cables.state.unavailable',
};

export function SectionProtections() {
  const t = useT();
  const project = useProject();
  const update = useProjects((state) => state.update);
  const { equipment } = useCatalog();
  const sizingState = useCalculationState<SizingOutputV1>(project.id, 'sizing', project.updatedAt);
  const sizing = sizingState.status === 'ready' ? sizingState.envelope.output : null;
  const { protections, cables } = projectProtections(project, sizing, equipment);

  const setType = (segment: CableSegment, type: ProtectionType | null) => update((draft) => {
    const row = draft.protections.find((item) => item.segment === segment);
    if (row) { row.type = type; row.caliberA = null; }
  });
  const setCaliber = (segment: CableSegment, caliber: number | null) => update((draft) => {
    const row = draft.protections.find((item) => item.segment === segment);
    if (row) row.caliberA = caliber;
  });

  return (
    <div className="sheet">
      <StepHead slug="protections" aside={<span className="label">{t('protections.aside')}</span>} />
      {sizing === null && <div className="alert warn"><div><b>{t('protections.needsSizing')}</b> {t('protections.needsSizingHelp')}</div></div>}

      <section>
        <div className="tbl-title">
          <h2 className="h-sec">{t('protections.title')}</h2>
          <span className="label">{t('protections.lead')}</span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl t-prot">
            <thead>
              <tr>
                <th>{t('protections.col.segment')}</th>
                <th>{t('protections.col.type')}</th>
                <th className="derived">{t('protections.col.required')}<span className="unit">A</span></th>
                <th className="pick">{t('protections.col.rating')}<span className="unit">A</span></th>
                <th className="derived">{t('protections.col.voltage')}<span className="unit">V</span></th>
                <th className="derived">{t('protections.col.quantity')}</th>
                <th>{t('protections.col.state')}</th>
              </tr>
            </thead>
            <tbody>
              {protections.map((protection) => (
                <ProtectionRow
                  key={protection.segment}
                  protection={protection}
                  label={t(SEGMENT_KEY[protection.segment])}
                  onTypeChange={(type) => setType(protection.segment, type)}
                  onCaliberChange={(caliber) => setCaliber(protection.segment, caliber)}
                />
              ))}
            </tbody>
          </table>
        </div>
        <p className="label table-foot">{t('protections.foot')}</p>
      </section>

      <section>
        <div className="tbl-title">
          <h2 className="h-sec">{t('cables.title')}</h2>
          <span className="label">{t('cables.lead')}</span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl t-cables">
            <thead>
              <tr>
                <th>{t('protections.col.segment')}</th>
                <th>{t('cables.col.length')}<span className="unit">m</span></th>
                <th className="pick">{t('cables.col.material')}</th>
                <th className="pick">{t('cables.col.installation')}</th>
                <th>{t('cables.col.maxDrop')}<span className="unit">%</span></th>
                <th className="derived">{t('cables.col.current')}<span className="unit">A</span></th>
                <th className="derived">{t('cables.col.thermal')}<span className="unit">mm²</span></th>
                <th className="derived">{t('cables.col.section')}<span className="unit">mm²</span></th>
                <th className="derived">{t('protections.col.state')}</th>
              </tr>
            </thead>
            <tbody>
              {project.cables.map((cable, index) => (
                <CableRow key={cable.segment} cable={cable} result={cables[index]!} label={t(SEGMENT_KEY[cable.segment])} onChange={(mutate) => update((draft) => { mutate(draft.cables[index]!); })} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="label table-foot">{t('cables.foot')}</p>
      </section>
    </div>
  );
}

function ProtectionRow({ protection, label, onTypeChange, onCaliberChange }: {
  readonly protection: ProtectionSizingResult;
  readonly label: string;
  readonly onTypeChange: (type: ProtectionType | null) => void;
  readonly onCaliberChange: (caliber: number | null) => void;
}) {
  const t = useT();
  const state = PROTECTION_STATE[protection.state];
  return (
    <tr>
      <td>{label}</td>
      <td className="pick">
        <select className="cell-in" value={protection.selectedType ?? ''} aria-label={`${t('protections.col.type')} · ${label}`} onChange={(event) => onTypeChange((event.target.value || null) as ProtectionType | null)}>
          <option value="">{t('protections.chooseType')}</option>
          {protection.allowedTypes.map((type) => (
            <option key={type} value={type}>{t(`protections.type.${type}`)}{type === protection.recommendedType ? ` · ${t('protections.recommended')}` : ''}</option>
          ))}
        </select>
      </td>
      <td className="derived num">
        <Prov
          title={t('protections.requiredTitle')}
          formula={t(`protections.formula.${protection.segment}`)}
          rows={[[t('protections.col.required'), `${fmt(protection.requiredA, 2)} A`], [t('protections.compatible'), protection.compatibleRatingsA.length ? protection.compatibleRatingsA.join(' · ') : t('g.noneShort')]]}
          source="IEC 62548 · IEC 60364-7-712"
        >
          {protection.requiredA > 0 ? fmt(protection.requiredA, 1) : '—'}
        </Prov>
      </td>
      <td className="pick">
        {protection.options.length > 0 ? (
          <select className="cell-in" value={protection.caliberA ?? ''} aria-label={`${t('protections.col.rating')} · ${label}`} onChange={(event) => onCaliberChange(event.target.value === '' ? null : Number(event.target.value))}>
            <option value="">{protection.recommendedRatingA === null ? t('protections.chooseRating') : `${t('protections.suggested')} ${fmt(protection.recommendedRatingA)} A`}</option>
            {protection.options.map((option) => <option key={option} value={option}>{fmt(option)}</option>)}
          </select>
        ) : '—'}
      </td>
      <td className="derived num">{protection.serviceVoltageV > 0 ? fmt(protection.serviceVoltageV, 1) : '—'}</td>
      <td className="derived num">{protection.quantity}</td>
      <td><span className={`badge ${state.tone}`}>{t(state.key)}</span></td>
    </tr>
  );
}

function CableRow({ cable, result, label, onChange }: {
  readonly cable: ProjectViewModel['cables'][number];
  readonly result: CableSizingResult;
  readonly label: string;
  readonly onChange: (mutate: (row: ProjectViewModel['cables'][number]) => void) => void;
}) {
  const t = useT();
  return (
    <tr>
      <td>{label}</td>
      <td>
        <DecimalInput className="cell-in" value={cable.length} min={0} max={10_000} decimals={1} aria-label={`${t('cables.col.length')} · ${label}`}
          onCommit={(value) => { if (value !== null) onChange((row) => { row.length = value; }); }} />
      </td>
      <td className="pick">
        <select className="cell-in" value={cable.material} aria-label={`${t('cables.col.material')} · ${label}`} onChange={(event) => onChange((row) => { row.material = event.target.value as 'copper' | 'aluminium'; })}>
          <option value="copper">{t('cables.copper')}</option>
          <option value="aluminium">{t('cables.aluminium')}</option>
        </select>
      </td>
      <td className="pick">
        <select className="cell-in" value={cable.installation} aria-label={`${t('cables.col.installation')} · ${label}`} onChange={(event) => onChange((row) => { row.installation = event.target.value as 'buried' | 'not_buried'; })}>
          <option value="not_buried">{t('cables.notBuried')}</option>
          <option value="buried">{t('cables.buried')}</option>
        </select>
      </td>
      <td className="pick">
        <select className="cell-in" value={cable.maxVoltageDropPercent} aria-label={`${t('cables.col.maxDrop')} · ${label}`} onChange={(event) => onChange((row) => { row.maxVoltageDropPercent = Number(event.target.value); })}>
          {[1, 2, 3].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </td>
      <td className="derived num">{result.currentA > 0 ? fmt(result.currentA, 1) : '—'}</td>
      <td className="derived num">
        <Prov
          title={t('cables.col.thermal')}
          formula={t('cables.formula')}
          rows={[
            [t('cables.method'), result.installationMethod === 'C' ? t('cables.methodC') : t('cables.methodD1')],
            [t('cables.designTemperature'), `${fmt(result.designTemperatureC, 0)} °C` + (result.temperatureAssumed ? ` · ${t('cables.reference')}` : '')],
            [t('cables.correction'), fmt(result.correctionFactor, 2)],
            [t('cables.ampacity'), result.ampacityA > 0 ? `${fmt(result.ampacityA, 1)} A` : '—'],
          ]}
          source="IEC 60364-5-52 · B.52.2/B.52.3/B.52.14/B.52.15"
        >
          {result.thermalSection > 0 ? fmt(result.thermalSection, 1) : '—'}
        </Prov>
      </td>
      <td className="derived num"><b>{result.state === 'valid' ? fmt(result.normalizedSection, 1) : '—'}</b></td>
      <td className="derived">{t(CABLE_STATE[result.state])}</td>
    </tr>
  );
}
