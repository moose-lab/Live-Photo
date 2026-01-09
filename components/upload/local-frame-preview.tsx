'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'
import type { VideoMetadata } from '@/lib/video-utils'
import { formatFileSize, formatDuration } from '@/lib/video-utils'

interface LocalFramePreviewProps {
  frameDataUrl: string
  metadata: VideoMetadata
  fileName: string
  fileSize: number
  onContinue: () => void
  onCancel: () => void
}

export function LocalFramePreview({
  frameDataUrl,
  metadata,
  fileName,
  fileSize,
  onContinue,
  onCancel,
}: LocalFramePreviewProps) {
  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Check className="w-5 h-5 text-green-500" />
          Frame Extracted Successfully!
        </CardTitle>
        <CardDescription>
          This frame will be transformed into a doodle-style cover
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Frame Preview */}
        <div className="relative">
          <img
            src={frameDataUrl}
            alt="First frame"
            className="w-full h-auto rounded-lg border-2 border-purple-200 shadow-lg"
          />
          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
            First Frame
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-muted-foreground text-xs">File Name</div>
            <div className="font-medium truncate">{fileName}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-muted-foreground text-xs">File Size</div>
            <div className="font-medium">{formatFileSize(fileSize)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-muted-foreground text-xs">Dimensions</div>
            <div className="font-medium">
              {metadata.width} × {metadata.height}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-muted-foreground text-xs">Aspect Ratio</div>
            <div className="font-medium">{metadata.aspectRatio}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-muted-foreground text-xs">Duration</div>
            <div className="font-medium">{formatDuration(metadata.duration)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
            <div className="text-muted-foreground text-xs">Status</div>
            <div className="font-medium text-green-600">✓ Ready</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={onContinue}
            size="lg"
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Check className="mr-2 h-5 w-5" />
            Continue & Upload
          </Button>
          <Button onClick={onCancel} size="lg" variant="outline" className="flex-1">
            <X className="mr-2 h-5 w-5" />
            Cancel
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          AI will process this frame and embed the doodle cover into your video
        </p>
      </CardContent>
    </Card>
  )
}
