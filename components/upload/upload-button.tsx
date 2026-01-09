'use client'

import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

interface UploadButtonProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export function UploadButton({ onFileSelect, disabled }: UploadButtonProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <div>
      <input
        type="file"
        id="video-upload"
        className="hidden"
        accept="video/mp4,video/quicktime,video/webm"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <label htmlFor="video-upload">
        <Button size="lg" className="gap-2" disabled={disabled} asChild>
          <span>
            <Upload className="h-4 w-4" />
            Upload Video
          </span>
        </Button>
      </label>
    </div>
  )
}
