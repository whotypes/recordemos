import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useImageUpload } from "@/lib/hooks/use-image-upload"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { gradients, type Gradient } from "@/presets/gradients"
import { solidColors } from "@/presets/solid-colors"
import { Palette, Upload, X } from "lucide-react"
import { useCallback, useRef } from "react"
import { HexColorInput, HexColorPicker } from "react-colorful"

export default function BackgroundSelector() {
  const {
    backgroundColor,
    setBackgroundColor,
    backgroundType,
    setBackgroundType,
  } = useVideoOptionsStore()
  const videoSrc = useVideoPlayerStore((state) => state.videoSrc)

  const isDisabled = !videoSrc

  const { handleImageUpload } = useImageUpload()
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleGradientClick = useCallback(
    (gradient: Gradient, isMesh: boolean) => {
      if (typeof window === 'undefined') return
      document?.documentElement.style.setProperty('--gradient-bg', gradient.gradient)
      document?.documentElement.style.setProperty('--mesh-bg', isMesh ? gradient.background! : gradient.gradient)
      setBackgroundColor(gradient.gradient)
      setBackgroundType(isMesh ? 'mesh' : 'gradient')
    },
    [setBackgroundColor, setBackgroundType]
  )

  const handleColorChange = useCallback(
    (color: string) => {
      if (typeof window === 'undefined') return
      document?.documentElement.style.setProperty('--solid-bg', color)
      document?.documentElement.style.setProperty('--gradient-bg', color)
      document?.documentElement.style.setProperty('--mesh-bg', color)
      setBackgroundType('solid')
      setBackgroundColor(color)
    },
    [setBackgroundColor, setBackgroundType]
  )

  return (
    <div className={`w-full ${isDisabled ? 'pointer-events-none opacity-40' : ''}`}>
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase text-dark/70">
          Gradients
        </h3>
        <div className="grid grid-cols-7 gap-x-8 gap-y-2 justify-items-center">
          {gradients.map((gradient) => (
            <Button
              key={gradient.gradient}
              variant="secondary"
              onClick={() => handleGradientClick(gradient, gradient.type === 'Mesh')}
              className={`size-[1.85rem] overflow-hidden rounded-[0.25rem] p-px ${gradient.gradient === backgroundColor && backgroundType !== 'solid'
                ? "ring-2 ring-ring ring-offset-2 outline-none"
                : ""
                }`}
              style={
                gradient.type === 'Normal'
                  ? { background: gradient.gradient }
                  : { backgroundColor: gradient.background, backgroundImage: gradient.gradient }
              }
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 mt-8 text-xs font-medium uppercase text-dark/70">
          Color Picker
        </h3>
        <div className="flex justify-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="max-w-xs w-full justify-start gap-2"
              >
                <Palette className="h-4 w-4" />
                <span>{backgroundColor.startsWith('#') ? backgroundColor : 'Pick a color'}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <HexColorPicker
                color={backgroundColor.startsWith('#') ? backgroundColor : '#fff'}
                onChange={handleColorChange}
              />
              <div className="mt-4">
                <HexColorInput
                  tabIndex={0}
                  prefix='#'
                  prefixed
                  color={backgroundColor.startsWith('#') ? backgroundColor : '#fff'}
                  onChange={handleColorChange}
                  className="w-full rounded-md border px-2 py-1"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div>
        <h3 className="mt-8 text-xs font-medium uppercase text-dark/70">
          Solid Colors
        </h3>

        <div className="mt-4 grid grid-cols-7 gap-x-8 gap-y-2 justify-items-center">
          {solidColors.map(({ background: solidBackground }) => {
            const isTransparent = solidBackground === 'transparent'
            return (
              <Button
                key={solidBackground}
                variant="secondary"
                onClick={() => handleColorChange(solidBackground)}
                className={`size-[1.85rem] overflow-hidden rounded-[0.25rem] p-px ${backgroundColor === solidBackground && backgroundType === 'solid'
                  ? "ring-2 ring-ring ring-offset-2 outline-none"
                  : ""
                  }`}
                style={isTransparent ? {} : { background: solidBackground }}
              >
                {isTransparent ? (
                  <X className="h-4 w-4 text-accent" />
                ) : null}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <Button
          onClick={() => imageInputRef.current?.click()}
          className="max-w-xs w-full px-3 py-2 bg-accent text-xs text-foreground rounded hover:bg-accent/80 transition-colors flex items-center justify-center gap-2"
          variant="outline"
        >
          <Upload size={14} />
          Custom Image
        </Button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>
    </div>
  )
}
