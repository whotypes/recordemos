import {
	Combinator,
	fastConcatMP4,
	fixFMP4Duration,
	MP4Clip,
	OffscreenSprite,
} from "@webav/av-cliper";
import { useRef, useState, type MutableRefObject } from "react";
import { toast } from "sonner";
import {
	encodeCanvasTimelineToMp4,
	pickH264EncoderConfig,
} from "../export-canvas-webcodecs-mp4";
import { exportDimensionsForAspect, EXPORT_FPS } from "../export-dimensions";
import { isWebAvExportEnvironmentSupported } from "../export-webav-support";
import { isMp4LikeBlob } from "../export-is-mp4-like";
import { fillExportBackground } from "../export-draw-background";
import { drawExportVideoInPlane } from "../export-draw-video";
import {
	readExportPreviewLayout,
	type CompositionPlane,
} from "../export-preview-layout";
import { useCompositionStore } from "../composition-store";
import type { CompiledBlock, TimelineCompiler } from "../timeline-compiler";
import { useVideoOptionsStore } from "../video-options-store";

interface ExportProgress {
	stage: "loading" | "processing" | "encoding" | "muxing" | "complete";
	progress: number;
	message: string;
}

interface ExportOptions {
	aspectRatio: string;
	videoSrc: string;
	/** Suggested download name (may end in .webm while the source is still .mov). */
	fileName?: string;
	videoFormat?: string;
	/** Original uploaded filename for container sniffing (e.g. clip.mov). */
	sourceFileName?: string;
}

function canUseWebAvFastPath(compiler: TimelineCompiler): boolean {
	const videos = compiler.getBlocks().filter((b) => b.blockType === "video");
	if (videos.length !== 1) return false;
	const v = videos[0]!;
	const total = compiler.getTotalDuration();
	if (total <= 0) return false;
	if (v.startMs !== 0 || Math.abs(v.startMs + v.durationMs - total) > 1)
		return false;
	if (v.metadata?.cropX !== undefined) return false;
	const d = v.transforms;
	return (
		d.scale === 1 &&
		d.x === 0 &&
		d.y === 0 &&
		d.opacity === 1 &&
		d.rotation === 0
	);
}

function webAvSingleAssetSegment(compiler: TimelineCompiler): {
	start: number;
	end: number;
} {
	const v = compiler.getBlocks().find((b) => b.blockType === "video")!;
	const t0 = (v.trimStartMs || 0) / 1000;
	const t1 = t0 + v.durationMs / 1000;
	return { start: t0, end: t1 };
}

function pickWebMRecorderMimeType(): string {
	const candidates = [
		"video/webm;codecs=vp9",
		"video/webm;codecs=vp8",
		"video/webm",
	] as const;
	for (const c of candidates) {
		if (MediaRecorder.isTypeSupported(c)) {
			return c;
		}
	}
	return "video/webm";
}

/**
 * Ensures `drawImage(video, …)` has a decoded frame at the current time.
 * After `loadedmetadata` + `currentTime = 0`, many browsers still skip `seeked` when
 * the time is unchanged, so the first export frame can paint black unless we wait here.
 */
