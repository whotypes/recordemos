export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "Custom"

export const ASPECT_RATIOS: Record<AspectRatio, string> = {
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
  "4:3": "aspect-[4/3]",
  Custom: "aspect-video",
}

export type QualityOption = "720" | "1080" | "4k"

export interface QualityPreset {
  label: string
  size: string
  quality: QualityOption
}

export const QUALITY_OPTIONS: QualityPreset[] = [
  { label: "720p", size: "~45MB", quality: "720" },
  { label: "1080p", size: "~120MB", quality: "1080" },
  { label: "4K", size: "~450MB", quality: "4k" },
]
