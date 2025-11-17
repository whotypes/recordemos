import { forwardRef, useEffect, useRef } from "react"

interface ScrubberTrackProps {
  videoDuration: number
  currentTime: number
  onTimelineClick: (e: React.MouseEvent<HTMLDivElement>) => void
  onScrubberPointerDown: (e: React.PointerEvent) => void
  progressRef: React.RefObject<HTMLDivElement | null>
  timelineRef: React.RefObject<HTMLDivElement | null>
}

const ScrubberTrack = forwardRef<HTMLDivElement, ScrubberTrackProps>(
  (
    {
      videoDuration,
      currentTime,
      onTimelineClick,
      onScrubberPointerDown,
      progressRef,
      timelineRef,
    },
    _ref
  ) => {
    const rafRef = useRef<number | undefined>(undefined)

    useEffect(
      () => {
        const updateScrubber = () => {
          if (videoDuration <= 0) return

          const percentage = Math.max(
            0,
            Math.min(100, (currentTime / videoDuration) * 100)
          )

          if (progressRef.current) {
            progressRef.current.style.width = `${percentage}%`
            progressRef.current.style.opacity = percentage > 0 ? "1" : "0"
          }
        }

        const animate = () => {
          updateScrubber()
          rafRef.current = requestAnimationFrame(animate)
        }

        const id = requestAnimationFrame(animate)
        rafRef.current = id

        return () => {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
          }
        }
      },
      [currentTime, videoDuration, progressRef]
    )

    return (
      <div
        ref={timelineRef}
        className="relative h-2 bg-muted/50 rounded-full cursor-pointer"
        onPointerDown={onScrubberPointerDown}
        onClick={onTimelineClick}
      >
        <div
          ref={progressRef}
          className="absolute left-0 top-0 h-full bg-linear-to-r from-accent/80 to-accent rounded-full z-0"
          style={{
            width:
              videoDuration > 0
                ? `${Math.max(0, Math.min(100, (currentTime / videoDuration) * 100))}%`
                : "0%",
            opacity:
              videoDuration > 0 && (currentTime / videoDuration) * 100 > 0
                ? 1
                : 0,
          }}
        />
      </div>
    )
  }
)

ScrubberTrack.displayName = "ScrubberTrack"

export default ScrubberTrack
