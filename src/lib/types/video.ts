export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "Custom"

export const ASPECT_RATIOS: Record<AspectRatio, string> = {
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
  "4:3": "aspect-[4/3]",
  Custom: "aspect-video",
}

