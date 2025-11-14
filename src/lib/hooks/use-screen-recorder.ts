import { useState } from "react"
import { useVideoPlayerStore } from "@/lib/video-player-store"

export const useScreenRecorder = () => {
  const [isRecording, setIsRecording] = useState(false)
  const { setVideoSrc, setCurrentTime, setVideoDuration } = useVideoPlayerStore()

  const startScreenRecord = async () => {
    try {
      if (!navigator.mediaDevices.getDisplayMedia) {
        alert("Your device does not support the Screen Capture API")
        return
      }

      setIsRecording(true)
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      })
      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        // Clean up previous blob URL if it exists
        const currentSrc = useVideoPlayerStore.getState().videoSrc
        if (currentSrc && currentSrc.startsWith("blob:")) {
          URL.revokeObjectURL(currentSrc)
        }

        const blob = new Blob(chunks, { type: "video/webm" })
        const url = URL.createObjectURL(blob)
        setVideoSrc(url)
        setIsRecording(false)
        setCurrentTime(0)
        setVideoDuration(0) // Will be set by metadata handler
      }

      mediaRecorder.start()

      // Stop when user stops sharing
      const track = stream.getVideoTracks()[0]
      track.onended = () => {
        mediaRecorder.stop()
      }
    } catch (err) {
      console.error("Screen capture error:", err)
      setIsRecording(false)
    }
  }

  return {
    startScreenRecord,
    isRecording
  }
}
