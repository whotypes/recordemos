import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CircleDot,
  RotateCcw,
} from "lucide-react"
import { useCallback, useEffect } from "react"

const PositionControl = () => {
  const { translateX, setTranslateX, translateY, setTranslateY } = useVideoOptionsStore()
  const videoSrc = useVideoPlayerStore((state) => state.videoSrc)

  const move = useCallback(
    (deltaX: number, deltaY: number) => {
      setTranslateX(translateX + deltaX)
      setTranslateY(translateY + deltaY)
    },
    [translateX, translateY, setTranslateX, setTranslateY]
  )

  useEffect(() => {
    if (!videoSrc) return

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          move(0, -5)
          break
        case 'ArrowDown':
          move(0, 5)
          break
        case 'ArrowLeft':
          move(-5, 0)
          break
        case 'ArrowRight':
          move(5, 0)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [move, videoSrc])

  const centerVideo = () => {
    setTranslateX(0)
    setTranslateY(0)
  }

  return (
    <div className="w-full flex justify-center items-center">
      <div
        className={`relative grid h-40 w-full grid-cols-3 overflow-hidden rounded-lg border bg-card [&>*]:cursor-pointer [&>*]:border-dashed [&>*]:border-border [&>*]:transition-colors ${videoSrc ? '' : 'pointer-events-none opacity-40'}`}
      >
        <button
          className="flex items-center justify-center border-b-2 border-r-2 hover:bg-muted"
          aria-label="Translate up left"
          onClick={() => move(-5, -5)}
        >
          <ArrowUpLeft size={21} aria-hidden />
        </button>
        <button
          className="flex items-center justify-center border-b-2 border-r-2 hover:bg-muted"
          aria-label="Translate up"
          onClick={() => move(0, -5)}
        >
          <ArrowUp size={21} aria-hidden />
        </button>
        <button
          className="flex items-center justify-center border-b-2 hover:bg-muted"
          aria-label="Translate up right"
          onClick={() => move(5, -5)}
        >
          <ArrowUpRight size={21} aria-hidden />
        </button>
        <button
          className="flex items-center justify-center border-b-2 border-r-2 hover:bg-muted"
          aria-label="Translate left"
          onClick={() => move(-5, 0)}
        >
          <ArrowLeft size={21} aria-hidden />
        </button>
        <button
          className="flex items-center justify-center border-b-2 border-r-2 hover:bg-muted"
          aria-label="Center video"
          onClick={centerVideo}
        >
          <CircleDot size={21} aria-hidden />
        </button>
        <button
          className="flex items-center justify-center border-b-2 hover:bg-muted"
          aria-label="Translate right"
          onClick={() => move(5, 0)}
        >
          <ArrowRight size={21} aria-hidden />
        </button>
        <button
          className="flex items-center justify-center border-r-2 hover:bg-muted"
          aria-label="Translate down left"
          onClick={() => move(-5, 5)}
        >
          <ArrowDownLeft size={21} aria-hidden />
        </button>
        <button
          className="flex items-center justify-center border-r-2 hover:bg-muted"
          aria-label="Translate down"
          onClick={() => move(0, 5)}
        >
          <ArrowDown size={21} aria-hidden />
        </button>
        <button
          className="flex items-center justify-center hover:bg-muted"
          aria-label="Translate down right"
          onClick={() => move(5, 5)}
        >
          <ArrowDownRight size={21} aria-hidden />
        </button>
      </div>
    </div>
  )
}

export default function VideoControls() {
  const {
    scale,
    setScale,
    translateX,
    setTranslateX,
    translateY,
    setTranslateY,
    perspective,
    setPerspective,
    rotateX,
    setRotateX,
    rotateY,
    setRotateY,
    rotateZ,
    setRotateZ,
  } = useVideoOptionsStore()
  const { videoSrc, loop, setLoop, muted, setMuted } = useVideoPlayerStore()

  const isDisabled = !videoSrc

  return (
    <div className={`w-full ${isDisabled ? 'pointer-events-none opacity-40' : ''}`}>
      {/* Playback Options */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-medium uppercase text-dark/70">Playback</h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label htmlFor="loop-checkbox" className="text-sm text-foreground cursor-pointer">
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
            <label htmlFor="mute-checkbox" className="text-sm text-foreground cursor-pointer">
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

      <hr className="my-6" />

      {/* Scale */}
      <div className="mb-8">
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

      <hr className="my-6" />

      {/* Position */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-medium uppercase text-dark/70">Position</h3>
        <PositionControl />

        <div className="mb-3 mt-6 flex items-center justify-center">
          <h3 className="text-xs font-medium uppercase text-dark/70">Translate X</h3>
          <p className="ml-2 rounded-md bg-primary/10 p-[0.4rem] text-[0.8rem] text-dark/70">
            {`${Math.round(translateX)}px`}
          </p>
          <Button
            aria-label="reset translate x"
            variant="secondary"
            size="sm"
            className="ml-2"
            onClick={() => setTranslateX(0)}
          >
            <RotateCcw size={15} className="text-dark/80" />
          </Button>
        </div>

        <div className="flex justify-center gap-4 text-[0.85rem]">
          <Slider
            defaultValue={[0]}
            max={1000}
            min={-1000}
            step={0.001}
            value={[translateX]}
            onValueChange={(value: number[]) => {
              setTranslateX(value[0])
            }}
            onIncrement={() => {
              if (translateX >= 1000) return
              setTranslateX(translateX + 1)
            }}
            onDecrement={() => {
              if (translateX <= -1000) return
              setTranslateX(translateX - 1)
            }}
          />
        </div>

        <div className="mb-3 mt-3 flex items-center justify-center">
          <h3 className="text-xs font-medium uppercase text-dark/70">Translate Y</h3>
          <p className="ml-2 rounded-md bg-primary/10 p-[0.4rem] text-[0.8rem] text-dark/70">
            {`${Math.round(translateY)}px`}
          </p>
          <Button
            aria-label="reset translate y"
            variant="secondary"
            size="sm"
            className="ml-2"
            onClick={() => setTranslateY(0)}
          >
            <RotateCcw size={15} className="text-dark/80" />
          </Button>
        </div>

        <div className="flex justify-center gap-4 text-[0.85rem]">
          <Slider
            defaultValue={[0]}
            max={500}
            min={-500}
            step={0.001}
            value={[translateY]}
            onValueChange={(value: number[]) => {
              setTranslateY(value[0])
            }}
            onIncrement={() => {
              if (translateY >= 500) return
              setTranslateY(translateY + 1)
            }}
            onDecrement={() => {
              if (translateY <= -500) return
              setTranslateY(translateY - 1)
            }}
          />
        </div>
      </div>

      <hr className="my-6" />

      {/* 3D Perspective */}
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
