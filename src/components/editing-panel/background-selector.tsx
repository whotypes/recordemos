import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useImageUpload } from "@/lib/hooks/use-image-upload"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { gradients, type Gradient } from "@/presets/gradients"
import { solidColors } from "@/presets/solid-colors"
import { useQuery } from "@tanstack/react-query"
import { Palette, Settings2, Upload, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { HexColorInput, HexColorPicker } from "react-colorful"
import { toast } from "sonner"

interface UnsplashPhoto {
  id: string
  user: {
    first_name: string
    username: string
  }
  links: {
    html: string
  }
  urls: {
    regular: string
    small_s3: string
    full: string
  }
  alt_description?: string
}

export default function BackgroundSelector() {
  const {
    backgroundColor,
    setBackgroundColor,
    backgroundType,
    setBackgroundType,
    imageBackground,
    setImageBackground,
    highResBackground,
    setHighResBackground,
    setAttribution,
  } = useVideoOptionsStore()
  const videoSrc = useVideoPlayerStore((state) => state.videoSrc)

  const isDisabled = !videoSrc
  const [currentPage, setCurrentPage] = useState(1)
  const [gradientPage, setGradientPage] = useState(1)

  const { handleImageUpload } = useImageUpload()
  const imageInputRef = useRef<HTMLInputElement>(null)

  const fetchUnsplashPatterns = async (page: number): Promise<UnsplashPhoto[]> => {
    const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
    if (!accessKey) {
      throw new Error("Unsplash API key not configured")
    }
    const response = await fetch(
      `https://api.unsplash.com/collections/W121KJsaTEs/photos?page=${page}&per_page=20&q=100&client_id=${accessKey}`
    )
    if (!response.ok) {
      throw new Error("Failed to fetch wallpapers")
    }
    const data = await response.json()
    return data
  }

  const {
    isLoading: isLoadingWallpapers,
    isError: isErrorWallpapers,
    data: unsplashData,
    error: wallpaperError,
  } = useQuery({
    queryKey: ["unsplash-patterns", currentPage],
    queryFn: () => fetchUnsplashPatterns(currentPage),
    enabled: !isDisabled,
  })

  useEffect(() => {
    if (isErrorWallpapers && wallpaperError instanceof Error) {
      toast.error("Error", { description: wallpaperError.message })
    }
  }, [isErrorWallpapers, wallpaperError])

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

  const gradientsPerPage = 20
  const totalGradientPages = Math.ceil(gradients.length / gradientsPerPage)
  const startGradientIndex = (gradientPage - 1) * gradientsPerPage
  const endGradientIndex = startGradientIndex + gradientsPerPage
  const paginatedGradients = gradients.slice(startGradientIndex, endGradientIndex)

  return (
    <div className="w-full">
      {isDisabled && (
        <div className="mb-4 p-3 bg-muted/50 border border-border rounded-md">
          <p className="text-xs text-muted-foreground">
            Upload or record a video to customize backgrounds
          </p>
        </div>
      )}

      <div className={isDisabled ? 'pointer-events-none opacity-40' : ''}>
        <div>
          <h3 className="mt-8 flex items-center gap-2 text-xs font-medium uppercase text-dark/70">
            <span>Wallpapers</span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md hover:bg-accent"
                  aria-label="Wallpaper settings"
                >
                  <Settings2 size={16} className="rotate-90" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="flex w-fit flex-col gap-3">
                <div className="flex items-center gap-3">
                  <h1 className="text-sm">High Resolution Background</h1>
                  <Switch
                    checked={highResBackground}
                    onCheckedChange={(checked) => {
                      setHighResBackground(checked)
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </h3>

          {isLoadingWallpapers && (
            <ul className="mt-4 grid grid-cols-4 gap-3 md:grid-cols-5">
              {Array.from({ length: 20 }).map((_, index) => (
                <li key={`skeleton-${index}`} className="h-16 w-16 rounded-md">
                  <Skeleton className="h-full w-full rounded-md" />
                </li>
              ))}
            </ul>
          )}

          {isErrorWallpapers && wallpaperError instanceof Error && (
            <div className="mt-4">
              <span className="text-xs text-muted-foreground">Error: {wallpaperError.message}</span>
            </div>
          )}

          {!isLoadingWallpapers && !isErrorWallpapers && unsplashData && (
            <>
              <ul className="mt-4 grid grid-cols-4 gap-3 md:grid-cols-5">
                {unsplashData.map((data: UnsplashPhoto) => {
                  const imageUrl = highResBackground ? data.urls.full : data.urls.regular
                  const isSelected = imageBackground === imageUrl
                  return (
                    <li key={data.id} className="h-16 w-16 rounded-md">
                      <button
                        type="button"
                        className={`h-full w-full rounded-md overflow-hidden ${
                          isSelected
                            ? "outline-none ring-2 ring-ring ring-offset-2"
                            : ""
                        }`}
                        onClick={() => {
                          setBackgroundType("image")
                          setImageBackground(imageUrl)
                          setAttribution({
                            name: data.user.first_name,
                            link: data.user.username,
                          })
                        }}
                      >
                        <img
                          className="h-full w-full rounded-md object-cover"
                          src={data.urls.small_s3}
                          alt={data.alt_description || "Wallpaper"}
                          loading="lazy"
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  className="text-sm"
                  onClick={() => {
                    setCurrentPage((prevPage) => prevPage - 1)
                  }}
                >
                  ← Back
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= 5}
                  className="text-sm"
                  onClick={() => {
                    setCurrentPage((prevPage) => prevPage + 1)
                  }}
                >
                  Next →
                </Button>
              </div>
            </>
          )}
        </div>

        <div>
          <h3 className="mt-8 text-xs font-medium uppercase text-dark/70">
            Gradients
          </h3>
          <ul className="mt-4 grid grid-cols-4 gap-3 md:grid-cols-5">
            {paginatedGradients.map((gradient) => {
              const isSelected = gradient.gradient === backgroundColor && (backgroundType === 'gradient' || backgroundType === 'mesh')
              return (
                <li key={gradient.gradient} className="h-16 w-16 rounded-md">
                  <button
                    type="button"
                    className={`h-full w-full rounded-md overflow-hidden ${
                      isSelected
                        ? "outline-none ring-2 ring-ring ring-offset-2"
                        : ""
                    }`}
                    onClick={() => handleGradientClick(gradient, gradient.type === 'Mesh')}
                    style={
                      gradient.type === 'Normal'
                        ? { background: gradient.gradient }
                        : { backgroundColor: gradient.background, backgroundImage: gradient.gradient }
                    }
                  />
                </li>
              )
            })}
          </ul>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={gradientPage === 1}
              className="text-sm"
              onClick={() => {
                setGradientPage((prevPage) => prevPage - 1)
              }}
            >
              ← Back
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={gradientPage >= totalGradientPages}
              className="text-sm"
              onClick={() => {
                setGradientPage((prevPage) => prevPage + 1)
              }}
            >
              Next →
            </Button>
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
    </div>
  )
}
