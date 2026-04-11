import { describe, expect, it } from "vitest";
import {
	computeExportCompositionRect,
	computeCompositionPlaneFromStore,
} from "./export-preview-layout";

function rect(
	left: number,
	top: number,
	width: number,
	height: number,
): DOMRect {
	return {
		left,
		top,
		right: left + width,
		bottom: top + height,
		width,
		height,
		x: left,
		y: top,
		toJSON() {
			return this;
		},
	};
}

describe("computeExportCompositionRect", () => {
	it("maps inset video plane when outer aspect is slightly off 16:9 (flex rounding)", () => {
		const outer = rect(100, 100, 800, 448);
		const innerVp = rect(200, 124, 600, 336);
		const plane = computeExportCompositionRect(
			outer,
			innerVp,
			1920,
			1080,
			"16:9",
		);
		expect(plane.x).toBeGreaterThan(0);
		expect(plane.y).toBeGreaterThan(0);
		expect(plane.w).toBeLessThan(1920);
		expect(plane.h).toBeLessThan(1080);
		expect(plane.x + plane.w).toBeLessThanOrEqual(1920 + 2);
		expect(plane.y + plane.h).toBeLessThanOrEqual(1080 + 2);
	});

	it("still maps full stage when outer matches export aspect", () => {
		const outer = rect(0, 0, 800, 450);
		const innerVp = rect(100, 50, 600, 337);
		const plane = computeExportCompositionRect(
			outer,
			innerVp,
			1920,
			1080,
			"16:9",
		);
		const sx = 1920 / 800;
		expect(plane.x).toBeCloseTo(100 * sx, 5);
		expect(plane.w).toBeCloseTo(600 * sx, 5);
	});
});

describe("computeCompositionPlaneFromStore", () => {
	it("insets a 16:9 video inside a 16:9 export at 100% zoom", () => {
		const plane = computeCompositionPlaneFromStore(1920, 1080, "16:9", 100);
		expect(plane.w).toBeCloseTo(1920 * (672 / 896), 0);
		expect(plane.h).toBeCloseTo(1080 * (672 / 896), 0);
		expect(plane.x).toBeGreaterThan(0);
		expect(plane.y).toBeGreaterThan(0);
		expect(plane.x + plane.w).toBeLessThanOrEqual(1920 + 1);
		expect(plane.y + plane.h).toBeLessThanOrEqual(1080 + 1);
	});

	it("centers the plane horizontally and vertically", () => {
		const plane = computeCompositionPlaneFromStore(1920, 1080, "16:9", 100);
		expect(plane.x).toBeCloseTo((1920 - plane.w) / 2, 1);
		expect(plane.y).toBeCloseTo((1080 - plane.h) / 2, 1);
	});

	it("scales the plane when zoom is < 100", () => {
		const full = computeCompositionPlaneFromStore(1920, 1080, "16:9", 100);
		const half = computeCompositionPlaneFromStore(1920, 1080, "16:9", 50);
		expect(half.w).toBeCloseTo(full.w / 2, 1);
		expect(half.h).toBeCloseTo(full.h / 2, 1);
	});

	it("handles portrait (9:16) aspect ratio inside 16:9 export", () => {
		const plane = computeCompositionPlaneFromStore(1920, 1080, "9:16", 100);
		expect(plane.w).toBeLessThan(plane.h);
		expect(plane.x).toBeGreaterThan(0);
		expect(plane.y).toBeGreaterThanOrEqual(0);
		expect(plane.x + plane.w).toBeLessThanOrEqual(1920 + 1);
		expect(plane.y + plane.h).toBeLessThanOrEqual(1080 + 1);
	});

	it("handles 1:1 aspect ratio inside 16:9 export", () => {
		const plane = computeCompositionPlaneFromStore(1920, 1080, "1:1", 100);
		expect(Math.abs(plane.w - plane.h)).toBeLessThan(1);
		expect(plane.x).toBeGreaterThan(0);
		expect(plane.y).toBeGreaterThanOrEqual(0);
	});
});
