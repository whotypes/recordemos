import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("timeline_tracks")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .collect()
  },
})

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    kind: v.union(v.literal("video"), v.literal("overlay")),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("timeline_tracks", {
      projectId: args.projectId,
      kind: args.kind,
      order: args.order,
    })
  },
})

export const initializeDefaultTracks = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("timeline_tracks")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .first()

    if (existing) {
      return { videoTrackId: existing._id, overlayTrackId: existing._id }
    }

    const videoTrackId = await ctx.db.insert("timeline_tracks", {
      projectId: args.projectId,
      kind: "video",
      order: 0,
    })

    const overlayTrackId = await ctx.db.insert("timeline_tracks", {
      projectId: args.projectId,
      kind: "overlay",
      order: 1,
    })

    return { videoTrackId, overlayTrackId }
  },
})

export const remove = mutation({
  args: { trackId: v.id("timeline_tracks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.trackId)
  },
})

