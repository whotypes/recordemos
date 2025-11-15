import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
      username: v.string(),
      email: v.string(),
      image: v.string(),
      // clerk id, from subject jwt field
      externalId: v.string(),
  }).index("byExternalId", ["externalId"]),
});