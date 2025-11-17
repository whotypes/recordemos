import { useCompositionStore } from "@/lib/composition-store"
import { usePlayheadStore } from "@/lib/playhead-store"
import { useTimelineDurationStore } from "@/lib/timeline-duration-store"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { useEffect, useRef } from "react"

export const useVideoPlayer = (videoSrc: string | null) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  const {
    setVideoDuration,
    loop
  } = useVideoPlayerStore()

  const { isPlaying, setIsPlaying, setPlayheadMs } = usePlayheadStore()

  // handle video source changes - explicitly load video when src changes
  useEffect(() => {
    if (!videoRef.current) return

    const video = videoRef.current

    // when src changes, explicitly load the video
    // the src is set via JSX prop, but we need to call load() to ensure it loads
    if (videoSrc) {
      // ensure video loads when src changes
      video.load()
    } else {
      // clear video if no src
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [videoSrc])

  // handle metadata to get actual video duration
  useEffect(() => {
    if (!videoRef.current || !videoSrc) return

    const video = videoRef.current

    const handleLoadedMetadata = () => {
      const duration = video.duration || 0
      if (duration > 0) {
        setVideoDuration(duration)
        useTimelineDurationStore.getState().setVideoDuration(duration)
      }
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata)

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
    }
  }, [videoSrc, setVideoDuration])

  // Sync video playback with play/pause state
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying])

  // let video drive playhead during playback with requestAnimationFrame for smooth updates
  useEffect(() => {
    if (!videoRef.current || !videoSrc) return

    const video = videoRef.current
    let rafId: number | null = null

    const updatePlayhead = () => {
      if (!videoRef.current) {
        return
      }

      if (!isPlaying) {
        rafId = null
        return
      }

      const currentTimeMs = video.currentTime * 1000

      const compiler = useCompositionStore.getState().compiler
      const maxTimelineMs = compiler ? compiler.getTotalDuration() : 0

      if (maxTimelineMs > 0 && currentTimeMs >= maxTimelineMs) {
        const epsilonMs = 10

        if (loop && compiler) {
          const referenceTimeMs = Math.max(0, maxTimelineMs - epsilonMs)
          const loopBlock = compiler.getActiveVideoBlock(referenceTimeMs)

          if (loopBlock && loopBlock.visibleDuration > 0) {
            const localOffsetMs = referenceTimeMs - loopBlock.visibleStart
            const trimStartMs = loopBlock.inAssetTime - localOffsetMs
            const windowStartMs = loopBlock.visibleStart
            const windowAssetStartMs = Math.max(0, trimStartMs)

            video.currentTime = windowAssetStartMs / 1000
            setPlayheadMs(windowStartMs, "playback")
            rafId = requestAnimationFrame(updatePlayhead)
            return
          }
        }

        const clampedTimeMs = Math.max(0, maxTimelineMs - epsilonMs)
        const clampedTimeSeconds = clampedTimeMs / 1000

        video.currentTime = clampedTimeSeconds
        setPlayheadMs(clampedTimeMs, "playback")
        setIsPlaying(false)
        video.pause()
        rafId = null
        return
      }

      setPlayheadMs(currentTimeMs, "playback")

      rafId = requestAnimationFrame(updatePlayhead)
    }

    if (isPlaying) {
      rafId = requestAnimationFrame(updatePlayhead)
    }

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [videoSrc, isPlaying, setPlayheadMs, loop, setIsPlaying])

  // playback lifecycle events (ended, play, pause, error)
  useEffect(() => {
    if (!videoRef.current || !videoSrc) return

    const video = videoRef.current

    const handleEnded = () => {
      setIsPlaying(false)
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    const handleError = (e: Event) => {
      console.error("Video playback error:", e)
      setIsPlaying(false)
    }

    video.addEventListener("ended", handleEnded)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("error", handleError)

    return () => {
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("error", handleError)
    }
  }, [videoSrc, loop, setIsPlaying, setPlayheadMs])

  return {
    videoRef
  }
}
