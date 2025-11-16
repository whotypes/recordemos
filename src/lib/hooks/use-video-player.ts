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

  // cleanup when video source changes or component unmounts
  useEffect(() => {
    return () => {
    // pause and clear video when src changes
      if (videoRef.current) {
        videoRef.current.pause()
        // remove src to free memory
        videoRef.current.removeAttribute('src')
        videoRef.current.load()
      }
    }
  }, [videoSrc])

  // handle metadata to get actual video duration
  useEffect(() => {
    if (videoRef.current && videoSrc) {
      const video = videoRef.current

      const handleLoadedMetadata = () => {
        const duration = video.duration || 0
        setVideoDuration(duration)
        // also update timeline duration store
        useTimelineDurationStore.getState().setVideoDuration(duration)
      }

      video.addEventListener("loadedmetadata", handleLoadedMetadata)

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      }
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

  // let video drive playhead during playback - no seeking, smooth playback
  useEffect(() => {
    if (!videoRef.current || !videoSrc) return

    const video = videoRef.current

    const handleTimeUpdate = () => {
      if (isPlaying && video) {
        // during playback, let video drive the playhead
        const videoTimeMs = video.currentTime * 1000
        setPlayheadMs(videoTimeMs, "playback")
      }
    }

    const handleEnded = () => {
      if (loop && video) {
        setPlayheadMs(0, "playback")
        video.play().catch(() => { })
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

    const handleError = (e: Event) => {
      console.error("Video playback error:", e)
      setIsPlaying(false)
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("ended", handleEnded)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("error", handleError)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("error", handleError)
    }
  }, [videoSrc, setIsPlaying, isPlaying, loop, setPlayheadMs])

  return {
    videoRef
  }
}
