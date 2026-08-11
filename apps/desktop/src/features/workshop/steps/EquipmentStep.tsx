import { useEffect, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import { Link } from 'react-router-dom';
import { useApplication } from '../../../app/ApplicationProvider.js';
import { useT } from '../../../shared/i18n/index.js';
import { ErrorState } from '../../../shared/status/ErrorState.js';
import { Provenance } from '../../../shared/status/Provenance.js';
import { Flow } from '../../../shared/ui/Flow.js';
import type { WorkshopStepProps } from './stepProps.js';
import { UnavailableCapability } from './UnavailableCapability.js';

export function EquipmentStep({ project }: WorkshopStepProps) {
  const { services } = useApplication();
  const t = useT();
  const [items, setItems] = useState<readonly Equipment[]>([]);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { let active = true; void services.catalog.list().then((records) => { if (active) { setItems(records.slice(0, 3)); setFailed(false); } }).catch(() => { if (active) setFailed(true); }); return () => { active = false; }; }, [revision, services]);
  return <UnavailableCapability projectId={project.id} capability="equipment-compatibility" titleKey="workshop.equipment"><Flow compact><h3>{t('workshop.catalogPreview')}</h3><p>{t('workshop.catalogPreviewHelp')}</p>{failed ? <ErrorState title={t('catalog.error')}><button className="button button-secondary" onClick={() => setRevision((value) => value + 1)}>{t('action.retry')}</button></ErrorState> : <div className="equipment-preview">{items.map((item) => <article key={item.id}><strong>{item.manufacturer}</strong><span>{item.model}</span><Provenance sourceId={item.provenance.sourceId} /></article>)}</div>}<Link className="button button-secondary inline-action" to="/catalogue">{t('workshop.catalogBrowse')}</Link></Flow></UnavailableCapability>;
}
