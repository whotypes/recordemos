"use client"

import ScrubberTrack from "@/components/timeline/scrubber-track"
import PlaybackControls from "@/components/ui/playback-controls"
import { Button } from "@/components/ui/button"
import { useCompositionStore } from "@/lib/composition-store"
import { useTimelineScrubber } from "@/lib/hooks/use-timeline-scrubber"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { Scissors } from "lucide-react"
import { useState } from "react"

interface PreviewTimelineBarProps {
  hasVideo: boolean
  timelineDuration: number
  currentTime: number
  isPlaying: boolean
  onSetCurrentTime: (time: number) => void
  onSetIsPlaying: (playing: boolean) => void
  onOpenEditor: () => void
}

export default function PreviewTimelineBar({
  hasVideo,
  timelineDuration,
  currentTime,
  isPlaying,
  onSetCurrentTime,
  onSetIsPlaying,
  onOpenEditor,
}: PreviewTimelineBarProps) {
  const [isDraggingTime, setIsDraggingTime] = useState(false)
  const loop = useVideoPlayerStore((state) => state.loop)
  const muted = useVideoPlayerStore((state) => state.muted)
  const setLoop = useVideoPlayerStore((state) => state.setLoop)
  const setMuted = useVideoPlayerStore((state) => state.setMuted)

  const clampedCurrentTime = Math.max(
    0,
    timelineDuration > 0 ? Math.min(currentTime, timelineDuration) : currentTime,
  )

  const scrubberSetCurrentTime = (time: number) => {
    const epsilon = 0.001
    const maxTime = timelineDuration > 0
      ? Math.max(0, timelineDuration - epsilon)
      : Math.max(0, time)
    onSetCurrentTime(Math.max(0, Math.min(maxTime, time)))
  }

  const scrubberHook = useTimelineScrubber(
    clampedCurrentTime,
    timelineDuration,
    scrubberSetCurrentTime,
    isDraggingTime,
    setIsDraggingTime,
  )

  const handlePlayPause = () => {
    if (!isPlaying && timelineDuration > 0) {
      const epsilon = 0.001
      if (currentTime >= timelineDuration - epsilon) {
        const compiler = useCompositionStore.getState().compiler
        const startSec = (compiler?.getPlaybackStartMs() ?? 0) / 1000
        onSetCurrentTime(startSec)
      }
    }
    onSetIsPlaying(!isPlaying)
  }

  if (!hasVideo) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Upload a video to get started</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Preview playback — open the timeline to trim, split, and add blocks.
        </p>
        <Button size="sm" variant="secondary" onClick={onOpenEditor} className="shrink-0 gap-1.5">
          <Scissors size={14} />
          Open timeline
        </Button>
      </div>

      <PlaybackControls
        hasVideo={hasVideo}
        currentTime={clampedCurrentTime}
        videoDuration={timelineDuration}
        isPlaying={isPlaying}
        loop={loop}
        muted={muted}
        onPlayPause={handlePlayPause}
        onSplit={onOpenEditor}
        onSkipToStart={() => {
          const compiler = useCompositionStore.getState().compiler
          const startSec = (compiler?.getPlaybackStartMs() ?? 0) / 1000
          onSetCurrentTime(startSec)
        }}
        onToggleLoop={() => setLoop(!loop)}
        onToggleMute={() => setMuted(!muted)}
      />

      <ScrubberTrack
        videoDuration={timelineDuration}
        currentTime={clampedCurrentTime}
        onScrubberPointerDown={scrubberHook.handleScrubberPointerDown}
        progressRef={scrubberHook.progressRef}
        timelineRef={scrubberHook.timelineRef}
      />
    </div>
  )
}
