import { describe, expect, it } from "vitest";
import { substituteGradientAngleInCss } from "./background-css-tokens";
import { previewStageBackgroundStyle } from "./background-preview-style";

describe("substituteGradientAngleInCss", () => {
	it("replaces var(--gradient-angle, Ndeg)", () => {
		const s = "linear-gradient(var(--gradient-angle, 170deg), red, blue)";
		expect(substituteGradientAngleInCss(s, 42)).toBe(
			"linear-gradient(42deg, red, blue)",
		);
	});

	it("replaces bare var(--gradient-angle)", () => {
		const s = "linear-gradient(var(--gradient-angle), red, blue)";
		expect(substituteGradientAngleInCss(s, 90)).toBe(
			"linear-gradient(90deg, red, blue)",
		);
	});
});

describe("previewStageBackgroundStyle", () => {
	it("returns cover image style for image type", () => {
		const st = previewStageBackgroundStyle({
			backgroundType: "image",
			backgroundColor: "ignored",
			gradientAngle: 0,
			imageBackground: "https://example.com/a.jpg",
		});
		expect(st.backgroundImage).toContain("example.com");
		expect(st.backgroundSize).toBe("cover");
	});

	it("inlines gradient angle in background string", () => {
		const st = previewStageBackgroundStyle({
			backgroundType: "gradient",
			backgroundColor:
				"linear-gradient(var(--gradient-angle, 170deg), #000, #fff)",
			gradientAngle: 12,
			imageBackground: null,
		});
		expect(st.background).toBe("linear-gradient(12deg, #000, #fff)");
	});
});
