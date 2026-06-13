import {
	Combinator,
	fastConcatMP4,
	fixFMP4Duration,
	MP4Clip,
	OffscreenSprite,
} from "@webav/av-cliper";
import { fetchFile } from "@ffmpeg/util";
import {
	encodeCanvasTimelineToMp4,
	pickH264EncoderConfig,
} from "./export-canvas-webcodecs-mp4";
import { exportDimensionsForAspect, EXPORT_FPS } from "./export-dimensions";
import { isWebAvExportEnvironmentSupported } from "./export-webav-support";
import { isMp4LikeBlob } from "./export-is-mp4-like";
import { fillExportBackground } from "./export-draw-background";
import { drawExportVideoInPlane } from "./export-draw-video";
import {
	readExportPreviewLayout,
	type CompositionPlane,
} from "./export-preview-layout";
import { loadFFmpeg } from "./ffmpeg-loader";
import type { TimelineCompiler } from "./timeline-compiler";

export type ExportProgressStage =
	| "loading"
	| "processing"
	| "encoding"
	| "muxing"
	| "complete";

export interface ExportProgress {
	stage: ExportProgressStage;
	progress: number;
	message: string;
}

export interface ExportVisualState {
	backgroundColor: string;
	backgroundType: "solid" | "gradient" | "mesh" | "image";
	imageBackground: string | null;
	gradientAngle: number;
	scale: number;
	translateX: number;
	translateY: number;
	rotateZ: number;
	zoomLevel: number;
}

export interface ExportTimelineOptions {
	aspectRatio: string;
	videoSrc: string;
	fileName?: string;
	videoFormat?: string;
	sourceFileName?: string;
	visual: ExportVisualState;
}

export interface ExportTimelineParams {
	compiler: TimelineCompiler;
	videoBlob: Blob | null;
	options: ExportTimelineOptions;
	onProgress: (p: ExportProgress) => void;
	signal: AbortSignal;
	registerCleanup?: (fn: (() => void) | null) => void;
}

function assertNotAborted(signal: AbortSignal): void {
	if (signal.aborted) {
		throw new DOMException("Aborted", "AbortError");
	}
}

