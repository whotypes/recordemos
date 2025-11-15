import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const list = query({
  args: {
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const editsQuery = ctx.db
      .query("timeline_edits")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .order("desc")

    if (args.limit) {
      return await editsQuery.take(args.limit)
    }

    return await editsQuery.collect()
  },
})

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    type: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("timeline_edits", {
      projectId: args.projectId,
      type: args.type,
      payload: args.payload,
      createdAt: Date.now(),
    })
  },
})

export const clear = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const edits = await ctx.db
      .query("timeline_edits")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .collect()

    for (const edit of edits) {
      await ctx.db.delete(edit._id)
    }
  },
})

