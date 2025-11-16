import { create } from "zustand"
import type { ConvexTimelineBlock } from "./types/timeline"
import type { Id } from "convex/_generated/dataModel"

interface LocalTimelineTrack {
  id: string
  kind: "video" | "overlay" | "audio"
  order: number
}

interface LocalTimelineState {
  // local blocks (used when cloud is off)
  localBlocks: ConvexTimelineBlock[]
  localTracks: LocalTimelineTrack[]

  // methods
  initializeLocalTimeline: (videoDuration: number) => void
  addLocalBlock: (block: Omit<ConvexTimelineBlock, "_id" | "_creationTime" | "projectId">) => string
  updateLocalBlock: (blockId: string, updates: Partial<ConvexTimelineBlock>) => void
  removeLocalBlock: (blockId: string) => void
  clearLocalTimeline: () => void
  getLocalBlock: (blockId: string) => ConvexTimelineBlock | undefined
}

// generate a fake ID for local blocks
const generateLocalId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const useLocalTimelineStore = create<LocalTimelineState>((set, get) => ({
  localBlocks: [],
  localTracks: [],

  initializeLocalTimeline: (videoDuration: number) => {
    // create default tracks
    const tracks: LocalTimelineTrack[] = [
      { id: "local_track_video", kind: "video", order: 0 },
      { id: "local_track_overlay", kind: "overlay", order: 1 },
      { id: "local_track_audio", kind: "audio", order: 2 },
    ]

    // create initial video block spanning full duration
    const videoBlock: ConvexTimelineBlock = {
      _id: generateLocalId() as Id<"timeline_blocks">,
      _creationTime: Date.now(),
      projectId: "local" as Id<"projects">,
      trackId: "local_track_video" as Id<"timeline_tracks">,
      blockType: "video",
      startMs: 0,
      durationMs: videoDuration * 1000,
      trimStartMs: 0,
      trimEndMs: 0,
      zIndex: 0,
      transforms: {
        scale: 1,
        x: 0,
        y: 0,
        opacity: 1,
        rotation: 0,
      },
      metadata: {},
      assetId: "local_asset" as Id<"assets">,
    }

    set({
      localTracks: tracks,
      localBlocks: [videoBlock],
    })
  },

  addLocalBlock: (blockData) => {
    const blockId = generateLocalId()
    const newBlock: ConvexTimelineBlock = {
      ...blockData,
      _id: blockId as Id<"timeline_blocks">,
      _creationTime: Date.now(),
      projectId: "local" as Id<"projects">,
    }

    set((state) => ({
      localBlocks: [...state.localBlocks, newBlock],
    }))

    return blockId
  },

  updateLocalBlock: (blockId, updates) => {
    set((state) => ({
      localBlocks: state.localBlocks.map((block) =>
        block._id === blockId ? { ...block, ...updates } : block
      ),
    }))
  },

  removeLocalBlock: (blockId) => {
    set((state) => ({
      localBlocks: state.localBlocks.filter((block) => block._id !== blockId),
    }))
  },

  clearLocalTimeline: () => {
    set({
      localBlocks: [],
      localTracks: [],
    })
  },

  getLocalBlock: (blockId) => {
    return get().localBlocks.find((block) => block._id === blockId)
  },
}))
