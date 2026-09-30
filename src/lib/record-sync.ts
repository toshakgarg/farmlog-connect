import { uploadPhoto } from './storage'
import { saveFarmerRecord } from './db'
import {
  allLocalRecords,
  deletePhotoBlob,
  getPhotoBlob,
  putLocalRecord,
  type LocalRecord,
} from './offline'
import type { FarmerRecord } from './types'

export async function pushRecord(record: FarmerRecord): Promise<FarmerRecord> {
  const photos = []
  for (const photo of record.photos) {
    if (photo.localKey && !photo.url.startsWith('http')) {
      const blob = await getPhotoBlob(photo.localKey)
      if (blob) {
        // convert blob to base64 for uploadPhoto
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        
        const fileName = `${photo.localKey}.jpg`
        const url = await uploadPhoto(base64Data, fileName, record.id)
        
        console.log('Photo URL stored:', url)
        await deletePhotoBlob(photo.localKey)
        photos.push({ ...photo, url, localKey: undefined })
        continue
      }
    }
    photos.push(photo)
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
    status: record.status === 'draft' ? 'draft' : 'synced',
    updatedAt: Date.now(),
  }

  await saveFarmerRecord(clean)
  return clean
}

export async function saveRecordLocalFirst(record: FarmerRecord): Promise<LocalRecord> {
  const local: LocalRecord = { ...record, dirty: true, updatedAt: Date.now() }
  await putLocalRecord(local)
  if (navigator.onLine) {
    try {
      const pushed = await pushRecord(local)
      const clean: LocalRecord = { ...pushed, dirty: false }
      await putLocalRecord(clean)
      return clean
    } catch {
      // Keep the dirty record queued for a later sync attempt.
    }
  }
  return local
}

export async function syncPending(): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0 }

  const records = await allLocalRecords()
  let synced = 0
  let failed = 0
  for (const record of records.filter((item) => item.dirty)) {
    try {
      const pushed = await pushRecord(record)
      await putLocalRecord({ ...pushed, dirty: false })
      synced++
    } catch {
      failed++
    }
  }
  return { synced, failed }
}
