import { UserJSON } from "@clerk/backend";
import type { Product } from "autumn-js";
import { v, Validator } from "convex/values";
import { api } from "./_generated/api";
import { internalAction, internalMutation, mutation, query, QueryCtx } from "./_generated/server";
import { autumn } from "./autumn";

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    const lowerQuery = query.toLowerCase();
    const allUsers = await ctx.db.query("users").collect();

    return allUsers.filter(
      (user) =>
        user.username.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery)
    );
  },
});

export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    let user = await userByExternalId(ctx, identity.subject);
    if (!user) {
      const email = typeof identity.email === "string"
        ? identity.email
        : typeof identity.emailVerified === "string"
          ? identity.emailVerified
          : "unknown@example.com";
      const username = identity.nickname || identity.name || email.split("@")[0] || "user";
      const image = identity.pictureUrl || "";

      const baseUsername = await generateUniqueUsername(ctx, username);

      const userAttributes = {
        externalId: identity.subject,
        username: baseUsername,
        email,
        image,
        planId: "free" as const,
      };

      const userId = await ctx.db.insert("users", userAttributes);
      user = await ctx.db.get(userId);
    }

    return user;
  },
});

export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    return await userByExternalId(ctx, externalId);
  },
});


export const attachFreePlan = internalAction({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    try {
      const user = await ctx.runQuery(api.users.getByExternalId, {
        externalId: clerkUserId,
      });

      const customerData = user
        ? {
          name: user.username || undefined,
          email: user.email || undefined,
        }
        : undefined;

      const productsResult = await ctx.runAction(api.autumn.listProducts, {});

      if (productsResult.error) {
        console.error(`Failed to list products: ${productsResult.error.message}`);
        return;
      }

      const productsList = productsResult.data?.list;
      if (!productsList) {
        console.error('No products list returned');
        return;
      }

      const freePlan = productsList.find((product: Product) => product.properties?.is_free === true);

      if (freePlan) {
        const attachResult = await autumn.attach(
          { ...ctx, customerId: clerkUserId, customerData },
          {
            productId: freePlan.id,
          },
        );

        if (attachResult.error) {
          if (!attachResult.error.message?.includes("already attached")) {
            console.error(`Failed to attach free plan: ${attachResult.error.message}`);
          }
        }
      } else {
        console.warn(`No free plan found for user ${clerkUserId}`);
      }
    } catch (error) {
      console.error(`Failed to attach free plan to user ${clerkUserId}:`, error);
    }
  },
});

async function generateUniqueUsername(ctx: QueryCtx, baseUsername: string) {
  let username = baseUsername;
  let count = 1;

  // check if username already exists
  while (true) {
    const existing = await ctx.db
      .query("users")
      .withIndex("byUsername", (q) => q.eq("username", username))
      .first();

    if (!existing) {
      break;
    }

    username = `${baseUsername}${count}`;
    count++;
  }

  return username;
}

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
  async handler(ctx, { data }) {
    const baseUsername = data.username ?? data.email_addresses[0].email_address?.split("@")[0] ?? "test";
    const email = data.email_addresses[0].email_address ?? data.external_accounts[0].email_address;
    const image = data.image_url ?? data.external_accounts[0].image_url;
    const username = await generateUniqueUsername(ctx, baseUsername);

    const user = await userByExternalId(ctx, data.id);
    const isNewUser = user === null;

    if (isNewUser) {
      const userAttributes = {
        externalId: data.id,
        username,
        email,
        image,
        planId: "free" as const,
      };
      await ctx.db.insert("users", userAttributes);
    } else {
      const userAttributes = {
        externalId: data.id,
        username,
        email,
        image,
      };
      await ctx.db.patch(user._id, userAttributes);
    }

    return { isNewUser };
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByExternalId(ctx, clerkUserId);

    if (user !== null) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(
        `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`,
      );
    }
  },
});

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }

  const user = await userByExternalId(ctx, identity.subject);

  return user;
}

async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .unique();
}