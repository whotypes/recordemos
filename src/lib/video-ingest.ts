import { extractVideoMetadata } from "@/lib/video-metadata";
import { needsDurationRepair, repairWebmOrRemuxToMp4 } from "@/lib/video-remux";
import { useVideoPlayerStore } from "@/lib/video-player-store";
import type { Id } from "convex/_generated/dataModel";
import { toast } from "sonner";

export type VideoIngestCtx = {
	projectId?: Id<"projects">;
	replacePreviousAssetId?: Id<"assets">;
	recordedDurationMs?: number;
	onUploadComplete?: (assetId: Id<"assets">) => void;
};

export type VideoIngestDeps = {
	cloudUploadEnabled: boolean;
	setVideoSrc: (src: string | null) => void;
	setVideoDuration: (duration: number) => void;
	setPlayheadMs: (
		timeMs: number,
		reason?: "scrub" | "presence" | "block-move" | "playback" | "init",
	) => void;
	setVideoFileName: (name: string | null) => void;
	setVideoFileSize: (size: number | null) => void;
	setVideoFileFormat: (format: string | null) => void;
	setIsUploading: (uploading: boolean) => void;
	setUploadProgress: (progress: number) => void;
	setUploadStatus: (status: string | null) => void;
	initializeLocalTimeline: (duration: number) => void;
	uploadFile: (file: File) => Promise<string>;
	insertAssetRow: (args: {
		projectId: Id<"projects">;
		type: "video" | "audio" | "image";
		objectKey: string;
		originalFileName: string;
		sizeBytes: number;
		durationMs?: number;
	}) => Promise<Id<"assets">>;
	initializeTimeline: (args: {
		projectId: Id<"projects">;
		assetId: Id<"assets">;
		durationMs: number;
	}) => Promise<unknown>;
	replaceBaseVideo: (args: {
		projectId: Id<"projects">;
		newAssetId: Id<"assets">;
		durationMs: number;
		previousAssetId: Id<"assets">;
	}) => Promise<unknown>;
	initializeSettings: (args: { projectId: Id<"projects"> }) => Promise<unknown>;
};

export type VideoIngestResult = {
	blobUrl: string;
	assetId?: Id<"assets">;
	uploadFailed?: boolean;
};

function isCloudPath(
	cloudUploadEnabled: boolean,
	projectId?: Id<"projects">,
): boolean {
	return cloudUploadEnabled && Boolean(projectId);
}

function mp4FileName(name: string): string {
	return name.replace(/\.[^/.]+$/, ".mp4");
}

async function maybeRepairVideoFile(
	file: File,
	ctx: VideoIngestCtx,
	deps: VideoIngestDeps,
): Promise<{
	file: File;
	metadata: Awaited<ReturnType<typeof extractVideoMetadata>>;
}> {
	let metadata = await extractVideoMetadata(file, {
		recordedDurationMs: ctx.recordedDurationMs,
	});

	if (
		!needsDurationRepair(metadata, file)
	) {
		return { file, metadata };
	}

	const isLocal = !isCloudPath(deps.cloudUploadEnabled, ctx.projectId);
	deps.setIsUploading(true);
	deps.setUploadProgress(5);
	deps.setUploadStatus("Preparing video...");

	const repaired = await repairWebmOrRemuxToMp4(file, {
		onProgress: (msg) => deps.setUploadStatus(msg),
	});

	if (repaired !== file && repaired.size > 0) {
		const repairedName = mp4FileName(file.name);
		deps.setVideoFileName(repairedName);
		deps.setVideoFileSize(repaired.size);
		deps.setVideoFileFormat("mp4");

		metadata = await extractVideoMetadata(repaired, {
			recordedDurationMs: ctx.recordedDurationMs,
		});
		if (isLocal) {
			deps.setIsUploading(false);
			deps.setUploadStatus(null);
			deps.setUploadProgress(0);
		}
		return { file: repaired, metadata };
	}

	if (isLocal) {
		deps.setIsUploading(false);
		deps.setUploadStatus(null);
		deps.setUploadProgress(0);
	}

	return { file, metadata };
}

