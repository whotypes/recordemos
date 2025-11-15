import { useCallback, useRef } from "react"
import { ResizeSide } from "@/lib/types/timeline"

interface Block {
  id: string
  start: number
  duration: number
}

interface UseBlockDragResizeProps {
  block: Block
  totalDuration: number
  pixelsPerSecond: number
  blockElement: HTMLDivElement | null
  onDragEnd: (blockId: string, newStart: number) => void
  onResizeStart: (blockId: string, side: ResizeSide) => void
  onResizeEnd: (blockId: string, newStart: number, newDuration: number) => void
}

export const useBlockDragResize = ({
  block,
  totalDuration,
  pixelsPerSecond,
  blockElement,
  onDragEnd,
  onResizeStart,
  onResizeEnd,
}: UseBlockDragResizeProps) => {
  const isDraggingRef = useRef(false)
  const isResizingRef = useRef(false)

  const handleGripPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()

      if (!blockElement || isDraggingRef.current || isResizingRef.current) return

      isDraggingRef.current = true
      const startX = e.clientX
      const startPos = block.start
      const startPercent = (block.start / totalDuration) * 100

      // store original transition for restoration
      const originalTransition = blockElement.style.transition
      blockElement.style.transition = "none"

      const handleGlobalPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX
        const timeDelta = deltaX / pixelsPerSecond
        const newStart = Math.max(0, Math.min(totalDuration - block.duration, startPos + timeDelta))
        const newPercent = (newStart / totalDuration) * 100

        // direct DOM update - no React re-render
        blockElement.style.left = `${newPercent}%`
      }

      const handleGlobalPointerUp = () => {
        if (!isDraggingRef.current) return
        isDraggingRef.current = false

        // calculate final position
        const finalLeft = parseFloat(blockElement.style.left) || startPercent
        const finalStart = (finalLeft / 100) * totalDuration

        // restore transition
        blockElement.style.transition = originalTransition

        document.removeEventListener("pointermove", handleGlobalPointerMove)
        document.removeEventListener("pointerup", handleGlobalPointerUp)

        // commit to store and database
        onDragEnd(block.id, finalStart)
      }

      document.addEventListener("pointermove", handleGlobalPointerMove)
      document.addEventListener("pointerup", handleGlobalPointerUp)
    },
    [block.id, block.start, block.duration, totalDuration, pixelsPerSecond, blockElement, onDragEnd],
  )

  const handleResizeDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, side: ResizeSide) => {
      e.preventDefault()
      e.stopPropagation()

      if (!blockElement || isDraggingRef.current || isResizingRef.current) return

      isResizingRef.current = true
      const startX = e.clientX
      const startPos = block.start
      const startDuration = block.duration

      onResizeStart(block.id, side)

      // store original transition for restoration
      const originalTransition = blockElement.style.transition
      blockElement.style.transition = "none"

      const handleGlobalPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX
        const timeDelta = deltaX / pixelsPerSecond

        if (side === "left") {
          const newStart = Math.max(0, startPos + timeDelta)
          const newDuration = startDuration - (newStart - startPos)
          const clampedDuration = Math.max(0.2, newDuration)
          const clampedStart = startPos + startDuration - clampedDuration

          const newPercent = (clampedStart / totalDuration) * 100
          const newWidthPercent = (clampedDuration / totalDuration) * 100

          // direct DOM update
          blockElement.style.left = `${newPercent}%`
          blockElement.style.width = `${newWidthPercent}%`
        } else {
          const newDuration = Math.max(0.2, startDuration + timeDelta)
          const newWidthPercent = (newDuration / totalDuration) * 100

          // direct DOM update
          blockElement.style.width = `${newWidthPercent}%`
        }
      }

      const handleGlobalPointerUp = () => {
        if (!isResizingRef.current) return
        isResizingRef.current = false

        // calculate final dimensions
        const finalLeft = parseFloat(blockElement.style.left)
        const finalWidth = parseFloat(blockElement.style.width)
        const finalStart = (finalLeft / 100) * totalDuration
        const finalDuration = (finalWidth / 100) * totalDuration

        // restore transition
        blockElement.style.transition = originalTransition

        document.removeEventListener("pointermove", handleGlobalPointerMove)
        document.removeEventListener("pointerup", handleGlobalPointerUp)

        // commit to store and database
        onResizeEnd(block.id, finalStart, finalDuration)
      }

      document.addEventListener("pointermove", handleGlobalPointerMove)
      document.addEventListener("pointerup", handleGlobalPointerUp)
    },
    [block.id, block.start, block.duration, totalDuration, pixelsPerSecond, blockElement, onResizeStart, onResizeEnd],
  )

  return {
    handleGripPointerDown,
    handleResizeDown,
  }
}
