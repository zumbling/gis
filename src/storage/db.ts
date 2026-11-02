import type { CaptureRecord } from "../types";

const DB_NAME = "jumble-gis";
const STORE = "records";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function saveRecord(record: CaptureRecord): Promise<void> {
  await run("readwrite", (store) => store.put(record));
}

export async function getRecord(id: string): Promise<CaptureRecord | undefined> {
  return run<CaptureRecord | undefined>("readonly", (store) => store.get(id));
}

export async function listRecords(): Promise<CaptureRecord[]> {
  const records = await run<CaptureRecord[]>("readonly", (store) => store.getAll());
  return records.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}

export async function deleteRecord(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}
