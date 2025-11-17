import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Pause, Play, Repeat, SkipBack, Volume2, VolumeX } from "lucide-react"

interface PlaybackControlsProps {
  hasVideo: boolean
  currentTime: number
  videoDuration: number
  isPlaying: boolean
  loop: boolean
  muted: boolean
  onPlayPause: () => void
  onSkipToStart: () => void
  onToggleLoop: () => void
  onToggleMute: () => void
}

export default function PlaybackControls({
  hasVideo,
  currentTime,
  videoDuration,
  isPlaying,
  loop,
  muted,
  onPlayPause,
  onSkipToStart,
  onToggleLoop,
  onToggleMute,
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
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onSkipToStart}
                  className="p-1.5 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
                >
                  <SkipBack size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <span>Skip to start</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onPlayPause}
                  className="p-1.5 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <span>{isPlaying ? "Pause" : "Play"}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="text-xs font-mono text-foreground min-w-fit tracking-tight">
          {hasVideo ? `${formatTime(currentTime)} / ${formatTime(videoDuration)}` : "--:-- / --:--"}
        </div>

        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleLoop}
                  className={`p-1.5 hover:bg-accent rounded transition-colors ${
                    loop ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Repeat size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <span>{loop ? "Disable loop" : "Enable loop"}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleMute}
                  className="p-1.5 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <span>{muted ? "Unmute" : "Mute"}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}
