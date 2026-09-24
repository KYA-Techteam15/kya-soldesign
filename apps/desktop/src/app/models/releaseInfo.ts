export interface ApplicationReleaseInfo { readonly version: string; readonly channel: 'development' | 'preview' | 'stable'; readonly builtAtIso: string | null; readonly changelogEntries: readonly { readonly version: string; readonly dateIso: string; readonly message: { readonly fr: string; readonly en: string } }[] }

const env = import.meta.env as Record<string, string | undefined> & { readonly DEV?: boolean };
const channel = env.VITE_RELEASE_CHANNEL;

/**
 * Version, canal et historique affichés dans « À propos ». La version et la
 * date de construction sont injectées au build depuis `package.json`
 * (vite.config.ts) ; le détail complet figure dans CHANGELOG.md.
 */
export const applicationReleaseInfo: ApplicationReleaseInfo = {
  version: env.VITE_APP_VERSION ?? '0.0.0',
  channel: channel === 'preview' || channel === 'stable' || channel === 'development' ? channel : env.DEV ? 'development' : 'stable',
  builtAtIso: env.VITE_BUILD_TIME ?? null,
  changelogEntries: [
    {
      version: '1.1.0',
      dateIso: '2026-09-24',
      message: {
        fr: 'Refonte de bout en bout : tableau d’appareils unique et horaires peints, sources de consommation, optimisation sur vos références simulée sur l’année, émission et révisions du dossier, nouvel accueil et projet exemple.',
        en: 'End-to-end overhaul: single appliance table and painted schedules, load sources, optimisation over your references simulated over the year, file issue and revisions, new home and example project.',
      },
    },
    {
      version: '1.0.0',
      dateIso: '2026-09-24',
      message: {
        fr: 'Première version distribuée : application de bureau, Voc à froid corrigé, simulation horaire unique, protections et câbles selon l’IEC 60364-5-52, projets enregistrés sans limite, documents complets et interface bilingue.',
        en: 'First distributed release: desktop application, corrected cold Voc, single hourly simulation, IEC 60364-5-52 protections and cables, unlimited project storage, complete documents and bilingual interface.',
      },
    },
    { version: '0.1.0', dateIso: '2026-08-27', message: { fr: 'Accueil, catalogue, réglages et rapports transversaux.', en: 'Home, catalog, settings and cross-cutting reports.' } },
  ],
};
