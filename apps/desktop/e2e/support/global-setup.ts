import { mkdirSync, writeFileSync } from 'node:fs';
import { commercialLicenceStorage } from './licence';

/**
 * Avant les parcours : un poste déjà licencié (licence commerciale d'un an signée par la clé de
 * test), comme un utilisateur qui a activé sa clé. Remplace l'ancienne licence de démonstration
 * du premier lancement, retirée du logiciel (T061).
 */
export const STORAGE_STATE = new URL('../../../../test-results/.auth/licence.json', import.meta.url);

export default async function globalSetup(): Promise<void> {
  const localStorage = await commercialLicenceStorage();
  const origins = ['http://127.0.0.1:4173', 'http://127.0.0.1:4174'].map((origin) => ({ origin, localStorage }));
  mkdirSync(new URL('.', STORAGE_STATE), { recursive: true });
  writeFileSync(STORAGE_STATE, JSON.stringify({ cookies: [], origins }, null, 2));
}
