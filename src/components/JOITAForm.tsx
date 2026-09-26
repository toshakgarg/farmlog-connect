import { useEffect, useState } from "react";
import { Camera, MapPin, X, ArrowLeft, ArrowRight, Save, Check } from "lucide-react";
import { toast } from "sonner";
import { CameraCapture } from "@/components/CameraCapture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { deletePhotoBlob, getPhotoBlob } from "@/lib/offline";
import type { JOITAPerforma, PhotoMeta, FarmerRecord } from "@/lib/types";

const BilingualLabel = ({
  hindi,
  english,
  required,
}: {
  hindi: string;
  english: string;
  required?: boolean;
}) => (
  <div className="mb-1">
    <span className="font-semibold text-gray-900 text-[15px]">{hindi}</span>
    {required && <span className="text-red-500 ml-1">*</span>}
    <span className="block text-gray-500 text-xs">{english}</span>
  </div>
);

function ChipGroup({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: { labelHi: string; labelEn: string; value: string }[];
  value: string | string[];
  onChange: (val: any) => void;
  multi?: boolean;
}) {
  const toggle = (v: string) => {
    if (multi) {
      const arr = Array.isArray(value) ? value : [];
      if (arr.includes(v)) onChange(arr.filter((x) => x !== v));
      else onChange([...arr, v]);
    } else {
      onChange(v === value ? "" : v);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSel = multi
          ? Array.isArray(value) && value.includes(opt.value)
          : value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
              isSel
                ? "bg-green-100 border-green-600 text-green-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <div className="text-sm">{opt.labelHi}</div>
            <div className="text-xs font-normal opacity-80">{opt.labelEn}</div>
          </button>
        );
      })}
    </div>
  );
}
const mergeInitialState = (value: Partial<JOITAPerforma>): JOITAPerforma => {
  return {
    ...value,
    id: value.id || "",
    farmerId: value.farmerId || "",
    supervisorId: value.supervisorId || "",
    createdAt: value.createdAt || new Date().toISOString(),
    updatedAt: value.updatedAt || new Date().toISOString(),
    status: value.status || "draft",
    farmerIdCode: value.farmerIdCode || "",
    cluster: (value.cluster as any) || "",
    farmerName: value.farmerName || "",
    fatherHusbandName: value.fatherHusbandName || "",
    mobile: value.mobile || "",
    village: value.village || "",
    block: value.block || "",
    district: value.district || "Kaithal",
    gender: (value.gender as any) || "",
    totalLandAcres: value.totalLandAcres ?? null,
    ccfMonitoringAreaAcres: value.ccfMonitoringAreaAcres ?? null,
    fieldIdMark: value.fieldIdMark || "",
    gpsLat: value.gpsLat ?? null,
    gpsLng: value.gpsLng ?? null,
    farmerCategory: (value.farmerCategory as any) || "",
    hasFarmerCompanion: value.hasFarmerCompanion ?? false,
    riceVariety: value.riceVariety || "",
    sowingDate: value.sowingDate || "",
    cropStage: value.cropStage || "",
    firstVisitDate: value.firstVisitDate || (new Date().toISOString().split("T")[0] as string),
    irrigationSource: value.irrigationSource || [],
    irrigationCountSoFar: value.irrigationCountSoFar ?? null,
    lastIrrigationDate: value.lastIrrigationDate || "",
    currentMoisture: (value.currentMoisture as any) || "",
    fertilizerDetails: value.fertilizerDetails || "",
    pesticideDetails: value.pesticideDetails || "",
    currentProblems: value.currentProblems || "",
    farmerMainNeed: value.farmerMainNeed || "",
    soilBaseline: {
      ph: value.soilBaseline?.ph || "",
      ec: value.soilBaseline?.ec || "",
      salinity: value.soilBaseline?.salinity || "",
      moisture: value.soilBaseline?.moisture || "",
      temperature: value.soilBaseline?.temperature || "",
      nitrogen: value.soilBaseline?.nitrogen || "",
      phosphorus: value.soilBaseline?.phosphorus || "",
      potassium: value.soilBaseline?.potassium || "",
    },
    soilFollowup: {
      ph: value.soilFollowup?.ph || "",
      ec: value.soilFollowup?.ec || "",
      salinity: value.soilFollowup?.salinity || "",
      moisture: value.soilFollowup?.moisture || "",
      temperature: value.soilFollowup?.temperature || "",
      nitrogen: value.soilFollowup?.nitrogen || "",
      phosphorus: value.soilFollowup?.phosphorus || "",
      potassium: value.soilFollowup?.potassium || "",
    },
    spadChlorophyll: value.spadChlorophyll || "",
    labSampleCode: value.labSampleCode || "",
    farmAssistAdvice: value.farmAssistAdvice || "",
    adviceType: value.adviceType || [],
    biosynthNanoDemo: value.biosynthNanoDemo ?? false,
    biosynthNanoDemoDate: value.biosynthNanoDemoDate || "",
    treatmentAreaAcres: value.treatmentAreaAcres || "",
    controlAreaAcres: value.controlAreaAcres || "",
    harvestDate: value.harvestDate || "",
    productionQuintalPerAcre: value.productionQuintalPerAcre || "",
    cropStatus: (value.cropStatus as any) || "",
    satisfactionLevel: (value.satisfactionLevel as any) || "",
    nextCropAdvice: value.nextCropAdvice || "",
    mainResultsFarmerFeedback: value.mainResultsFarmerFeedback || "",
    farmerConsentGiven: value.farmerConsentGiven ?? false,
    photos: value.photos || [],
  };
};

