import { ArrayBufferTarget, Muxer } from "mp4-muxer";

const US_PER_SEC = 1_000_000;

export type CanvasFrameRenderer = (timelineMs: number) => Promise<void>;

/**
 * H.264 + MP4 via WebCodecs + mp4-muxer. Frame timestamps follow the export timeline
 * (fixed fps), not wall-clock time — unlike MediaRecorder + canvas.captureStream(0) +
 * requestFrame(), which stretches duration when seeks/rendering are slow.
 */
export async function pickH264EncoderConfig(
	width: number,
	height: number,
	bitrate: number,
): Promise<VideoEncoderConfig | null> {
	if (typeof VideoEncoder === "undefined") return null;

	const candidates: VideoEncoderConfig[] = [
		{
			codec: "avc1.640034",
			width,
			height,
			bitrate,
			avc: { format: "avc" },
			latencyMode: "quality",
		},
		{
			codec: "avc1.4D4032",
			width,
			height,
			bitrate,
			avc: { format: "avc" },
			latencyMode: "quality",
		},
		{
			codec: "avc1.42E01E",
			width,
			height,
			bitrate,
			avc: { format: "avc" },
			latencyMode: "quality",
		},
	];

	for (const c of candidates) {
		const { supported, config } = await VideoEncoder.isConfigSupported(c);
		if (supported && config) return config;
	}
	return null;
}

async function waitEncoderQueueBelow(
	encoder: VideoEncoder,
	maxSize: number,
	signal: AbortSignal,
): Promise<void> {
	while (encoder.encodeQueueSize > maxSize) {
		if (signal.aborted) {
			throw new DOMException("Aborted", "AbortError");
		}
		await new Promise<void>((resolve, reject) => {
			const cleanup = () => {
				encoder.removeEventListener("dequeue", onDequeue);
				signal.removeEventListener("abort", onAbort);
			};
			const onDequeue = () => {
				cleanup();
				resolve();
			};
			const onAbort = () => {
				cleanup();
				reject(new DOMException("Aborted", "AbortError"));
			};
			encoder.addEventListener("dequeue", onDequeue);
			signal.addEventListener("abort", onAbort, { once: true });
		});
	}
}

export async function encodeCanvasTimelineToMp4(params: {
	canvas: HTMLCanvasElement;
	fps: number;
	totalDurationMs: number;
	encoderConfig: VideoEncoderConfig;
	renderFrame: CanvasFrameRenderer;
	signal: AbortSignal;
	onProgress?: (encodedFrames: number, totalFrames: number) => void;
}): Promise<ArrayBuffer> {
	const {
		canvas,
		fps,
		totalDurationMs,
		renderFrame,
		signal,
		onProgress,
		encoderConfig,
	} = params;

	const width = encoderConfig.width ?? canvas.width;
	const height = encoderConfig.height ?? canvas.height;

	const totalFrames = Math.max(
		1,
		Math.ceil((totalDurationMs / 1000) * fps - 1e-9),
	);

	const target = new ArrayBufferTarget();
	const muxer = new Muxer({
		target,
		video: {
			codec: "avc",
			width,
			height,
			frameRate: fps,
		},
		fastStart: {
			expectedVideoChunks: totalFrames,
		},
		firstTimestampBehavior: "strict",
	});

	const encoder = new VideoEncoder({
		output: (chunk, meta) => {
			muxer.addVideoChunk(chunk, meta);
		},
		error: (e) => {
			console.error("[export] VideoEncoder error", e);
		},
	});

	encoder.configure(encoderConfig);

	const keyframeEvery = Math.max(1, fps * 2);

	try {
		for (let i = 0; ; i++) {
			const timelineMs = (i / fps) * 1000;
			if (timelineMs >= totalDurationMs) break;

			if (signal.aborted) {
				throw new DOMException("Aborted", "AbortError");
			}

			await waitEncoderQueueBelow(encoder, 4, signal);

			await renderFrame(timelineMs);

			const timestamp = Math.round((i * US_PER_SEC) / fps);
			const duration = Math.round(US_PER_SEC / fps);

			const frame = new VideoFrame(canvas, {
				timestamp,
				duration,
			});

			encoder.encode(frame, { keyFrame: i % keyframeEvery === 0 });
			frame.close();

			onProgress?.(i + 1, totalFrames);
		}

		await encoder.flush();
	} finally {
		try {
			encoder.close();
		} catch {
			/* ignore */
		}
	}

	muxer.finalize();
	return target.buffer;
}
