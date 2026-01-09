'use client'

import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface UploadProgressProps {
  progress: number
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  errorMessage?: string | null
}

export function UploadProgress({ progress, status, errorMessage }: UploadProgressProps) {
  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading video...'
      case 'processing':
        return 'Generating cover image...'
      case 'completed':
        return 'Complete!'
      case 'error':
        return 'Error occurred'
      default:
        return ''
    }
  }

  if (status === 'idle') return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {status === 'error' ? 'Upload Failed' : getStatusText()}
        </CardTitle>
        {errorMessage && <CardDescription className="text-red-500">{errorMessage}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Progress value={progress} className="w-full" />
        <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
      </CardContent>
    </Card>
  )
}
