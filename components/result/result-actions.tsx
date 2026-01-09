'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Copy, QrCode, RotateCcw, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ResultActionsProps {
  coverUrl: string  // Doodle cover image (for thumbnail/preview)
  videoUrl?: string | null  // Processed live video with doodle cover embedded
  onReset?: () => void
}

export function ResultActions({ coverUrl, videoUrl, onReset }: ResultActionsProps) {
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  const handleDownload = async () => {
    try {
      if (videoUrl) {
        // Download processed video (primary output)
        const response = await fetch(videoUrl)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `live-photo-${Date.now()}.mp4`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        // Fallback: Download cover image only
        const response = await fetch(coverUrl)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `live-photo-cover-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download. Please try again.')
    }
  }

  const handleCopy = async () => {
    try {
      // Convert image URL to blob and copy to clipboard
      const response = await fetch(coverUrl)
      const blob = await response.blob()

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ])

      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Copy error:', error)

      // Fallback: copy URL as text
      try {
        await navigator.clipboard.writeText(coverUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        alert('Failed to copy. Please try again.')
      }
    }
  }

  const handleGenerateQR = () => {
    // Generate QR code using a free QR code API
    const appUrl = window.location.origin
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(appUrl)}`
    setQrCodeUrl(qrUrl)
    setShowQR(true)
  }

  const downloadQRCode = () => {
    const a = document.createElement('a')
    a.href = qrCodeUrl
    a.download = `live-photo-qr-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button
          onClick={handleDownload}
          size="lg"
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
        >
          <Download className="mr-2 h-5 w-5" />
          {videoUrl ? 'Download Video' : 'Download Cover'}
        </Button>

        <Button onClick={handleCopy} size="lg" variant="outline" className="border-purple-300">
          {copied ? (
            <>
              <Check className="mr-2 h-5 w-5 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-5 w-5" />
              Copy Image
            </>
          )}
        </Button>

        <Button onClick={handleGenerateQR} size="lg" variant="outline" className="border-pink-300">
          <QrCode className="mr-2 h-5 w-5" />
          Share QR Code
        </Button>

        {onReset && (
          <Button onClick={onReset} size="lg" variant="ghost">
            <RotateCcw className="mr-2 h-5 w-5" />
            Create Another
          </Button>
        )}
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Live-Photo</DialogTitle>
            <DialogDescription>
              Scan this QR code to try Live-Photo yourself!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeUrl && (
              <>
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-64 h-64 border-4 border-purple-200 rounded-lg"
                />
                <Button onClick={downloadQRCode} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download QR Code
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
