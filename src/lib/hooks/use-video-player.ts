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

  // Timeline Master Clock
  useEffect(() => {
    if (!videoRef.current || !videoSrc) return

    const video = videoRef.current
    let rafId: number | null = null
    let startTime: number | null = null
    let startPlayheadMs: number | null = null

    const updatePlayback = (timestamp: number) => {
      if (!isPlaying) {
        rafId = null
        return
      }

      if (startTime === null || startPlayheadMs === null) {
        startTime = timestamp
        startPlayheadMs = usePlayheadStore.getState().playheadMs
      }

      const elapsedMs = timestamp - startTime
      let currentPlayheadMs = startPlayheadMs + elapsedMs

      const compiler = useCompositionStore.getState().compiler
      const maxTimelineMs = compiler ? compiler.getTotalDuration() : 0

      // Handle Loop & End of Timeline
      if (maxTimelineMs > 0 && currentPlayheadMs >= maxTimelineMs) {
        if (loop) {
          currentPlayheadMs = 0
          startTime = timestamp
          startPlayheadMs = 0
          // Optional: Seek video to start if needed immediately, but the sync logic below will handle it
        } else {
          // Stop playback
          currentPlayheadMs = maxTimelineMs
          setPlayheadMs(currentPlayheadMs, "playback")
          useCompositionStore.getState().computeActiveBlock(currentPlayheadMs)
          setIsPlaying(false)
          video.pause()
          rafId = null
          return
        }
      }

      setPlayheadMs(currentPlayheadMs, "playback")
      // Synchronously update active block to prevent render lag (flashing)
      useCompositionStore.getState().computeActiveBlock(currentPlayheadMs)

      // Sync Video Player to Timeline
      const activeBlock = compiler?.getActiveVideoBlock(currentPlayheadMs)

      if (activeBlock) {
        const targetVideoTime = activeBlock.inAssetTime / 1000

        // Check if we need to seek (drift or jump)
        // Tolerance of 0.1s to avoid jitter, but tight enough for cuts
        if (Math.abs(video.currentTime - targetVideoTime) > 0.1) {
          video.currentTime = targetVideoTime
        }

        // Ensure video is playing if we are in a block
        if (video.paused) {
          video.play().catch(() => { })
        }
      } else {
        // In a gap - check for next block to skip to
        const nextBlock = compiler?.getNextVideoBlock(currentPlayheadMs)

        if (nextBlock) {
          // Found a next block - skip the gap!
          // We need to adjust our time reference so the "elapsed" calculation
          // continues from this new point

          // The target time is the start of the next block
          const targetTimelineMs = nextBlock.visibleStart

          // Update our reference start time to "now"
          startTime = timestamp
          // Set the base playhead time to the new target
          startPlayheadMs = targetTimelineMs

          // Update current playhead immediately
          currentPlayheadMs = targetTimelineMs
          setPlayheadMs(currentPlayheadMs, "playback")
          // Synchronously update active block for the new time
          useCompositionStore.getState().computeActiveBlock(currentPlayheadMs)

          // Seek video to the start of the new block
          const targetVideoTime = nextBlock.inAssetTime / 1000
          video.currentTime = targetVideoTime

          if (video.paused) {
            video.play().catch(() => { })
          }
        } else {
          // No next block - we are at the end of content or in a trailing gap
          // Just pause
          if (!video.paused) {
            video.pause()
          }
        }
      }

      rafId = requestAnimationFrame(updatePlayback)
    }

    if (isPlaying) {
      rafId = requestAnimationFrame(updatePlayback)
    } else {
      // When paused, ensure video is paused
      video.pause()
    }

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [videoSrc, isPlaying, loop, setIsPlaying, setPlayheadMs])

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
