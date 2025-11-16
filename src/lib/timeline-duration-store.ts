import { create } from "zustand"

interface TimelineDurationState {
  // raw video duration in seconds
  videoDuration: number
  setVideoDuration: (duration: number) => void

  // calculated timeline duration based on all blocks
  // this is the effective timeline length that can grow dynamically
  timelineDuration: number
  setTimelineDuration: (duration: number) => void

  // get the actual duration to use for rendering
  // this is max of video duration and timeline duration
  getEffectiveDuration: () => number

  // minimum timeline duration to show (even if no video)
  minTimelineDuration: number

  // reset to defaults
  reset: () => void
}

const DEFAULT_MIN_DURATION = 10 // 10 seconds minimum

export const useTimelineDurationStore = create<TimelineDurationState>((set, get) => ({
  videoDuration: 0,
  timelineDuration: DEFAULT_MIN_DURATION,
  minTimelineDuration: DEFAULT_MIN_DURATION,

  setVideoDuration: (duration) => {
    set({ videoDuration: duration })
    // ensure timeline duration is at least the video duration
    const current = get()
    if (duration > current.timelineDuration) {
      set({ timelineDuration: duration })
    }
  },

  setTimelineDuration: (duration) => {
    const current = get()
    // timeline duration should be at least the video duration
    const effectiveDuration = Math.max(duration, current.videoDuration, current.minTimelineDuration)
    set({ timelineDuration: effectiveDuration })
  },

  getEffectiveDuration: () => {
    const { videoDuration, timelineDuration, minTimelineDuration } = get()
    return Math.max(videoDuration, timelineDuration, minTimelineDuration)
  },

  reset: () => {
    set({
      videoDuration: 0,
      timelineDuration: DEFAULT_MIN_DURATION,
    })
  },
}))
