import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "hi" | "en";

type Dict = Record<string, { en: string; hi: string }>;

export const strings: Dict = {
  appName: { en: "FarmLog", hi: "फार्मलॉग" },
  tagline: { en: "Agricultural field survey collection", hi: "कृषि क्षेत्र सर्वेक्षण संग्रह" },
  admin: { en: "Admin", hi: "एडमिन" },
  supervisor: { en: "Supervisor", hi: "सुपरवाइज़र" },
  farmer: { en: "Farmer", hi: "किसान" },
  login: { en: "Login", hi: "लॉगिन" },
  logout: { en: "Logout", hi: "लॉगआउट" },
  email: { en: "Email", hi: "ईमेल" },
  password: { en: "Password", hi: "पासवर्ड" },
  selectRole: { en: "Select your role", hi: "अपनी भूमिका चुनें" },
  loginAs: { en: "Login as", hi: "लॉगिन करें" },
  back: { en: "Back", hi: "वापस" },
  loading: { en: "Loading...", hi: "लोड हो रहा है..." },
  save: { en: "Save", hi: "सेव करें" },
  cancel: { en: "Cancel", hi: "रद्द करें" },
  edit: { en: "Edit", hi: "बदलें" },
  delete: { en: "Delete", hi: "हटाएँ" },
  add: { en: "Add", hi: "जोड़ें" },
  search: { en: "Search", hi: "खोजें" },
  all: { en: "All", hi: "सभी" },
  none: { en: "None", hi: "कोई नहीं" },
  yes: { en: "Yes", hi: "हाँ" },
  no: { en: "No", hi: "नहीं" },
  dashboard: { en: "Dashboard", hi: "डैशबोर्ड" },
  supervisors: { en: "Supervisors", hi: "सुपरवाइज़र" },
  farmers: { en: "Farmers", hi: "किसान" },
  questions: { en: "Survey Questions", hi: "सर्वेक्षण प्रश्न" },
  records: { en: "Records", hi: "रिकॉर्ड" },
  totalFarmers: { en: "Total farmers", hi: "कुल किसान" },
  totalKillahs: { en: "Total killahs", hi: "कुल किल्ले" },
  pendingSyncs: { en: "Pending syncs", hi: "सिंक बाकी" },
  recentSubmissions: { en: "Recent submissions", hi: "हाल की प्रविष्टियाँ" },
  exportCsv: { en: "Export CSV", hi: "CSV डाउनलोड" },
  fullName: { en: "Full name", hi: "पूरा नाम" },
  age: { en: "Age", hi: "उम्र" },
  gender: { en: "Gender", hi: "लिंग" },
  male: { en: "Male", hi: "पुरुष" },
  female: { en: "Female", hi: "महिला" },
  other: { en: "Other", hi: "अन्य" },
  contactNumber: { en: "Contact number", hi: "मोबाइल नंबर" },
  village: { en: "Village", hi: "गाँव" },
  tehsil: { en: "Tehsil", hi: "तहसील" },
  district: { en: "District", hi: "ज़िला" },
  state: { en: "State", hi: "राज्य" },
  killahs: { en: "Number of killahs (land size)", hi: "किल्लों की संख्या (ज़मीन)" },
  isLeadFarmer: { en: "Is this a Lead Farmer?", hi: "क्या यह मुख्य किसान है?" },
  leadFarmer: { en: "Lead farmer", hi: "मुख्य किसान" },
  subFarmer: { en: "Sub farmer", hi: "उप किसान" },
  linkedLead: { en: "Linked lead farmer", hi: "संबंधित मुख्य किसान" },
  assignedSupervisor: { en: "Assigned supervisor", hi: "नियुक्त सुपरवाइज़र" },
  surveyAnswers: { en: "Survey answers", hi: "सर्वेक्षण उत्तर" },
  photos: { en: "Photos", hi: "फ़ोटो" },
  takePhoto: { en: "Take photo", hi: "फ़ोटो लें" },
  openCamera: { en: "Open camera", hi: "कैमरा खोलें" },
  capture: { en: "Capture", hi: "क्लिक करें" },
  closeCamera: { en: "Close camera", hi: "कैमरा बंद करें" },
  switchCamera: { en: "Flip camera", hi: "कैमरा बदलें" },
  photoRequired: { en: "At least 1 photo is required", hi: "कम से कम 1 फ़ोटो ज़रूरी है" },
  gpsCaptured: { en: "GPS captured", hi: "GPS दर्ज" },
  gpsUnavailable: { en: "GPS unavailable", hi: "GPS उपलब्ध नहीं" },
  status: { en: "Status", hi: "स्थिति" },
  draft: { en: "Draft", hi: "ड्राफ़्ट" },
  submitted: { en: "Submitted", hi: "जमा किया" },
  synced: { en: "Synced", hi: "सिंक हो गया" },
  pending: { en: "Pending", hi: "बाकी" },
  saveDraft: { en: "Save draft", hi: "ड्राफ़्ट सेव करें" },
  submit: { en: "Submit", hi: "जमा करें" },
  newFarmer: { en: "New farmer record", hi: "नया किसान रिकॉर्ड" },
  myFarmers: { en: "My farmers", hi: "मेरे किसान" },
  myProfile: { en: "My profile", hi: "मेरी प्रोफ़ाइल" },
  online: { en: "Online", hi: "ऑनलाइन" },
  offline: { en: "Offline", hi: "ऑफ़लाइन" },
  syncNow: { en: "Sync now", hi: "अभी सिंक करें" },
  syncing: { en: "Syncing...", hi: "सिंक हो रहा है..." },
  queued: { en: "Saved on device", hi: "डिवाइस में सेव" },
  question: { en: "Question", hi: "प्रश्न" },
  answerType: { en: "Answer type", hi: "उत्तर प्रकार" },
  category: { en: "Category (options)", hi: "श्रेणी (विकल्प)" },
  numeric: { en: "Numerical", hi: "संख्या" },
  shortText: { en: "Short text", hi: "छोटा उत्तर" },
  options: { en: "Options (comma separated)", hi: "विकल्प (कॉमा से अलग)" },
  required: { en: "Required", hi: "अनिवार्य" },
  optional: { en: "Optional", hi: "वैकल्पिक" },
  moveUp: { en: "Move up", hi: "ऊपर करें" },
  moveDown: { en: "Move down", hi: "नीचे करें" },
  labelEn: { en: "Question (English)", hi: "प्रश्न (अंग्रेज़ी)" },
  labelHi: { en: "Question (Hindi)", hi: "प्रश्न (हिंदी)" },
  farmerEditable: { en: "Farmer can answer this", hi: "किसान इसका उत्तर दे सकता है" },
  createSupervisor: { en: "Create supervisor", hi: "सुपरवाइज़र बनाएँ" },
  createFarmer: { en: "Create farmer account", hi: "किसान खाता बनाएँ" },
  name: { en: "Name", hi: "नाम" },
  filters: { en: "Filters", hi: "फ़िल्टर" },
  minLand: { en: "Min killahs", hi: "न्यूनतम किल्ले" },
  maxLand: { en: "Max killahs", hi: "अधिकतम किल्ले" },
  fromDate: { en: "From date", hi: "से तारीख़" },
  toDate: { en: "To date", hi: "तक तारीख़" },
  noRecords: { en: "No records yet", hi: "अभी कोई रिकॉर्ड नहीं" },
  view: { en: "View", hi: "देखें" },
  saved: { en: "Saved", hi: "सेव हो गया" },
  configMissing: {
    en: "Firebase is not connected yet. Add the VITE_FIREBASE_* environment variables.",
    hi: "Firebase अभी जुड़ा नहीं है। VITE_FIREBASE_* एनवायरनमेंट वेरिएबल जोड़ें।",
  },
  wrongRole: { en: "This account does not have that role.", hi: "इस खाते की यह भूमिका नहीं है।" },
  requiredFieldsMissing: { en: "Please fill all required fields", hi: "कृपया सभी अनिवार्य फ़ील्ड भरें" },
  updateAnswers: { en: "Update my answers", hi: "मेरे उत्तर अपडेट करें" },
  noProfileLinked: { en: "No farmer profile is linked to this account yet.", hi: "इस खाते से अभी कोई किसान प्रोफ़ाइल जुड़ी नहीं है।" },
  language: { en: "भाषा / Language", hi: "भाषा / Language" },
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof strings | string) => string;
}

const LangContext = createContext<Ctx>({ lang: "hi", setLang: () => {}, t: (k) => String(k) });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("hi");

  useEffect(() => {
    const stored = localStorage.getItem("farmlog-lang");
    if (stored === "en" || stored === "hi") setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("farmlog-lang", l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string) => {
      const entry = strings[key];
      if (!entry) return key;
      return entry[lang];
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useI18n = () => useContext(LangContext);
