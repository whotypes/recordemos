import EditingPanel from "@/components/editing-panel/index";
import ExportModule from "@/components/export-module";
import PreviewCanvas from "@/components/preview-canvas";
import PreviewTimelineBar from "@/components/preview-timeline-bar";
import SessionModeBanner from "@/components/session-mode-banner";
import TimelineEditor from "@/components/timeline-editor";
import StudioNavbar from "@/components/ui/studio-navbar";
import { useCompositionStore } from "@/lib/composition-store";
import { DEFAULT_UNSPLASH_PHOTO_URLS } from "@/lib/constants";
import { usePresence } from "@/lib/hooks/use-presence";
import { usePresenceSync } from "@/lib/hooks/use-presence-sync";
import { useProjectRestore } from "@/lib/hooks/use-project-restore";
import { useProjectSettingsSync } from "@/lib/hooks/use-project-settings-sync";
import { useTimelineBlocks } from "@/lib/hooks/use-timeline-blocks";
import { useVideoPlayer } from "@/lib/hooks/use-video-player";
import { usePlayheadStore } from "@/lib/playhead-store";
import { useTimelineDurationStore } from "@/lib/timeline-duration-store";
import { useLocalTimelineStore } from "@/lib/local-timeline-store";
import { useVideoOptionsStore } from "@/lib/video-options-store";
import { isValidDuration, resolveLayoutDurationSec } from "@/lib/video-metadata";
import { getSessionMode } from "@/lib/session-mode";
import { seekPreviewVideo } from "@/lib/seek-preview";
import { useVideoPlayerStore } from "@/lib/video-player-store";
import { useAuth } from "@clerk/tanstack-react-start";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/studio")({
	ssr: false,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			projectId: (search.projectId as string) || undefined,
		};
	},
	loader: async (opts) => {
		// Only prefetch if user is authenticated
		const userId = opts.context.userId;
		if (userId) {
			await opts.context.queryClient.ensureQueryData(
				convexQuery(api.projects.listForCurrentUser, {}),
			);
		}

		// Prefetch the default wallpaper image for dark mode
		// this ensures the image is cached and ready to display
		if (typeof window !== "undefined") {
			const isDark = document.documentElement.classList.contains("dark");
			if (isDark) {
				// preload the image in the background
				const img = new Image();
				img.src = DEFAULT_UNSPLASH_PHOTO_URLS.regular;
			}
		}
	},
	component: Studio,
});

