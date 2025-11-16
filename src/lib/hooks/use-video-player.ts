import { useEffect, useRef } from "react"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { usePlayheadStore } from "@/lib/playhead-store"

export const useVideoPlayer = (videoSrc: string | null) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  const {
    setVideoDuration,
    loop
  } = useVideoPlayerStore()

  const { isPlaying, setIsPlaying, setPlayheadMs } = usePlayheadStore()

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

  // Video event listeners (ended, play, pause only - no timeupdate)
  useEffect(() => {
    if (!videoRef.current) return

    const handleEnded = () => {
      if (loop && videoRef.current) {
        // Set playhead to 0 - video will follow automatically via preview-canvas sync
        setPlayheadMs(0, "playback")
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
  }, [videoSrc, setIsPlaying, loop, setPlayheadMs])

  return {
    videoRef
  }
}
