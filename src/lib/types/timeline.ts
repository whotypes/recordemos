import type { Id } from "../../../convex/_generated/dataModel"

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

export type BlockType = "zoom" | "pan" | "trim" | "video" | "text" | "image"

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

export interface TimelineTransforms {
  scale: number
  x: number
  y: number
  opacity: number
  rotation: number
}

export interface TimelineBlockMetadata {
  label?: string
  color?: string
  zoomLevel?: number
  cropX?: number
  cropY?: number
  cropW?: number
  cropH?: number
}

export interface ConvexTimelineBlock {
  _id: Id<"timeline_blocks">
  _creationTime: number
  projectId: Id<"projects">
  trackId: Id<"timeline_tracks">
  assetId?: Id<"assets">
  blockType: BlockType
  startMs: number
  durationMs: number
  trimStartMs: number
  trimEndMs: number
  zIndex: number
  transforms: TimelineTransforms
  metadata?: TimelineBlockMetadata
  createdAt: number
}

export interface ConvexTimelineTrack {
  _id: Id<"timeline_tracks">
  _creationTime: number
  projectId: Id<"projects">
  kind: "video" | "overlay"
  order: number
}

export interface ConvexProjectSettings {
  _id: Id<"project_settings">
  _creationTime: number
  projectId: Id<"projects">
  aspectRatio: string
  backgroundColor: string
  zoomPanMode: boolean
}

export const convexBlockToTimelineBlock = (
  block: ConvexTimelineBlock,
  trackOrder: number
): TimelineBlock => {
  return {
    id: block._id,
    type: block.blockType,
    label: block.metadata?.label ?? block.blockType,
    start: block.startMs / 1000,
    duration: block.durationMs / 1000,
    color: block.metadata?.color ?? "bg-primary/70",
    track: trackOrder,
    zoomLevel: block.metadata?.zoomLevel,
    trimStart: block.trimStartMs / 1000,
    trimEnd: block.trimEndMs / 1000,
    cropX: block.metadata?.cropX,
    cropY: block.metadata?.cropY,
    cropW: block.metadata?.cropW,
    cropH: block.metadata?.cropH,
  }
}

export const timelineBlockToConvexBlock = (
  block: TimelineBlock,
  projectId: Id<"projects">,
  trackId: Id<"timeline_tracks">,
  assetId?: Id<"assets">
): Omit<ConvexTimelineBlock, "_id" | "_creationTime"> => {
  return {
    projectId,
    trackId,
    assetId,
    blockType: block.type as BlockType,
    startMs: Math.round(block.start * 1000),
    durationMs: Math.round(block.duration * 1000),
    trimStartMs: Math.round((block.trimStart ?? 0) * 1000),
    trimEndMs: Math.round((block.trimEnd ?? 0) * 1000),
    zIndex: 0,
    transforms: {
      scale: 1,
      x: 0,
      y: 0,
      opacity: 1,
      rotation: 0,
    },
    metadata: {
      label: block.label,
      color: block.color,
      zoomLevel: block.zoomLevel,
      cropX: block.cropX,
      cropY: block.cropY,
      cropW: block.cropW,
      cropH: block.cropH,
    },
    createdAt: Date.now(),
  }
}
