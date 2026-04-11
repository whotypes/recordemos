import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { mutation } from "./_generated/server"
import { hasProjectAccess } from "./auth_helpers"
import { r2 } from "./r2"
import { getCurrentUser } from "./users"

export const initializeProjectTimeline = mutation({
  args: {
    projectId: v.id("projects"),
    assetId: v.id("assets"),
    durationMs: v.number(),
  },
  handler: async (ctx, args) => {
    const existingTracks = await ctx.db
      .query("timeline_tracks")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .collect()

    let videoTrackId: Id<"timeline_tracks">
    let overlayTrackId: Id<"timeline_tracks">

    if (existingTracks.length === 0) {
      videoTrackId = await ctx.db.insert("timeline_tracks", {
        projectId: args.projectId,
        kind: "video",
        order: 0,
      })

      overlayTrackId = await ctx.db.insert("timeline_tracks", {
        projectId: args.projectId,
        kind: "overlay",
        order: 1,
      })

      await ctx.db.insert("project_settings", {
        projectId: args.projectId,
        aspectRatio: "16:9",
        backgroundColor: "#000000",
        zoomPanMode: false,
      })
    } else {
      const videoTrack = existingTracks.find((t) => t.kind === "video")
      const overlayTrack = existingTracks.find((t) => t.kind === "overlay")

      if (!videoTrack || !overlayTrack) {
        throw new Error("Invalid track configuration")
      }

      videoTrackId = videoTrack._id
      overlayTrackId = overlayTrack._id
    }

    const existingBlocks = await ctx.db
      .query("timeline_blocks")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .collect()

    const hasVideoBlock = existingBlocks.some((b) => b.blockType === "video")

    if (!hasVideoBlock) {
      await ctx.db.insert("timeline_blocks", {
        projectId: args.projectId,
        trackId: videoTrackId,
        assetId: args.assetId,
        blockType: "video",
        startMs: 0,
        durationMs: args.durationMs,
        trimStartMs: 0,
        trimEndMs: 0,
        zIndex: 0,
        transforms: {
          scale: 1,
          x: 0,
          y: 0,
          opacity: 1,
          rotation: 0,
        },
        metadata: {
          label: "Video",
          color: "bg-orange-500",
        },
        createdAt: Date.now(),
      })

      await ctx.db.insert("timeline_edits", {
        projectId: args.projectId,
        type: "INIT_PROJECT",
        payload: { assetId: args.assetId, durationMs: args.durationMs },
        createdAt: Date.now(),
      })
    }

    return { videoTrackId, overlayTrackId }
  },
})

/** Swap the project's base video: remove blocks using the old asset, add a new full-length clip, delete the old R2 object. */
export const replaceProjectBaseVideo = mutation({
  args: {
    projectId: v.id("projects"),
    newAssetId: v.id("assets"),
    durationMs: v.number(),
    previousAssetId: v.id("assets"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error("Not authenticated")
    }

    const hasAccess = await hasProjectAccess(ctx, user._id, args.projectId)
    if (!hasAccess) {
      throw new Error("Not authorized to modify this project")
    }

    if (args.previousAssetId === args.newAssetId) {
      throw new Error("Cannot replace an asset with itself")
    }

    const newAsset = await ctx.db.get(args.newAssetId)
    if (!newAsset || newAsset.projectId !== args.projectId || newAsset.type !== "video") {
      throw new Error("Invalid new video asset")
    }

    const previousAsset = await ctx.db.get(args.previousAssetId)
    if (!previousAsset || previousAsset.projectId !== args.projectId) {
      throw new Error("Invalid previous asset")
    }

    const existingTracks = await ctx.db
      .query("timeline_tracks")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .collect()

    const videoTrack = existingTracks.find((t) => t.kind === "video")
    if (!videoTrack) {
      throw new Error("Video track not found")
    }

    const existingBlocks = await ctx.db
      .query("timeline_blocks")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .collect()

    for (const block of existingBlocks) {
      if (block.blockType === "video" && block.assetId === args.previousAssetId) {
        await ctx.db.delete(block._id)
      }
    }

    await ctx.db.insert("timeline_blocks", {
      projectId: args.projectId,
      trackId: videoTrack._id,
      assetId: args.newAssetId,
      blockType: "video",
      startMs: 0,
      durationMs: args.durationMs,
      trimStartMs: 0,
      trimEndMs: 0,
      zIndex: 0,
      transforms: {
        scale: 1,
        x: 0,
        y: 0,
        opacity: 1,
        rotation: 0,
      },
      metadata: {
        label: "Video",
        color: "bg-orange-500",
      },
      createdAt: Date.now(),
    })

    await ctx.db.insert("timeline_edits", {
      projectId: args.projectId,
      type: "REPLACE_BASE_VIDEO",
      payload: {
        previousAssetId: args.previousAssetId,
        newAssetId: args.newAssetId,
        durationMs: args.durationMs,
      },
      createdAt: Date.now(),
    })

    await r2.deleteObject(ctx, previousAsset.objectKey)
    await ctx.db.delete(args.previousAssetId)

    return { success: true }
  },
})
