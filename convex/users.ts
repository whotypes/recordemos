import { UserJSON } from "@clerk/backend";
import type { Product } from "autumn-js";
import { v, Validator } from "convex/values";
import { api } from "./_generated/api";
import { internalAction, internalMutation, query, QueryCtx } from "./_generated/server";
import { autumn } from "./autumn";

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
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
        const user = await ctx.runQuery(api.users.getByExternalId, {
          externalId: clerkUserId,
        });

        const customerData = user
          ? {
              name: user.username || undefined,
              email: user.email || undefined,
            }
          : undefined;


        const attachResult = await autumn.attach(
          { ...ctx, customerId: clerkUserId, customerData },
          {
            productId: freePlan.id,
          },
        );

        if (attachResult.error) {
          console.error(`Failed to attach free plan: ${attachResult.error.message}`);
        } else {
          console.log(`Attached free plan ${freePlan.id} to user ${clerkUserId}`);
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
  while (await userByExternalId(ctx, username)) {
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

    const userAttributes = {
      externalId: data.id,
      username,
      email,
      image,
    };

    const user = await userByExternalId(ctx, data.id);
    if (user === null) {
      await ctx.db.insert("users", userAttributes);
    } else {
      await ctx.db.patch(user._id, userAttributes);
    }
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
  return await userByExternalId(ctx, identity.subject);
}

async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .unique();
}