function Studio() {
	const { projectId } = Route.useSearch();
	const navigate = useNavigate();
	const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
	const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
	const [showExport, setShowExport] = useState(false);

	const { data: convexProjects } = useQuery({
		...convexQuery(api.projects.listForCurrentUser, {}),
		enabled: isAuthLoaded && isSignedIn,
	});

	const { data: currentUser } = useQuery({
		...convexQuery(api.users.current, {}),
		enabled: isAuthLoaded && isSignedIn,
	});

	// restore project state from database and R2
	useProjectRestore(projectId as Id<"projects"> | null);

	// sync local settings changes to database
	useProjectSettingsSync(projectId as Id<"projects"> | null);

	useEffect(() => {
		if (!isAuthLoaded || !isSignedIn || !convexProjects) {
			return;
		}

		const projects = Array.isArray(convexProjects) ? convexProjects : [];

		if (!projectId && projects.length > 0) {
			navigate({
				to: "/studio",
				search: { projectId: projects[0]._id },
				replace: true,
			});
		}
	}, [projectId, convexProjects, navigate, isAuthLoaded, isSignedIn]);

	const {
		videoDuration,
		setVideoDuration,
		videoSrc,
		setVideoSrc,
		videoFileName,
		currentClipAssetId,
		cloudUploadEnabled,
		setCloudUploadEnabled,
	} = useVideoPlayerStore();

	const autoEnabledProjectsRef = useRef<Set<string>>(new Set());
	const userDisabledCloudForProjectRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		if (!isAuthLoaded || !isSignedIn || !projectId) {
			return;
		}
		if (userDisabledCloudForProjectRef.current.has(projectId)) {
			return;
		}
		if (autoEnabledProjectsRef.current.has(projectId)) {
			return;
		}

		setCloudUploadEnabled(true);
		autoEnabledProjectsRef.current.add(projectId);
	}, [isAuthLoaded, isSignedIn, projectId, setCloudUploadEnabled]);

	useEffect(() => {
		if (!projectId) {
			return;
		}
		if (autoEnabledProjectsRef.current.has(projectId) && !cloudUploadEnabled) {
			userDisabledCloudForProjectRef.current.add(projectId);
		}
	}, [cloudUploadEnabled, projectId]);

	const localBlocks = useLocalTimelineStore((s) => s.localBlocks);
	const initializeLocalTimeline = useLocalTimelineStore(
		(s) => s.initializeLocalTimeline,
	);

	// Fallback: preview-canvas dropzone and legacy local paths may set videoSrc
	// without ingestVideo; ingestVideo owns primary timeline init for uploads/recordings.
	const isLocalSession = !cloudUploadEnabled || !projectId;
	useEffect(() => {
		if (!isLocalSession) return;
		if (!videoSrc) return;
		if (videoDuration <= 0) return;
		if (localBlocks.length > 0) return;
		initializeLocalTimeline(videoDuration);
	}, [
		isLocalSession,
		videoSrc,
		videoDuration,
		localBlocks.length,
		initializeLocalTimeline,
	]);

	const { playheadMs, isPlaying, setPlayheadMs, setIsPlaying } =
		usePlayheadStore();
	const { videoRef } = useVideoPlayer(videoSrc);
	const { computeActiveBlock, activeVideoBlock, playbackEndMs } =
		useCompositionStore();
	const { getEffectiveDuration } = useTimelineDurationStore();

	// derive current time in seconds for display
	const currentTime = playheadMs / 1000;

	// Edited timeline length from composition store (respects trim)
	const timelineDuration = getEffectiveDuration();

	const rawVideoDuration = isValidDuration(videoDuration)
		? videoDuration
		: timelineDuration;

	// Check if we have a video - either videoSrc is set, or we have metadata/asset ID
	const hasVideo = !!(videoSrc || videoFileName || currentClipAssetId);

	const handleVideoBlockDelete = () => {
		if (videoSrc && videoSrc.startsWith("blob:")) {
			URL.revokeObjectURL(videoSrc);
		}
		setVideoSrc(null);
		setPlayheadMs(0, "init");
		setVideoDuration(0);
	};

	// ensure composition compiler stays in sync even when not in edit mode
	const timelineBlocks = useTimelineBlocks(
		projectId as Id<"projects"> | null,
		timelineDuration,
		currentTime,
		selectedBlock,
		setSelectedBlock,
		handleVideoBlockDelete,
	);

	const layoutTimelineDuration = useMemo(() => {
		if (playbackEndMs > 0) return playbackEndMs / 1000;
		return resolveLayoutDurationSec(
			rawVideoDuration,
			timelineBlocks.blocks.filter((b) => b.type === "video"),
		);
	}, [playbackEndMs, rawVideoDuration, timelineBlocks.blocks]);

	const handleSetCurrentTime = useCallback(
		(time: number) => {
			if (usePlayheadStore.getState().isPlaying) {
				setIsPlaying(false);
			}

			const timeMs = time * 1000;
			const endMs =
				useCompositionStore.getState().playbackEndMs ||
				layoutTimelineDuration * 1000;
			const maxMs = endMs > 0 ? endMs - 1 : timeMs;
			const clampedMs = Math.max(0, Math.min(timeMs, maxMs));

			setPlayheadMs(clampedMs, "scrub");
			computeActiveBlock(clampedMs);
			seekPreviewVideo(videoRef.current, clampedMs);
		},
		[
			layoutTimelineDuration,
			setPlayheadMs,
			setIsPlaying,
			computeActiveBlock,
			videoRef,
		],
	);

	// broadcast presence to other users
	usePresence({
		projectId: projectId as Id<"projects"> | null,
		userId: currentUser?._id || null,
		username: currentUser?.username || "",
		userImage: currentUser?.image || "",
		currentTimeMs: playheadMs,
		isPlaying,
		enabled: !!projectId && !!currentUser,
	});

	// sync playback with other users
	usePresenceSync({
		currentUserId: currentUser?._id || null,
		videoRef,
		enabled: !!currentUser,
	});

	// Update composition store when playhead changes
	useEffect(() => {
		computeActiveBlock(playheadMs);
	}, [playheadMs, computeActiveBlock]);

	const aspectRatio = useVideoOptionsStore((state) => state.aspectRatio);
	const editorMode = useVideoOptionsStore((state) => state.editorMode);
	const setEditorMode = useVideoOptionsStore((state) => state.setEditorMode);

	const sessionMode = getSessionMode({
		isSignedIn: !!isSignedIn,
		projectId,
		cloudUploadEnabled,
	});

	const projectName = useMemo(() => {
		if (!projectId || !convexProjects) {
			return undefined;
		}
		const projects = Array.isArray(convexProjects) ? convexProjects : [];
		return projects.find((project) => project._id === projectId)?.name;
	}, [projectId, convexProjects]);

	const handleEnableCloud = () => {
		setCloudUploadEnabled(true);
		toast.success("Cloud sync enabled", {
			description: "Changes will be saved to your project",
		});
	};

	return (
		<div className="h-screen w-full bg-background flex flex-col overflow-hidden">
			<StudioNavbar
				activeProjectId={projectId as Id<"projects"> | undefined}
				currentUserId={currentUser?._id}
			/>

			<SessionModeBanner
				sessionMode={sessionMode}
				projectId={projectId}
				projectName={projectName}
				onEnableCloud={
					sessionMode === "signed-in-local" ? handleEnableCloud : undefined
				}
			/>

			<div className="flex flex-1 overflow-hidden gap-0">
				<div className="w-full max-w-md min-w-[20rem] shrink-0 overflow-hidden border-r border-border bg-card sidebar-scrollbar">
					<EditingPanel
						projectId={projectId}
						onExport={() => setShowExport(true)}
					/>
				</div>

				<div className="flex-1 flex flex-col overflow-hidden">
					<div className="flex-1 overflow-auto bg-background flex items-center justify-center p-6 relative">
						<PreviewCanvas
							videoRef={videoRef}
							projectId={projectId as Id<"projects"> | undefined}
						/>
					</div>

					<div className="border-t border-border bg-card">
						{editorMode === "edit" ? (
							<TimelineEditor
								blocks={timelineBlocks.blocks}
								timelineDuration={layoutTimelineDuration}
								blockHandlers={timelineBlocks}
								currentTime={currentTime}
								setCurrentTime={handleSetCurrentTime}
								isPlaying={isPlaying}
								setIsPlaying={setIsPlaying}
								selectedBlock={selectedBlock}
								setSelectedBlock={setSelectedBlock}
								activeVideoBlockId={activeVideoBlock?.blockId ?? null}
							/>
						) : (
							<PreviewTimelineBar
								hasVideo={hasVideo}
								timelineDuration={layoutTimelineDuration}
								currentTime={currentTime}
								isPlaying={isPlaying}
								onSetCurrentTime={handleSetCurrentTime}
								onSetIsPlaying={setIsPlaying}
								onOpenEditor={() => setEditorMode("edit")}
							/>
						)}
					</div>
				</div>
			</div>

			{showExport && (
				<ExportModule
					aspectRatio={aspectRatio}
					onClose={() => setShowExport(false)}
				/>
			)}
		</div>
	);
}
