import { create } from "zustand"

interface VideoOptionsState {
  // Video transforms
  scale: number
  setScale: (scale: number) => void

  translateX: number
  setTranslateX: (translateX: number) => void

  translateY: number
  setTranslateY: (translateY: number) => void

  rotateX: number
  setRotateX: (rotateX: number) => void

  rotateY: number
  setRotateY: (rotateY: number) => void

  rotateZ: number
  setRotateZ: (rotateZ: number) => void

  perspective: number
  setPerspective: (perspective: number) => void

  // Background
  backgroundColor: string
  setBackgroundColor: (color: string) => void
  backgroundType: 'solid' | 'gradient' | 'mesh' | 'image'
  setBackgroundType: (type: 'solid' | 'gradient' | 'mesh' | 'image') => void
  gradientAngle: number
  setGradientAngle: (angle: number) => void

  // UI state
  activeTabIndex: number
  setActiveTabIndex: (index: number) => void

  // Canvas settings
  zoomLevel: number
  setZoomLevel: (level: number) => void

  aspectRatio: string
  setAspectRatio: (ratio: string) => void

  hideToolbars: boolean
  setHideToolbars: (hide: boolean) => void

  // Video player state
  currentTime: number
  setCurrentTime: (time: number) => void

  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void

  videoDuration: number
  setVideoDuration: (duration: number) => void

  videoSrc: string | null
  setVideoSrc: (src: string | null) => void

  // Helper functions
  scrubToTime: (time: number, videoRef: React.RefObject<HTMLVideoElement | null>) => void
  reset: () => void

  // Reset transforms to defaults
  resetTransforms: () => void
}

export const useVideoOptionsStore = create<VideoOptionsState>((set, get) => {
  // Initialize gradient angle CSS variable
  if (typeof window !== 'undefined') {
    document?.documentElement.style.setProperty('--gradient-angle', '170deg')
  }

  return {
  // Video transforms - defaults
  scale: 1,
  setScale: (scale) => set({ scale }),

  translateX: 0,
  setTranslateX: (translateX) => set({ translateX }),

  translateY: 0,
  setTranslateY: (translateY) => set({ translateY }),

  rotateX: 0,
  setRotateX: (rotateX) => set({ rotateX }),

  rotateY: 0,
  setRotateY: (rotateY) => set({ rotateY }),

  rotateZ: 0,
  setRotateZ: (rotateZ) => set({ rotateZ }),

  perspective: 2000,
  setPerspective: (perspective) => set({ perspective }),

  // UI state
  activeTabIndex: 0,
  setActiveTabIndex: (index) => set({ activeTabIndex: index }),

  // Background - default from editor store
  backgroundColor: "#1a1a1a",
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  backgroundType: 'gradient',
  setBackgroundType: (type) => set({ backgroundType: type }),
  gradientAngle: 170,
  setGradientAngle: (angle) => {
    if (typeof window !== 'undefined') {
      document?.documentElement.style.setProperty('--gradient-angle', `${angle}deg`)
    }
    set({ gradientAngle: angle })
  },

  // Canvas settings - defaults from editor store
  zoomLevel: 100,
  setZoomLevel: (level) => set({ zoomLevel: level }),

  aspectRatio: "16:9",
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),

  hideToolbars: false,
  setHideToolbars: (hide) => set({ hideToolbars: hide }),

  // Video player state - defaults from video player store
  currentTime: 0,
  setCurrentTime: (time) => set({ currentTime: time }),

  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  videoDuration: 0,
  setVideoDuration: (duration) => set({ videoDuration: duration }),

  videoSrc: null,
  setVideoSrc: (src) => set({ videoSrc: src }),

  // Helper functions
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
    videoSrc: null
  }),

  resetTransforms: () => set({
    scale: 1,
    translateX: 0,
    translateY: 0,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    perspective: 2000,
  }),
  }
})
