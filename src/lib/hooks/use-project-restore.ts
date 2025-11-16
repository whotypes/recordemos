import { useFrameOptionsStore } from "@/lib/frame-options-store"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { useVideoPlayerStore } from "@/lib/video-player-store"
import { usePlayheadStore } from "@/lib/playhead-store"
import { api } from "convex/_generated/api"
import type { Id } from "convex/_generated/dataModel"
import { useQuery } from "convex/react"
import { useEffect, useRef } from "react"
import { useAuth } from "@clerk/tanstack-react-start"

export const useProjectRestore = (projectId: Id<"projects"> | null) => {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth()

  const primaryVideoAsset = useQuery(
    api.assets.getPrimaryVideoAsset,
    projectId && isAuthLoaded && isSignedIn ? { projectId } : "skip"
  )

  const projectSettings = useQuery(
    api.project_settings.get,
    projectId && isAuthLoaded && isSignedIn ? { projectId } : "skip"
  )

  const { setVideoSrc, setVideoDuration, setVideoFileName, setVideoFileSize, setVideoFileFormat, setCurrentClipAssetId } = useVideoPlayerStore()
  const { setPlayheadMs } = usePlayheadStore()

  const {
    setAspectRatio,
    setBackgroundColor,
    setBackgroundType,
    setGradientAngle,
    setZoomLevel,
    setHideToolbars,
    setScale,
    setTranslateX,
    setTranslateY,
    setRotateX,
    setRotateY,
    setRotateZ,
    setPerspective,
  } = useVideoOptionsStore()

  const {
    setFrameHeight,
    setShowSearchBar,
    setShowStroke,
    setMacOsDarkColor,
    setMacOsLightColor,
    setArcDarkMode,
    setHideButtons,
    setHasButtonColor,
    setSelectedFrame,
    setFrameRoundness,
    setSearchBarText,
  } = useFrameOptionsStore()

  const hasRestoredRef = useRef<string | null>(null)

  useEffect(() => {
    // only restore once per project
    if (!projectId || hasRestoredRef.current === projectId) {
      return
    }

    // restore project settings
    if (projectSettings) {
      // frame/canvas settings
      setAspectRatio(projectSettings.aspectRatio)
      setZoomLevel(projectSettings.zoomLevel)
      setHideToolbars(projectSettings.hideToolbars)

      // background settings
      setBackgroundColor(projectSettings.backgroundColor)
      setBackgroundType(projectSettings.backgroundType as 'solid' | 'gradient' | 'mesh' | 'image')
      setGradientAngle(projectSettings.gradientAngle)

      // video transform settings
      setScale(projectSettings.scale)
      setTranslateX(projectSettings.translateX)
      setTranslateY(projectSettings.translateY)
      setRotateX(projectSettings.rotateX)
      setRotateY(projectSettings.rotateY)
      setRotateZ(projectSettings.rotateZ)
      setPerspective(projectSettings.perspective)

      // browser frame settings
      setFrameHeight(projectSettings.frameHeight as 'small' | 'medium' | 'large')
      setShowSearchBar(projectSettings.showSearchBar)
      setShowStroke(projectSettings.showStroke)
      setMacOsDarkColor(projectSettings.macOsDarkColor)
      setMacOsLightColor(projectSettings.macOsLightColor)
      setArcDarkMode(projectSettings.arcDarkMode)
      setHideButtons(projectSettings.hideButtons)
      setHasButtonColor(projectSettings.hasButtonColor)
      setSelectedFrame(projectSettings.selectedFrame as 'Arc' | 'MacOS Dark' | 'MacOS Light' | 'Shadow' | 'None')
      setFrameRoundness(projectSettings.frameRoundness)
      setSearchBarText(projectSettings.searchBarText)
    }

    // restore video from R2
    if (primaryVideoAsset) {
      setVideoSrc(primaryVideoAsset.url)
      setVideoDuration((primaryVideoAsset.durationMs ?? 0) / 1000)
      setVideoFileName(primaryVideoAsset.originalFileName)
      setVideoFileSize(primaryVideoAsset.sizeBytes)

      const format = primaryVideoAsset.originalFileName.split(".").pop() || "unknown"
      setVideoFileFormat(format)

      setCurrentClipAssetId(primaryVideoAsset._id)
      setPlayheadMs(0, "init") // reset playback position when switching projects

      hasRestoredRef.current = projectId
    } else if (primaryVideoAsset === null) {
      // project exists but no video uploaded yet
      hasRestoredRef.current = projectId
    }
  }, [
    projectId,
    primaryVideoAsset,
    projectSettings,
    setVideoSrc,
    setVideoDuration,
    setVideoFileName,
    setVideoFileSize,
    setVideoFileFormat,
    setCurrentClipAssetId,
    setPlayheadMs,
    setAspectRatio,
    setBackgroundColor,
    setBackgroundType,
    setGradientAngle,
    setZoomLevel,
    setHideToolbars,
    setScale,
    setTranslateX,
    setTranslateY,
    setRotateX,
    setRotateY,
    setRotateZ,
    setPerspective,
    setFrameHeight,
    setShowSearchBar,
    setShowStroke,
    setMacOsDarkColor,
    setMacOsLightColor,
    setArcDarkMode,
    setHideButtons,
    setHasButtonColor,
    setSelectedFrame,
    setFrameRoundness,
    setSearchBarText,
  ])

  return {
    isRestoring: projectId !== null && hasRestoredRef.current !== projectId,
    hasVideo: !!primaryVideoAsset,
  }
}
