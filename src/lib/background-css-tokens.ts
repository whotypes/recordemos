/**
 * Replace `var(--gradient-angle, …)` / `var(--gradient-angle)` with a concrete angle so
 * backgrounds render from Zustand state without relying on `:root` CSS variables.
 */
export function substituteGradientAngleInCss(
	css: string,
	gradientAngleDeg: number,
): string {
	return css
		.replace(
			/var\(\s*--gradient-angle\s*,\s*([\d.]+)deg\s*\)/gi,
			`${gradientAngleDeg}deg`,
		)
		.replace(/var\(\s*--gradient-angle\s*\)/gi, `${gradientAngleDeg}deg`);
}
