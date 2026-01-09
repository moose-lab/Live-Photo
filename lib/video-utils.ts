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

/**
 * Compose video with doodle cover as first frame
 * Creates a video that starts with doodle cover and transitions to original video
 *
 * @param videoFile - Original video file
 * @param doodleCoverUrl - URL of the doodle-style cover image
 * @param coverDuration - Duration to display cover in seconds (default: 1.5s)
 * @param onProgress - Progress callback (0-100)
 * @returns Promise with composed video blob
 */
export async function composeVideoWithDoodleCover(
  videoFile: File,
  doodleCoverUrl: string,
  coverDuration: number = 1.5,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      onProgress?.(5)

      // Load doodle cover image
      const coverImage = await loadImage(doodleCoverUrl)
      onProgress?.(10)

      // Create video element for original video
      const video = document.createElement('video')
      video.src = URL.createObjectURL(videoFile)
      video.muted = true
      video.playsInline = true

      // Wait for video to load
      await new Promise<void>((resolveLoad, rejectLoad) => {
        video.addEventListener('loadeddata', () => resolveLoad(), { once: true })
        video.addEventListener('error', () => rejectLoad(new Error('Failed to load video')), { once: true })
      })

      onProgress?.(20)

      const width = video.videoWidth
      const height = video.videoHeight
      const fps = 30 // Target 30 FPS

      // Create canvas for composition
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Could not get canvas context')
      }

      // Create MediaRecorder for output
      const stream = canvas.captureStream(fps)
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000, // 5 Mbps for good quality
      })

      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        URL.revokeObjectURL(video.src)
        onProgress?.(100)
        resolve(blob)
      }

      recorder.onerror = (e) => {
        URL.revokeObjectURL(video.src)
        reject(new Error('Recording failed'))
      }

      // Start recording
      recorder.start()
      onProgress?.(30)

      // Phase 1: Display doodle cover for specified duration
      const coverFrames = Math.floor(coverDuration * fps)
      for (let i = 0; i < coverFrames; i++) {
        // Draw doodle cover
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(coverImage, 0, 0, width, height)

        // Optional: Add fade-in effect for first few frames
        if (i < fps * 0.3) {
          const alpha = i / (fps * 0.3)
          ctx.globalAlpha = alpha
          ctx.drawImage(coverImage, 0, 0, width, height)
          ctx.globalAlpha = 1.0
        }

        await new Promise(resolve => setTimeout(resolve, 1000 / fps))

        // Update progress during cover phase (30-50%)
        const coverProgress = 30 + (i / coverFrames) * 20
        onProgress?.(coverProgress)
      }

      onProgress?.(50)

      // Phase 2: Transition from cover to video
      const transitionDuration = 0.5 // 0.5 second transition
      const transitionFrames = Math.floor(transitionDuration * fps)

      video.currentTime = 0
      await new Promise<void>(resolve => {
        video.addEventListener('seeked', () => resolve(), { once: true })
      })

      for (let i = 0; i < transitionFrames; i++) {
        const alpha = i / transitionFrames

        // Draw doodle cover
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(coverImage, 0, 0, width, height)

        // Fade in video on top
        ctx.globalAlpha = alpha
        ctx.drawImage(video, 0, 0, width, height)
        ctx.globalAlpha = 1.0

        await new Promise(resolve => setTimeout(resolve, 1000 / fps))

        // Update progress during transition (50-60%)
        const transitionProgress = 50 + (i / transitionFrames) * 10
        onProgress?.(transitionProgress)
      }

      onProgress?.(60)

      // Phase 3: Play through the rest of the original video
      video.play()

      const captureFrame = async () => {
        if (video.ended || video.paused) {
          recorder.stop()
          return
        }

        ctx.drawImage(video, 0, 0, width, height)

        // Update progress during video playback (60-95%)
        const videoProgress = 60 + (video.currentTime / video.duration) * 35
        onProgress?.(videoProgress)

        requestAnimationFrame(captureFrame)
      }

      video.addEventListener('ended', () => {
        recorder.stop()
      }, { once: true })

      captureFrame()

    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Load an image from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // Enable CORS for external images
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}
