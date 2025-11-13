import { Slider } from "@/components/ui/slider"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { useVideoPlayerStore } from "@/lib/video-player-store"

export default function VideoScale() {
  const { scale, setScale } = useVideoOptionsStore()
  const videoSrc = useVideoPlayerStore((state) => state.videoSrc)

  return (
    <div className={`w-full ${videoSrc ? '' : 'pointer-events-none opacity-40'}`}>
      <div className="mb-3 flex items-center justify-center">
        <h3 className="text-xs font-medium uppercase text-dark/70">Scale</h3>
        <p className="ml-2 rounded-md bg-primary/10 p-[0.4rem] text-[0.8rem] text-dark/70">
          {Math.round(scale * 100)}%
        </p>
      </div>

      <div className="flex justify-center gap-4 text-[0.85rem]">
        <Slider
          defaultValue={[1]}
          max={3}
          min={0.25}
          step={0.01}
          onValueChange={(value: number[]) => {
            setScale(value[0])
          }}
          value={[scale]}
          onIncrement={() => {
            if (scale >= 3) return
            setScale(scale + 0.05)
          }}
          onDecrement={() => {
            if (scale <= 0.25) return
            setScale(scale - 0.05)
          }}
        />
      </div>
    </div>
  )
}
