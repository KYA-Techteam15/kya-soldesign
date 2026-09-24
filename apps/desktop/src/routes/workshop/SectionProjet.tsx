import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { Group, SelectField, TextField } from '../../ui/Field';
import { StepHead } from '../../ui/Flow';
import type { ApplicationType } from '../../app/models/projectView';
import { useT } from '../../i18n';

const APPLICATIONS: { value: ApplicationType; label: string }[] = [
  { value: 'residential', label: 'project2.app.residential' },
  { value: 'commercial', label: 'project2.app.commercial' },
  { value: 'industrial', label: 'project2.app.industrial' },
  { value: 'agricultural', label: 'project2.app.agricultural' },
];

export function SectionProjet() {
  const t = useT();
  const project = useProject();
  const update = useProjects((s) => s.update);
  const d = project.details;

  return (
    <div className="sheet">
      <StepHead
        slug="projet"
        aside={
          <span className="label">
            {t('project.headerFeedsDocuments')}
          </span>
        }
      />

      <div className="form-grid">
        <Group title={t('project2.projet')}>
          <TextField
            label={t('project2.nomDuProjet')}
            value={project.name}
            placeholder={t('project2.exInstallationSolaireA')}
            onChange={(v) => update((p) => { p.name = v; })}
          />
          <TextField
            label={t('project2.numeroDeDossier')}
            value={d.projectNumber}
            placeholder="2026-041"
            onChange={(v) => update((p) => { p.details.projectNumber = v; })}
          />
          <TextField
            label={t('project2.date')}
            value={d.projectDate}
            onChange={(v) => update((p) => { p.details.projectDate = v; })}
          />
          <TextField
            label={t('project2.localisationDuSite')}
            value={d.projectLocation}
            placeholder={t('project2.exLomeTogo')}
            onChange={(v) => update((p) => { p.details.projectLocation = v; })}
          />
          <SelectField
            label={t('project2.typeDApplication')}
            value={d.applicationType}
            options={APPLICATIONS.map((item) => ({ ...item, label: t(item.label) }))}
            onChange={(v) =>
              update((p) => { p.details.applicationType = v as ApplicationType; })
            }
          />
          <TextField
            label={t('project2.chargeDeProjet')}
            value={d.followerName}
            onChange={(v) => update((p) => { p.details.followerName = v; })}
          />
        </Group>

        <Group title={t('project2.client')}>
          <TextField
            label={t('project2.nomDuClient')}
            value={d.clientName}
            placeholder={t('project2.nomCompletDuClient')}
            onChange={(v) => update((p) => { p.details.clientName = v; })}
          />
          <TextField
            label={t('project2.adresse')}
            value={d.clientAddress}
            onChange={(v) => update((p) => { p.details.clientAddress = v; })}
          />
          <TextField
            label={t('project2.telephone')}
            value={d.clientTel}
            placeholder="+228 90 12 34 56"
            onChange={(v) => update((p) => { p.details.clientTel = v; })}
          />
          <TextField
            label={t('project2.eMail')}
            value={d.clientEmail}
            onChange={(v) => update((p) => { p.details.clientEmail = v; })}
          />
        </Group>
      </div>

      {!d.clientName && (
        <div className="alert">
          <div>
            <b>{t('project.clientMissing')}</b>
            {t('project.clientMissingHelp')}
          </div>
        </div>
      )}

    </div>
  );
}
