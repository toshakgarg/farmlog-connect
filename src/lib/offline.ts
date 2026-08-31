import { openDB, type IDBPDatabase } from "idb";
import type { FarmerRecord } from "./types";

const DB_NAME = "farmlog";
const STORE_RECORDS = "records";
const STORE_PHOTOS = "photos";
const STORE_META = "meta";

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  if (typeof window === "undefined") throw new Error("IndexedDB unavailable on server");
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE_RECORDS))
          d.createObjectStore(STORE_RECORDS, { keyPath: "id" });
        if (!d.objectStoreNames.contains(STORE_PHOTOS)) d.createObjectStore(STORE_PHOTOS);
        if (!d.objectStoreNames.contains(STORE_META)) d.createObjectStore(STORE_META);
      },
    });
  }
  return dbPromise;
}

export interface LocalRecord extends FarmerRecord {
  /** true when this record still needs to be pushed to Firestore */
  dirty: boolean;
}

export async function putLocalRecord(record: LocalRecord) {
  return (await db()).put(STORE_RECORDS, record);
}

export async function getLocalRecord(id: string): Promise<LocalRecord | undefined> {
  return (await db()).get(STORE_RECORDS, id);
}

export async function allLocalRecords(): Promise<LocalRecord[]> {
  return (await db()).getAll(STORE_RECORDS);
}

export async function deleteLocalRecord(id: string) {
  return (await db()).delete(STORE_RECORDS, id);
}

export async function putPhotoBlob(key: string, blob: Blob) {
  return (await db()).put(STORE_PHOTOS, blob, key);
}

export async function getPhotoBlob(key: string): Promise<Blob | undefined> {
  return (await db()).get(STORE_PHOTOS, key);
}

export async function deletePhotoBlob(key: string) {
  return (await db()).delete(STORE_PHOTOS, key);
}

export async function cacheMeta<T>(key: string, value: T) {
  return (await db()).put(STORE_META, value, key);
}

export async function readMeta<T>(key: string): Promise<T | undefined> {
  return (await db()).get(STORE_META, key);
}

export const newLocalId = () =>
  `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
