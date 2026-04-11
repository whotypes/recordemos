import { parseAspectRatioFraction } from "./export-dimensions";

const ASPECT_EPS = 0.04;
/** Outer card is `aspect-video` but flex/layout can skew getBoundingClientRect slightly. */
const OUTER_VS_EXPORT_AR_EPS = 0.14;

/**
 * Tailwind `max-w-2xl` / `max-w-4xl` ratio — the inner video container can be
 * at most 672px inside an 896px outer card, i.e. 75% of the stage width.
 */
const INNER_TO_OUTER_MAX_W_RATIO = 672 / 896;

export type CompositionPlane = {
	x: number;
	y: number;
	w: number;
	h: number;
};

export const EXPORT_PREVIEW_OUTER_SELECTOR = "[data-export-preview-outer]";
export const EXPORT_PREVIEW_INNER_SELECTOR = "[data-export-preview-inner]";
/** `object-fit` containing block for `<video>` (inside frame + motion transforms). */
export const EXPORT_PREVIEW_VIDEO_PLANE_SELECTOR =
	"[data-export-preview-video-plane]";

export type ExportPreviewLayout = {
	plane: CompositionPlane;
	/**
	 * When true, the measured plane already includes frame scale/translate/rotateZ
	 * from the preview DOM — do not apply those again on canvas (avoids double zoom).
	 */
	skipGlobalMotion: boolean;
};

/**
 * Maps the video's on-screen `object-fit` box into export pixels relative to the outer card.
 */
export function computeExportCompositionRect(
	outer: DOMRectReadOnly,
	videoPlane: DOMRectReadOnly,
	exportWidth: number,
	exportHeight: number,
	aspectRatio: string,
): CompositionPlane {
	const { w: rw, h: rh } = parseAspectRatioFraction(aspectRatio);
	const exportAr = exportWidth / Math.max(1, exportHeight);
	const targetAr = rw / Math.max(1, rh);
	const outerAr = outer.width / Math.max(1, outer.height);

	const exportMatchesPreset = Math.abs(exportAr - targetAr) < ASPECT_EPS;
	const outerMatchesExport =
		Math.abs(exportAr - outerAr) < OUTER_VS_EXPORT_AR_EPS;
	/** Video cell is visibly inset inside the outer card (pillarboxed stage). */
	const videoInsetInOuter =
		videoPlane.width < outer.width - 2 && videoPlane.height < outer.height - 2;

	/**
	 * Map outer → full export frame and place video from DOM inset.
	 * If we only checked outerAr ≈ exportAr, sub-pixel flex layout often failed and
	 * the video plane was expanded to the full canvas (hiding wallpaper).
	 */
	const stageAligned =
		exportMatchesPreset && (outerMatchesExport || videoInsetInOuter);

	if (stageAligned) {
		const sx = exportWidth / outer.width;
		const sy = exportHeight / outer.height;
		return {
			x: (videoPlane.left - outer.left) * sx,
			y: (videoPlane.top - outer.top) * sy,
			w: videoPlane.width * sx,
			h: videoPlane.height * sy,
		};
	}

	return { x: 0, y: 0, w: exportWidth, h: exportHeight };
}

/**
 * Pure-math composition plane that mirrors the CSS layout in `PreviewCanvas`:
 *   outer = aspect-video (16:9), max-w-4xl   →  the export canvas
 *   inner = max-w-2xl, chosen aspect ratio   →  the video container (flex-centered)
 *   inner is CSS-scaled by `zoomLevel / 100`
 *
 * This avoids depending on `getBoundingClientRect` which fails when the preview
 * is obscured by a modal or hasn't been laid out.
 */
export function computeCompositionPlaneFromStore(
	exportWidth: number,
	exportHeight: number,
	videoAspectRatio: string,
	zoomLevel: number,
): CompositionPlane {
	const { w: rw, h: rh } = parseAspectRatioFraction(videoAspectRatio);
	const videoAr = rw / rh;
	const outerAr = exportWidth / Math.max(1, exportHeight);

	const maxInnerW = exportWidth * INNER_TO_OUTER_MAX_W_RATIO;
	const maxInnerH = exportHeight;

	let innerW: number;
	let innerH: number;

	if (videoAr >= outerAr) {
		innerW = Math.min(maxInnerW, exportWidth);
		innerH = innerW / videoAr;
		if (innerH > maxInnerH) {
			innerH = maxInnerH;
			innerW = innerH * videoAr;
		}
	} else {
		innerH = Math.min(maxInnerH, exportHeight);
		innerW = innerH * videoAr;
		if (innerW > maxInnerW) {
			innerW = maxInnerW;
			innerH = innerW / videoAr;
		}
	}

	const zoom = zoomLevel / 100;
	const scaledW = innerW * zoom;
	const scaledH = innerH * zoom;

	const x = (exportWidth - scaledW) / 2;
	const y = (exportHeight - scaledH) / 2;

	return { x, y, w: scaledW, h: scaledH };
}

export function readExportPreviewLayout(
	exportWidth: number,
	exportHeight: number,
	aspectRatio: string,
	zoomLevel = 100,
): ExportPreviewLayout {
	const mathPlane = computeCompositionPlaneFromStore(
		exportWidth,
		exportHeight,
		aspectRatio,
		zoomLevel,
	);

	if (typeof document !== "undefined") {
		const outer = document.querySelector(EXPORT_PREVIEW_OUTER_SELECTOR);
		const videoPlaneEl = document.querySelector(
			EXPORT_PREVIEW_VIDEO_PLANE_SELECTOR,
		);
		const inner = document.querySelector(EXPORT_PREVIEW_INNER_SELECTOR);
		const planeSource = videoPlaneEl ?? inner;

		if (outer && planeSource) {
			const domPlane = computeExportCompositionRect(
				outer.getBoundingClientRect(),
				planeSource.getBoundingClientRect(),
				exportWidth,
				exportHeight,
				aspectRatio,
			);
			const domFillsFrame =
				domPlane.x === 0 &&
				domPlane.y === 0 &&
				Math.abs(domPlane.w - exportWidth) < 1 &&
				Math.abs(domPlane.h - exportHeight) < 1;

			if (!domFillsFrame) {
				return {
					plane: domPlane,
					skipGlobalMotion: Boolean(videoPlaneEl),
				};
			}
		}
	}

	const mathFillsFrame =
		mathPlane.x < 1 &&
		mathPlane.y < 1 &&
		Math.abs(mathPlane.w - exportWidth) < 1 &&
		Math.abs(mathPlane.h - exportHeight) < 1;

	return {
		plane: mathPlane,
		skipGlobalMotion: !mathFillsFrame,
	};
}
