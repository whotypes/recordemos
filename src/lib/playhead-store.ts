import { create } from "zustand"

interface PlayheadState {
  // canonical timeline time in milliseconds
  playheadMs: number

  // playback state
  isPlaying: boolean

  // actions
  setPlayheadMs: (timeMs: number, reason?: "scrub" | "presence" | "block-move" | "playback" | "init") => void
  setIsPlaying: (playing: boolean) => void

  // helper to get time in seconds
  getPlayheadSeconds: () => number
}

export const usePlayheadStore = create<PlayheadState>((set, get) => ({
  playheadMs: 0,
  isPlaying: false,

  setPlayheadMs: (timeMs, reason = "playback") => {
    const clamped = Math.max(0, timeMs)

    // optional: log for debugging sync issues
    if (process.env.NODE_ENV === "development" && reason !== "playback") {
      console.log(`[PLAYHEAD] Set to ${(clamped / 1000).toFixed(3)}s (reason: ${reason})`)
    }

    set({ playheadMs: clamped })
  },

  setIsPlaying: (playing) => {
    set({ isPlaying: playing })
  },

  getPlayheadSeconds: () => {
    return get().playheadMs / 1000
  },
}))
