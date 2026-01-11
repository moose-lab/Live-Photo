'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { VideoMetadata } from '@/lib/video-utils'
import { formatDuration } from '@/lib/video-utils'

interface FirstFramePreviewProps {
  frameDataUrl: string
  metadata: VideoMetadata
  fileName?: string
}

export function FirstFramePreview({
  frameDataUrl,
  metadata,
  fileName,
}: FirstFramePreviewProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">📹</span>
          Original Frame
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Frame Image */}
        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
          <img
            src={frameDataUrl}
            alt="Video first frame"
            className="w-full h-full object-contain"
          />
          <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
            First Frame
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
            <div className="text-muted-foreground text-xs">Size</div>
            <div className="font-medium">
              {metadata.width} × {metadata.height}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
            <div className="text-muted-foreground text-xs">Ratio</div>
            <div className="font-medium">{metadata.aspectRatio}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
            <div className="text-muted-foreground text-xs">Duration</div>
            <div className="font-medium">{formatDuration(metadata.duration)}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
            <div className="text-muted-foreground text-xs">Status</div>
            <div className="font-medium text-green-600">✓ Ready</div>
          </div>
        </div>

        {fileName && (
          <p className="text-xs text-muted-foreground truncate">
            {fileName}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
