"use client"

import ScrubberTrack from "@/components/timeline/scrubber-track"
import TimelineCanvas from "@/components/timeline/timeline-canvas"
import PlaybackControls from "@/components/ui/playback-controls"
import { useTimelineBlocks } from "@/lib/hooks/use-timeline-blocks"
import { useTimelineScrubber } from "@/lib/hooks/use-timeline-scrubber"
import { Plus } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import AddBlockModal from "./add-block-modal"

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
  const [showAddBlockModal, setShowAddBlockModal] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Custom hooks
  const {
    blocks,
    handleBlockDragEnd,
    handleBlockResizeStart,
    handleBlockResizeEnd,
    handleBlockDelete,
    handleBlockDuplicate,
    handleAddBlock,
  } = useTimelineBlocks(
    projectId,
    videoDuration,
    currentTime,
    selectedBlock,
    setSelectedBlock,
    onVideoBlockDelete
  )

  const scrubberHook = useTimelineScrubber(
    currentTime,
    videoDuration,
    setCurrentTime,
    isDraggingTime,
    setIsDraggingTime
  )

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  // Keyboard delete support
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

  const getPixelsPerSecond = () => {
    if (!scrubberHook.timelineRef.current || videoDuration <= 0) return 1
    return scrubberHook.timelineRef.current.clientWidth / videoDuration
  }
  const pixelsPerSecond = getPixelsPerSecond()

  const handleBlockClick = (_blockId: string, timeInBlock: number) => {
    setCurrentTime(Math.max(0, Math.min(videoDuration, timeInBlock)))
  }

  return (
    <div ref={containerRef} tabIndex={0} className="bg-card p-4 flex flex-col gap-4">
      {/* Playback Controls */}
      {hasVideo && (
        <PlaybackControls
          hasVideo={hasVideo}
          currentTime={currentTime}
          videoDuration={videoDuration}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onSkipToStart={() => setCurrentTime(0)}
        />
      )}

      {/* Scrubber Track */}
      {hasVideo && (
        <ScrubberTrack
          videoDuration={videoDuration}
          currentTime={currentTime}
          isDraggingTime={isDraggingTime}
          onTimelineClick={scrubberHook.handleTimelineClick}
          onScrubberPointerDown={scrubberHook.handleScrubberPointerDown}
          progressRef={scrubberHook.progressRef}
          scrubRef={scrubberHook.scrubRef}
          timelineRef={scrubberHook.timelineRef}
        />
      )}

      {/* Timeline Controls */}
      {hasVideo && (
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setShowAddBlockModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold rounded transition-colors shrink-0"
          >
            <Plus size={12} /> Add Block
          </button>
          <p className="text-xs text-muted-foreground">
            Drag • Resize • Right-click
          </p>
        </div>
      )}

      {/* Timeline Canvas */}
      <TimelineCanvas
        blocks={blocks}
        selectedBlock={selectedBlock}
        setSelectedBlock={setSelectedBlock}
        videoDuration={videoDuration}
        pixelsPerSecond={pixelsPerSecond}
        onBlockClick={handleBlockClick}
        onBlockDragEnd={handleBlockDragEnd}
        onBlockResizeStart={handleBlockResizeStart}
        onBlockResizeEnd={handleBlockResizeEnd}
        onBlockDelete={handleBlockDelete}
        onBlockDuplicate={handleBlockDuplicate}
        timelineIndicatorRef={scrubberHook.timelineIndicatorRef}
      />

      {/* Add Block Modal */}
      {hasVideo && (
        <AddBlockModal
          isOpen={showAddBlockModal}
          onClose={() => setShowAddBlockModal(false)}
          onAddBlock={handleAddBlock}
          currentTime={currentTime}
        />
      )}

      {/* Empty State */}
      {!hasVideo && (
        <div className="text-center py-8">
          <p className="text-xs text-muted-foreground">Record a video to start editing</p>
        </div>
      )}
    </div>
  )
}
