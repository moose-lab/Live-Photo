'use client'

import Image from 'next/image'
import { Card } from '@/components/ui/card'

interface CoverPreviewProps {
  src: string
  alt?: string
}

export function CoverPreview({ src, alt = 'Generated cover' }: CoverPreviewProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video w-full">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority
        />
      </div>
    </Card>
  )
}
