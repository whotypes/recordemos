import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const getUserAndProjectCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { user: null, projectCount: 0 };
    }

    const projects = await ctx.db
      .query("projects")
      .withIndex("byOwnerId", q => q.eq("ownerId", user._id))
      .collect();

    return { user, projectCount: projects.length };
  }
});

export const createInternal = internalMutation({
  args: {
    ownerId: v.id("users"),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const projectId = await ctx.db.insert("projects", {
      ownerId: args.ownerId,
      name: args.name,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });

    return projectId;
  }
});

export const create = action({
  args: { name: v.string() },
  handler: async (ctx, args): Promise<{ projectId: Id<"projects">; projectCountBefore: number; projectCountAfter: number }> => {
    const { user, projectCount } = await ctx.runQuery(internal.projects.getUserAndProjectCount as any);

    if (!user) throw new Error("Not authenticated");

    const projectCountBefore = projectCount;

    const checkResult = await ctx.runAction(api.autumn.check, {
      featureId: "1_active_project",
    });

    if (checkResult.error) {
      throw new Error(`Failed to check plan: ${checkResult.error.message}`);
    }

    const hasFreePlanFeature = checkResult.data?.allowed === true;
    const planId = hasFreePlanFeature ? "free" : "pro";
    const maxProjects = planId === "pro" ? 10 : 1;

    if (projectCountBefore >= maxProjects) {
      throw new Error(
        planId === "free"
          ? "Free plan allows only 1 project. Upgrade to Pro to create more projects."
          : "Project limit reached. You can create up to 10 projects on the Pro plan."
      );
    }

    const now = Date.now();

    const projectId = await ctx.runMutation(internal.projects.createInternal as any, {
      ownerId: user._id,
      name: args.name,
      createdAt: now,
      updatedAt: now,
    });

    const { projectCount: projectCountAfter } = await ctx.runQuery(internal.projects.getUserAndProjectCount as any);

    return { projectId, projectCountBefore, projectCountAfter };
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
