import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { mutation } from "./_generated/server"

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
          color: "bg-primary/70",
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
