export interface ApplicationReleaseInfo { readonly version: string; readonly channel: 'development' | 'preview' | 'stable'; readonly builtAtIso: string | null; readonly changelogEntries: readonly { readonly version: string; readonly dateIso: string; readonly message: string }[] }

const env = import.meta.env as Record<string, string | undefined>;
const channel = env.VITE_RELEASE_CHANNEL;
export const applicationReleaseInfo: ApplicationReleaseInfo = {
  version: env.VITE_APP_VERSION ?? '0.1.0',
  channel: channel === 'stable' || channel === 'development' ? channel : 'preview',
  builtAtIso: env.VITE_BUILD_TIME ?? null,
  changelogEntries: [{ version: env.VITE_APP_VERSION ?? '0.1.0', dateIso: '2026-08-27', message: 'Accueil, catalogue, réglages et rapports transversaux.' }],
};
