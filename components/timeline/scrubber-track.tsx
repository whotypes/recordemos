import { forwardRef } from "react"

interface ScrubberTrackProps {
  videoDuration: number
  currentTime: number
  isDraggingTime: boolean
  onTimelineClick: (e: React.MouseEvent<HTMLDivElement>) => void
  onScrubberPointerDown: (e: React.PointerEvent) => void
  progressRef: React.RefObject<HTMLDivElement | null>
  scrubRef: React.RefObject<HTMLDivElement | null>
  timelineRef: React.RefObject<HTMLDivElement | null>
}

const ScrubberTrack = forwardRef<HTMLDivElement, ScrubberTrackProps>(({
  videoDuration,
  currentTime,
  isDraggingTime,
  onTimelineClick,
  onScrubberPointerDown,
  progressRef,
  scrubRef,
  timelineRef,
}, ref) => {
  return (
    <div
      ref={timelineRef}
      className="relative h-2 bg-muted/60 rounded-full cursor-pointer group overflow-visible"
      onPointerDown={onScrubberPointerDown}
      onClick={onTimelineClick}
    >
      <div
        ref={progressRef}
        className="absolute left-0 top-0 h-full bg-accent rounded-full z-0"
        style={{
          width: videoDuration > 0 ? `${Math.max(0, Math.min(100, (currentTime / videoDuration) * 100))}%` : '0%',
          opacity: videoDuration > 0 && (currentTime / videoDuration) * 100 > 0 ? 1 : 0,
        }}
      />

      <div
        ref={scrubRef}
        className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-accent rounded-full cursor-grab active:cursor-grabbing z-20 transition-opacity hover:scale-110 active:scale-95 ${
          isDraggingTime ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        style={{
          left: videoDuration > 0 ? `${Math.max(0, Math.min(100, (currentTime / videoDuration) * 100))}%` : '0%',
          transform: "translate(-50%, -50%)",
        }}
        onPointerDown={onScrubberPointerDown}
      />
    </div>
  )
})

ScrubberTrack.displayName = "ScrubberTrack"

export default ScrubberTrack
