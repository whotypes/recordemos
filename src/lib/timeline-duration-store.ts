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
  // this is the edited timeline length
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
  },

  setTimelineDuration: (duration) => {
    const effectiveDuration = Math.max(duration, DEFAULT_MIN_DURATION)
    set({ timelineDuration: effectiveDuration })
  },

  getEffectiveDuration: () => {
    const { timelineDuration, minTimelineDuration } = get()
    return Math.max(timelineDuration, minTimelineDuration)
  },

  reset: () => {
    set({
      videoDuration: 0,
      timelineDuration: DEFAULT_MIN_DURATION,
    })
  },
}))
