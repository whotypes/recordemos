import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { hasProjectAccess } from "./auth_helpers"
import { getCurrentUser } from "./users"

export const updatePresence = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
    username: v.string(),
    userImage: v.string(),
    currentBlockId: v.optional(v.id("timeline_blocks")),
    cursorPosition: v.optional(v.object({
      x: v.number(),
      y: v.number(),
    })),
    currentTimeMs: v.optional(v.number()),
    isPlaying: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error("Not authenticated")
    }

    const hasAccess = await hasProjectAccess(ctx, user._id, args.projectId)
    if (!hasAccess) {
      throw new Error("Not authorized to update presence for this project")
    }

    const existing = await ctx.db
      .query("presence")
      .withIndex("byProjectAndUser", (q) =>
        q.eq("projectId", args.projectId).eq("userId", args.userId)
      )
      .first()

    const data = {
      userId: args.userId,
      projectId: args.projectId,
      username: args.username,
      userImage: args.userImage,
      lastSeenAt: Date.now(),
      currentBlockId: args.currentBlockId,
      cursorPosition: args.cursorPosition,
      currentTimeMs: args.currentTimeMs,
      isPlaying: args.isPlaying,
    }

    if (existing) {
      await ctx.db.patch(existing._id, data)
      return existing._id
    } else {
      return await ctx.db.insert("presence", data)
    }
  },
})

export const listPresence = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error("Not authenticated")
    }

    const hasAccess = await hasProjectAccess(ctx, user._id, args.projectId)
    if (!hasAccess) {
      throw new Error("Not authorized to view presence for this project")
    }

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000

    const presenceList = await ctx.db
      .query("presence")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .collect()

    return presenceList.filter((p) => p.lastSeenAt > fiveMinutesAgo)
  },
})

export const removePresence = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error("Not authenticated")
    }

    const hasAccess = await hasProjectAccess(ctx, user._id, args.projectId)
    if (!hasAccess) {
      throw new Error("Not authorized to remove presence for this project")
    }

    const existing = await ctx.db
      .query("presence")
      .withIndex("byProjectAndUser", (q) =>
        q.eq("projectId", args.projectId).eq("userId", args.userId)
      )
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
    }
  },
})
