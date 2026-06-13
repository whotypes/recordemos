import { describe, expect, it } from "vitest";
import { isValidDuration, resolveLayoutDurationSec } from "./video-metadata";

describe("isValidDuration", () => {
	it("rejects Infinity and NaN", () => {
		expect(isValidDuration(Number.POSITIVE_INFINITY)).toBe(false);
		expect(isValidDuration(Number.NaN)).toBe(false);
		expect(isValidDuration(0)).toBe(false);
	});

	it("accepts positive finite values", () => {
		expect(isValidDuration(12.5)).toBe(true);
	});
});

describe("resolveLayoutDurationSec", () => {
	const blocks = [{ start: 0, duration: 15 }];

	it("uses block extent when blocks exist", () => {
		expect(resolveLayoutDurationSec(20, blocks)).toBe(15);
	});

	it("falls back to video duration when no blocks", () => {
		expect(resolveLayoutDurationSec(20, [])).toBe(20);
	});

	it("falls back to blocks when video duration is Infinity", () => {
		expect(resolveLayoutDurationSec(Number.POSITIVE_INFINITY, blocks)).toBe(15);
	});

	it("returns 0 when nothing is valid", () => {
		expect(resolveLayoutDurationSec(Number.POSITIVE_INFINITY, [])).toBe(0);
	});
});
