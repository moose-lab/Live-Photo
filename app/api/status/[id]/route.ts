import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Use Node.js runtime for Prisma compatibility
export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      // Poll database for status updates
      const interval = setInterval(async () => {
        try {
          const video = await prisma.video.findUnique({
            where: { id },
          })

          if (!video) {
            sendUpdate({ error: 'Video not found' })
            clearInterval(interval)
            controller.close()
            return
          }

          const progress =
            video.status === 'uploaded'
              ? 10
              : video.status === 'processing'
              ? 50
              : video.status === 'completed'
              ? 100
              : 0

          sendUpdate({
            id: video.id,
            status: video.status,
            progress,
            coverUrl: video.coverUrl,
            processedVideoUrl: video.processedUrl,
          })

          if (video.status === 'completed' || video.status === 'failed') {
            clearInterval(interval)
            controller.close()
          }
        } catch (error) {
          console.error('Status check error:', error)
          sendUpdate({ error: 'Failed to check status' })
          clearInterval(interval)
          controller.close()
        }
      }, 2000) // Poll every 2 seconds

      // Clean up on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
