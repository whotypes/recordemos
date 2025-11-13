export interface TimelineBlock {
  id: string
  type: string
  label: string
  start: number
  duration: number
  color: string
  track?: number
  zoomLevel?: number
  trimStart?: number
  trimEnd?: number
  cropX?: number
  cropY?: number
  cropW?: number
  cropH?: number
}

export type BlockType = "zoom" | "pan" | "trim" | "video"

export interface BlockData {
  type: BlockType
  label: string
  color: string
  zoomLevel?: number
  trimStart?: number
  trimEnd?: number
  cropX?: number
  cropY?: number
  cropW?: number
  cropH?: number
}

export const TRACK_MAP: Record<string, number> = {
  zoom: 1,
  pan: 2,
  trim: 3,
}

export type ResizeSide = "left" | "right"
