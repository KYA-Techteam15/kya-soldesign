/**
 * Dépôt durable des projets : un enregistrement par projet, écrit de façon
 * asynchrone. IndexedDB dans le navigateur, SQLite sous Tauri
 * (`platform/tauriProjectStore.ts`). Aucune limite de 5 Mo comme localStorage.
 */
export interface StoredProjectRecord {
  readonly id: string;
  readonly json: string;
  readonly updatedAt: string;
}

export interface ProjectStore {
  readonly kind: 'indexeddb' | 'sqlite' | 'memory';
  loadAll(): Promise<readonly StoredProjectRecord[]>;
  put(record: StoredProjectRecord): Promise<void>;
  remove(id: string): Promise<void>;
}

export class MemoryProjectStore implements ProjectStore {
  public readonly kind = 'memory' as const;
  private readonly records = new Map<string, StoredProjectRecord>();
  public failNextWrites = 0;
  public constructor(seed: readonly StoredProjectRecord[] = []) { for (const record of seed) this.records.set(record.id, record); }
  public loadAll(): Promise<readonly StoredProjectRecord[]> { return Promise.resolve([...this.records.values()]); }
  public put(record: StoredProjectRecord): Promise<void> {
    if (this.failNextWrites > 0) { this.failNextWrites -= 1; return Promise.reject(new Error('STORE_WRITE_FAILED')); }
    this.records.set(record.id, record); return Promise.resolve();
  }
  public remove(id: string): Promise<void> { this.records.delete(id); return Promise.resolve(); }
  public snapshot(): readonly StoredProjectRecord[] { return [...this.records.values()]; }
}

// Base distincte de la bibliothèque météo : chacune gère ses propres versions de schéma.
const DATABASE = 'kya-sol-design-projects';
const STORE = 'projects';

export class IndexedDbProjectStore implements ProjectStore {
  public readonly kind = 'indexeddb' as const;
  private database: Promise<IDBDatabase> | null = null;
  public constructor(private readonly factory: IDBFactory = globalThis.indexedDB) {}

  private open(): Promise<IDBDatabase> {
    this.database ??= new Promise((resolve, reject) => {
      const request = this.factory.open(DATABASE, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' }); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('INDEXEDDB_OPEN_FAILED'));
    });
    return this.database;
  }

  private async run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? request.error ?? new Error('INDEXEDDB_WRITE_FAILED'));
      transaction.onabort = () => reject(transaction.error ?? new Error('INDEXEDDB_ABORTED'));
    });
  }

  public loadAll(): Promise<readonly StoredProjectRecord[]> { return this.run('readonly', (store) => store.getAll() as IDBRequest<StoredProjectRecord[]>); }
  public async put(record: StoredProjectRecord): Promise<void> { await this.run('readwrite', (store) => store.put(record)); }
  public async remove(id: string): Promise<void> { await this.run('readwrite', (store) => store.delete(id)); }
}
