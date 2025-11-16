import { create } from "zustand"
import { usePlayheadStore } from "./playhead-store"
import { TimelineCompiler } from "./timeline-compiler"
import type { ConvexTimelineBlock } from "./types/timeline"

interface CompositionState {
  // Timeline compiler instance
  compiler: TimelineCompiler | null

  // Active video block state (derived from playhead)
  activeVideoBlock: {
    blockId: string
    assetId: string
    inAssetTime: number // Time offset within the video asset
    visibleStart: number // Visible window start in timeline (ms)
    visibleEnd: number // Visible window end in timeline (ms)
    visibleDuration: number // Visible duration (ms)
    transforms: {
      scale: number
      x: number
      y: number
      opacity: number
      rotation: number
    }
    cropRect?: {
      x: number
      y: number
      width: number
      height: number
    }
  } | null

  // Methods
  initCompiler: (blocks: ConvexTimelineBlock[]) => void
  updateBlocks: (blocks: ConvexTimelineBlock[]) => void
  computeActiveBlock: (timeMs: number) => void
  getVideoTimeOffset: () => number
}

export const useCompositionStore = create<CompositionState>((set, get) => ({
  compiler: null,
  activeVideoBlock: null,

  initCompiler: (blocks) => {
    const compiler = new TimelineCompiler(blocks)
    set({ compiler })
  },

  updateBlocks: (blocks) => {
    const { compiler } = get()
    if (compiler) {
      compiler.updateBlocks(blocks)
      // Recompute active block with current playhead position to avoid stale data
      const playheadMs = usePlayheadStore.getState().playheadMs
      get().computeActiveBlock(playheadMs)
    } else {
      // Initialize if not exists
      get().initCompiler(blocks)
    }
  },

  computeActiveBlock: (timeMs) => {
    const { compiler } = get()
    if (!compiler) {
      set({ activeVideoBlock: null })
      return
    }

    const activeVideo = compiler.getActiveVideoBlock(timeMs)

    if (activeVideo && activeVideo.block.assetId) {
      set({
        activeVideoBlock: {
          blockId: activeVideo.block._id,
          assetId: activeVideo.block.assetId,
          inAssetTime: activeVideo.inAssetTime,
          visibleStart: activeVideo.visibleStart,
          visibleEnd: activeVideo.visibleEnd,
          visibleDuration: activeVideo.visibleDuration,
          transforms: activeVideo.transforms,
          cropRect: activeVideo.cropRect,
        }
      })
    } else {
      set({
        activeVideoBlock: null
      })
    }
  },

  getVideoTimeOffset: () => {
    const { activeVideoBlock } = get()
    return activeVideoBlock ? activeVideoBlock.inAssetTime / 1000 : 0 // Convert to seconds
  }
}))
