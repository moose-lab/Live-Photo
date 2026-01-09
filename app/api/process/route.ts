import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Mock AI API Processor
 *
 * This simulates the custom AI model API that generates doodle-style covers.
 * Replace this with your actual AI API integration.
 *
 * REAL IMPLEMENTATION FLOW:
 *
 * FOR HEIC/HEIF FILES (iOS Live Photos):
 * 1a. Convert HEIC to video using FFmpeg or heic-convert library
 *     ffmpeg -i input.heic -c:v libx264 -pix_fmt yuv420p output.mp4
 *     OR use: https://github.com/catdad-experiments/libheif-js
 *
 * 1b. Extract embedded video stream if present (HEIC with motion)
 *     ffmpeg -i input.heic -map 0:v:1 -c copy motion.mp4
 *
 * FOR STANDARD VIDEOS (MP4, MOV, WebM):
 * 2. Extract video dimensions
 *    ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 input.mp4
 *
 * 3. Extract first frame from video
 *    ffmpeg -i input.mp4 -vframes 1 -f image2 frame.jpg
 *
 * 4. Send frame to AI API for doodle stylization
 *    POST /ai-api/stylize { image: frame.jpg, style: "doodle", width: 1920, height: 1080 }
 *
 * 5. Embed stylized frame back into video as opening frame (0.5-1s)
 *    ffmpeg -loop 1 -i doodle-frame.jpg -i input.mp4 \
 *      -filter_complex "[0:v]trim=duration=1[cover];[1:v]setpts=PTS-STARTPTS[video];[cover][video]concat=n=2:v=1:a=1" \
 *      output.mp4
 *
 * 6. Return:
 *    - coverUrl: doodle-frame.jpg (for thumbnail/preview)
 *    - processedVideoUrl: output.mp4 (live video with doodle cover as first frame)
 */

export async function POST(request: Request) {
  try {
    const { videoId, videoUrl } = await request.json()

    if (!videoId || !videoUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get video from database
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const startTime = Date.now()

    // Simulate AI processing (5-12 seconds)
    const processingDelay = Math.random() * 7000 + 5000
    await new Promise((resolve) => setTimeout(resolve, processingDelay))

    // MOCK IMPLEMENTATION
    // In real implementation, FFmpeg would extract video dimensions:
    // ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 input.mp4
    // Example output: 1920x1080 → aspectRatio = "16:9"

    // Mock: Simulate random video dimensions for demo
    const mockDimensions = [
      { width: 1920, height: 1080, ratio: '16:9' },  // Landscape
      { width: 1080, height: 1080, ratio: '1:1' },   // Square
      { width: 1080, height: 1920, ratio: '9:16' },  // Vertical
    ]
    const detectedDimensions = mockDimensions[Math.floor(Math.random() * mockDimensions.length)]

    // Generate placeholder cover image URL matching detected aspect ratio
    const mockCoverUrl = generateMockCoverUrl(detectedDimensions.ratio, detectedDimensions.width, detectedDimensions.height)

    // MOCK: In real implementation, this would be a NEW video with doodle cover embedded
    // For now, we return the original video URL as "processed" since we can't actually process
    // TODO: Replace with real FFmpeg video processing when integrating actual AI API
    const mockProcessedVideoUrl = videoUrl // Original video (mock - needs FFmpeg processing in production)

    const processingTimeMs = Date.now() - startTime

    // Update database with results
    await prisma.video.update({
      where: { id: videoId },
      data: {
        coverUrl: mockCoverUrl,
        processedUrl: mockProcessedVideoUrl,
        aspectRatio: detectedDimensions.ratio, // Auto-detected from video
        status: 'completed',
        processingTimeMs,
        metadata: {
          width: detectedDimensions.width,
          height: detectedDimensions.height,
        },
      },
    })

    return NextResponse.json({
      status: 'success',
      coverUrl: mockCoverUrl,           // Doodle-style cover image (for thumbnail)
      processedVideoUrl: mockProcessedVideoUrl, // Live video with doodle cover embedded (currently mock)
      processingTimeMs,
    })
  } catch (error) {
    console.error('Process error:', error)

    // Mark video as failed if we have videoId
    const body = await request.json().catch(() => ({}))
    if (body.videoId) {
      await prisma.video.update({
        where: { id: body.videoId },
        data: { status: 'failed' },
      }).catch(console.error)
    }

    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Generate a mock cover URL based on detected video dimensions
 * Uses placeholder.com for demo purposes
 *
 * Replace this with actual AI-generated cover URLs in production
 */
function generateMockCoverUrl(aspectRatio: string, width: number, height: number): string {
  // Random gradient colors for doodle aesthetic
  const colors = [
    '667eea/764ba2',  // Purple to violet
    'f093fb/f5576c',  // Pink to coral
    '4facfe/00f2fe',  // Blue to cyan
    'fa709a/fee140',  // Pink to yellow
    '30cfd0/330867',  // Teal to purple
  ]

  const randomColor = colors[Math.floor(Math.random() * colors.length)]

  return `https://via.placeholder.com/${width}x${height}/${randomColor}?text=Doodle+Cover+${aspectRatio}`
}
