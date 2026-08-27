import { useEffect, useState } from 'react';

export interface StoredReportAsset { readonly id: string; readonly kind: 'logo' | 'signature'; readonly filename: string; readonly mimeType: string; readonly byteLength: number; readonly blob: Blob; }
export const MAX_REPORT_ASSET_BYTES = 2 * 1024 * 1024;
const memoryAssets = new Map<string, StoredReportAsset>();

export class BrowserReportAssetRepository {
  public async validate(file: File): Promise<void> { if (file.size > MAX_REPORT_ASSET_BYTES) throw new Error('REPORT_ASSET_TOO_LARGE'); if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) throw new Error('REPORT_ASSET_UNSUPPORTED_TYPE'); if (file.type === 'image/svg+xml' && /<\s*(?:script|foreignObject)|on[a-z]+\s*=/iu.test(await file.text())) throw new Error('REPORT_ASSET_UNSAFE_SVG'); }
  public async store(file: File, kind: 'logo' | 'signature'): Promise<StoredReportAsset> { await this.validate(file); const asset = { id: crypto.randomUUID(), kind, filename: file.name, mimeType: file.type, byteLength: file.size, blob: file } satisfies StoredReportAsset; memoryAssets.set(asset.id, asset); try { const database = await openDatabase(); if (database) await request(database, 'readwrite', (store) => store.put(asset)); return asset; } catch { memoryAssets.delete(asset.id); throw new Error('REPORT_ASSET_WRITE_FAILED'); } }
  public async get(id: string): Promise<StoredReportAsset | null> { const memory = memoryAssets.get(id); if (memory) return memory; const database = await openDatabase(); if (!database) return null; const asset = await request(database, 'readonly', (store) => store.get(id)) as StoredReportAsset | undefined; if (asset) memoryAssets.set(id, asset); return asset ?? null; }
  public async remove(id: string): Promise<void> { memoryAssets.delete(id); const database = await openDatabase(); if (database) await request(database, 'readwrite', (store) => store.delete(id)); }
}

export const reportAssetRepository = new BrowserReportAssetRepository();

export function useReportAssetUrl(id: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let active = true; if (!id) { setUrl(null); return () => { active = false; }; } void reportAssetRepository.get(id).then((asset) => { if (active) setUrl(asset ? URL.createObjectURL(asset.blob) : null); }); return () => { active = false; setUrl((current) => { if (current) URL.revokeObjectURL(current); return null; }); }; }, [id]);
  return url;
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => { const open = indexedDB.open('kya-sol-design-report-assets', 1); open.onupgradeneeded = () => open.result.createObjectStore('assets', { keyPath: 'id' }); open.onsuccess = () => resolve(open.result); open.onerror = () => resolve(null); });
}

function request(database: IDBDatabase, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<unknown> { return new Promise((resolve, reject) => { const transaction = database.transaction('assets', mode); const result = action(transaction.objectStore('assets')); result.onsuccess = () => resolve(result.result); result.onerror = () => reject(result.error); }); }
