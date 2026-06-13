export type SessionMode = "guest-local" | "signed-in-local" | "cloud-synced";

export function getSessionMode({
	isSignedIn,
	projectId,
	cloudUploadEnabled,
}: {
	isSignedIn: boolean;
	projectId: string | null | undefined;
	cloudUploadEnabled: boolean;
}): SessionMode {
	if (isSignedIn && projectId && cloudUploadEnabled) {
		return "cloud-synced";
	}
	if (isSignedIn) {
		return "signed-in-local";
	}
	return "guest-local";
}

export function isLocalTimelineMode(mode: SessionMode): boolean {
	return mode !== "cloud-synced";
}
