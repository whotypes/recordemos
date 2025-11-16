import { useTimelineBlocksStore } from "@/lib/timeline-blocks-store"
import { BlockData, convexBlockToTimelineBlock } from "@/lib/types/timeline"
import { useCompositionStore } from "@/lib/composition-store"
import { useMutation, useQuery } from "convex/react"
import { useCallback, useEffect, useMemo } from "react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

export const useTimelineBlocks = (
  projectId: Id<"projects"> | null,
  videoDuration: number,
  currentTime: number,
  selectedBlock: string | null,
  setSelectedBlock: (id: string | null) => void,
  onVideoBlockDelete?: () => void
) => {
  const { setCurrentProjectId } = useTimelineBlocksStore()
  const { updateBlocks } = useCompositionStore()

  useEffect(() => {
    setCurrentProjectId(projectId)
  }, [projectId, setCurrentProjectId])

  const convexBlocks = useQuery(
    api.timeline_blocks.list,
    projectId ? { projectId } : "skip"
  )

  const tracks = useQuery(
    api.timeline_tracks.list,
    projectId ? { projectId } : "skip"
  )

  const createBlock = useMutation(api.timeline_blocks.create)
  const updatePosition = useMutation(api.timeline_blocks.updatePosition)
  const updateSize = useMutation(api.timeline_blocks.updateSize)
  const updateTrim = useMutation(api.timeline_blocks.updateTrim)
  const removeBlock = useMutation(api.timeline_blocks.remove)
  const duplicateBlock = useMutation(api.timeline_blocks.duplicate)
  const initializeTracks = useMutation(api.timeline_tracks.initializeDefaultTracks)

  const trackMap = useMemo(() => {
    if (!tracks) return new Map<string, number>()
    const map = new Map<string, number>()
    tracks.forEach((track) => {
      map.set(track._id, track.order)
    })
    return map
  }, [tracks])

  const blocks = useMemo(() => {
    if (!convexBlocks || !tracks) return []
    return convexBlocks.map((block) =>
      convexBlockToTimelineBlock(block, trackMap.get(block.trackId) ?? 0)
    )
  }, [convexBlocks, tracks, trackMap])

  const overlayTrack = useMemo(() => {
    return tracks?.find((t) => t.kind === "overlay")
  }, [tracks])

  useEffect(() => {
    if (projectId && tracks && tracks.length === 0) {
      initializeTracks({ projectId })
    }
  }, [projectId, tracks, initializeTracks])

  // Update composition store when blocks change
  useEffect(() => {
    if (convexBlocks) {
      updateBlocks(convexBlocks)
    }
  }, [convexBlocks, updateBlocks])

  const handleBlockDragEnd = useCallback(async (blockId: string, newStart: number) => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return

    const blocksOnSameTrack = blocks.filter((b) => b.id !== blockId && b.track === block.track)

    let adjustedStart = newStart
    const blockEnd = newStart + block.duration

    for (const otherBlock of blocksOnSameTrack) {
      const otherEnd = otherBlock.start + otherBlock.duration

      if (newStart < otherEnd && blockEnd > otherBlock.start) {
        if (newStart < otherBlock.start) {
          adjustedStart = Math.max(0, otherBlock.start - block.duration)
        } else {
          adjustedStart = otherEnd
        }
      }
    }

    adjustedStart = Math.max(0, Math.min(videoDuration - block.duration, adjustedStart))

    await updatePosition({
      blockId: blockId as Id<"timeline_blocks">,
      startMs: Math.round(adjustedStart * 1000),
    })
  }, [blocks, videoDuration, updatePosition])

  const handleBlockResizeStart = useCallback((_blockId: string, _side: "left" | "right") => {
    // track which side is being resized if needed
  }, [])

  const handleBlockResizeEnd = useCallback(async (blockId: string, newStart: number, newDuration: number) => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return

    const blocksOnSameTrack = blocks.filter((b) => b.id !== blockId && b.track === block.track)

    let adjustedStart = newStart
    let adjustedDuration = newDuration
    const blockEnd = newStart + newDuration

    for (const otherBlock of blocksOnSameTrack) {
      const otherEnd = otherBlock.start + otherBlock.duration

      if (newStart < otherEnd && blockEnd > otherBlock.start) {
        if (newStart < block.start) {
          adjustedStart = Math.max(0, otherBlock.start - newDuration)
          adjustedDuration = block.start + block.duration - adjustedStart
        } else {
          adjustedDuration = Math.max(0.2, otherBlock.start - newStart)
        }
      }
    }

    adjustedStart = Math.max(0, adjustedStart)
    adjustedDuration = Math.max(0.2, Math.min(videoDuration - adjustedStart, adjustedDuration))

    await updateSize({
      blockId: blockId as Id<"timeline_blocks">,
      startMs: Math.round(adjustedStart * 1000),
      durationMs: Math.round(adjustedDuration * 1000),
    })
  }, [blocks, videoDuration, updateSize])

  const handleBlockDelete = useCallback(async (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return

    if (block.type === "video" && onVideoBlockDelete) {
      onVideoBlockDelete()
    }

    await removeBlock({ blockId: blockId as Id<"timeline_blocks"> })

    if (selectedBlock === blockId) {
      setSelectedBlock(null)
    }
  }, [blocks, removeBlock, selectedBlock, setSelectedBlock, onVideoBlockDelete])

  const handleBlockDuplicate = useCallback(async (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block || block.type === "video") return

    const newStart = Math.min(block.start + block.duration + 0.2, videoDuration - 0.5)

    await duplicateBlock({
      blockId: blockId as Id<"timeline_blocks">,
      newStartMs: Math.round(newStart * 1000),
    })
  }, [blocks, videoDuration, duplicateBlock])

  const handleAddBlock = useCallback(async (blockData: BlockData) => {
    if (!projectId || !overlayTrack) return

    await createBlock({
      projectId,
      trackId: overlayTrack._id,
      blockType: blockData.type,
      startMs: Math.round(Math.max(0, currentTime) * 1000),
      durationMs: Math.round(1.5 * 1000),
      metadata: {
        label: blockData.label,
        color: blockData.color,
        zoomLevel: blockData.zoomLevel,
        cropX: blockData.cropX,
        cropY: blockData.cropY,
        cropW: blockData.cropW,
        cropH: blockData.cropH,
      },
    })
  }, [projectId, overlayTrack, currentTime, createBlock])

  const handleBlockTrimStart = useCallback((_blockId: string, _side: "left" | "right") => {
    // Track which side is being trimmed if needed
  }, [])

  const handleBlockTrimEnd = useCallback(async (blockId: string, trimStartMs: number, trimEndMs: number) => {
    const block = convexBlocks?.find((b) => b._id === blockId)
    if (!block) return

    await updateTrim({
      blockId: blockId as Id<"timeline_blocks">,
      trimStartMs: Math.round(trimStartMs),
      trimEndMs: Math.round(trimEndMs),
    })
  }, [convexBlocks, updateTrim])

  return {
    blocks,
    convexBlocks,
    handleBlockDragEnd,
    handleBlockResizeStart,
    handleBlockResizeEnd,
    handleBlockDelete,
    handleBlockDuplicate,
    handleAddBlock,
    handleBlockTrimStart,
    handleBlockTrimEnd,
  }
}
