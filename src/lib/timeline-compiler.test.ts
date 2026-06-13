import { describe, expect, it } from "vitest";
import { TimelineCompiler } from "./timeline-compiler";
import type { ConvexTimelineBlock } from "./types/timeline";
import type { Id } from "../../convex/_generated/dataModel";

function makeVideoBlock(overrides: Partial<ConvexTimelineBlock> = {}): ConvexTimelineBlock {
	return {
		_id: "video1" as Id<"timeline_blocks">,
		_creationTime: 0,
		projectId: "p1" as Id<"projects">,
		trackId: "t1" as Id<"timeline_tracks">,
		blockType: "video",
		startMs: 0,
		durationMs: 5000,
		trimStartMs: 0,
		trimEndMs: 0,
		zIndex: 0,
		transforms: { scale: 1, x: 0, y: 0, opacity: 1, rotation: 0 },
		metadata: {},
		assetId: "a1" as Id<"assets">,
		createdAt: Date.now(),
		...overrides,
	};
}

describe("TimelineCompiler overlay effects", () => {
	it("applies zoom overlay scale to active video block", () => {
		const compiler = new TimelineCompiler([
			makeVideoBlock(),
			{
				...makeVideoBlock({
					_id: "zoom1" as Id<"timeline_blocks">,
					blockType: "zoom",
					startMs: 1000,
					durationMs: 2000,
					zIndex: 1,
					assetId: undefined,
				}),
				metadata: { zoomLevel: 2 },
			},
		]);

		const active = compiler.getActiveVideoBlock(1500);
		expect(active?.transforms.scale).toBe(2);
	});

	it("applies pan overlay crop to active video block", () => {
		const compiler = new TimelineCompiler([
			makeVideoBlock(),
			{
				...makeVideoBlock({
					_id: "pan1" as Id<"timeline_blocks">,
					blockType: "pan",
					startMs: 0,
					durationMs: 5000,
					zIndex: 1,
					assetId: undefined,
				}),
				metadata: { cropX: 10, cropY: 20, cropW: 50, cropH: 60 },
			},
		]);

		const active = compiler.getActiveVideoBlock(1000);
		expect(active?.cropRect).toEqual({
			x: 10,
			y: 20,
			width: 50,
			height: 60,
		});
	});
});

describe("TimelineCompiler playback bounds", () => {
	it("getPlaybackEndMs follows trimmed video block extent", () => {
		const compiler = new TimelineCompiler([
			makeVideoBlock({ durationMs: 5000, trimEndMs: 2000 }),
		]);
		expect(compiler.getPlaybackEndMs()).toBe(5000);
		expect(compiler.getTotalDuration()).toBe(5000);
	});

	it("clamps inAssetTime inside trim window", () => {
		const compiler = new TimelineCompiler([
			makeVideoBlock({ durationMs: 5000, trimStartMs: 1000 }),
		]);
		const active = compiler.getActiveVideoBlock(4999);
		expect(active?.inAssetTime).toBe(5999);
	});
});
