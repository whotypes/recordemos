import { Button } from "@/components/ui/button"
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
import VideoScale from "./video-scale"

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

export default function VideoTranslate() {
  const { translateX, setTranslateX, translateY, setTranslateY } = useVideoOptionsStore()
  const videoSrc = useVideoPlayerStore((state) => state.videoSrc)

  return (
    <div className="w-full">
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-medium uppercase text-dark/70">Position</h3>
        <PositionControl />
      </div>
      <div className="mb-2">
        <VideoScale />
      </div>
      <div className="mb-4">
        <div className={`w-full ${videoSrc ? '' : 'pointer-events-none opacity-40'}`}>
          <div className="mb-3 flex items-center justify-center">
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
      </div>
    </div>
  )
}
