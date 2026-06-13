import { useRef, useState } from "react";
import { toast } from "sonner";
import {
	downloadExportBlob,
	exportTimeline,
	type ExportProgress,
} from "../export-timeline";
import { terminateFFmpeg } from "../ffmpeg-loader";
import { useCompositionStore } from "../composition-store";
import { useVideoOptionsStore } from "../video-options-store";

export type { ExportProgress };

interface ExportOptions {
	aspectRatio: string;
	videoSrc: string;
	/** Suggested download name (extension is normalized to .mp4). */
	fileName?: string;
	videoFormat?: string;
	/** Original uploaded filename for container sniffing (e.g. clip.mov). */
	sourceFileName?: string;
}

export const useVideoExportComposed = () => {
	const [isExporting, setIsExporting] = useState(false);
	const [exportProgress, setExportProgress] = useState<ExportProgress>({
		stage: "loading",
		progress: 0,
		message: "Initializing...",
	});
	const abortControllerRef = useRef<AbortController | null>(null);
	const cleanupRef = useRef<(() => void) | null>(null);
	const { compiler } = useCompositionStore();

	const exportVideo = async (options: ExportOptions) => {
		if (!compiler) {
			toast.error("No timeline data available");
			return;
		}

		const vs = useVideoOptionsStore.getState();
		abortControllerRef.current?.abort();
		const ac = new AbortController();
		abortControllerRef.current = ac;
		const signal = ac.signal;

		setIsExporting(true);

		try {
			const hasVideoBlocks = compiler
				.getBlocks()
				.some((b) => b.blockType === "video");

			let videoBlob: Blob | null = null;
			if (hasVideoBlocks) {
				const videoResponse = await fetch(options.videoSrc, { signal });
				videoBlob = await videoResponse.blob();
			}

			const blob = await exportTimeline({
				compiler,
				videoBlob,
				options: {
					aspectRatio: options.aspectRatio,
					videoSrc: options.videoSrc,
					fileName: options.fileName,
					videoFormat: options.videoFormat,
					sourceFileName: options.sourceFileName,
					visual: {
						backgroundColor: vs.backgroundColor,
						backgroundType: vs.backgroundType,
						imageBackground: vs.imageBackground,
						gradientAngle: vs.gradientAngle,
						scale: vs.scale,
						translateX: vs.translateX,
						translateY: vs.translateY,
						rotateZ: vs.rotateZ,
						zoomLevel: vs.zoomLevel,
					},
				},
				onProgress: setExportProgress,
				signal,
				registerCleanup: (fn) => {
					cleanupRef.current = fn;
				},
			});

			downloadExportBlob(blob, options.fileName);

			setExportProgress({
				stage: "complete",
				progress: 100,
				message: "Export complete!",
			});

			abortControllerRef.current = null;
			cleanupRef.current = null;
			toast.success("Video exported successfully!");

			setTimeout(() => {
				setIsExporting(false);
			}, 1000);
		} catch (error) {
			const isAbort =
				signal.aborted ||
				(error instanceof DOMException && error.name === "AbortError");

			if (!isAbort) {
				console.error("Export failed:", error);
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				toast.error(`Export failed: ${errorMessage}`);
			}

			cleanupRef.current?.();
			cleanupRef.current = null;
			abortControllerRef.current = null;
			setIsExporting(false);
		}
	};

	const cancelExport = () => {
		abortControllerRef.current?.abort();
		cleanupRef.current?.();
		cleanupRef.current = null;
		terminateFFmpeg();
		setIsExporting(false);
		toast.info("Export cancelled");
	};

	return {
		exportVideo,
		cancelExport,
		isExporting,
		exportProgress,
	};
};
