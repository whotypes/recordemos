import { useState, useRef } from "react"
import { toast } from "sonner"
import { useCompositionStore } from "../composition-store"
import type { ConvexTimelineBlock } from "../types/timeline"

interface ExportProgress {
  stage: "loading" | "capturing" | "encoding" | "complete"
  progress: number
  message: string
}

interface ExportOptions {
  quality: "720" | "1080" | "4k"
  aspectRatio: string
  videoSrc: string
  fileName?: string
  videoFormat?: string
  // reference to the preview canvas container element
  previewElement?: HTMLElement | null
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

export const useVideoExportCanvas = () => {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    stage: "loading",
    progress: 0,
    message: "Initializing...",
  })
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
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

    if (!options.previewElement) {
      toast.error("Preview element not found. Please try again.")
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
        message: "Preparing export...",
      })

      // use html2canvas or similar to capture the preview element
      // for now, we'll use MediaStream capture if available

      // try to get a stream from the preview element
      let stream: MediaStream | null = null

      // check if we can use captureStream on video element
      const videoElement = options.previewElement.querySelector("video")
      if (videoElement && "captureStream" in videoElement) {
        stream = (videoElement as HTMLVideoElement & { captureStream(): MediaStream }).captureStream()
      }

      if (!stream) {
        toast.error("Unable to capture preview. This feature requires a modern browser.")
        setIsExporting(false)
        return
      }

      setExportProgress({
        stage: "capturing",
        progress: 20,
        message: "Capturing preview...",
      })

      // setup MediaRecorder
      let mimeType = "video/webm;codecs=vp9"
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9"
      } else if (MediaRecorder.isTypeSupported("video/webm")) {
        mimeType = "video/webm"
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: qualitySettings.bitrate,
      })

      mediaRecorderRef.current = mediaRecorder

      const recordedChunks: BlobPart[] = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data)
        }
      }

      // calculate total duration
      let totalDuration = 0
      for (const segment of segments) {
        totalDuration += segment.end - segment.start
      }

      setExportProgress({
        stage: "encoding",
        progress: 30,
        message: "Recording video...",
      })

      // start recording
      mediaRecorder.start(100) // capture in 100ms chunks

      // simulate progress during recording
      const startTime = Date.now()
      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000
        const progress = Math.min(90, 30 + (elapsed / totalDuration) * 60)
        setExportProgress({
          stage: "encoding",
          progress: Math.round(progress),
          message: `Recording... ${Math.round(elapsed)}s / ${Math.round(totalDuration)}s`,
        })
      }, 500)

      // wait for the duration to complete
      await new Promise((resolve) => setTimeout(resolve, totalDuration * 1000))

      clearInterval(progressInterval)

      // stop recording
      mediaRecorder.stop()

      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve()
      })

      // cleanup
      stream.getTracks().forEach((track) => track.stop())
      mediaRecorderRef.current = null

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
      const extension = "webm"
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
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
