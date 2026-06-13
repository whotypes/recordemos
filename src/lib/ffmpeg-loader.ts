import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

const FFMPEG_CORE_BASE =
	"https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";

/** Shared FFmpeg.wasm singleton for remux and export fallback. */
export async function loadFFmpeg(
	onProgress?: (msg: string) => void,
): Promise<FFmpeg> {
	if (ffmpegInstance) return ffmpegInstance;
	if (ffmpegLoadPromise) return ffmpegLoadPromise;

	ffmpegLoadPromise = (async () => {
		onProgress?.("Loading FFmpeg (~31MB)...");

		const ffmpeg = new FFmpeg();

		ffmpeg.on("log", ({ message }) => {
			console.log("[FFmpeg]", message);
		});

		await ffmpeg.load({
			coreURL: await toBlobURL(
				`${FFMPEG_CORE_BASE}/ffmpeg-core.js`,
				"text/javascript",
			),
			wasmURL: await toBlobURL(
				`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`,
				"application/wasm",
			),
		});

		ffmpegInstance = ffmpeg;
		return ffmpeg;
	})();

	return ffmpegLoadPromise;
}

/** Terminate the shared FFmpeg instance (e.g. on export cancel). */
export function terminateFFmpeg(): void {
	if (ffmpegInstance) {
		try {
			ffmpegInstance.terminate();
		} catch {
			/* ignore */
		}
		ffmpegInstance = null;
		ffmpegLoadPromise = null;
	}
}
