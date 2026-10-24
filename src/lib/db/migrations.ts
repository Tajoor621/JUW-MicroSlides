/** Schema version is independent from the permanent application version lock. */
export const WORKSPACE_DB_NAME = "juw-microslides";
export const WORKSPACE_DB_VERSION = 2;
export const WORKSPACE_MIGRATIONS = [
  { version: 1, description: "Key/value state and recovery records" },
  { version: 2, description: "Add schema history without rewriting saved decks" },
] as const;
export function migrateWorkspace(db: IDBDatabase, tx: IDBTransaction, oldVersion: number) {
  if (oldVersion < 1 && !db.objectStoreNames.contains("state")) db.createObjectStore("state");
  if (oldVersion < 2) {
    if (!db.objectStoreNames.contains("schema-history"))
      db.createObjectStore("schema-history", { keyPath: "version" });
    for (const migration of WORKSPACE_MIGRATIONS) tx.objectStore("schema-history").put(migration);
  }
}
export function openWorkspaceDatabase(
  onClosed: () => void = () => {},
  onBlocked: () => void = () => {},
) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(WORKSPACE_DB_NAME, WORKSPACE_DB_VERSION);
    request.onupgradeneeded = (event) =>
      migrateWorkspace(request.result, request.transaction!, event.oldVersion);
    // Do not reject into an empty-library fallback while an upgrade is pending.
    // The request resumes when the older connection closes.
    request.onblocked = () => onBlocked();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        onClosed();
      };
      resolve(db);
    };
  });
}
