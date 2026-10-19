import { isDesktop, nativeCall } from "./desktop";
import { deckSchema } from "./backup";
import type { StateStorage } from "zustand/middleware";
const LEGACY_KEY = "juw-microslides-v661-intro-logo";
export const storageHealth = { warning: "" };
function warn(message: string) {
  storageHealth.warning = message;
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("juw-storage", { detail: message }));
}
function valid(raw: string) {
  try {
    const value = JSON.parse(raw);
    return (
      Array.isArray(value.state?.library) &&
      value.state.library.every((deck: unknown) => deckSchema.safeParse(deck).success)
    );
  } catch {
    return false;
  }
}
export async function readRecoverySave() {
  return readLocalRecord("recovery-original");
}
let connection: Promise<IDBDatabase> | undefined;
function database() {
  return (connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("juw-microslides", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("state");
    request.onsuccess = () => resolve(request.result);
    request.onblocked = () => reject(new Error("Close other tabs to finish the storage update."));
    request.onerror = () => reject(request.error);
  }));
}
export async function readLocalRecord(key: string): Promise<string | null> {
  if (isDesktop()) return nativeCall<string | null>("state_get", { key });
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction("state").objectStore("state").get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}
export async function writeLocalRecord(key: string, value: string | null) {
  if (isDesktop()) return nativeCall<void>("state_put", { key, value });
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("state", "readwrite");
    const store = transaction.objectStore("state");
    if (value === null) store.delete(key);
    else store.put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
let queue = Promise.resolve();
export async function flushSavedDecks() {
  await queue;
  if (storageHealth.warning.startsWith("Could not save changes"))
    throw new Error("Changes could not be saved. Download an editable backup before reloading.");
}
export const durableStorage: StateStorage = {
  async getItem(key) {
    try {
      const saved = await readLocalRecord(key);
      if (saved && valid(saved)) return saved;
      if (saved) {
        await writeLocalRecord("recovery-original", saved);
        warn(
          "A damaged save was preserved for recovery. Open Library to download the previous raw save; do not rely on the sample deck as your original work.",
        );
      }
      // Keep the original copy until users have exported and verified a backup.
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy && valid(legacy)) {
        await writeLocalRecord(key, legacy);
        return legacy;
      }
      return null;
    } catch {
      warn("Storage unavailable. Download an editable backup before closing this page.");
      try {
        const legacy = localStorage.getItem(LEGACY_KEY);
        return legacy && valid(legacy) ? legacy : null;
      } catch {
        return null;
      }
    }
  },
  setItem(key, value) {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("juw-saving"));
    queue = queue
      .then(() => writeWorkspace(key, value))
      .then(() => {
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("juw-saved"));
      })
      .catch(() => {
        warn("Could not save changes. Download an editable backup now; do not close this page.");
      });
    return queue;
  },
  async removeItem(key) {
    await queue;
    await writeLocalRecord(key, null);
  },
};

export type DeckRevision = { id: string; createdAt: number; deck: import("./types").Deck };
export async function listDeckRevisions(deckId: string): Promise<DeckRevision[]> {
  const raw = await readLocalRecord("deck-revisions");
  return (raw ? (JSON.parse(raw) as DeckRevision[]) : []).filter((r) => r.deck.id === deckId);
}
async function writeWorkspace(key: string, value: string) {
  if (isDesktop()) return nativeCall<void>("state_put", { key, value });
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("state", "readwrite"),
      store = tx.objectStore("state");
    const old = store.get(key),
      history = store.get("deck-revisions");
    let previous: string | null = null,
      revisions: DeckRevision[] = [];
    let done = 0;
    const save = () => {
      if (++done !== 2) return;
      try {
        const before = previous ? JSON.parse(previous).state?.library || [] : [];
        const after = JSON.parse(value).state?.library || [];
        for (const deck of before)
          if (
            !after.some(
              (d: import("./types").Deck) =>
                d.id === deck.id && JSON.stringify(d) === JSON.stringify(deck),
            )
          )
            revisions.push({ id: crypto.randomUUID(), createdAt: Date.now(), deck });
        revisions = revisions.slice(-100);
        while (JSON.stringify(revisions).length > 20000000 && revisions.length) revisions.shift();
        store.put(JSON.stringify(revisions), "deck-revisions");
        store.put(value, key);
      } catch (error) {
        tx.abort();
        reject(error);
      }
    };
    old.onsuccess = () => {
      previous = old.result;
      save();
    };
    history.onsuccess = () => {
      try {
        revisions = JSON.parse(history.result || "[]");
        save();
      } catch (e) {
        tx.abort();
        reject(e);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Save transaction aborted"));
  });
}
export async function storageUsage() {
  const estimate =
    typeof navigator !== "undefined" && navigator.storage ? await navigator.storage.estimate() : {};
  const revisions = (await readLocalRecord("deck-revisions")) || "[]";
  return {
    used: estimate.usage,
    quota: estimate.quota,
    revisionBytes: new Blob([revisions]).size,
    revisions: (JSON.parse(revisions) as DeckRevision[]).length,
  };
}
