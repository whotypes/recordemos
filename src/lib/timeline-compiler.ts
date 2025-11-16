import type { ConvexTimelineBlock } from "./types/timeline"

interface CompiledBlock {
  block: ConvexTimelineBlock
  isActive: boolean
  // Time offset within the asset (for video/audio blocks)
  inAssetTime: number
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
   * Get all active blocks and their computed state at a specific time
   */
  getStateAt(timeMs: number): TimelineState {
    const activeBlocks: CompiledBlock[] = []
    const trackLayers = new Map<string, CompiledBlock[]>()

    for (const block of this.blocks) {
      const blockEndMs = block.startMs + block.durationMs
      const isActive = timeMs >= block.startMs && timeMs < blockEndMs

      if (isActive) {
        // Calculate in-asset time for media blocks (video/audio)
        let inAssetTime = 0
        if (block.blockType === "video" || block.blockType === "audio") {
          // Time within the block
          const blockTime = timeMs - block.startMs
          // Apply trim offset
          inAssetTime = block.trimStartMs + blockTime

          // Ensure we don't exceed trim end
          const maxAssetTime = block.trimEndMs > 0
            ? block.trimEndMs
            : Number.MAX_SAFE_INTEGER
          inAssetTime = Math.min(inAssetTime, maxAssetTime)
        }

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
   * Get the active video block at current time (assumes single video track)
   */
  getActiveVideoBlock(timeMs: number): CompiledBlock | null {
    const state = this.getStateAt(timeMs)
    return state.activeBlocks.find(b => b.block.blockType === "video") || null
  }

  /**
   * Calculate total timeline duration
   */
  getTotalDuration(): number {
    if (this.blocks.length === 0) return 0

    return Math.max(...this.blocks.map(b => b.startMs + b.durationMs))
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
}
