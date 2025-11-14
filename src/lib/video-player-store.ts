import { create } from "zustand"

interface VideoPlayerState {
  currentTime: number
  setCurrentTime: (time: number) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  videoDuration: number
  setVideoDuration: (duration: number) => void
  videoSrc: string | null
  setVideoSrc: (src: string | null) => void
  loop: boolean
  setLoop: (loop: boolean) => void
  muted: boolean
  setMuted: (muted: boolean) => void
  // Helper functions
  scrubToTime: (time: number, videoRef: React.RefObject<HTMLVideoElement | null>) => void
  reset: () => void
}

export const useVideoPlayerStore = create<VideoPlayerState>((set, get) => ({
  currentTime: 0,
  setCurrentTime: (time) => set({ currentTime: time }),
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  videoDuration: 0,
  setVideoDuration: (duration) => set({ videoDuration: duration }),
  videoSrc: null,
  setVideoSrc: (src) => set({ videoSrc: src }),
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

  reset: () => set({
    currentTime: 0,
    isPlaying: false,
    videoDuration: 0,
    videoSrc: null,
    loop: false,
    muted: false
  }),
}))
