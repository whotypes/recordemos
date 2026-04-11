import type { CompositionPlane } from "./export-preview-layout";
import type { CompiledBlock } from "./timeline-compiler";

export type GlobalVideoMotion = {
	scale: number;
	translateX: number;
	translateY: number;
	rotateZ: number;
};

type Export2DContext =
	| CanvasRenderingContext2D
	| OffscreenCanvasRenderingContext2D;

function sourceDimensions(source: CanvasImageSource | VideoFrame): {
	w: number;
	h: number;
} {
	if (source instanceof VideoFrame) {
		return { w: source.displayWidth, h: source.displayHeight };
	}
	const el = source as HTMLVideoElement | HTMLImageElement;
	if ("videoWidth" in el && el.videoWidth > 0) {
		return { w: el.videoWidth, h: el.videoHeight };
	}
	if ("naturalWidth" in el && el.naturalWidth > 0) {
		return { w: el.naturalWidth, h: el.naturalHeight };
	}
	return { w: 0, h: 0 };
}

/**
 * Paints decoded video into the composition plane using `object-contain` semantics
 * (the full source frame is always visible, letterboxed if needed), then applies
 * optional global motion (preview frame container) and per-block transforms.
 *
 * A clip rect is applied to the plane so the video never bleeds over the background.
 *
 * Set `skipGlobalMotion` when the plane comes from DOM layout that already includes
 * frame scale/translate/rotateZ (avoids double-applying and over-zooming).
 */
export function drawExportVideoInPlane(
	ctx: Export2DContext,
	source: CanvasImageSource | VideoFrame,
	plane: CompositionPlane,
	active: CompiledBlock | null,
	globalMotion: GlobalVideoMotion,
	skipGlobalMotion = false,
): void {
	if (!active) return;

	const { w: videoWidth, h: videoHeight } = sourceDimensions(source);
	if (!videoWidth || !videoHeight) return;

	const crop = active.cropRect;
	let sx = 0;
	let sy = 0;
	let sw = videoWidth;
	let sh = videoHeight;
	if (crop) {
		sx = (crop.x / 100) * videoWidth;
		sy = (crop.y / 100) * videoHeight;
		sw = Math.max(1, (crop.width / 100) * videoWidth);
		sh = Math.max(1, (crop.height / 100) * videoHeight);
	}

	const subAspect = sw / sh;
	const rw = plane.w;
	const rh = plane.h;
	if (rw <= 0 || rh <= 0) return;

	const boxAspect = rw / rh;

	let drawW: number;
	let drawH: number;
	let ox: number;
	let oy: number;

	// object-contain: scale to fit entirely within the plane, letterbox the rest
	if (subAspect > boxAspect) {
		drawW = rw;
		drawH = drawW / subAspect;
		ox = plane.x;
		oy = plane.y + (rh - drawH) / 2;
	} else {
		drawH = rh;
		drawW = drawH * subAspect;
		ox = plane.x + (rw - drawW) / 2;
		oy = plane.y;
	}

	const originX = ox + drawW / 2;
	const originY = oy + drawH / 2;
	const cx = plane.x + plane.w / 2;
	const cy = plane.y + plane.h / 2;
	const bt = active.transforms;
	const gm = globalMotion;

	if (!skipGlobalMotion) {
		ctx.save();
		ctx.translate(cx, cy);
		ctx.scale(gm.scale, gm.scale);
		ctx.translate(gm.translateX, gm.translateY);
		ctx.rotate((gm.rotateZ * Math.PI) / 180);
		ctx.translate(-cx, -cy);
	}

	// Clip to the composition plane so the video never paints over the background
	ctx.save();
	ctx.beginPath();
	ctx.rect(plane.x, plane.y, plane.w, plane.h);
	ctx.clip();

	ctx.globalAlpha *= bt.opacity;
	ctx.translate(originX, originY);
	ctx.scale(bt.scale, bt.scale);
	ctx.translate(bt.x, bt.y);
	ctx.rotate((bt.rotation * Math.PI) / 180);
	ctx.translate(-originX, -originY);
	ctx.drawImage(
		source as CanvasImageSource,
		sx,
		sy,
		sw,
		sh,
		ox,
		oy,
		drawW,
		drawH,
	);
	ctx.restore();

	if (!skipGlobalMotion) {
		ctx.restore();
	}
}
