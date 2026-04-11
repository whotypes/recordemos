import type { CSSProperties } from "react";
import { substituteGradientAngleInCss } from "./background-css-tokens";

export type StageBackgroundType = "solid" | "gradient" | "mesh" | "image";

/**
 * Inline styles for the preview stage (`data-export-preview-outer`) derived only from
 * video-options store fields — same inputs as `fillExportBackground` / export pipeline.
 */
export function previewStageBackgroundStyle(input: {
	backgroundType: StageBackgroundType;
	backgroundColor: string;
	gradientAngle: number;
	imageBackground: string | null;
}): CSSProperties {
	if (input.backgroundType === "image" && input.imageBackground) {
		return {
			backgroundImage: `url(${input.imageBackground})`,
			backgroundSize: "cover",
			backgroundPosition: "center",
			backgroundRepeat: "no-repeat",
		};
	}

	const resolved = substituteGradientAngleInCss(
		input.backgroundColor,
		input.gradientAngle,
	);
	return { background: resolved };
}
