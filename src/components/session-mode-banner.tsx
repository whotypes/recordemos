import { Button } from "@/components/ui/button";
import type { SessionMode } from "@/lib/session-mode";
import { cn } from "@/lib/utils";
import { Cloud, CloudOff, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_STORAGE_PREFIX = "session-mode-banner-dismissed";

function getDismissKey(projectId?: string) {
	return projectId
		? `${DISMISS_STORAGE_PREFIX}:${projectId}`
		: `${DISMISS_STORAGE_PREFIX}:default`;
}

export interface SessionModeBannerProps {
	sessionMode: SessionMode;
	projectId?: string;
	projectName?: string;
	onEnableCloud?: () => void;
}

export default function SessionModeBanner({
	sessionMode,
	projectId,
	projectName,
	onEnableCloud,
}: SessionModeBannerProps) {
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		if (sessionMode !== "cloud-synced") {
			setDismissed(false);
			return;
		}

		try {
			setDismissed(localStorage.getItem(getDismissKey(projectId)) === "true");
		} catch {
			setDismissed(false);
		}
	}, [sessionMode, projectId]);

	const handleDismiss = () => {
		try {
			localStorage.setItem(getDismissKey(projectId), "true");
		} catch {
			// ignore storage errors
		}
		setDismissed(true);
	};

	// Guest sign-in lives in the navbar — no banner needed.
	if (sessionMode === "guest-local") {
		return null;
	}

	if (sessionMode === "cloud-synced" && dismissed) {
		return null;
	}

	const displayProjectName = projectName?.trim() || "project";

	return (
		<div
			role="status"
			className={cn(
				"flex shrink-0 items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-1.5",
			)}
		>
			<div className="flex min-w-0 items-center gap-2">
				{sessionMode === "cloud-synced" ? (
					<Cloud className="size-3.5 shrink-0 text-muted-foreground" />
				) : (
					<CloudOff className="size-3.5 shrink-0 text-muted-foreground" />
				)}
				<p className="text-xs text-muted-foreground">
					{sessionMode === "signed-in-local" ? (
						<>
							Local session — changes won&apos;t sync to cloud.
							{onEnableCloud ? (
								<Button
									type="button"
									variant="link"
									size="sm"
									className="ml-1 inline h-auto p-0 text-xs font-normal text-foreground underline-offset-4 hover:underline"
									onClick={onEnableCloud}
								>
									Enable cloud sync
								</Button>
							) : null}
						</>
					) : (
						<>
							Synced to{" "}
							<span className="font-medium text-foreground">
								{displayProjectName}
							</span>
						</>
					)}
				</p>
			</div>
			{sessionMode === "cloud-synced" ? (
				<Button
					size="icon"
					variant="ghost"
					className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
					onClick={handleDismiss}
					aria-label="Dismiss sync status"
				>
					<X className="size-3" />
				</Button>
			) : null}
		</div>
	);
}
