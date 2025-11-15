import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    planId: v.union(v.literal("free"), v.literal("pro")),
    email: v.string(),
    image: v.string(),
    // clerk id, from subject jwt field
    externalId: v.string(),
  })
    .index("byExternalId", ["externalId"])
    .index("byUsername", ["username"]),
  projects: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("byOwnerId", ["ownerId"]),
  assets: defineTable({
    ownerId: v.id("users"),
    projectId: v.id("projects"),
    type: v.union(v.literal("video"), v.literal("audio"), v.literal("image")),
    objectKey: v.string(),
    originalFileName: v.string(),
    sizeBytes: v.number(),
    createdAt: v.number(),
    durationMs: v.optional(v.number()),
  })
    .index("byProject", ["projectId"])
    .index("byOwner", ["ownerId"]),
  timeline_tracks: defineTable({
    projectId: v.id("projects"),
    kind: v.union(v.literal("video"), v.literal("overlay")),
    order: v.number(),
  }).index("byProject", ["projectId"]),
  timeline_blocks: defineTable({
    projectId: v.id("projects"),
    trackId: v.id("timeline_tracks"),
    assetId: v.optional(v.id("assets")),
    blockType: v.union(
      v.literal("video"),
      v.literal("zoom"),
      v.literal("pan"),
      v.literal("trim"),
      v.literal("text"),
      v.literal("image")
    ),
    startMs: v.number(),
    durationMs: v.number(),
    trimStartMs: v.number(),
    trimEndMs: v.number(),
    zIndex: v.number(),
    transforms: v.object({
      scale: v.number(),
      x: v.number(),
      y: v.number(),
      opacity: v.number(),
      rotation: v.number(),
    }),
    metadata: v.optional(
      v.object({
        label: v.optional(v.string()),
        color: v.optional(v.string()),
        zoomLevel: v.optional(v.number()),
        cropX: v.optional(v.number()),
        cropY: v.optional(v.number()),
        cropW: v.optional(v.number()),
        cropH: v.optional(v.number()),
      })
    ),
    createdAt: v.number(),
  })
    .index("byProject", ["projectId"])
    .index("byTrack", ["trackId"]),
  timeline_edits: defineTable({
    projectId: v.id("projects"),
    type: v.string(),
    payload: v.any(),
    createdAt: v.number(),
  }).index("byProject", ["projectId"]),
  project_settings: defineTable({
    projectId: v.id("projects"),
    aspectRatio: v.string(),
    zoomLevel: v.number(),
    hideToolbars: v.boolean(),
    backgroundColor: v.string(),
    backgroundType: v.string(),
    gradientAngle: v.number(),
    scale: v.number(),
    translateX: v.number(),
    translateY: v.number(),
    rotateX: v.number(),
    rotateY: v.number(),
    rotateZ: v.number(),
    perspective: v.number(),
    frameHeight: v.string(),
    showSearchBar: v.boolean(),
    showStroke: v.boolean(),
    macOsDarkColor: v.string(),
    macOsLightColor: v.string(),
    arcDarkMode: v.boolean(),
    hideButtons: v.boolean(),
    hasButtonColor: v.boolean(),
    selectedFrame: v.string(),
    frameRoundness: v.number(),
    searchBarText: v.string(),
    zoomPanMode: v.optional(v.boolean()),
  })
    .index("byProject", ["projectId"])
    .searchIndex("search_project", {
      searchField: "projectId",
    }),
});