import { useVideoPlayerStore } from "@/lib/video-player-store"

export const useVideoUpload = () => {
  const { setVideoSrc, setCurrentTime, setVideoDuration } = useVideoPlayerStore()

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if it's a video file
    if (!file.type.startsWith("video/")) {
      alert("Please select a video file")
      return
    }

    // Clean up previous blob URL if it exists
    const currentSrc = useVideoPlayerStore.getState().videoSrc
    if (currentSrc && currentSrc.startsWith("blob:")) {
      URL.revokeObjectURL(currentSrc)
    }

    // Create a blob URL from the file
    const url = URL.createObjectURL(file)
    setVideoSrc(url)
    setCurrentTime(0)
    setVideoDuration(0) // Will be set by metadata handler

    // Clean up the input
    e.target.value = ""
  }

  return {
    handleVideoUpload
  }
}
