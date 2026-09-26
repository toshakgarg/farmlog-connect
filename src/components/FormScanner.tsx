import React, { useState, useRef } from 'react';
import { Camera, RefreshCw, Edit2, AlertCircle } from 'lucide-react';
import { JOITAPerforma } from '../lib/types';
import { extractTextFromImage } from '../lib/visionApi';
import { parseJOITAFromText, calculateExtractionConfidence } from '../lib/joitaParser';

interface Props {
  onScanned: (data: Partial<JOITAPerforma>) => void;
  onCancel: () => void;
}

type ScanState = 'capture' | 'processing' | 'review' | 'error';

export function FormScanner({ onScanned, onCancel }: Props) {
  const [scanState, setScanState] = useState<ScanState>('capture');
  const [error, setError] = useState<string>('');
  const [extractedData, setExtractedData] = useState<Partial<JOITAPerforma>>({});
  const [confidenceResult, setConfidenceResult] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [processingStep, setProcessingStep] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!import.meta.env['VITE_GOOGLE_VISION_API_KEY']) {
    return (
      <div className="p-6 text-center">
        <p className="text-amber-600 font-semibold">⚠️ Form Scanner Not Configured</p>
        <p className="text-gray-500 text-sm mt-2">
          Google Vision API key is not set. Please contact your administrator.
        </p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 border rounded-lg font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel / वापस जाएँ
        </button>
      </div>
    );
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setScanState('processing');
    setProcessingStep(1);

    try {
      // Step 2 delay
      setTimeout(() => setProcessingStep(2), 800);
      
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string | null;
          resolve(result ? result.split(',')[1] || '' : '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Step 3 delay
      setTimeout(() => setProcessingStep(3), 1600);

      const visionResult = await extractTextFromImage(base64);

      // Step 4 delay
      setTimeout(() => setProcessingStep(4), 2400);

      const parsed = parseJOITAFromText(visionResult.rawText);
      const confidence = calculateExtractionConfidence(parsed);

      setTimeout(() => {
        setExtractedData(parsed);
        setConfidenceResult(confidence);
        setScanState('review');
      }, 3200);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setScanState('error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white p-4">
      {scanState === 'capture' && (
        <div className="flex flex-col items-center justify-center flex-1 text-center max-w-sm mx-auto w-full space-y-8">
          <div className="p-6 bg-green-50 rounded-full">
            <Camera className="w-20 h-20 text-green-600" />
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">📋 पेपर फॉर्म स्कैन करें</h2>
            <h3 className="text-lg font-medium text-gray-600">Scan Paper Form</h3>
          </div>

          <div className="text-left bg-gray-50 p-4 rounded-xl space-y-3 w-full">
            <p className="text-sm font-medium">1. फॉर्म को समतल जगह पर रखें / Place form on flat surface</p>
            <p className="text-sm font-medium">2. पर्याप्त रोशनी सुनिश्चित करें / Ensure good lighting</p>
            <p className="text-sm font-medium">3. पूरा फॉर्म कैमरे में आना चाहिए / Full form must be in frame</p>
            <p className="text-sm font-medium">4. हिंदी और अंग्रेजी दोनों पढ़ी जा सकती हैं / Both Hindi and English are read</p>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-[60px] bg-green-600 text-white rounded-xl font-bold text-lg shadow-md active:scale-95 transition-transform"
            >
              📷 फोटो लें / Take Photo
            </button>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            
            <button
              onClick={onCancel}
              className="w-full h-[52px] font-semibold text-gray-500 active:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {scanState === 'processing' && (
        <div className="flex flex-col items-center justify-center flex-1 space-y-6">
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="w-48 h-64 object-cover rounded-xl shadow-md opacity-50" />
          )}
          <div className="space-y-4 w-full max-w-sm px-6">
            <p className={`flex items-center gap-2 font-medium ${processingStep >= 1 ? 'text-green-600' : 'text-gray-400'}`}>
              {processingStep >= 1 ? '✓' : '○'} Image captured
            </p>
            <p className={`flex items-center gap-2 font-medium ${processingStep >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
              {processingStep >= 2 ? (processingStep > 2 ? '✓' : '⏳') : '○'} Sending to Google Vision API...
            </p>
            <p className={`flex items-center gap-2 font-medium ${processingStep >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
              {processingStep >= 3 ? (processingStep > 3 ? '✓' : '⏳') : '○'} Extracting Hindi + English text...
            </p>
            <p className={`flex items-center gap-2 font-medium ${processingStep >= 4 ? 'text-green-600' : 'text-gray-400'}`}>
              {processingStep >= 4 ? '⏳' : '○'} Mapping to JOITA fields...
            </p>
          </div>
        </div>
      )}

      {scanState === 'review' && confidenceResult && (
        <div className="flex flex-col flex-1 max-w-md mx-auto w-full">
          <div className="bg-green-50 p-4 rounded-xl mb-6">
            <h3 className="font-bold text-green-800 mb-2">
              ✅ {confidenceResult.filledFields}/{confidenceResult.totalFields} fields extracted ({confidenceResult.percentage}%)
            </h3>
            <div className="w-full bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all" 
                style={{ width: `${confidenceResult.percentage}%` }}
              ></div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 mb-6">
            <div className="space-y-2">
              <p className="font-bold text-gray-700 border-b pb-1">Extracted Information:</p>
              {extractedData.farmerName && <p className="text-sm">✓ Farmer Name: <b>{extractedData.farmerName}</b></p>}
              {extractedData.village && <p className="text-sm">✓ Village: <b>{extractedData.village}</b></p>}
              {extractedData.mobile && <p className="text-sm">✓ Mobile: <b>{extractedData.mobile}</b></p>}
              {extractedData.cluster && <p className="text-sm">✓ Cluster: <b>{extractedData.cluster}</b></p>}
              {extractedData.riceVariety && <p className="text-sm">✓ Rice Variety: <b>{extractedData.riceVariety}</b></p>}
              {extractedData.totalLandAcres && <p className="text-sm">✓ Land Acres: <b>{extractedData.totalLandAcres}</b></p>}
              
              {confidenceResult.missedFields.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="font-bold text-amber-700 mb-2">Fields to fill manually:</p>
                  {confidenceResult.missedFields.map((f: string) => (
                    <p key={f} className="text-sm text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {f}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 mt-auto">
            <p className="text-xs text-center text-gray-500 mb-2">
              आप फॉर्म में जाकर गलत जानकारी सुधार सकते हैं / You can correct any mistakes in the form
            </p>
            <button
              onClick={() => onScanned(extractedData)}
              className="w-full h-[56px] bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md"
            >
              <Edit2 className="w-5 h-5" /> ✏️ फॉर्म में देखें / Review in Form
            </button>
            <button
              onClick={() => setScanState('capture')}
              className="w-full h-[52px] border-2 border-gray-300 text-gray-700 font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" /> 🔄 दोबारा स्कैन करें / Scan Again
            </button>
          </div>
        </div>
      )}

      {scanState === 'error' && (
        <div className="flex flex-col items-center justify-center flex-1 text-center space-y-6">
          <div className="p-6 bg-red-50 rounded-full">
            <AlertCircle className="w-20 h-20 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">❌ स्कैन विफल</h2>
            <p className="text-gray-600">Scan Failed</p>
          </div>
          <p className="text-red-600 font-medium max-w-xs">{error}</p>
          <div className="w-full max-w-xs space-y-3 mt-8">
            <button
              onClick={() => setScanState('capture')}
              className="w-full h-[52px] bg-gray-900 text-white rounded-xl font-bold"
            >
              दोबारा कोशिश करें / Try Again
            </button>
            <button
              onClick={onCancel}
              className="w-full h-[52px] font-semibold text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
