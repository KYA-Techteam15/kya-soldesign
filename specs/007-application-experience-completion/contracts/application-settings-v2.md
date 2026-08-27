# Contract — Application settings V2

## Storage keys

- Source V1: `kya-sol-design.application-settings.v1`
- Target V2: `kya-sol-design.application-settings.v2`
- Recovery backup: `kya-sol-design.application-settings.v1.backup`

## Read algorithm

1. Read V2 and parse it strictly.
2. If valid, return it.
3. If V2 is absent, read V1 and run the migration.
4. Validate the full migrated object before writing V2.
5. Preserve the original V1 string in the recovery key until the V2 write and
   reread both succeed.
6. If migration fails, keep V1 untouched and expose a recoverable settings error.
7. Never merge unvalidated arbitrary keys into defaults.

## Update contract

- An update accepts only a validated patch for one category.
- `updatedAtIso` is supplied by an injected clock.
- The store writes one complete V2 document atomically from the application point
  of view.
- Persistence failure keeps the previous validated document authoritative and
  returns an error state to the UI.
- Reset category and reset all are separate commands.

## Category ownership

| Category | Owner |
|---|---|
| Interface | `UiPreferencesV1` / `ui.ts` |
| Société et rapports | `ApplicationSettingsV2.company/reports` |
| Fiabilité et dimensionnement | `defaults.reliability/conversion` |
| Coûts | `defaults.equipmentCosts` |
| Conditions commerciales | `defaults.commercial` |
| Fichiers et projets | `projects` |
| Devise | `currency` |
| Licence | `LicensePort`, not persisted as active truth in settings |
| À propos | build metadata, read-only |

## Required validation

- Percentages: finite and bounded by the field-specific schema.
- Days/months: integers and non-negative within documented maxima.
- Voltage and costs: positive where required.
- Currency codes: `/^[A-Z]{3}$/`.
- Exchange rate: normalized positive decimal string.
- Recent project limit: integer in `[1, 12]`.
- Logo/signature references: null or an existing validated asset ID.
- No `batteryDod` or `batteryDodPercent` property is accepted.

## Project creation mapping

Only `createProjectWithDefaults` may map settings to a new project view. It MUST:

1. receive a newly created canonical project;
2. receive one immutable settings snapshot;
3. map each supported field exactly once;
4. validate the resulting project through the canonical adapter;
5. return a new object without mutating an existing project;
6. never read settings implicitly from a React component.

## Import/export

Configuration export includes V2 settings and UI preferences, except:

- binary assets, exported separately or in a validated package;
- license tokens, activation secrets or machine identifiers;
- transient errors, toasts, routes or form drafts;
- platform-specific file handles.

Import validates the entire payload before any category is replaced and shows a
summary of categories to be changed.
