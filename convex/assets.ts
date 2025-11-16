import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { r2 } from "./r2";
import { getCurrentUser, getCurrentUserOrThrow } from "./users";
import { hasProjectAccess } from "./auth_helpers";

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

        const hasAccess = await hasProjectAccess(ctx, user._id, args.projectId);
        if (!hasAccess) {
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

        // verify user has access to the project
        const project = await ctx.db.get(args.projectId);
        if (!project) {
            throw new Error("Project not found");
        }

        const hasAccess = await hasProjectAccess(ctx, user._id, args.projectId);
        if (!hasAccess) {
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

        // verify user has access to the project
        const project = await ctx.db.get(args.projectId);
        if (!project) {
            throw new Error("Project not found");
        }

        const hasAccess = await hasProjectAccess(ctx, user._id, args.projectId);
        if (!hasAccess) {
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

        // check if user has access to the project that owns this asset
        const hasAccess = await hasProjectAccess(ctx, user._id, asset.projectId);
        if (!hasAccess) {
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

        // verify user has access to an asset with this key
        const asset = await ctx.db
            .query("assets")
            .filter((q) => q.eq(q.field("objectKey"), args.objectKey))
            .first();

        if (!asset) {
            throw new Error("Asset not found");
        }

        // check if user has access to the project that owns this asset
        const hasAccess = await hasProjectAccess(ctx, user._id, asset.projectId);
        if (!hasAccess) {
            throw new Error("Not authorized to access this asset");
        }

        const url = await r2.getUrl(args.objectKey, {
            expiresIn: 60 * 60 * 24 * 4, // 4 days
        });

        return url;
    },
});

// get primary video asset for a project (the first video asset created)
export const getPrimaryVideoAsset = query({
    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUser(ctx);
        if (!user) {
            throw new Error("Not authenticated");
        }

        // verify user has access to the project
        const project = await ctx.db.get(args.projectId);
        if (!project) {
            throw new Error("Project not found");
        }

        const hasAccess = await hasProjectAccess(ctx, user._id, args.projectId);
        if (!hasAccess) {
            throw new Error("Not authorized to view this project's assets");
        }

        // get the first video asset for this project
        const videoAsset = await ctx.db
            .query("assets")
            .withIndex("byProject", (q) => q.eq("projectId", args.projectId))
            .filter((q) => q.eq(q.field("type"), "video"))
            .order("asc")
            .first();

        if (!videoAsset) {
            return null;
        }

        // get the video URL from R2 (4d expiry)
        const url = await r2.getUrl(videoAsset.objectKey, {
            expiresIn: 60 * 60 * 24 * 4, // 4 days
        });

        return {
            ...videoAsset,
            url,
        };
    },
});

// delete asset and all related records
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

        // check if user has access to the project that owns this asset
        const hasAccess = await hasProjectAccess(ctx, user._id, asset.projectId);
        if (!hasAccess) {
            throw new Error("Not authorized to delete this asset");
        }

        // delete all timeline blocks that reference this asset
        const timelineBlocks = await ctx.db
            .query("timeline_blocks")
            .withIndex("byProject", (q) => q.eq("projectId", asset.projectId))
            .collect();

        for (const block of timelineBlocks) {
            if (block.assetId === args.assetId) {
                await ctx.db.delete(block._id);
            }
        }

        // delete timeline edits for this project (since the video is being removed)
        const timelineEdits = await ctx.db
            .query("timeline_edits")
            .withIndex("byProject", (q) => q.eq("projectId", asset.projectId))
            .collect();

        for (const edit of timelineEdits) {
            await ctx.db.delete(edit._id);
        }

        // delete from R2
        await r2.deleteObject(ctx, asset.objectKey);

        // delete from database
        await ctx.db.delete(args.assetId);

        return { success: true };
    },
});
