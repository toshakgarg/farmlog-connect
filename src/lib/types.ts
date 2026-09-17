// Domain contracts shared by routes, forms, persistence, and authentication.
// Keep changes here deliberate: these types define the Firebase/local-store
// boundary used by the whole application.
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

export interface JOITAPerforma {
  id: string;
  farmerId: string;
  supervisorId: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "submitted";

  // Section 1 — Farmer ID & Location
  farmerIdCode: string;
  cluster: "Taragarh" | "Jaswant" | "Siwan" | "Cheeka" | "Other" | "";
  farmerName: string;
  fatherHusbandName: string;
  mobile: string;
  village: string;
  block: string;
  district: string; // default: "Kaithal"
  gender: "Male" | "Female" | "Other" | "";
  totalLandAcres: number | null;
  ccfMonitoringAreaAcres: number | null;
  fieldIdMark: string;
  gpsLat: number | null;
  gpsLng: number | null;
  farmerCategory: "Marginal_lt1ha" | "Small_1to2ha" | "Other" | "";
  hasFarmerCompanion: boolean;

  // Section 2 — Rice Crop Baseline
  riceVariety: string;
  sowingDate: string;
  cropStage: string;
  firstVisitDate: string;
  irrigationSource: ("Tubwell" | "Canal" | "Other")[];
  irrigationCountSoFar: number | null;
  lastIrrigationDate: string;
  currentMoisture: "Low" | "Medium" | "High" | "";
  fertilizerDetails: string;
  pesticideDetails: string;
  currentProblems: string;
  farmerMainNeed: string;

  // Section 3 — Soil Saathi 8 Parameter Reading
  soilBaseline: {
    ph: string;
    ec: string;
    salinity: string;
    moisture: string;
    temperature: string;
    nitrogen: string;
    phosphorus: string;
    potassium: string;
  };
  soilFollowup: {
    ph: string;
    ec: string;
    salinity: string;
    moisture: string;
    temperature: string;
    nitrogen: string;
    phosphorus: string;
    potassium: string;
  };
  spadChlorophyll: string;
  labSampleCode: string;

  // Section 4 — Technical Intervention
  farmAssistAdvice: string;
  adviceType: ("Nutrition" | "Irrigation" | "PestDisease" | "Other")[];
  biosynthNanoDemo: boolean;
  biosynthNanoDemoDate: string;
  treatmentAreaAcres: string;
  controlAreaAcres: string;

  // Section 5 — Harvest Results
  harvestDate: string;
  productionQuintalPerAcre: string;
  cropStatus: "Better" | "Same" | "Worse" | "";
  satisfactionLevel: "High" | "Medium" | "Low" | "";
  nextCropAdvice: string;
  mainResultsFarmerFeedback: string;

  // Consent
  farmerConsentGiven: boolean;

  // Photos
  photos: { url: string; lat: number | null; lng: number | null; timestamp: string; localKey?: string }[];
}

export const emptyJOITAPerforma = (supervisorId: string): JOITAPerforma => ({
  id: "",
  farmerId: "",
  supervisorId,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: "draft",
  farmerIdCode: "",
  cluster: "",
  farmerName: "",
  fatherHusbandName: "",
  mobile: "",
  village: "",
  block: "",
  district: "Kaithal",
  gender: "",
  totalLandAcres: null,
  ccfMonitoringAreaAcres: null,
  fieldIdMark: "",
  gpsLat: null,
  gpsLng: null,
  farmerCategory: "",
  hasFarmerCompanion: false,
  riceVariety: "",
  sowingDate: "",
  cropStage: "",
  firstVisitDate: new Date().toISOString().split("T")[0] || "",
  irrigationSource: [],
  irrigationCountSoFar: null,
  lastIrrigationDate: "",
  currentMoisture: "",
  fertilizerDetails: "",
  pesticideDetails: "",
  currentProblems: "",
  farmerMainNeed: "",
  soilBaseline: {
    ph: "", ec: "", salinity: "", moisture: "", temperature: "", nitrogen: "", phosphorus: "", potassium: ""
  },
  soilFollowup: {
    ph: "", ec: "", salinity: "", moisture: "", temperature: "", nitrogen: "", phosphorus: "", potassium: ""
  },
  spadChlorophyll: "",
  labSampleCode: "",
  farmAssistAdvice: "",
  adviceType: [],
  biosynthNanoDemo: false,
  biosynthNanoDemoDate: "",
  treatmentAreaAcres: "",
  controlAreaAcres: "",
  harvestDate: "",
  productionQuintalPerAcre: "",
  cropStatus: "",
  satisfactionLevel: "",
  nextCropAdvice: "",
  mainResultsFarmerFeedback: "",
  farmerConsentGiven: false,
  photos: [],
});

