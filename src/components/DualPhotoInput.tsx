import { useRef } from 'react'
import { Camera, Upload } from 'lucide-react'

interface Props {
  onFileSelected: (file: File) => void
  uploading?: boolean
  label?: string
  sublabel?: string
  disabled?: boolean
}

export default function DualPhotoInput({
  onFileSelected,
  uploading = false,
  label,
  sublabel,
  disabled = false
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
    e.target.value = '' // reset so same file can be selected again
  }

  return (
    <div className="w-full">
      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />

      {/* Label */}
      {label && (
        <p className="font-semibold text-gray-800 text-sm mb-1">{label}</p>
      )}
      {sublabel && (
        <p className="text-gray-400 text-xs mb-3">{sublabel}</p>
      )}

      {/* Two buttons side by side */}
      <div className="grid grid-cols-2 gap-3">

        {/* Camera Button */}
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={disabled || uploading}
          className="flex flex-col items-center justify-center gap-2 h-[100px] bg-green-600 text-white rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
        >
          {uploading ? (
            <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-7 h-7" />
          )}
          <span className="text-sm font-semibold">
            {uploading ? 'Uploading...' : 'Camera'}
          </span>
          <span className="text-green-200 text-[10px]">कैमरा</span>
        </button>

        {/* Upload Button */}
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          disabled={disabled || uploading}
          className="flex flex-col items-center justify-center gap-2 h-[100px] bg-white border-2 border-green-600 text-green-700 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
        >
          <Upload className="w-7 h-7" />
          <span className="text-sm font-semibold">Gallery</span>
          <span className="text-green-600 text-[10px]">गैलरी से चुनें</span>
        </button>

      </div>
    </div>
  )
}