"use client"

import { useBlockDragResize } from "@/lib/hooks/use-block-drag-resize"
import { Grip as Grip2, Trash2 } from "lucide-react"
import type React from "react"
import { useRef, useState } from "react"

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
  onDragMove: (blockId: string, newStart: number) => void
  onDragEnd: () => void
  onResizeStart: (blockId: string, side: "left" | "right") => void
  onResizeMove: (newStart: number, newDuration: number) => void
  onResizeEnd: () => void
  onDelete: (blockId: string) => void
  onDuplicate: (blockId: string) => void
  onBlockClick?: (blockId: string, timeInBlock: number) => void
  totalDuration: number
  pixelsPerSecond: number
}

export default function TimelineBlock({
  block,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  onDelete,
  onDuplicate,
  onBlockClick,
  totalDuration,
  pixelsPerSecond,
}: TimelineBlockProps) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const blockRef = useRef<HTMLDivElement>(null)

  const startPercent = (block.start / totalDuration) * 100
  const widthPercent = (block.duration / totalDuration) * 100
  const track = block.track || 0

  const { handleGripPointerDown, handleResizeDown } = useBlockDragResize({
    block: { id: block.id, start: block.start, duration: block.duration },
    totalDuration,
    pixelsPerSecond,
    onDragMove,
    onDragEnd,
    onResizeStart,
    onResizeMove: (blockId, newStart, newDuration) => onResizeMove(newStart, newDuration),
    onResizeEnd,
  })

  const isDraggingRef = useRef(false)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuPos({ x: e.clientX - 80, y: e.clientY - 10 })
  }

  const handleBlockPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()


    if (isDraggingRef.current) {
      setMenuPos(null)
      return
    }

    // Select the block
    onSelect()

    // Start dragging using delta-based approach (like grip handle)
    isDraggingRef.current = true
    const startX = e.clientX
    const startPos = block.start

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return

      const deltaX = moveEvent.clientX - startX
      const timeDelta = deltaX / pixelsPerSecond
      const newStart = Math.max(0, Math.min(totalDuration - block.duration, startPos + timeDelta))
      onDragMove(block.id, newStart)
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false

      // Clean up
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)

      onDragEnd()

      // Handle click if quick tap
      const deltaX = Math.abs(upEvent.clientX - e.clientX)
      const deltaY = Math.abs(upEvent.clientY - e.clientY)
      if (deltaX < 5 && deltaY < 5 && blockRef.current) {
        // Calculate time position within the block based on click position
        const blockRect = blockRef.current.getBoundingClientRect()
        const clickX = e.clientX - blockRect.left
        const percentage = Math.max(0, Math.min(1, clickX / blockRect.width))
        const timeInBlock = block.start + percentage * block.duration
        onBlockClick?.(block.id, timeInBlock)
      }
    }

    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
  }

  return (
    <div
      ref={blockRef}
      onPointerDown={handleBlockPointerDown}
      onContextMenu={handleContextMenu}
      className={`absolute h-12 rounded-lg select-none group cursor-move ${
        isSelected
        ? `${block.color} shadow-lg ring-2 ring-accent/50`
          : `${block.color} opacity-70 hover:opacity-90`
      }`}
      style={{
        left: `${startPercent}%`,
        width: `${widthPercent}%`,
        minWidth: "80px",
        top: `${track * 56}px`,
        maxWidth: `calc(${widthPercent}% - 4px)`,
      }}
    >
      {/* Main block content */}
      <div className="h-full flex items-center justify-between px-2 gap-2">
        {block.type === "video" && (
          <div
            onPointerDown={handleGripPointerDown}
            className="text-white/70 hover:text-white transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing p-1 touch-none select-none"
          >
            <Grip2 size={14} />
          </div>
        )}

        {/* Label */}
        <span className="text-xs font-semibold text-white truncate flex-1 text-center px-1">{block.label}</span>

        {menuPos && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuPos(null)}
              onContextMenu={(e) => e.preventDefault()}
            />
            <div
              className="fixed bg-popover border border-border/50 rounded-lg shadow-xl z-50 whitespace-nowrap backdrop-blur-sm min-w-max"
              style={{ top: `${menuPos.y}px`, left: `${menuPos.x}px` }}
            >
              {block.type !== "video" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicate(block.id)
                    setMenuPos(null)
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
                >
                  Duplicate
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(block.id)
                  setMenuPos(null)
                }}
                className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-accent transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </>
        )}
      </div>

      <div
        onPointerDown={(e) => handleResizeDown(e, "left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-3 h-10 bg-white/50 rounded hover:bg-white opacity-0 group-hover:opacity-100 transition-all cursor-col-resize active:bg-accent touch-none"
      />

      <div
        onPointerDown={(e) => handleResizeDown(e, "right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1.5 w-3 h-10 bg-white/50 rounded hover:bg-white opacity-0 group-hover:opacity-100 transition-all cursor-col-resize active:bg-accent touch-none"
      />
    </div>
  )
}
