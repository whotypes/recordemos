import { describe, expect, it } from "vitest";
import { isMp4LikeBlob } from "./export-is-mp4-like";

describe("isMp4LikeBlob", () => {
	it("detects quicktime MIME in format string (store metadata)", () => {
		const blob = new Blob([new Uint8Array([0])], {
			type: "application/octet-stream",
		});
		expect(isMp4LikeBlob(blob, "video/quicktime", undefined)).toBe(true);
	});

	it("uses original filename when blob is octet-stream (Vite /public)", () => {
		const blob = new Blob([new Uint8Array([0])], {
			type: "application/octet-stream",
		});
		expect(isMp4LikeBlob(blob, undefined, "clip.mov")).toBe(true);
		expect(isMp4LikeBlob(blob, undefined, undefined)).toBe(false);
	});

	it("tries WebAV when blob has no MIME (fetch default)", () => {
		const blob = new Blob([new Uint8Array([0])]);
		expect(blob.type).toBe("");
		expect(isMp4LikeBlob(blob, undefined, undefined)).toBe(true);
	});
});
