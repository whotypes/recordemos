import { TimelineBlock } from "@/lib/types/timeline"
import TimelineBlockComponent from "../timeline-block"

interface TimelineCanvasProps {
  blocks: TimelineBlock[]
  selectedBlock: string | null
  setSelectedBlock: (id: string | null) => void
  videoDuration: number
  pixelsPerSecond: number
  onBlockClick: (blockId: string, timeInBlock: number) => void
  onBlockDragEnd: (blockId: string, newStart: number) => void
  onBlockResizeStart: (blockId: string, side: "left" | "right") => void
  onBlockResizeEnd: (blockId: string, newStart: number, newDuration: number) => void
  onBlockDelete: (blockId: string) => void
  onBlockDuplicate: (blockId: string) => void
  timelineIndicatorRef: React.RefObject<HTMLDivElement | null>
}

export default function TimelineCanvas({
  blocks,
  selectedBlock,
  setSelectedBlock,
  videoDuration,
  pixelsPerSecond,
  onBlockClick,
  onBlockDragEnd,
  onBlockResizeStart,
  onBlockResizeEnd,
  onBlockDelete,
  onBlockDuplicate,
  timelineIndicatorRef,
}: TimelineCanvasProps) {
  const hasVideo = blocks.length > 0
  const maxTracks = Math.max(...blocks.map((b) => b.track || 0), 0) + 1

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setSelectedBlock(null)
    }
  }

  return (
    <div
      onClick={handleTimelineClick}
      className="relative bg-muted rounded border border-border/50 overflow-hidden cursor-pointer"
      style={{ height: `${hasVideo ? 40 + maxTracks * 52 : 0}px` }}
    >
      <div className="relative w-full h-full">
        {blocks.map((block) => (
          <TimelineBlockComponent
            key={block.id}
            block={block}
            isSelected={selectedBlock === block.id}
            onSelect={() => setSelectedBlock(block.id)}
            onBlockClick={(blockId, timeInBlock) => onBlockClick(blockId, timeInBlock)}
            onDragEnd={onBlockDragEnd}
            onResizeStart={onBlockResizeStart}
            onResizeEnd={onBlockResizeEnd}
            onDelete={onBlockDelete}
            onDuplicate={onBlockDuplicate}
            totalDuration={videoDuration}
            pixelsPerSecond={pixelsPerSecond}
          />
        ))}
      </div>

      {hasVideo && (
        <div
          ref={timelineIndicatorRef}
          className="absolute top-0 bottom-0 w-0.5 bg-accent pointer-events-none"
          style={{ left: `${videoDuration > 0 ? 0 : 0}%` }}
        />
      )}
    </div>
  )
}