function waitForVideoPaintReady(
	el: HTMLVideoElement,
	signal: AbortSignal,
	abortedRef: MutableRefObject<boolean>,
): Promise<void> {
	if (signal.aborted || abortedRef.current) {
		return Promise.reject(new DOMException("Aborted", "AbortError"));
	}
	if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
		return Promise.resolve();
	}
	if (typeof el.requestVideoFrameCallback === "function") {
		return new Promise((resolve, reject) => {
			if (signal.aborted || abortedRef.current) {
				reject(new DOMException("Aborted", "AbortError"));
				return;
			}
			const onErr = () => {
				el.removeEventListener("error", onErr);
				reject(new Error("Video error while waiting for frame"));
			};
			el.addEventListener("error", onErr, { once: true });
			const onAbort = () => {
				try {
					el.cancelVideoFrameCallback(handle);
				} catch {
					/* ignore */
				}
				el.removeEventListener("error", onErr);
				reject(new DOMException("Aborted", "AbortError"));
			};
			signal.addEventListener("abort", onAbort, { once: true });
			const handle = el.requestVideoFrameCallback(() => {
				el.removeEventListener("error", onErr);
				signal.removeEventListener("abort", onAbort);
				if (signal.aborted || abortedRef.current) {
					reject(new DOMException("Aborted", "AbortError"));
					return;
				}
				resolve();
			});
		});
	}
	return new Promise((resolve, reject) => {
		if (signal.aborted || abortedRef.current) {
			reject(new DOMException("Aborted", "AbortError"));
			return;
		}
		const timeoutId = window.setTimeout(() => {
			cleanup();
			reject(new Error("Video decode timed out"));
		}, 15_000);
		const cleanup = () => {
			window.clearTimeout(timeoutId);
			signal.removeEventListener("abort", onAbort);
			el.removeEventListener("loadeddata", onData);
			el.removeEventListener("error", onErr);
		};
		const onAbort = () => {
			cleanup();
			reject(new DOMException("Aborted", "AbortError"));
		};
		const onData = () => {
			cleanup();
			resolve();
		};
		const onErr = () => {
			cleanup();
			reject(new Error("Video error"));
		};
		signal.addEventListener("abort", onAbort, { once: true });
		el.addEventListener("loadeddata", onData, { once: true });
		el.addEventListener("error", onErr, { once: true });
	});
}

