"use client"

import { computeResizeBounds, computeValidGaps, constrainToValidGaps } from "@/lib/timeline-gap-solver"
import { Copy, GripVertical, Trash2, Scissors } from "lucide-react"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useCompositionStore } from "@/lib/composition-store"
import { usePlayheadStore } from "@/lib/playhead-store"

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
  }
  isSelected: boolean
  onSelect: () => void
  onDragEnd: (blockId: string, newStart: number) => void
  onResizeStart: (blockId: string, side: "left" | "right") => void
  onResizeEnd: (blockId: string, newStart: number, newDuration: number) => void
  onTrimStart?: (blockId: string, side: "left" | "right") => void
  onTrimEnd?: (blockId: string, trimStartMs: number, trimEndMs: number) => void
  onDelete: (blockId: string) => void
  onDuplicate: (blockId: string) => void
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
  onDragEnd,
  onResizeStart,
  onResizeEnd,
  onDelete,
  onDuplicate,
  onBlockClick,
  onTrimStart,
  onTrimEnd,
  totalDuration,
  pixelsPerSecond,
  blocksOnSameTrack = [],
}: TimelineBlockProps) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [showTrimHandles, setShowTrimHandles] = useState(false)
  const blockRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const isResizingRef = useRef<"left" | "right" | null>(null)
  const isTrimmingRef = useRef<"left" | "right" | null>(null)
  const rafRef = useRef<number | undefined>(undefined)

  const { compiler } = useCompositionStore()
  const { playheadMs, setPlayheadMs } = usePlayheadStore()

  const startPercent = (block.start / totalDuration) * 100
  const widthPercent = (block.duration / totalDuration) * 100
  const track = block.track || 0

  useEffect(
    () => {
      if (!blockRef.current) return

      blockRef.current.style.left = `${startPercent}%`
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

      const newPercent = (newStart / totalDuration) * 100
      lastLeft = newPercent

      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        if (blockRef.current) {
          blockRef.current.style.left = `${newPercent}%`
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
          const oldVisibleStart = (block.start + (block.trimStart || 0)) * 1000
          const oldVisibleEnd = (block.start + block.duration - (block.trimEnd || 0)) * 1000

          // Check if playhead was inside old visible window
          if (playheadMs >= oldVisibleStart && playheadMs <= oldVisibleEnd) {
            const offsetInside = playheadMs - oldVisibleStart
            const newVisibleStart = (finalStart + (block.trimStart || 0)) * 1000
            const newVisibleEnd = (finalStart + block.duration - (block.trimEnd || 0)) * 1000
            const newPlayhead = Math.min(newVisibleStart + offsetInside, newVisibleEnd)

            console.log(`[BLOCK-MOVE] Adjusted playhead from ${(playheadMs/1000).toFixed(2)}s to ${(newPlayhead/1000).toFixed(2)}s`)
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

        const newPercent = (clampedStart / totalDuration) * 100
        const newWidthPercent = (clampedDuration / totalDuration) * 100

        lastLeft = newPercent
        lastWidth = newWidthPercent

        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          if (blockRef.current) {
            blockRef.current.style.left = `${newPercent}%`
            blockRef.current.style.width = `${newWidthPercent}%`
          }
        })
      } else {
        let newEnd = startPos + startDuration + timeDelta
        newEnd = Math.max(bounds.min, Math.min(bounds.max, newEnd))

        const newDuration = newEnd - startPos
        const clampedDuration = Math.max(0.2, newDuration)
        const newWidthPercent = (clampedDuration / totalDuration) * 100

        lastWidth = newWidthPercent

        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
          if (blockRef.current) {
            blockRef.current.style.width = `${newWidthPercent}%`
          }
        })
      }
    }

    const handlePointerUp = () => {
      if (!isResizingRef.current || !blockRef.current) return
      const resizeSide = isResizingRef.current
      isResizingRef.current = null

      const finalStart = (lastLeft / 100) * totalDuration
      const finalDuration = (lastWidth / 100) * totalDuration

      blockRef.current.style.transition = originalTransition

      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)

      onResizeEnd(block.id, finalStart, finalDuration)

      // If this is a video block and playhead was inside it, adjust playhead if needed
      if (block.type === "video") {
        const oldVisibleStart = (block.start + (block.trimStart || 0)) * 1000
        const oldVisibleEnd = (block.start + block.duration - (block.trimEnd || 0)) * 1000
        const newVisibleStart = (finalStart + (block.trimStart || 0)) * 1000
        const newVisibleEnd = (finalStart + finalDuration - (block.trimEnd || 0)) * 1000

        // Check if playhead was inside old visible window
        if (playheadMs >= oldVisibleStart && playheadMs <= oldVisibleEnd) {
          // Clamp playhead to new visible window
          const newPlayhead = Math.max(newVisibleStart, Math.min(newVisibleEnd, playheadMs))

          if (Math.abs(newPlayhead - playheadMs) > 10) {
            console.log(`[BLOCK-RESIZE] Adjusted playhead from ${(playheadMs/1000).toFixed(2)}s to ${(newPlayhead/1000).toFixed(2)}s`)
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
      console.log('[TRIM] Paused playback for trimming')
    }

    onTrimStart?.(block.id, side)

    const startX = e.clientX
    const blockStartMs = block.start * 1000
    const blockEndMs = (block.start + block.duration) * 1000
    const blockDurationMs = block.duration * 1000

    // Get current trim values from block
    let currentTrimStartMs = (block.trimStart || 0) * 1000
    let currentTrimEndMs = (block.trimEnd || 0) * 1000

    // Minimum visible duration (100ms)
    const minimumDuration = 100

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isTrimmingRef.current || !blockRef.current) return

      const deltaX = moveEvent.clientX - startX
      const timeDeltaMs = (deltaX / pixelsPerSecond) * 1000

      // Calculate pointer time in timeline
      const pointerTimeMs = blockStartMs + (moveEvent.clientX - blockRef.current.getBoundingClientRect().left) / pixelsPerSecond * 1000

      if (side === "left") {
        // Clamp new trimStart: 0 <= trimStart <= (duration - trimEnd - minimumDuration)
        const maxTrimStart = blockDurationMs - currentTrimEndMs - minimumDuration
        const newTrimStartMs = Math.max(0, Math.min(maxTrimStart, pointerTimeMs - blockStartMs))

        // Calculate active timeline time: block.start + newTrimStart
        const activeTimeMs = blockStartMs + newTrimStartMs

        // Update playhead to timeline time - preview-canvas will map to source video time
        // For trimming preview, we set playhead to the timeline time at the trim point
        setPlayheadMs(activeTimeMs, "scrub")
        console.log(`[TRIM LEFT] pointerTime=${(pointerTimeMs/1000).toFixed(2)}s, trimStart=${(newTrimStartMs/1000).toFixed(2)}s, activeTime=${(activeTimeMs/1000).toFixed(2)}s`)
      } else {
        // Clamp new trimEnd: 0 <= trimEnd <= (duration - trimStart - minimumDuration)
        const maxTrimEnd = blockDurationMs - currentTrimStartMs - minimumDuration
        const newTrimEndMs = Math.max(0, Math.min(maxTrimEnd, blockEndMs - pointerTimeMs))

        // Calculate active timeline time: block.end - newTrimEnd
        const activeTimeMs = blockEndMs - newTrimEndMs

        // Update playhead to timeline time - preview-canvas will map to source video time
        setPlayheadMs(activeTimeMs, "scrub")
        console.log(`[TRIM RIGHT] pointerTime=${(pointerTimeMs/1000).toFixed(2)}s, trimEnd=${(newTrimEndMs/1000).toFixed(2)}s, activeTime=${(activeTimeMs/1000).toFixed(2)}s`)
      }
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (!isTrimmingRef.current || !blockRef.current) return

      // Calculate pointer time in timeline
      const pointerTimeMs = blockStartMs + (upEvent.clientX - blockRef.current.getBoundingClientRect().left) / pixelsPerSecond * 1000

      let finalTrimStart = currentTrimStartMs
      let finalTrimEnd = currentTrimEndMs
      const minimumDuration = 100

      if (side === "left") {
        const maxTrimStart = blockDurationMs - currentTrimEndMs - minimumDuration
        finalTrimStart = Math.max(0, Math.min(maxTrimStart, pointerTimeMs - blockStartMs))
      } else {
        const maxTrimEnd = blockDurationMs - currentTrimStartMs - minimumDuration
        finalTrimEnd = Math.max(0, Math.min(maxTrimEnd, blockEndMs - pointerTimeMs))
      }

      isTrimmingRef.current = null

      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)

      console.log(`[TRIM END] side=${side}, trimStart=${(finalTrimStart/1000).toFixed(2)}s, trimEnd=${(finalTrimEnd/1000).toFixed(2)}s`)
      onTrimEnd?.(block.id, finalTrimStart, finalTrimEnd)

      // Don't resume playback - user must manually play
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
          left: `${startPercent}%`,
          width: `${widthPercent}%`,
          minWidth: "60px",
          top: `${track * 64 + 8}px`,
          height: "48px",
          zIndex: isSelected ? 20 : 10,
        }}
      >
        <div className="h-full flex items-center justify-between px-2.5 gap-2 overflow-hidden">
          {block.type === "video" && (
            <div className="text-white/80 hover:text-white transition-colors shrink-0 cursor-grab active:cursor-grabbing touch-none">
              <GripVertical size={14} strokeWidth={2} />
            </div>
          )}

          <span className="text-xs font-semibold text-white truncate flex-1 text-center px-1">
            {block.label}
          </span>

          {block.type === "video" && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowTrimHandles(!showTrimHandles)
              }}
              className={`text-white/80 hover:text-white transition-colors shrink-0 ${showTrimHandles ? 'text-white' : ''}`}
              title="Trim video"
            >
              <Scissors size={14} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Regular resize handles */}
        {!showTrimHandles && (
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

        {/* Trim handles for video blocks */}
        {showTrimHandles && block.type === "video" && (
          <>
            <div
              onPointerDown={(e) => handleTrimDown(e, "left")}
              className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize touch-none bg-primary/20 hover:bg-primary/30 transition-all rounded-l-lg"
              title="Trim start"
            >
              <div className="absolute inset-y-1 left-1 w-1 bg-primary hover:bg-primary/80 rounded-full transition-colors" />
            </div>

            <div
              onPointerDown={(e) => handleTrimDown(e, "right")}
              className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize touch-none bg-primary/20 hover:bg-primary/30 transition-all rounded-r-lg"
              title="Trim end"
            >
              <div className="absolute inset-y-1 right-1 w-1 bg-primary hover:bg-primary/80 rounded-full transition-colors" />
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
