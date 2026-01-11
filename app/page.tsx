'use client'

import { useState } from 'react'
import { UploadButton } from '@/components/upload/upload-button'
import { FirstFramePreview } from '@/components/preview/first-frame-preview'
import { extractFirstFrame, isHeicFile, composeVideoWithDoodleCover, getVideoDuration, getBestSupportedVideoCodec, type VideoMetadata, type ComposedVideoResult } from '@/lib/video-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { canMakeApiCall, incrementApiCallCount, getRemainingCalls, getDailyLimit } from '@/lib/api-limits'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default function Home() {
  // Local frame extraction state
  const [extractedFrame, setExtractedFrame] = useState<string | null>(null)
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)

  // Stylization state
  const [isStylizing, setIsStylizing] = useState(false)
  const [stylizeProgress, setStylizeProgress] = useState(0)
  const [doodleCoverUrl, setDoodleCoverUrl] = useState<string | null>(null)

  // Video composition state
  const [isComposing, setIsComposing] = useState(false)
  const [composeProgress, setComposeProgress] = useState(0)
  const [composedVideo, setComposedVideo] = useState<{ url: string; result: ComposedVideoResult } | null>(null)

  const handleFileSelect = async (file: File) => {
    try {
      // Reset state
      setExtractedFrame(null)
      setVideoMetadata(null)
      setDoodleCoverUrl(null)
      setExtractError(null)
      setSelectedFile(file)

      // HEIC files: Not supported for client-side extraction
      if (isHeicFile(file)) {
        setExtractError('HEIC/HEIF files are not supported. Please convert to MP4 or MOV format first.')
        return
      }

      // Check video duration limit (5 seconds)
      setIsExtracting(true)
      const duration = await getVideoDuration(file)

      if (duration > 5) {
        setExtractError(`Video too long! Duration: ${duration.toFixed(1)}s • Maximum: 5s. Please use a shorter clip for best results.`)
        setIsExtracting(false)
        setSelectedFile(null)
        return
      }

      // Extract first frame locally - show immediately in left preview
      const result = await extractFirstFrame(file)
      setExtractedFrame(result.frameDataUrl)
      setVideoMetadata(result.metadata)
      setIsExtracting(false)
    } catch (error) {
      console.error('File select error:', error)
      setExtractError(error instanceof Error ? error.message : 'Failed to extract frame from video')
      setIsExtracting(false)
    }
  }

  const handleReset = () => {
    setExtractedFrame(null)
    setVideoMetadata(null)
    setDoodleCoverUrl(null)
    setExtractError(null)
    setSelectedFile(null)
    setIsStylizing(false)
    setStylizeProgress(0)
    setIsComposing(false)
    setComposeProgress(0)
    if (composedVideo) {
      URL.revokeObjectURL(composedVideo.url)
    }
    setComposedVideo(null)
  }

  const handleComposeVideo = async () => {
    if (!selectedFile || !doodleCoverUrl) {
      alert('Please create a doodle cover first before composing the video!')
      return
    }

    try {
      setIsComposing(true)
      setComposeProgress(0)

      // Compose video with doodle cover
      const result = await composeVideoWithDoodleCover(
        selectedFile,
        doodleCoverUrl,
        1.5, // 1.5 seconds cover duration
        (progress) => {
          setComposeProgress(progress)
        }
      )

      // Create download URL
      const url = URL.createObjectURL(result.blob)
      setComposedVideo({ url, result })
      setIsComposing(false)
    } catch (error) {
      console.error('Video composition error:', error)
      setIsComposing(false)
      alert(error instanceof Error ? error.message : 'Oops! Video creation failed. Please try again.')
    }
  }

  const handleStylize = async () => {
    if (!extractedFrame) {
      alert('Please upload a video first!')
      return
    }

    // Check API call limit
    if (!canMakeApiCall()) {
      alert(`Daily limit reached! 🎨\n\nYou've used all ${getDailyLimit()} free creations for today.\n\nCome back tomorrow for more doodle covers!`)
      return
    }

    const remaining = getRemainingCalls()
    console.log(`API calls remaining today: ${remaining}/${getDailyLimit()}`)

    try {
      setIsStylizing(true)
      setStylizeProgress(0)
      setDoodleCoverUrl(null)

      // Submit stylization task
      const response = await fetch('/api/stylize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameDataUrl: extractedFrame,
          fileName: selectedFile?.name || 'frame.jpg',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit stylization task')
      }

      const data = await response.json()
      const { requestId, status, resultUrl } = data

      // Increment API call counter (task submitted successfully)
      incrementApiCallCount()
      console.log(`API call logged. Remaining: ${getRemainingCalls()}/${getDailyLimit()}`)

      // Check if task completed immediately
      if (status === 'completed' && resultUrl) {
        console.log('Task completed immediately!')
        setDoodleCoverUrl(resultUrl)
        setStylizeProgress(100)
        setIsStylizing(false)
        return
      }

      // Task is pending/processing, start polling
      const pollInterval = setInterval(async () => {
        try {
          const resultResponse = await fetch(`/api/stylize/${requestId}`)
          const result = await resultResponse.json()

          if (result.progress) {
            setStylizeProgress(result.progress)
          }

          if (result.status === 'completed' && result.resultUrl) {
            setDoodleCoverUrl(result.resultUrl)
            setIsStylizing(false)
            clearInterval(pollInterval)
          } else if (result.status === 'failed') {
            throw new Error(result.error || 'Stylization failed')
          }
        } catch (pollError) {
          console.error('Poll error:', pollError)
          clearInterval(pollInterval)
          setIsStylizing(false)
          alert('Oops! Something went wrong. Please try creating your cover again.')
        }
      }, 3000) // Poll every 3 seconds

      // Timeout after 3 minutes
      setTimeout(() => {
        clearInterval(pollInterval)
        if (isStylizing) {
          setIsStylizing(false)
          alert('Taking longer than expected! Please try again.')
        }
      }, 180000)

    } catch (error) {
      console.error('Stylize error:', error)
      setIsStylizing(false)
      alert(error instanceof Error ? error.message : 'Oops! Creation failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950">
      {/* Floating doodle elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-10 left-10 text-6xl animate-float">✨</div>
        <div className="absolute top-32 right-20 text-5xl animate-float" style={{ animationDelay: '1s' }}>🎨</div>
        <div className="absolute bottom-20 left-1/4 text-4xl animate-float" style={{ animationDelay: '2s' }}>💫</div>
        <div className="absolute bottom-40 right-1/3 text-5xl animate-float" style={{ animationDelay: '1.5s' }}>🌈</div>
      </div>

      <main className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent animate-pulse">
              ✨ Live-Photo
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
              Turn your videos into <span className="font-semibold text-purple-600">stunning doodle covers</span> in seconds.
              Perfect for social media! 🎨📱
            </p>
            <p className="text-sm text-purple-600 font-medium">
              ✓ AI-Powered • Free • Instant Results
            </p>
          </div>

          {/* Upload Section */}
          {!extractedFrame && !isExtracting && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Your Video</CardTitle>
                <CardDescription>
                  Supported formats: MP4, MOV, WebM - max 500MB. AI will match your video's aspect ratio automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-8">
                <UploadButton
                  onFileSelect={handleFileSelect}
                  disabled={false}
                />
              </CardContent>
              {extractError && (
                <CardContent>
                  <div className="text-center text-red-600 text-sm">
                    {extractError}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Extracting Frame */}
          {isExtracting && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <div className="text-5xl animate-spin">🎨</div>
                  <p className="text-lg font-semibold">Extracting first frame...</p>
                  <p className="text-sm text-muted-foreground">This will only take a moment</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dual Preview Section - First Frame (Left) & Doodle Cover (Right) */}
          {extractedFrame && videoMetadata && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Your Cover Preview
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: First Frame Preview */}
                <FirstFramePreview
                  frameDataUrl={extractedFrame}
                  metadata={videoMetadata}
                  fileName={selectedFile?.name}
                />

                {/* Right: Doodle Cover Preview or Stylization State */}
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-2xl">🎨</span>
                      Doodle Cover
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {doodleCoverUrl ? (
                      <>
                        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                          <img
                            src={doodleCoverUrl}
                            alt="Doodle cover"
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                            AI Generated
                          </div>
                        </div>
                        <button
                          onClick={handleStylize}
                          disabled={isStylizing}
                          className="w-full py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold disabled:opacity-50"
                        >
                          Generate New Style
                        </button>
                      </>
                    ) : isStylizing ? (
                      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
                        <div className="text-5xl animate-bounce">✨</div>
                        <p className="text-lg font-semibold">Creating Your Doodle Cover...</p>
                        {stylizeProgress > 0 && (
                          <div className="w-full max-w-xs">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                                style={{ width: `${stylizeProgress}%` }}
                              />
                            </div>
                            <p className="text-sm text-muted-foreground text-center mt-2">
                              {stylizeProgress}%
                            </p>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                          AI magic in progress...
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
                        <div className="text-4xl">⏳</div>
                        <p className="text-muted-foreground">Ready to transform your video?</p>
                        <button
                          onClick={handleStylize}
                          className="py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
                        >
                          🎨 Create Doodle Cover
                        </button>
                        <p className="text-xs text-muted-foreground">
                          Powered by AI • Takes ~15 seconds
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}


          {/* Action Buttons */}
          {doodleCoverUrl && !isComposing && !composedVideo && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-4">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="lg"
                >
                  Upload Another Video
                </Button>
                <Button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = doodleCoverUrl
                    link.download = 'doodle-cover.png'
                    link.click()
                  }}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  Download Doodle Cover
                </Button>
              </div>
              <Button
                onClick={handleComposeVideo}
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                🎬 Create Video with Cover
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Combine your doodle cover with the original video for a stunning reveal effect
              </p>
            </div>
          )}

          {/* Video Composition Progress */}
          {isComposing && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <div className="text-6xl animate-bounce">🎬</div>
                  <p className="text-xl font-semibold">Creating Your Video...</p>
                  <div className="w-full max-w-md mx-auto space-y-2">
                    <Progress value={composeProgress} />
                    <p className="text-sm text-muted-foreground">
                      {composeProgress < 30 && 'Loading resources...'}
                      {composeProgress >= 30 && composeProgress < 50 && 'Adding doodle cover...'}
                      {composeProgress >= 50 && composeProgress < 60 && 'Creating transition...'}
                      {composeProgress >= 60 && 'Composing video...'}
                      {` ${Math.round(composeProgress)}%`}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This may take a few minutes depending on your video length
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Composed Video Preview */}
          {composedVideo && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                ✨ Your Video is Ready!
              </h2>

              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative aspect-video max-w-2xl mx-auto bg-black">
                    <video
                      src={composedVideo.url}
                      controls
                      className="w-full h-full"
                      playsInline
                    >
                      Your browser does not support the video tag.
                    </video>
                    <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                      🎨 Doodle Cover → 📱 Live Video
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center gap-4">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="lg"
                >
                  Create Another
                </Button>
                <Button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = composedVideo.url
                    link.download = `artistic-video-${Date.now()}.${composedVideo.result.extension}`
                    link.click()
                  }}
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  📥 Download Video
                </Button>
              </div>

              <Card className="border-dashed border-orange-300">
                <CardContent className="py-4">
                  <p className="text-sm text-center text-muted-foreground">
                    💡 Your video is ready to share! Format: {composedVideo.result.extension.toUpperCase()}
                    {composedVideo.result.extension === 'webm' && ' • Use a converter like CloudConvert if you need MP4 format.'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Usage Flow & Limitations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Card: Usage Flow */}
            <Card className="border-2 border-purple-200 dark:border-purple-800">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Upload Your Video</p>
                    <p className="text-sm text-muted-foreground">Supports MP4, MOV, and WebM formats</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Preview Your Frame</p>
                    <p className="text-sm text-muted-foreground">Instantly see the first frame</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center text-pink-600 font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Transform with AI</p>
                    <p className="text-sm text-muted-foreground">Get your doodle cover in ~15 seconds</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center text-pink-600 font-bold text-sm">
                    4
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Download or Enhance</p>
                    <p className="text-sm text-muted-foreground">Save your cover or create a combined video</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-orange-600 font-bold text-sm">
                    5
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Create Full Video (Optional)</p>
                    <p className="text-sm text-muted-foreground">Add stunning reveal transition effect</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-orange-600 font-bold text-sm">
                    6
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Share & Post</p>
                    <p className="text-sm text-muted-foreground">Ready for TikTok, Instagram, YouTube</p>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Powered by advanced AI technology
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    100% free • Secure & private processing
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Right Card: Quick Tips */}
            <Card className="border-2 border-orange-200 dark:border-orange-800">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Quick Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-orange-700 dark:text-orange-400">Best Results</p>
                      <p className="text-sm text-muted-foreground">
                        Use videos up to <span className="font-bold text-orange-600">5 seconds</span> for optimal performance
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Short clips work best! Perfect for social media highlights.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-orange-700 dark:text-orange-400">Daily Creations</p>
                      <p className="text-sm text-muted-foreground">
                        Create up to <span className="font-bold text-orange-600">{getDailyLimit()} doodle covers</span> per day
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Remaining today: <span className="font-bold text-green-600">{getRemainingCalls()}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Resets daily at midnight • Completely free!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-orange-700 dark:text-orange-400">Video Format</p>
                      <p className="text-sm text-muted-foreground">
                        Downloads in <span className="font-bold">{typeof window !== 'undefined' ? getBestSupportedVideoCodec().extension.toUpperCase() : 'WebM'}</span> format (works everywhere!)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Need MP4? Use a free converter like CloudConvert.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-orange-700 dark:text-orange-400">Processing Time</p>
                      <p className="text-sm text-muted-foreground">
                        Cover creation: ~15 seconds ⚡
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Video composition: Varies by length
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Grab a coffee while we work our magic! ☕
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