export const useVideoExportComposed = () => {
	const [isExporting, setIsExporting] = useState(false);
	const [exportProgress, setExportProgress] = useState<ExportProgress>({
		stage: "loading",
		progress: 0,
		message: "Initializing...",
	});
	const abortControllerRef = useRef<AbortController | null>(null);
	const abortedRef = useRef(false);
	const mediaCaptureRef = useRef<{
		mediaRecorder: MediaRecorder | null;
		stream: MediaStream | null;
	}>({ mediaRecorder: null, stream: null });
	const webAvDestroyRef = useRef<(() => void) | null>(null);
	const { compiler } = useCompositionStore();

	const exportVideo = async (options: ExportOptions) => {
		if (!compiler) {
			toast.error("No timeline data available");
			return;
		}

		const vs = useVideoOptionsStore.getState();
		const {
			backgroundColor,
			backgroundType,
			imageBackground,
			gradientAngle,
			scale,
			translateX,
			translateY,
			rotateZ,
			zoomLevel,
		} = vs;

		abortedRef.current = false;
		abortControllerRef.current?.abort();
		const ac = new AbortController();
		abortControllerRef.current = ac;
		const signal = ac.signal;

		setIsExporting(true);

		try {
			const qualitySettings = exportDimensionsForAspect(options.aspectRatio);
			const totalDurationMs = compiler.getTotalDuration();
			if (totalDurationMs <= 0) {
				toast.error("Nothing to export (timeline is empty)");
				abortControllerRef.current = null;
				setIsExporting(false);
				return;
			}

			const hasVideoBlocks = compiler
				.getBlocks()
				.some((b) => b.blockType === "video");

			const backgroundParams = {
				backgroundType,
				backgroundColor,
				gradientAngleDeg: gradientAngle,
			} as const;
			const transform = { scale, translateX, translateY, rotateZ };
			const { plane: compositionPlane, skipGlobalMotion } =
				readExportPreviewLayout(
					qualitySettings.width,
					qualitySettings.height,
					options.aspectRatio,
					zoomLevel,
				);

			const paintVideoLayer = (
				ctx: CanvasRenderingContext2D,
				video: HTMLVideoElement,
				_cw: number,
				_ch: number,
				active: CompiledBlock | null,
			) => {
				drawExportVideoInPlane(
					ctx,
					video,
					compositionPlane,
					active,
					transform,
					skipGlobalMotion,
				);
			};

			setExportProgress({
				stage: "loading",
				progress: 10,
				message: "Loading video file...",
			});

			let videoBlob: Blob | null = null;
			if (hasVideoBlocks) {
				const videoResponse = await fetch(options.videoSrc, { signal });
				videoBlob = await videoResponse.blob();
			}

			let backgroundImage: HTMLImageElement | null = null;
			if (backgroundType === "image" && imageBackground) {
				backgroundImage = new Image();
				backgroundImage.crossOrigin = "anonymous";
				await new Promise<void>((resolve, reject) => {
					backgroundImage!.onload = () => resolve();
					backgroundImage!.onerror = reject;
					backgroundImage!.src = imageBackground;
				});
			}

			const webCodecsAvailable =
				typeof VideoDecoder !== "undefined" &&
				typeof VideoEncoder !== "undefined" &&
				typeof VideoFrame !== "undefined";

			const tryWebAv =
				Boolean(videoBlob) &&
				canUseWebAvFastPath(compiler) &&
				webCodecsAvailable &&
				isMp4LikeBlob(videoBlob, options.videoFormat, options.sourceFileName) &&
				(await isWebAvExportEnvironmentSupported());

			const webAvSegments = tryWebAv ? [webAvSingleAssetSegment(compiler)] : [];

			if (tryWebAv) {
				try {
					await exportWithWebAv({
						compiler,
						options,
						qualitySettings,
						segments: webAvSegments,
						backgroundImage,
						backgroundParams,
						compositionPlane,
						skipGlobalMotion,
						transform,
						setExportProgress,
						signal,
						abortedRef,
						setSegmentDestroy: (fn) => {
							webAvDestroyRef.current = fn;
						},
					});
					webAvDestroyRef.current = null;
					abortControllerRef.current = null;
					toast.success("Video exported successfully with all effects!");
					setTimeout(() => setIsExporting(false), 1000);
					return;
				} catch (webAvErr) {
					webAvDestroyRef.current = null;
					if (
						webAvErr instanceof DOMException &&
						webAvErr.name === "AbortError"
					) {
						throw webAvErr;
					}
					if (signal.aborted || abortedRef.current) {
						throw new DOMException("Aborted", "AbortError");
					}
					console.warn(
						"[export] WebAV encode failed, falling back to MediaRecorder + seek",
						webAvErr,
					);
				}
			}

			await exportWithMediaRecorderSeek({
				compiler,
				options,
				qualitySettings,
				videoBlob,
				backgroundImage,
				backgroundParams,
				paintVideoLayer,
				setExportProgress,
				signal,
				abortedRef,
				mediaCaptureRef,
			});

			abortControllerRef.current = null;
			toast.success("Video exported successfully with all effects!");

			setTimeout(() => {
				setIsExporting(false);
			}, 1000);
		} catch (error) {
			const isAbort =
				signal.aborted ||
				abortedRef.current ||
				(error instanceof DOMException && error.name === "AbortError");

			if (!isAbort) {
				console.error("Export failed:", error);
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				toast.error(`Export failed: ${errorMessage}`);
			}

			webAvDestroyRef.current?.();
			webAvDestroyRef.current = null;
			const { mediaRecorder: mr, stream: s } = mediaCaptureRef.current;
			if (mr && mr.state !== "inactive") {
				try {
					mr.stop();
				} catch {
					/* ignore */
				}
			}
			s?.getTracks().forEach((t) => t.stop());
			mediaCaptureRef.current = { mediaRecorder: null, stream: null };
			abortControllerRef.current = null;
			setIsExporting(false);
		}
	};

	const cancelExport = () => {
		abortedRef.current = true;
		abortControllerRef.current?.abort();
		webAvDestroyRef.current?.();
		webAvDestroyRef.current = null;
		const { mediaRecorder, stream } = mediaCaptureRef.current;
		if (mediaRecorder && mediaRecorder.state !== "inactive") {
			try {
				mediaRecorder.stop();
			} catch {
				/* ignore */
			}
		}
		for (const t of stream?.getTracks() ?? []) {
			t.stop();
		}
		mediaCaptureRef.current = { mediaRecorder: null, stream: null };
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

async function exportWithWebAv(params: {
	compiler: TimelineCompiler;
	options: ExportOptions;
	qualitySettings: { width: number; height: number; bitrate: number };
	segments: Array<{ start: number; end: number }>;
	backgroundImage: HTMLImageElement | null;
	backgroundParams: {
		backgroundType: "solid" | "gradient" | "mesh" | "image";
		backgroundColor: string;
		gradientAngleDeg: number;
	};
	compositionPlane: CompositionPlane;
	skipGlobalMotion: boolean;
	transform: {
		scale: number;
		translateX: number;
		translateY: number;
		rotateZ: number;
	};
	setExportProgress: (p: ExportProgress) => void;
	signal: AbortSignal;
	abortedRef: MutableRefObject<boolean>;
	setSegmentDestroy: (fn: (() => void) | null) => void;
}) {
	const {
		compiler,
		options,
		qualitySettings,
		segments,
		backgroundImage,
		backgroundParams,
		compositionPlane,
		skipGlobalMotion,
		transform,
		setExportProgress,
		signal,
		abortedRef,
		setSegmentDestroy,
	} = params;
	const { width: ow, height: oh, bitrate } = qualitySettings;

	setExportProgress({
		stage: "processing",
		progress: 22,
		message: "Encoding with WebCodecs (WebAV)...",
	});

	const work = new OffscreenCanvas(ow, oh);
	const wctx = work.getContext("2d", { willReadFrequently: false });
	if (!wctx) {
		throw new Error("Failed to get OffscreenCanvas context for WebAV");
	}

	const bgLayer = new OffscreenCanvas(ow, oh);
	const bgCtx = bgLayer.getContext("2d", { willReadFrequently: false });
	if (!bgCtx) {
		throw new Error("Failed to get background canvas context for WebAV");
	}
	await fillExportBackground(bgCtx, ow, oh, {
		...backgroundParams,
		imageElement: backgroundImage,
	});

	const segmentBuffers: Uint8Array[] = [];

	for (let i = 0; i < segments.length; i++) {
		if (signal.aborted || abortedRef.current) {
			setSegmentDestroy(null);
			throw new DOMException("Aborted", "AbortError");
		}

		setSegmentDestroy(null);

		const segment = segments[i];
		const res = await fetch(options.videoSrc, { signal });
		const body = res.body;
		if (!body) {
			throw new Error("No response body for video");
		}

		let com: Combinator | null = null;
		let sprite: OffscreenSprite | null = null;
		let clip: MP4Clip | null = null;

		const bindDestroy = () => {
			setSegmentDestroy(() => {
				try {
					com?.destroy();
				} catch {
					/* ignore */
				}
				try {
					sprite?.destroy();
				} catch {
					/* ignore */
				}
				try {
					clip?.destroy();
				} catch {
					/* ignore */
				}
			});
		};

		clip = new MP4Clip(body);
		bindDestroy();

		await clip.ready;

		if (signal.aborted || abortedRef.current) {
			clip.destroy();
			setSegmentDestroy(null);
			throw new DOMException("Aborted", "AbortError");
		}

		clip.tickInterceptor = async (_time, tickRet) => {
			if (tickRet.state === "done") {
				return tickRet;
			}
			const vf = tickRet.video;
			if (!vf) {
				return tickRet;
			}
			const ts = vf.timestamp;
			const dur = vf.duration;

			wctx.clearRect(0, 0, ow, oh);
			wctx.drawImage(bgLayer, 0, 0);

			const vw = vf.displayWidth;
			const vh = vf.displayHeight;
			if (vw > 0 && vh > 0) {
				const timelineMs = ts / 1000;
				const active = compiler.getActiveVideoBlock(timelineMs);
				drawExportVideoInPlane(
					wctx,
					vf,
					compositionPlane,
					active,
					transform,
					skipGlobalMotion,
				);
			}

			vf.close();
			const nextFrame = new VideoFrame(work, {
				timestamp: ts,
				...(dur != null ? { duration: dur } : {}),
			});
			return { ...tickRet, video: nextFrame };
		};

		sprite = new OffscreenSprite(clip);
		sprite.time = {
			offset: Math.round(segment.start * 1e6),
			duration: Math.round((segment.end - segment.start) * 1e6),
		};
		bindDestroy();

		com = new Combinator({
			width: ow,
			height: oh,
			bitrate,
			fps: EXPORT_FPS,
		});
		bindDestroy();

		const segCount = segments.length;
		com.on("OutputProgress", (p: number) => {
			const base = 30 + (i / segCount) * 55;
			const local = (p / segCount) * 55;
			setExportProgress({
				stage: "encoding",
				progress: Math.min(88, Math.round(base + local)),
				message: `Encoding segment ${i + 1}/${segCount}…`,
			});
		});

		await com.addSprite(sprite, { main: true });
		const out = com.output();
		bindDestroy();
		const segmentBuf = new Uint8Array(await new Response(out).arrayBuffer());

		setSegmentDestroy(null);
		com.destroy();
		sprite.destroy();
		clip.destroy();
		com = null;
		sprite = null;
		clip = null;

		segmentBuffers.push(segmentBuf);
	}

	setExportProgress({
		stage: "muxing",
		progress: 90,
		message: "Muxing MP4…",
	});

	const concatStreams = segmentBuffers.map(
		(buf) =>
			new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(buf);
					controller.close();
				},
			}),
	);

	const merged =
		concatStreams.length === 1
			? concatStreams[0]
			: await fastConcatMP4(concatStreams);

	const fixed = await fixFMP4Duration(merged);
	const blob = await new Response(fixed).blob();
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	const extension = "mp4";
	const fileName = options.fileName
		? options.fileName.replace(/\.[^/.]+$/, `.${extension}`)
		: `export-4k-${Date.now()}.${extension}`;
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
}

