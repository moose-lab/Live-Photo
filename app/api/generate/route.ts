import { NextResponse } from 'next/server'
import { Client } from '@upstash/qstash'
import { prisma } from '@/lib/db'

const qstash = process.env.QSTASH_TOKEN
  ? new Client({ token: process.env.QSTASH_TOKEN })
  : null

export async function POST(request: Request) {
  try {
    const { videoId } = await request.json()

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 })
    }

    // Get video from database
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Update status to processing
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'processing' },
    })

    // Queue processing job if QStash is configured
    if (qstash && process.env.NEXT_PUBLIC_URL) {
      await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_URL}/api/process`,
        body: {
          videoId: video.id,
          videoUrl: video.originalUrl,
        },
      })
    } else {
      // For local development without QStash, process immediately in background
      console.log('Processing video locally (no QStash configured)')

      // Call process endpoint directly (non-blocking)
      fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          videoUrl: video.originalUrl,
        }),
      }).catch((error) => {
        console.error('Background processing error:', error)
      })
    }

    return NextResponse.json({
      status: 'queued',
      videoId: video.id,
    })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: 'Failed to queue processing' },
      { status: 500 }
    )
  }
}
