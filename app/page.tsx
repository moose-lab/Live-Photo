'use client'

import { useState } from 'react'
import { UploadButton } from '@/components/upload/upload-button'
import { FirstFramePreview } from '@/components/preview/first-frame-preview'
import { extractFirstFrame, isHeicFile, composeVideoWithDoodleCover, type VideoMetadata } from '@/lib/video-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

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
  const [composedVideoUrl, setComposedVideoUrl] = useState<string | null>(null)

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

      // Standard video files: extract frame locally
      setIsExtracting(true)

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
    if (composedVideoUrl) {
      URL.revokeObjectURL(composedVideoUrl)
    }
    setComposedVideoUrl(null)
  }

  const handleComposeVideo = async () => {
    if (!selectedFile || !doodleCoverUrl) {
      alert('需要原始视频和涂鸦封面')
      return
    }

    try {
      setIsComposing(true)
      setComposeProgress(0)

      // Compose video with doodle cover
      const composedBlob = await composeVideoWithDoodleCover(
        selectedFile,
        doodleCoverUrl,
        1.5, // 1.5 seconds cover duration
        (progress) => {
          setComposeProgress(progress)
        }
      )

      // Create download URL
      const url = URL.createObjectURL(composedBlob)
      setComposedVideoUrl(url)
      setIsComposing(false)
    } catch (error) {
      console.error('Video composition error:', error)
      setIsComposing(false)
      alert(error instanceof Error ? error.message : '视频合成失败')
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

      const data = await response.json()
      const { requestId, status, resultUrl } = data

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
              Transform your video frames with AI-generated <span className="font-semibold text-purple-600">doodle-style</span> covers.
              Get eye-catching cover art ready to post! 🎨📱
            </p>
            <p className="text-sm text-purple-600 font-medium">
              ✓ Powered by nano-banana-pro AI
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


          {/* Action Buttons */}
          {doodleCoverUrl && !isComposing && !composedVideoUrl && (
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
                  Download Cover
                </Button>
              </div>
              <Button
                onClick={handleComposeVideo}
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                🎬 合成视频（封面+实况）
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                将涂鸦封面合成到视频开头，创建封面到实况的过渡效果
              </p>
            </div>
          )}

          {/* Video Composition Progress */}
          {isComposing && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <div className="text-6xl animate-bounce">🎬</div>
                  <p className="text-xl font-semibold">正在合成视频...</p>
                  <div className="w-full max-w-md mx-auto space-y-2">
                    <Progress value={composeProgress} />
                    <p className="text-sm text-muted-foreground">
                      {composeProgress < 30 && '加载资源...'}
                      {composeProgress >= 30 && composeProgress < 50 && '添加涂鸦封面...'}
                      {composeProgress >= 50 && composeProgress < 60 && '创建过渡效果...'}
                      {composeProgress >= 60 && '合成视频中...'}
                      {` ${Math.round(composeProgress)}%`}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    这可能需要几分钟，取决于视频长度和您的设备性能
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Composed Video Preview */}
          {composedVideoUrl && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                ✨ 合成视频已完成！
              </h2>

              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative aspect-video max-w-2xl mx-auto bg-black">
                    <video
                      src={composedVideoUrl}
                      controls
                      className="w-full h-full"
                      playsInline
                    >
                      Your browser does not support the video tag.
                    </video>
                    <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                      🎨 涂鸦封面 → 📱 实况视频
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
                  重新开始
                </Button>
                <Button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = composedVideoUrl
                    link.download = `doodle-live-video-${Date.now()}.webm`
                    link.click()
                  }}
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  📥 下载合成视频
                </Button>
              </div>

              <Card className="border-dashed border-orange-300">
                <CardContent className="py-4">
                  <p className="text-sm text-center text-muted-foreground">
                    💡 提示：视频格式为 WebM。如需其他格式，可使用视频转换工具（如 CloudConvert）转换为 MP4。
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Info Section */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. 📱 Upload your video (MP4, MOV, WebM - max 500MB)</p>
              <p>2. 🎨 Browser extracts first frame locally (instant preview)</p>
              <p>3. ✨ Click "开始Doodle转绘" to stylize with nano-banana-pro AI</p>
              <p>4. 📥 Download doodle-style cover OR 🎬 compose video</p>
              <p>5. 🎥 Composed video starts with doodle cover → transitions to live footage</p>
              <p>6. 📱 Share on 小红书/TikTok/Instagram with eye-catching opening</p>
              <p className="text-xs italic mt-2">✓ Powered by Wavespeed AI nano-banana-pro model</p>
              <p className="text-xs italic">✓ Video composition runs locally in your browser (free & private)</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
