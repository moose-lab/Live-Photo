import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('video') as File

    // Validate file
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 500MB' },
        { status: 400 }
      )
    }

    // Check file type
    // iOS Live Photos: HEIC (image/heic, image/heif), MOV (video/quicktime)
    // Standard videos: MP4, WebM
    const allowedTypes = [
      'video/mp4',
      'video/quicktime',      // MOV (iOS Live Photos video component)
      'video/webm',
      'image/heic',           // HEIC (iOS Live Photos - primary format)
      'image/heif',           // HEIF (variant)
      'application/octet-stream', // Sometimes HEIC files are sent as octet-stream
    ]

    // Check extension as fallback for HEIC files
    const fileName = file.name.toLowerCase()
    const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif')

    if (!allowedTypes.includes(file.type) && !isHeic) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: MP4, MOV, WebM, HEIC (iOS Live Photos)' },
        { status: 400 }
      )
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    // Create database record
    // Note: aspectRatio will be auto-detected during processing from video metadata
    const video = await prisma.video.create({
      data: {
        originalUrl: blob.url,
        aspectRatio: 'auto', // Will be detected from video during processing
        status: 'uploaded',
      },
    })

    return NextResponse.json({
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      videoId: video.id,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    )
  }
}
