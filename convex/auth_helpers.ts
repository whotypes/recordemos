import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// helper function to check if user has access to a project (owner, accepted invite, or public)
export async function hasProjectAccess(
  ctx: QueryCtx,
  userId: Id<"users">,
  projectId: Id<"projects">
): Promise<boolean> {
  const project = await ctx.db.get(projectId);
  if (!project) return false;

  // check if project is public
  if (project.visibility === "public") return true;

  // check if user is the owner
  if (project.ownerId === userId) return true;

  // check if user has an accepted invitation
  const acceptedInvite = await ctx.db
    .query("notifications")
    .withIndex("byToUserAndStatus", (q) =>
      q.eq("toUserId", userId).eq("status", "accepted")
    )
    .filter((q) => q.eq(q.field("projectId"), projectId))
    .first();

  return !!acceptedInvite;
}

// helper function to check if user can modify a project (owner or accepted invite with write permissions)
export async function canModifyProject(
  ctx: QueryCtx,
  userId: Id<"users">,
  projectId: Id<"projects">
): Promise<boolean> {
  const project = await ctx.db.get(projectId);
  if (!project) return false;

  // only owner can modify for now
  // in the future, we could add write permissions to invitations
  return project.ownerId === userId;
}
