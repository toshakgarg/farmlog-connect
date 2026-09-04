export type Role = "admin" | "supervisor" | "farmer";

export type RecordStatus = "draft" | "submitted" | "synced";

export type QuestionType = "category" | "numeric" | "text";

export interface SurveyQuestion {
  id: string;
  labelEn: string;
  labelHi: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
  order: number;
  farmerEditable?: boolean;
}

export interface PhotoMeta {
  url: string;
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  timestamp: number;
  /** local IndexedDB key when the photo has not been uploaded yet */
  localKey?: string;
}

export interface FarmerRecord {
  id: string;
  fullName: string;
  age: number | null;
  gender: "male" | "female" | "other" | "";
  contactNumber: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  killahs: number | null;
  isLeadFarmer: boolean;
  leadFarmerID: string | null;
  supervisorID: string;
  answers: Record<string, string | number>;
  photos: PhotoMeta[];
  status: RecordStatus;
  createdAt: number;
  updatedAt: number;
  authUid?: string | null;
}

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: Role;
  farmerRecordId?: string | null;
  phone?: string;
  createdAt: number;
  createdBy?: string;
  active?: boolean;
}

export const emptyFarmer = (supervisorID: string): FarmerRecord => ({
  id: "",
  fullName: "",
  age: null,
  gender: "",
  contactNumber: "",
  village: "",
  tehsil: "",
  district: "",
  state: "",
  killahs: null,
  isLeadFarmer: true,
  leadFarmerID: null,
  supervisorID,
  answers: {},
  photos: [],
  status: "draft",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
