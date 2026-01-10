/**
 * API Rate Limiting Utilities
 * Manages daily API call limits using localStorage
 */

const STORAGE_KEY = 'wavespeed_api_calls'
const DAILY_LIMIT = 100

interface ApiCallRecord {
  date: string
  count: number
}

/**
 * Get current date string (YYYY-MM-DD)
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get API call record from localStorage
 */
function getRecord(): ApiCallRecord {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return { date: getCurrentDate(), count: 0 }
    }
    return JSON.parse(stored)
  } catch {
    return { date: getCurrentDate(), count: 0 }
  }
}

/**
 * Save API call record to localStorage
 */
function saveRecord(record: ApiCallRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch (error) {
    console.error('Failed to save API call record:', error)
  }
}

/**
 * Check if API call limit has been reached
 * @returns true if limit not reached, false if limit exceeded
 */
export function canMakeApiCall(): boolean {
  const record = getRecord()
  const today = getCurrentDate()

  // Reset counter if it's a new day
  if (record.date !== today) {
    record.date = today
    record.count = 0
    saveRecord(record)
  }

  return record.count < DAILY_LIMIT
}

/**
 * Get remaining API calls for today
 */
export function getRemainingCalls(): number {
  const record = getRecord()
  const today = getCurrentDate()

  // Reset counter if it's a new day
  if (record.date !== today) {
    return DAILY_LIMIT
  }

  return Math.max(0, DAILY_LIMIT - record.count)
}

/**
 * Increment API call counter
 */
export function incrementApiCallCount(): void {
  const record = getRecord()
  const today = getCurrentDate()

  // Reset counter if it's a new day
  if (record.date !== today) {
    record.date = today
    record.count = 0
  }

  record.count++
  saveRecord(record)
}

/**
 * Get daily limit constant
 */
export function getDailyLimit(): number {
  return DAILY_LIMIT
}
