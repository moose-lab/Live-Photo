/**
 * Wavespeed AI Client for nano-banana-pro image stylization
 * API Docs: https://api.wavespeed.ai
 */

const WAVESPEED_API_BASE = 'https://api.wavespeed.ai/api/v3'
const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY

// Fixed doodle-style prompt for consistent anime aesthetic
const DOODLE_PROMPT = `Hand-drawn anime doodle–style colored pencil illustration with expressive sketchy line art and playful uneven pencil outlines, combined with light watercolor and marker-like wash textures. Bright pastel colors, high-contrast and lively tones with natural saturation. Visible pencil strokes layered with loose graffiti-like color fills. Warm and friendly tone, anime-inspired semi-chibi proportions. Simple facial features with stylized anime dot eyes, small exaggerated smiles. Flat yet detailed coloring, minimal shadows, bold highlights and outline accents. Anime doodle storyboard feel, energetic and whimsical atmosphere, casual sketchbook / graffiti anime style, high clarity, no realism, no photo texture.`

export interface StylizeTaskParams {
  imageUrl: string
  resolution?: '1k' | '2k'
}

export interface StylizeTaskResponse {
  requestId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  resultUrl?: string  // If task completed immediately
  error?: string      // If task failed immediately
}

export interface StylizeResultResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  resultUrl?: string
  error?: string
  progress?: number
}

/**
 * Submit a stylization task to Wavespeed nano-banana-pro
 *
 * @param params - Task parameters (imageUrl, resolution)
 * @returns Task response with requestId
 */
export async function submitStylizeTask(
  params: StylizeTaskParams
): Promise<StylizeTaskResponse> {
  if (!WAVESPEED_API_KEY) {
    throw new Error('WAVESPEED_API_KEY is not configured')
  }

  const { imageUrl, resolution = '1k' } = params

  const requestBody = {
    enable_base64_output: false,
    enable_sync_mode: false,
    images: [imageUrl],
    output_format: 'png',
    prompt: DOODLE_PROMPT,
    resolution,
  }

  console.log('Submitting to Wavespeed API:')
  console.log('- Endpoint:', `${WAVESPEED_API_BASE}/google/nano-banana-pro/edit`)
  console.log('- Image URL:', imageUrl)
  console.log('- Request body:', JSON.stringify(requestBody, null, 2))

  try {
    const response = await fetch(
      `${WAVESPEED_API_BASE}/google/nano-banana-pro/edit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WAVESPEED_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      }
    )

    console.log('Wavespeed API response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Wavespeed API error: ${response.status} ${JSON.stringify(errorData)}`
      )
    }

    const data = await response.json()

    // Log the full response for debugging
    console.log('Wavespeed API full response:', JSON.stringify(data, null, 2))

    // Wavespeed API returns nested response: { "data": { "id": "...", ... } }
    let requestId: string | undefined

    if (data.data && data.data.id) {
      // Nested response format (actual Wavespeed format)
      requestId = data.data.id
    } else {
      // Try other possible formats for fallback
      requestId =
        data.request_id ||
        data.id ||
        data.requestId ||
        data.prediction_id ||
        data.predictionId
    }

    if (!requestId) {
      console.error('No requestId found in response. Full data:', data)
      console.error('Available top-level keys:', Object.keys(data))
      if (data.data) {
        console.error('Available data.data keys:', Object.keys(data.data))
      }
      throw new Error(`No requestId returned from Wavespeed API. Response structure: ${JSON.stringify(Object.keys(data))}`)
    }

    console.log('Extracted requestId:', requestId)

    // Check if task completed immediately
    let taskStatus: 'pending' | 'processing' | 'completed' | 'failed' = 'pending'
    let resultUrl: string | undefined
    let taskError: string | undefined

    if (data.data) {
      taskStatus = (data.data.status as 'pending' | 'processing' | 'completed' | 'failed') || 'pending'

      // If already completed, extract the result URL
      if (taskStatus === 'completed' && data.data.outputs && data.data.outputs.length > 0) {
        resultUrl = data.data.outputs[0]
        console.log('Task completed immediately! Result URL:', resultUrl)
      }

      // If failed, extract error
      if (taskStatus === 'failed' && data.data.error) {
        taskError = data.data.error
        console.error('Task failed immediately:', taskError)
      }
    }

    return {
      requestId,
      status: taskStatus,
      resultUrl,
      error: taskError,
    }
  } catch (error) {
    console.error('Failed to submit stylization task:', error)
    throw error
  }
}

/**
 * Get the result of a stylization task
 *
 * @param requestId - Task request ID
 * @returns Result response with status and resultUrl
 */
export async function getStylizeResult(
  requestId: string
): Promise<StylizeResultResponse> {
  if (!WAVESPEED_API_KEY) {
    throw new Error('WAVESPEED_API_KEY is not configured')
  }

  console.log('Polling Wavespeed API result for requestId:', requestId)

  try {
    const response = await fetch(
      `${WAVESPEED_API_BASE}/predictions/${requestId}/result`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${WAVESPEED_API_KEY}`,
        },
      }
    )

    console.log('Wavespeed result API status:', response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Wavespeed result API error:', errorData)
      throw new Error(
        `Wavespeed API error: ${response.status} ${JSON.stringify(errorData)}`
      )
    }

    const data = await response.json()
    console.log('Wavespeed result API response:', JSON.stringify(data, null, 2))

    // Wavespeed API returns nested response: { "data": { "status": "...", "outputs": [...], ... } }
    let status: 'pending' | 'processing' | 'completed' | 'failed'
    let resultUrl: string | undefined
    let error: string | undefined

    if (data.data) {
      // Nested response format (actual Wavespeed format)
      status = (data.data.status as 'pending' | 'processing' | 'completed' | 'failed') || 'processing'
      const outputs = data.data.outputs || []
      resultUrl = Array.isArray(outputs) && outputs.length > 0 ? outputs[0] : undefined
      error = data.data.error || undefined
    } else {
      // Fallback for non-nested format
      status = (data.status as 'pending' | 'processing' | 'completed' | 'failed') || 'processing'
      const output = data.output || data.outputs || []
      resultUrl = Array.isArray(output) ? output[0] : output
      error = data.error
    }

    console.log('Parsed result - status:', status, 'resultUrl:', resultUrl)

    return {
      status,
      resultUrl,
      error,
      progress: data.progress,
    }
  } catch (error) {
    console.error('Failed to get stylization result:', error)
    throw error
  }
}

/**
 * Poll for stylization result until completed or failed
 *
 * @param requestId - Task request ID
 * @param maxAttempts - Maximum polling attempts (default: 60)
 * @param intervalMs - Polling interval in milliseconds (default: 3000)
 * @returns Final result response
 */
export async function pollStylizeResult(
  requestId: string,
  maxAttempts = 60,
  intervalMs = 3000
): Promise<StylizeResultResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getStylizeResult(requestId)

    if (result.status === 'completed' || result.status === 'failed') {
      return result
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error('Stylization timeout - exceeded maximum polling attempts')
}
