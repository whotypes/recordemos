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
});