import { forwardRef, useEffect, useRef } from "react"

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

const ScrubberTrack = forwardRef<HTMLDivElement, ScrubberTrackProps>(
  (
    {
      videoDuration,
      currentTime,
      isDraggingTime,
      onTimelineClick,
      onScrubberPointerDown,
      progressRef,
      scrubRef,
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

          if (scrubRef.current) {
            scrubRef.current.style.left = `${percentage}%`
          }

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
      [currentTime, videoDuration, scrubRef, progressRef]
    )

    return (
      <div
        ref={timelineRef}
        className="relative h-2 bg-muted/50 rounded-full cursor-pointer group overflow-visible"
        onPointerDown={onScrubberPointerDown}
        onClick={onTimelineClick}
      >
        <div
          ref={progressRef}
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-accent/80 to-accent rounded-full z-0"
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

        <div
          ref={scrubRef}
          className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-accent rounded-full cursor-grab active:cursor-grabbing z-20 transition-all border-2 border-background shadow-lg ${
            isDraggingTime
              ? "opacity-100 scale-110"
              : "opacity-0 group-hover:opacity-100"
          }`}
          style={{
            left:
              videoDuration > 0
                ? `${Math.max(0, Math.min(100, (currentTime / videoDuration) * 100))}%`
                : "0%",
            transform: "translate(-50%, -50%)",
          }}
          onPointerDown={onScrubberPointerDown}
        />
      </div>
    )
  }
)

ScrubberTrack.displayName = "ScrubberTrack"

export default ScrubberTrack
