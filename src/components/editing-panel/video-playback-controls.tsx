import { Checkbox } from "@/components/ui/checkbox"
import { useVideoPlayerStore } from "@/lib/video-player-store"

export default function VideoPlaybackControls() {
  const videoSrc = useVideoPlayerStore((state) => state.videoSrc)
  const loop = useVideoPlayerStore((state) => state.loop)
  const setLoop = useVideoPlayerStore((state) => state.setLoop)
  const muted = useVideoPlayerStore((state) => state.muted)
  const setMuted = useVideoPlayerStore((state) => state.setMuted)

  const isDisabled = !videoSrc

  return (
    <div className="w-full">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Playback
      </h3>
      <div
        className={`flex flex-col gap-3 ${isDisabled ? "pointer-events-none opacity-40" : ""}`}
      >
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
          <label htmlFor="loop-checkbox" className="cursor-pointer text-sm text-foreground">
            Loop video
          </label>
          <Checkbox
            id="loop-checkbox"
            checked={loop}
            onCheckedChange={(checked) => setLoop(checked === true)}
            disabled={isDisabled}
            className="size-[1.125rem] border-muted-foreground/40 bg-background"
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
          <label htmlFor="mute-checkbox" className="cursor-pointer text-sm text-foreground">
            Mute audio
          </label>
          <Checkbox
            id="mute-checkbox"
            checked={muted}
            onCheckedChange={(checked) => setMuted(checked === true)}
            disabled={isDisabled}
            className="size-[1.125rem] border-muted-foreground/40 bg-background"
          />
        </div>
      </div>
    </div>
  )
}
