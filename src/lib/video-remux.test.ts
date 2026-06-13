import { describe, expect, it } from "vitest";
import { needsDurationRepair } from "./video-remux";
import type { VideoMetadata } from "./video-metadata";

const baseMetadata = (
	overrides: Partial<VideoMetadata> = {},
): VideoMetadata => ({
	durationSec: 10,
	width: 1920,
	height: 1080,
	container: "mp4",
	...overrides,
});

describe("needsDurationRepair", () => {
	it("returns false for healthy mp4 metadata", () => {
		const file = new File([new Uint8Array([0])], "clip.mp4", {
			type: "video/mp4",
		});
		expect(needsDurationRepair(baseMetadata(), file)).toBe(false);
	});

	it("returns false for screen recordings when wall-clock duration is trustworthy", () => {
		const file = new File([new Uint8Array([0])], "screen-recording-123.webm", {
			type: "video/webm",
		});
		expect(
			needsDurationRepair(
				baseMetadata({
					container: "webm",
					durationFromRecordedFallback: true,
				}),
				file,
			),
		).toBe(false);
	});

	it("returns true for screen recordings with invalid duration", () => {
		const file = new File([new Uint8Array([0])], "screen-recording-123.webm", {
			type: "video/webm",
		});
		expect(
			needsDurationRepair(
				baseMetadata({ container: "webm", durationSec: Number.NaN }),
				file,
			),
		).toBe(true);
	});

	it("returns false when duration came from recorded fallback but is valid", () => {
		const file = new File([new Uint8Array([0])], "clip.webm", {
			type: "video/webm",
		});
		expect(
			needsDurationRepair(
				baseMetadata({
					container: "webm",
					durationFromRecordedFallback: true,
				}),
				file,
			),
		).toBe(false);
	});

	it("returns false for non-screen webm with trustworthy duration", () => {
		const file = new File([new Uint8Array([0])], "upload.webm", {
			type: "video/webm",
		});
		expect(needsDurationRepair(baseMetadata({ container: "webm" }), file)).toBe(
			false,
		);
	});

	it("returns true for invalid duration on non-webm", () => {
		const file = new File([new Uint8Array([0])], "clip.mov", {
			type: "video/quicktime",
		});
		expect(
			needsDurationRepair(
				baseMetadata({ container: "mov", durationSec: Number.NaN }),
				file,
			),
		).toBe(true);
	});
});
