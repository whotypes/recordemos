import { TimelineBlock } from "@/lib/types/timeline"
import { useEffect, useRef } from "react"
import TimelineBlockComponent from "../timeline-block"

interface TimelineCanvasProps {
  blocks: TimelineBlock[]
  selectedBlock: string | null
  setSelectedBlock: (id: string | null) => void
  videoDuration: number
  currentTime: number
  pixelsPerSecond: number
  onBlockClick: (blockId: string, timeInBlock: number) => void
  onBlockDragEnd: (blockId: string, newStart: number) => void
  onBlockResizeStart: (blockId: string, side: "left" | "right") => void
  onBlockResizeEnd: (blockId: string, newStart: number, newDuration: number) => void
  onBlockDelete: (blockId: string) => void
  onBlockDuplicate: (blockId: string) => void
  onBlockTrimStart?: (blockId: string, side: "left" | "right") => void
  onBlockTrimEnd?: (blockId: string, trimStartMs: number, trimEndMs: number) => void
  timelineIndicatorRef: React.RefObject<HTMLDivElement | null>
}

export default function TimelineCanvas({
  blocks,
  selectedBlock,
  setSelectedBlock,
  videoDuration,
  currentTime,
  pixelsPerSecond,
  onBlockClick,
  onBlockDragEnd,
  onBlockResizeStart,
  onBlockResizeEnd,
  onBlockDelete,
  onBlockDuplicate,
  onBlockTrimStart,
  onBlockTrimEnd,
  timelineIndicatorRef,
}: TimelineCanvasProps) {
  const playheadRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | undefined>(undefined)

  const hasVideo = blocks.length > 0
  const videoBlocks = blocks.filter(b => b.type === "video")
  const overlayBlocks = blocks.filter(b => b.type !== "video")

  const selectedBlockData = blocks.find(b => b.id === selectedBlock)

  const blockTypeToTrack: Record<string, number> = {
    zoom: 1,
    pan: 2,
    trim: 3,
  }

  const uniqueOverlayTypes = new Set(overlayBlocks.map(b => b.type))
  const trackCount = uniqueOverlayTypes.size

  useEffect(
    () => {
      const updatePlayhead = () => {
        if (!playheadRef.current || videoDuration <= 0) return

        const percentage = Math.max(0, Math.min(100, (currentTime / videoDuration) * 100))
        playheadRef.current.style.left = `${percentage}%`

        if (timelineIndicatorRef.current) {
          timelineIndicatorRef.current.style.left = `${percentage}%`
        }
      }

      const animate = () => {
        updatePlayhead()
        rafRef.current = requestAnimationFrame(animate)
      }

      const id = requestAnimationFrame(animate)
      rafRef.current = id

      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }
      }
    },
    [currentTime, videoDuration, timelineIndicatorRef]
  )

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setSelectedBlock(null)
    }
  }

  const renderTimeMarkers = () => {
    const markers = []
    const step = videoDuration > 30 ? 5 : videoDuration > 10 ? 2 : 1

    for (let i = 0; i <= videoDuration; i += step) {
      const percentage = (i / videoDuration) * 100
      markers.push(
        <div
          key={i}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-px h-2 bg-border/40" />
          <span className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
            {i.toFixed(0).padStart(2, '0')}:{((i % 1) * 60).toFixed(0).padStart(2, '0')}
          </span>
        </div>
      )
    }
    return markers
  }

  return (
    <div className="space-y-3">
      <div className="relative h-8 border-b border-border/30">
        {hasVideo && renderTimeMarkers()}
      </div>

      <div
        onClick={handleTimelineClick}
        className="relative bg-muted/30 rounded-lg border border-border/50 overflow-visible"
        style={{
          height: `${hasVideo ? 68 + trackCount * 64 : 0}px`,
          minHeight: hasVideo ? '68px' : '0px'
        }}
      >
        {selectedBlockData && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-0"
            style={{
              left: `${(selectedBlockData.start / videoDuration) * 100}%`,
              width: `${(selectedBlockData.duration / videoDuration) * 100}%`,
              background: 'repeating-linear-gradient(45deg, hsl(var(--muted)), hsl(var(--muted)) 10px, hsl(var(--muted) / 0.5) 10px, hsl(var(--muted) / 0.5) 20px)',
            }}
          />
        )
        }

        <div className="relative w-full h-full">
          {videoBlocks.map((block) => {
            const blocksOnSameTrack = videoBlocks
              .filter(b => b.id !== block.id && b.track === block.track)
              .map(b => ({ id: b.id, start: b.start, duration: b.duration }))

            return (
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
                onTrimStart={onBlockTrimStart}
                onTrimEnd={onBlockTrimEnd}
                totalDuration={videoDuration}
                pixelsPerSecond={pixelsPerSecond}
                blocksOnSameTrack={blocksOnSameTrack}
              />
            )
          })}

          {overlayBlocks.map((block) => {
            const trackNumber = blockTypeToTrack[block.type] ?? 1
            const blocksOnSameTrack = overlayBlocks
              .filter(b => b.id !== block.id && blockTypeToTrack[b.type] === trackNumber)
              .map(b => ({ id: b.id, start: b.start, duration: b.duration }))

            return (
              <TimelineBlockComponent
                key={block.id}
                block={{ ...block, track: trackNumber }}
                isSelected={selectedBlock === block.id}
                onSelect={() => setSelectedBlock(block.id)}
                onBlockClick={(blockId, timeInBlock) => onBlockClick(blockId, timeInBlock)}
                onDragEnd={onBlockDragEnd}
                onResizeStart={onBlockResizeStart}
                onResizeEnd={onBlockResizeEnd}
                onDelete={onBlockDelete}
                onDuplicate={onBlockDuplicate}
                onTrimStart={onBlockTrimStart}
                onTrimEnd={onBlockTrimEnd}
                totalDuration={videoDuration}
                pixelsPerSecond={pixelsPerSecond}
                blocksOnSameTrack={blocksOnSameTrack}
              />
            )
          })}
        </div>

        {hasVideo && (
          <div
            ref={playheadRef}
            className="absolute top-0 bottom-0 w-0.5 bg-secondary pointer-events-none z-50"
            style={{
              left: `${videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0}%`,
              boxShadow: '0 0 8px hsl(var(--secondary) / 0.5)'
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full">
              <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-secondary" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
