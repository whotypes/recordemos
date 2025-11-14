import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { RotateCcw } from "lucide-react"

export default function VideoPerspective() {
  const {
    perspective,
    setPerspective,
    rotateX,
    setRotateX,
    rotateY,
    setRotateY,
    rotateZ,
    setRotateZ
  } = useVideoOptionsStore()
  const videoSrc = useVideoPlayerStore((state) => state.videoSrc)

  return (
    <div className={`w-full ${videoSrc ? '' : 'pointer-events-none opacity-40'}`}>
      {/* Perspective */}
      <div className="mb-3 flex items-center justify-center">
        <h3 className="text-xs font-medium uppercase text-dark/70">3D Depth</h3>
        <p className="ml-2 rounded-md bg-primary/10 p-[0.4rem] text-[0.8rem] text-dark/70">
          {`${Math.round(perspective)}px`}
        </p>
        <Button
          aria-label="reset perspective"
          variant="secondary"
          size="sm"
          className="ml-2"
          onClick={() => setPerspective(2000)}
        >
          <RotateCcw size={15} className="text-dark/80" />
        </Button>
      </div>

      <div className="mb-3 flex justify-center gap-4 text-[0.85rem]">
        <Slider
          defaultValue={[2000]}
          max={6500}
          min={0}
          step={0.0001}
          value={[perspective]}
          onValueChange={(value: number[]) => {
            setPerspective(value[0])
          }}
          onIncrement={() => {
            if (perspective >= 6500) return
            setPerspective(Number(perspective) + 500)
          }}
          onDecrement={() => {
            if (perspective <= 0) return
            setPerspective(Number(perspective) - 500)
          }}
        />
      </div>

      <hr className="my-6" />

      {/* RotateX */}
      <div className="mb-3 mt-8 flex items-center justify-center">
        <h3 className="text-xs font-medium uppercase text-dark/70">Rotate X</h3>
        <p className="ml-2 rounded-md bg-primary/10 p-[0.4rem] text-[0.8rem] text-dark/70">
          {`${Math.round(rotateX)}°`}
        </p>
        <Button
          aria-label="reset rotate x"
          variant="secondary"
          size="sm"
          className="ml-2"
          onClick={() => setRotateX(0)}
        >
          <RotateCcw size={15} className="text-dark/80" />
        </Button>
      </div>

      <div className="mb-3 flex justify-center gap-4 text-[0.85rem]">
        <Slider
          defaultValue={[0]}
          max={180}
          min={-180}
          step={0.0001}
          value={[rotateX]}
          onValueChange={(value: number[]) => {
            setRotateX(value[0])
          }}
          onIncrement={() => {
            if (rotateX >= 180) return
            setRotateX(Number(rotateX) + 1)
          }}
          onDecrement={() => {
            if (rotateX <= -180) return
            setRotateX(Number(rotateX) - 1)
          }}
        />
      </div>

      {/* RotateY */}
      <div className="mb-3 mt-3 flex items-center justify-center">
        <h3 className="text-xs font-medium uppercase text-dark/70">Rotate Y</h3>
        <p className="ml-2 rounded-md bg-primary/10 p-[0.4rem] text-[0.8rem] text-dark/70">
          {`${Math.round(rotateY)}°`}
        </p>
        <Button
          aria-label="reset rotate y"
          variant="secondary"
          size="sm"
          className="ml-2"
          onClick={() => setRotateY(0)}
        >
          <RotateCcw size={15} className="text-dark/80" />
        </Button>
      </div>

      <div className="mb-3 flex justify-center gap-4 text-[0.85rem]">
        <Slider
          defaultValue={[0]}
          max={180}
          min={-180}
          step={0.0001}
          value={[rotateY]}
          onValueChange={(value: number[]) => {
            setRotateY(value[0])
          }}
          onIncrement={() => {
            if (rotateY >= 180) return
            setRotateY(Number(rotateY) + 1)
          }}
          onDecrement={() => {
            if (rotateY <= -180) return
            setRotateY(Number(rotateY) - 1)
          }}
        />
      </div>

      {/* RotateZ */}
      <div className="mb-3 mt-3 flex items-center justify-center">
        <h3 className="text-xs font-medium uppercase text-dark/70">Rotate Z</h3>
        <p className="ml-2 rounded-md bg-primary/10 p-[0.4rem] text-[0.8rem] text-dark/70">
          {`${Math.round(rotateZ)}°`}
        </p>
        <Button
          aria-label="reset rotate z"
          variant="secondary"
          size="sm"
          className="ml-2"
          onClick={() => setRotateZ(0)}
        >
          <RotateCcw size={15} className="text-dark/80" />
        </Button>
      </div>

      <div className="flex justify-center gap-4 text-[0.85rem]">
        <Slider
          defaultValue={[0]}
          max={180}
          min={-180}
          step={0.0001}
          value={[rotateZ]}
          onValueChange={(value: number[]) => {
            setRotateZ(value[0])
          }}
          onIncrement={() => {
            if (rotateZ >= 180) return
            setRotateZ(Number(rotateZ) + 1)
          }}
          onDecrement={() => {
            if (rotateZ <= -180) return
            setRotateZ(Number(rotateZ) - 1)
          }}
        />
      </div>
    </div>
  )
}
