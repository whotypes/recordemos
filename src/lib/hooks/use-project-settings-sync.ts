import { useFrameOptionsStore } from "@/lib/frame-options-store"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { useMutation } from "convex/react"
import { useEffect, useRef } from "react"

export const useProjectSettingsSync = (projectId: Id<"projects"> | null) => {
  const updateSettings = useMutation(api.project_settings.update)

  // video options store
  const aspectRatio = useVideoOptionsStore((state) => state.aspectRatio)
  const backgroundColor = useVideoOptionsStore((state) => state.backgroundColor)
  const backgroundType = useVideoOptionsStore((state) => state.backgroundType)
  const gradientAngle = useVideoOptionsStore((state) => state.gradientAngle)
  const zoomLevel = useVideoOptionsStore((state) => state.zoomLevel)
  const hideToolbars = useVideoOptionsStore((state) => state.hideToolbars)
  const scale = useVideoOptionsStore((state) => state.scale)
  const translateX = useVideoOptionsStore((state) => state.translateX)
  const translateY = useVideoOptionsStore((state) => state.translateY)
  const rotateX = useVideoOptionsStore((state) => state.rotateX)
  const rotateY = useVideoOptionsStore((state) => state.rotateY)
  const rotateZ = useVideoOptionsStore((state) => state.rotateZ)
  const perspective = useVideoOptionsStore((state) => state.perspective)

  // frame options store
  const frameHeight = useFrameOptionsStore((state) => state.frameHeight)
  const showSearchBar = useFrameOptionsStore((state) => state.showSearchBar)
  const showStroke = useFrameOptionsStore((state) => state.showStroke)
  const macOsDarkColor = useFrameOptionsStore((state) => state.macOsDarkColor)
  const macOsLightColor = useFrameOptionsStore((state) => state.macOsLightColor)
  const arcDarkMode = useFrameOptionsStore((state) => state.arcDarkMode)
  const hideButtons = useFrameOptionsStore((state) => state.hideButtons)
  const hasButtonColor = useFrameOptionsStore((state) => state.hasButtonColor)
  const selectedFrame = useFrameOptionsStore((state) => state.selectedFrame)
  const frameRoundness = useFrameOptionsStore((state) => state.frameRoundness)
  const searchBarText = useFrameOptionsStore((state) => state.searchBarText)

  const isInitialMount = useRef(true)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // skip the initial mount to avoid overwriting restored settings
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (!projectId) return

    // clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // only sync solid colors and standard gradients (not custom images or mesh)
    const syncableBackground = backgroundType === 'solid' || backgroundType === 'gradient'
      ? backgroundColor
      : '#000000'

    // debounce the update
    debounceTimer.current = setTimeout(async () => {
      try {
        await updateSettings({
          projectId,
          // frame/canvas settings
          aspectRatio,
          zoomLevel,
          hideToolbars,
          // background settings
          backgroundColor: syncableBackground,
          backgroundType,
          gradientAngle,
          // video transform settings
          scale,
          translateX,
          translateY,
          rotateX,
          rotateY,
          rotateZ,
          perspective,
          // browser frame settings
          frameHeight,
          showSearchBar,
          showStroke,
          macOsDarkColor,
          macOsLightColor,
          arcDarkMode,
          hideButtons,
          hasButtonColor,
          selectedFrame,
          frameRoundness,
          searchBarText,
        })
      } catch (error) {
        console.error("Failed to sync project settings:", error)
      }
    }, 500)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [
    projectId,
    updateSettings,
    // video options
    aspectRatio,
    backgroundColor,
    backgroundType,
    gradientAngle,
    zoomLevel,
    hideToolbars,
    scale,
    translateX,
    translateY,
    rotateX,
    rotateY,
    rotateZ,
    perspective,
    // frame options
    frameHeight,
    showSearchBar,
    showStroke,
    macOsDarkColor,
    macOsLightColor,
    arcDarkMode,
    hideButtons,
    hasButtonColor,
    selectedFrame,
    frameRoundness,
    searchBarText,
  ])
}
