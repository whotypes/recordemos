import { describe, expect, it } from "vitest";
import { getDeadZoneStopMs } from "./playback-bounds";
import { TimelineCompiler } from "./timeline-compiler";
import type { ConvexTimelineBlock } from "./types/timeline";
import type { Id } from "../../convex/_generated/dataModel";

function makeVideoBlock(
	overrides: Partial<ConvexTimelineBlock> = {},
): ConvexTimelineBlock {
	return {
		_id: "video1" as Id<"timeline_blocks">,
		_creationTime: 0,
		projectId: "p1" as Id<"projects">,
		trackId: "t1" as Id<"timeline_tracks">,
		blockType: "video",
		startMs: 0,
		durationMs: 9000,
		trimStartMs: 0,
		trimEndMs: 3420,
		zIndex: 0,
		transforms: { scale: 1, x: 0, y: 0, opacity: 1, rotation: 0 },
		metadata: {},
		assetId: "a1" as Id<"assets">,
		createdAt: Date.now(),
		...overrides,
	};
}

describe("getDeadZoneStopMs", () => {
	it("stops past trimmed video end even when timeline ruler is longer", () => {
		const compiler = new TimelineCompiler([
			makeVideoBlock(),
			{
				...makeVideoBlock({
					_id: "zoom1" as Id<"timeline_blocks">,
					blockType: "zoom",
					durationMs: 12420,
					assetId: undefined,
				}),
				metadata: { zoomLevel: 1.5 },
			},
		]);

		expect(compiler.getPlaybackEndMs()).toBe(9000);
		expect(getDeadZoneStopMs(compiler, 11380)).toBe(8999);
	});

	it("does not stop inside active video content", () => {
		const compiler = new TimelineCompiler([makeVideoBlock()]);
		expect(getDeadZoneStopMs(compiler, 5000)).toBeNull();
	});
});
