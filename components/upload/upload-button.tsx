'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'

interface UploadButtonProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export function UploadButton({ onFileSelect, disabled }: UploadButtonProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      // Validate file type
      if (file.type.startsWith('video/')) {
        onFileSelect(file)
      } else {
        alert('Please upload a video file (MP4, MOV, or WebM)')
      }
    }
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative
        border-2 border-dashed rounded-lg p-12
        transition-all duration-200
        ${isDragging
          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 scale-105'
          : 'border-gray-300 dark:border-gray-700 hover:border-purple-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <input
        type="file"
        id="video-upload"
        className="hidden"
        accept="video/mp4,video/quicktime,video/webm"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <label htmlFor="video-upload" className="cursor-pointer">
        <div className="flex flex-col items-center gap-4">
          <div className={`
            p-4 rounded-full
            ${isDragging
              ? 'bg-purple-200 dark:bg-purple-800'
              : 'bg-purple-100 dark:bg-purple-900'
            }
          `}>
            <Upload className={`h-8 w-8 ${isDragging ? 'text-purple-600' : 'text-purple-500'}`} />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold mb-1">
              {isDragging ? 'Drop to Upload' : 'Click or Drag Video Here'}
            </p>
            <p className="text-sm text-muted-foreground">
              Supports MP4, MOV, WebM formats
            </p>
          </div>
        </div>
      </label>
    </div>
  )
}
