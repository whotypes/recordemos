'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { FrameTypes, useFrameOptionsStore } from '@/lib/frame-options-store'
import { cn } from '@/lib/utils'
import { useVideoPlayerStore } from '@/lib/video-player-store'
import { Palette, Settings2 } from 'lucide-react'
import { HexAlphaColorPicker, HexColorInput } from 'react-colorful'

const FrameContainer = ({
  children,
  text,
  onClick,
  className,
  isSelected,
}: {
  children: React.ReactNode
  text: FrameTypes
  onClick?: () => void
  className?: string
  isSelected: boolean
}) => {
  return (
    <div>
      <button
        onClick={onClick}
        className={cn(
          'relative h-[3.55rem] w-[4.6rem] overflow-hidden whitespace-nowrap rounded-lg border border-border/80 bg-muted ring-offset-background transition-colors focus:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          isSelected && 'ring-2 ring-ring ring-offset-2',
          className
        )}
      >
        <div
          className={cn(
            'absolute bottom-0 h-2/3 w-2/3 translate-x-1/2 translate-y-1 scale-150 overflow-hidden rounded-sm',
            className
          )}
          style={{
            boxShadow: `0px 10px 40px #000${text === 'Shadow' ? ',-4px -3.5px rgba(0,0,0,0.8)' : ''}`,
          }}
        >
          {children}
        </div>
      </button>
      <p className="mt-2 text-center text-[0.75rem] font-medium text-foreground">
        {text.replace('MacOS', 'Mac')}
      </p>
    </div>
  )
}

