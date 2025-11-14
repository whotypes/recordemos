'use client'

import { FrameTypes, useFrameOptionsStore } from '@/lib/frame-options-store'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'

const FrameButton = ({ color }: { color: string }) => (
  <div
    className="rounded-full"
    style={{
      backgroundColor: color,
    }}
  />
)

const FrameButtons = ({
  hasButtonColor,
  frame,
}: {
  hasButtonColor: boolean
  frame: FrameTypes
}) => {
  const { frameHeight } = useFrameOptionsStore()
  let colors: string[] = []

  if (hasButtonColor && frame === 'MacOS Dark') {
    colors = ['#f7645c', '#fbc341', '#3cc84a']
  } else if (hasButtonColor && frame === 'MacOS Light') {
    colors = ['#f7645ccc', '#fbc341d2', '#3cc84ac5']
  } else if (!hasButtonColor && frame === 'MacOS Dark') {
    colors = ['#ffffff33', '#ffffff33', '#ffffff33']
  } else if (!hasButtonColor && frame === 'MacOS Light') {
    colors = ['#00000033', '#00000033', '#00000033']
  }

  const sizeClass =
    frameHeight === 'small'
      ? 'gap-[0.3vw] [&>*]:h-[0.4vw] [&>*]:w-[0.4vw]'
      : frameHeight === 'medium'
      ? 'gap-[0.35vw] [&>*]:h-[0.5vw] [&>*]:w-[0.5vw]'
      : 'gap-[0.4vw] [&>*]:h-[0.6vw] [&>*]:w-[0.6vw]'

  return (
    <div className={cn('flex basis-[6%]', sizeClass)}>
      {colors.map((color, index) => (
        <FrameButton key={index} color={color} />
      ))}
    </div>
  )
}

const FrameSearchBar = ({ frame, text }: { frame: FrameTypes; text: string }) => {
  const iconSize = frame === 'MacOS Dark' ? 'h-2.5 w-2.5' : 'h-2.5 w-2.5'

  return (
    <div
      className={cn(
        'flex h-[50%] w-full flex-1 items-center gap-2 rounded-xs px-2.5',
        frame === 'MacOS Dark'
          ? 'bg-white/5 backdrop-blur-sm border border-white/5'
          : 'bg-white/60 backdrop-blur-[2.5px] border border-black/10'
      )}
    >
      <Lock className={cn(
        iconSize,
        'shrink-0',
        frame === 'MacOS Dark' ? 'text-white/40' : 'text-black/40'
      )} />
      {text ? (
        <span className={cn(
          'text-xs truncate flex-1',
          frame === 'MacOS Dark' ? 'text-white/40' : 'text-black/50'
        )}>
          {text}
        </span>
      ) : (
        <div className={cn(
          'w-full h-3 rounded',
          frame === 'MacOS Dark' ? 'bg-white/5' : 'bg-black/10'
        )} />
      )}
    </div>
  )
}

const FrameContainer = ({
  frameHeight,
  children,
  style,
  additionalClasses = '',
  roundness = 0.4,
}: {
  frameHeight: string
  children: React.ReactNode
  style: React.CSSProperties
  additionalClasses?: string
  roundness?: number
}) => {
  const heightClass =
    frameHeight === 'small'
      ? 'h-[1.5vw] px-[1vw]'
      : frameHeight === 'medium'
      ? 'h-[1.8vw] px-[1.2vw]'
      : 'h-[2.1vw] px-[1.4vw]'

  return (
    <div
      style={{
        ...style,
        borderTopLeftRadius: `${roundness * 0.5}rem`,
        borderTopRightRadius: `${roundness * 0.5}rem`,
      }}
      className={cn('flex items-center gap-2', heightClass, additionalClasses)}
    >
      {children}
    </div>
  )
}

export function BrowserFrame({
  frame,
  roundness = 0.4,
}: {
  frame: FrameTypes
  roundness?: number
}) {
  const {
    frameHeight,
    showSearchBar,
    macOsDarkColor,
    macOsLightColor,
    hideButtons,
    hasButtonColor,
    showStroke,
    arcDarkMode,
    searchBarText,
  } = useFrameOptionsStore()

  const props = { frame }
    const bottomRadius = roundness + 'rem'

  const frameComponents = {
    'MacOS Dark': (
          <div
              style={{
                  borderBottomLeftRadius: bottomRadius,
                  borderBottomRightRadius: bottomRadius,
              }}
          >
              <FrameContainer
                  style={{ background: macOsDarkColor }}
                  frameHeight={frameHeight}
                  roundness={roundness}
              >
                  {!hideButtons && (
                      <FrameButtons hasButtonColor={hasButtonColor} {...props} />
                  )}
                  {showSearchBar && <FrameSearchBar {...props} text={searchBarText} />}
              </FrameContainer>
          </div>
    ),
    'MacOS Light': (
        <div
            style={{
                borderBottomLeftRadius: bottomRadius,
                borderBottomRightRadius: bottomRadius,
            }}
        >
            <FrameContainer
                style={{ background: macOsLightColor }}
                frameHeight={frameHeight}
                additionalClasses="border-b border-[#00000010]"
                roundness={roundness}
            >
                {!hideButtons && (
                    <FrameButtons hasButtonColor={hasButtonColor} {...props} />
                )}
                {showSearchBar && <FrameSearchBar {...props} text={searchBarText} />}
            </FrameContainer>
        </div>
    ),
    None: null,
    Arc: null,
    Shadow: null,
  }

  return frameComponents[frame] || null
}
