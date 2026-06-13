"use client"

import ScrubberTrack from "@/components/timeline/scrubber-track"
import TimelineCanvas from "@/components/timeline/timeline-canvas"
import PlaybackControls from "@/components/ui/playback-controls"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useTimelineScrubber } from "@/lib/hooks/use-timeline-scrubber"
import { useCompositionStore } from "@/lib/composition-store"
import { BlockData, TimelineBlock } from "@/lib/types/timeline"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { Move, Plus, ZoomIn } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { Id } from "../../convex/_generated/dataModel"

export interface TimelineBlockHandlers {
  handleBlockDragPreview?: (blockId: string, newStart: number) => void
  handleBlockDragEnd: (blockId: string, newStart: number) => void
  handleBlockResizeStart: (blockId: string, side: "left" | "right") => void
  handleBlockResizePreview?: (blockId: string, newStart: number, newDuration: number) => void
  handleBlockResizeEnd: (blockId: string, newStart: number, newDuration: number) => void
  handleBlockDelete: (blockId: string) => void
  handleBlockDuplicate: (blockId: string) => void
  handleAddBlock: (blockData: BlockData) => Promise<void>
  handleBlockTrimStart?: (blockId: string, side: "left" | "right") => void
  handleBlockTrimPreview?: (
    blockId: string,
    trimStartMs: number,
    trimEndMs: number,
    newStartMs?: number,
    newDurationMs?: number,
  ) => void
  handleBlockTrimEnd?: (
    blockId: string,
    trimStartMs: number,
    trimEndMs: number,
    newStartMs?: number,
    newDurationMs?: number,
  ) => void
  handleBlockSplit: (blockId: string, splitTimeMs: number) => void
  handleBlockUpdateMetadata?: (
    blockId: string,
    metadata: {
      cropX?: number
      cropY?: number
      cropW?: number
      cropH?: number
      zoomLevel?: number
    },
    persist?: boolean,
  ) => void
}

interface TimelineEditorProps {
  projectId: Id<"projects"> | null
  blocks: TimelineBlock[]
  timelineDuration: number
  blockHandlers: TimelineBlockHandlers
  currentTime: number
  setCurrentTime: (time: number) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  selectedBlock: string | null
  setSelectedBlock: (id: string | null) => void
  activeVideoBlockId: string | null
}

const BLOCK_TYPES = [
  {
    id: "crop",
    label: "Crop",
    icon: Move,
    description: "Crop & Pan",
    color: "bg-secondary"
  },
  {
    id: "zoom",
    label: "Zoom",
    icon: ZoomIn,
    description: "Zoom In",
    color: "bg-primary"
  },
]