export default function BrowserAppearance() {
  const {
    selectedFrame,
    setSelectedFrame,
    frameHeight,
    setFrameHeight,
    showSearchBar,
    setShowSearchBar,
    showStroke,
    setShowStroke,
    macOsDarkColor,
    setMacOsDarkColor,
    macOsLightColor,
    setMacOsLightColor,
    arcDarkMode,
    setArcDarkMode,
    hideButtons,
    setHideButtons,
    hasButtonColor,
    setHasButtonColor,
    frameRoundness,
    setFrameRoundness,
    searchBarText,
    setSearchBarText,
  } = useFrameOptionsStore()
  const videoSrc = useVideoPlayerStore((state) => state.videoSrc)

  const isDisabled = !videoSrc

  const frameChangeHandler = (frame: FrameTypes) => {
    setSelectedFrame(frame)
    const roundnessMap: Record<FrameTypes, number> = {
      'None': 0.4,
      'Arc': 1.5,
      'Shadow': 0.7,
      'MacOS Dark': 0.7,
      'MacOS Light': 0.7,
    }
    setFrameRoundness(roundnessMap[frame] || 0.4)
  }

  return (
    <div className="w-full">
      {isDisabled && (
        <div className="mb-4 p-3 bg-muted/50 border border-border rounded-md">
          <p className="text-xs text-muted-foreground">
            Upload or record a video to customize browser frame
          </p>
        </div>
      )}

      <div className={isDisabled ? 'pointer-events-none opacity-40' : ''}>
        <div className="mb-3 flex items-center px-1">
        <h1 className="text-[0.85rem]">Browser Frames</h1>
      </div>

      <div className="mt-2 grid w-full grid-cols-3 flex-wrap gap-x-2.5 gap-y-6">
        <FrameContainer
          text="None"
          onClick={() => frameChangeHandler('None')}
          isSelected={selectedFrame === 'None'}
        >
          <div className="flex h-full w-full flex-col justify-center overflow-hidden rounded-sm">
            <div className="w-full flex-1 bg-primary/80" />
          </div>
        </FrameContainer>

        <FrameContainer
          text="MacOS Dark"
          onClick={() => frameChangeHandler('MacOS Dark')}
          isSelected={selectedFrame === 'MacOS Dark'}
        >
          <div className="flex h-full w-full flex-col justify-center overflow-hidden rounded-sm">
            <div className="flex w-full basis-[30%] bg-[#454545] shadow-sm">
              <div className="flex basis-[50%] items-center justify-center gap-0.5">
                <div className="h-1 w-1 rounded-full bg-[#f7645ccc]" />
                <div className="h-1 w-1 rounded-full bg-[#fbc341d2]" />
                <div className="h-1 w-1 rounded-full bg-[#3cc84ac5]" />
              </div>
            </div>
            <div className="w-full flex-1 bg-primary/80" />
          </div>
        </FrameContainer>

        <FrameContainer
          text="MacOS Light"
          onClick={() => frameChangeHandler('MacOS Light')}
          isSelected={selectedFrame === 'MacOS Light'}
        >
          <div className="flex h-full w-full flex-col justify-center overflow-hidden rounded-sm">
            <div className="flex w-full basis-[30%] bg-[#E3E2E3] shadow-sm">
              <div className="flex basis-[50%] items-center justify-center gap-0.5">
                <div className="h-1 w-1 rounded-full bg-[#f7645ccc]" />
                <div className="h-1 w-1 rounded-full bg-[#fbc341d2]" />
                <div className="h-1 w-1 rounded-full bg-[#3cc84ac5]" />
              </div>
            </div>
            <div className="w-full flex-1 bg-primary/80" />
          </div>
        </FrameContainer>

        <FrameContainer
          text="Arc"
          onClick={() => frameChangeHandler('Arc')}
          isSelected={selectedFrame === 'Arc'}
        >
          <div className="flex h-[4.5rem] w-24 items-center justify-center flex-col rounded-sm border border-white/20 bg-white/20 p-1 shadow-xl">
            <div className="h-full w-full rounded-[2px] bg-primary shadow-sm" />
          </div>
        </FrameContainer>

        <FrameContainer
          text="Shadow"
          onClick={() => frameChangeHandler('Shadow')}
          isSelected={selectedFrame === 'Shadow'}
          className="translate-y-2"
        >
          <div className="flex h-[4.5rem] w-24 items-center justify-center flex-col rounded-sm">
            <div className="h-full w-full rounded-[2px] bg-primary/80" />
          </div>
        </FrameContainer>
      </div>

      {selectedFrame !== 'Shadow' && selectedFrame !== 'None' && (
        <div className="mt-8 flex flex-col gap-3 px-1">
          <h1 className="text-[0.85rem]">Frame Size</h1>
          <Select value={frameHeight} onValueChange={(value: 'small' | 'medium' | 'large') => setFrameHeight(value)}>
            <SelectTrigger className="w-[7rem] border border-border/30">
              <SelectValue placeholder="Medium" />
            </SelectTrigger>
            <SelectContent className="w-[7rem]">
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="mt-8">
        <h3 className="mb-6 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
          <Settings2 size={20} />
          <span>Additional Options</span>
        </h3>

          {(selectedFrame === 'MacOS Dark' || selectedFrame === 'MacOS Light') && (
            <>
              <div className="mb-6 flex items-center justify-between gap-4 px-1">
                <h1 className="text-[0.85rem]">Show Search Bar</h1>
                <Switch checked={showSearchBar} onCheckedChange={setShowSearchBar} />
              </div>

              {showSearchBar && (
                <div className="mb-6 flex flex-col gap-2 px-1">
                  <h1 className="text-[0.85rem]">Search Bar Text</h1>
                  <Input
                  type="text"
                    placeholder="Enter search bar text..."
                    value={searchBarText}
                    onChange={(e) => setSearchBarText(e.target.value)}
                  className="w-full placeholder:text-transparent placeholder:opacity-0 focus:placeholder:opacity-0 focus:placeholder:text-transparent placeholder:background-transparent"
                  />
                </div>
              )}

              <div className="mb-6 flex items-center justify-between gap-4 px-1">
                <h1 className="text-[0.85rem]">Colorful Buttons</h1>
                <Switch checked={hasButtonColor} onCheckedChange={setHasButtonColor} />
              </div>

              <div className="mb-6 flex items-center justify-between gap-4 px-1">
                <h1 className="text-[0.85rem]">Hide Buttons</h1>
                <Switch checked={hideButtons} onCheckedChange={setHideButtons} />
              </div>

              <div className="mb-6 flex items-center justify-between gap-4 px-1">
                <h1 className="text-[0.85rem]">Frame Color</h1>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Palette className="h-4 w-4" />
                      <span
                        className="h-4 w-4 rounded border border-border"
                        style={{
                          backgroundColor:
                            selectedFrame === 'MacOS Dark' ? macOsDarkColor : macOsLightColor,
                        }}
                      />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <HexAlphaColorPicker
                      color={selectedFrame === 'MacOS Dark' ? macOsDarkColor : macOsLightColor}
                      onChange={(color) => {
                        if (selectedFrame === 'MacOS Dark') {
                          setMacOsDarkColor(color)
                        } else {
                          setMacOsLightColor(color)
                        }
                      }}
                    />
                    <div className="mt-4">
                      <HexColorInput
                        tabIndex={0}
                        prefix="#"
                        prefixed
                        color={selectedFrame === 'MacOS Dark' ? macOsDarkColor : macOsLightColor}
                        onChange={(color) => {
                          if (selectedFrame === 'MacOS Dark') {
                            setMacOsDarkColor(color)
                          } else {
                            setMacOsLightColor(color)
                          }
                        }}
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          {selectedFrame === 'Shadow' && (
            <div className="mb-6 flex items-center gap-4 px-1">
              <h1 className="text-[0.85rem]">Show Outline</h1>
              <Switch checked={showStroke} onCheckedChange={setShowStroke} />
            </div>
          )}

          {selectedFrame === 'Arc' && (
            <div className="mb-6 flex items-center gap-4 px-1">
              <h1 className="text-[0.85rem]">Dark Mode</h1>
              <Switch checked={arcDarkMode} onCheckedChange={setArcDarkMode} />
            </div>
          )}

          <div className="mb-6 flex items-center justify-between gap-4 px-1">
            <h1 className="text-[0.85rem]">Roundness</h1>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={frameRoundness}
                onChange={(e) => setFrameRoundness(parseFloat(e.target.value))}
                className="h-2 w-24 rounded-lg appearance-none bg-input accent-primary"
              />
              <span className="text-xs text-muted-foreground w-8">{frameRoundness.toFixed(1)}</span>
            </div>
          </div>
      </div>
      </div>
    </div>
  )
}
