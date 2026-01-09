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

  try {
    const response = await fetch(
      `${WAVESPEED_API_BASE}/google/nano-banana-pro/edit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WAVESPEED_API_KEY}`,
        },
        body: JSON.stringify({
          enable_base64_output: false,
          enable_sync_mode: false,
          images: [imageUrl],
          output_format: 'png',
          prompt: DOODLE_PROMPT,
          resolution,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Wavespeed API error: ${response.status} ${JSON.stringify(errorData)}`
      )
    }

    const data = await response.json()

    // Extract requestId from response
    // API typically returns: { request_id: "xxx" } or { id: "xxx" }
    const requestId = data.request_id || data.id || data.requestId

    if (!requestId) {
      throw new Error('No requestId returned from Wavespeed API')
    }

    return {
      requestId,
      status: 'pending',
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Wavespeed API error: ${response.status} ${JSON.stringify(errorData)}`
      )
    }

    const data = await response.json()

    // Parse response based on Wavespeed API structure
    // Typically: { status: "completed", output: ["url1"], ... }
    const status = data.status || 'processing'
    const output = data.output || data.outputs || []
    const resultUrl = Array.isArray(output) ? output[0] : output
    const error = data.error

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