async function initializeLocalFromMetadata(
	metadata: Awaited<ReturnType<typeof extractVideoMetadata>>,
	deps: VideoIngestDeps,
): Promise<void> {
	try {
		deps.setVideoDuration(metadata.durationSec);
		deps.initializeLocalTimeline(metadata.durationSec);
		toast.success("Video loaded locally");
	} catch (error) {
		console.error("Failed to initialize local timeline:", error);
		toast.warning("Video loaded but timeline initialization failed");
	}
}

export async function ingestVideo(
	file: File,
	ctx: VideoIngestCtx,
	deps: VideoIngestDeps,
): Promise<VideoIngestResult> {
	let blobUrl: string | null = null;

	try {
		const currentSrc = useVideoPlayerStore.getState().videoSrc;
		if (currentSrc?.startsWith("blob:")) {
			setTimeout(() => URL.revokeObjectURL(currentSrc), 500);
		}

		deps.setPlayheadMs(0, "init");
		deps.setVideoDuration(0);

		deps.setVideoFileName(file.name);
		deps.setVideoFileSize(file.size);
		const ext = file.name.split(".").pop()?.toLowerCase();
		const format = ext || file.type.split("/")[1] || "unknown";
		deps.setVideoFileFormat(format);

		const { file: workingFile, metadata } = await maybeRepairVideoFile(
			file,
			ctx,
			deps,
		);

		blobUrl = URL.createObjectURL(workingFile);
		deps.setVideoSrc(blobUrl);

		if (!isCloudPath(deps.cloudUploadEnabled, ctx.projectId)) {
			await initializeLocalFromMetadata(metadata, deps);
			return { blobUrl };
		}

		deps.setUploadProgress(30);
		deps.setUploadStatus("Uploading to cloud storage...");

		const objectKey = await deps.uploadFile(workingFile);

		deps.setUploadProgress(70);
		deps.setUploadStatus("Creating asset record...");

		const type = workingFile.type.startsWith("video/")
			? "video"
			: workingFile.type.startsWith("audio/")
				? "audio"
				: "image";

		const assetId = await deps.insertAssetRow({
			projectId: ctx.projectId!,
			type,
			objectKey,
			originalFileName: workingFile.name,
			sizeBytes: workingFile.size,
			durationMs: metadata.durationSec * 1000,
		});

		deps.setUploadProgress(85);
		deps.setUploadStatus("Initializing timeline...");

		if (type === "video") {
			if (ctx.replacePreviousAssetId) {
				await deps.replaceBaseVideo({
					projectId: ctx.projectId!,
					newAssetId: assetId,
					durationMs: metadata.durationSec * 1000,
					previousAssetId: ctx.replacePreviousAssetId,
				});
			} else {
				await deps.initializeTimeline({
					projectId: ctx.projectId!,
					assetId,
					durationMs: metadata.durationSec * 1000,
				});

				await deps.initializeSettings({
					projectId: ctx.projectId!,
				});
			}
		}

		deps.setUploadProgress(100);
		deps.setUploadStatus("Complete!");

		toast.success(
			ctx.replacePreviousAssetId
				? "Video replaced"
				: "Video uploaded successfully",
		);
		ctx.onUploadComplete?.(assetId);

		setTimeout(() => {
			deps.setIsUploading(false);
			deps.setUploadProgress(0);
			deps.setUploadStatus(null);
		}, 1000);

		return { blobUrl, assetId };
	} catch (error) {
		console.error("Upload error:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Failed to process video";

		if (errorMessage.includes("Project not found")) {
			toast.error(
				"Cloud upload failed: Project not found. Video available for local editing only.",
			);
		} else if (errorMessage.includes("Not authorized")) {
			toast.error(
				"Cloud upload failed: Not authorized. Video available for local editing only.",
			);
		} else if (errorMessage.includes("metadata")) {
			toast.error("Failed to analyze video. Please try a different file.");
		} else {
			toast.error("Failed to process video. Please try again.");
		}

		deps.setIsUploading(false);
		deps.setUploadProgress(0);
		deps.setUploadStatus(null);

		if (errorMessage.includes("metadata") || errorMessage.includes("timeout")) {
			if (blobUrl) {
				URL.revokeObjectURL(blobUrl);
			}
			deps.setVideoSrc(null);
			throw error;
		}

		if (blobUrl) {
			return { blobUrl, uploadFailed: true };
		}
		throw error;
	}
}
