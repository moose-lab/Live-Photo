/**
 * Global API Rate Limiting with Vercel KV (Redis)
 * Implements true global rate limiting across all users
 * Uses KV_REDIS_* prefixed environment variables
 */

import { createClient } from '@vercel/kv'

const DAILY_LIMIT = 100
const RATE_LIMIT_KEY = 'global:api:daily_count'

// Create KV client using KV_REDIS_* prefixed environment variables
const kv = createClient({
  url: process.env.KV_REDIS_KV_REST_API_URL!,
  token: process.env.KV_REDIS_KV_REST_API_TOKEN!,
})

/**
 * Get current date string (YYYY-MM-DD)
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get the Redis key for today's count
 */
function getTodayKey(): string {
  return `${RATE_LIMIT_KEY}:${getCurrentDate()}`
}

/**
 * Check if API call can be made (global limit check)
 * @returns true if limit not reached, false if limit exceeded
 */
export async function canMakeApiCall(): Promise<boolean> {
  try {
    const key = getTodayKey()
    const currentCount = await kv.get<number>(key) || 0
    return currentCount < DAILY_LIMIT
  } catch (error) {
    console.error('KV rate limit check failed:', error)
    // Fail open - allow the call if KV is down
    return true
  }
}

/**
 * Get remaining API calls for today (global)
 */
export async function getRemainingCalls(): Promise<number> {
  try {
    const key = getTodayKey()
    const currentCount = await kv.get<number>(key) || 0
    return Math.max(0, DAILY_LIMIT - currentCount)
  } catch (error) {
    console.error('KV get remaining calls failed:', error)
    return DAILY_LIMIT // Return full limit if KV is down
  }
}

/**
 * Increment API call counter (global)
 * Sets expiry to end of day if new key
 */
export async function incrementApiCallCount(): Promise<void> {
  try {
    const key = getTodayKey()

    // Increment the counter
    const newCount = await kv.incr(key)

    // If this is the first increment today, set expiry to end of day
    if (newCount === 1) {
      const now = new Date()
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      const secondsUntilEndOfDay = Math.floor((endOfDay.getTime() - now.getTime()) / 1000)

      await kv.expire(key, secondsUntilEndOfDay)
    }
  } catch (error) {
    console.error('KV increment failed:', error)
    // Don't throw - log and continue
  }
}

/**
 * Get daily limit constant
 */
export function getDailyLimit(): number {
  return DAILY_LIMIT
}

/**
 * Get current global count (for debugging/monitoring)
 */
export async function getCurrentCount(): Promise<number> {
  try {
    const key = getTodayKey()
    return await kv.get<number>(key) || 0
  } catch (error) {
    console.error('KV get current count failed:', error)
    return 0
  }
}
