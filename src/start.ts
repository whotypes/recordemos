import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => {
	return {
		requestMiddleware: [
			clerkMiddleware({
				secretKey: process.env.CLERK_SECRET_KEY,
				authorizedParties: [
					"https://recorddemos.com",
					"https://www.recorddemos.com",
				]
			}),
		],
	};
});