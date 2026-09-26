import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { fbDb, fbStorage } from "./firebase";
import {
  allLocalRecords,
  deletePhotoBlob,
  getPhotoBlob,
  putLocalRecord,
  type LocalRecord,
} from "./offline";
import type { FarmerRecord } from "./types";

/**
 * Record synchronization boundary.
 *
 * Forms write to IndexedDB first. These functions upload pending photos and
 * records to Firebase, then mark the local record as clean after success.
 */

export async function pushRecord(record: FarmerRecord): Promise<FarmerRecord> {
  const photos = [];
  for (const photo of record.photos) {
    if (photo.localKey && !photo.url.startsWith("http")) {
      const blob = await getPhotoBlob(photo.localKey);
      if (blob) {
        const path = `farmer-photos/${record.id}/${photo.localKey}.jpg`;
        const storageRef = ref(fbStorage(), path);
        await uploadBytes(storageRef, blob, {
          customMetadata: {
            latitude: String(photo.latitude ?? ""),
            longitude: String(photo.longitude ?? ""),
            timestamp: String(photo.timestamp),
          },
        });
        const url = await getDownloadURL(storageRef);
        console.log('Photo URL stored:', url);
        await deletePhotoBlob(photo.localKey);
        photos.push({ ...photo, url, localKey: undefined });
        continue;
      }
    }
    photos.push(photo);
  }

  const clean: FarmerRecord = {
    ...record,
    photos: photos.map((photo) => ({
      url: photo.url,
      latitude: photo.latitude ?? null,
      longitude: photo.longitude ?? null,
      accuracy: photo.accuracy ?? null,
      timestamp: photo.timestamp,
    })),
    status: record.status === "draft" ? "draft" : "synced",
    updatedAt: Date.now(),
  };

  const { id, ...rest } = clean;
  await setDoc(doc(fbDb(), "farmers", id), rest, { merge: true });
  return clean;
}

export async function saveRecordLocalFirst(record: FarmerRecord): Promise<LocalRecord> {
  const local: LocalRecord = { ...record, dirty: true, updatedAt: Date.now() };
  await putLocalRecord(local);
  if (navigator.onLine) {
    try {
      const pushed = await pushRecord(local);
      const clean: LocalRecord = { ...pushed, dirty: false };
      await putLocalRecord(clean);
      return clean;
    } catch {
      // Keep the dirty record queued for a later sync attempt.
    }
  }
  return local;
}

export async function syncPending(): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const records = await allLocalRecords();
  let synced = 0;
  let failed = 0;
  for (const record of records.filter((item) => item.dirty)) {
    try {
      const pushed = await pushRecord(record);
      await putLocalRecord({ ...pushed, dirty: false });
      synced++;
    } catch {
      failed++;
    }
  }
  return { synced, failed };
}
