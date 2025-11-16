import { useState } from "react"
import { toast } from "sonner"
import { useCompositionStore } from "../composition-store"
import type { ConvexTimelineBlock } from "../types/timeline"

interface ExportProgress {
  stage: "loading" | "processing" | "encoding" | "complete"
  progress: number
  message: string
}

interface ExportOptions {
  quality: "720" | "1080" | "4k"
  aspectRatio: string
  videoSrc: string
  fileName?: string
  videoFormat?: string
}

const getQualitySettings = (quality: "720" | "1080" | "4k") => {
  switch (quality) {
    case "720":
      return {
        width: 1280,
        height: 720,
        bitrate: 2_500_000,
      }
    case "1080":
      return {
        width: 1920,
        height: 1080,
        bitrate: 5_000_000,
      }
    case "4k":
      return {
        width: 3840,
        height: 2160,
        bitrate: 20_000_000,
      }
  }
}

export const useVideoExportWebCodecs = () => {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    stage: "loading",
    progress: 0,
    message: "Initializing...",
  })
  const { compiler } = useCompositionStore()

  const getVideoSegments = (blocks: ConvexTimelineBlock[]) => {
    const videoBlocks = blocks
      .filter((b) => b.blockType === "video")
      .sort((a, b) => a.startMs - b.startMs)

    const segments: Array<{ start: number; end: number }> = []

    for (const block of videoBlocks) {
      const trimStart = (block.trimStartMs || 0) / 1000
      const trimEnd = (block.trimEndMs || 0) / 1000
      const blockDuration = block.durationMs / 1000

      const visibleStart = trimStart
      const visibleEnd = blockDuration - trimEnd

      if (visibleEnd > visibleStart) {
        segments.push({
          start: visibleStart,
          end: visibleEnd,
        })
      }
    }

    return segments
  }

  const exportVideo = async (options: ExportOptions) => {
    if (!compiler) {
      toast.error("No timeline data available")
      return
    }

    setIsExporting(true)

    try {
      const blocks = compiler.getBlocks()
      const qualitySettings = getQualitySettings(options.quality)
      const segments = getVideoSegments(blocks)

      if (segments.length === 0) {
        toast.error("No video segments to export")
        setIsExporting(false)
        return
      }

      setExportProgress({
        stage: "loading",
        progress: 10,
        message: "Loading video file...",
      })

      // fetch video file
      let videoBlob: Blob
      if (options.videoSrc.startsWith("blob:")) {
        const response = await fetch(options.videoSrc)
        videoBlob = await response.blob()
      } else {
        const response = await fetch(options.videoSrc)
        videoBlob = await response.blob()
      }

      // create video element
      const video = document.createElement("video")
      video.src = URL.createObjectURL(videoBlob)
      video.muted = true
      video.playsInline = true
      video.preload = "auto"

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.currentTime = 0
          resolve()
        }
        video.onerror = reject
      })

      const duration = video.duration

      // create canvas for scaling
      const canvas = document.createElement("canvas")
      canvas.width = qualitySettings.width
      canvas.height = qualitySettings.height
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) {
        throw new Error("Failed to get canvas context")
      }

      setExportProgress({
        stage: "processing",
        progress: 20,
        message: "Setting up recording...",
      })

      // setup MediaRecorder with canvas stream
      const fps = 30
      const stream = canvas.captureStream(fps)

      // try to use MP4, fallback to WebM
      let mimeType = "video/webm;codecs=vp9"
      if (MediaRecorder.isTypeSupported("video/mp4")) {
        mimeType = "video/mp4"
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9"
      } else if (MediaRecorder.isTypeSupported("video/webm")) {
        mimeType = "video/webm"
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: qualitySettings.bitrate,
      })

      const recordedChunks: BlobPart[] = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data)
        }
      }

      // start recording
      mediaRecorder.start()

      // calculate total frames for progress
      let totalFrames = 0
      for (const segment of segments) {
        totalFrames += Math.ceil((segment.end - segment.start) * fps)
      }

      let processedFrames = 0
      const frameDuration = 1 / fps

      setExportProgress({
        stage: "encoding",
        progress: 30,
        message: "Processing video frames...",
      })

      // process each segment
      for (const segment of segments) {
        const segmentStart = segment.start
        const segmentEnd = segment.end
        const segmentDuration = segmentEnd - segmentStart

        // seek to segment start
        video.currentTime = segmentStart
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked)
            resolve()
          }
          video.addEventListener("seeked", onSeeked)
        })

        // process frames in this segment
        let currentTime = segmentStart
        const endTime = Math.min(segmentStart + segmentDuration, duration)

        while (currentTime < endTime) {
          // seek to current frame time
          video.currentTime = currentTime

          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked)
              resolve()
            }
            video.addEventListener("seeked", onSeeked)
          })

          // draw scaled frame to canvas (this automatically goes to MediaRecorder stream)
          ctx.drawImage(video, 0, 0, qualitySettings.width, qualitySettings.height)

          // wait for next frame
          await new Promise((resolve) => setTimeout(resolve, 1000 / fps))

          processedFrames++
          currentTime += frameDuration

          // update progress
          const progress = 30 + Math.round((processedFrames / totalFrames) * 60)
          setExportProgress({
            stage: "encoding",
            progress: Math.min(90, progress),
            message: `Processing frame ${processedFrames}/${totalFrames}...`,
          })
        }
      }

      // stop recording
      mediaRecorder.stop()

      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve()
      })

      // cleanup
      URL.revokeObjectURL(video.src)
      video.remove()
      stream.getTracks().forEach((track) => track.stop())

      setExportProgress({
        stage: "complete",
        progress: 95,
        message: "Finalizing video...",
      })

      // create download
      const blob = new Blob(recordedChunks, { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const extension = mimeType.includes("mp4") ? "mp4" : "webm"
      const fileName = options.fileName
        ? options.fileName.replace(/\.[^/.]+$/, `.${extension}`)
        : `export-${options.quality}p-${Date.now()}.${extension}`
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportProgress({
        stage: "complete",
        progress: 100,
        message: "Export complete!",
      })

      toast.success("Video exported successfully!")

      setTimeout(() => {
        setIsExporting(false)
      }, 1000)
    } catch (error) {
      console.error("Export failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      toast.error(`Export failed: ${errorMessage}`)
      setIsExporting(false)
    }
  }

  const cancelExport = () => {
    setIsExporting(false)
    toast.info("Export cancelled")
  }

  return {
    exportVideo,
    cancelExport,
    isExporting,
    exportProgress,
  }
}
