import type { StateStorage } from 'zustand/middleware';

export type SaveStatus = 'saving' | 'saved' | 'error';
let saveStatus: SaveStatus = 'saved';
export const getSaveStatus = () => saveStatus;
const notify = (status: SaveStatus) => {
  saveStatus = status;
  if (typeof window !== 'undefined')
    window.dispatchEvent(new CustomEvent('etal-save', { detail: status }));
};
let database: Promise<IDBDatabase> | undefined;
function open() {
  if (!database)
    database = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('Stockage indisponible'));
        return;
      }
      const request = indexedDB.open('etal-project', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('data');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Stockage occupé'));
    });
  return database;
}
async function read(key: string): Promise<string | null> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction('data', 'readonly').objectStore('data').get(key);
    req.onsuccess = () =>
      resolve(typeof req.result === 'string' ? req.result : null);
    req.onerror = () => reject(req.error);
  });
}
// Serialize writes so an older mutation never overwrites a newer one.
let queue: Promise<void> = Promise.resolve();
let writeSequence = 0;
function readLegacy(name: string) {
  try {
    return typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem(name);
  } catch {
    notify('error');
    return null;
  }
}
export const projectStorage: StateStorage = {
  async getItem(name) {
    try {
      return (await read(name)) ?? readLegacy(name);
    } catch {
      notify('error');
      return readLegacy(name);
    }
  },
  setItem(name, value) {
    const sequence = ++writeSequence;
    notify('saving');
    queue = queue
      .catch(() => {})
      .then(async () => {
        const db = await open();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('data', 'readwrite');
          const store = tx.objectStore('data');
          const previous = store.get(name);
          previous.onsuccess = () => {
            if (previous.result) store.put(previous.result, name + '-previous');
            store.put(value, name);
          };
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
        if (sequence === writeSequence) notify('saved');
      })
      .catch(() => {
        if (sequence === writeSequence) notify('error');
      });
    return queue;
  },
  async removeItem(name) {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('data', 'readwrite');
      tx.objectStore('data').delete(name);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
