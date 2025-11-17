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
  onBlockDragPreview?: (blockId: string, newStart: number) => void
  onBlockDragEnd: (blockId: string, newStart: number) => void
  onBlockResizeStart: (blockId: string, side: "left" | "right") => void
  onBlockResizeEnd: (blockId: string, newStart: number, newDuration: number) => void
  onBlockResizePreview?: (blockId: string, newStart: number, newDuration: number) => void
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
  onBlockDragPreview,
  onBlockDragEnd,
  onBlockResizeStart,
  onBlockResizeEnd,
  onBlockResizePreview,
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

    // adaptive step size based on pixelsPerSecond (which includes zoom)
    // higher pixelsPerSecond = more zoom = smaller steps (more markers)
    // estimate container width from pixelsPerSecond and videoDuration
    const estimatedWidth = pixelsPerSecond * videoDuration

    // target: ~8-12 markers visible, so pixels per marker
    const targetPixelsPerMarker = estimatedWidth / 10

    // step size in seconds = pixels per marker / pixels per second
    let step = targetPixelsPerMarker / pixelsPerSecond

    // round to nice values based on step size
    if (step >= 10) {
      step = 10
    } else if (step >= 5) {
      step = 5
    } else if (step >= 2) {
      step = 2
    } else if (step >= 1) {
      step = 1
    } else if (step >= 0.5) {
      step = 0.5
    } else if (step >= 0.25) {
      step = 0.25
    } else {
      step = 0.1
    }

    // ensure step doesn't exceed video duration and is at least 0.1
    step = Math.max(0.1, Math.min(step, videoDuration))

    for (let i = 0; i <= videoDuration; i += step) {
      const percentage = (i / videoDuration) * 100
      const minutes = Math.floor(i / 60)
      const seconds = Math.floor(i % 60)
      markers.push(
        <div
          key={i}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-px h-2 bg-border/40" />
          <span className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
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
                onDragPreview={onBlockDragPreview}
                onDragEnd={onBlockDragEnd}
                onResizeStart={onBlockResizeStart}
                onResizePreview={onBlockResizePreview}
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
                onDragPreview={onBlockDragPreview}
                onDragEnd={onBlockDragEnd}
                onResizeStart={onBlockResizeStart}
                onResizePreview={onBlockResizePreview}
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
