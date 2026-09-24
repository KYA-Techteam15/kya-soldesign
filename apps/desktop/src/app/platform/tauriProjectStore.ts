import type { ProjectStore, StoredProjectRecord } from '../persistence/projectStore.js';

type Database = Awaited<ReturnType<typeof import('@tauri-apps/plugin-sql').default.load>>;

/** Nom de la base, relatif au dossier de données de l'application. */
export const PROJECT_DATABASE = 'sqlite:kya-sol-design.db';

/**
 * Dépôt SQLite de l'hôte Tauri : un fichier sauvegardable dans le dossier de
 * données de l'application, indépendant du profil WebView2.
 */
export class TauriSqliteProjectStore implements ProjectStore {
  public readonly kind = 'sqlite' as const;
  private database: Promise<Database> | null = null;

  private open(): Promise<Database> {
    this.database ??= (async () => {
      const { default: Sql } = await import('@tauri-apps/plugin-sql');
      const database = await Sql.load(PROJECT_DATABASE);
      await database.execute('CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at TEXT NOT NULL)');
      return database;
    })();
    return this.database;
  }

  public async loadAll(): Promise<readonly StoredProjectRecord[]> {
    const rows = await (await this.open()).select<{ id: string; json: string; updated_at: string }[]>('SELECT id, json, updated_at FROM projects');
    return rows.map((row) => ({ id: row.id, json: row.json, updatedAt: row.updated_at }));
  }

  public async put(record: StoredProjectRecord): Promise<void> {
    await (await this.open()).execute(
      'INSERT INTO projects (id, json, updated_at) VALUES ($1, $2, $3) ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at',
      [record.id, record.json, record.updatedAt],
    );
  }

  public async remove(id: string): Promise<void> {
    await (await this.open()).execute('DELETE FROM projects WHERE id = $1', [id]);
  }
}
