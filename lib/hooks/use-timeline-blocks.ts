import { useEffect, useState } from "react"
import { TimelineBlock, TRACK_MAP, BlockData } from "@/lib/types/timeline"

export const useTimelineBlocks = (
  videoDuration: number,
  currentTime: number,
  selectedBlock: string | null,
  setSelectedBlock: (id: string | null) => void,
  onVideoBlockDelete?: () => void
) => {
  const [blocks, setBlocks] = useState<TimelineBlock[]>([])
  const [hasCreatedBaseBlock, setHasCreatedBaseBlock] = useState(false)

  // Create base video block when video duration is available
  useEffect(() => {
    if (videoDuration > 0.1 && !hasCreatedBaseBlock) {
      const baseBlock: TimelineBlock = {
        id: "base-video",
        type: "video",
        label: "Video",
        start: 0,
        duration: videoDuration,
        color: "bg-primary/70",
        track: 0,
      }
      setBlocks([baseBlock])
      setHasCreatedBaseBlock(true)
    }
  }, [videoDuration, hasCreatedBaseBlock])

  const handleBlockDragMove = (blockId: string, newStart: number) => {
    if (blockId === "base-video") return
    setBlocks(blocks.map((b) => (b.id === blockId ? { ...b, start: newStart } : b)))
  }

  const handleBlockDragEnd = () => {
    // No state changes needed, just a completion callback
  }

  const handleBlockResizeStart = (blockId: string, side: "left" | "right") => {
    // This will be handled by the resize hook
  }

  const handleBlockResizeMove = (blockId: string, newStart: number, newDuration: number) => {
    setBlocks(blocks.map((b) => (b.id === blockId ? { ...b, start: newStart, duration: newDuration } : b)))
  }

  const handleBlockResizeEnd = () => {
    // This will be handled by the resize hook
  }

  const handleBlockDelete = (blockId: string) => {
    if (blockId === "base-video" && onVideoBlockDelete) {
      onVideoBlockDelete()
      setBlocks([])
      return
    }
    setBlocks(blocks.filter((b) => b.id !== blockId))
    if (selectedBlock === blockId) setSelectedBlock(null)
  }

  const handleBlockDuplicate = (blockId: string) => {
    if (blockId === "base-video") return
    const block = blocks.find((b) => b.id === blockId)!
    const newBlock: TimelineBlock = {
      ...block,
      id: `block-${Date.now()}`,
      start: Math.min(block.start + block.duration + 0.2, videoDuration - 0.5),
    }
    setBlocks([...blocks, newBlock])
  }

  const handleAddBlock = (blockData: BlockData) => {
    const newBlock: TimelineBlock = {
      id: `block-${Date.now()}`,
      ...blockData,
      start: Math.max(0, currentTime),
      duration: 1.5,
      track: TRACK_MAP[blockData.type] || 1,
    }
    setBlocks([...blocks, newBlock])
  }

  return {
    blocks,
    handleBlockDragMove,
    handleBlockDragEnd,
    handleBlockResizeStart,
    handleBlockResizeMove,
    handleBlockResizeEnd,
    handleBlockDelete,
    handleBlockDuplicate,
    handleAddBlock,
  }
}
