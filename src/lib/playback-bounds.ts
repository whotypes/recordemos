import type { TimelineCompiler } from "./timeline-compiler";

let playbackEndMsRef = 0;

/** Called by composition-store whenever video content extent changes. */
export function syncPlaybackEndMs(ms: number): void {
	playbackEndMsRef = ms;
}

export function clampPlayheadMs(timeMs: number): number {
	const clamped = Math.max(0, timeMs);
	if (playbackEndMsRef > 0) {
		return Math.min(clamped, playbackEndMsRef - 1);
	}
	return clamped;
}

/** Stop playback when the playhead moves past the end of all video content. */
export function getDeadZoneStopMs(
	compiler: TimelineCompiler,
	playheadMs: number,
): number | null {
	if (compiler.getActiveVideoBlock(playheadMs)) return null;

	const videoBlocks = compiler
		.getBlocks()
		.filter((b) => b.blockType === "video");
	if (videoBlocks.length === 0) return null;

	for (const block of videoBlocks) {
		const contentEnd = block.startMs + block.durationMs;
		if (playheadMs < contentEnd - 1) continue;

		const hasLaterVideo = videoBlocks.some(
			(b) =>
				b.startMs >= contentEnd &&
				playheadMs < b.startMs + b.durationMs,
		);
		if (!hasLaterVideo) {
			return Math.max(0, contentEnd - 1);
		}
	}

	return null;
}
