export type VideoMetadata = {
	durationSec: number;
	width: number;
	height: number;
	container: string;
	/** True when duration came from recordedDurationMs because the container reported none. */
	durationFromRecordedFallback?: boolean;
};

export function isValidDuration(duration: number): boolean {
	return Boolean(
		duration && isFinite(duration) && !isNaN(duration) && duration > 0,
	);
}

/** Longest video-block extent on the timeline (respects trim / resize). */
export function blockExtentDurationSec(
	blocks: Array<{ start: number; duration: number; type?: string }> = [],
): number {
	const videoBlocks = blocks.filter((b) => b.type === "video");
	const relevant = videoBlocks.length > 0 ? videoBlocks : blocks;
	if (relevant.length === 0) return 0;
	return relevant.reduce(
		(max, block) => Math.max(max, block.start + block.duration),
		0,
	);
}

/**
 * Timeline ruler/scrubber/playhead duration.
 * When blocks exist, use their extent so trim shortens the timeline.
 * Otherwise fall back to asset duration.
 */
export function resolveLayoutDurationSec(
	videoDurationSec: number,
	blocks: Array<{ start: number; duration: number }> = [],
	fallbackSec = 0,
): number {
	const fromBlocks = blockExtentDurationSec(blocks);
	if (fromBlocks > 0) {
		return fromBlocks;
	}
	if (isValidDuration(videoDurationSec)) {
		return videoDurationSec;
	}
	return isValidDuration(fallbackSec) ? fallbackSec : 0;
}

type ExtractVideoMetadataOptions = {
	recordedDurationMs?: number;
};

function getContainer(file: File): string {
	const ext = file.name.split(".").pop()?.toLowerCase();
	return ext || file.type.split("/")[1] || "unknown";
}

function resolveMetadata(
	video: HTMLVideoElement,
	file: File,
	recordedDurationMs?: number,
): VideoMetadata | null {
	let durationSec = video.duration;
	let durationFromRecordedFallback = false;

	if (!isValidDuration(durationSec)) {
		if (recordedDurationMs !== undefined && recordedDurationMs > 0) {
			durationSec = recordedDurationMs / 1000;
			durationFromRecordedFallback = true;
		} else {
			return null;
		}
	}

	return {
		durationSec,
		width: video.videoWidth,
		height: video.videoHeight,
		container: getContainer(file),
		durationFromRecordedFallback,
	};
}

export function extractVideoMetadata(
	file: File,
	options?: ExtractVideoMetadataOptions,
): Promise<VideoMetadata> {
	const { recordedDurationMs } = options ?? {};

	return new Promise((resolve, reject) => {
		const video = document.createElement("video");
		video.preload = "metadata";
		video.muted = true;
		video.playsInline = true;

		let blobUrl: string | null = null;
		let timeoutId: NodeJS.Timeout | null = null;
		let resolved = false;

		const cleanup = () => {
			video.onloadedmetadata = null;
			video.oncanplay = null;
			video.onerror = null;

			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			if (blobUrl) {
				URL.revokeObjectURL(blobUrl);
				blobUrl = null;
			}

			video.pause();
			video.removeAttribute("src");
			video.load();
			video.remove();
		};

		const checkAndResolve = () => {
			if (resolved) return;

			const metadata = resolveMetadata(video, file, recordedDurationMs);
			if (metadata) {
				resolved = true;
				cleanup();
				resolve(metadata);
			}
		};

		video.onloadedmetadata = () => {
			checkAndResolve();

			if (!resolved) {
				console.warn(
					"Duration invalid after loadedmetadata, waiting for canplay...",
				);
			}
		};

		video.oncanplay = () => {
			checkAndResolve();

			if (!resolved && video.duration === Infinity) {
				console.warn("Duration is Infinity, attempting to seek...");
				video.currentTime = Number.MAX_SAFE_INTEGER;
				setTimeout(() => {
					video.currentTime = 0;
					checkAndResolve();

					if (!resolved) {
						cleanup();
						reject(new Error(`Invalid video duration: ${video.duration}`));
					}
				}, 100);
			}
		};

		video.onerror = () => {
			if (!resolved) {
				resolved = true;
				cleanup();
				reject(new Error("Failed to load video metadata"));
			}
		};

		timeoutId = setTimeout(() => {
			if (!resolved) {
				resolved = true;
				cleanup();
				reject(
					new Error(
						`Video metadata extraction timeout. Duration: ${video.duration}`,
					),
				);
			}
		}, 10000);

		blobUrl = URL.createObjectURL(file);
		video.src = blobUrl;
		video.load();
	});
}
