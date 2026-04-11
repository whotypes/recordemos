import { useState } from "react";
import { toast } from "sonner";
import { EXPORT_FPS, EXPORT_FPS_BITRATE_BASELINE } from "../export-dimensions";
import { useCompositionStore } from "../composition-store";
import type { CompiledBlock } from "../timeline-compiler";

interface ExportProgress {
	stage: "loading" | "processing" | "encoding" | "complete";
	progress: number;
	message: string;
}

interface ExportOptions {
	quality: "720" | "1080" | "4k";
	aspectRatio: string;
	videoSrc: string;
	fileName?: string;
	videoFormat?: string;
}

const bitrateForExportFps = (base: number) =>
	Math.round(base * (EXPORT_FPS / EXPORT_FPS_BITRATE_BASELINE));

const getQualitySettings = (quality: "720" | "1080" | "4k") => {
	switch (quality) {
		case "720":
			return {
				width: 1280,
				height: 720,
				bitrate: bitrateForExportFps(2_500_000),
			};
		case "1080":
			return {
				width: 1920,
				height: 1080,
				bitrate: bitrateForExportFps(5_000_000),
			};
		case "4k":
			return {
				width: 3840,
				height: 2160,
				bitrate: bitrateForExportFps(20_000_000),
			};
	}
};

const drawActiveVideo = (
	ctx: CanvasRenderingContext2D,
	video: HTMLVideoElement,
	w: number,
	h: number,
	active: CompiledBlock,
) => {
	const vw = video.videoWidth;
	const vh = video.videoHeight;
	if (!vw || !vh) return;

	const crop = active.cropRect;
	let sx = 0;
	let sy = 0;
	let sw = vw;
	let sh = vh;
	if (crop) {
		sx = (crop.x / 100) * vw;
		sy = (crop.y / 100) * vh;
		sw = Math.max(1, (crop.width / 100) * vw);
		sh = Math.max(1, (crop.height / 100) * vh);
	}

	// object-contain: fit entire source inside canvas, letterbox the rest
	const subAspect = sw / sh;
	const canvasAspect = w / h;
	let drawW: number;
	let drawH: number;
	let ox: number;
	let oy: number;
	if (subAspect > canvasAspect) {
		drawW = w;
		drawH = w / subAspect;
		ox = 0;
		oy = (h - drawH) / 2;
	} else {
		drawH = h;
		drawW = h * subAspect;
		ox = (w - drawW) / 2;
		oy = 0;
	}

	const bt = active.transforms;
	const originX = ox + drawW / 2;
	const originY = oy + drawH / 2;
	ctx.save();
	ctx.globalAlpha = bt.opacity;
	ctx.translate(originX, originY);
	ctx.scale(bt.scale, bt.scale);
	ctx.translate(bt.x, bt.y);
	ctx.rotate((bt.rotation * Math.PI) / 180);
	ctx.translate(-originX, -originY);
	ctx.drawImage(video, sx, sy, sw, sh, ox, oy, drawW, drawH);
	ctx.restore();
};

