import { useCallback } from "react"
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
  onDragMove: (blockId: string, newStart: number) => void
  onDragEnd: () => void
  onResizeStart: (blockId: string, side: ResizeSide) => void
  onResizeMove: (blockId: string, newStart: number, newDuration: number) => void
  onResizeEnd: () => void
}

export const useBlockDragResize = ({
  block,
  totalDuration,
  pixelsPerSecond,
  onDragMove,
  onDragEnd,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
}: UseBlockDragResizeProps) => {
  const handleGripPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startPos = block.start

      const handleGlobalPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX
        const timeDelta = deltaX / pixelsPerSecond
        const newStart = Math.max(0, Math.min(totalDuration - block.duration, startPos + timeDelta))
        onDragMove(block.id, newStart)
      }

      const handleGlobalPointerUp = () => {
        document.removeEventListener("pointermove", handleGlobalPointerMove)
        document.removeEventListener("pointerup", handleGlobalPointerUp)
        onDragEnd()
      }

      document.addEventListener("pointermove", handleGlobalPointerMove)
      document.addEventListener("pointerup", handleGlobalPointerUp)
    },
    [block.id, block.start, block.duration, totalDuration, pixelsPerSecond, onDragMove, onDragEnd],
  )

  const handleResizeDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, side: ResizeSide) => {
      e.preventDefault()
      e.stopPropagation()

      const startX = e.clientX
      const startPos = block.start
      const startDuration = block.duration

      onResizeStart(block.id, side)

      const handleGlobalPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX
        const timeDelta = deltaX / pixelsPerSecond

        if (side === "left") {
          const newStart = Math.max(0, startPos + timeDelta)
          const newDuration = startDuration - (newStart - startPos)
          onResizeMove(block.id, newStart, Math.max(0.2, newDuration))
        } else {
          const newDuration = Math.max(0.2, startDuration + timeDelta)
          onResizeMove(block.id, startPos, newDuration)
        }
      }

      const handleGlobalPointerUp = () => {
        document.removeEventListener("pointermove", handleGlobalPointerMove)
        document.removeEventListener("pointerup", handleGlobalPointerUp)
        onResizeEnd()
      }

      document.addEventListener("pointermove", handleGlobalPointerMove)
      document.addEventListener("pointerup", handleGlobalPointerUp)
    },
    [block.id, block.start, block.duration, pixelsPerSecond, onResizeStart, onResizeMove, onResizeEnd],
  )

  return {
    handleGripPointerDown,
    handleResizeDown,
  }
}
