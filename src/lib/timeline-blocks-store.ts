import { create } from "zustand"
import type { Id } from "../../convex/_generated/dataModel"

interface TimelineBlocksState {
  currentProjectId: Id<"projects"> | null
  setCurrentProjectId: (projectId: Id<"projects"> | null) => void
}

export const useTimelineBlocksStore = create<TimelineBlocksState>((set) => ({
  currentProjectId: null,
  setCurrentProjectId: (projectId) => set({ currentProjectId: projectId }),
}))
