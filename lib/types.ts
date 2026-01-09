export interface Video {
  id: string
  originalUrl: string
  status: 'uploaded' | 'processing' | 'completed' | 'failed'
  coverUrl?: string | null
  metadata?: Record<string, any> | null
  createdAt: Date
  updatedAt: Date
}

export interface UploadResponse {
  url: string
  downloadUrl: string
  videoId: string
}

export interface ProcessingStatus {
  id: string
  status: 'uploaded' | 'processing' | 'completed' | 'failed'
  progress: number
  coverUrl?: string
  error?: string
}
