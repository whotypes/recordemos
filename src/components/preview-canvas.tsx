"use client"

import { BrowserFrame } from "@/components/browser-frame"
import { useTheme } from "@/components/theme-provider"
import {
  Dropzone,
  DropZoneArea,
  DropzoneMessage,
  DropzoneTrigger,
  InfiniteProgress,
  useDropzone,
} from "@/components/ui/dropzone"
import { useCompositionStore } from "@/lib/composition-store"
import { DEFAULT_UNSPLASH_PHOTO_URLS } from "@/lib/constants"
import { useFrameOptionsStore } from "@/lib/frame-options-store"
import { useLocalTimelineStore } from "@/lib/local-timeline-store"
import { usePlayheadStore } from "@/lib/playhead-store"
import { cn } from "@/lib/utils"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { setClearFileStatusesRef, useVideoPlayerStore } from "@/lib/video-player-store"
import { gradients } from "@/presets/gradients"
import { CloudUploadIcon } from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useMemo } from "react"

interface PreviewCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
}

const getAspectRatioDimensions = (ratio: string) => {
  const ratios: Record<string, string> = {
    "16:9": "aspect-video",
    "9:16": "aspect-[9/16]",
    "1:1": "aspect-square",
    "4:3": "aspect-[4/3]",
    Custom: "aspect-video",
  }
  return ratios[ratio] || "aspect-video"
}

