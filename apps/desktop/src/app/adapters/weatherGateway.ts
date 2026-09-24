import { isTauri } from '../platform/runtime.js';

/**
 * Passerelle vers les fournisseurs météo et de géocodage.
 *
 * Les clients n'écrivent que des chemins `/external/*`. Selon l'hôte :
 * - développement et prévisualisation : le proxy de Vite sert ces chemins ;
 * - application de bureau : l'hôte Tauri appelle directement le fournisseur
 *   (plugin HTTP, sans contrainte CORS), sur une liste fermée d'adresses ;
 * - déploiement web éventuel : `VITE_WEATHER_GATEWAY_BASE_URL` désigne la passerelle.
 *
 * Open-Meteo exige un abonnement pour un usage commercial : avec
 * `VITE_OPEN_METEO_API_KEY`, les appels passent par le domaine `customer-*`.
 */
const env = import.meta.env as Record<string, string | undefined>;
const configuredBaseUrl = (env.VITE_WEATHER_GATEWAY_BASE_URL ?? '').replace(/\/+$/u, '');
const openMeteoKey = env.VITE_OPEN_METEO_API_KEY?.trim() || null;

/** Correspondance chemin de passerelle → adresse réelle du fournisseur. */
export function providerUrl(path: string, apiKey: string | null = openMeteoKey): string | null {
  const [route, query = ''] = path.split('?');
  const withKey = (url: string) => (apiKey ? `${url}?${query}${query ? '&' : ''}apikey=${encodeURIComponent(apiKey)}` : `${url}${query ? `?${query}` : ''}`);
  switch (route) {
    case '/external/pvgis/tmy': return `https://re.jrc.ec.europa.eu/api/v5_3/tmy${query ? `?${query}` : ''}`;
    case '/external/bigdatacloud/reverse-geocode': return `https://api.bigdatacloud.net/data/reverse-geocode-client${query ? `?${query}` : ''}`;
    case '/external/open-meteo/geocoding': return withKey(apiKey ? 'https://customer-geocoding-api.open-meteo.com/v1/search' : 'https://geocoding-api.open-meteo.com/v1/search');
    case '/external/open-meteo/forecast': return withKey(apiKey ? 'https://customer-api.open-meteo.com/v1/forecast' : 'https://api.open-meteo.com/v1/forecast');
    default: return null;
  }
}

export function weatherGatewayUrl(path: string): string {
  if (isTauri()) return providerUrl(path) ?? path;
  return configuredBaseUrl ? `${configuredBaseUrl}${path}` : path;
}

/**
 * `fetch` adapté à l'hôte : celui du plugin HTTP sous Tauri (requête émise par
 * l'hôte, identifiée comme KYA-SolDesign), celui du navigateur sinon.
 */
export const gatewayFetch: typeof fetch = async (input, init) => {
  if (!isTauri()) return globalThis.fetch(input, init);
  const { fetch: hostFetch } = await import('@tauri-apps/plugin-http');
  const headers = new Headers(init?.headers);
  if (!headers.has('accept')) headers.set('accept', 'application/json');
  return hostFetch(input, { ...init, headers });
};
