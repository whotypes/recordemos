/**
 * Canvas 2D background painting for export — same store fields as `previewStageBackgroundStyle`
 * (`src/lib/background-preview-style.ts`). Mesh / complex stacks use SVG foreignObject rasterization.
 */

import { substituteGradientAngleInCss } from "./background-css-tokens";

export type ExportCanvas2D =
	| CanvasRenderingContext2D
	| OffscreenCanvasRenderingContext2D;

function extractLinearGradientBody(css: string): string | null {
	const lower = css.toLowerCase();
	const idx = lower.indexOf("linear-gradient(");
	if (idx === -1) return null;
	let i = idx + "linear-gradient(".length;
	let depth = 1;
	const start = i;
	while (i < css.length && depth > 0) {
		const c = css[i]!;
		if (c === "(") depth++;
		else if (c === ")") depth--;
		i++;
	}
	if (depth !== 0) return null;
	return css.slice(start, i - 1);
}

function splitTopLevelCommas(s: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (c === "(") depth++;
		else if (c === ")") depth = Math.max(0, depth - 1);
		else if (c === "," && depth === 0) {
			parts.push(s.slice(start, i).trim());
			start = i + 1;
		}
	}
	parts.push(s.slice(start).trim());
	return parts.filter(Boolean);
}

function sideKeywordToDegrees(token: string): number | null {
	const t = token.trim().toLowerCase().replace(/\s+/g, " ");
	const map: Record<string, number> = {
		"to top": 0,
		"to top right": 45,
		"to right": 90,
		"to bottom right": 135,
		"to bottom": 180,
		"to bottom left": 225,
		"to left": 270,
		"to top left": 315,
	};
	return map[t] ?? null;
}

function parseAngleFromFirstToken(token: string): number | null {
	const t = token.trim().toLowerCase();
	const deg = t.match(/^(-?[\d.]+)deg$/);
	if (deg) return Number.parseFloat(deg[1]!);
	const rad = t.match(/^(-?[\d.]+)rad$/);
	if (rad) return (Number.parseFloat(rad[1]!) * 180) / Math.PI;
	const turn = t.match(/^(-?[\d.]+)turn$/);
	if (turn) return Number.parseFloat(turn[1]!) * 360;
	return sideKeywordToDegrees(t);
}

export interface GradientStop {
	color: string;
	/** 0–1 along gradient line, undefined = distribute evenly */
	position?: number;
}

function tryParseColorStop(part: string): GradientStop | null {
	const re = /(-?[\d.]+%)\s*$/i;
	const m = part.match(re);
	if (m) {
		const color = part.slice(0, m.index).trim();
		const pct = Number.parseFloat(m[1]!.replace("%", ""));
		if (!color) return null;
		return { color, position: Math.min(1, Math.max(0, pct / 100)) };
	}
	return { color: part.trim() };
}

function parseLinearGradientStops(
	inner: string,
): { angleDeg: number; stops: GradientStop[] } | null {
	const parts = splitTopLevelCommas(inner);
	if (parts.length < 2) return null;

	let angleDeg = 180;
	let firstStopIdx = 0;

	const angleFromFirst = parseAngleFromFirstToken(parts[0]!);
	if (angleFromFirst !== null) {
		angleDeg = angleFromFirst;
		firstStopIdx = 1;
	}

	const stopParts = parts.slice(firstStopIdx);
	if (stopParts.length < 2) return null;

	const stops: GradientStop[] = [];
	for (const p of stopParts) {
		const s = tryParseColorStop(p);
		if (s) stops.push(s);
	}
	if (stops.length < 2) return null;

	let assigned = 0;
	const n = stops.length;
	for (let i = 0; i < n; i++) {
		if (stops[i]!.position === undefined) assigned++;
	}
	if (assigned === n) {
		for (let i = 0; i < n; i++) {
			stops[i]!.position = n === 1 ? 0 : i / (n - 1);
		}
	} else {
		for (let i = 0; i < n; i++) {
			if (stops[i]!.position !== undefined) continue;
			let prev = i - 1;
			while (prev >= 0 && stops[prev]!.position === undefined) prev--;
			let next = i + 1;
			while (next < n && stops[next]!.position === undefined) next++;
			const p0 = prev >= 0 ? stops[prev]!.position! : 0;
			const p1 = next < n ? stops[next]!.position! : 1;
			const runStart = prev + 1;
			const runEnd = next - 1;
			const count = runEnd - runStart + 1;
			for (let k = 0; k < count; k++) {
				const t = (k + 1) / (count + 1);
				stops[runStart + k]!.position = p0 + (p1 - p0) * t;
			}
		}
	}

	return { angleDeg, stops };
}

