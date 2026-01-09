-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "coverUrl" TEXT,
    "processedUrl" TEXT,
    "aspectRatio" TEXT NOT NULL DEFAULT 'auto',
    "status" TEXT NOT NULL,
    "processingTimeMs" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Video_status_idx" ON "Video"("status");

-- CreateIndex
CREATE INDEX "Video_createdAt_idx" ON "Video"("createdAt");
