import { ingestVideo } from "@/lib/video-ingest";
import { useLocalTimelineStore } from "@/lib/local-timeline-store";
import { usePlayheadStore } from "@/lib/playhead-store";
import { useVideoPlayerStore } from "@/lib/video-player-store";
import { useUploadFile } from "@convex-dev/r2/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery as useConvexQuery, useMutation } from "convex/react";
import { toast } from "sonner";

interface UploadOptions {
	projectId?: Id<"projects">;
	onUploadComplete?: (assetId: Id<"assets">) => void;
	/** When set, timeline + storage swap from this asset to the newly uploaded one (cloud projects only). */
	replacePreviousAssetId?: Id<"assets">;
	recordedDurationMs?: number;
}

export const useVideoUpload = (projectId?: Id<"projects">) => {
	const {
		setVideoSrc,
		setVideoDuration,
		setVideoFileName,
		setVideoFileSize,
		setVideoFileFormat,
		setIsUploading,
		setUploadProgress,
		setUploadStatus,
		cloudUploadEnabled,
	} = useVideoPlayerStore();

	const { setPlayheadMs } = usePlayheadStore();
	const { initializeLocalTimeline } = useLocalTimelineStore();

	const uploadFile = useUploadFile(api.assets);
	const insertAssetRow = useMutation(api.assets.insertAssetRow);
	const initializeTimeline = useMutation(
		api.timeline_helpers.initializeProjectTimeline,
	);
	const replaceBaseVideo = useMutation(
		api.timeline_helpers.replaceProjectBaseVideo,
	);
	const initializeSettings = useMutation(api.project_settings.initialize);

	const projectVerification = useConvexQuery(
		api.assets.verifyProjectAccess,
		projectId ? { projectId } : "skip",
	);

	const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("video/")) {
			toast.error("Please select a video file");
			return;
		}

		uploadVideoFile(file);
		e.target.value = "";
	};

	const uploadVideoFile = async (
		file: File,
		options?: UploadOptions,
	): Promise<{
		blobUrl: string;
		assetId?: Id<"assets">;
		uploadFailed?: boolean;
	}> => {
		return ingestVideo(
			file,
			{
				projectId: options?.projectId,
				replacePreviousAssetId: options?.replacePreviousAssetId,
				recordedDurationMs: options?.recordedDurationMs,
				onUploadComplete: options?.onUploadComplete,
			},
			{
				cloudUploadEnabled,
				setVideoSrc,
				setVideoDuration,
				setPlayheadMs,
				setVideoFileName,
				setVideoFileSize,
				setVideoFileFormat,
				setIsUploading,
				setUploadProgress,
				setUploadStatus,
				initializeLocalTimeline,
				uploadFile,
				insertAssetRow,
				initializeTimeline,
				replaceBaseVideo,
				initializeSettings,
			},
		);
	};

	return {
		handleVideoUpload,
		uploadVideoFile,
		projectVerification,
	};
};
