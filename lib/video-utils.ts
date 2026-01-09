/**
 * Video utility functions for client-side video processing
 */

/**
 * Check if a file is HEIC/HEIF format (iOS Live Photos)
 */
export function isHeicFile(file: File): boolean {
  const fileName = file.name.toLowerCase()
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    fileName.endsWith('.heic') ||
    fileName.endsWith('.heif')
  )
}

export interface VideoMetadata {
  width: number
  height: number
  duration: number
  aspectRatio: string
}

export interface FrameExtractionResult {
  frameDataUrl: string
  metadata: VideoMetadata
}

/**
 * Extract the first frame from a video file using HTML5 Video + Canvas API
 * Works in the browser without server-side processing
 *
 * @param file - Video file (MP4, MOV, WebM)
 * @returns Promise with frame DataURL and video metadata
 */
export async function extractFirstFrame(file: File): Promise<FrameExtractionResult> {
  return new Promise((resolve, reject) => {
    // HEIC files need server-side processing - reject with specific error
    if (isHeicFile(file)) {
      reject(new Error('HEIC_REQUIRES_SERVER_PROCESSING'))
      return
    }

    // Validate file type for standard video formats
    if (!file.type.startsWith('video/')) {
      reject(new Error('File is not a video format'))
      return
    }

    // Create video element
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    // Create object URL for the video
    const objectUrl = URL.createObjectURL(file)
    video.src = objectUrl

    // Timeout handler
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Video loading timeout'))
    }, 10000) // 10 second timeout

    // Handle video loaded
    video.addEventListener('loadeddata', () => {
      clearTimeout(timeout)

      try {
        // Set to first frame
        video.currentTime = 0

        // Wait for seek to complete
        video.addEventListener('seeked', () => {
          try {
            // Create canvas
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            if (!ctx) {
              throw new Error('Could not get canvas context')
            }

            // Set canvas dimensions to video dimensions
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight

            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

            // Convert canvas to DataURL
            const frameDataUrl = canvas.toDataURL('image/jpeg', 0.9)

            // Calculate aspect ratio
            const aspectRatio = calculateAspectRatio(video.videoWidth, video.videoHeight)

            // Clean up
            URL.revokeObjectURL(objectUrl)

            // Return result
            resolve({
              frameDataUrl,
              metadata: {
                width: video.videoWidth,
                height: video.videoHeight,
                duration: video.duration,
                aspectRatio,
              },
            })
          } catch (error) {
            URL.revokeObjectURL(objectUrl)
            reject(error)
          }
        }, { once: true })
      } catch (error) {
        URL.revokeObjectURL(objectUrl)
        reject(error)
      }
    }, { once: true })

    // Handle errors
    video.addEventListener('error', () => {
      clearTimeout(timeout)
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load video'))
    }, { once: true })
  })
}

/**
 * Calculate aspect ratio from width and height
 */
function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(width, height)
  const ratioW = width / divisor
  const ratioH = height / divisor

  // Common aspect ratios
  if (Math.abs(ratioW / ratioH - 16 / 9) < 0.1) return '16:9'
  if (Math.abs(ratioW / ratioH - 9 / 16) < 0.1) return '9:16'
  if (Math.abs(ratioW / ratioH - 4 / 3) < 0.1) return '4:3'
  if (Math.abs(ratioW / ratioH - 1) < 0.01) return '1:1'

  return `${ratioW}:${ratioH}`
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Format duration to MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
