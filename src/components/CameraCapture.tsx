import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { newLocalId, putPhotoBlob } from "@/lib/offline";
import type { PhotoMeta } from "@/lib/types";

interface Props {
  onCaptured: (photo: PhotoMeta, previewUrl: string) => void;
}

function readPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  });
}

export function CameraCapture({ onCaptured }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setError("camera");
      }
    })();
    // warm up GPS permission as soon as the camera opens
    void readPosition();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, facing, stop]);

  useEffect(() => () => stop(), [stop]);

  async function capture() {
    const video = videoRef.current;
    if (!video || busy) return;
    setBusy(true);
    try {
      // GPS is read at the exact moment of the click, alongside the frame grab.
      const posPromise = readPosition();
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 960;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const timestamp = Date.now();
      const pos = await posPromise;

      // burn the stamp into the image so the evidence travels with the file
      const pad = Math.round(canvas.width * 0.02);
      const fontSize = Math.max(16, Math.round(canvas.width * 0.028));
      ctx.font = `600 ${fontSize}px sans-serif`;
      const lines = [
        pos ? `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}` : "GPS: N/A",
        new Date(timestamp).toLocaleString(),
      ];
      const boxH = fontSize * lines.length * 1.5 + pad;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, canvas.height - boxH, canvas.width, boxH);
      ctx.fillStyle = "#ffffff";
      lines.forEach((line, i) => {
        ctx.fillText(line, pad, canvas.height - boxH + pad / 2 + fontSize * (i + 1) * 1.2);
      });

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82),
      );
      if (!blob) return;
      const localKey = newLocalId();
      await putPhotoBlob(localKey, blob);
      const photo: PhotoMeta = {
        url: "",
        localKey,
        latitude: pos?.coords.latitude ?? null,
        longitude: pos?.coords.longitude ?? null,
        accuracy: pos?.coords.accuracy ?? null,
        timestamp,
      };
      onCaptured(photo, URL.createObjectURL(blob));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        className="w-full touch-row"
        onClick={() => setOpen(true)}
      >
        <Camera className="mr-2 size-5" /> {t("openCamera")}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between p-3 text-primary-foreground">
        <span className="flex items-center gap-1 text-xs opacity-80">
          <MapPin className="size-4" /> {t("gpsCaptured")}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("closeCamera")}
          className="p-2"
        >
          <X className="size-6 text-white" />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white">
            {t("gpsUnavailable")} — camera permission denied
          </div>
        ) : (
          <video ref={videoRef} playsInline muted className="size-full object-cover" />
        )}
      </div>
      <div className="flex items-center justify-around bg-black p-6">
        <button
          type="button"
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          className="p-3 text-white"
          aria-label={t("switchCamera")}
        >
          <RefreshCw className="size-6" />
        </button>
        <button
          type="button"
          onClick={capture}
          disabled={busy}
          aria-label={t("capture")}
          className="flex size-20 items-center justify-center rounded-full border-4 border-white bg-white/20"
        >
          {busy ? (
            <Loader2 className="size-8 animate-spin text-white" />
          ) : (
            <span className="size-14 rounded-full bg-white" />
          )}
        </button>
        <span className="size-12" />
      </div>
    </div>
  );
}
