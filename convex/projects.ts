import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", q => q.eq("externalId", identity.subject))
      .unique();

    if (!user) throw new Error("User missing");

    const now = Date.now();

    const projectId = await ctx.db.insert("projects", {
      ownerId: user._id,
      name: args.name,
      createdAt: now,
      updatedAt: now
    });

    return projectId;
  }
});

export const listForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", q => q.eq("externalId", identity.subject))
      .unique();

    if (!user) return [];

    return await ctx.db
      .query("projects")
      .withIndex("byOwnerId", q => q.eq("ownerId", user._id))
      .collect();
  }
});
