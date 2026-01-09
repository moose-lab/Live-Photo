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
 * Response:
 * - requestId: string (task ID for polling result)
 * - status: 'pending'
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

    return NextResponse.json({
      requestId: taskResponse.requestId,
      status: 'pending',
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
