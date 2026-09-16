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

interface Props {
  value: JOITAPerforma;
  farmers: FarmerRecord[];
  onSaveDraft: (rec: JOITAPerforma) => void;
  onSubmit: (rec: JOITAPerforma) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function JOITAForm({ value, farmers, onSaveDraft, onSubmit, onCancel, saving }: Props) {
  const { t } = useI18n();
  const [rec, setRec] = useState<JOITAPerforma>(value);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({
    1: true, 2: true, 3: true, 4: true, 5: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setRec(value);
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const p of rec.photos) {
        if (p.localKey && !p.url) {
          const blob = await getPhotoBlob(p.localKey);
          if (blob) next[p.localKey] = URL.createObjectURL(blob);
        }
      }
      if (!cancelled) setPreviews((prev) => ({ ...next, ...prev }));
    })();
    return () => {
      cancelled = true;
    };
  }, [rec.photos]);

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

  const updateNestedField = (parent: "soilBaseline" | "soilFollowup", field: keyof JOITAPerforma["soilBaseline"], val: string) => {
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
    const p = rec.photos[idx];
    if (p?.localKey) await deletePhotoBlob(p.localKey);
    setRec((r) => ({ ...r, photos: r.photos.filter((_, i) => i !== idx) }));
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
      { enableHighAccuracy: true }
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

  const SectionHeader = ({ num, titleHi, titleEn }: { num: number; titleHi: string; titleEn: string }) => (
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

  const LabelField = ({ labelHi, labelEn, req }: { labelHi: string; labelEn: string; req?: boolean }) => (
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
          const selected = multi
            ? (value as string[]).includes(opt.value)
            : value === opt.value;

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
                  const arr = value as string[];

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
                {opt.labelEn && (
                  <span className="text-[10px] opacity-80">
                    {opt.labelEn}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };
  return (
    <div>
      {/* existing JOITA form UI */}
    </div>
  );
}