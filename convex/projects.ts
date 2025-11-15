import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const existingProjects = await ctx.db
      .query("projects")
      .withIndex("byOwnerId", q => q.eq("ownerId", user._id))
      .collect();

    const planId = user.planId || "free";
    const maxProjects = planId === "pro" ? 10 : 1;

    if (existingProjects.length >= maxProjects) {
      throw new Error(
        planId === "free"
          ? "Free plan allows only 1 project. Upgrade to Pro to create more projects."
          : "Project limit reached. You can create up to 10 projects on the Pro plan."
      );
    }

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
    const user = await getCurrentUser(ctx);

    if (!user) {
      return [];
    }

    const projects = await ctx.db
      .query("projects")
      .withIndex("byOwnerId", q => q.eq("ownerId", user._id))
      .collect();

    return projects
      .map((project) => ({
        _id: project._id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }
});
