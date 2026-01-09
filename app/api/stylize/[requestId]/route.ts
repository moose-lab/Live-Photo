import { NextResponse } from 'next/server'
import { getStylizeResult } from '@/lib/wavespeed'

/**
 * GET /api/stylize/[requestId]
 *
 * Query the status and result of a stylization task
 *
 * Response:
 * - status: 'pending' | 'processing' | 'completed' | 'failed'
 * - resultUrl: string (when completed)
 * - error: string (when failed)
 * - progress: number (optional, 0-100)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId is required' },
        { status: 400 }
      )
    }

    // Query Wavespeed API for result
    const result = await getStylizeResult(requestId)

    // Map Wavespeed status to our status format
    let status: 'pending' | 'processing' | 'completed' | 'failed' = result.status

    // Handle alternate status values from Wavespeed API
    if ((result.status as string) === 'succeeded') {
      status = 'completed'
    } else if ((result.status as string) === 'error') {
      status = 'failed'
    }

    return NextResponse.json({
      status,
      resultUrl: result.resultUrl,
      error: result.error,
      progress: result.progress,
    })
  } catch (error) {
    console.error('Stylize result query error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to query stylization result',
        status: 'failed',
      },
      { status: 500 }
    )
  }
}
