import {
  getUserProfile,
  createUserProfile,
  getAllUsers,
  deleteUserProfile,
  getSurveyQuestions,
  saveSurveyQuestion,
  deleteSurveyQuestion,
  getAllFarmerRecords,
  getFarmersBySupervisor,
  getFarmerRecord,
  deleteFarmerRecord,
  saveJOITAPerforma as dbSaveJOITAPerforma,
  getJOITAPerformasBySupervisor as dbGetJOITAPerformasBySupervisor,
  getAllJOITAPerformas as dbGetAllJOITAPerformas,
  deleteJOITAPerforma as dbDeleteJOITAPerforma
} from './db'
import { cacheMeta, readMeta } from './offline'
import type { AppUser, FarmerRecord, SurveyQuestion, JOITAPerforma } from './types'

export {
  pushRecord,
  saveRecordLocalFirst,
  syncPending,
} from "./record-sync";

// Users
export async function getAppUser(uid: string): Promise<AppUser | null> {
  return getUserProfile(uid)
}

export async function saveAppUser(user: AppUser) {
  // get existing user to preserve passwordHash
  const { getUserByEmail } = await import('./db')
  const existing = await getUserByEmail(user.email)
  await createUserProfile({ ...user, passwordHash: existing?.passwordHash || '' })
}

export async function listUsers(role: AppUser['role']): Promise<AppUser[]> {
  return getAllUsers(role)
}

export async function deleteAppUser(uid: string) {
  await deleteUserProfile(uid)
}

// Questions
export async function listQuestions(): Promise<SurveyQuestion[]> {
  try {
    const qs = await getSurveyQuestions()
    await cacheMeta('questions', qs)
    return qs
  } catch {
    return (await readMeta<SurveyQuestion[]>('questions')) ?? []
  }
}

export async function saveQuestion(q: SurveyQuestion) {
  await saveSurveyQuestion(q)
}

export async function deleteQuestion(id: string) {
  await deleteSurveyQuestion(id)
}

// Records
export async function listRecords(supervisorID?: string): Promise<FarmerRecord[]> {
  if (supervisorID) {
    return getFarmersBySupervisor(supervisorID)
  }
  return getAllFarmerRecords()
}

export async function getRecord(id: string): Promise<FarmerRecord | null> {
  return getFarmerRecord(id)
}

export async function deleteRecord(id: string) {
  await deleteFarmerRecord(id)
}

// CSV
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

// JOITA Performa
export async function saveJOITAPerforma(data: Partial<JOITAPerforma>): Promise<string> {
  return dbSaveJOITAPerforma(data)
}

export async function getJOITAPerformasBySupervisor(supervisorId: string): Promise<JOITAPerforma[]> {
  return dbGetJOITAPerformasBySupervisor(supervisorId)
}

export async function getAllJOITAPerformas(): Promise<JOITAPerforma[]> {
  return dbGetAllJOITAPerformas()
}

export async function deleteJOITAPerforma(id: string): Promise<void> {
  return dbDeleteJOITAPerforma(id)
}
