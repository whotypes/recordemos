import { useEffect, useRef } from "react"

export const useTimelineScrubber = (
  currentTime: number,
  videoDuration: number,
  setCurrentTime: (time: number) => void,
  isDraggingTime: boolean,
  setIsDraggingTime: (dragging: boolean) => void
) => {
  const scrubRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const timelineIndicatorRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const last = useRef(0)
  const isDraggingRef = useRef(false)

  // sync styles when not dragging
  useEffect(() => {
    if (!isDraggingTime && videoDuration > 0) {
      const percentage = Math.max(0, Math.min(100, (currentTime / videoDuration) * 100))

      if (scrubRef.current) {
        scrubRef.current.style.left = `${percentage}%`
      }

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
    setCurrentTime(Math.max(0, Math.min(videoDuration, percentage * videoDuration)))
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
    if (scrubRef.current) {
      scrubRef.current.style.left = `${percentage * 100}%`
    }
    if (progressRef.current) {
      progressRef.current.style.width = `${percentage * 100}%`
      progressRef.current.style.opacity = percentage > 0 ? '1' : '0'
    }
    if (timelineIndicatorRef.current) {
      timelineIndicatorRef.current.style.left = `${percentage * 100}%`
    }

    setCurrentTime(newTime)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const x = moveEvent.clientX - rect.left
      const percentage = Math.max(0, Math.min(1, x / rect.width))
      const newTime = percentage * videoDuration

      // instantly move scrubber under cursor
      if (scrubRef.current) {
        scrubRef.current.style.left = `${percentage * 100}%`
      }

      // instantly update progress bar width
      if (progressRef.current) {
        progressRef.current.style.width = `${percentage * 100}%`
        progressRef.current.style.opacity = percentage > 0 ? '1' : '0'
      }

      // instantly update timeline indicator
      if (timelineIndicatorRef.current) {
        timelineIndicatorRef.current.style.left = `${percentage * 100}%`
      }

      // throttle the store update so React is not spammed
      if (performance.now() - last.current > 16) {
        setCurrentTime(newTime)
        last.current = performance.now()
      }
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
    scrubRef,
    progressRef,
    timelineIndicatorRef,
    timelineRef,
    handleTimelineClick,
    handleScrubberPointerDown,
  }
}
