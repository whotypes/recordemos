import { Pause, Play, SkipBack } from "lucide-react"

interface PlaybackControlsProps {
  hasVideo: boolean
  currentTime: number
  videoDuration: number
  isPlaying: boolean
  onPlayPause: () => void
  onSkipToStart: () => void
}

export default function PlaybackControls({
  hasVideo,
  currentTime,
  videoDuration,
  isPlaying,
  onPlayPause,
  onSkipToStart,
}: PlaybackControlsProps) {
  const formatTime = (seconds: number) => {
    if (seconds === 0 && videoDuration === 0) {
      return "--:--"
    }
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const subSecs = Math.floor((seconds % 1) * 100)
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(subSecs).padStart(2, "0")}`
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-xs font-mono text-foreground min-w-fit tracking-tight">
        {hasVideo ? `${formatTime(currentTime)} / ${formatTime(videoDuration)}` : "--:-- / --:--"}
      </div>

      <div className="flex gap-1">
        <button
          onClick={onSkipToStart}
          className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
        >
          <SkipBack size={14} />
        </button>
        <button
          onClick={onPlayPause}
          className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>
    </div>
  )
}
