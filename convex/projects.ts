import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
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
    // Generate a unique shareable slug
    const slug = `${args.name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2, 9)}`;

    const projectId = await ctx.db.insert("projects", {
      ownerId: args.ownerId,
      name: args.name,
      visibility: "private", // default to private
      shareableSlug: slug,
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

    // get projects owned by user
    const ownedProjects = await ctx.db
      .query("projects")
      .withIndex("byOwnerId", q => q.eq("ownerId", user._id))
      .collect();

    // get projects user has accepted invites for
    const acceptedInvites = await ctx.db
      .query("notifications")
      .withIndex("byToUserAndStatus", (q) =>
        q.eq("toUserId", user._id).eq("status", "accepted")
      )
      .collect();

    // get the projects from accepted invites
    const invitedProjects = await Promise.all(
      acceptedInvites.map((invite) => ctx.db.get(invite.projectId))
    );

    // combine and deduplicate projects
    const allProjectIds = new Set<Id<"projects">>();
    const allProjects = [];

    for (const project of [...ownedProjects, ...invitedProjects.filter((p) => p !== null)]) {
      if (project && !allProjectIds.has(project._id)) {
        allProjectIds.add(project._id);
        allProjects.push(project);
      }
    }

    return allProjects
      .map((project) => ({
        _id: project._id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }
});

export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(args.projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    // only project owners can delete projects, not collaborators
    if (project.ownerId !== user._id) {
      throw new Error("Only project owners can delete projects");
    }

    await ctx.db.delete(args.projectId);
  }
});

// Update project visibility
export const updateVisibility = mutation({
  args: {
    projectId: v.id("projects"),
    visibility: v.union(v.literal("private"), v.literal("public"))
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Only project owner can change visibility
    if (project.ownerId !== user._id) {
      throw new Error("Only project owner can change visibility");
    }

    await ctx.db.patch(args.projectId, {
      visibility: args.visibility,
      updatedAt: Date.now()
    });
  }
});
