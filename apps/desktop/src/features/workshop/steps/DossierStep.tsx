import { useState } from 'react';
import { useT } from '../../../shared/i18n/index.js';
import { Tabs } from '../../../shared/ui/Tabs.js';
import type { WorkshopStepProps } from './stepProps.js';
import { UnavailableCapability } from './UnavailableCapability.js';

export function DossierStep({ project }: WorkshopStepProps) {
  const t = useT();
  const [tab, setTab] = useState('synoptic');
  const items = [{ id: 'synoptic', label: t('workshop.synoptic') }, { id: 'verification', label: t('workshop.verification') }, { id: 'documents', label: t('workshop.documents') }];
  return <UnavailableCapability projectId={project.id} capability="dossier" titleKey="workshop.dossier"><Tabs activeId={tab} onChange={setTab} items={items} /><div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} /></UnavailableCapability>;
}
