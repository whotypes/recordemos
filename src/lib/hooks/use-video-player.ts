import { useCompositionStore } from "@/lib/composition-store";
import { getDeadZoneStopMs } from "@/lib/playback-bounds";
import { isValidDuration } from "@/lib/video-metadata";
import { usePlayheadStore } from "@/lib/playhead-store";
import { useTimelineDurationStore } from "@/lib/timeline-duration-store";
import { useVideoPlayerStore } from "@/lib/video-player-store";
import { useEffect, useRef } from "react";

export { getDeadZoneStopMs } from "@/lib/playback-bounds";

export const useVideoPlayer = (videoSrc: string | null) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const rafOwnsPlaybackRef = useRef(false);

	const { setVideoDuration, loop } = useVideoPlayerStore();
	const { isPlaying, setIsPlaying, setPlayheadMs } = usePlayheadStore();

	useEffect(() => {
		if (!videoRef.current) return;
		const video = videoRef.current;
		if (videoSrc) {
			video.load();
		} else {
			video.pause();
			video.removeAttribute("src");
			video.load();
		}
	}, [videoSrc]);

	useEffect(() => {
		if (!videoRef.current || !videoSrc) return;
		const video = videoRef.current;

		const handleLoadedMetadata = () => {
			const duration = video.duration;
			if (!isValidDuration(duration)) return;
			setVideoDuration(duration);
			useTimelineDurationStore.getState().setVideoDuration(duration);
		};

		video.addEventListener("loadedmetadata", handleLoadedMetadata);
		return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
	}, [videoSrc, setVideoDuration]);

	useEffect(() => {
		if (!videoRef.current) return;
		if (isPlaying) {
			rafOwnsPlaybackRef.current = true;
			videoRef.current.play().catch(() => {});
		} else {
			rafOwnsPlaybackRef.current = false;
			videoRef.current.pause();
		}
	}, [isPlaying]);

	useEffect(() => {
		if (!videoRef.current || !videoSrc) return;

		const video = videoRef.current;
		let rafId: number | null = null;
		let startTime: number | null = null;
		let startPlayheadMs: number | null = null;

		const restartFromBeginning = (
			compiler: NonNullable<ReturnType<typeof useCompositionStore.getState>["compiler"]>,
			timestamp: number,
		) => {
			const startMs = compiler.getPlaybackStartMs();
			const firstBlock = compiler
				.getBlocks()
				.filter((b) => b.blockType === "video")
				.sort((a, b) => a.startMs - b.startMs)[0];
			const seekSec = firstBlock ? (firstBlock.trimStartMs || 0) / 1000 : 0;

			startTime = timestamp;
			startPlayheadMs = startMs;
			setPlayheadMs(startMs, "playback");
			useCompositionStore.getState().computeActiveBlock(startMs);
			video.currentTime = seekSec;
			return startMs;
		};

		const updatePlayback = (timestamp: number) => {
			if (!isPlaying) {
				rafId = null;
				return;
			}

			if (startTime === null || startPlayheadMs === null) {
				startTime = timestamp;
				startPlayheadMs = usePlayheadStore.getState().playheadMs;
			}

			const elapsedMs = timestamp - startTime;
			let currentPlayheadMs = startPlayheadMs + elapsedMs;

			const compiler = useCompositionStore.getState().compiler;
			const maxTimelineMs = compiler ? compiler.getPlaybackEndMs() : 0;

			if (maxTimelineMs > 0 && currentPlayheadMs >= maxTimelineMs) {
				if (loop && compiler) {
					currentPlayheadMs = restartFromBeginning(compiler, timestamp);
				} else {
					const stopMs = Math.max(0, maxTimelineMs - 1);
					setPlayheadMs(stopMs, "playback");
					useCompositionStore.getState().computeActiveBlock(stopMs);
					setIsPlaying(false);
					rafOwnsPlaybackRef.current = false;
					video.pause();
					rafId = null;
					return;
				}
			}

			setPlayheadMs(currentPlayheadMs, "playback");
			useCompositionStore.getState().computeActiveBlock(currentPlayheadMs);

			const activeBlock = compiler?.getActiveVideoBlock(currentPlayheadMs);

			if (!activeBlock && compiler) {
				const deadZoneStop = getDeadZoneStopMs(compiler, currentPlayheadMs);
				if (deadZoneStop !== null) {
					setPlayheadMs(deadZoneStop, "playback");
					useCompositionStore.getState().computeActiveBlock(deadZoneStop);
					setIsPlaying(false);
					rafOwnsPlaybackRef.current = false;
					video.pause();
					rafId = null;
					return;
				}
			}

			if (activeBlock) {
				const trimStart = activeBlock.block.trimStartMs || 0;
				const maxAssetSec =
					(trimStart + activeBlock.block.durationMs) / 1000 - 0.001;
				const targetVideoTime = Math.min(
					activeBlock.inAssetTime / 1000,
					maxAssetSec,
				);
				const stopTimelineMs = Math.max(0, activeBlock.visibleEnd - 1);

				if (video.currentTime > maxAssetSec + 0.05) {
					video.currentTime = Math.max(trimStart / 1000, maxAssetSec);
					setPlayheadMs(stopTimelineMs, "playback");
					useCompositionStore.getState().computeActiveBlock(stopTimelineMs);
					setIsPlaying(false);
					rafOwnsPlaybackRef.current = false;
					video.pause();
					rafId = null;
					return;
				}

				if (Math.abs(video.currentTime - targetVideoTime) > 0.1) {
					video.currentTime = targetVideoTime;
				}

				if (video.paused) {
					video.play().catch(() => {});
				}
			} else {
				const nextBlock = compiler?.getNextVideoBlock(currentPlayheadMs);

				if (nextBlock) {
					const targetTimelineMs = nextBlock.visibleStart;
					startTime = timestamp;
					startPlayheadMs = targetTimelineMs;
					currentPlayheadMs = targetTimelineMs;
					setPlayheadMs(currentPlayheadMs, "playback");
					useCompositionStore.getState().computeActiveBlock(currentPlayheadMs);
					video.currentTime = nextBlock.inAssetTime / 1000;
					if (video.paused) {
						video.play().catch(() => {});
					}
				} else if (!video.paused) {
					video.pause();
				}
			}

			rafId = requestAnimationFrame(updatePlayback);
		};

		if (isPlaying) {
			rafId = requestAnimationFrame(updatePlayback);
		} else {
			video.pause();
		}

		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	}, [videoSrc, isPlaying, loop, setIsPlaying, setPlayheadMs]);

	useEffect(() => {
		if (!videoRef.current || !videoSrc) return;
		const video = videoRef.current;

		const handleEnded = () => {
			if (rafOwnsPlaybackRef.current) return;
			const compiler = useCompositionStore.getState().compiler;
			const stopMs = compiler
				? Math.max(0, compiler.getPlaybackEndMs() - 1)
				: 0;
			setPlayheadMs(stopMs, "playback");
			setIsPlaying(false);
		};

		const handleError = (e: Event) => {
			console.error("Video playback error:", e);
			setIsPlaying(false);
		};

		video.addEventListener("ended", handleEnded);
		video.addEventListener("error", handleError);
		return () => {
			video.removeEventListener("ended", handleEnded);
			video.removeEventListener("error", handleError);
		};
	}, [videoSrc, setIsPlaying, setPlayheadMs]);

	return { videoRef };
};