export function JOITAForm({
  value,
  farmers,
  onSaveDraft,
  onSubmit,
  onCancel,
  saving,
}: {
  value: JOITAPerforma;
  farmers: FarmerRecord[];
  onSaveDraft: (rec: JOITAPerforma) => void;
  onSubmit: (rec: JOITAPerforma) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [rec, setRec] = useState<JOITAPerforma>(() => mergeInitialState(value));
  const [step, setStep] = useState(1);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedFarmerId, setSelectedFarmerId] = useState("");

  const updateField = (field: keyof JOITAPerforma, val: any) => {
    setRec((prev) => ({ ...prev, [field]: val, dirty: true }));
  };

  const updateNestedField = (
    parent: "soilBaseline" | "soilFollowup",
    field: keyof JOITAPerforma["soilBaseline"],
    val: string,
  ) => {
    setRec((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: val },
      dirty: true,
    }));
  };
  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateField("gpsLat", pos.coords.latitude);
        updateField("gpsLng", pos.coords.longitude);
        setLocationLoading(false);
        toast.success("Location captured");
      },
      (err) => {
        toast.error("Failed to get location: " + err.message);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSelectFarmer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fid = e.target.value;
    setSelectedFarmerId(fid);
    if (!fid) return;
    const f = farmers.find((x) => x.id === fid);
    if (f) {
      setRec((prev) => ({
        ...prev,
        farmerId: f.id,
        farmerName: f.fullName,
        mobile: f.contactNumber,
        village: f.village,
        block: f.tehsil,
        district: f.district,
        gpsLat: f.photos?.[0]?.latitude || prev.gpsLat,
        gpsLng: f.photos?.[0]?.longitude || prev.gpsLng,
        dirty: true,
      }));
      toast.success("✓ Details auto-filled from farmer record");
    }
  };

  const handlePhotoCapture = (meta: PhotoMeta) => {
    const updated = [...rec.photos, meta];
    updateField("photos", updated);
    if (meta.latitude && meta.longitude && !rec.gpsLat) {
      updateField("gpsLat", meta.latitude);
      updateField("gpsLng", meta.longitude);
    }
  };

  const removePhoto = (idx: number) => {
    const p = rec.photos[idx];
    if (p?.localKey) deletePhotoBlob(p.localKey).catch(console.error);
    const updated = [...rec.photos];
    updated.splice(idx, 1);
    updateField("photos", updated);
  };

  const stepTitles = [
    { hi: "1. किसान और स्थान विवरण", en: "Farmer ID & Location" },
    { hi: "2. धान की फसल का आधार रेखा", en: "Rice Crop Baseline" },
    { hi: "3. मिट्टी की जांच", en: "Soil Saathi Reading" },
    { hi: "4. तकनीकी हस्तक्षेप", en: "Technical Intervention" },
    { hi: "5. फॉलो-अप और समीक्षा", en: "Harvest Results & Review" },
  ];

  const handleNext = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStep((s) => Math.min(5, s + 1));
  };
  const handleSaveDraft = () => onSaveDraft(rec);
  const handleSubmit = () => {
    if (!rec.farmerConsentGiven) {
      toast.error("कृपया सहमति दें / Please give consent");
      return;
    }
    onSubmit(rec);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32 flex flex-col">
      {/* JOITA Branded Header */}
      <div className="bg-green-700 text-white px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-xl">🌾</span>
          </div>
          <div>
            <h1 className="font-bold text-base">JOITA किसान प्रपत्र</h1>
            <p className="text-green-200 text-xs">JOITA-CCF-F01 · जलवायु-स्मार्ट धान कार्यक्रम</p>
          </div>
          <div className="ml-auto">
            <span
              className={`px-2 py-1 rounded-full text-xs font-bold ${
                rec.status === "submitted" ? "bg-blue-400" : "bg-amber-400 text-amber-900"
              }`}
            >
              {rec.status === "submitted" ? "Submitted" : "Draft"}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pt-4 pb-2 bg-white border-b border-gray-100">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">Step {step} of 5</span>
          <span className="text-green-600 font-bold">{Math.round((step / 5) * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div
            className="h-2 bg-green-600 rounded-full transition-all"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Title */}
      <div className="px-4 py-3 bg-green-700 text-white">
        <h2 className="font-bold text-lg">{stepTitles[step - 1]?.hi}</h2>
        <p className="text-green-200 text-sm">{stepTitles[step - 1]?.en}</p>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {step === 1 && (
          <div className="space-y-5">
            <div className="bg-green-50 p-3 rounded-xl border border-green-200">
              <BilingualLabel hindi="किसान चुनें (वैकल्पिक)" english="Select Farmer (Optional)" />
              <select
                className="w-full h-[52px] rounded-xl border-[1.5px] border-gray-200 px-4 text-base bg-white focus:border-green-600 focus:ring-[3px] focus:ring-green-600/10 outline-none"
                value={selectedFarmerId}
                onChange={handleSelectFarmer}
              >
                <option value="">None — Select linked farmer record</option>
                {farmers.length === 0 && <option disabled>No farmers yet</option>}
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.fullName} — {f.village}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <BilingualLabel hindi="क्लस्टर" english="Cluster" required />
              <select
                className="w-full h-[52px] rounded-xl border-[1.5px] border-gray-200 px-4 text-base bg-white focus:border-green-600 outline-none"
                value={rec.cluster}
                onChange={(e) => updateField("cluster", e.target.value)}
              >
                <option value="">Select...</option>
                <option value="Taragarh">Taragarh</option>
                <option value="Jaswant">Jaswant</option>
                <option value="Siwan">Siwan</option>
                <option value="Cheeka">Cheeka</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <BilingualLabel hindi="किसान का नाम" english="Farmer Name" required />
              <Input
                value={rec.farmerName}
                onChange={(e) => updateField("farmerName", e.target.value)}
              />
            </div>
            <div>
              <BilingualLabel hindi="पिता/पति का नाम" english="Father/Husband Name" />
              <Input
                value={rec.fatherHusbandName}
                onChange={(e) => updateField("fatherHusbandName", e.target.value)}
              />
            </div>
            <div>
              <BilingualLabel hindi="मोबाइल" english="Mobile" required />
              <Input
                type="tel"
                value={rec.mobile}
                onChange={(e) => updateField("mobile", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <BilingualLabel hindi="गाँव" english="Village" />
                <Input
                  value={rec.village}
                  onChange={(e) => updateField("village", e.target.value)}
                />
              </div>
              <div>
                <BilingualLabel hindi="ब्लॉक" english="Block" />
                <Input value={rec.block} onChange={(e) => updateField("block", e.target.value)} />
              </div>
            </div>

            <div>
              <BilingualLabel hindi="जिला" english="District" />
              <Input
                value={rec.district}
                onChange={(e) => updateField("district", e.target.value)}
              />
            </div>
            <div>
              <BilingualLabel hindi="लिंग" english="Gender" />
              <ChipGroup
                value={rec.gender}
                onChange={(v) => updateField("gender", v)}
                options={[
                  { labelHi: "पुरुष", labelEn: "Male", value: "Male" },
                  { labelHi: "महिला", labelEn: "Female", value: "Female" },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <BilingualLabel hindi="कुल भूमि (एकड़)" english="Total Land (Acres)" />
                <Input
                  type="number"
                  value={rec.totalLandAcres || ""}
                  onChange={(e) =>
                    updateField("totalLandAcres", e.target.value ? Number(e.target.value) : null)
                  }
                />
              </div>
              <div>
                <BilingualLabel hindi="CCF क्षेत्र (एकड़)" english="CCF Monitoring Area" />
                <Input
                  type="number"
                  value={rec.ccfMonitoringAreaAcres || ""}
                  onChange={(e) =>
                    updateField(
                      "ccfMonitoringAreaAcres",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                />
              </div>
            </div>

            <div>
              <BilingualLabel hindi="खेत की पहचान" english="Field ID Mark" />
              <Input
                value={rec.fieldIdMark}
                onChange={(e) => updateField("fieldIdMark", e.target.value)}
              />
            </div>

            <div>
              <BilingualLabel hindi="जीपीएस लोकेशन" english="GPS Location" required />
              <div className="flex gap-2 items-center">
                <Button
                  type="button"
                  onClick={captureLocation}
                  disabled={locationLoading}
                  className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                  variant="outline"
                >
                  <MapPin className="size-4 mr-2" />
                  {locationLoading
                    ? "Capturing..."
                    : rec.gpsLat
                      ? "Update Location"
                      : "Capture Location"}
                </Button>
                {rec.gpsLat && (
                  <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded-lg">
                    {rec.gpsLat.toFixed(4)}, {rec.gpsLng?.toFixed(4)}
                  </div>
                )}
              </div>
            </div>

            <div>
              <BilingualLabel hindi="फोटो" english="Photos" />
              <div className="mb-3">
                <CameraCapture onCaptured={handlePhotoCapture} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {rec.photos.map((p, i) => (
                  <div
                    key={i}
                    className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border"
                  >
                    <img src={p.url} className="object-cover w-full h-full" alt="Field" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <BilingualLabel hindi="धान की किस्म" english="Rice Variety" />
              <Input
                value={rec.riceVariety}
                onChange={(e) => updateField("riceVariety", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <BilingualLabel hindi="बुवाई की तारीख" english="Sowing Date" />
                <Input
                  type="date"
                  value={rec.sowingDate}
                  onChange={(e) => updateField("sowingDate", e.target.value)}
                />
              </div>
              <div>
                <BilingualLabel hindi="पहली यात्रा" english="First Visit Date" />
                <Input
                  type="date"
                  value={rec.firstVisitDate}
                  onChange={(e) => updateField("firstVisitDate", e.target.value)}
                />
              </div>
            </div>
            <div>
              <BilingualLabel hindi="फसल की अवस्था" english="Crop Stage" />
              <Input
                value={rec.cropStage}
                onChange={(e) => updateField("cropStage", e.target.value)}
              />
            </div>
            <div>
              <BilingualLabel hindi="सिंचाई स्रोत" english="Irrigation Source" />
              <ChipGroup
                multi
                value={rec.irrigationSource}
                onChange={(v) => updateField("irrigationSource", v)}
                options={[
                  { labelHi: "ट्यूबवेल", labelEn: "Tubwell", value: "Tubwell" },
                  { labelHi: "नहर", labelEn: "Canal", value: "Canal" },
                  { labelHi: "अन्य", labelEn: "Other", value: "Other" },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <BilingualLabel hindi="सिंचाई संख्या" english="Irrigation Count" />
                <Input
                  type="number"
                  value={rec.irrigationCountSoFar || ""}
                  onChange={(e) =>
                    updateField(
                      "irrigationCountSoFar",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                />
              </div>
              <div>
                <BilingualLabel hindi="अंतिम सिंचाई" english="Last Irrigation" />
                <Input
                  type="date"
                  value={rec.lastIrrigationDate}
                  onChange={(e) => updateField("lastIrrigationDate", e.target.value)}
                />
              </div>
            </div>
            <div>
              <BilingualLabel hindi="वर्तमान नमी" english="Current Moisture" />
              <ChipGroup
                value={rec.currentMoisture}
                onChange={(v) => updateField("currentMoisture", v)}
                options={[
                  { labelHi: "कम", labelEn: "Low", value: "Low" },
                  { labelHi: "मध्यम", labelEn: "Medium", value: "Medium" },
                  { labelHi: "अधिक", labelEn: "High", value: "High" },
                ]}
              />
            </div>
            <div>
              <BilingualLabel hindi="उर्वरक विवरण" english="Fertilizer Details" />
              <Input
                value={rec.fertilizerDetails}
                onChange={(e) => updateField("fertilizerDetails", e.target.value)}
              />
            </div>
            <div>
              <BilingualLabel hindi="कीटनाशक विवरण" english="Pesticide Details" />
              <Input
                value={rec.pesticideDetails}
                onChange={(e) => updateField("pesticideDetails", e.target.value)}
              />
            </div>
            <div>
              <BilingualLabel hindi="वर्तमान समस्याएँ" english="Current Problems" />
              <Input
                value={rec.currentProblems}
                onChange={(e) => updateField("currentProblems", e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h4 className="font-bold text-green-700 mb-3">Baseline / आधार रेखा</h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  "ph",
                  "ec",
                  "salinity",
                  "moisture",
                  "temperature",
                  "nitrogen",
                  "phosphorus",
                  "potassium",
                ].map((k) => (
                  <div key={"base_" + k}>
                    <label className="text-[10px] uppercase text-gray-500 font-bold">{k}</label>
                    <Input
                      value={(rec.soilBaseline as any)[k]}
                      onChange={(e) => updateNestedField("soilBaseline", k as any, e.target.value)}
                      className="px-2 text-center"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-blue-700 mb-3 mt-4">Follow-up / अनुवर्ती</h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  "ph",
                  "ec",
                  "salinity",
                  "moisture",
                  "temperature",
                  "nitrogen",
                  "phosphorus",
                  "potassium",
                ].map((k) => (
                  <div key={"fup_" + k}>
                    <label className="text-[10px] uppercase text-gray-500 font-bold">{k}</label>
                    <Input
                      value={(rec.soilFollowup as any)[k]}
                      onChange={(e) => updateNestedField("soilFollowup", k as any, e.target.value)}
                      className="px-2 text-center"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <BilingualLabel hindi="SPAD क्लोरोफिल" english="SPAD Chlorophyll" />
                <Input
                  value={rec.spadChlorophyll}
                  onChange={(e) => updateField("spadChlorophyll", e.target.value)}
                />
              </div>
              <div>
                <BilingualLabel hindi="प्रयोगशाला नमूना कोड" english="Lab Sample Code" />
                <Input
                  value={rec.labSampleCode}
                  onChange={(e) => updateField("labSampleCode", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div>
              <BilingualLabel hindi="सलाह" english="Farm Assist Advice" />
              <Input
                value={rec.farmAssistAdvice}
                onChange={(e) => updateField("farmAssistAdvice", e.target.value)}
              />
            </div>
            <div>
              <BilingualLabel hindi="सलाह का प्रकार" english="Advice Type" />
              <ChipGroup
                multi
                value={rec.adviceType}
                onChange={(v) => updateField("adviceType", v)}
                options={[
                  { labelHi: "पोषण", labelEn: "Nutrition", value: "Nutrition" },
                  { labelHi: "सिंचाई", labelEn: "Irrigation", value: "Irrigation" },
                  { labelHi: "कीट/रोग", labelEn: "PestDisease", value: "PestDisease" },
                  { labelHi: "अन्य", labelEn: "Other", value: "Other" },
                ]}
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <BilingualLabel hindi="कटाई तिथि" english="Harvest Date" />
                <Input
                  type="date"
                  value={rec.harvestDate}
                  onChange={(e) => updateField("harvestDate", e.target.value)}
                />
              </div>
              <div>
                <BilingualLabel hindi="उत्पादन" english="Production (Quintal/Acre)" />
                <Input
                  type="number"
                  value={rec.productionQuintalPerAcre}
                  onChange={(e) => updateField("productionQuintalPerAcre", e.target.value)}
                />
              </div>
            </div>
            <div>
              <BilingualLabel hindi="फसल स्थिति" english="Crop Status" />
              <ChipGroup
                value={rec.cropStatus}
                onChange={(v) => updateField("cropStatus", v)}
                options={[
                  { labelHi: "बेहतर", labelEn: "Better", value: "Better" },
                  { labelHi: "समान", labelEn: "Same", value: "Same" },
                  { labelHi: "कमतर", labelEn: "Worse", value: "Worse" },
                ]}
              />
            </div>
            <div>
              <BilingualLabel hindi="संतुष्टि" english="Satisfaction" />
              <ChipGroup
                value={rec.satisfactionLevel}
                onChange={(v) => updateField("satisfactionLevel", v)}
                options={[
                  { labelHi: "उच्च", labelEn: "High", value: "High" },
                  { labelHi: "मध्यम", labelEn: "Medium", value: "Medium" },
                  { labelHi: "कम", labelEn: "Low", value: "Low" },
                ]}
              />
            </div>
            <div>
              <BilingualLabel hindi="अगली फसल हेतु JOITA सलाह" english="Next Crop Advice" />
              <textarea
                className="w-full h-24 rounded-xl border-[1.5px] border-gray-200 p-3 text-base bg-white resize-none focus:outline-none focus:border-green-600 focus:ring-[3px] focus:ring-green-600/10"
                value={rec.nextCropAdvice}
                onChange={(e) => updateField("nextCropAdvice", e.target.value)}
              />
            </div>
            <div>
              <BilingualLabel
                hindi="मुख्य परिणाम और किसान प्रतिक्रिया"
                english="Main Results & Farmer Feedback"
              />
              <textarea
                className="w-full h-32 rounded-xl border-[1.5px] border-gray-200 p-3 text-base bg-white resize-none focus:outline-none focus:border-green-600 focus:ring-[3px] focus:ring-green-600/10"
                value={rec.mainResultsFarmerFeedback}
                onChange={(e) => updateField("mainResultsFarmerFeedback", e.target.value)}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
              <label className="flex gap-3 items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={rec.farmerConsentGiven ?? false}
                  onChange={(e) => updateField("farmerConsentGiven", e.target.checked)}
                  className="mt-1 w-5 h-5 accent-green-600 flex-shrink-0 rounded"
                />
                <div>
                  <p className="text-sm text-gray-800 font-medium">
                    मैं स्वेच्छा से इस परियोजना में भाग ले रहा/रही हूँ।
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    I voluntarily participate in this project. My farm data may be used for project
                    monitoring and Climate Collective Foundation reporting.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 text-center mt-2">
        <button
          onClick={handleSaveDraft}
          className="w-full text-center text-green-700 text-sm py-2 font-medium"
        >
          💾 Draft सहेजें / Save as Draft
        </button>
      </div>

      <div 
        className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {step > 1 && (
          <button
            onClick={() => {
              window.scrollTo({ top: 0 });
              setStep((s) => s - 1);
            }}
            className="flex-1 h-[52px] border-2 border-green-600 text-green-600 rounded-xl font-semibold"
          >
            ← पिछला / Back
          </button>
        )}
        {step < 5 ? (
          <button
            onClick={handleNext}
            className="flex-1 h-[52px] bg-green-600 text-white rounded-xl font-semibold"
          >
            अगला / Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="flex-1 h-[52px] bg-green-600 text-white rounded-xl font-semibold disabled:opacity-50"
            disabled={!rec.farmerConsentGiven || saving}
          >
            ✅ जमा करें / Submit
          </button>
        )}
      </div>
    </div>
  );
}
