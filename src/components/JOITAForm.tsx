import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Camera, Save, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CameraCapture } from "@/components/CameraCapture";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { deletePhotoBlob, getPhotoBlob } from "@/lib/offline";
import type { JOITAPerforma, PhotoMeta, FarmerRecord } from "@/lib/types";

// Controlled six-section JOITA performa editor. The parent route owns the
// record lifecycle; this component owns field state, validation, GPS, and
// local photo previews.

interface Props {
  value: JOITAPerforma;
  farmers: FarmerRecord[];
  onSaveDraft: (rec: JOITAPerforma) => void;
  onSubmit: (rec: JOITAPerforma) => void;
  onCancel: () => void;
  saving?: boolean;
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

export function JOITAForm({ value, farmers, onSaveDraft, onSubmit, onCancel, saving }: Props) {
  const { t } = useI18n();
  const [rec, setRec] = useState<JOITAPerforma>(() => mergeInitialState(value));
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setRec(mergeInitialState(value));
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      if (rec?.photos) {
        for (const p of rec.photos) {
          if (p.localKey && !p.url) {
            const blob = await getPhotoBlob(p.localKey);
            if (blob) next[p.localKey] = URL.createObjectURL(blob);
          }
        }
      }
      if (!cancelled) setPreviews((prev) => ({ ...next, ...prev }));
    })();
    return () => {
      cancelled = true;
    };
  }, [rec?.photos]);

  const toggleSection = (sec: number) => {
    setExpanded((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const updateField = (field: keyof JOITAPerforma, val: any) => {
    setRec((prev) => ({ ...prev, [field]: val }));
    if (errors[field as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    }
  };

  const updateNestedField = (
    parent: "soilBaseline" | "soilFollowup",
    field: keyof JOITAPerforma["soilBaseline"],
    val: string,
  ) => {
    setRec((prev) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: val,
      },
    }));
  };

  function addPhoto(photo: PhotoMeta, previewUrl: string) {
    setPreviews((p) => ({ ...p, [photo.localKey!]: previewUrl }));
    setRec((r) => ({ ...r, photos: [...r.photos, photo as any] }));
    toast.success(photo.latitude ? "GPS Captured" : "GPS Unavailable");
  }

  async function removePhoto(idx: number) {
    if (!rec?.photos) return;
    const p = rec.photos[idx];
    if (p?.localKey) await deletePhotoBlob(p.localKey);
    setRec((r) => ({ ...r, photos: (r.photos || []).filter((_, i) => i !== idx) }));
  }

  const getGPS = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    toast.info("Fetching GPS...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateField("gpsLat", pos.coords.latitude);
        updateField("gpsLng", pos.coords.longitude);
        toast.success("GPS Location captured!");
      },
      (err) => {
        toast.error("Failed to get location. Please enable GPS.");
      },
      { enableHighAccuracy: true },
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!rec.farmerName || rec.farmerName.trim() === "") {
      newErrors["farmerName"] = "Farmer Name is required";
    }
    if (rec.mobile && !/^\d{10}$/.test(rec.mobile)) {
      newErrors["mobile"] = "Please enter a valid 10-digit mobile number";
    }
    if (!rec.farmerConsentGiven) {
      toast.error("Consent is required to submit");
      return false;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix the errors before submitting");
      setExpanded({ 1: true, 2: true, 3: true, 4: true, 5: true });
      return false;
    }
    return true;
  };

  const handleLinkFarmer = (farmerId: string) => {
    if (!farmerId) return;
    const f = farmers.find((x) => x.id === farmerId);
    if (!f) return;
    setRec((prev) => ({
      ...prev,
      farmerId: f.id,
      farmerName: f.fullName,
      mobile: f.contactNumber,
      village: f.village,
      block: f.tehsil,
      district: f.district || "Kaithal",
      gpsLat: f.photos[0]?.latitude || null,
      gpsLng: f.photos[0]?.longitude || null,
    }));
    toast.success("Farmer data linked");
  };

  const SectionHeader = ({
    num,
    titleHi,
    titleEn,
  }: {
    num: number;
    titleHi: string;
    titleEn: string;
  }) => (
    <button
      type="button"
      className="w-full h-12 px-4 bg-[#15803d] text-white font-bold flex items-center justify-between"
      onClick={() => toggleSection(num)}
    >
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[14px]">{titleHi}</span>
        <span className="text-[11px] text-white/80">{titleEn}</span>
      </div>
      {expanded[num] ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
    </button>
  );

  const LabelField = ({
    labelHi,
    labelEn,
    req,
  }: {
    labelHi: string;
    labelEn: string;
    req?: boolean;
  }) => (
    <Label className="block mb-2 font-bold text-[14px]">
      {labelHi} {req && <span className="text-red-500">*</span>}
      <br />
      <span className="text-muted-foreground font-normal text-[12px]">{labelEn}</span>
    </Label>
  );

  const ChipGroup = ({
    options,
    value,
    onChange,
    multi = false,
  }: {
    options: { labelHi: string; labelEn: string; value: string }[];
    value: string | string[];
    onChange: (val: any) => void;
    multi?: boolean;
  }) => {
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const arr = (value as string[]) || [];
          const selected = multi ? arr.includes(opt.value) : value === opt.value;

          return (
            <button
              key={opt.value}
              type="button"
              className={`h-11 px-4 rounded-full border text-sm font-medium transition-colors ${
                selected
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-foreground border-border"
              }`}
              onClick={() => {
                if (multi) {
                  if (arr.includes(opt.value)) {
                    onChange(arr.filter((x) => x !== opt.value));
                  } else {
                    onChange([...arr, opt.value]);
                  }
                } else {
                  onChange(opt.value);
                }
              }}
            >
              <div className="flex flex-col items-center leading-tight">
                <span>{opt.labelHi}</span>
                {opt.labelEn && <span className="text-[10px] opacity-80">{opt.labelEn}</span>}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-6 pb-24">
      <div className="flex-1 max-w-3xl mx-auto w-full p-4 space-y-6">
        {/* Link Farmer */}
        <Card className="shadow-sm border-primary/20">
          <CardContent className="p-4 space-y-4">
            <LabelField labelHi="किसान लिंक करें" labelEn="Link Existing Farmer" />
            <select
              className="w-full h-12 px-3 border border-border rounded-xl bg-card text-sm"
              value={rec.farmerId || ""}
              onChange={(e) => handleLinkFarmer(e.target.value)}
            >
              <option value="">Select Farmer...</option>
              {(farmers || []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.fullName} - {f.village}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Section 1 */}
        <div className="rounded-xl overflow-hidden border border-border bg-card shadow-sm">
          <SectionHeader
            num={1}
            titleHi="1. किसान और स्थान विवरण"
            titleEn="1. Farmer ID & Location"
          />
          {expanded[1] && (
            <div className="p-4 space-y-5">
              <div>
                <LabelField labelHi="किसान का नाम" labelEn="Farmer Name" req />
                <Input
                  value={rec.farmerName}
                  onChange={(e) => updateField("farmerName", e.target.value)}
                  className="h-12 rounded-xl"
                />
                {errors["farmerName"] && (
                  <p className="text-red-500 text-xs mt-1">{errors["farmerName"]}</p>
                )}
              </div>
              <div>
                <LabelField labelHi="पिता/पति का नाम" labelEn="Father/Husband Name" />
                <Input
                  value={rec.fatherHusbandName}
                  onChange={(e) => updateField("fatherHusbandName", e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <LabelField labelHi="मोबाइल नंबर" labelEn="Mobile" req />
                <Input
                  value={rec.mobile}
                  type="tel"
                  maxLength={10}
                  onChange={(e) => updateField("mobile", e.target.value)}
                  className="h-12 rounded-xl"
                />
                {errors["mobile"] && (
                  <p className="text-red-500 text-xs mt-1">{errors["mobile"]}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <LabelField labelHi="गांव" labelEn="Village" />
                  <Input
                    value={rec.village}
                    onChange={(e) => updateField("village", e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <LabelField labelHi="ब्लॉक" labelEn="Block" />
                  <Input
                    value={rec.block}
                    onChange={(e) => updateField("block", e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <LabelField labelHi="क्लस्टर" labelEn="Cluster" />
                <ChipGroup
                  value={rec.cluster}
                  onChange={(v) => updateField("cluster", v)}
                  options={[
                    { labelHi: "तारागढ़", labelEn: "Taragarh", value: "Taragarh" },
                    { labelHi: "जसवंत", labelEn: "Jaswant", value: "Jaswant" },
                    { labelHi: "सीवान", labelEn: "Siwan", value: "Siwan" },
                    { labelHi: "चीका", labelEn: "Cheeka", value: "Cheeka" },
                    { labelHi: "अन्य", labelEn: "Other", value: "Other" },
                  ]}
                />
              </div>
              <div>
                <LabelField labelHi="लिंग" labelEn="Gender" />
                <ChipGroup
                  value={rec.gender}
                  onChange={(v) => updateField("gender", v)}
                  options={[
                    { labelHi: "पुरुष", labelEn: "Male", value: "Male" },
                    { labelHi: "महिला", labelEn: "Female", value: "Female" },
                    { labelHi: "अन्य", labelEn: "Other", value: "Other" },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <LabelField labelHi="कुल भूमि (एकड़)" labelEn="Total Land (Acres)" />
                  <Input
                    type="number"
                    value={rec.totalLandAcres || ""}
                    onChange={(e) =>
                      updateField("totalLandAcres", e.target.value ? Number(e.target.value) : null)
                    }
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <LabelField labelHi="निगरानी क्षेत्र (एकड़)" labelEn="CCF Area (Acres)" />
                  <Input
                    type="number"
                    value={rec.ccfMonitoringAreaAcres || ""}
                    onChange={(e) =>
                      updateField(
                        "ccfMonitoringAreaAcres",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <LabelField labelHi="खेत की पहचान" labelEn="Field ID/Mark" />
                <Input
                  value={rec.fieldIdMark}
                  onChange={(e) => updateField("fieldIdMark", e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <LabelField labelHi="खेत का GPS" labelEn="Field GPS Location" />
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={getGPS}
                    variant="outline"
                    className="h-12 rounded-xl border-primary text-primary"
                  >
                    <MapPin className="mr-2 size-5" /> Get Location
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    {rec.gpsLat
                      ? `Lat: ${rec.gpsLat.toFixed(6)}\nLng: ${rec.gpsLng?.toFixed(6)}`
                      : "Not captured"}
                  </div>
                </div>
              </div>
              <div>
                <LabelField labelHi="किसान श्रेणी" labelEn="Farmer Category" />
                <ChipGroup
                  value={rec.farmerCategory}
                  onChange={(v) => updateField("farmerCategory", v)}
                  options={[
                    {
                      labelHi: "सीमांत (<1 ha)",
                      labelEn: "Marginal_lt1ha",
                      value: "Marginal_lt1ha",
                    },
                    { labelHi: "छोटा (1-2 ha)", labelEn: "Small_1to2ha", value: "Small_1to2ha" },
                    { labelHi: "अन्य", labelEn: "Other", value: "Other" },
                  ]}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-xl">
                <LabelField
                  labelHi="क्या किसान के पास स्मार्टफोन है?"
                  labelEn="Has Farmer Companion App?"
                />
                <Switch
                  checked={rec.hasFarmerCompanion}
                  onCheckedChange={(c) => updateField("hasFarmerCompanion", c)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 2 */}
        <div className="rounded-xl overflow-hidden border border-border bg-card shadow-sm">
          <SectionHeader
            num={2}
            titleHi="2. धान की फसल का आधार रेखा"
            titleEn="2. Rice Crop Baseline"
          />
          {expanded[2] && (
            <div className="p-4 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <LabelField labelHi="धान की किस्म" labelEn="Rice Variety" />
                  <Input
                    value={rec.riceVariety}
                    onChange={(e) => updateField("riceVariety", e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <LabelField labelHi="फसल की अवस्था" labelEn="Crop Stage" />
                  <Input
                    value={rec.cropStage}
                    onChange={(e) => updateField("cropStage", e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <LabelField labelHi="बुवाई की तिथि" labelEn="Sowing Date" />
                  <Input
                    type="date"
                    value={rec.sowingDate}
                    onChange={(e) => updateField("sowingDate", e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <LabelField labelHi="पहली यात्रा की तिथि" labelEn="First Visit Date" />
                  <Input
                    type="date"
                    value={rec.firstVisitDate}
                    onChange={(e) => updateField("firstVisitDate", e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <LabelField labelHi="सिंचाई का स्रोत" labelEn="Irrigation Source" />
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
                  <LabelField labelHi="अब तक सिंचाई की संख्या" labelEn="Irrigation Count" />
                  <Input
                    type="number"
                    value={rec.irrigationCountSoFar || ""}
                    onChange={(e) =>
                      updateField(
                        "irrigationCountSoFar",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <LabelField labelHi="अंतिम सिंचाई तिथि" labelEn="Last Irrigation Date" />
                  <Input
                    type="date"
                    value={rec.lastIrrigationDate}
                    onChange={(e) => updateField("lastIrrigationDate", e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <LabelField labelHi="वर्तमान नमी" labelEn="Current Moisture" />
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
                <LabelField labelHi="उर्वरक विवरण" labelEn="Fertilizer Details" />
                <Input
                  value={rec.fertilizerDetails}
                  onChange={(e) => updateField("fertilizerDetails", e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <LabelField labelHi="कीटनाशक विवरण" labelEn="Pesticide Details" />
                <Input
                  value={rec.pesticideDetails}
                  onChange={(e) => updateField("pesticideDetails", e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <LabelField labelHi="वर्तमान समस्याएं" labelEn="Current Problems" />
                <Input
                  value={rec.currentProblems}
                  onChange={(e) => updateField("currentProblems", e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <LabelField labelHi="किसान की मुख्य आवश्यकता" labelEn="Farmer Main Need" />
                <Input
                  value={rec.farmerMainNeed}
                  onChange={(e) => updateField("farmerMainNeed", e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 3 */}
        <div className="rounded-xl overflow-hidden border border-border bg-card shadow-sm">
          <SectionHeader num={3} titleHi="3. मिट्टी की जांच" titleEn="3. Soil Saathi Reading" />
          {expanded[3] && (
            <div className="p-4 space-y-6">
              <div>
                <h4 className="font-bold text-primary mb-3">Baseline / आधार रेखा</h4>
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
                      <Label className="text-[10px] uppercase text-muted-foreground">{k}</Label>
                      <Input
                        value={(rec.soilBaseline as any)[k]}
                        onChange={(e) =>
                          updateNestedField("soilBaseline", k as any, e.target.value)
                        }
                        className="h-10 px-2 text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-primary mb-3">Follow-up / अनुवर्ती</h4>
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
                      <Label className="text-[10px] uppercase text-muted-foreground">{k}</Label>
                      <Input
                        value={(rec.soilFollowup as any)[k]}
                        onChange={(e) =>
                          updateNestedField("soilFollowup", k as any, e.target.value)
                        }
                        className="h-10 px-2 text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <LabelField labelHi="SPAD क्लोरोफिल" labelEn="SPAD Chlorophyll" />
                  <Input
                    value={rec.spadChlorophyll}
                    onChange={(e) => updateField("spadChlorophyll", e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div>
                  <LabelField labelHi="प्रयोगशाला नमूना कोड" labelEn="Lab Sample Code" />
                  <Input
                    value={rec.labSampleCode}
                    onChange={(e) => updateField("labSampleCode", e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 4 */}
        <div className="rounded-xl overflow-hidden border border-border bg-card shadow-sm">
          <SectionHeader
            num={4}
            titleHi="4. तकनीकी हस्तक्षेप"
            titleEn="4. Technical Intervention"
          />
          {expanded[4] && (
            <div className="p-4 space-y-5">
              <div>
                <LabelField labelHi="सलाह" labelEn="Farm Assist Advice" />
                <Input
                  value={rec.farmAssistAdvice}
                  onChange={(e) => updateField("farmAssistAdvice", e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <LabelField labelHi="सलाह का प्रकार" labelEn="Advice Type" />
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
        </div>
      </div>
    </div>
  );
}
