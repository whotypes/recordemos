/** Timeline sampling and encoder frame rate for video export. */
export const EXPORT_FPS = 60;

/**
 * FPS baseline used when {@link BASE_BITRATE} and MediaRecorder quality presets were tuned.
 * Export bitrates scale by `EXPORT_FPS / EXPORT_FPS_BITRATE_BASELINE`.
 */
export const EXPORT_FPS_BITRATE_BASELINE = 30;

/** 4K UHD short edge (2160px); long edge follows aspect ratio. */
const SHORT_EDGE_PX = 2160;

const BASE_BITRATE = 20_000_000;

const BITRATE_FPS_SCALE = EXPORT_FPS / EXPORT_FPS_BITRATE_BASELINE;

/** Reference frame (1080p 16:9) for scaling bit rate when resolution changes. */
const REF_PIXELS = 1920 * 1080;

export function parseAspectRatioFraction(aspectRatio: string): {
	w: number;
	h: number;
} {
	if (aspectRatio === "Custom" || !aspectRatio.includes(":")) {
		return { w: 16, h: 9 };
	}
	const parts = aspectRatio.split(":");
	const w = Number.parseFloat(parts[0]?.trim() ?? "");
	const h = Number.parseFloat(parts[1]?.trim() ?? "");
	if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
		return { w: 16, h: 9 };
	}
	return { w, h };
}

/**
 * Pixel size and bit rate for 4K export: short edge is 2160px,
 * long edge follows the selected aspect ratio. Dimensions are even for encoder compatibility.
 */
export function exportDimensionsForAspect(aspectRatio: string): {
	width: number;
	height: number;
	bitrate: number;
} {
	const { w: rw, h: rh } = parseAspectRatioFraction(aspectRatio);
	const short = SHORT_EDGE_PX;
	let width: number;
	let height: number;
	if (rw >= rh) {
		height = short;
		width = Math.round((short * rw) / rh);
	} else {
		width = short;
		height = Math.round((short * rh) / rw);
	}
	width -= width % 2;
	height -= height % 2;

	const pixels = width * height;
	const scale = Math.min(2, Math.max(0.5, pixels / REF_PIXELS));
	const bitrate = Math.round(BASE_BITRATE * scale * BITRATE_FPS_SCALE);

	return { width, height, bitrate };
}
