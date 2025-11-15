import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("timeline_blocks")
      .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
      .collect()
  },
})

export const listByTrack = query({
  args: { trackId: v.id("timeline_tracks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("timeline_blocks")
      .withIndex("byTrack", (q) => q.eq("trackId", args.trackId))
      .collect()
  },
})

export const get = query({
  args: { blockId: v.id("timeline_blocks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.blockId)
  },
})

export const create = mutation({
  args: {
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
    trimStartMs: v.optional(v.number()),
    trimEndMs: v.optional(v.number()),
    zIndex: v.optional(v.number()),
    transforms: v.optional(
      v.object({
        scale: v.number(),
        x: v.number(),
        y: v.number(),
        opacity: v.number(),
        rotation: v.number(),
      })
    ),
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
  },
  handler: async (ctx, args) => {
    const blockId = await ctx.db.insert("timeline_blocks", {
      projectId: args.projectId,
      trackId: args.trackId,
      assetId: args.assetId,
      blockType: args.blockType,
      startMs: args.startMs,
      durationMs: args.durationMs,
      trimStartMs: args.trimStartMs ?? 0,
      trimEndMs: args.trimEndMs ?? 0,
      zIndex: args.zIndex ?? 0,
      transforms: args.transforms ?? {
        scale: 1,
        x: 0,
        y: 0,
        opacity: 1,
        rotation: 0,
      },
      metadata: args.metadata,
      createdAt: Date.now(),
    })

    await ctx.db.insert("timeline_edits", {
      projectId: args.projectId,
      type: "ADD_BLOCK",
      payload: { blockId, ...args },
      createdAt: Date.now(),
    })

    return blockId
  },
})

export const updatePosition = mutation({
  args: {
    blockId: v.id("timeline_blocks"),
    startMs: v.number(),
  },
  handler: async (ctx, args) => {
    const block = await ctx.db.get(args.blockId)
    if (!block) throw new Error("Block not found")

    await ctx.db.patch(args.blockId, {
      startMs: args.startMs,
    })

    await ctx.db.insert("timeline_edits", {
      projectId: block.projectId,
      type: "MOVE_BLOCK",
      payload: { blockId: args.blockId, startMs: args.startMs },
      createdAt: Date.now(),
    })
  },
})

export const updateSize = mutation({
  args: {
    blockId: v.id("timeline_blocks"),
    startMs: v.number(),
    durationMs: v.number(),
  },
  handler: async (ctx, args) => {
    const block = await ctx.db.get(args.blockId)
    if (!block) throw new Error("Block not found")

    await ctx.db.patch(args.blockId, {
      startMs: args.startMs,
      durationMs: args.durationMs,
    })

    await ctx.db.insert("timeline_edits", {
      projectId: block.projectId,
      type: "RESIZE_BLOCK",
      payload: { blockId: args.blockId, startMs: args.startMs, durationMs: args.durationMs },
      createdAt: Date.now(),
    })
  },
})

export const updateTrim = mutation({
  args: {
    blockId: v.id("timeline_blocks"),
    trimStartMs: v.number(),
    trimEndMs: v.number(),
  },
  handler: async (ctx, args) => {
    const block = await ctx.db.get(args.blockId)
    if (!block) throw new Error("Block not found")

    await ctx.db.patch(args.blockId, {
      trimStartMs: args.trimStartMs,
      trimEndMs: args.trimEndMs,
    })

    await ctx.db.insert("timeline_edits", {
      projectId: block.projectId,
      type: "TRIM_BLOCK",
      payload: { blockId: args.blockId, trimStartMs: args.trimStartMs, trimEndMs: args.trimEndMs },
      createdAt: Date.now(),
    })
  },
})

export const updateTransforms = mutation({
  args: {
    blockId: v.id("timeline_blocks"),
    transforms: v.object({
      scale: v.number(),
      x: v.number(),
      y: v.number(),
      opacity: v.number(),
      rotation: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const block = await ctx.db.get(args.blockId)
    if (!block) throw new Error("Block not found")

    await ctx.db.patch(args.blockId, {
      transforms: args.transforms,
    })

    await ctx.db.insert("timeline_edits", {
      projectId: block.projectId,
      type: "TRANSFORM_BLOCK",
      payload: { blockId: args.blockId, transforms: args.transforms },
      createdAt: Date.now(),
    })
  },
})

export const updateMetadata = mutation({
  args: {
    blockId: v.id("timeline_blocks"),
    metadata: v.object({
      label: v.optional(v.string()),
      color: v.optional(v.string()),
      zoomLevel: v.optional(v.number()),
      cropX: v.optional(v.number()),
      cropY: v.optional(v.number()),
      cropW: v.optional(v.number()),
      cropH: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.blockId, {
      metadata: args.metadata,
    })
  },
})

export const remove = mutation({
  args: { blockId: v.id("timeline_blocks") },
  handler: async (ctx, args) => {
    const block = await ctx.db.get(args.blockId)
    if (!block) throw new Error("Block not found")

    await ctx.db.delete(args.blockId)

    await ctx.db.insert("timeline_edits", {
      projectId: block.projectId,
      type: "DELETE_BLOCK",
      payload: { blockId: args.blockId },
      createdAt: Date.now(),
    })
  },
})

export const duplicate = mutation({
  args: {
    blockId: v.id("timeline_blocks"),
    newStartMs: v.number(),
  },
  handler: async (ctx, args) => {
    const block = await ctx.db.get(args.blockId)
    if (!block) throw new Error("Block not found")

    const newBlockId = await ctx.db.insert("timeline_blocks", {
      projectId: block.projectId,
      trackId: block.trackId,
      assetId: block.assetId,
      blockType: block.blockType,
      startMs: args.newStartMs,
      durationMs: block.durationMs,
      trimStartMs: block.trimStartMs,
      trimEndMs: block.trimEndMs,
      zIndex: block.zIndex,
      transforms: block.transforms,
      metadata: block.metadata,
      createdAt: Date.now(),
    })

    await ctx.db.insert("timeline_edits", {
      projectId: block.projectId,
      type: "DUPLICATE_BLOCK",
      payload: { originalBlockId: args.blockId, newBlockId, newStartMs: args.newStartMs },
      createdAt: Date.now(),
    })

    return newBlockId
  },
})

export const batchUpdate = mutation({
  args: {
    updates: v.array(
      v.object({
        blockId: v.id("timeline_blocks"),
        startMs: v.optional(v.number()),
        durationMs: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      const patches: Partial<{
        startMs: number
        durationMs: number
      }> = {}

      if (update.startMs !== undefined) patches.startMs = update.startMs
      if (update.durationMs !== undefined) patches.durationMs = update.durationMs

      await ctx.db.patch(update.blockId, patches)
    }
  },
})

