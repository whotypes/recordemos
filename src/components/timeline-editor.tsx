"use client"

import ScrubberTrack from "@/components/timeline/scrubber-track"
import TimelineCanvas from "@/components/timeline/timeline-canvas"
import PlaybackControls from "@/components/ui/playback-controls"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCompositionStore } from "@/lib/composition-store"
import { useTimelineBlocks } from "@/lib/hooks/use-timeline-blocks"
import { useTimelineScrubber } from "@/lib/hooks/use-timeline-scrubber"
import { BlockData } from "@/lib/types/timeline"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { Move, Plus, Scissors, ZoomIn } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { Id } from "../../convex/_generated/dataModel"

interface TimelineEditorProps {
  projectId: Id<"projects"> | null
  currentTime: number
  setCurrentTime: (time: number) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  selectedBlock: string | null
  setSelectedBlock: (id: string | null) => void
  videoDuration: number
  onVideoBlockDelete?: () => void
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
  {
    id: "trim",
    label: "Trim",
    icon: Scissors,
    description: "Cut segment",
    color: "bg-destructive"
  },
]

export default function TimelineEditor({
  projectId,
  currentTime,
  setCurrentTime,
  isPlaying,
  setIsPlaying,
  selectedBlock,
  setSelectedBlock,
  videoDuration,
  onVideoBlockDelete,
}: TimelineEditorProps) {
  const [isDraggingTime, setIsDraggingTime] = useState(false)
  const [showAddBlockPopover, setShowAddBlockPopover] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const loop = useVideoPlayerStore((state) => state.loop)
  const muted = useVideoPlayerStore((state) => state.muted)
  const setLoop = useVideoPlayerStore((state) => state.setLoop)
  const setMuted = useVideoPlayerStore((state) => state.setMuted)

  const activeVideoBlock = useCompositionStore((state) => state.activeVideoBlock)

  const {
    blocks,
    handleBlockDragPreview,
    handleBlockDragEnd,
    handleBlockResizeStart,
    handleBlockResizePreview,
    handleBlockResizeEnd,
    handleBlockDelete,
    handleBlockDuplicate,
    handleAddBlock,
    handleBlockTrimStart,
    handleBlockTrimEnd,
  } = useTimelineBlocks(
    projectId,
    videoDuration,
    currentTime,
    selectedBlock,
    setSelectedBlock,
    onVideoBlockDelete
  )

  const hasActiveWindow =
    !!activeVideoBlock && activeVideoBlock.visibleDuration > 0

  const windowStartSeconds = hasActiveWindow ? activeVideoBlock.visibleStart / 1000 : 0
  const windowDurationSeconds = hasActiveWindow
    ? activeVideoBlock.visibleDuration / 1000
    : videoDuration

  // for playback controls in sliding-window mode:
  // show time relative to the visible window start, not the raw video start
  const playbackControlsCurrentTime = hasActiveWindow
    ? Math.max(0, Math.min(windowDurationSeconds, currentTime - windowStartSeconds))
    : currentTime

  const scrubberCurrentTime = hasActiveWindow
    ? Math.max(0, Math.min(windowDurationSeconds, currentTime - windowStartSeconds))
    : currentTime

  const scrubberSetCurrentTime = (time: number) => {
    if (hasActiveWindow) {
      if (windowDurationSeconds <= 0) {
        setCurrentTime(windowStartSeconds)
        return
      }

      const epsilon = 0.001
      const maxWindowTime = Math.max(0, windowDurationSeconds - epsilon)
      const clampedTime = Math.max(0, Math.min(maxWindowTime, time))

      setCurrentTime(windowStartSeconds + clampedTime)
      return
    }

    setCurrentTime(Math.max(0, time))
  }

  const scrubberHook = useTimelineScrubber(
    scrubberCurrentTime,
    windowDurationSeconds,
    scrubberSetCurrentTime,
    isDraggingTime,
    setIsDraggingTime
  )

  const handlePlayPause = () => {
    if (!isPlaying && hasActiveWindow) {
      const epsilon = 0.001
      const windowEndSeconds = windowStartSeconds + windowDurationSeconds
      const isAtWindowEnd = currentTime >= windowEndSeconds - epsilon

      if (isAtWindowEnd) {
        setCurrentTime(windowStartSeconds)
      }
    }

    setIsPlaying(!isPlaying)
  }

  const handleToggleLoop = () => {
    setLoop(!loop)
  }

  const handleToggleMute = () => {
    setMuted(!muted)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedBlock) {
        e.preventDefault()
        handleBlockDelete(selectedBlock)
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener("keydown", handleKeyDown)
      return () => container.removeEventListener("keydown", handleKeyDown)
    }
  }, [selectedBlock, handleBlockDelete])

  const hasVideo = blocks.length > 0

  // calculate pixelsPerSecond
  const timelineEl = scrubberHook.timelineRef.current
  const pixelsPerSecond = timelineEl && videoDuration > 0
    ? timelineEl.clientWidth / videoDuration
    : 1

  const handleBlockClick = (_blockId: string, timeInBlock: number) => {
    // allow clicking anywhere on timeline, no clamping to video duration
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

    await handleAddBlock(blockData)
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
            currentTime={playbackControlsCurrentTime}
            videoDuration={windowDurationSeconds}
            isPlaying={isPlaying}
            loop={loop}
            muted={muted}
            onPlayPause={handlePlayPause}
            onSkipToStart={() => {
              if (hasActiveWindow) {
                setCurrentTime(windowStartSeconds)
                return
              }
              setCurrentTime(0)
            }}
            onToggleLoop={handleToggleLoop}
            onToggleMute={handleToggleMute}
          />
        </div>
      )}

      {hasVideo && (
        <div className="px-4 pt-3 pb-2">
          <ScrubberTrack
            videoDuration={windowDurationSeconds}
            currentTime={scrubberCurrentTime}
            onTimelineClick={scrubberHook.handleTimelineClick}
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

          <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Click</kbd>
            <span>·</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Drag</kbd>
            <span>·</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Right-click</kbd>
          </div>
        </div>
      )}

      {hasVideo && (
        <div className="px-4 py-4 overflow-hidden">
          <TimelineCanvas
            blocks={blocks}
            selectedBlock={selectedBlock}
            setSelectedBlock={setSelectedBlock}
            videoDuration={videoDuration}
            currentTime={currentTime}
            pixelsPerSecond={pixelsPerSecond}
            onBlockClick={handleBlockClick}
            onBlockDragPreview={handleBlockDragPreview}
            onBlockDragEnd={handleBlockDragEnd}
            onBlockResizeStart={handleBlockResizeStart}
            onBlockResizePreview={handleBlockResizePreview}
            onBlockResizeEnd={handleBlockResizeEnd}
            onBlockDelete={handleBlockDelete}
            onBlockDuplicate={handleBlockDuplicate}
            onBlockTrimStart={handleBlockTrimStart}
            onBlockTrimEnd={handleBlockTrimEnd}
            timelineIndicatorRef={scrubberHook.timelineIndicatorRef}
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
