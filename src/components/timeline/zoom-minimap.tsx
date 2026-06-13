"use client"

import { useVideoPlayerStore } from "@/lib/video-player-store"
import type React from "react"
import { useEffect, useRef, useState } from "react"

interface ZoomMinimapProps {
  /** Time (seconds) into the timeline to grab the thumbnail frame from. */
  frameTime: number
  /** Zoom magnification (e.g. 1.5 = 150%). */
  zoomLevel: number
  /** Focus point center as percentages (0-100). */
  focusX: number
  focusY: number
  /** Called continuously while dragging the focus point. */
  onFocusPreview?: (focusX: number, focusY: number) => void
  /** Called when the focus point drag finishes. */
  onFocusCommit?: (focusX: number, focusY: number) => void
}

// Cache thumbnails per (src + rounded time) so we don't re-decode constantly.
const thumbnailCache = new Map<string, string>()

async function captureThumbnail(
  src: string,
  timeSec: number,
): Promise<string | null> {
  const key = `${src}@${timeSec.toFixed(2)}`
  const cached = thumbnailCache.get(key)
  if (cached) return cached

  return new Promise((resolve) => {
    const video = document.createElement("video")
    video.crossOrigin = "anonymous"
    video.muted = true
    video.playsInline = true
    video.preload = "auto"
    video.src = src

    let settled = false
    const cleanup = () => {
      video.removeAttribute("src")
      video.load()
    }

    const grab = () => {
      if (settled) return
      settled = true
      try {
        const w = video.videoWidth
        const h = video.videoHeight
        if (!w || !h) {
          cleanup()
          resolve(null)
          return
        }
        const maxDim = 240
        const ratio = Math.min(maxDim / w, maxDim / h, 1)
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(w * ratio)
        canvas.height = Math.round(h * ratio)
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          cleanup()
          resolve(null)
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7)
        thumbnailCache.set(key, dataUrl)
        cleanup()
        resolve(dataUrl)
      } catch {
        cleanup()
        resolve(null)
      }
    }

    video.addEventListener("seeked", grab, { once: true })
    video.addEventListener("error", () => {
      if (settled) return
      settled = true
      cleanup()
      resolve(null)
    })
    video.addEventListener(
      "loadeddata",
      () => {
        const target = Math.min(
          Math.max(0, timeSec),
          Math.max(0, (video.duration || 0) - 0.05),
        )
        try {
          video.currentTime = target
        } catch {
          grab()
        }
      },
      { once: true },
    )
  })
}

export default function ZoomMinimap({
  frameTime,
  zoomLevel,
  focusX,
  focusY,
  onFocusPreview,
  onFocusCommit,
}: ZoomMinimapProps) {
  const videoSrc = useVideoPlayerStore((state) => state.videoSrc)
  const [thumb, setThumb] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [localFocus, setLocalFocus] = useState({ x: focusX, y: focusY })
  const frameRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  useEffect(() => {
    setLocalFocus({ x: focusX, y: focusY })
  }, [focusX, focusY])

  useEffect(() => {
    let active = true
    if (!videoSrc) {
      setThumb(null)
      return
    }
    captureThumbnail(videoSrc, frameTime).then((url) => {
      if (active) setThumb(url)
    })
    return () => {
      active = false
    }
  }, [videoSrc, frameTime])

  // The fraction of the frame that is visible when zoomed in.
  const windowFraction = Math.min(1, 1 / Math.max(1, zoomLevel))
  const windowPercent = windowFraction * 100
  const halfPercent = windowPercent / 2

  const clampFocus = (x: number, y: number) => ({
    x: Math.min(100 - halfPercent, Math.max(halfPercent, x)),
    y: Math.min(100 - halfPercent, Math.max(halfPercent, y)),
  })

  const updateFromPointer = (clientX: number, clientY: number) => {
    const el = frameRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const rawX = ((clientX - rect.left) / rect.width) * 100
    const rawY = ((clientY - rect.top) / rect.height) * 100
    const next = clampFocus(rawX, rawY)
    setLocalFocus(next)
    onFocusPreview?.(next.x, next.y)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDraggingRef.current = true
    setShowPreview(true)
    updateFromPointer(e.clientX, e.clientY)

    const onMove = (ev: PointerEvent) => {
      if (!isDraggingRef.current) return
      updateFromPointer(ev.clientX, ev.clientY)
    }
    const onUp = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      document.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerup", onUp)
      onFocusCommit?.(localFocusRef.current.x, localFocusRef.current.y)
    }
    document.addEventListener("pointermove", onMove)
    document.addEventListener("pointerup", onUp)
  }

  // Keep latest focus accessible inside pointerup closure.
  const localFocusRef = useRef(localFocus)
  useEffect(() => {
    localFocusRef.current = localFocus
  }, [localFocus])

  // Preview transform: scale the thumbnail and translate so the focus point
  // is centered, mimicking what the zoom output will look like.
  const previewScale = Math.max(1, zoomLevel)
  const previewTransform = `scale(${previewScale}) translate(${50 - localFocus.x}%, ${50 - localFocus.y}%)`

  return (
    <div
      className="relative h-full w-full"
      onPointerEnter={() => setShowPreview(true)}
      onPointerLeave={() => {
        if (!isDraggingRef.current) setShowPreview(false)
      }}
    >
      <div
        ref={frameRef}
        onPointerDown={handlePointerDown}
        className="relative h-full w-full cursor-crosshair overflow-hidden rounded-[5px] bg-black/40 touch-none"
        title="Drag to move zoom focus"
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-90"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[8px] text-white/50">
            …
          </div>
        )}

        {/* Dim outside the focus window */}
        <div className="pointer-events-none absolute inset-0 bg-black/45" />

        {/* Focus window */}
        <div
          className="pointer-events-none absolute rounded-[3px] border border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.0)]"
          style={{
            left: `${localFocus.x - halfPercent}%`,
            top: `${localFocus.y - halfPercent}%`,
            width: `${windowPercent}%`,
            height: `${windowPercent}%`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.6)",
          }}
        >
          {/* Bright copy of the frame, sized to the full minimap but offset so
              the visible slice lines up exactly over the dim background. */}
          {thumb && windowFraction > 0 && (
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={thumb}
                alt=""
                draggable={false}
                className="absolute h-full w-full max-w-none object-cover"
                style={{
                  width: `${100 / windowFraction}%`,
                  height: `${100 / windowFraction}%`,
                  left: `${-(localFocus.x - halfPercent) / windowFraction}%`,
                  top: `${-(localFocus.y - halfPercent) / windowFraction}%`,
                }}
              />
            </div>
          )}
          <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
      </div>

      {/* Hover preview of the resulting zoom */}
      {showPreview && thumb && (
        <div className="absolute bottom-[calc(100%+6px)] left-1/2 z-50 w-32 -translate-x-1/2">
          <div className="overflow-hidden rounded-md border border-white/20 bg-black shadow-xl">
            <div className="relative aspect-video w-full overflow-hidden">
              <img
                src={thumb}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  transform: previewTransform,
                  transformOrigin: "center",
                }}
              />
            </div>
            <div className="px-1.5 py-0.5 text-center text-[9px] font-medium text-white/70">
              {Math.round(previewScale * 100)}% zoom
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
