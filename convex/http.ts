import type { WebhookEvent } from "@clerk/backend";
import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { autumn } from "./autumn";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const clerkEvent = await validateRequest(request);
    if (!clerkEvent) return new Response("Invalid Request...Check Clerk Webhook Secret and URL", { status: 400 });
    switch (clerkEvent.type) {
      case "user.created":
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: clerkEvent.data!,
        });
        
        await ctx.runAction(internal.users.attachFreePlan, {
          clerkUserId: clerkEvent.data!.id!,
        });
        break;

      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: clerkEvent.data!,
        });
        break;

      case "user.deleted": {
        const clerkUserId = clerkEvent.data!.id!;
        await ctx.runMutation(internal.users.deleteFromClerk, { clerkUserId });
        break;
      }
      default:
        console.log("Ignoring this event:", clerkEvent?.type);
    }

    return new Response(null, { status: 200 });
  }),
});

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  try {
    return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
  } catch (error) {
    console.error("Error verifying this event:", {error});
    return null;
  }
}

export default http;