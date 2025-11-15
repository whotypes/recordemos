import { useState, useRef } from "react"
import { useVideoPlayerStore } from "@/lib/video-player-store"

export const useScreenRecorder = () => {
  const [isRecording, setIsRecording] = useState(false)
  const { setVideoSrc, setCurrentTime, setVideoDuration } = useVideoPlayerStore()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

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

      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      })
      mediaRecorderRef.current = mediaRecorder
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

        // Clean up refs
        mediaRecorderRef.current = null
        streamRef.current = null
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
      mediaRecorderRef.current = null
      streamRef.current = null
    }
  }

  const stopScreenRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
  }

  return {
    startScreenRecord,
    stopScreenRecord,
    isRecording
  }
}
