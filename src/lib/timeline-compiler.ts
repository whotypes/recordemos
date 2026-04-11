import type { ConvexTimelineBlock } from "./types/timeline"

export interface CompiledBlock {
  block: ConvexTimelineBlock
  isActive: boolean
  // Time offset within the asset (for video/audio blocks)
  inAssetTime: number
  // Visible window boundaries
  visibleStart: number
  visibleEnd: number
  visibleDuration: number
  // Computed transform state at current time
  transforms: {
    scale: number
    x: number
    y: number
    opacity: number
    rotation: number
  }
  // Visual properties
  cropRect?: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface TimelineState {
  currentTime: number
  activeBlocks: CompiledBlock[]
  // Track which blocks are on which tracks for layering
  trackLayers: Map<string, CompiledBlock[]>
}

export class TimelineCompiler {
  private blocks: ConvexTimelineBlock[]

  constructor(blocks: ConvexTimelineBlock[]) {
    this.blocks = blocks
  }

  /**
   * Calculate visible window for a block
   * In Standard Model:
   * visibleStart = block.startMs
   * visibleEnd = block.startMs + block.durationMs
   * visibleDuration = block.durationMs
   */
  private getVisibleWindow(block: ConvexTimelineBlock): {
    visibleStart: number
    visibleEnd: number
    visibleDuration: number
  } {
    const visibleStart = block.startMs
    const visibleDuration = block.durationMs
    const visibleEnd = visibleStart + visibleDuration

    return { visibleStart, visibleEnd, visibleDuration }
  }

  /**
   * Get all active blocks and their computed state at a specific time
   */
  getStateAt(timeMs: number): TimelineState {
    const activeBlocks: CompiledBlock[] = []
    const trackLayers = new Map<string, CompiledBlock[]>()

    for (const block of this.blocks) {
      const { visibleStart, visibleEnd } = this.getVisibleWindow(block)

      // Block is active if timeline time is within the visible window
      const isActive = timeMs >= visibleStart && timeMs < visibleEnd

      if (isActive) {
        // Calculate in-asset time for media blocks (video/audio)
        let inAssetTime = 0
        if (block.blockType === "video") {
          // Time within the visible window
          const localOffset = timeMs - visibleStart
          // Map to source video time: start at trimStart, advance by localOffset
          inAssetTime = (block.trimStartMs || 0) + localOffset

          // No clamping needed if duration is managed correctly, but safe to keep
          // const maxSourceTime = ... (we don't track source duration here easily without asset metadata)
        }

        const { visibleDuration } = this.getVisibleWindow(block)

        // Compute interpolated transforms if this block has keyframes
        // For now, we'll use the static transforms from the block
        const transforms = {
          scale: block.transforms.scale,
          x: block.transforms.x,
          y: block.transforms.y,
          opacity: block.transforms.opacity,
          rotation: block.transforms.rotation,
        }

        // Compute crop rectangle if metadata exists
        const cropRect = block.metadata?.cropX !== undefined ? {
          x: block.metadata.cropX,
          y: block.metadata.cropY || 0,
          width: block.metadata.cropW || 100,
          height: block.metadata.cropH || 100,
        } : undefined

        const compiled: CompiledBlock = {
          block,
          isActive: true,
          inAssetTime,
          visibleStart,
          visibleEnd,
          visibleDuration,
          transforms,
          cropRect,
        }

        activeBlocks.push(compiled)

        // Group by track for layering
        const trackBlocks = trackLayers.get(block.trackId) || []
        trackBlocks.push(compiled)
        trackLayers.set(block.trackId, trackBlocks)
      }
    }

    // Sort active blocks by z-index for proper layering
    activeBlocks.sort((a, b) => a.block.zIndex - b.block.zIndex)

    return {
      currentTime: timeMs,
      activeBlocks,
      trackLayers,
    }
  }

  /**
   * Get the topmost (highest z-index) active video block at the given time.
   */
  getActiveVideoBlock(timeMs: number): CompiledBlock | null {
    const state = this.getStateAt(timeMs)
    const videos = state.activeBlocks.filter((b) => b.block.blockType === "video")
    if (videos.length === 0) return null
    // activeBlocks sorted ascending by zIndex; last video wins for stacking
    return videos[videos.length - 1] ?? null
  }

  /**
   * Get the next video block that starts after the given time
   * Used for gap skipping during playback
   */
  getNextVideoBlock(timeMs: number): CompiledBlock | null {
    const videoBlocks = this.blocks.filter(b => b.blockType === "video")

    // Find blocks that start after the current time
    const nextBlocks = videoBlocks.filter(b => {
      const { visibleStart } = this.getVisibleWindow(b)
      return visibleStart > timeMs
    })

    if (nextBlocks.length === 0) return null

    // Sort by start time to find the immediate next one
    nextBlocks.sort((a, b) => {
      const startA = this.getVisibleWindow(a).visibleStart
      const startB = this.getVisibleWindow(b).visibleStart
      return startA - startB
    })

    const nextBlock = nextBlocks[0]
    const { visibleStart, visibleEnd, visibleDuration } = this.getVisibleWindow(nextBlock)

    // We calculate inAssetTime for the start of the block
    // At start of block, inAssetTime = trimStart
    const inAssetTime = nextBlock.trimStartMs || 0

    return {
      block: nextBlock,
      isActive: false, // Not active yet
      inAssetTime,
      visibleStart,
      visibleEnd,
      visibleDuration,
      transforms: { ...nextBlock.transforms },
      cropRect: undefined // Simplified for now
    }
  }

  /**
   * Calculate total timeline duration based on visible windows
   */
  getTotalDuration(): number {
    if (this.blocks.length === 0) return 0

    return Math.max(...this.blocks.map(b => {
      const { visibleEnd } = this.getVisibleWindow(b)
      return visibleEnd
    }))
  }

  /**
   * Update blocks (for reactive updates)
   */
  updateBlocks(blocks: ConvexTimelineBlock[]) {
    this.blocks = blocks
  }

  /**
   * Get all blocks
   */
  getBlocks(): ConvexTimelineBlock[] {
    return this.blocks
  }

  /**
   * Check if a time falls within a trim block
   * Returns the trim block if found, null otherwise
   */
  getTrimBlockAt(timeMs: number): ConvexTimelineBlock | null {
    const trimBlock = this.blocks.find(
      b => b.blockType === "trim" &&
      timeMs >= b.startMs &&
      timeMs < (b.startMs + b.durationMs)
    )
    return trimBlock || null
  }
}