export default function TimelineEditor({
  blocks,
  timelineDuration,
  blockHandlers,
  currentTime,
  setCurrentTime,
  isPlaying,
  setIsPlaying,
  selectedBlock,
  setSelectedBlock,
  activeVideoBlockId,
}: TimelineEditorProps) {
  const [isDraggingTime, setIsDraggingTime] = useState(false)
  const [showAddBlockPopover, setShowAddBlockPopover] = useState(false)
  const [pixelsPerSecond, setPixelsPerSecond] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrubberContainerRef = useRef<HTMLDivElement>(null)

  const loop = useVideoPlayerStore((state) => state.loop)
  const muted = useVideoPlayerStore((state) => state.muted)
  const setLoop = useVideoPlayerStore((state) => state.setLoop)
  const setMuted = useVideoPlayerStore((state) => state.setMuted)

  const clampedCurrentTime = Math.max(
    0,
    timelineDuration > 0 ? Math.min(currentTime, timelineDuration) : currentTime,
  )

  const scrubberSetCurrentTime = (time: number) => {
    const epsilon = 0.001
    const maxTime = timelineDuration > 0
      ? Math.max(0, timelineDuration - epsilon)
      : Math.max(0, time)
    setCurrentTime(Math.max(0, Math.min(maxTime, time)))
  }

  const scrubberHook = useTimelineScrubber(
    clampedCurrentTime,
    timelineDuration,
    scrubberSetCurrentTime,
    isDraggingTime,
    setIsDraggingTime
  )

  const handlePlayPause = () => {
    if (!isPlaying && timelineDuration > 0) {
      const epsilon = 0.001
      const isAtEnd = currentTime >= timelineDuration - epsilon
      if (isAtEnd) {
        const compiler = useCompositionStore.getState().compiler
        const startSec = (compiler?.getPlaybackStartMs() ?? 0) / 1000
        setCurrentTime(startSec)
      }
    }
    setIsPlaying(!isPlaying)
  }

  useLayoutEffect(() => {
    const el = scrubberContainerRef.current ?? scrubberHook.timelineRef.current
    if (!el) return

    const update = () => {
      if (timelineDuration > 0) {
        setPixelsPerSecond(el.clientWidth / timelineDuration)
      }
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [timelineDuration, scrubberHook.timelineRef])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedBlock) {
        e.preventDefault()
        blockHandlers.handleBlockDelete(selectedBlock)
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener("keydown", handleKeyDown)
      return () => container.removeEventListener("keydown", handleKeyDown)
    }
  }, [selectedBlock, blockHandlers])

  const hasVideo = blocks.length > 0

  const handleBlockClick = (_blockId: string, timeInBlock: number) => {
    setCurrentTime(Math.max(0, timeInBlock))
  }

  const handleAddBlockType = async (type: "crop" | "zoom" | "trim") => {
    const blockConfig = BLOCK_TYPES.find(bt => bt.id === type)
    if (!blockConfig) return

    const blockData: BlockData = {
      type: type === "crop" ? "pan" : type,
      label: blockConfig.label,
      color: blockConfig.color,
      ...(type === "zoom" && { zoomLevel: 1.5 }),
      ...(type === "crop" && { cropX: 10, cropY: 10, cropW: 80, cropH: 80 }),
    }

    await blockHandlers.handleAddBlock(blockData)
    setShowAddBlockPopover(false)
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="bg-card border-t border-border flex flex-col"
    >
      {hasVideo && (
        <div className="px-4 pt-3 pb-2 border-b border-border/50">
          <PlaybackControls
            hasVideo={hasVideo}
            currentTime={clampedCurrentTime}
            videoDuration={timelineDuration}
            isPlaying={isPlaying}
            loop={loop}
            muted={muted}
            onPlayPause={handlePlayPause}
            onSplit={() => {
              const splitTimeMs = Math.round(currentTime * 1000)
              if (selectedBlock) {
                blockHandlers.handleBlockSplit(selectedBlock, splitTimeMs)
              } else if (activeVideoBlockId) {
                blockHandlers.handleBlockSplit(activeVideoBlockId, splitTimeMs)
              }
            }}
            onSkipToStart={() => {
              const compiler = useCompositionStore.getState().compiler
              const startSec = (compiler?.getPlaybackStartMs() ?? 0) / 1000
              setCurrentTime(startSec)
            }}
            onToggleLoop={() => setLoop(!loop)}
            onToggleMute={() => setMuted(!muted)}
          />
        </div>
      )}

      {hasVideo && (
        <div ref={scrubberContainerRef} className="px-4 pt-3 pb-2">
          <ScrubberTrack
            videoDuration={timelineDuration}
            currentTime={clampedCurrentTime}
            onScrubberPointerDown={scrubberHook.handleScrubberPointerDown}
            progressRef={scrubberHook.progressRef}
            timelineRef={scrubberHook.timelineRef}
          />
        </div>
      )}

      {hasVideo && (
        <div className="px-4 py-3 flex items-center gap-3 border-b border-border/30">
          <Popover open={showAddBlockPopover} onOpenChange={setShowAddBlockPopover}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/80 hover:bg-accent text-accent-foreground text-xs font-medium rounded-md transition-colors">
                <Plus size={14} strokeWidth={2.5} />
                <span>Add Block</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <div className="space-y-1">
                {BLOCK_TYPES.map((blockType) => {
                  const Icon = blockType.icon
                  return (
                    <button
                      key={blockType.id}
                      onClick={() => handleAddBlockType(blockType.id as "crop" | "zoom" | "trim")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent/50 transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-md bg-accent/30 flex items-center justify-center group-hover:bg-accent/50 transition-colors">
                        <Icon size={16} className="text-foreground" strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{blockType.label}</div>
                        <div className="text-xs text-muted-foreground">{blockType.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {hasVideo && (
        <div className="px-4 py-4 overflow-hidden">
          <TimelineCanvas
            blocks={blocks}
            selectedBlock={selectedBlock}
            setSelectedBlock={setSelectedBlock}
            timelineDuration={timelineDuration}
            currentTime={clampedCurrentTime}
            pixelsPerSecond={pixelsPerSecond}
            onBlockClick={handleBlockClick}
            onSeek={scrubberSetCurrentTime}
            onBlockDragPreview={blockHandlers.handleBlockDragPreview}
            onBlockDragEnd={blockHandlers.handleBlockDragEnd}
            onBlockResizeStart={blockHandlers.handleBlockResizeStart}
            onBlockResizePreview={blockHandlers.handleBlockResizePreview}
            onBlockResizeEnd={blockHandlers.handleBlockResizeEnd}
            onBlockDelete={blockHandlers.handleBlockDelete}
            onBlockDuplicate={blockHandlers.handleBlockDuplicate}
            onBlockTrimStart={blockHandlers.handleBlockTrimStart}
            onBlockTrimPreview={blockHandlers.handleBlockTrimPreview}
            onBlockTrimEnd={blockHandlers.handleBlockTrimEnd}
            onBlockUpdateMetadata={blockHandlers.handleBlockUpdateMetadata}
          />
        </div>
      )}

      {!hasVideo && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">Record a video to start editing</p>
        </div>
      )}
    </div>
  )
}
