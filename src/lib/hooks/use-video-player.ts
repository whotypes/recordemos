import { useEffect, useRef } from "react"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { useCompositionStore } from "@/lib/composition-store"

export const useVideoPlayer = (videoSrc: string | null, blocks?: any[]) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  const {
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    setVideoDuration,
    loop
  } = useVideoPlayerStore()

  const { setCurrentTime: setCompositionTime, getVideoTimeOffset } = useCompositionStore()

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
        // During playback, sync timeline time to video time
        const raw = videoRef.current.currentTime
        lastTime = raw
        setCurrentTime(lastTime)

        // Update composition time in milliseconds
        setCompositionTime(lastTime * 1000)
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [isPlaying, videoSrc, setCurrentTime, setCompositionTime])

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
      setIsPlaying(true)
    }

    const handlePause = () => {
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
