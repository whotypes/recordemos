import { useCompositionStore } from "@/lib/composition-store";
import { isValidDuration } from "@/lib/video-metadata";

/** Seek the preview `<video>` to match a timeline position in ms. */
export function seekPreviewVideo(
	video: HTMLVideoElement | null,
	timeMs: number,
): void {
	if (!video || video.readyState < 2) return;

	const compiler = useCompositionStore.getState().compiler;
	const activeVideo = compiler?.getActiveVideoBlock(timeMs);

	let targetTime = timeMs / 1000;
	if (activeVideo) {
		targetTime = activeVideo.inAssetTime / 1000;
		const trimStart = activeVideo.block.trimStartMs || 0;
		const maxAssetSec =
			(trimStart + activeVideo.block.durationMs) / 1000 - 0.001;
		targetTime = Math.min(targetTime, maxAssetSec);
	}

	if (isValidDuration(video.duration)) {
		targetTime = Math.max(0, Math.min(targetTime, video.duration - 0.001));
	}

	if (Math.abs(video.currentTime - targetTime) > 0.01) {
		video.currentTime = targetTime;
	}
}
