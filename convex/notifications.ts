import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

export const sendInvite = mutation({
  args: {
    toUserId: v.id("users"),
    fromUserId: v.id("users"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notifications")
      .withIndex("byToUserAndStatus", (q) =>
        q.eq("toUserId", args.toUserId).eq("status", "pending")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("fromUserId"), args.fromUserId),
          q.eq(q.field("projectId"), args.projectId)
        )
      )
      .first()

    if (existing) {
      return existing._id
    }

    return await ctx.db.insert("notifications", {
      toUserId: args.toUserId,
      fromUserId: args.fromUserId,
      projectId: args.projectId,
      status: "pending",
      createdAt: Date.now(),
    })
  },
})

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("byToUser", (q) => q.eq("toUserId", args.userId))
      .order("desc")
      .take(50)

    const enriched = await Promise.all(
      notifications.map(async (notification) => {
        const fromUser = await ctx.db.get(notification.fromUserId)
        const project = await ctx.db.get(notification.projectId)

        const presence = await ctx.db
          .query("presence")
          .withIndex("byUser", (q) => q.eq("userId", notification.fromUserId))
          .first()

        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
        const isOnline = presence && presence.lastSeenAt > fiveMinutesAgo

        return {
          ...notification,
          fromUser: fromUser ? {
            _id: fromUser._id,
            username: fromUser.username,
            email: fromUser.email,
            image: fromUser.image,
          } : null,
          project: project ? {
            _id: project._id,
            name: project.name,
          } : null,
          isOnline,
        }
      })
    )

    return enriched
  },
})

export const listPending = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("byToUserAndStatus", (q) =>
        q.eq("toUserId", args.userId).eq("status", "pending")
      )
      .order("desc")
      .collect()

    const enriched = await Promise.all(
      notifications.map(async (notification) => {
        const fromUser = await ctx.db.get(notification.fromUserId)
        const project = await ctx.db.get(notification.projectId)

        const presence = await ctx.db
          .query("presence")
          .withIndex("byUser", (q) => q.eq("userId", notification.fromUserId))
          .first()

        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
        const isOnline = presence && presence.lastSeenAt > fiveMinutesAgo

        return {
          ...notification,
          fromUser: fromUser ? {
            _id: fromUser._id,
            username: fromUser.username,
            email: fromUser.email,
            image: fromUser.image,
          } : null,
          project: project ? {
            _id: project._id,
            name: project.name,
          } : null,
          isOnline,
        }
      })
    )

    return enriched
  },
})

export const acceptInvite = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { status: "accepted" })
  },
})

export const rejectInvite = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { status: "rejected" })
  },
})

export const remove = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.notificationId)
  },
})
