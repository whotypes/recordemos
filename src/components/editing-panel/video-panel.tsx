import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InlineEdit } from "@/components/ui/inline-edit";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useScreenRecorder } from "@/lib/hooks/use-screen-recorder";
import { useVideoUpload } from "@/lib/hooks/use-video-upload";
import { getSessionMode } from "@/lib/session-mode";
import { useVideoOptionsStore } from "@/lib/video-options-store";
import { useVideoPlayerStore } from "@/lib/video-player-store";
import { useAuth } from "@clerk/tanstack-react-start";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
	Loader2,
	Plus,
	RefreshCw,
	RotateCcw,
	Trash2,
	Video as VideoIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import VideoPlaybackControls from "./video-playback-controls";

interface VideoPanelProps {
	projectId?: string;
	onExport: () => void;
}

const panelActionClass = cn(
	buttonVariants({ variant: "outline", size: "sm" }),
	"h-9 w-full gap-1.5 text-xs font-normal",
);

export default function VideoPanel({ projectId, onExport }: VideoPanelProps) {
	const { isSignedIn } = useAuth();
	const {
		startScreenRecord,
		stopScreenRecord,
		isRecording,
		recordedVideo,
		clearRecordedVideo,
	} = useScreenRecorder();
	const { uploadVideoFile, projectVerification } = useVideoUpload(
		projectId as Id<"projects"> | undefined,
	);
	const ingestingRecordingRef = useRef(false);
	const [isIngestingRecording, setIsIngestingRecording] = useState(false);
	const videoSrc = useVideoPlayerStore((state) => state.videoSrc);
	const videoFileName = useVideoPlayerStore((state) => state.videoFileName);
	const videoFileSize = useVideoPlayerStore((state) => state.videoFileSize);
	const videoFileFormat = useVideoPlayerStore((state) => state.videoFileFormat);
	const cloudUploadEnabled = useVideoPlayerStore(
		(state) => state.cloudUploadEnabled,
	);
	const currentClipAssetId = useVideoPlayerStore(
		(state) => state.currentClipAssetId,
	);
	const setVideoFileName = useVideoPlayerStore(
		(state) => state.setVideoFileName,
	);
	const setVideoFileFormat = useVideoPlayerStore(
		(state) => state.setVideoFileFormat,
	);
	const setCurrentClipAssetId = useVideoPlayerStore(
		(state) => state.setCurrentClipAssetId,
	);
	const resetVideoPlayer = useVideoPlayerStore((state) => state.reset);
	const resetVideoOptions = useVideoOptionsStore((state) => state.reset);
	const resetTransforms = useVideoOptionsStore(
		(state) => state.resetTransforms,
	);
	const setBackgroundColor = useVideoOptionsStore(
		(state) => state.setBackgroundColor,
	);
	const setBackgroundType = useVideoOptionsStore(
		(state) => state.setBackgroundType,
	);
	const setGradientAngle = useVideoOptionsStore(
		(state) => state.setGradientAngle,
	);
	const uploadRef = useRef<HTMLInputElement>(null);
	const replaceRef = useRef<HTMLInputElement>(null);

	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const deleteAsset = useMutation(api.assets.deleteAsset);

	const sessionMode = getSessionMode({
		isSignedIn: !!isSignedIn,
		projectId,
		cloudUploadEnabled,
	});

	// auto-ingest recording through the same pipeline as file uploads
	useEffect(() => {
		if (!recordedVideo || ingestingRecordingRef.current) return;

		ingestingRecordingRef.current = true;
		setIsIngestingRecording(true);
		const { blob, fileName, durationMs } = recordedVideo;

		const ingestRecording = async () => {
			if (blob.size === 0) {
				toast.error("Recording failed — no video data was captured");
				return;
			}

			const file = new File([blob], fileName, { type: "video/webm" });
			const replacePreviousAssetId =
				sessionMode === "cloud-synced" && currentClipAssetId
					? currentClipAssetId
					: undefined;

			try {
				if (sessionMode !== "cloud-synced") {
					await uploadVideoFile(file, { recordedDurationMs: durationMs });
				} else {
					if (projectVerification && !projectVerification.valid) {
						toast.error(
							projectVerification.error || "Cannot upload to this project",
						);
						return;
					}

					await uploadVideoFile(file, {
						projectId: projectId as Id<"projects">,
						recordedDurationMs: durationMs,
						replacePreviousAssetId,
						onUploadComplete: (assetId) => {
							setCurrentClipAssetId(assetId);
						},
					});
				}
			} catch (error) {
				console.error("Recording ingest error:", error);
				toast.error("Failed to load recording");
			} finally {
				clearRecordedVideo();
				ingestingRecordingRef.current = false;
				setIsIngestingRecording(false);
			}
		};

		void ingestRecording();
	}, [
		recordedVideo,
		sessionMode,
		projectId,
		projectVerification,
		uploadVideoFile,
		setCurrentClipAssetId,
		clearRecordedVideo,
		currentClipAssetId,
	]);

	// cleanup on unmount to prevent memory leaks
	useEffect(() => {
		return () => {
			if (isRecording) {
				stopScreenRecord();
			}
		};
	}, [isRecording, stopScreenRecord]);

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("video/")) {
			toast.error("Please select a video file");
			return;
		}

		try {
			if (sessionMode !== "cloud-synced") {
				await uploadVideoFile(file);
			} else {
				if (projectVerification && !projectVerification.valid) {
					toast.error(
						projectVerification.error || "Cannot upload to this project",
					);
					e.target.value = "";
					return;
				}

				await uploadVideoFile(file, {
					projectId: projectId as Id<"projects">,
					onUploadComplete: (assetId) => {
						setCurrentClipAssetId(assetId);
					},
				});
			}
		} catch (error) {
			console.error("File upload error:", error);
			// error toasts are already shown by uploadVideoFile
		} finally {
			e.target.value = "";
		}
	};

	const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("video/")) {
			toast.error("Please select a video file");
			return;
		}

		const replacePreviousAssetId =
			sessionMode === "cloud-synced" && currentClipAssetId
				? currentClipAssetId
				: undefined;

		try {
			if (sessionMode !== "cloud-synced") {
				await uploadVideoFile(file);
			} else {
				if (projectVerification && !projectVerification.valid) {
					toast.error(
						projectVerification.error || "Cannot upload to this project",
					);
					e.target.value = "";
					return;
				}

				await uploadVideoFile(file, {
					projectId: projectId as Id<"projects">,
					replacePreviousAssetId,
					onUploadComplete: (assetId) => {
						setCurrentClipAssetId(assetId);
					},
				});
			}
		} catch (error) {
			console.error("Replace video error:", error);
		} finally {
			e.target.value = "";
		}
	};

	const handleReset = () => {
		if (isRecording) {
			stopScreenRecord();
		}

		const currentSrc = useVideoPlayerStore.getState().videoSrc;
		if (currentSrc && currentSrc.startsWith("blob:")) {
			URL.revokeObjectURL(currentSrc);
		}

		clearRecordedVideo();
		resetVideoPlayer();
		resetVideoOptions();
		resetTransforms();
		setBackgroundColor("#1a1a1a");
		setBackgroundType("gradient");
		setGradientAngle(170);
		// Timeline blocks cleared automatically when video deleted
	};

	const handleDeleteVideo = async () => {
		if (!currentClipAssetId) {
			toast.error("No video to delete");
			return;
		}

		try {
			setIsDeleting(true);

			await deleteAsset({ assetId: currentClipAssetId });

			// clean up local state
			const currentSrc = useVideoPlayerStore.getState().videoSrc;
			if (currentSrc && currentSrc.startsWith("blob:")) {
				URL.revokeObjectURL(currentSrc);
			}

			clearRecordedVideo();
			resetVideoPlayer();
			resetVideoOptions();
			resetTransforms();
			setBackgroundColor("#1a1a1a");
			setBackgroundType("gradient");
			setGradientAngle(170);
			// Timeline blocks cleared automatically when video deleted

			toast.success("Video deleted successfully");
			setShowDeleteDialog(false);
		} catch (error) {
			console.error("Delete error:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to delete video",
			);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<div className="w-full min-w-0 space-y-5">
			<TooltipProvider>
				<div className="grid min-w-0 grid-cols-2 gap-2">
					{isIngestingRecording && (
						<div className="col-span-2 flex h-9 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5">
							<Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
							<p className="text-muted-foreground text-xs">
								Processing recording…
							</p>
						</div>
					)}

					{!videoSrc && !isRecording && !isIngestingRecording && (
						<>
							<Tooltip>
								<TooltipTrigger asChild>
									<label
										htmlFor="video-upload"
										className={panelActionClass}
										tabIndex={0}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												uploadRef.current?.click();
											}
										}}
									>
										<Plus className="size-3.5 shrink-0 text-primary" />
										Upload
									</label>
								</TooltipTrigger>
								<TooltipContent side="top">
									Select a video file to upload
								</TooltipContent>
							</Tooltip>
							<input
								id="video-upload"
								ref={uploadRef}
								name="video-upload"
								type="file"
								onChange={handleFileUpload}
								accept="video/*"
								className="sr-only"
								tabIndex={-1}
							/>

							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										className={panelActionClass}
										onClick={startScreenRecord}
									>
										<VideoIcon className="size-3.5 shrink-0 text-primary" />
										Record
									</button>
								</TooltipTrigger>
								<TooltipContent side="top">
									Start screen recording
								</TooltipContent>
							</Tooltip>
						</>
					)}

					{isRecording && (
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									className={cn(
										panelActionClass,
										"col-span-2 border-destructive/40 text-destructive hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive",
									)}
									onClick={stopScreenRecord}
								>
									<span className="relative flex size-2 shrink-0">
										<span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
										<span className="relative inline-flex size-2 rounded-full bg-red-500" />
									</span>
									Stop recording
								</button>
							</TooltipTrigger>
							<TooltipContent side="top">Stop recording</TooltipContent>
						</Tooltip>
					)}

					{videoSrc && !isRecording && (
						<>
							<Tooltip>
								<TooltipTrigger asChild>
									<label
										htmlFor="video-replace-upload"
										className={cn(panelActionClass, "col-span-2")}
										tabIndex={0}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												replaceRef.current?.click();
											}
										}}
									>
										<RefreshCw className="size-3.5 shrink-0 text-primary" />
										Replace video
									</label>
								</TooltipTrigger>
								<TooltipContent side="top">
									Choose a different video file
								</TooltipContent>
							</Tooltip>
							<input
								id="video-replace-upload"
								ref={replaceRef}
								name="video-replace-upload"
								type="file"
								onChange={handleReplaceFile}
								accept="video/*"
								className="sr-only"
								tabIndex={-1}
							/>

							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										className={panelActionClass}
										onClick={onExport}
									>
										<VideoIcon className="size-3.5 shrink-0 text-primary" />
										Export
									</button>
								</TooltipTrigger>
								<TooltipContent side="top">Export your video</TooltipContent>
							</Tooltip>

							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										className={panelActionClass}
										onClick={handleReset}
									>
										<RotateCcw className="size-3.5 shrink-0 text-primary" />
										Reset
									</button>
								</TooltipTrigger>
								<TooltipContent side="top">
									Reset all video state and return to upload screen
								</TooltipContent>
							</Tooltip>

							{currentClipAssetId && projectId && (
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											className={cn(
												panelActionClass,
												"col-span-2 border-destructive/40 text-destructive hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive",
											)}
											onClick={() => setShowDeleteDialog(true)}
										>
											<Trash2 className="size-3.5 shrink-0" />
											Delete
										</button>
									</TooltipTrigger>
									<TooltipContent side="top">
										Permanently delete video from project
									</TooltipContent>
								</Tooltip>
							)}
						</>
					)}
				</div>
			</TooltipProvider>

			<VideoPlaybackControls />

			{videoSrc && !isRecording && (
				<div className="min-w-0 space-y-3">
					<div className="min-w-0 space-y-2">
						<label className="text-xs font-medium text-muted-foreground">
							File Name
						</label>
						<InlineEdit
							value={videoFileName || ""}
							placeholder="No file name"
							onSave={(value) => {
								setVideoFileName(value || null);
							}}
							className="max-w-full"
						/>
					</div>

					<div className="space-y-2">
						<label className="text-xs font-medium text-muted-foreground">
							File Size
						</label>
						<div className="min-h-9 px-3 py-1 text-sm text-foreground flex items-center">
							{videoFileSize
								? `${(videoFileSize / (1024 * 1024)).toFixed(2)} MB`
								: "No file size"}
						</div>
					</div>

					<div className="space-y-2">
						<label className="text-xs font-medium text-muted-foreground">
							Format
						</label>
						<Select
							value={videoFileFormat || ""}
							onValueChange={(value) => {
								setVideoFileFormat(value || null);
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="No format" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="mp4">MP4</SelectItem>
								<SelectItem value="webm">WebM</SelectItem>
								<SelectItem value="mov">MOV</SelectItem>
								<SelectItem value="avi">AVI</SelectItem>
								<SelectItem value="mkv">MKV</SelectItem>
								<SelectItem value="m4v">M4V</SelectItem>
								<SelectItem value="flv">FLV</SelectItem>
								<SelectItem value="wmv">WMV</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			)}

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Video</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div>
								Are you sure you want to permanently delete this video? This
								action cannot be undone and will remove:
								<ul className="list-disc list-inside mt-2 space-y-1">
									<li>The video file from cloud storage</li>
									<li>All timeline blocks and edits</li>
									<li>All project data associated with this video</li>
								</ul>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteVideo}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Deleting...
								</>
							) : (
								"Delete"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