export function canUseWebAvFastPath(compiler: TimelineCompiler): boolean {
	const videos = compiler.getBlocks().filter((b) => b.blockType === "video");
	if (videos.length !== 1) return false;
	const v = videos[0]!;
	const total = compiler.getTotalDuration();
	if (total <= 0) return false;
	if (v.startMs !== 0 || Math.abs(v.startMs + v.durationMs - total) > 1) {
		return false;
	}
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

function waitForVideoPaintReady(
	el: HTMLVideoElement,
	signal: AbortSignal,
): Promise<void> {
	assertNotAborted(signal);
	if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
		return Promise.resolve();
	}
	if (typeof el.requestVideoFrameCallback === "function") {
		return new Promise((resolve, reject) => {
			assertNotAborted(signal);
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
				if (signal.aborted) {
					reject(new DOMException("Aborted", "AbortError"));
					return;
				}
				resolve();
			});
		});
	}
	return new Promise((resolve, reject) => {
		assertNotAborted(signal);
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

async function loadBackgroundImage(
	url: string,
	signal: AbortSignal,
): Promise<HTMLImageElement> {
	const img = new Image();
	img.crossOrigin = "anonymous";
	await new Promise<void>((resolve, reject) => {
		const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
		signal.addEventListener("abort", onAbort, { once: true });
		img.onload = () => {
			signal.removeEventListener("abort", onAbort);
			resolve();
		};
		img.onerror = () => {
			signal.removeEventListener("abort", onAbort);
			reject(new Error("Failed to load background image"));
		};
		img.src = url;
	});
	return img;
}

interface TimelineRenderContext {
	canvas: HTMLCanvasElement;
	bgCache: HTMLCanvasElement;
	video: HTMLVideoElement | null;
	mediaDurationSec: number;
	compositionPlane: CompositionPlane;
	skipGlobalMotion: boolean;
	transform: {
		scale: number;
		translateX: number;
		translateY: number;
		rotateZ: number;
	};
	compiler: TimelineCompiler;
	signal: AbortSignal;
}

async function createTimelineRenderContext(params: {
	compiler: TimelineCompiler;
	qualitySettings: { width: number; height: number };
	options: ExportTimelineOptions;
	videoBlob: Blob | null;
	backgroundImage: HTMLImageElement | null;
	signal: AbortSignal;
}): Promise<TimelineRenderContext> {
	const {
		compiler,
		qualitySettings,
		options,
		videoBlob,
		backgroundImage,
		signal,
	} = params;

	const backgroundParams = {
		backgroundType: options.visual.backgroundType,
		backgroundColor: options.visual.backgroundColor,
		gradientAngleDeg: options.visual.gradientAngle,
	} as const;
	const transform = {
		scale: options.visual.scale,
		translateX: options.visual.translateX,
		translateY: options.visual.translateY,
		rotateZ: options.visual.rotateZ,
	};
	const { plane: compositionPlane, skipGlobalMotion } = readExportPreviewLayout(
		qualitySettings.width,
		qualitySettings.height,
		options.aspectRatio,
		options.visual.zoomLevel,
	);

	let video: HTMLVideoElement | null = null;
	let mediaDurationSec = Number.POSITIVE_INFINITY;

	if (videoBlob) {
		video = document.createElement("video");
		video.src = URL.createObjectURL(videoBlob);
		video.muted = true;
		video.playsInline = true;
		video.preload = "auto";

		await new Promise<void>((resolve, reject) => {
			const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
			signal.addEventListener("abort", onAbort, { once: true });
			video!.onloadedmetadata = () => {
				signal.removeEventListener("abort", onAbort);
				video!.currentTime = 0;
				resolve();
			};
			video!.onerror = () => {
				signal.removeEventListener("abort", onAbort);
				reject(new Error("Failed to load source video"));
			};
		});

		mediaDurationSec =
			video.duration && !Number.isNaN(video.duration)
				? video.duration
				: Number.POSITIVE_INFINITY;
	}

	const canvas = document.createElement("canvas");
	canvas.width = qualitySettings.width;
	canvas.height = qualitySettings.height;

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

	return {
		canvas,
		bgCache,
		video,
		mediaDurationSec,
		compositionPlane,
		skipGlobalMotion,
		transform,
		compiler,
		signal,
	};
}

function disposeTimelineRenderContext(ctx: TimelineRenderContext): void {
	if (ctx.video?.src.startsWith("blob:")) {
		URL.revokeObjectURL(ctx.video.src);
	}
	ctx.video?.remove();
}

function makeRenderTimelineFrame(ctx: TimelineRenderContext) {
	const canvas = ctx.canvas;
	const ctx2d = canvas.getContext("2d", { willReadFrequently: false });
	if (!ctx2d) {
		throw new Error("Failed to get canvas context");
	}

	return async (timelineMs: number) => {
		assertNotAborted(ctx.signal);

		const active = ctx.compiler.getActiveVideoBlock(timelineMs);
		if (active && ctx.video) {
			const trimStartSec = (active.block.trimStartMs || 0) / 1000;
			const trimEndSec =
				(trimStartSec + active.block.durationMs / 1000) - 1e-3;
			let tSec = active.inAssetTime / 1000;
			tSec = Math.max(trimStartSec, Math.min(trimEndSec, tSec));
			if (Number.isFinite(ctx.mediaDurationSec)) {
				tSec = Math.min(tSec, Math.max(0, ctx.mediaDurationSec - 1e-3));
			}
			const el = ctx.video;
			if (Math.abs(el.currentTime - tSec) > 0.001) {
				el.currentTime = tSec;
				await new Promise<void>((resolve, reject) => {
					if (ctx.signal.aborted) {
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
			await waitForVideoPaintReady(el, ctx.signal);
		}

		ctx2d.clearRect(0, 0, canvas.width, canvas.height);
		ctx2d.drawImage(ctx.bgCache, 0, 0);
		if (ctx.video) {
			drawExportVideoInPlane(
				ctx2d,
				ctx.video,
				ctx.compositionPlane,
				active,
				ctx.transform,
				ctx.skipGlobalMotion,
			);
		}
	};
}

async function tryWebCodecsCanvasExport(params: {
	compiler: TimelineCompiler;
	qualitySettings: { width: number; height: number; bitrate: number };
	options: ExportTimelineOptions;
	videoBlob: Blob | null;
	backgroundImage: HTMLImageElement | null;
	onProgress: (p: ExportProgress) => void;
	signal: AbortSignal;
}): Promise<Blob | null> {
	const {
		compiler,
		qualitySettings,
		options,
		videoBlob,
		backgroundImage,
		onProgress,
		signal,
	} = params;

	const webCodecsAvailable =
		typeof VideoDecoder !== "undefined" &&
		typeof VideoEncoder !== "undefined" &&
		typeof VideoFrame !== "undefined";

	if (!webCodecsAvailable) return null;

	const h264Config = await pickH264EncoderConfig(
		qualitySettings.width,
		qualitySettings.height,
		qualitySettings.bitrate,
	);
	if (!h264Config) return null;

	const totalDurationMs = compiler.getTotalDuration();
	const fps = EXPORT_FPS;
	const renderCtx = await createTimelineRenderContext({
		compiler,
		qualitySettings,
		options,
		videoBlob,
		backgroundImage,
		signal,
	});

	try {
		onProgress({
			stage: "encoding",
			progress: 28,
			message: "Encoding video (WebCodecs MP4)…",
		});

		const renderFrame = makeRenderTimelineFrame(renderCtx);
		const mp4Buffer = await encodeCanvasTimelineToMp4({
			canvas: renderCtx.canvas,
			fps,
			totalDurationMs,
			encoderConfig: h264Config,
			renderFrame,
			signal,
			onProgress: (done, total) => {
				const progress = 28 + Math.round((done / total) * 62);
				onProgress({
					stage: "encoding",
					progress: Math.min(92, progress),
					message: `Encoding frame ${done}/${total}…`,
				});
			},
		});

		assertNotAborted(signal);

		onProgress({
			stage: "muxing",
			progress: 95,
			message: "Finalizing MP4…",
		});

		return new Blob([mp4Buffer], { type: "video/mp4" });
	} finally {
		disposeTimelineRenderContext(renderCtx);
	}
}

async function tryWebAvFastPathExport(params: {
	compiler: TimelineCompiler;
	qualitySettings: { width: number; height: number; bitrate: number };
	options: ExportTimelineOptions;
	videoBlob: Blob;
	backgroundImage: HTMLImageElement | null;
	onProgress: (p: ExportProgress) => void;
	signal: AbortSignal;
	registerCleanup?: (fn: (() => void) | null) => void;
}): Promise<Blob | null> {
	const {
		compiler,
		qualitySettings,
		options,
		videoBlob,
		backgroundImage,
		onProgress,
		signal,
		registerCleanup,
	} = params;

	if (!canUseWebAvFastPath(compiler)) return null;

	const webCodecsAvailable =
		typeof VideoDecoder !== "undefined" &&
		typeof VideoEncoder !== "undefined" &&
		typeof VideoFrame !== "undefined";
	if (!webCodecsAvailable) return null;

	if (!isMp4LikeBlob(videoBlob, options.videoFormat, options.sourceFileName)) {
		return null;
	}

	if (!(await isWebAvExportEnvironmentSupported())) return null;

	const segments = [webAvSingleAssetSegment(compiler)];
	const { width: ow, height: oh, bitrate } = qualitySettings;
	const backgroundParams = {
		backgroundType: options.visual.backgroundType,
		backgroundColor: options.visual.backgroundColor,
		gradientAngleDeg: options.visual.gradientAngle,
	} as const;
	const transform = {
		scale: options.visual.scale,
		translateX: options.visual.translateX,
		translateY: options.visual.translateY,
		rotateZ: options.visual.rotateZ,
	};
	const { plane: compositionPlane, skipGlobalMotion } = readExportPreviewLayout(
		ow,
		oh,
		options.aspectRatio,
		options.visual.zoomLevel,
	);

	onProgress({
		stage: "processing",
		progress: 22,
		message: "Encoding with WebCodecs (WebAV)…",
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
		assertNotAborted(signal);
		registerCleanup?.(null);

		const segment = segments[i]!;
		const res = await fetch(options.videoSrc, { signal });
		const body = res.body;
		if (!body) {
			throw new Error("No response body for video");
		}

		let com: Combinator | null = null;
		let sprite: OffscreenSprite | null = null;
		let clip: MP4Clip | null = null;

		const bindDestroy = () => {
			registerCleanup?.(() => {
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
		assertNotAborted(signal);

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
			onProgress({
				stage: "encoding",
				progress: Math.min(88, Math.round(base + local)),
				message: `Encoding segment ${i + 1}/${segCount}…`,
			});
		});

		await com.addSprite(sprite, { main: true });
		const out = com.output();
		bindDestroy();
		const segmentBuf = new Uint8Array(await new Response(out).arrayBuffer());

		registerCleanup?.(null);
		com.destroy();
		sprite.destroy();
		clip.destroy();

		segmentBuffers.push(segmentBuf);
	}

	onProgress({
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
	return await new Response(fixed).blob();
}

async function tryFfmpegFrameExport(params: {
	compiler: TimelineCompiler;
	qualitySettings: { width: number; height: number; bitrate: number };
	options: ExportTimelineOptions;
	videoBlob: Blob | null;
	backgroundImage: HTMLImageElement | null;
	onProgress: (p: ExportProgress) => void;
	signal: AbortSignal;
}): Promise<Blob | null> {
	const {
		compiler,
		qualitySettings,
		options,
		videoBlob,
		backgroundImage,
		onProgress,
		signal,
	} = params;

	const totalDurationMs = compiler.getTotalDuration();
	const fps = EXPORT_FPS;
	const totalFrames = Math.max(
		1,
		Math.ceil((totalDurationMs / 1000) * fps - 1e-9),
	);

	onProgress({
		stage: "loading",
		progress: 12,
		message: "Loading FFmpeg (~31MB)...",
	});

	const ffmpeg = await loadFFmpeg((msg) => {
		onProgress({
			stage: "loading",
			progress: 15,
			message: msg,
		});
	});

	ffmpeg.on("progress", ({ progress }) => {
		onProgress({
			stage: "encoding",
			progress: Math.min(92, 50 + Math.round(progress * 42)),
			message: "Encoding with FFmpeg…",
		});
	});

	const renderCtx = await createTimelineRenderContext({
		compiler,
		qualitySettings,
		options,
		videoBlob,
		backgroundImage,
		signal,
	});

	const renderFrame = makeRenderTimelineFrame(renderCtx);
	const frameFiles: string[] = [];

	try {
		onProgress({
			stage: "processing",
			progress: 25,
			message: "Rendering frames for FFmpeg…",
		});

		for (let i = 0; ; i++) {
			const timelineMs = (i / fps) * 1000;
			if (timelineMs >= totalDurationMs) break;
			assertNotAborted(signal);

			await renderFrame(timelineMs);

			const frameName = `frame_${String(i).padStart(6, "0")}.jpg`;
			const blob = await new Promise<Blob>((resolve, reject) => {
				renderCtx.canvas.toBlob(
					(b) => {
						if (b) resolve(b);
						else reject(new Error("Failed to encode frame as JPEG"));
					},
					"image/jpeg",
					0.92,
				);
			});

			await ffmpeg.writeFile(frameName, await fetchFile(blob));
			frameFiles.push(frameName);

			onProgress({
				stage: "encoding",
				progress: 25 + Math.round(((i + 1) / totalFrames) * 24),
				message: `Rendering frame ${i + 1}/${totalFrames}…`,
			});
		}

		onProgress({
			stage: "encoding",
			progress: 52,
			message: "Encoding MP4 with FFmpeg…",
		});

		const bitrateK = Math.round(qualitySettings.bitrate / 1000);
		const exitCode = await ffmpeg.exec([
			"-framerate",
			String(fps),
			"-i",
			"frame_%06d.jpg",
			"-c:v",
			"libx264",
			"-pix_fmt",
			"yuv420p",
			"-b:v",
			`${bitrateK}k`,
			"-movflags",
			"+faststart",
			"output.mp4",
		]);

		if (exitCode !== 0) {
			throw new Error(`FFmpeg encode failed (exit code ${exitCode})`);
		}

		const data = await ffmpeg.readFile("output.mp4");
		if (!(data instanceof Uint8Array) || data.byteLength === 0) {
			throw new Error("FFmpeg produced empty output");
		}

		const arrayBuffer = data.buffer.slice(
			data.byteOffset,
			data.byteOffset + data.byteLength,
		);
		return new Blob([arrayBuffer as ArrayBuffer], { type: "video/mp4" });
	} finally {
		disposeTimelineRenderContext(renderCtx);
		for (const name of frameFiles) {
			await ffmpeg.deleteFile(name).catch(() => {});
		}
		await ffmpeg.deleteFile("output.mp4").catch(() => {});
	}
}

function recordAttemptFailure(
	errors: string[],
	label: string,
	err: unknown,
): void {
	const msg = err instanceof Error ? err.message : String(err);
	errors.push(`${label}: ${msg}`);
	console.warn(`[export] ${label} failed`, err);
}

/**
 * Export the composed timeline to MP4. Tries WebCodecs canvas encode first,
 * then WebAV trim-only fast path, then FFmpeg frame-sequence fallback.
 */
export async function exportTimeline(
	params: ExportTimelineParams,
): Promise<Blob> {
	const { compiler, videoBlob, options, onProgress, signal, registerCleanup } =
		params;

	const errors: string[] = [];

	const qualitySettings = exportDimensionsForAspect(options.aspectRatio);
	const totalDurationMs = compiler.getTotalDuration();
	if (totalDurationMs <= 0) {
		throw new Error("Nothing to export (timeline is empty)");
	}

	onProgress({
		stage: "loading",
		progress: 10,
		message: "Loading video file...",
	});

	let backgroundImage: HTMLImageElement | null = null;
	if (
		options.visual.backgroundType === "image" &&
		options.visual.imageBackground
	) {
		backgroundImage = await loadBackgroundImage(
			options.visual.imageBackground,
			signal,
		);
	}

	// a. WebCodecs canvas → MP4 (primary)
	try {
		const blob = await tryWebCodecsCanvasExport({
			compiler,
			qualitySettings,
			options,
			videoBlob,
			backgroundImage,
			onProgress,
			signal,
		});
		if (blob) return blob;
		errors.push("WebCodecs: encoder not available");
	} catch (err) {
		if (err instanceof DOMException && err.name === "AbortError") throw err;
		if (signal.aborted) throw new DOMException("Aborted", "AbortError");
		recordAttemptFailure(errors, "WebCodecs canvas encode", err);
	}

	// b. WebAV trim-only fast path
	if (videoBlob) {
		try {
			const blob = await tryWebAvFastPathExport({
				compiler,
				qualitySettings,
				options,
				videoBlob,
				backgroundImage,
				onProgress,
				signal,
				registerCleanup,
			});
			if (blob) return blob;
		} catch (err) {
			if (err instanceof DOMException && err.name === "AbortError") throw err;
			if (signal.aborted) throw new DOMException("Aborted", "AbortError");
			recordAttemptFailure(errors, "WebAV fast path", err);
		}
	}

	// c. FFmpeg frame-sequence fallback
	try {
		const blob = await tryFfmpegFrameExport({
			compiler,
			qualitySettings,
			options,
			videoBlob,
			backgroundImage,
			onProgress,
			signal,
		});
		if (blob) return blob;
	} catch (err) {
		if (err instanceof DOMException && err.name === "AbortError") throw err;
		if (signal.aborted) throw new DOMException("Aborted", "AbortError");
		recordAttemptFailure(errors, "FFmpeg fallback", err);
	}

	throw new Error(`All export methods failed. ${errors.join("; ")}`);
}

/** Trigger a browser download for an exported MP4 blob. */
export function downloadExportBlob(blob: Blob, fileName?: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	const extension = "mp4";
	const downloadName = fileName
		? fileName.replace(/\.[^/.]+$/, `.${extension}`)
		: `export-4k-${Date.now()}.${extension}`;
	link.download = downloadName;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
