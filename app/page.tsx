'use client'

import { useState } from 'react'
import { UploadButton } from '@/components/upload/upload-button'
import { UploadProgress } from '@/components/upload/upload-progress'
import { CoverPreview } from '@/components/preview/cover-preview'
import { ResultActions } from '@/components/result/result-actions'
import { FirstFramePreview } from '@/components/preview/first-frame-preview'
import { useUploadStore } from '@/lib/store'
import { extractFirstFrame, isHeicFile, type VideoMetadata } from '@/lib/video-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  const { progress, status, videoId, errorMessage, setProgress, setStatus, setVideoId, setError, reset } = useUploadStore()
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null)
  const [isRevealing, setIsRevealing] = useState(false)

  // Local frame extraction state
  const [extractedFrame, setExtractedFrame] = useState<string | null>(null)
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)

  // Stylization state
  const [isStylizing, setIsStylizing] = useState(false)
  const [stylizeRequestId, setStylizeRequestId] = useState<string | null>(null)
  const [stylizeProgress, setStylizeProgress] = useState(0)
  const [doodleCoverUrl, setDoodleCoverUrl] = useState<string | null>(null)

  const handleFileSelect = async (file: File) => {
    try {
      reset()
      setExtractedFrame(null)
      setVideoMetadata(null)
      setSelectedFile(file)

      // HEIC files: skip client-side extraction, go straight to server processing
      if (isHeicFile(file)) {
        console.log('HEIC file detected - server-side processing required')
        await handleUpload(file)
        return
      }

      // Standard video files: extract frame locally first
      setIsExtracting(true)

      // Extract first frame locally - show immediately in left preview
      const result = await extractFirstFrame(file)
      setExtractedFrame(result.frameDataUrl)
      setVideoMetadata(result.metadata)
      setIsExtracting(false)

      // Auto-proceed to upload and AI processing for right preview
      await handleUpload(file)
    } catch (error) {
      console.error('File select error:', error)
      setError(error instanceof Error ? error.message : 'Failed to process file')
      setIsExtracting(false)
    }
  }

  const handleUpload = async (file: File) => {
    try {
      setStatus('uploading')
      // Keep extractedFrame visible during upload

      // Create form data
      const formData = new FormData()
      formData.append('video', file)

      // Upload file
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        throw new Error(error.error || 'Upload failed')
      }

      const uploadData = await uploadResponse.json()
      setVideoId(uploadData.videoId)
      setProgress(30)

      // Trigger processing
      setStatus('processing')
      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: uploadData.videoId }),
      })

      if (!generateResponse.ok) {
        throw new Error('Failed to start processing')
      }

      // Connect to SSE for status updates
      const eventSource = new EventSource(`/api/status/${uploadData.videoId}`)

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.error) {
          setError(data.error)
          eventSource.close()
          return
        }

        setProgress(data.progress)
        setStatus(data.status)

        if (data.coverUrl) {
          // Trigger progressive reveal animation
          setIsRevealing(true)
          setTimeout(() => {
            setCoverUrl(data.coverUrl)
            setProcessedVideoUrl(data.processedVideoUrl || null)
            setIsRevealing(false)
          }, 2000) // 2 second blur-to-clear transition
        }

        if (data.status === 'completed' || data.status === 'failed') {
          eventSource.close()
        }
      }

      eventSource.onerror = () => {
        setError('Connection lost')
        eventSource.close()
      }

    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
    }
  }

  const handleStylize = async () => {
    if (!extractedFrame) {
      alert('No frame extracted yet')
      return
    }

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

      const { requestId } = await response.json()
      setStylizeRequestId(requestId)

      // Poll for result
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
          alert('Failed to get stylization result')
        }
      }, 3000) // Poll every 3 seconds

      // Timeout after 3 minutes
      setTimeout(() => {
        clearInterval(pollInterval)
        if (isStylizing) {
          setIsStylizing(false)
          alert('Stylization timeout')
        }
      }, 180000)

    } catch (error) {
      console.error('Stylize error:', error)
      setIsStylizing(false)
      alert(error instanceof Error ? error.message : 'Stylization failed')
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
              Transform your live videos with AI-generated <span className="font-semibold text-purple-600">doodle-style</span> cover frames.
              Get eye-catching videos ready to post! 🎨📱
            </p>
            <p className="text-sm text-purple-600 font-medium">
              ✓ iOS Live Photos (HEIC) Supported
            </p>
          </div>

          {/* Upload Section */}
          {!extractedFrame && !isExtracting && status === 'idle' && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Your Video</CardTitle>
                <CardDescription>
                  Supported formats: MP4, MOV, WebM, HEIC (iOS Live Photos) - max 500MB. Cover will match your video's aspect ratio automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-8">
                <UploadButton
                  onFileSelect={handleFileSelect}
                  disabled={false}
                />
              </CardContent>
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

          {/* HEIC Processing State */}
          {!extractedFrame && selectedFile && isHeicFile(selectedFile) && (status === 'uploading' || status === 'processing') && (
            <Card className="border-2 border-purple-300">
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <div className="text-6xl animate-bounce">📱</div>
                  <p className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Processing iOS Live Photo (HEIC)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Server is extracting frame and converting to doodle style...
                  </p>
                  <UploadProgress
                    progress={progress}
                    status={status}
                    errorMessage={errorMessage}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dual Preview Section - First Frame (Left) & Doodle Cover (Right) */}
          {extractedFrame && videoMetadata && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                封面预览
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
                      Doodle风格封面
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
                          重新转绘
                        </button>
                      </>
                    ) : isStylizing ? (
                      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
                        <div className="text-5xl animate-bounce">✨</div>
                        <p className="text-lg font-semibold">AI转绘中...</p>
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
                          Wavespeed nano-banana-pro 处理中...
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
                        <div className="text-4xl">⏳</div>
                        <p className="text-muted-foreground">点击下方按钮开始转绘</p>
                        <button
                          onClick={handleStylize}
                          className="py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
                        >
                          🎨 开始Doodle转绘
                        </button>
                        <p className="text-xs text-muted-foreground">
                          使用 nano-banana-pro 模型
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}


          {/* Preview Section */}
          {coverUrl && status === 'completed' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                ✨ Your Doodle Live Video is Ready!
              </h2>

              {/* Video Player with Cover Preview */}
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  {processedVideoUrl ? (
                    <div className="relative aspect-video max-w-2xl mx-auto bg-black">
                      <video
                        src={processedVideoUrl}
                        controls
                        poster={coverUrl}
                        className="w-full h-full"
                        playsInline
                      >
                        Your browser does not support the video tag.
                      </video>
                      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                        📱 Live Video with Doodle Cover
                      </div>
                    </div>
                  ) : (
                    <CoverPreview src={coverUrl} />
                  )}
                </CardContent>
              </Card>

              <ResultActions
                coverUrl={coverUrl}
                videoUrl={processedVideoUrl}
                onReset={() => {
                  reset()
                  setCoverUrl(null)
                  setProcessedVideoUrl(null)
                }}
              />
            </div>
          )}

          {/* Info Section */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. 📱 Upload your live video (MP4, MOV, WebM, or HEIC from iOS)</p>
              <p>2. 🎨 AI auto-detects video dimensions and extracts first frame</p>
              <p>3. ✨ Creates doodle-style cover matching your video's aspect ratio</p>
              <p>4. 🎬 Cover is embedded as opening frame in your video</p>
              <p>5. 📥 Download processed video and share on 小红书/TikTok</p>
              <p className="text-xs italic">✓ iOS Live Photos (HEIC) fully supported!</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
