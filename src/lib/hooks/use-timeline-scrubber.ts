import { useEffect, useRef } from "react"

export const useTimelineScrubber = (
  currentTime: number,
  videoDuration: number,
  setCurrentTime: (time: number) => void,
  isDraggingTime: boolean,
  setIsDraggingTime: (dragging: boolean) => void
) => {
  const progressRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  useEffect(() => {
    if (!isDraggingTime && videoDuration > 0) {
      const percentage = Math.max(0, Math.min(100, (currentTime / videoDuration) * 100))

      if (progressRef.current) {
        progressRef.current.style.width = `${percentage}%`
        progressRef.current.style.opacity = percentage > 0 ? '1' : '0'
      }
    }
  }, [currentTime, videoDuration, isDraggingTime])

  const handleScrubberPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    if (isDraggingRef.current) return
    isDraggingRef.current = true
    setIsDraggingTime(true)

    const updateFromPointer = (clientX: number) => {
      const rect = timelineRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = clientX - rect.left
      const percentage = Math.max(0, Math.min(1, x / rect.width))
      const newTime = percentage * videoDuration

      if (progressRef.current) {
        progressRef.current.style.width = `${percentage * 100}%`
        progressRef.current.style.opacity = percentage > 0 ? '1' : '0'
      }

      setCurrentTime(newTime)
    }

    updateFromPointer(e.clientX)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updateFromPointer(moveEvent.clientX)
    }

    const handlePointerUp = () => {
      isDraggingRef.current = false
      setIsDraggingTime(false)
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
    }

    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
  }

  return {
    progressRef,
    timelineRef,
    handleScrubberPointerDown,
  }
}
