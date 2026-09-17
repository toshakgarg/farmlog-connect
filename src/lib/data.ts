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
import { fbDb } from "./firebase";
import type { AppUser, FarmerRecord, SurveyQuestion } from "./types";
import type { JOITAPerforma } from "./types";
import {
  cacheMeta,
  readMeta,
} from "./offline";
export {
  pushRecord,
  saveRecordLocalFirst,
  syncPending,
} from "./record-sync";

// This module owns Firestore CRUD, question caching, CSV export, and the
// JOITA collection API. Record upload/sync lives in ./record-sync.

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
      r.photos
        .map(
          (p) =>
            `${p.latitude ?? "?"},${p.longitude ?? "?"}@${new Date(p.timestamp).toISOString()}`,
        )
        .join(" | "),
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

/* ------------------------ JOITA Performa ------------------------- */

export async function saveJOITAPerforma(data: Partial<JOITAPerforma>): Promise<string> {
  const collectionRef = collection(fbDb(), "joita_performas");
  const id = data.id || doc(collectionRef).id;
  const now = new Date().toISOString();
  const cleanData = {
    ...data,
    id,
    updatedAt: now,
    createdAt: data.createdAt || now,
  };
  
  // Note: if photos are present, this will save photo metadata. If you need to handle photo blob upload, 
  // you might need a separate pushJOITAPerforma logic. For now, matching the requested signature.
  await setDoc(doc(fbDb(), "joita_performas", id), cleanData, { merge: true });
  return id;
}

export async function getJOITAPerformasBySupervisor(supervisorId: string): Promise<JOITAPerforma[]> {
  const snap = await getDocs(
    query(collection(fbDb(), "joita_performas"), where("supervisorId", "==", supervisorId))
  );
  return snap.docs.map((d) => d.data() as JOITAPerforma);
}

export async function getAllJOITAPerformas(): Promise<JOITAPerforma[]> {
  const snap = await getDocs(collection(fbDb(), "joita_performas"));
  return snap.docs.map((d) => d.data() as JOITAPerforma);
}

export async function deleteJOITAPerforma(id: string): Promise<void> {
  await deleteDoc(doc(fbDb(), "joita_performas", id));
}
