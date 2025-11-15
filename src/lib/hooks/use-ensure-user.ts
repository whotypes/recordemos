import { useUser } from "@clerk/tanstack-react-start";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { useEffect, useRef } from "react";

/**
 * Hook that ensures the current authenticated user exists in the Convex database.
 * This handles the race condition where Clerk authenticates the user before the
 * webhook has a chance to create the user record in Convex.
 */
export const useEnsureUser = () => {
	const { user, isLoaded } = useUser();
	const hasEnsured = useRef(false);
	const ensureUserMutation = useConvexMutation(api.users.ensureCurrentUser);

	useEffect(() => {
		if (isLoaded && user && !hasEnsured.current) {
			hasEnsured.current = true;
			ensureUserMutation({})
				.catch((error) => {
					console.error("Failed to ensure user:", error);
					// reset flag to retry on next render
					hasEnsured.current = false;
				});
		}
	}, [isLoaded, user, ensureUserMutation]);

	return {
		isUserEnsured: hasEnsured.current,
		isLoading: !isLoaded || (user && !hasEnsured.current),
	};
};
