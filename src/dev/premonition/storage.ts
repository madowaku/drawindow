import type { SessionSnapshot } from '../../lib/sessionStorage';

export const STUDY_DATABASE_NAME = 'drawindow-premonition-study-v011';
let connection: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  if (!connection) connection = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(STUDY_DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('sessions');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Study save database blocked'));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = undefined; };
      resolve(db);
    };
  }).catch(error => { connection = undefined; throw error; });
  return connection;
}

/** Saves the study game snapshot only. Recordings/evaluations are never automatically exported. */
export const studySessionStore = {
  async read(): Promise<unknown> {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sessions', 'readonly');
      const request = transaction.objectStore('sessions').get('current');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('Study read aborted'));
    });
  },
  async write(snapshot: SessionSnapshot | null): Promise<void> {
    const db = await database();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('sessions', 'readwrite');
      const store = transaction.objectStore('sessions');
      if (snapshot) store.put(snapshot, 'current'); else store.delete('current');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error('Study save aborted'));
      transaction.onerror = () => reject(transaction.error);
    });
  },
};
