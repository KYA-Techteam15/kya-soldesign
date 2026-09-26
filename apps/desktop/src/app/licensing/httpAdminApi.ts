import { isTauri } from '../platform/runtime.js';
import type { ActivateError, AdminApi, EditionDescriptor, RefreshError } from './adminApi.js';

/**
 * API des licences de la plateforme KYA-EnergyMarket (`/api/software/v1`, contrat KYA-SolDesign,
 * spec 012 T061). Sous Tauri, la requête part de l'hôte (plugin HTTP, liste fermée d'adresses) ;
 * dans un navigateur, du `fetch` habituel (la plateforme répond en CORS ouvert).
 *
 * Une panne réseau ou une erreur du serveur lève une exception : l'interface l'annonce comme
 * « plateforme injoignable » et la licence enregistrée reste valable hors ligne.
 */
type Fetch = typeof fetch;

const hostFetch: Fetch = async (input, init) => {
  if (!isTauri()) return globalThis.fetch(input, init);
  const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
  return tauriFetch(input, init);
};

export class HttpAdminApi implements AdminApi {
  constructor(
    private readonly baseUrl: string,
    private readonly deviceName: string | null = null,
    private readonly fetcher: Fetch = hostFetch,
  ) {}

  private url(path: string): string {
    if (!this.baseUrl) throw new Error('adresse de la plateforme non configurée');
    return `${this.baseUrl}/api/software/v1${path}`;
  }

  private async call(path: string, body?: Record<string, unknown>): Promise<Response> {
    return this.fetcher(this.url(path), {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'content-type': 'application/json', accept: 'application/json' } : { accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /** Réponse métier `{ error }` (404, 409, 429) ou exception pour tout le reste. */
  private async read<T>(response: Response): Promise<T | { readonly error: string }> {
    if (response.ok) return (await response.json()) as T;
    if (response.status === 404 || response.status === 409 || response.status === 429) {
      const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
      return { error: typeof payload.error === 'string' ? payload.error : response.status === 429 ? 'RATE_LIMITED' : 'LICENSE_UNKNOWN' };
    }
    throw new Error(`plateforme : statut ${response.status}`);
  }

  async now(): Promise<string> {
    const result = await this.read<{ now: string }>(await this.call('/time'));
    if ('error' in result) throw new Error(result.error);
    return result.now;
  }

  async catalog(): Promise<readonly EditionDescriptor[]> {
    const result = await this.read<EditionDescriptor[]>(await this.call('/products/kya-soldesign/editions'));
    if ('error' in result) throw new Error(result.error);
    return result;
  }

  async activate(key: string, deviceId: string) {
    const body: Record<string, unknown> = { key, deviceId };
    if (this.deviceName) body.deviceName = this.deviceName;
    return this.read<{ token: string }>(await this.call('/licenses/activate', body)) as Promise<
      { readonly token: string } | { readonly error: ActivateError }
    >;
  }

  async refresh(licenseId: string, deviceId: string) {
    return this.read<{ token: string }>(await this.call(`/licenses/${encodeURIComponent(licenseId)}/refresh`, { deviceId })) as Promise<
      { readonly token: string } | { readonly error: RefreshError }
    >;
  }

  async release(licenseId: string, deviceId: string): Promise<void> {
    const response = await this.call(`/licenses/${encodeURIComponent(licenseId)}/release`, { deviceId });
    if (!response.ok && response.status !== 204) throw new Error(`plateforme : statut ${response.status}`);
  }
}