export default function PreviewCanvas({ videoRef }: PreviewCanvasProps) {
  const { theme } = useTheme()
  const {
    backgroundColor,
    backgroundType,
    imageBackground,
    aspectRatio,
    zoomLevel,
    scale,
    translateX,
    translateY,
    perspective,
    rotateX,
    rotateY,
    rotateZ,
    setBackgroundColor,
    setBackgroundType,
    setImageBackground,
  } = useVideoOptionsStore()
  // use selectors for proper reactivity - subscribe to specific state slices
  const videoSrc = useVideoPlayerStore((state) => state.videoSrc)
  const setVideoSrc = useVideoPlayerStore((state) => state.setVideoSrc)
  const setVideoDuration = useVideoPlayerStore((state) => state.setVideoDuration)
  const setVideoFileName = useVideoPlayerStore((state) => state.setVideoFileName)
  const setVideoFileSize = useVideoPlayerStore((state) => state.setVideoFileSize)
  const setVideoFileFormat = useVideoPlayerStore((state) => state.setVideoFileFormat)
  const muted = useVideoPlayerStore((state) => state.muted)
  const isUploading = useVideoPlayerStore((state) => state.isUploading)
  const uploadProgress = useVideoPlayerStore((state) => state.uploadProgress)
  const uploadStatus = useVideoPlayerStore((state) => state.uploadStatus)
  const cloudUploadEnabled = useVideoPlayerStore((state) => state.cloudUploadEnabled)

  // use store videoSrc directly - it's the source of truth
  const effectiveVideoSrc = videoSrc
  const { setPlayheadMs } = usePlayheadStore()
  const { selectedFrame, frameRoundness, arcDarkMode, frameHeight } = useFrameOptionsStore()
  const { activeVideoBlock } = useCompositionStore()
  const { initializeLocalTimeline } = useLocalTimelineStore()

  // React to theme changes and update background accordingly
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Determine if we're in dark mode based on the actual theme state
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    // Only update if user hasn't manually changed the background
    // we check if current background matches the default for the opposite theme
    const isDefaultLightBg = backgroundColor === gradients[1].gradient && backgroundType === 'gradient'
    const isDefaultDarkBg = backgroundType === 'image' && imageBackground === DEFAULT_UNSPLASH_PHOTO_URLS.regular

    if (isDark && isDefaultLightBg) {
      // Switching to dark mode
      setBackgroundType('image')
      setImageBackground(DEFAULT_UNSPLASH_PHOTO_URLS.regular)
      setBackgroundColor('hsl(240 10% 3.9%)')
    } else if (!isDark && isDefaultDarkBg) {
      // Switching to light mode
      setBackgroundType('gradient')
      setBackgroundColor(gradients[1].gradient)
      setImageBackground(null)
    }
  }, [theme, backgroundColor, backgroundType, imageBackground, setBackgroundColor, setBackgroundType, setImageBackground])

  // Determine the actual background to display
  const displayBackground = useMemo(() => {
    if (backgroundType === 'image' && imageBackground) {
      return {
        backgroundImage: `url(${imageBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    }

    // For gradient or solid backgrounds, use backgroundColor directly
    return { background: backgroundColor }
  }, [backgroundType, imageBackground, backgroundColor])

  const dropzone = useDropzone({
    onDropFile: useCallback(async (file: File) => {
      if (!file.type.startsWith("video/")) {
        return {
          status: "error",
          error: "Please select a video file",
        }
      }

      const currentSrc = useVideoPlayerStore.getState().videoSrc
      if (currentSrc && currentSrc.startsWith("blob:")) {
        // revoke previous blob URL immediately
        try {
          URL.revokeObjectURL(currentSrc)
        } catch {
          // ignore revocation errors
        }
      }

      const url = URL.createObjectURL(file)
      setVideoSrc(url)
      setPlayheadMs(0, "init")
      setVideoDuration(0)

      // Save file metadata
      setVideoFileName(file.name)
      setVideoFileSize(file.size)
      const format = file.type.split('/')[1] || file.name.split('.').pop() || 'unknown'
      setVideoFileFormat(format)

      // if cloud is off, initialize local timeline when video metadata loads
      if (!cloudUploadEnabled) {
        const extractMetadata = async () => {
          const video = document.createElement('video')
          video.preload = 'metadata'
          video.muted = true

          const loadPromise = new Promise<number>((resolve, reject) => {
            video.onloadedmetadata = () => {
              const duration = video.duration
              if (duration && !isNaN(duration) && duration > 0) {
                resolve(duration)
              } else {
                reject(new Error('Invalid duration'))
              }
            }
            video.onerror = () => reject(new Error('Failed to load video metadata'))
            setTimeout(() => reject(new Error('Metadata loading timeout')), 5000)
          })

          video.src = url

          try {
            const duration = await loadPromise
            setVideoDuration(duration)
            initializeLocalTimeline(duration)
          } catch (error) {
            console.error('[UPLOAD] Failed to extract metadata:', error)
          } finally {
            // clean up: remove video element
            video.src = ''
            video.load()
            video.remove()
          }
        }

        extractMetadata()
      }

      return {
        status: "success",
        result: url,
      }
    }, [setVideoSrc, setPlayheadMs, setVideoDuration, setVideoFileName, setVideoFileSize, setVideoFileFormat, cloudUploadEnabled, initializeLocalTimeline]),
    validation: {
      accept: {
        "video/*": [".mp4", ".webm", ".mov", ".avi", ".mkv"],
      },
      maxSize: 500 * 1024 * 1024,
      maxFiles: 1,
    },
  })

  setClearFileStatusesRef(dropzone.clearFileStatuses)

  const playheadMs = usePlayheadStore((state) => state.playheadMs)
  const isPlaying = usePlayheadStore((state) => state.isPlaying)


  // Sync video to playhead only when NOT playing or when seeking
  useEffect(() => {
    if (!videoRef.current || isPlaying) return

    const video = videoRef.current
    if (video.readyState < 2) return

    let targetTime = playheadMs / 1000

    if (activeVideoBlock) {
      targetTime = activeVideoBlock.inAssetTime / 1000
    }

    if (video.duration && !isNaN(video.duration)) {
      targetTime = Math.min(targetTime, video.duration)
    }

    const timeDiff = Math.abs(video.currentTime - targetTime)

    // Only seek if difference is significant
    if (timeDiff > 0.05) {
      video.currentTime = targetTime
    }
  }, [playheadMs, activeVideoBlock, isPlaying])

  // Apply transforms from the active video block (memoized to prevent recalculation)
  const videoTransforms = useMemo(() => {
    if (!activeVideoBlock) return {}

    return {
      transform: `scale(${activeVideoBlock.transforms.scale}) translateX(${activeVideoBlock.transforms.x}px) translateY(${activeVideoBlock.transforms.y}px) rotateZ(${activeVideoBlock.transforms.rotation}deg)`,
      opacity: activeVideoBlock.transforms.opacity,
      willChange: 'transform',
      backfaceVisibility: 'hidden' as const,
      perspective: 1000,
      transformStyle: 'preserve-3d' as const,
    }
  }, [activeVideoBlock])

  // Memoize border radius calculations to avoid recalculating on every render
  const borderRadiusStyles = useMemo(() => {
    const isNoneArcOrShadow = selectedFrame === 'None' || selectedFrame === 'Arc' || selectedFrame === 'Shadow'
    const isArc = selectedFrame === 'Arc'

    const topRadius = isNoneArcOrShadow
      ? (isArc ? `calc(${frameRoundness}rem - 9px)` : `${frameRoundness}rem`)
      : '0'

    const bottomRadius = isArc
      ? `calc(${frameRoundness}rem - 9px)`
      : `${frameRoundness}rem`

    return {
      borderTopLeftRadius: topRadius,
      borderTopRightRadius: topRadius,
      borderBottomLeftRadius: bottomRadius,
      borderBottomRightRadius: bottomRadius,
    }
  }, [selectedFrame, frameRoundness])

  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* Canvas Background */}
      <div
        className="rounded-lg transition-colors duration-300 flex items-center justify-center shadow-lg max-w-4xl w-full h-full aspect-video"
        style={displayBackground}
      >
        {/* Video Container */}
        <div
          className={`${getAspectRatioDimensions(aspectRatio)} max-w-2xl rounded-lg relative group transition-transform duration-150`}
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: "center",
          }}
        >
          {/* Frame Container - gets frame-specific styling */}
          <div
            className={cn(
              "flex flex-col h-full relative",
              selectedFrame !== 'Shadow' && "overflow-hidden"
            )}
            style={{
              transformStyle: 'preserve-3d',
              transformOrigin: '50% 50%',
              transform: 'perspective(' + perspective + 'px) translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scale + ') rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) rotateZ(' + rotateZ + 'deg)',
              borderTopLeftRadius: (selectedFrame === 'None' || selectedFrame === 'Arc' || selectedFrame === 'Shadow') ? frameRoundness + 'rem' : '0',
              borderTopRightRadius: (selectedFrame === 'None' || selectedFrame === 'Arc' || selectedFrame === 'Shadow') ? frameRoundness + 'rem' : '0',
              borderBottomLeftRadius: frameRoundness + 'rem',
              borderBottomRightRadius: frameRoundness + 'rem',
              boxShadow: selectedFrame === 'Shadow'
                ? '0px 18px 88px -4px rgba(0,0,0,0.5), 0px 8px 28px -6px rgba(0,0,0,0.5), 11px 11px rgba(0,0,0,0.8)'
                : 'none',
              padding: selectedFrame === 'Arc'
                ? frameHeight === 'small' ? '8px' : frameHeight === 'medium' ? '11px' : '13px'
                : '0',
              backgroundColor: selectedFrame === 'Arc'
                ? arcDarkMode ? '#00000050' : '#ffffff50'
                : selectedFrame === 'Shadow'
                  ? 'rgba(0,0,0,0.8)'
                  : 'rgba(0,0,0,0.2)',
              border: selectedFrame === 'Arc'
                ? arcDarkMode ? '1px solid #00000020' : '1px solid #ffffff60'
                : 'none',
            }}
          >
            {/* Browser Frame */}
            {selectedFrame !== 'None' && selectedFrame !== 'Arc' && selectedFrame !== 'Shadow' && (
              <BrowserFrame frame={selectedFrame} roundness={frameRoundness} />
            )}

            {/* Upload Progress Overlay */}
            {isUploading && effectiveVideoSrc && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm"
                style={borderRadiusStyles}>
                <div className="flex flex-col items-center gap-4 p-8 w-full max-w-sm">
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <div className="text-center space-y-2 w-full">
                    <p className="text-white font-medium text-lg">
                      {uploadStatus || "Uploading..."}
                    </p>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-white/70 text-sm">
                      {uploadProgress}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {effectiveVideoSrc ? (
              <div
                className="w-full h-full overflow-hidden"
                style={activeVideoBlock?.cropRect ? {
                  clipPath: `inset(${activeVideoBlock.cropRect.y}% ${100 - activeVideoBlock.cropRect.x - activeVideoBlock.cropRect.width}% ${100 - activeVideoBlock.cropRect.y - activeVideoBlock.cropRect.height}% ${activeVideoBlock.cropRect.x}%)`,
                  ...borderRadiusStyles,
                } : borderRadiusStyles}
              >
                <div className="w-full h-full" style={videoTransforms}>
                  <video
                    ref={videoRef}
                    src={effectiveVideoSrc || undefined}
                    className="w-full h-full object-cover"
                    style={borderRadiusStyles}
                    loop={false}
                    muted={muted}
                    playsInline
                    preload="auto"
                    disablePictureInPicture
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget
                      if (video.duration && !isNaN(video.duration) && video.duration > 0) {
                        setVideoDuration(video.duration)
                        if (!cloudUploadEnabled) {
                          initializeLocalTimeline(video.duration)
                        }
                      }
                    }}
                  />
                </div>
              </div>
              ) : (
                  <Dropzone {...dropzone}>
                    <div className="h-full w-full">
                    <DropZoneArea
                      className="h-full w-full border-2 border-dashed transition-all duration-200 bg-transparent rounded-none group/dropzone
                        border-foreground/5 hover:border-foreground/30
                        hover:bg-foreground/2 dark:hover:bg-foreground/3"
                      style={borderRadiusStyles}>
                        <DropzoneTrigger className="flex flex-col items-center justify-center gap-4 bg-transparent h-full w-full p-10 text-center">
                        <div className="rounded-full bg-foreground/10 dark:bg-foreground/10 p-6 transition-all duration-200 group-hover/dropzone:bg-foreground/10 dark:group-hover/dropzone:bg-foreground/15">
                          <CloudUploadIcon className="size-10 text-foreground/40 dark:text-foreground/50 transition-colors duration-200 group-hover/dropzone:text-foreground/60 dark:group-hover/dropzone:text-foreground/70" />
                        </div>
                          <div className="flex flex-col gap-2">
                          <p className="text-base font-medium text-foreground/80 dark:text-foreground/90 transition-colors duration-200 group-hover/dropzone:text-foreground">
                              Drop video here or click to upload
                            </p>
                          <p className="text-sm text-foreground/50 dark:text-foreground/60">
                              Supports MP4, WebM, MOV, AVI, MKV (max 500MB)
                            </p>
                          </div>
                          {dropzone.fileStatuses.length > 0 && (
                            <div className="w-full max-w-md mt-4">
                              {dropzone.fileStatuses.map((file) => (
                                <div key={file.id} className="flex flex-col gap-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-foreground/60 dark:text-foreground/70 truncate flex-1 mr-2">
                                      {file.fileName}
                                    </span>
                                    <span className="text-xs text-foreground/50 dark:text-foreground/60">
                                      {(file.file.size / (1024 * 1024)).toFixed(2)} MB
                                    </span>
                                  </div>
                                  <InfiniteProgress status={file.status} />
                                </div>
                              ))}
                            </div>
                          )}
                        </DropzoneTrigger>
                      </DropZoneArea>
                      <DropzoneMessage className="absolute bottom-4 left-1/2 -translate-x-1/2" />
                    </div>
                  </Dropzone>
              )}
            </div>
          </div>
        </div>
      </div>

  )
}
