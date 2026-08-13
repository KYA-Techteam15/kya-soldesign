import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { Group, SelectField, TextField } from '../../ui/Field';
import { StepHead } from '../../ui/Flow';
import type { ApplicationType } from '../../app/models/projectView';

const APPLICATIONS: { value: ApplicationType; label: string }[] = [
  { value: 'residential', label: 'Résidentiel' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industriel' },
  { value: 'agricultural', label: 'Agricole' },
];

export function SectionProjet() {
  const project = useProject();
  const update = useProjects((s) => s.update);
  const d = project.details;

  return (
    <div className="sheet">
      <StepHead
        slug="projet"
        aside={
          <span className="label">
            Ces informations alimentent l’en-tête des documents remis au client.
          </span>
        }
      />

      <div className="form-grid">
        <Group title="Projet">
          <TextField
            label="Nom du projet"
            value={project.name}
            placeholder="ex. Installation solaire à la mairie"
            onChange={(v) => update((p) => { p.name = v; })}
          />
          <TextField
            label="Numéro de dossier"
            value={d.projectNumber}
            placeholder="2026-041"
            onChange={(v) => update((p) => { p.details.projectNumber = v; })}
          />
          <TextField
            label="Date"
            value={d.projectDate}
            onChange={(v) => update((p) => { p.details.projectDate = v; })}
          />
          <TextField
            label="Localisation du site"
            value={d.projectLocation}
            placeholder="ex. Lomé, Togo"
            onChange={(v) => update((p) => { p.details.projectLocation = v; })}
          />
          <SelectField
            label="Type d’application"
            value={d.applicationType}
            options={APPLICATIONS}
            onChange={(v) =>
              update((p) => { p.details.applicationType = v as ApplicationType; })
            }
          />
          <TextField
            label="Chargé de projet"
            value={d.followerName}
            onChange={(v) => update((p) => { p.details.followerName = v; })}
          />
        </Group>

        <Group title="Client">
          <TextField
            label="Nom du client"
            value={d.clientName}
            placeholder="Nom complet du client"
            onChange={(v) => update((p) => { p.details.clientName = v; })}
          />
          <TextField
            label="Adresse"
            value={d.clientAddress}
            onChange={(v) => update((p) => { p.details.clientAddress = v; })}
          />
          <TextField
            label="Téléphone"
            value={d.clientTel}
            placeholder="+228 90 12 34 56"
            onChange={(v) => update((p) => { p.details.clientTel = v; })}
          />
          <TextField
            label="E-mail"
            value={d.clientEmail}
            onChange={(v) => update((p) => { p.details.clientEmail = v; })}
          />
          <TextField
            label="Photo du site (chemin)"
            value={d.projectImage}
            placeholder="optionnel"
            onChange={(v) => update((p) => { p.details.projectImage = v; })}
          />
        </Group>
      </div>

      {!d.clientName && (
        <div className="alert">
          <div>
            <b>Client non renseigné</b>
            Le rapport et la facture proforma porteront un en-tête vide. Rien ne vous
            empêche de continuer et d’y revenir plus tard.
          </div>
        </div>
      )}

    </div>
  );
}
