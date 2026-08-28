/**
 * Resolves the weather gateway at the application boundary.
 *
 * Development and preview keep the same-origin `/external/*` paths handled by
 * Vite. A deployed web build can set `VITE_WEATHER_GATEWAY_BASE_URL` to its
 * configured gateway, while Tauri can inject the same value at build time.
 * The clients never contain provider URLs or assume that Vite exists.
 */
const env = import.meta.env as Record<string, string | undefined>;
const configuredBaseUrl = (env.VITE_WEATHER_GATEWAY_BASE_URL ?? '').replace(/\/+$/u, '');

export function weatherGatewayUrl(path: string): string {
  return configuredBaseUrl ? `${configuredBaseUrl}${path}` : path;
}
