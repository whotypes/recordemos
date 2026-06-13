"use client"

import { usePlayheadStore } from "@/lib/playhead-store"
import { computeResizeBounds, computeValidGaps, constrainToValidGaps } from "@/lib/timeline-gap-solver"
import ZoomMinimap from "@/components/timeline/zoom-minimap"
import { Copy, GripVertical, Trash2 } from "lucide-react"
import type React from "react"
import { useEffect, useRef, useState } from "react"

interface TimelineBlockProps {
  block: {
    id: string
    type: string
    label: string
    start: number
    duration: number
    color: string
    track?: number
    trimStart?: number
    trimEnd?: number
    zoomLevel?: number
    cropX?: number
    cropY?: number
    cropW?: number
    cropH?: number
  }
  isSelected: boolean
  onSelect: () => void
  onDragPreview?: (blockId: string, newStart: number) => void
  onDragEnd: (blockId: string, newStart: number) => void
  onResizeStart: (blockId: string, side: "left" | "right") => void
  onResizePreview?: (blockId: string, newStart: number, newDuration: number) => void
  onResizeEnd: (blockId: string, newStart: number, newDuration: number) => void
  onTrimStart?: (blockId: string, side: "left" | "right") => void
  onTrimPreview?: (
    blockId: string,
    trimStartMs: number,
    trimEndMs: number,
    newStartMs?: number,
    newDurationMs?: number,
  ) => void
  onTrimEnd?: (blockId: string, trimStartMs: number, trimEndMs: number, newStartMs?: number, newDurationMs?: number) => void
  onDelete: (blockId: string) => void
  onDuplicate: (blockId: string) => void
  onUpdateMetadata?: (
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
  onBlockClick?: (blockId: string, timeInBlock: number) => void
  totalDuration: number
  pixelsPerSecond: number
  blocksOnSameTrack?: Array<{
    id: string
    start: number
    duration: number
  }>
}

export default function TimelineBlock({
  block,
  isSelected,
  onSelect,
  onDragPreview,
  onDragEnd,
  onResizeStart,
  onResizePreview,
  onResizeEnd,
  onDelete,
  onDuplicate,
  onUpdateMetadata,
  onBlockClick,
  onTrimStart,
  onTrimPreview,
  onTrimEnd,
  totalDuration,
  pixelsPerSecond,
  blocksOnSameTrack = [],
}: TimelineBlockProps) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const blockRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const isResizingRef = useRef<"left" | "right" | null>(null)
  const isTrimmingRef = useRef<"left" | "right" | null>(null)
  const rafRef = useRef<number | undefined>(undefined)

  const { playheadMs, setPlayheadMs } = usePlayheadStore()

  const MIN_BLOCK_PX = 56
  const startPercent = (block.start / totalDuration) * 100
  const widthPercent = (block.duration / totalDuration) * 100
  const track = block.track || 0

  const isZoom = block.type === "zoom"
  const zoomLevel = block.zoomLevel && block.zoomLevel > 0 ? block.zoomLevel : 1.5
  // Focus center derived from crop rect (defaults to centered).
  const cropW = block.cropW ?? 100 / zoomLevel
  const cropH = block.cropH ?? 100 / zoomLevel
  const focusX = block.cropX !== undefined ? block.cropX + cropW / 2 : 50
  const focusY = block.cropY !== undefined ? block.cropY + cropH / 2 : 50

  const commitFocus = (fx: number, fy: number, persist: boolean) => {
    const w = 100 / zoomLevel
    const h = 100 / zoomLevel
    const nextCropX = Math.min(100 - w, Math.max(0, fx - w / 2))
    const nextCropY = Math.min(100 - h, Math.max(0, fy - h / 2))
    onUpdateMetadata?.(
      block.id,
      {
        cropX: nextCropX,
        cropY: nextCropY,
        cropW: w,
        cropH: h,
        zoomLevel,
      },
      persist,
    )
  }

