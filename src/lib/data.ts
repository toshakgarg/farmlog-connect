import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { fbDb, fbStorage } from "./firebase";
import type { AppUser, FarmerRecord, SurveyQuestion } from "./types";
import {
  allLocalRecords,
  cacheMeta,
  deletePhotoBlob,
  getPhotoBlob,
  putLocalRecord,
  readMeta,
  type LocalRecord,
} from "./offline";

/* ----------------------------- users ----------------------------- */

export async function getAppUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(fbDb(), "users", uid));
  return snap.exists() ? ({ uid, ...snap.data() } as AppUser) : null;
}

export async function saveAppUser(user: AppUser) {
  const { uid, ...rest } = user;
  await setDoc(doc(fbDb(), "users", uid), rest, { merge: true });
}

export async function listUsers(role: AppUser["role"]): Promise<AppUser[]> {
  const snap = await getDocs(query(collection(fbDb(), "users"), where("role", "==", role)));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as AppUser);
}

export async function deleteAppUser(uid: string) {
  await deleteDoc(doc(fbDb(), "users", uid));
}

/* --------------------------- questions --------------------------- */

export async function listQuestions(): Promise<SurveyQuestion[]> {
  try {
    const snap = await getDocs(query(collection(fbDb(), "questions"), orderBy("order")));
    const qs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SurveyQuestion);
    await cacheMeta("questions", qs);
    return qs;
  } catch {
    return (await readMeta<SurveyQuestion[]>("questions")) ?? [];
  }
}

export async function saveQuestion(q: SurveyQuestion) {
  const { id, ...rest } = q;
  await setDoc(doc(fbDb(), "questions", id), rest, { merge: true });
}

export async function deleteQuestion(id: string) {
  await deleteDoc(doc(fbDb(), "questions", id));
}

/* ---------------------------- records ---------------------------- */

export async function listRecords(supervisorID?: string): Promise<FarmerRecord[]> {
  const base = collection(fbDb(), "farmers");
  const snap = await getDocs(
    supervisorID ? query(base, where("supervisorID", "==", supervisorID)) : query(base),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FarmerRecord);
}

export async function getRecord(id: string): Promise<FarmerRecord | null> {
  const snap = await getDoc(doc(fbDb(), "farmers", id));
  return snap.exists() ? ({ id, ...snap.data() } as FarmerRecord) : null;
}

export async function deleteRecord(id: string) {
  await deleteDoc(doc(fbDb(), "farmers", id));
}

export async function pushRecord(record: FarmerRecord): Promise<FarmerRecord> {
  const photos = [];
  for (const p of record.photos) {
    if (p.localKey && !p.url.startsWith("http")) {
      const blob = await getPhotoBlob(p.localKey);
      if (blob) {
        const path = `farmer-photos/${record.id}/${p.localKey}.jpg`;
        const storageRef = ref(fbStorage(), path);
        await uploadBytes(storageRef, blob, {
          customMetadata: {
            latitude: String(p.latitude ?? ""),
            longitude: String(p.longitude ?? ""),
            timestamp: String(p.timestamp),
          },
        });
        const url = await getDownloadURL(storageRef);
        await deletePhotoBlob(p.localKey);
        photos.push({ ...p, url, localKey: undefined });
        continue;
      }
    }
    photos.push(p);
  }

  const clean: FarmerRecord = {
    ...record,
    photos: photos.map((p) => ({
      url: p.url,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
      accuracy: p.accuracy ?? null,
      timestamp: p.timestamp,
    })),
    status: record.status === "draft" ? "draft" : "synced",
    updatedAt: Date.now(),
  };

  const { id, ...rest } = clean;
  await setDoc(doc(fbDb(), "farmers", id), rest, { merge: true });
  return clean;
}

/* ------------------------- offline syncing ------------------------ */

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
      /* stays queued */
    }
  }
  return local;
}

export async function syncPending(): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0 };
  const records = await allLocalRecords();
  let synced = 0;
  let failed = 0;
  for (const r of records.filter((x) => x.dirty)) {
    try {
      const pushed = await pushRecord(r);
      await putLocalRecord({ ...pushed, dirty: false });
      synced++;
    } catch {
      failed++;
    }
  }
  return { synced, failed };
}

/* ------------------------------ csv ------------------------------ */

export function recordsToCsv(records: FarmerRecord[], questions: SurveyQuestion[]): string {
  const headers = [
    "id",
    "fullName",
    "age",
    "gender",
    "contactNumber",
    "village",
    "tehsil",
    "district",
    "state",
    "killahs",
    "isLeadFarmer",
    "leadFarmerID",
    "supervisorID",
    "status",
    "photoCount",
    "photoGps",
    "createdAt",
    "updatedAt",
    ...questions.map((q) => q.labelEn),
  ];
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = records.map((r) =>
    [
      r.id,
      r.fullName,
      r.age,
      r.gender,
      r.contactNumber,
      r.village,
      r.tehsil,
      r.district,
      r.state,
      r.killahs,
      r.isLeadFarmer ? "yes" : "no",
      r.leadFarmerID ?? "",
      r.supervisorID,
      r.status,
      r.photos.length,
      r.photos.map((p) => `${p.latitude ?? "?"},${p.longitude ?? "?"}@${new Date(p.timestamp).toISOString()}`).join(" | "),
      new Date(r.createdAt).toISOString(),
      new Date(r.updatedAt).toISOString(),
      ...questions.map((q) => r.answers?.[q.id] ?? ""),
    ]
      .map(escape)
      .join(","),
  );
  return [headers.map(escape).join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
