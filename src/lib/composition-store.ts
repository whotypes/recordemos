import { create } from "zustand"
import { clampPlayheadMs, syncPlaybackEndMs } from "./playback-bounds"
import { usePlayheadStore } from "./playhead-store"
import { TimelineCompiler } from "./timeline-compiler"
import { useTimelineDurationStore } from "./timeline-duration-store"
import type { ConvexTimelineBlock } from "./types/timeline"

interface CompositionState {
  compiler: TimelineCompiler | null
  /** End of video content in ms — drives scrubber/playback bounds */
  playbackEndMs: number

  // Active video block state (derived from playhead)
  activeVideoBlock: {
    blockId: string
    assetId: string
    inAssetTime: number // Time offset within the video asset
    maxInAssetTimeMs: number // Last valid frame inside trim window
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
  playbackEndMs: 0,
  activeVideoBlock: null,

  initCompiler: (blocks) => {
    const compiler = new TimelineCompiler(blocks)
    const playbackEndMs = compiler.getPlaybackEndMs()
    syncPlaybackEndMs(playbackEndMs)
    set({ compiler, playbackEndMs })
    useTimelineDurationStore.getState().setTimelineDuration(playbackEndMs / 1000)
  },

  updateBlocks: (blocks) => {
    const { compiler } = get()
    if (compiler) {
      compiler.updateBlocks(blocks)

      const playbackEndMs = compiler.getPlaybackEndMs()
      syncPlaybackEndMs(playbackEndMs)
      set({ playbackEndMs })
      useTimelineDurationStore.getState().setTimelineDuration(playbackEndMs / 1000)

      const playheadMs = usePlayheadStore.getState().playheadMs
      if (playbackEndMs > 0 && playheadMs >= playbackEndMs) {
        usePlayheadStore.getState().setPlayheadMs(Math.max(0, playbackEndMs - 1), "block-move")
      }
      get().computeActiveBlock(
        playbackEndMs > 0 && playheadMs >= playbackEndMs
          ? Math.max(0, playbackEndMs - 1)
          : playheadMs,
      )
    } else {
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
      const trimStart = activeVideo.block.trimStartMs || 0
      const maxInAssetTimeMs = trimStart + activeVideo.block.durationMs - 1

      set({
        activeVideoBlock: {
          blockId: activeVideo.block._id,
          assetId: activeVideo.block.assetId,
          inAssetTime: activeVideo.inAssetTime,
          maxInAssetTimeMs,
          visibleStart: activeVideo.visibleStart,
          visibleEnd: activeVideo.visibleEnd,
          visibleDuration: activeVideo.visibleDuration,
          transforms: activeVideo.transforms,
          cropRect: activeVideo.cropRect,
        }
      })
    } else {
      set({ activeVideoBlock: null })
    }
  },

  getVideoTimeOffset: () => {
    const { activeVideoBlock } = get()
    return activeVideoBlock ? activeVideoBlock.inAssetTime / 1000 : 0 // Convert to seconds
  }
}))
