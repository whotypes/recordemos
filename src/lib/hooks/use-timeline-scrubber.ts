import { useEffect, useRef } from "react"
import { usePlayheadStore } from "../playhead-store"

export const useTimelineScrubber = (
  currentTime: number,
  videoDuration: number,
  setCurrentTime: (time: number) => void,
  isDraggingTime: boolean,
  setIsDraggingTime: (dragging: boolean) => void
) => {
  const setPlayheadMs = usePlayheadStore((state) => state.setPlayheadMs)
  const progressRef = useRef<HTMLDivElement>(null)
  const timelineIndicatorRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  // sync styles when not dragging
  useEffect(() => {
    if (!isDraggingTime && videoDuration > 0) {
      const percentage = Math.max(0, Math.min(100, (currentTime / videoDuration) * 100))

      if (progressRef.current) {
        progressRef.current.style.width = `${percentage}%`
        progressRef.current.style.opacity = percentage > 0 ? '1' : '0'
      }

      if (timelineIndicatorRef.current) {
        timelineIndicatorRef.current.style.left = `${percentage}%`
      }
    }
  }, [currentTime, videoDuration, isDraggingTime])

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      e.preventDefault()
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const timeSeconds = Math.max(0, Math.min(videoDuration, percentage * videoDuration))
    setCurrentTime(timeSeconds) // This will call studio's handler which sets playhead
  }

  const handleScrubberPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    if (isDraggingRef.current) return
    isDraggingRef.current = true
    setIsDraggingTime(true)
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect) return

    // Update immediately on pointer down
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    const newTime = percentage * videoDuration

    // instantly update all elements
    if (progressRef.current) {
      progressRef.current.style.width = `${percentage * 100}%`
      progressRef.current.style.opacity = percentage > 0 ? '1' : '0'
    }
    if (timelineIndicatorRef.current) {
      timelineIndicatorRef.current.style.left = `${percentage * 100}%`
    }

    // Call setCurrentTime which will trigger studio's handler to set playhead
    setCurrentTime(newTime)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const x = moveEvent.clientX - rect.left
      const percentage = Math.max(0, Math.min(1, x / rect.width))
      const newTime = percentage * videoDuration

      // instantly update progress bar width
      if (progressRef.current) {
        progressRef.current.style.width = `${percentage * 100}%`
        progressRef.current.style.opacity = percentage > 0 ? '1' : '0'
      }

      // instantly update timeline indicator
      if (timelineIndicatorRef.current) {
        timelineIndicatorRef.current.style.left = `${percentage * 100}%`
      }

      // Call setCurrentTime which will trigger studio's handler to set playhead
      setCurrentTime(newTime)
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
    timelineIndicatorRef,
    timelineRef,
    handleTimelineClick,
    handleScrubberPointerDown,
  }
}
