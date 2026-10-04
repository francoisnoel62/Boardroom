import Database from 'better-sqlite3';

/** Initial WAL promotion can return SQLITE_BUSY without honoring SQLite's busy
 * handler when simultaneous fresh connections would deadlock. Retry only this
 * idempotent local setup, with a monotonic five-second bound, never domain work. */
export function openDomainDatabase(path: string): Database.Database {
  const db = new Database(path, { timeout: 50 });
  const deadline = performance.now() + 5000;
  const pause = new Int32Array(new SharedArrayBuffer(4));
  for (;;) {
    try {
      db.pragma('journal_mode = WAL');
      db.exec(`CREATE TABLE IF NOT EXISTS records (
        kind TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL,
        PRIMARY KEY (kind, id)
      ); CREATE TABLE IF NOT EXISTS events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL, value TEXT NOT NULL
      )`);
      db.pragma('busy_timeout = 5000');
      return db;
    } catch (error) {
      if ((error as { code?: string }).code !== 'SQLITE_BUSY' || performance.now() >= deadline) {
        db.close(); throw error;
      }
      Atomics.wait(pause, 0, 0, Math.min(20, Math.max(0, deadline - performance.now())));
    }
  }
}
