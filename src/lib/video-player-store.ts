import { create } from "zustand"

let clearFileStatusesRef: (() => void) | null = null

export const setClearFileStatusesRef = (fn: (() => void) | null) => {
  clearFileStatusesRef = fn
}

interface VideoPlayerState {
  currentTime: number
  setCurrentTime: (time: number) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  videoDuration: number
  setVideoDuration: (duration: number) => void
  videoSrc: string | null
  setVideoSrc: (src: string | null) => void
  videoFileName: string | null
  setVideoFileName: (name: string | null) => void
  videoFileSize: number | null
  setVideoFileSize: (size: number | null) => void
  videoFileFormat: string | null
  setVideoFileFormat: (format: string | null) => void
  loop: boolean
  setLoop: (loop: boolean) => void
  muted: boolean
  setMuted: (muted: boolean) => void
  // Helper functions
  scrubToTime: (time: number, videoRef: React.RefObject<HTMLVideoElement | null>) => void
  reset: () => void
}

export const useVideoPlayerStore = create<VideoPlayerState>((set) => ({
  currentTime: 0,
  setCurrentTime: (time) => set({ currentTime: time }),
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  videoDuration: 0,
  setVideoDuration: (duration) => set({ videoDuration: duration }),
  videoSrc: null,
  setVideoSrc: (src) => set({ videoSrc: src }),
  videoFileName: null,
  setVideoFileName: (name) => set({ videoFileName: name }),
  videoFileSize: null,
  setVideoFileSize: (size) => set({ videoFileSize: size }),
  videoFileFormat: null,
  setVideoFileFormat: (format) => set({ videoFileFormat: format }),
  loop: false,
  setLoop: (loop) => set({ loop }),
  muted: false,
  setMuted: (muted) => set({ muted }),

  scrubToTime: (time, videoRef) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
    }
    set({ currentTime: time })
  },

  reset: () => {
    clearFileStatusesRef?.()
    set({
      currentTime: 0,
      isPlaying: false,
      videoDuration: 0,
      videoSrc: null,
      videoFileName: null,
      videoFileSize: null,
      videoFileFormat: null,
      loop: false,
      muted: false
    })
  },
}))
