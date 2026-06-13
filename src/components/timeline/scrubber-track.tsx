import { forwardRef } from "react"

interface ScrubberTrackProps {
  videoDuration: number
  currentTime: number
  onScrubberPointerDown: (e: React.PointerEvent) => void
  progressRef: React.RefObject<HTMLDivElement | null>
  timelineRef: React.RefObject<HTMLDivElement | null>
}

const ScrubberTrack = forwardRef<HTMLDivElement, ScrubberTrackProps>(
  (
    {
      videoDuration,
      currentTime,
      onScrubberPointerDown,
      progressRef,
      timelineRef,
    },
    _ref
  ) => {
    const percentage =
      videoDuration > 0
        ? Math.max(0, Math.min(100, (currentTime / videoDuration) * 100))
        : 0

    return (
      <div
        ref={timelineRef}
        className="relative h-2 bg-muted/50 rounded-full cursor-pointer"
        onPointerDown={onScrubberPointerDown}
      >
        <div
          ref={progressRef}
          className="absolute left-0 top-0 h-full bg-linear-to-r from-accent/80 to-accent rounded-full z-0 pointer-events-none"
          style={{
            width: `${percentage}%`,
            opacity: percentage > 0 ? 1 : 0,
          }}
        />
      </div>
    )
  }
)

ScrubberTrack.displayName = "ScrubberTrack"

export default ScrubberTrack
