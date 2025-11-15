import { useTimelineBlocksStore } from "@/lib/timeline-blocks-store"
import { BlockData, convexBlockToTimelineBlock } from "@/lib/types/timeline"
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

  const handleBlockDragEnd = useCallback(async (blockId: string, newStart: number) => {
    await updatePosition({
      blockId: blockId as Id<"timeline_blocks">,
      startMs: Math.round(newStart * 1000),
    })
  }, [updatePosition])

  const handleBlockResizeStart = useCallback((_blockId: string, _side: "left" | "right") => {
    // track which side is being resized if needed
  }, [])

  const handleBlockResizeEnd = useCallback(async (blockId: string, newStart: number, newDuration: number) => {
    await updateSize({
      blockId: blockId as Id<"timeline_blocks">,
      startMs: Math.round(newStart * 1000),
      durationMs: Math.round(newDuration * 1000),
    })
  }, [updateSize])

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

  return {
    blocks,
    handleBlockDragEnd,
    handleBlockResizeStart,
    handleBlockResizeEnd,
    handleBlockDelete,
    handleBlockDuplicate,
    handleAddBlock,
  }
}
