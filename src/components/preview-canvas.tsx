"use client"

import { BrowserFrame } from "@/components/browser-frame"
import {
  Dropzone,
  DropZoneArea,
  DropzoneMessage,
  DropzoneTrigger,
  InfiniteProgress,
  useDropzone,
} from "@/components/ui/dropzone"
import { useFrameOptionsStore } from "@/lib/frame-options-store"
import { cn } from "@/lib/utils"
import { useVideoOptionsStore } from "@/lib/video-options-store"
import { setClearFileStatusesRef, useVideoPlayerStore } from "@/lib/video-player-store"
import { useCompositionStore } from "@/lib/composition-store"
import { CloudUploadIcon } from "lucide-react"
import type React from "react"
import { useCallback, useEffect } from "react"

interface PreviewCanvasProps {
  hideToolbars: boolean
  currentTime: number
  videoRef: React.RefObject<HTMLVideoElement | null>
  videoSrc: string | null
  isPlaying?: boolean
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

export default function PreviewCanvas({ hideToolbars, currentTime, videoRef, videoSrc, isPlaying = false }: PreviewCanvasProps) {
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
  } = useVideoOptionsStore()
  const {
    setVideoSrc,
    setCurrentTime,
    setVideoDuration,
    setVideoFileName,
    setVideoFileSize,
    setVideoFileFormat,
    loop,
    muted,
    isUploading,
    uploadProgress,
    uploadStatus
  } = useVideoPlayerStore()
  const { selectedFrame, frameRoundness, showStroke, arcDarkMode, frameHeight } = useFrameOptionsStore()
  const { activeVideoBlock, getVideoTimeOffset } = useCompositionStore()

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
        URL.revokeObjectURL(currentSrc)
      }

      const url = URL.createObjectURL(file)
      setVideoSrc(url)
      setCurrentTime(0)
      setVideoDuration(0)

      // Save file metadata
      setVideoFileName(file.name)
      setVideoFileSize(file.size)
      const format = file.type.split('/')[1] || file.name.split('.').pop() || 'unknown'
      setVideoFileFormat(format)

      return {
        status: "success",
        result: url,
      }
    }, [setVideoSrc, setCurrentTime, setVideoDuration, setVideoFileName, setVideoFileSize, setVideoFileFormat]),
    validation: {
      accept: {
        "video/*": [".mp4", ".webm", ".mov", ".avi", ".mkv"],
      },
      maxSize: 500 * 1024 * 1024,
      maxFiles: 1,
    },
  })

  setClearFileStatusesRef(dropzone.clearFileStatuses)

  // Apply timeline-based time offset for instant trim preview
  useEffect(() => {
    if (!videoRef.current || !videoSrc) return

    const timeOffset = getVideoTimeOffset()

    // always apply the trim offset when not playing
    // this ensures instant trimming without re-encoding
    if (!isPlaying) {
      if (Math.abs(videoRef.current.currentTime - timeOffset) > 0.01) {
        videoRef.current.currentTime = timeOffset
      }
    }
  }, [activeVideoBlock, getVideoTimeOffset, videoRef, isPlaying, currentTime, videoSrc])

  // Apply transforms from the active video block
  const videoTransforms = activeVideoBlock ? {
    transform: `
      scale(${activeVideoBlock.transforms.scale})
      translateX(${activeVideoBlock.transforms.x}px)
      translateY(${activeVideoBlock.transforms.y}px)
      rotateZ(${activeVideoBlock.transforms.rotation}deg)
    `,
    opacity: activeVideoBlock.transforms.opacity,
  } : {}

  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* Canvas Background */}
      <div
        className="rounded-lg transition-colors duration-300 flex items-center justify-center shadow-lg max-w-4xl w-full h-full aspect-video"
        style={
          backgroundType === 'image' && imageBackground
            ? {
                backgroundImage: `url(${imageBackground})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }
            : { background: backgroundColor }
        }
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
            {isUploading && videoSrc && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/70 backdrop-blur-sm"
                style={{
                  borderTopLeftRadius: (selectedFrame === 'None' || selectedFrame === 'Arc' || selectedFrame === 'Shadow')
                    ? (selectedFrame === 'Arc' ? 'calc(' + frameRoundness + 'rem - 9px)' : frameRoundness + 'rem')
                    : '0',
                  borderTopRightRadius: (selectedFrame === 'None' || selectedFrame === 'Arc' || selectedFrame === 'Shadow')
                    ? (selectedFrame === 'Arc' ? 'calc(' + frameRoundness + 'rem - 9px)' : frameRoundness + 'rem')
                    : '0',
                  borderBottomLeftRadius: selectedFrame === 'Arc'
                    ? 'calc(' + frameRoundness + 'rem - 9px)'
                    : frameRoundness + 'rem',
                  borderBottomRightRadius: selectedFrame === 'Arc'
                    ? 'calc(' + frameRoundness + 'rem - 9px)'
                    : frameRoundness + 'rem',
                }}>
                <div className="flex flex-col items-center gap-4 p-8 w-full max-w-sm">
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <div className="text-center space-y-2 w-full">
                    <p className="text-white font-medium text-lg">
                      {uploadStatus || "Uploading..."}
                    </p>
                    <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
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

              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="w-full h-full object-cover transition-transform duration-100"
                style={{
                  ...videoTransforms,
                  borderTopLeftRadius: (selectedFrame === 'None' || selectedFrame === 'Arc' || selectedFrame === 'Shadow')
                    ? (selectedFrame === 'Arc' ? 'calc(' + frameRoundness + 'rem - 9px)' : frameRoundness + 'rem')
                    : '0',
                  borderTopRightRadius: (selectedFrame === 'None' || selectedFrame === 'Arc' || selectedFrame === 'Shadow')
                    ? (selectedFrame === 'Arc' ? 'calc(' + frameRoundness + 'rem - 9px)' : frameRoundness + 'rem')
                    : '0',
                  borderBottomLeftRadius: selectedFrame === 'Arc'
                    ? 'calc(' + frameRoundness + 'rem - 9px)'
                    : frameRoundness + 'rem',
                  borderBottomRightRadius: selectedFrame === 'Arc'
                    ? 'calc(' + frameRoundness + 'rem - 9px)'
                    : frameRoundness + 'rem',
                }}
                  loop={loop}
                  muted={muted}
                  onClick={(e) => {
                    const video = e.currentTarget
                    if (video.paused) {
                      video.play()
                    } else {
                      video.pause()
                    }
                  }}
                />
              ) : (
                  <Dropzone {...dropzone}>
                    <div className="h-full w-full">
                    <DropZoneArea className="h-full w-full border-6 border-dashed border-border/20 hover:border-border transition-colors bg-transparent hover:bg-transparent rounded-none"
                      style={{
                        borderTopLeftRadius: (selectedFrame === 'None' || selectedFrame === 'Arc' || selectedFrame === 'Shadow')
                          ? (selectedFrame === 'Arc' ? 'calc(' + frameRoundness + 'rem - 9px)' : frameRoundness + 'rem')
                          : '0',
                        borderTopRightRadius: (selectedFrame === 'None' || selectedFrame === 'Arc' || selectedFrame === 'Shadow')
                          ? (selectedFrame === 'Arc' ? 'calc(' + frameRoundness + 'rem - 9px)' : frameRoundness + 'rem')
                          : '0',
                        borderBottomLeftRadius: selectedFrame === 'Arc'
                          ? 'calc(' + frameRoundness + 'rem - 9px)'
                          : frameRoundness + 'rem',
                        borderBottomRightRadius: selectedFrame === 'Arc'
                          ? 'calc(' + frameRoundness + 'rem - 9px)'
                          : frameRoundness + 'rem',
                      }}>
                        <DropzoneTrigger className="flex flex-col items-center justify-center gap-4 bg-transparent h-full w-full p-10 text-center">
                          <CloudUploadIcon className="size-12 text-muted-foreground" />
                          <div className="flex flex-col gap-2">
                            <p className="text-lg font-semibold text-foreground">
                              Drop video here or click to upload
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Supports MP4, WebM, MOV, AVI, MKV (max 500MB)
                            </p>
                          </div>
                          {dropzone.fileStatuses.length > 0 && (
                            <div className="w-full max-w-md mt-4">
                              {dropzone.fileStatuses.map((file) => (
                                <div key={file.id} className="flex flex-col gap-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground truncate flex-1 mr-2">
                                      {file.fileName}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
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
