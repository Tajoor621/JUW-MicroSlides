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
  return read("recovery-original");
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
async function read(key: string): Promise<string | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction("state").objectStore("state").get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}
async function write(key: string, value: string | null) {
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
      const saved = await read(key);
      if (saved && valid(saved)) return saved;
      if (saved) {
        await write("recovery-original", saved);
        warn(
          "A damaged save was preserved for recovery. Open Library to download the previous raw save; do not rely on the sample deck as your original work.",
        );
      }
      // Keep the original copy until users have exported and verified a backup.
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy && valid(legacy)) {
        await write(key, legacy);
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
      .then(() => write(key, value))
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
    await write(key, null);
  },
};