async function exportWithMediaRecorderSeek(params: {
	compiler: TimelineCompiler;
	options: ExportOptions;
	qualitySettings: { width: number; height: number; bitrate: number };
	videoBlob: Blob | null;
	backgroundImage: HTMLImageElement | null;
	backgroundParams: {
		backgroundType: "solid" | "gradient" | "mesh" | "image";
		backgroundColor: string;
		gradientAngleDeg: number;
	};
	paintVideoLayer: (
		ctx: CanvasRenderingContext2D,
		video: HTMLVideoElement,
		canvasWidth: number,
		canvasHeight: number,
		active: CompiledBlock | null,
	) => void;
	setExportProgress: (p: ExportProgress) => void;
	signal: AbortSignal;
	abortedRef: MutableRefObject<boolean>;
	mediaCaptureRef: MutableRefObject<{
		mediaRecorder: MediaRecorder | null;
		stream: MediaStream | null;
	}>;
}) {
	const {
		compiler,
		options,
		qualitySettings,
		videoBlob,
		backgroundImage,
		backgroundParams,
		paintVideoLayer,
		setExportProgress,
		signal,
		abortedRef,
		mediaCaptureRef,
	} = params;

	const totalDurationMs = compiler.getTotalDuration();

	let video: HTMLVideoElement | null = null;
	let mediaDurationSec = Number.POSITIVE_INFINITY;

	if (videoBlob) {
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
	const ctx = canvas.getContext("2d", { willReadFrequently: false });
	if (!ctx) {
		throw new Error("Failed to get canvas context");
	}

	const bgCache = document.createElement("canvas");
	bgCache.width = qualitySettings.width;
	bgCache.height = qualitySettings.height;
	const bgCtx = bgCache.getContext("2d", { willReadFrequently: false });
	if (!bgCtx) {
		throw new Error("Failed to get background canvas context");
	}
	await fillExportBackground(bgCtx, bgCache.width, bgCache.height, {
		...backgroundParams,
		imageElement: backgroundImage,
	});

	setExportProgress({
		stage: "processing",
		progress: 20,
		message: "Preparing export…",
	});

	const fps = EXPORT_FPS;
	const totalFrames = Math.max(
		1,
		Math.ceil((totalDurationMs / 1000) * fps - 1e-9),
	);

	const renderTimelineFrame = async (timelineMs: number) => {
		if (signal.aborted || abortedRef.current) {
			throw new DOMException("Aborted", "AbortError");
		}

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
			const el = video;
			if (Math.abs(el.currentTime - tSec) > 0.001) {
				el.currentTime = tSec;
				await new Promise<void>((resolve, reject) => {
					if (signal.aborted || abortedRef.current) {
						reject(new DOMException("Aborted", "AbortError"));
						return;
					}
					const timeoutId = window.setTimeout(() => {
						el.removeEventListener("seeked", onSeeked);
						reject(new Error("Video seek timed out"));
					}, 15_000);
					const onSeeked = () => {
						window.clearTimeout(timeoutId);
						el.removeEventListener("seeked", onSeeked);
						resolve();
					};
					el.addEventListener("seeked", onSeeked, { once: true });
				});
			}
			await waitForVideoPaintReady(el, signal, abortedRef);
		}

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(bgCache, 0, 0);
		if (video) {
			paintVideoLayer(ctx, video, canvas.width, canvas.height, active);
		}
	};

	const disposeSourceVideo = () => {
		if (video?.src.startsWith("blob:")) {
			URL.revokeObjectURL(video.src);
		}
		video?.remove();
	};

	if (signal.aborted || abortedRef.current) {
		disposeSourceVideo();
		throw new DOMException("Aborted", "AbortError");
	}

	const h264Config = await pickH264EncoderConfig(
		qualitySettings.width,
		qualitySettings.height,
		qualitySettings.bitrate,
	);

	if (h264Config) {
		try {
			setExportProgress({
				stage: "encoding",
				progress: 28,
				message: "Encoding video (WebCodecs MP4)…",
			});

			const mp4Buffer = await encodeCanvasTimelineToMp4({
				canvas,
				fps,
				totalDurationMs,
				encoderConfig: h264Config,
				renderFrame: renderTimelineFrame,
				signal,
				onProgress: (done, total) => {
					const progress = 28 + Math.round((done / total) * 62);
					setExportProgress({
						stage: "encoding",
						progress: Math.min(92, progress),
						message: `Encoding frame ${done}/${total}…`,
					});
				},
			});

			if (signal.aborted || abortedRef.current) {
				throw new DOMException("Aborted", "AbortError");
			}

			setExportProgress({
				stage: "muxing",
				progress: 95,
				message: "Finalizing MP4…",
			});

			const blob = new Blob([mp4Buffer], { type: "video/mp4" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			const extension = "mp4";
			const fileName = options.fileName
				? options.fileName.replace(/\.[^/.]+$/, `.${extension}`)
				: `export-4k-${Date.now()}.${extension}`;
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
		} finally {
			disposeSourceVideo();
		}
		return;
	}

	// MediaRecorder fallback: capture timestamps follow wall-clock time, so duration can
	// stretch when per-frame seeks are slower than 1/fps (e.g. long clips at 60fps).
	setExportProgress({
		stage: "processing",
		progress: 20,
		message: "Setting up recording (MediaRecorder fallback)…",
	});

	const probe = canvas.captureStream(0);
	const [probeTrack] = probe.getVideoTracks();
	const canRequestFrame =
		typeof (probeTrack as MediaStreamTrack & { requestFrame?: () => void })
			.requestFrame === "function";
	probe.getTracks().forEach((tr) => tr.stop());

	const stream = canRequestFrame
		? canvas.captureStream(0)
		: canvas.captureStream(fps);
	const [videoTrack] = stream.getVideoTracks();
	const useManualFramePacing = canRequestFrame;

	const mimeType = pickWebMRecorderMimeType();

	const mediaRecorder = new MediaRecorder(stream, {
		mimeType,
		videoBitsPerSecond: qualitySettings.bitrate,
	});

	mediaCaptureRef.current = { mediaRecorder, stream };

	const recordedChunks: BlobPart[] = [];
	mediaRecorder.ondataavailable = (event) => {
		if (event.data.size > 0) {
			recordedChunks.push(event.data);
		}
	};

	setExportProgress({
		stage: "encoding",
		progress: 30,
		message: "Rendering frames…",
	});

	const renderFrameForRecorder = async (timelineMs: number) => {
		await renderTimelineFrame(timelineMs);
		const vt = videoTrack as MediaStreamTrack & { requestFrame?: () => void };
		if (useManualFramePacing) {
			vt.requestFrame?.();
		}
	};

	if (signal.aborted || abortedRef.current) {
		for (const track of stream.getTracks()) {
			track.stop();
		}
		disposeSourceVideo();
		mediaCaptureRef.current = { mediaRecorder: null, stream: null };
		throw new DOMException("Aborted", "AbortError");
	}

	/** Frames rendered before `MediaRecorder.start()` are not encoded — record from t=0 after start. */
	mediaRecorder.start(100);

	const framePeriodMs = 1000 / fps;

	const delayMs = (ms: number) =>
		new Promise<void>((resolve) => {
			if (ms <= 0) {
				resolve();
				return;
			}
			const id = window.setTimeout(resolve, ms);
			const onAbort = () => {
				window.clearTimeout(id);
				resolve();
			};
			signal.addEventListener("abort", onAbort, { once: true });
		});

	let processedFrames = 0;
	let exportCancelled = false;

	for (let i = 0; ; i++) {
		const timelineMs = (i / fps) * 1000;
		if (timelineMs >= totalDurationMs) {
			break;
		}
		if (signal.aborted || abortedRef.current) {
			exportCancelled = true;
			break;
		}

		const sliceStart = performance.now();
		await renderFrameForRecorder(timelineMs);
		if (!useManualFramePacing) {
			const elapsed = performance.now() - sliceStart;
			await delayMs(Math.max(0, framePeriodMs - elapsed));
		} else {
			await new Promise<void>((r) => requestAnimationFrame(() => r()));
		}
		processedFrames++;

		const progress = 30 + Math.round((processedFrames / totalFrames) * 60);
		setExportProgress({
			stage: "encoding",
			progress: Math.min(90, progress),
			message: `Rendering frame ${processedFrames}/${totalFrames}…`,
		});
	}

	if (signal.aborted || abortedRef.current || exportCancelled) {
		if (mediaRecorder.state !== "inactive") {
			try {
				mediaRecorder.stop();
			} catch {
				/* ignore */
			}
		}
		for (const track of stream.getTracks()) {
			track.stop();
		}
		disposeSourceVideo();
		mediaCaptureRef.current = { mediaRecorder: null, stream: null };
		throw new DOMException("Aborted", "AbortError");
	}

	await new Promise<void>((resolve, reject) => {
		mediaRecorder.onstop = () => resolve();
		mediaRecorder.onerror = (ev) => {
			reject(
				new Error(
					`MediaRecorder error: ${(ev as { error?: Error }).error?.message ?? "unknown"}`,
				),
			);
		};
		try {
			(
				mediaRecorder as MediaRecorder & { requestData?: () => void }
			).requestData?.();
		} catch {
			/* ignore */
		}
		mediaRecorder.stop();
	});

	disposeSourceVideo();
	stream.getTracks().forEach((track) => track.stop());
	mediaCaptureRef.current = { mediaRecorder: null, stream: null };

	setExportProgress({
		stage: "muxing",
		progress: 95,
		message: "Finalizing video…",
	});

	const chunkByteLength = (p: BlobPart): number => {
		if (p instanceof Blob) return p.size;
		if (p instanceof ArrayBuffer) return p.byteLength;
		if (ArrayBuffer.isView(p)) return p.byteLength;
		return 0;
	};
	const totalChunkBytes = recordedChunks.reduce(
		(acc, p) => acc + chunkByteLength(p),
		0,
	);
	if (totalChunkBytes === 0) {
		throw new Error(
			"Export produced no video data (MediaRecorder emitted empty chunks). Try another browser or a shorter clip.",
		);
	}

	const blob = new Blob(recordedChunks, { type: mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	const extension = "webm";
	const fileName = options.fileName
		? options.fileName.replace(/\.[^/.]+$/, `.${extension}`)
		: `export-4k-${Date.now()}.${extension}`;
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
}
