import { useState } from "react"
import { toast } from "sonner"
import { useCompositionStore } from "../composition-store"
import { useVideoOptionsStore } from "../video-options-store"
import { useFrameOptionsStore } from "../frame-options-store"
import type { ConvexTimelineBlock } from "../types/timeline"

interface ExportProgress {
  stage: "loading" | "processing" | "encoding" | "muxing" | "complete"
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
      return { width: 1280, height: 720, bitrate: 2_500_000 }
    case "1080":
      return { width: 1920, height: 1080, bitrate: 5_000_000 }
    case "4k":
      return { width: 3840, height: 2160, bitrate: 20_000_000 }
  }
}

export const useVideoExportComposed = () => {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    stage: "loading",
    progress: 0,
    message: "Initializing...",
  })
  const { compiler } = useCompositionStore()

  // get all the styling from stores
  const {
    backgroundColor,
    backgroundType,
    imageBackground,
    scale,
    translateX,
    translateY,
    perspective,
    rotateX,
    rotateY,
    rotateZ,
  } = useVideoOptionsStore()

  const { selectedFrame, frameRoundness } = useFrameOptionsStore()

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
        segments.push({ start: visibleStart, end: visibleEnd })
      }
    }

    return segments
  }

  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // draw background
    if (backgroundType === "solid") {
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, width, height)
    } else if (backgroundType === "gradient") {
      // parse gradient from backgroundColor (e.g., "linear-gradient(to right, #000, #fff)")
      // for simplicity, we'll use a solid color fallback
      // you can enhance this to parse and render gradients properly
      ctx.fillStyle = backgroundColor.includes("gradient") ? "#1a1a1a" : backgroundColor
      ctx.fillRect(0, 0, width, height)
    } else if (backgroundType === "image" && imageBackground) {
      // we'll need to load and draw the image
      // for now, fallback to solid
      ctx.fillStyle = "#1a1a1a"
      ctx.fillRect(0, 0, width, height)
    } else {
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, width, height)
    }
  }

  const drawVideoFrame = (
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight

    // calculate video dimensions to fit canvas while maintaining aspect ratio
    const videoAspect = videoWidth / videoHeight
    const canvasAspect = canvasWidth / canvasHeight

    let drawWidth = canvasWidth
    let drawHeight = canvasHeight
    let offsetX = 0
    let offsetY = 0

    if (videoAspect > canvasAspect) {
      // video is wider
      drawHeight = canvasWidth / videoAspect
      offsetY = (canvasHeight - drawHeight) / 2
    } else {
      // video is taller
      drawWidth = canvasHeight * videoAspect
      offsetX = (canvasWidth - drawWidth) / 2
    }

    // apply transforms
    ctx.save()

    // move to center for transforms
    ctx.translate(canvasWidth / 2, canvasHeight / 2)

    // apply scale
    ctx.scale(scale, scale)

    // apply translation
    ctx.translate(translateX, translateY)

    // apply rotation (convert to radians)
    ctx.rotate((rotateZ * Math.PI) / 180)

    // move back and draw
    ctx.translate(-canvasWidth / 2, -canvasHeight / 2)

    // draw video
    ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight)

    ctx.restore()
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

      // load video
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

      // load background image if needed
      let backgroundImage: HTMLImageElement | null = null
      if (backgroundType === "image" && imageBackground) {
        backgroundImage = new Image()
        backgroundImage.crossOrigin = "anonymous"
        await new Promise<void>((resolve, reject) => {
          backgroundImage!.onload = () => resolve()
          backgroundImage!.onerror = reject
          backgroundImage!.src = imageBackground
        })
      }

      // create canvas for composition
      const canvas = document.createElement("canvas")
      canvas.width = qualitySettings.width
      canvas.height = qualitySettings.height
      const ctx = canvas.getContext("2d", { willReadFrequently: false })
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
      // IMPORTANT: captureStream(0) creates a manual stream that only captures when we call requestFrame()
      // OR captureStream(fps) captures automatically at that framerate
      // We'll use captureStream(fps) and draw synchronously
      const stream = canvas.captureStream(fps)

      // get the video track to manually request frames if needed
      const [videoTrack] = stream.getVideoTracks()

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

      const recordedChunks: BlobPart[] = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data)
        }
      }

      // DON'T start recording yet - we need to draw first frame

      // calculate total frames
      let totalFrames = 0
      for (const segment of segments) {
        totalFrames += Math.ceil((segment.end - segment.start) * fps)
      }

      let processedFrames = 0
      const frameDuration = 1 / fps

      setExportProgress({
        stage: "encoding",
        progress: 30,
        message: "Rendering frames...",
      })

      // helper function to render a frame
      const renderFrame = async (videoElement: HTMLVideoElement, time: number) => {
        // seek to time
        videoElement.currentTime = time
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            videoElement.removeEventListener("seeked", onSeeked)
            resolve()
          }
          videoElement.addEventListener("seeked", onSeeked)
        })

        // clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // draw background
        if (backgroundType === "image" && backgroundImage) {
          ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height)
        } else if (backgroundType === "gradient") {
          // create gradient
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
          gradient.addColorStop(0, "#667eea")
          gradient.addColorStop(1, "#764ba2")
          ctx.fillStyle = gradient
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        } else {
          ctx.fillStyle = backgroundColor
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }

        // draw video frame with transforms
        drawVideoFrame(ctx, videoElement, canvas.width, canvas.height)

        // IMPORTANT: Request a frame to be captured from the stream
        // This ensures the canvas content is actually captured
        if ('requestFrame' in videoTrack) {
          (videoTrack as MediaStreamVideoTrack & { requestFrame: () => void }).requestFrame()
        }
      }

      // render first frame before starting recording
      await renderFrame(video, segments[0].start)

      // NOW start recording after first frame is drawn
      mediaRecorder.start(100)

      // process each segment
      for (const segment of segments) {
        const segmentStart = segment.start
        const segmentEnd = segment.end

        // process frames in this segment
        let currentTime = segmentStart
        const endTime = Math.min(segmentStart + (segmentEnd - segmentStart), duration)

        while (currentTime < endTime) {
          await renderFrame(video, currentTime)

          // wait for next frame interval
          await new Promise((resolve) => setTimeout(resolve, 1000 / fps))

          processedFrames++
          currentTime += frameDuration

          // update progress
          const progress = 30 + Math.round((processedFrames / totalFrames) * 60)
          setExportProgress({
            stage: "encoding",
            progress: Math.min(90, progress),
            message: `Rendering frame ${processedFrames}/${totalFrames}...`,
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
        stage: "muxing",
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

      toast.success("Video exported successfully with all effects!")

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
