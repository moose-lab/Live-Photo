import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { submitStylizeTask } from '@/lib/wavespeed'

/**
 * POST /api/stylize
 *
 * Submit a frame image for doodle stylization
 *
 * Request body:
 * - frameDataUrl: string (base64 data URL of the frame)
 * - fileName: string (optional, for blob storage)
 *
 * Response (if completed immediately):
 * - requestId: string
 * - status: 'completed'
 * - resultUrl: string (URL of stylized image)
 * - frameUrl: string
 *
 * Response (if pending/processing):
 * - requestId: string (task ID for polling result)
 * - status: 'pending' | 'processing'
 * - frameUrl: string
 */
export async function POST(request: Request) {
  try {
    const { frameDataUrl, fileName = 'frame.jpg' } = await request.json()

    if (!frameDataUrl) {
      return NextResponse.json(
        { error: 'frameDataUrl is required' },
        { status: 400 }
      )
    }

    // Convert base64 data URL to Blob
    const base64Data = frameDataUrl.split(',')[1]
    if (!base64Data) {
      return NextResponse.json(
        { error: 'Invalid frameDataUrl format' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(base64Data, 'base64')
    const blob = new Blob([buffer], { type: 'image/jpeg' })

    // Upload frame to Vercel Blob to get public URL
    const uploadedBlob = await put(`frames/${Date.now()}-${fileName}`, blob, {
      access: 'public',
      addRandomSuffix: true,
    })

    console.log('Frame uploaded to Blob:', uploadedBlob.url)

    // Submit stylization task to Wavespeed
    const taskResponse = await submitStylizeTask({
      imageUrl: uploadedBlob.url,
      resolution: '1k',
    })

    console.log('Stylization task submitted:', taskResponse.requestId)
    console.log('Task status:', taskResponse.status)

    // Check if task completed immediately
    if (taskResponse.status === 'completed' && taskResponse.resultUrl) {
      console.log('Task completed immediately, returning result directly')
      return NextResponse.json({
        requestId: taskResponse.requestId,
        status: 'completed',
        resultUrl: taskResponse.resultUrl,
        frameUrl: uploadedBlob.url,
      })
    }

    // Check if task failed immediately
    if (taskResponse.status === 'failed') {
      console.error('Task failed immediately:', taskResponse.error)
      return NextResponse.json(
        {
          error: taskResponse.error || 'Stylization task failed',
          requestId: taskResponse.requestId,
        },
        { status: 500 }
      )
    }

    // Task is pending/processing, return requestId for polling
    return NextResponse.json({
      requestId: taskResponse.requestId,
      status: taskResponse.status,
      frameUrl: uploadedBlob.url,
    })
  } catch (error) {
    console.error('Stylize API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to submit stylization task',
      },
      { status: 500 }
    )
  }
}
