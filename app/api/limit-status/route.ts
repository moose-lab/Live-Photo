import { NextResponse } from 'next/server'
import { getRemainingCalls, getDailyLimit, getCurrentCount } from '@/lib/api-limits-kv'

/**
 * GET /api/limit-status
 *
 * Get current global API rate limit status
 *
 * Response:
 * - remaining: number (calls remaining today)
 * - limit: number (total daily limit)
 * - used: number (calls used today)
 */
export async function GET() {
  try {
    const remaining = await getRemainingCalls()
    const limit = getDailyLimit()
    const used = await getCurrentCount()

    return NextResponse.json({
      remaining,
      limit,
      used,
    })
  } catch (error) {
    console.error('Limit status API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get limit status',
        remaining: getDailyLimit(), // Fallback to full limit
        limit: getDailyLimit(),
        used: 0,
      },
      { status: 500 }
    )
  }
}
