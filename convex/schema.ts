import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    planId: v.optional(v.union(v.literal("free"), v.literal("pro"))),
    email: v.string(),
    image: v.string(),
    // clerk id, from subject jwt field
    externalId: v.string(),
  }).index("byExternalId", ["externalId"]),
  projects: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("byOwnerId", ["ownerId"]),
  assets: defineTable({
    ownerId: v.id("users"),
    projectId: v.id("projects"),
    type: v.union(
      v.literal("video"),
      v.literal("audio"),
      v.literal("image")
    ),
    url: v.string(), // our R2 URL
    objectKey: v.string(), // the object key in R2
    sizeBytes: v.number(),
    durationMs: v.optional(v.number()),
    createdAt: v.number(),
  }).index("byProject", ["projectId"]).index("byOwner", ["ownerId"]),
});