import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { JOITAPhoto } from '../lib/types';

interface Props {
  photos: JOITAPhoto[];
  onPhotosChange: (photos: JOITAPhoto[]) => void;
  maxPhotos?: number;
  required?: boolean;
}

function formatGPS(lat: number | null, lng: number | null): string {
  if (!lat || !lng) return 'GPS not available';
  return `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('hi-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function PhotoCapture({ photos, onPhotosChange, maxPhotos = 10, required = false }: Props) {
  const [uploading, setUploading] = useState(false);
  const [selectedPhotoType, setSelectedPhotoType] = useState<JOITAPhoto['photoType']>('field');
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('ready');
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      let latitude: number | null = gpsCoords?.lat || null;
      let longitude: number | null = gpsCoords?.lng || null;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch {
        console.warn('GPS unavailable for this photo');
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const fileName = `joita_${Date.now()}.jpg`;
      let url = base64;
      try {
        const { uploadPhoto } = await import('../lib/storage');
        const farmerId = `joita_${Date.now()}`;
        url = await uploadPhoto(base64, fileName, farmerId);
      } catch (uploadErr) {
        console.warn('Upload failed, storing locally:', uploadErr);
      }
      const newPhoto: JOITAPhoto = {
        url, latitude, longitude, timestamp: new Date().toISOString(), caption: '', photoType: selectedPhotoType,
      };
      onPhotosChange([...photos, newPhoto]);
    } catch (err) {
      console.error('Photo capture error:', err);
      alert('फोटो लेने में समस्या / Photo capture failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
  };

  const photoTypes = [
    { value: 'field', labelHi: '🌾 खेत', labelEn: 'Field' },
    { value: 'crop', labelHi: '🌱 फसल', labelEn: 'Crop' },
    { value: 'soil', labelHi: '🪨 मिट्टी', labelEn: 'Soil' },
    { value: 'pest', labelHi: '🐛 कीट', labelEn: 'Pest' },
    { value: 'other', labelHi: '📋 अन्य', labelEn: 'Other' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-700">
          फोटो का प्रकार चुनें / Select Photo Type
        </h4>
        <span className="text-xs text-gray-500">
          {photos.length} / {maxPhotos} photos added
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {photoTypes.map((pt) => (
          <button
            key={pt.value}
            type="button"
            onClick={() => setSelectedPhotoType(pt.value as any)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedPhotoType === pt.value
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {pt.labelHi} / {pt.labelEn}
          </button>
        ))}
      </div>

      {photos.length < maxPhotos && (
        <div className="relative border-2 border-dashed border-green-400 rounded-2xl p-4 bg-green-50 overflow-hidden">
          {uploading && (
            <div className="absolute inset-0 bg-white/80 rounded-2xl flex flex-col items-center justify-center z-10">
              <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-green-700 text-sm font-medium">अपलोड हो रहा है...</p>
              <p className="text-gray-400 text-xs">Uploading photo...</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple={false}
            onChange={handleCapture}
            className="hidden"
            ref={cameraInputRef}
          />
          <input
            type="file"
            accept="image/*"
            multiple={false}
            onChange={handleCapture}
            className="hidden"
            ref={uploadInputRef}
          />
          <div className="flex gap-4">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex flex-col items-center gap-2 bg-white p-4 rounded-xl shadow-sm border border-green-200 hover:bg-green-50 transition-colors"
              type="button"
              disabled={uploading}
            >
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <span className="text-green-800 font-semibold text-sm text-center">फोटो लें<br/>Camera</span>
            </button>
            <button
              onClick={() => uploadInputRef.current?.click()}
              className="flex-1 flex flex-col items-center gap-2 bg-white p-4 rounded-xl shadow-sm border border-green-200 hover:bg-green-50 transition-colors"
              type="button"
              disabled={uploading}
            >
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <span className="text-green-800 font-semibold text-sm text-center">अपलोड करें<br/>Gallery</span>
            </button>
          </div>
          <p className="text-gray-400 text-[11px] text-center mt-3">GPS automatically stamped when available</p>
        </div>
      )}

      <div className="text-xs text-center py-1">
        {gpsStatus === 'loading' && <span className="text-gray-500">⏳ Getting GPS location...</span>}
        {gpsStatus === 'ready' && gpsCoords && (
          <span className="text-green-600">✅ GPS ready: {formatGPS(gpsCoords.lat, gpsCoords.lng)}</span>
        )}
        {gpsStatus === 'error' && (
          <span className="text-red-500">❌ GPS unavailable — photo will be saved without location</span>
        )}
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative rounded-xl overflow-hidden aspect-[4/3] bg-gray-100">
              <img
                src={photo.url}
                alt={`Captured ${photo.photoType}`}
                className="w-full h-full object-cover"
                onClick={() => setPreviewIndex(idx)}
              />
              <button
                type="button"
                onClick={() => handleDelete(idx)}
                className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white shadow-md z-10"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 pointer-events-none">
                <p className="text-white text-xs font-medium capitalize">
                  {photo.photoType}
                </p>
                {photo.latitude && (
                  <p className="text-gray-300 text-[10px]">
                    📍 {photo.latitude.toFixed(4)}, {photo.longitude?.toFixed(4)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {previewIndex !== null && photos[previewIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setPreviewIndex(null)}
            className="absolute top-4 right-4 text-white p-2"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={photos[previewIndex].url}
            alt="Preview full screen"
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
          <div className="text-center mt-4 text-white w-full max-w-md">
            <p className="font-bold text-lg capitalize">{photos[previewIndex].photoType}</p>
            <p className="text-sm text-gray-300 mt-1">
              {formatGPS(photos[previewIndex].latitude, photos[previewIndex].longitude)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatTimestamp(photos[previewIndex].timestamp)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
