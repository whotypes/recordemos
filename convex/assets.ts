import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { r2 } from "./r2";
import { getCurrentUser, getCurrentUserOrThrow } from "./users";

// R2 client API setup
export const { generateUploadUrl, syncMetadata } = r2.clientApi({
    checkUpload: async (ctx, _bucket) => {
        const user = await getCurrentUserOrThrow(ctx as unknown as QueryCtx);
        if (!user) {
            throw new Error("Not authenticated");
        }
        // additional validation can be added here if needed
    },
    onUpload: async (_ctx, _bucket, key) => {
        // asset row will be created via insertAssetRow mutation
        // this is called automatically after successful upload
        console.log("Upload completed for key:", key);
    },
});

// verify project exists and user has access before upload
// returns null if valid, or an error message if invalid
export const verifyProjectAccess = query({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) {
            return { valid: false, error: "Not authenticated" };
        }

        const project = await ctx.db.get(args.projectId);
        if (!project) {
            return { valid: false, error: "Project not found" };
        }

        if (project.ownerId !== user._id) {
            return { valid: false, error: "Not authorized to access this project" };
        }

        return { valid: true };
    },
});

// insert asset row after R2 upload completes
export const insertAssetRow = mutation({
    args: {
        projectId: v.id("projects"),
        type: v.union(v.literal("video"), v.literal("audio"), v.literal("image")),
        objectKey: v.string(),
        originalFileName: v.string(),
        sizeBytes: v.number(),
        durationMs: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) {
            throw new Error("Not authenticated");
        }

        // verify user owns the project
        const project = await ctx.db.get(args.projectId);
        if (!project) {
            throw new Error("Project not found");
        }
        if (project.ownerId !== user._id) {
            throw new Error("Not authorized to add assets to this project");
        }

        const assetId = await ctx.db.insert("assets", {
            ownerId: user._id,
            projectId: args.projectId,
            type: args.type,
            objectKey: args.objectKey,
            originalFileName: args.originalFileName,
            sizeBytes: args.sizeBytes,
            durationMs: args.durationMs,
            createdAt: Date.now(),
        });

        return assetId;
    },
});

// list assets by project
export const listByProject = query({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) {
            throw new Error("Not authenticated");
        }

        // verify user owns the project
        const project = await ctx.db.get(args.projectId);
        if (!project) {
            throw new Error("Project not found");
        }
        if (project.ownerId !== user._id) {
            throw new Error("Not authorized to view this project's assets");
        }

        const assets = await ctx.db
            .query("assets")
            .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
            .collect();

        return assets.sort((a, b) => b.createdAt - a.createdAt);
    },
});

// get single asset
export const getAsset = query({
    args: {
        assetId: v.id("assets"),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) {
            throw new Error("Not authenticated");
        }

        const asset = await ctx.db.get(args.assetId);
        if (!asset) {
            throw new Error("Asset not found");
        }

        if (asset.ownerId !== user._id) {
            throw new Error("Not authorized to view this asset");
        }

        return asset;
    },
});

// get video URL from object key
export const getVideoUrl = query({
    args: {
        objectKey: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) {
            throw new Error("Not authenticated");
        }

        // verify user owns an asset with this key
        const asset = await ctx.db
            .query("assets")
            .filter((q) => q.eq(q.field("objectKey"), args.objectKey))
            .first();

        if (!asset) {
            throw new Error("Asset not found");
        }

        if (asset.ownerId !== user._id) {
            throw new Error("Not authorized to access this asset");
        }

        const url = await r2.getUrl(args.objectKey, {
            expiresIn: 60 * 60 * 24 * 30, // 30 days
        });

        return url;
    },
});

// delete asset with safety check
export const deleteAsset = mutation({
    args: {
        assetId: v.id("assets"),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) {
            throw new Error("Not authenticated");
        }

        const asset = await ctx.db.get(args.assetId);
        if (!asset) {
            throw new Error("Asset not found");
        }

        if (asset.ownerId !== user._id) {
            throw new Error("Not authorized to delete this asset");
        }

        // TODO: when timeline tables are created, add check here
        // to prevent deletion of assets referenced by timeline blocks
        // const timelineBlocks = await ctx.db
        //   .query("timelineBlocks")
        //   .withIndex("byAsset", (q) => q.eq("assetId", args.assetId))
        //   .first();
        // if (timelineBlocks) {
        //   throw new Error("Cannot delete asset that is referenced in timeline");
        // }

        // delete from R2
        await r2.deleteObject(ctx, asset.objectKey);

        // delete from database
        await ctx.db.delete(args.assetId);

        return { success: true };
    },
});
