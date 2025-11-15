import { Autumn } from "@useautumn/convex";
import { components } from "convex/_generated/api";

export const autumn = new Autumn(components.autumn, {
  secretKey: process.env.AUTUMN_SECRET_KEY ?? "",
  identify: async (ctx: any) => {
    const user = await ctx.auth.getUserIdentity();
    if (user) {
      const userId = user.subject
      return {
        customerId: userId,
        customerData: {
          name: user.username as string,
          email: user.email as string,
        },
      };
    }

    if (ctx.customerId) {
      return {
        customerId: ctx.customerId,
        customerData: ctx.customerData,
      };
    }

    return null;
  },
});

export const {
  track,
  cancel,
  query,
  attach,
  check,
  checkout,
  usage,
  setupPayment,
  createCustomer,
  listProducts,
  billingPortal,
  createReferralCode,
  redeemReferralCode,
  createEntity,
  getEntity,
} = autumn.api();