function createCanvasLinearGradientFromCss(
	ctx: ExportCanvas2D,
	width: number,
	height: number,
	innerResolved: string,
): CanvasGradient | null {
	const parsed = parseLinearGradientStops(innerResolved);
	if (!parsed) return null;

	const cx = width / 2;
	const cy = height / 2;
	const rad = (parsed.angleDeg * Math.PI) / 180;
	const ux = Math.sin(rad);
	const uy = -Math.cos(rad);
	const L = Math.hypot(width, height) / 2;
	const g = ctx.createLinearGradient(
		cx - ux * L,
		cy - uy * L,
		cx + ux * L,
		cy + uy * L,
	);
	for (const s of parsed.stops) {
		g.addColorStop(s.position ?? 0, s.color);
	}
	return g;
}

export function drawImageCover(
	ctx: ExportCanvas2D,
	img: CanvasImageSource,
	cw: number,
	ch: number,
) {
	const w =
		"naturalWidth" in img && img.naturalWidth
			? img.naturalWidth
			: (img as HTMLVideoElement).videoWidth;
	const h =
		"naturalHeight" in img && img.naturalHeight
			? img.naturalHeight
			: (img as HTMLVideoElement).videoHeight;
	if (!w || !h) return;
	const scale = Math.max(cw / w, ch / h);
	const dw = w * scale;
	const dh = h * scale;
	const dx = (cw - dw) / 2;
	const dy = (ch - dh) / 2;
	ctx.drawImage(img, dx, dy, dw, dh);
}

function rasterizeCssBackgroundToCanvas(
	width: number,
	height: number,
	backgroundCss: string,
): Promise<HTMLCanvasElement | null> {
	const escaped = backgroundCss
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

	const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;margin:0;background:${escaped}"></div>
  </foreignObject>
</svg>`;

	return new Promise((resolve) => {
		const img = new Image();
		const url = URL.createObjectURL(
			new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
		);
		const done = (canvas: HTMLCanvasElement | null) => {
			URL.revokeObjectURL(url);
			resolve(canvas);
		};
		img.onload = () => {
			try {
				const c = document.createElement("canvas");
				c.width = width;
				c.height = height;
				const cctx = c.getContext("2d");
				if (!cctx) {
					done(null);
					return;
				}
				cctx.drawImage(img, 0, 0);
				done(c);
			} catch {
				done(null);
			}
		};
		img.onerror = () => done(null);
		img.src = url;
	});
}

export type ExportBackgroundType = "solid" | "gradient" | "mesh" | "image";

export type ExportBackgroundParams = {
	backgroundType: ExportBackgroundType;
	backgroundColor: string;
	gradientAngleDeg: number;
	imageElement: HTMLImageElement | null;
};

export async function fillExportBackground(
	ctx: ExportCanvas2D,
	width: number,
	height: number,
	params: {
		backgroundType: ExportBackgroundType;
		backgroundColor: string;
		gradientAngleDeg: number;
		imageElement: HTMLImageElement | null;
	},
): Promise<void> {
	const { backgroundType, backgroundColor, gradientAngleDeg, imageElement } =
		params;

	if (backgroundType === "image" && imageElement) {
		drawImageCover(ctx, imageElement, width, height);
		return;
	}

	if (backgroundType === "solid") {
		ctx.fillStyle = backgroundColor;
		ctx.fillRect(0, 0, width, height);
		return;
	}

	const resolved = substituteGradientAngleInCss(
		backgroundColor,
		gradientAngleDeg,
	);

	if (backgroundType === "gradient") {
		const body = extractLinearGradientBody(resolved);
		if (body) {
			const g = createCanvasLinearGradientFromCss(ctx, width, height, body);
			if (g) {
				ctx.fillStyle = g;
				ctx.fillRect(0, 0, width, height);
				return;
			}
		}
		const raster = await rasterizeCssBackgroundToCanvas(
			width,
			height,
			resolved,
		);
		if (raster) {
			ctx.drawImage(raster, 0, 0);
			return;
		}
		ctx.fillStyle = "#1a1a1a";
		ctx.fillRect(0, 0, width, height);
		return;
	}

	if (backgroundType === "mesh") {
		const raster = await rasterizeCssBackgroundToCanvas(
			width,
			height,
			resolved,
		);
		if (raster) {
			ctx.drawImage(raster, 0, 0);
			return;
		}
		ctx.fillStyle = "#1a1a1a";
		ctx.fillRect(0, 0, width, height);
		return;
	}

	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, width, height);
}
