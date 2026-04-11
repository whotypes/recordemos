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
    <div className="mb-8 w-full">
      <h3 className="mb-4 text-xs font-medium uppercase text-dark/70">Playback</h3>
      <div
        className={`flex flex-col gap-4 ${isDisabled ? "pointer-events-none opacity-40" : ""}`}
      >
        <div className="flex items-center justify-between">
          <label htmlFor="loop-checkbox" className="cursor-pointer text-sm text-foreground">
            Loop video
          </label>
          <Checkbox
            id="loop-checkbox"
            checked={loop}
            onCheckedChange={(checked) => setLoop(checked === true)}
            disabled={isDisabled}
          />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="mute-checkbox" className="cursor-pointer text-sm text-foreground">
            Mute audio
          </label>
          <Checkbox
            id="mute-checkbox"
            checked={muted}
            onCheckedChange={(checked) => setMuted(checked === true)}
            disabled={isDisabled}
          />
        </div>
      </div>
    </div>
  )
}