export const useVideoExportWebCodecs = () => {
	const [isExporting, setIsExporting] = useState(false);
	const [exportProgress, setExportProgress] = useState<ExportProgress>({
		stage: "loading",
		progress: 0,
		message: "Initializing...",
	});
	const { compiler } = useCompositionStore();

	const exportVideo = async (options: ExportOptions) => {
		if (!compiler) {
			toast.error("No timeline data available");
			return;
		}

		setIsExporting(true);

		try {
			const qualitySettings = getQualitySettings(options.quality);
			const totalDurationMs = compiler.getTotalDuration();

			if (totalDurationMs <= 0) {
				toast.error("Nothing to export (timeline is empty)");
				setIsExporting(false);
				return;
			}

			const hasVideoBlocks = compiler
				.getBlocks()
				.some((b) => b.blockType === "video");
			let mediaDurationSec = Number.POSITIVE_INFINITY;

			setExportProgress({
				stage: "loading",
				progress: 10,
				message: "Loading video file...",
			});

			let video: HTMLVideoElement | null = null;

			if (hasVideoBlocks) {
				const response = await fetch(options.videoSrc);
				const videoBlob = await response.blob();

				video = document.createElement("video");
				video.src = URL.createObjectURL(videoBlob);
				video.muted = true;
				video.playsInline = true;
				video.preload = "auto";

				await new Promise<void>((resolve, reject) => {
					video!.onloadedmetadata = () => {
						video!.currentTime = 0;
						resolve();
					};
					video!.onerror = reject;
				});

				mediaDurationSec =
					video.duration && !Number.isNaN(video.duration)
						? video.duration
						: Number.POSITIVE_INFINITY;
			}

			const canvas = document.createElement("canvas");
			canvas.width = qualitySettings.width;
			canvas.height = qualitySettings.height;
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (!ctx) {
				throw new Error("Failed to get canvas context");
			}

			setExportProgress({
				stage: "processing",
				progress: 20,
				message: "Setting up recording...",
			});

			const fps = EXPORT_FPS;
			const stream = canvas.captureStream(fps);

			let mimeType = "video/webm;codecs=vp9";
			if (MediaRecorder.isTypeSupported("video/mp4")) {
				mimeType = "video/mp4";
			} else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
				mimeType = "video/webm;codecs=vp9";
			} else if (MediaRecorder.isTypeSupported("video/webm")) {
				mimeType = "video/webm";
			}

			const mediaRecorder = new MediaRecorder(stream, {
				mimeType,
				videoBitsPerSecond: qualitySettings.bitrate,
			});

			const recordedChunks: BlobPart[] = [];
			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					recordedChunks.push(event.data);
				}
			};

			const totalFrames = Math.max(
				1,
				Math.ceil((totalDurationMs / 1000) * fps - 1e-9),
			);

			setExportProgress({
				stage: "encoding",
				progress: 30,
				message: "Processing video frames...",
			});

			const seekVideo = (el: HTMLVideoElement, seconds: number) =>
				new Promise<void>((resolve) => {
					el.currentTime = seconds;
					const onSeeked = () => {
						el.removeEventListener("seeked", onSeeked);
						resolve();
					};
					el.addEventListener("seeked", onSeeked);
				});

			const renderFrame = async (timelineMs: number) => {
				ctx.fillStyle = "#000000";
				ctx.fillRect(0, 0, canvas.width, canvas.height);

				const active = compiler.getActiveVideoBlock(timelineMs);
				if (active && video) {
					let tSec = active.inAssetTime / 1000;
					if (Number.isFinite(mediaDurationSec)) {
						tSec = Math.min(
							Math.max(0, tSec),
							Math.max(0, mediaDurationSec - 1e-3),
						);
					} else {
						tSec = Math.max(0, tSec);
					}
					await seekVideo(video, tSec);
					drawActiveVideo(
						ctx,
						video,
						qualitySettings.width,
						qualitySettings.height,
						active,
					);
				}
			};

			await renderFrame(0);
			mediaRecorder.start(100);

			const frameDelay = () =>
				new Promise<void>((r) => setTimeout(r, 1000 / fps));

			let processedFrames = 1;
			for (let i = 1; ; i++) {
				const timelineMs = (i / fps) * 1000;
				if (timelineMs >= totalDurationMs) {
					break;
				}
				await frameDelay();
				await renderFrame(timelineMs);
				processedFrames++;

				const progress = 30 + Math.round((processedFrames / totalFrames) * 60);
				setExportProgress({
					stage: "encoding",
					progress: Math.min(90, progress),
					message: `Processing frame ${processedFrames}/${totalFrames}...`,
				});
			}

			mediaRecorder.stop();

			await new Promise<void>((resolve) => {
				mediaRecorder.onstop = () => resolve();
			});

			if (video?.src.startsWith("blob:")) {
				URL.revokeObjectURL(video.src);
			}
			video?.remove();
			stream.getTracks().forEach((track) => track.stop());

			setExportProgress({
				stage: "complete",
				progress: 95,
				message: "Finalizing video...",
			});

			const blob = new Blob(recordedChunks, { type: mimeType });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			const extension = mimeType.includes("mp4") ? "mp4" : "webm";
			const fileName = options.fileName
				? options.fileName.replace(/\.[^/.]+$/, `.${extension}`)
				: `export-${options.quality}p-${Date.now()}.${extension}`;
			link.download = fileName;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			setExportProgress({
				stage: "complete",
				progress: 100,
				message: "Export complete!",
			});

			toast.success("Video exported successfully!");

			setTimeout(() => {
				setIsExporting(false);
			}, 1000);
		} catch (error) {
			console.error("Export failed:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			toast.error(`Export failed: ${errorMessage}`);
			setIsExporting(false);
		}
	};

	const cancelExport = () => {
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
