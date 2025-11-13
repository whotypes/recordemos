import { create } from "zustand"
import { TimelineBlock } from "./types/timeline"

interface TimelineBlocksState {
  blocks: TimelineBlock[]
  setBlocks: (blocks: TimelineBlock[]) => void
  updateBlockPosition: (blockId: string, start: number) => void
  updateBlockSize: (blockId: string, start: number, duration: number) => void
  // For smooth dragging - these are used during drag operations
  dragPositions: Map<string, { start: number; duration: number }>
  setDragPosition: (blockId: string, start: number, duration?: number) => void
  clearDragPositions: () => void
  // Get the effective position (drag position if dragging, otherwise actual position)
  getEffectiveBlock: (blockId: string) => TimelineBlock | undefined
}

export const useTimelineBlocksStore = create<TimelineBlocksState>((set, get) => ({
  blocks: [],
  setBlocks: (blocks) => set({ blocks }),

  updateBlockPosition: (blockId, start) =>
    set((state) => ({
      blocks: state.blocks.map((block) =>
        block.id === blockId ? { ...block, start } : block
      ),
    })),

  updateBlockSize: (blockId, start, duration) =>
    set((state) => ({
      blocks: state.blocks.map((block) =>
        block.id === blockId ? { ...block, start, duration } : block
      ),
    })),

  dragPositions: new Map(),

  setDragPosition: (blockId, start, duration) =>
    set((state) => {
      const newDragPositions = new Map(state.dragPositions)
      const existingBlock = state.blocks.find(b => b.id === blockId)
      if (existingBlock) {
        newDragPositions.set(blockId, {
          start,
          duration: duration ?? existingBlock.duration
        })
      }
      return { dragPositions: newDragPositions }
    }),

  clearDragPositions: () =>
    set({ dragPositions: new Map() }),

  getEffectiveBlock: (blockId) => {
    const state = get()
    const dragPosition = state.dragPositions.get(blockId)
    const actualBlock = state.blocks.find(b => b.id === blockId)

    if (dragPosition && actualBlock) {
      return {
        ...actualBlock,
        start: dragPosition.start,
        duration: dragPosition.duration,
      }
    }

    return actualBlock
  },
}))
