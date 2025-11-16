import { create } from "zustand"
import { TimelineCompiler } from "./timeline-compiler"
import type { ConvexTimelineBlock } from "./types/timeline"

interface CompositionState {
  // Timeline compiler instance
  compiler: TimelineCompiler | null

  // Current playback time in ms
  currentTimeMs: number

  // Active video block state
  activeVideoBlock: {
    blockId: string
    assetId: string
    inAssetTime: number // Time offset within the video asset
    transforms: {
      scale: number
      x: number
      y: number
      opacity: number
      rotation: number
    }
  } | null

  // Methods
  initCompiler: (blocks: ConvexTimelineBlock[]) => void
  updateBlocks: (blocks: ConvexTimelineBlock[]) => void
  setCurrentTime: (timeMs: number) => void
  getVideoTimeOffset: () => number
}

export const useCompositionStore = create<CompositionState>((set, get) => ({
  compiler: null,
  currentTimeMs: 0,
  activeVideoBlock: null,

  initCompiler: (blocks) => {
    const compiler = new TimelineCompiler(blocks)
    set({ compiler })
  },

  updateBlocks: (blocks) => {
    const { compiler } = get()
    if (compiler) {
      compiler.updateBlocks(blocks)
      // Recompute state at current time
      const { currentTimeMs } = get()
      get().setCurrentTime(currentTimeMs)
    } else {
      // Initialize if not exists
      get().initCompiler(blocks)
    }
  },

  setCurrentTime: (timeMs) => {
    const { compiler } = get()
    if (!compiler) {
      set({ currentTimeMs: timeMs, activeVideoBlock: null })
      return
    }

    const activeVideo = compiler.getActiveVideoBlock(timeMs)

    if (activeVideo) {
      set({
        currentTimeMs: timeMs,
        activeVideoBlock: {
          blockId: activeVideo.block._id,
          assetId: activeVideo.block.assetId!,
          inAssetTime: activeVideo.inAssetTime,
          transforms: activeVideo.transforms,
        }
      })
    } else {
      set({
        currentTimeMs: timeMs,
        activeVideoBlock: null
      })
    }
  },

  getVideoTimeOffset: () => {
    const { activeVideoBlock } = get()
    return activeVideoBlock ? activeVideoBlock.inAssetTime / 1000 : 0 // Convert to seconds
  }
}))
