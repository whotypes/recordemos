"use client"

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
  }
  isSelected: boolean
  onSelect: () => void
  onDragEnd: (blockId: string, newStart: number) => void
  onResizeStart: (blockId: string, side: "left" | "right") => void
  onResizeEnd: (blockId: string, newStart: number, newDuration: number) => void
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
  totalDuration,
  pixelsPerSecond,
  blocksOnSameTrack = [],
}: TimelineBlockProps) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const blockRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const isResizingRef = useRef<"left" | "right" | null>(null)
  const rafRef = useRef<number | undefined>(undefined)

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

    let lastLeft = startPercent

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current || !blockRef.current) return

      const deltaX = moveEvent.clientX - startX
      const timeDelta = deltaX / pixelsPerSecond
      let newStart = Math.max(0, Math.min(totalDuration - block.duration, startPos + timeDelta))

      const newEnd = newStart + block.duration

      for (const otherBlock of blocksOnSameTrack) {
        if (otherBlock.id === block.id) continue

        const otherEnd = otherBlock.start + otherBlock.duration

        if (newStart < otherEnd && newEnd > otherBlock.start) {
          if (newStart < otherBlock.start) {
            newStart = Math.max(0, otherBlock.start - block.duration)
          } else {
            newStart = otherEnd
          }
        }
      }

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
        onDragEnd(block.id, finalStart)
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

    let lastLeft = startPercent
    let lastWidth = widthPercent

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isResizingRef.current || !blockRef.current) return

      const deltaX = moveEvent.clientX - startX
      const timeDelta = deltaX / pixelsPerSecond

      if (side === "left") {
        let newStart = Math.max(0, startPos + timeDelta)
        let newDuration = startDuration - (newStart - startPos)

        for (const otherBlock of blocksOnSameTrack) {
          if (otherBlock.id === block.id) continue

          const otherEnd = otherBlock.start + otherBlock.duration

          if (otherEnd > newStart && otherBlock.start < startPos + startDuration) {
            newStart = Math.max(newStart, otherEnd)
            newDuration = startPos + startDuration - newStart
          }
        }

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
        let newDuration = Math.max(0.2, Math.min(totalDuration - startPos, startDuration + timeDelta))

        for (const otherBlock of blocksOnSameTrack) {
          if (otherBlock.id === block.id) continue

          const newEnd = startPos + newDuration

          if (newEnd > otherBlock.start && startPos < otherBlock.start) {
            newDuration = Math.max(0.2, otherBlock.start - startPos)
          }
        }

        const newWidthPercent = (newDuration / totalDuration) * 100

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
      isResizingRef.current = null

      const finalStart = (lastLeft / 100) * totalDuration
      const finalDuration = (lastWidth / 100) * totalDuration

      blockRef.current.style.transition = originalTransition

      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)

      onResizeEnd(block.id, finalStart, finalDuration)
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
        </div>

        <div
          onPointerDown={(e) => handleResizeDown(e, "left")}
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize touch-none opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 active:bg-white/30"
        />

        <div
          onPointerDown={(e) => handleResizeDown(e, "right")}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize touch-none opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 active:bg-white/30"
        />
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
