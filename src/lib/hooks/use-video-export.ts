import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { useCompositionStore } from "../composition-store"
import type { ConvexTimelineBlock } from "../types/timeline"

interface ExportProgress {
  stage: "loading" | "processing" | "finalizing" | "complete"
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
        bitrate: "2500k",
        preset: "medium",
      }
    case "1080":
      return {
        width: 1920,
        height: 1080,
        bitrate: "5000k",
        preset: "medium",
      }
    case "4k":
      return {
        width: 3840,
        height: 2160,
        bitrate: "20000k",
        preset: "slow",
      }
  }
}

export const useVideoExport = () => {
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    stage: "loading",
    progress: 0,
    message: "Initializing...",
  })
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const { compiler } = useCompositionStore()

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current

    try {
      setExportProgress({
        stage: "loading",
        progress: 10,
        message: "Loading FFmpeg (~31MB)...",
      })

      const ffmpeg = new FFmpeg()

      ffmpeg.on("log", ({ message }) => {
        console.log("[FFmpeg]", message)
      })

      ffmpeg.on("progress", ({ progress, time }) => {
        console.log(`[FFmpeg Progress] ${(progress * 100).toFixed(2)}%, time: ${time}`)
        setExportProgress((prev) => ({
          ...prev,
          progress: Math.min(95, Math.round(progress * 100)),
        }))
      })

      const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm"

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      })

      ffmpegRef.current = ffmpeg
      return ffmpeg
    } catch (error) {
      console.error("Failed to load FFmpeg:", error)
      throw new Error("Failed to initialize video processor")
    }
  }

  const getVideoSegments = (blocks: ConvexTimelineBlock[]) => {
    // get all video blocks sorted by start time
    const videoBlocks = blocks
      .filter((b) => b.blockType === "video")
      .sort((a, b) => a.startMs - b.startMs)

    // calculate segments to keep (excluding trim blocks)
    const segments: Array<{ start: number; end: number }> = []

    for (const block of videoBlocks) {
      const blockStart = block.startMs / 1000 // convert to seconds
      const blockEnd = (block.startMs + block.durationMs) / 1000
      const trimStart = (block.trimStartMs || 0) / 1000
      const trimEnd = (block.trimEndMs || 0) / 1000

      // the visible portion of this block
      const visibleStart = blockStart + trimStart
      const visibleEnd = blockEnd - trimEnd

      if (visibleEnd > visibleStart) {
        segments.push({
          start: trimStart,
          end: block.durationMs / 1000 - trimEnd,
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
      const ffmpeg = await loadFFmpeg()
      const blocks = compiler.getBlocks()
      const qualitySettings = getQualitySettings(options.quality)

      setExportProgress({
        stage: "loading",
        progress: 30,
        message: "Loading video file...",
      })

      // convert blob URL to actual file data
      let videoData: Uint8Array
      let detectedFormat = "mp4"

      if (options.videoSrc.startsWith('blob:')) {
        console.log("[FFmpeg] Fetching blob URL...")
        // fetch the blob and convert to Uint8Array
        const response = await fetch(options.videoSrc)
        const blob = await response.blob()
        console.log("[FFmpeg] Blob size:", blob.size, "Type:", blob.type)

        // detect format from blob type or provided format
        if (blob.type.includes('webm') || options.videoFormat === 'webm') {
          detectedFormat = "webm"
        } else if (blob.type.includes('mp4') || options.videoFormat === 'mp4') {
          detectedFormat = "mp4"
        } else if (blob.type.includes('quicktime') || blob.type.includes('mov')) {
          detectedFormat = "mov"
        }

        const arrayBuffer = await blob.arrayBuffer()
        videoData = new Uint8Array(arrayBuffer)
      } else {
        console.log("[FFmpeg] Fetching remote URL...")
        // use fetchFile for regular URLs or files
        videoData = await fetchFile(options.videoSrc)

        // detect format from URL or provided format
        if (options.videoSrc.includes('.webm') || options.videoFormat === 'webm') {
          detectedFormat = "webm"
        } else if (options.videoSrc.includes('.mov') || options.videoFormat === 'mov') {
          detectedFormat = "mov"
        } else {
          detectedFormat = "mp4"
        }
      }

      console.log("[FFmpeg] Video data size:", videoData.length, "bytes")
      console.log("[FFmpeg] Detected format:", detectedFormat)

      // determine input file name based on detected format
      const inputFileName = `input.${detectedFormat}`

      console.log("[FFmpeg] Writing file as:", inputFileName)
      await ffmpeg.writeFile(inputFileName, videoData)

      setExportProgress({
        stage: "processing",
        progress: 40,
        message: "Analyzing timeline...",
      })

      const segments = getVideoSegments(blocks)
      console.log("[FFmpeg] Video segments:", JSON.stringify(segments, null, 2))

      if (segments.length === 0) {
        toast.error("No video segments to export")
        setIsExporting(false)
        return
      }

      setExportProgress({
        stage: "processing",
        progress: 50,
        message: `Processing ${segments.length} segment${segments.length > 1 ? "s" : ""}...`,
      })

      // if we have multiple segments or trims, we need to process them
      if (segments.length === 1 && segments[0].start === 0) {
        // simple case: single segment with no trim at start
        const segment = segments[0]

        const args = [
          "-i", inputFileName,
          "-ss", "0",
          "-t", segment.end.toString(),
          "-vf", `scale=${qualitySettings.width}:${qualitySettings.height}`,
          "-c:v", "libx264",
          "-preset", qualitySettings.preset,
          "-b:v", qualitySettings.bitrate,
          "-c:a", "aac",
          "-b:a", "128k",
          "-movflags", "+faststart",
          "output.mp4"
        ]

        console.log("[FFmpeg] Executing:", args.join(" "))
        const exitCode = await ffmpeg.exec(args)
        console.log("[FFmpeg] Exit code:", exitCode)
      } else {
        // complex case: multiple segments or trims
        // we'll extract each segment and concatenate them

        setExportProgress({
          stage: "processing",
          progress: 55,
          message: "Extracting video segments...",
        })

        // extract each segment
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i]
          const duration = segment.end - segment.start

          // ensure valid duration
          if (duration <= 0) {
            console.warn(`[FFmpeg] Skipping segment ${i} with invalid duration: ${duration}`)
            continue
          }

          const segmentArgs = [
            "-i", inputFileName,
            "-ss", segment.start.toString(),
            "-t", duration.toString(),
            "-c", "copy",
            `segment_${i}.mp4`
          ]
          console.log(`[FFmpeg] Extracting segment ${i}:`, segmentArgs.join(" "))
          const exitCode = await ffmpeg.exec(segmentArgs)
          if (exitCode !== 0) {
            throw new Error(`Failed to extract segment ${i}, exit code: ${exitCode}`)
          }

          setExportProgress({
            stage: "processing",
            progress: 55 + Math.round((i / segments.length) * 20),
            message: `Extracting segment ${i + 1}/${segments.length}...`,
          })
        }

        setExportProgress({
          stage: "processing",
          progress: 75,
          message: "Merging segments...",
        })

        // create concat file
        const concatList = segments
          .map((_, i) => `file segment_${i}.mp4`)
          .join("\n")
        await ffmpeg.writeFile("concat_list.txt", concatList)

        // concatenate and scale/encode in one step
        const concatArgs = [
          "-f", "concat",
          "-safe", "0",
          "-i", "concat_list.txt",
          "-vf", `scale=${qualitySettings.width}:${qualitySettings.height}`,
          "-c:v", "libx264",
          "-preset", qualitySettings.preset,
          "-b:v", qualitySettings.bitrate,
          "-c:a", "aac",
          "-b:a", "128k",
          "-movflags", "+faststart",
          "output.mp4"
        ]
        console.log("[FFmpeg] Concatenating:", concatArgs.join(" "))
        await ffmpeg.exec(concatArgs)

        // cleanup segment files
        for (let i = 0; i < segments.length; i++) {
          await ffmpeg.deleteFile(`segment_${i}.mp4`)
        }
        await ffmpeg.deleteFile("concat_list.txt")
      }

      setExportProgress({
        stage: "finalizing",
        progress: 95,
        message: "Preparing download...",
      })

      // read the output file
      const data = await ffmpeg.readFile("output.mp4")
      // readFile returns Uint8Array for binary files
      // ensure we have a proper ArrayBuffer (not SharedArrayBuffer)
      if (!(data instanceof Uint8Array)) {
        throw new Error("Expected Uint8Array from readFile")
      }
      // create a new ArrayBuffer from the Uint8Array to avoid SharedArrayBuffer issues
      const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
      const blob = new Blob([arrayBuffer as ArrayBuffer], { type: "video/mp4" })

      // create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = options.fileName || `export-${options.quality}p-${Date.now()}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // cleanup
      await ffmpeg.deleteFile(inputFileName)
      await ffmpeg.deleteFile("output.mp4")

      setExportProgress({
        stage: "complete",
        progress: 100,
        message: "Export complete!",
      })

      toast.success("Video exported successfully!")

      // wait a bit before resetting
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
    if (ffmpegRef.current) {
      try {
        ffmpegRef.current.terminate()
        ffmpegRef.current = null
      } catch (error) {
        console.error("Failed to terminate FFmpeg:", error)
      }
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
