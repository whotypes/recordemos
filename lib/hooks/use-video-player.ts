import { useEffect, useRef } from "react"
import { useVideoPlayerStore } from "@/lib/video-player-store"

export const useVideoPlayer = (videoSrc: string | null) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  const {
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    setVideoDuration,
    loop
  } = useVideoPlayerStore()

  // Handle metadata to get actual video duration
  useEffect(() => {
    if (videoRef.current) {
      const handleLoadedMetadata = () => {
        setVideoDuration(videoRef.current?.duration || 0)
      }
      videoRef.current.addEventListener("loadedmetadata", handleLoadedMetadata)
      return () => videoRef.current?.removeEventListener("loadedmetadata", handleLoadedMetadata)
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

  // Smooth 60fps time updates using requestAnimationFrame
  useEffect(() => {
    if (!videoRef.current) return

    let rafId: number
    let lastTime = 0

    const tick = () => {
      if (videoRef.current && isPlaying) {
        const raw = videoRef.current.currentTime
        lastTime = raw
        setCurrentTime(lastTime)
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [isPlaying, videoSrc, setCurrentTime])

  // Video event listeners (ended, play, pause only - no timeupdate)
  useEffect(() => {
    if (!videoRef.current) return

    const handleEnded = () => {
      if (loop && videoRef.current) {
        videoRef.current.currentTime = 0
        setCurrentTime(0)
        videoRef.current.play().catch(() => {})
      } else {
        setIsPlaying(false)
      }
    }

    const handlePlay = () => {
      console.log("[v0] video playing")
      setIsPlaying(true)
    }

    const handlePause = () => {
      console.log("[v0] video paused")
      setIsPlaying(false)
    }

    videoRef.current.addEventListener("ended", handleEnded)
    videoRef.current.addEventListener("play", handlePlay)
    videoRef.current.addEventListener("pause", handlePause)

    return () => {
      videoRef.current?.removeEventListener("ended", handleEnded)
      videoRef.current?.removeEventListener("play", handlePlay)
      videoRef.current?.removeEventListener("pause", handlePause)
    }
  }, [videoSrc, setIsPlaying, loop, setCurrentTime])

  return {
    videoRef
  }
}