  useEffect(
    () => {
      if (!blockRef.current) return

      blockRef.current.style.left = `min(${startPercent}%, calc(100% - ${MIN_BLOCK_PX}px))`
      blockRef.current.style.width = `${widthPercent}%`
    },
    [startPercent, widthPercent]
  )

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuPos({ x: e.clientX, y: e.clientY })
  }

  const handleBlockPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    if (isDraggingRef.current || isResizingRef.current || !blockRef.current) {
      setMenuPos(null)
      return
    }

    onSelect()

    isDraggingRef.current = true
    const startX = e.clientX
    const startPos = block.start

    const originalTransition = blockRef.current.style.transition
    blockRef.current.style.transition = "none"

    const validGaps = computeValidGaps(
      blocksOnSameTrack,
      totalDuration,
      block.duration
    )

    let lastLeft = startPercent

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current || !blockRef.current) return

      const deltaX = moveEvent.clientX - startX
      const timeDelta = deltaX / pixelsPerSecond
      const desiredStart = startPos + timeDelta

      const newStart = constrainToValidGaps(
        desiredStart,
        block.duration,
        validGaps
      )

      if (newStart === null) return

      // clamp to prevent overflow: ensure block stays within timeline bounds
      const clampedStart = Math.max(0, Math.min(newStart, totalDuration - block.duration))
      const clampedPercent = (clampedStart / totalDuration) * 100
      lastLeft = clampedPercent

      if (onDragPreview) {
        onDragPreview(block.id, clampedStart)
      }

      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        if (blockRef.current) {
          blockRef.current.style.left = `min(${clampedPercent}%, calc(100% - ${MIN_BLOCK_PX}px))`
        }
      })
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (!isDraggingRef.current || !blockRef.current) return
      isDraggingRef.current = false

      const finalStart = (lastLeft / 100) * totalDuration

      blockRef.current.style.transition = originalTransition

      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)

      const deltaX = Math.abs(upEvent.clientX - e.clientX)
      const deltaY = Math.abs(upEvent.clientY - e.clientY)

      if (deltaX < 5 && deltaY < 5) {
        const blockRect = blockRef.current.getBoundingClientRect()
        const clickX = e.clientX - blockRect.left
        const percentage = Math.max(0, Math.min(1, clickX / blockRect.width))
        const timeInBlock = block.start + percentage * block.duration
        onBlockClick?.(block.id, timeInBlock)
      } else {
        // Handle block move
        onDragEnd(block.id, finalStart)

        // If this is a video block and playhead was inside it, adjust playhead
        if (block.type === "video") {
          const oldVisibleStart = block.start * 1000
          const oldVisibleEnd = (block.start + block.duration) * 1000

          if (playheadMs >= oldVisibleStart && playheadMs < oldVisibleEnd) {
            const offsetInside = playheadMs - oldVisibleStart
            const newVisibleStart = finalStart * 1000
            const newVisibleEnd = (finalStart + block.duration) * 1000
            const newPlayhead = Math.min(newVisibleStart + offsetInside, newVisibleEnd - 1)

            setPlayheadMs(newPlayhead, "block-move")
          }
        }
      }
    }

    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
  }

  const handleResizeDown = (e: React.PointerEvent, side: "left" | "right") => {
    e.preventDefault()
    e.stopPropagation()

    if (block.type === "video") return

    if (isDraggingRef.current || isResizingRef.current || !blockRef.current) return

    isResizingRef.current = side
    onResizeStart(block.id, side)

    const startX = e.clientX
    const startPos = block.start
    const startDuration = block.duration

    const originalTransition = blockRef.current.style.transition
    blockRef.current.style.transition = "none"

    const bounds = computeResizeBounds(
      { id: block.id, start: block.start, duration: block.duration },
      blocksOnSameTrack,
      side
    )

    let lastLeft = startPercent
    let lastWidth = widthPercent

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isResizingRef.current || !blockRef.current) return

      const deltaX = moveEvent.clientX - startX
      const timeDelta = deltaX / pixelsPerSecond

      if (side === "left") {
        let newStart = startPos + timeDelta
        newStart = Math.max(bounds.min, Math.min(bounds.max, newStart))

        const newDuration = (startPos + startDuration) - newStart
        const clampedDuration = Math.max(0.2, newDuration)
        const clampedStart = startPos + startDuration - clampedDuration

        // clamp to prevent overflow: ensure block stays within timeline bounds
        const finalStart = Math.max(0, Math.min(clampedStart, totalDuration - clampedDuration))
        const finalDuration = Math.min(clampedDuration, totalDuration - finalStart)

        const newPercent = (finalStart / totalDuration) * 100
        const newWidthPercent = (finalDuration / totalDuration) * 100

        lastLeft = newPercent
        lastWidth = newWidthPercent

        if (onResizePreview) {
          onResizePreview(block.id, finalStart, finalDuration)
        }

        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          if (blockRef.current) {
            blockRef.current.style.left = `min(${newPercent}%, calc(100% - ${MIN_BLOCK_PX}px))`
            blockRef.current.style.width = `${newWidthPercent}%`
          }
        })
      } else {
        let newEnd = startPos + startDuration + timeDelta
        newEnd = Math.max(bounds.min, Math.min(bounds.max, newEnd))

        const newDuration = newEnd - startPos
        const clampedDuration = Math.max(0.2, newDuration)

        // clamp to prevent overflow: ensure block stays within timeline bounds
        const finalStart = Math.max(0, Math.min(startPos, totalDuration - clampedDuration))
        const finalDuration = Math.min(clampedDuration, totalDuration - finalStart)

        const newWidthPercent = (finalDuration / totalDuration) * 100

        lastLeft = (finalStart / totalDuration) * 100
        lastWidth = newWidthPercent

        if (onResizePreview) {
          onResizePreview(block.id, finalStart, finalDuration)
        }

        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          if (blockRef.current) {
            blockRef.current.style.left = `min(${(finalStart / totalDuration) * 100}%, calc(100% - ${MIN_BLOCK_PX}px))`
            blockRef.current.style.width = `${newWidthPercent}%`
          }
        })
      }
    }

    const handlePointerUp = () => {
      if (!isResizingRef.current || !blockRef.current) return
      isResizingRef.current = null

      const finalStart = (lastLeft / 100) * totalDuration
      const finalDuration = (lastWidth / 100) * totalDuration

      blockRef.current.style.transition = originalTransition

      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)

      onResizeEnd(block.id, finalStart, finalDuration)

      // If this is a video block and playhead was inside it, adjust playhead if needed
      if (block.type === "video") {
        const oldVisibleStart = block.start * 1000
        const oldVisibleEnd = (block.start + block.duration) * 1000
        const newVisibleStart = finalStart * 1000
        const newVisibleEnd = (finalStart + finalDuration) * 1000

        if (playheadMs >= oldVisibleStart && playheadMs < oldVisibleEnd) {
          const newPlayhead = Math.max(
            newVisibleStart,
            Math.min(newVisibleEnd - 1, playheadMs),
          )

          if (Math.abs(newPlayhead - playheadMs) > 10) {
            setPlayheadMs(newPlayhead, "block-move")
          }
        }
      }
    }

    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
  }

  const handleTrimDown = (e: React.PointerEvent, side: "left" | "right") => {
    e.preventDefault()
    e.stopPropagation()

    if (isDraggingRef.current || isResizingRef.current || isTrimmingRef.current || !blockRef.current) return

    isTrimmingRef.current = side

    // Pause playback when trimming starts using playhead store
    const { isPlaying: wasPlaying, setIsPlaying } = usePlayheadStore.getState()
    if (wasPlaying) {
      setIsPlaying(false)
    }

    onTrimStart?.(block.id, side)

    const blockStartMs = block.start * 1000
    const blockDurationMs = block.duration * 1000
    // Used in right trim logic

    // Get current trim values from block
    let currentTrimStartMs = (block.trimStart || 0) * 1000
    let currentTrimEndMs = (block.trimEnd || 0) * 1000

    // Minimum visible duration (100ms)
    const minimumDuration = 100

    const startX = e.clientX
    let lastTrimStart = currentTrimStartMs
    let lastTrimEnd = currentTrimEndMs
    let lastStartMs = blockStartMs
    let lastDurationMs = blockDurationMs

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isTrimmingRef.current || !blockRef.current) return

      const deltaX = moveEvent.clientX - startX
      const deltaMs = (deltaX / pixelsPerSecond) * 1000

      if (side === "left") {
        const maxDelta = blockDurationMs - minimumDuration
        const minDelta = block.type === "video" ? 0 : -blockStartMs

        const clampedDelta = Math.max(minDelta, Math.min(maxDelta, deltaMs))

        // Video blocks trim in-place: shift source offset, not timeline position
        const newStartMs =
          block.type === "video" ? blockStartMs : blockStartMs + clampedDelta
        const newDurationMs = blockDurationMs - clampedDelta
        const newTrimStartMs = Math.max(0, currentTrimStartMs + clampedDelta)

        lastStartMs = newStartMs
        lastDurationMs = newDurationMs
        lastTrimStart = newTrimStartMs

        // Visual feedback
        const newStartPercent = (newStartMs / 1000 / totalDuration) * 100
        const newWidthPercent = (newDurationMs / 1000 / totalDuration) * 100

        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          if (blockRef.current) {
            blockRef.current.style.left = `min(${newStartPercent}%, calc(100% - ${MIN_BLOCK_PX}px))`
            blockRef.current.style.width = `${newWidthPercent}%`
          }
        })

        onTrimPreview?.(
          block.id,
          newTrimStartMs,
          currentTrimEndMs,
          newStartMs,
          newDurationMs,
        )

        setPlayheadMs(newStartMs, "scrub")
      } else {
        // Trimming end:
        // - Start time stays same
        // - Duration changes (positive delta = increase duration, negative = decrease)
        // - TrimEnd changes (positive delta = decrease trimEnd, negative = increase trimEnd)

        // Constraints:
        // 1. Duration >= minimumDuration
        //    newDuration = originalDuration + delta
        //    originalDuration + delta >= minDur => delta >= minDur - originalDuration
        // 2. Timeline bounds (optional)

        const minDelta = minimumDuration - blockDurationMs
        // No strict max delta unless we want to limit extending beyond original asset (which we don't track here easily)
        // But we should probably limit trimEnd >= 0
        // newTrimEnd = currentTrimEnd - delta
        // currentTrimEnd - delta >= 0 => delta <= currentTrimEnd

        // If we want to allow extending BEYOND original asset (looping/blank), we can ignore maxDelta.
        // But usually trim implies revealing hidden content.
        // Let's assume we can only trim out what we have trimmed in.
        // So maxDelta = currentTrimEndMs

        const maxDelta = currentTrimEndMs
        const clampedDelta = Math.max(minDelta, Math.min(maxDelta, deltaMs))

        const newDurationMs = blockDurationMs + clampedDelta
        const newTrimEndMs = Math.max(0, currentTrimEndMs - clampedDelta)

        lastDurationMs = newDurationMs
        lastTrimEnd = newTrimEndMs

        const newWidthPercent = (newDurationMs / 1000 / totalDuration) * 100

        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          if (blockRef.current) {
            blockRef.current.style.width = `${newWidthPercent}%`
          }
        })

        onTrimPreview?.(
          block.id,
          currentTrimStartMs,
          newTrimEndMs,
          blockStartMs,
          newDurationMs,
        )

        setPlayheadMs(Math.max(blockStartMs, blockStartMs + newDurationMs - 1), "scrub")
      }
    }

    const handlePointerUp = () => {
      if (!isTrimmingRef.current || !blockRef.current) return

      isTrimmingRef.current = null

      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)

      onTrimEnd?.(
        block.id,
        lastTrimStart,
        lastTrimEnd,
        lastStartMs,
        lastDurationMs
      )
    }

    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
  }

  useEffect(
    () => {
      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }
      }
    },
    []
  )

  return (
    <>
      <div
        ref={blockRef}
        onPointerDown={handleBlockPointerDown}
        onContextMenu={handleContextMenu}
        className={`absolute rounded-lg select-none group cursor-move transition-shadow ${isSelected
          ? `${block.color} shadow-lg ring-2 ring-accent shadow-accent/20`
          : `${block.color} opacity-80 hover:opacity-100`
          }`}
        style={{
          // Clamp horizontal position so a px-based minWidth block can never
          // spill past the right edge of the timeline container.
          left: `min(${startPercent}%, calc(100% - ${MIN_BLOCK_PX}px))`,
          width: `${widthPercent}%`,
          minWidth: `${MIN_BLOCK_PX}px`,
          maxWidth: "100%",
          top: `${track * 64 + 8}px`,
          height: "48px",
          zIndex: isSelected ? 20 : 10,
        }}
      >
        {isZoom ? (
          <div className="h-full flex items-stretch gap-1.5 px-1.5 py-1 overflow-visible">
            <div
              className="h-full aspect-video shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <ZoomMinimap
                frameTime={block.start}
                zoomLevel={zoomLevel}
                focusX={focusX}
                focusY={focusY}
                onFocusPreview={(fx, fy) => commitFocus(fx, fy, false)}
                onFocusCommit={(fx, fy) => commitFocus(fx, fy, true)}
              />
            </div>
            <span className="text-[10px] font-semibold text-white/90 truncate self-center">
              {block.label}
            </span>
          </div>
        ) : (
        <div className="h-full flex items-center justify-between px-2.5 gap-2 overflow-hidden">
          {block.type === "video" && (
            <div className="text-white/80 hover:text-white transition-colors shrink-0 cursor-grab active:cursor-grabbing touch-none">
              <GripVertical size={14} strokeWidth={2} />
            </div>
          )}

          <span className="text-xs font-semibold text-white truncate flex-1 text-center px-1">
            {block.label}
          </span>
        </div>
        )}

        {block.type === "video" ? (
          <>
            <div
              onPointerDown={(e) => handleTrimDown(e, "left")}
              className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize touch-none opacity-0 group-hover:opacity-100 transition-all rounded-l-lg"
              title="Trim start"
            >
              <div className="absolute inset-y-1 left-1 w-1 bg-foreground/70 hover:bg-foreground rounded-full transition-colors" />
            </div>

            <div
              onPointerDown={(e) => handleTrimDown(e, "right")}
              className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize touch-none opacity-0 group-hover:opacity-100 transition-all rounded-r-lg"
              title="Trim end"
            >
              <div className="absolute inset-y-1 right-1 w-1 bg-foreground/70 hover:bg-foreground rounded-full transition-colors" />
            </div>
          </>
        ) : (
          <>
            <div
              onPointerDown={(e) => handleResizeDown(e, "left")}
              className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize touch-none opacity-0 group-hover:opacity-100 transition-all rounded-l-lg"
              title="Drag to resize"
            >
              <div className="absolute inset-y-1 left-1 w-1 bg-foreground/70 hover:bg-foreground rounded-full transition-colors" />
            </div>

            <div
              onPointerDown={(e) => handleResizeDown(e, "right")}
              className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize touch-none opacity-0 group-hover:opacity-100 transition-all rounded-r-lg"
              title="Drag to resize"
            >
              <div className="absolute inset-y-1 right-1 w-1 bg-foreground/70 hover:bg-foreground rounded-full transition-colors" />
            </div>
          </>
        )}
      </div>

      {menuPos && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuPos(null)}
            onContextMenu={(e) => e.preventDefault()}
          />
          <div
            className="fixed bg-popover border border-border shadow-xl rounded-lg z-50 overflow-hidden min-w-[140px]"
            style={{ top: `${menuPos.y}px`, left: `${menuPos.x}px` }}
          >
            {block.type !== "video" && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicate(block.id)
                  setMenuPos(null)
                }}
                className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors flex items-center gap-2"
              >
                <Copy size={12} />
                <span>Duplicate</span>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(block.id)
                setMenuPos(null)
              }}
              className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-accent transition-colors flex items-center gap-2"
            >
              <Trash2 size={12} />
              <span>Delete</span>
            </button>
          </div>
        </>
      )}
    </>
  )
}
