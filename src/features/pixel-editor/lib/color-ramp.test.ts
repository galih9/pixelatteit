import { describe, expect, it } from "vitest";
import { DEFAULT_COLOR_RAMP } from "../constants";
import { generateColorRamp, hexToRgb, rgbToHsl, stepColorShade } from "./color";

function lightnessOf(hex: string): number {
	const [red, green, blue] = hexToRgb(hex);
	return rgbToHsl(red, green, blue)[2];
}

describe("color ramp and hue shifting", () => {
	it("generates an odd-length ramp centered on the base color", () => {
		const ramp = generateColorRamp("#e04040", {
			...DEFAULT_COLOR_RAMP,
			steps: 5,
		});
		expect(ramp).toHaveLength(5);
		expect(ramp[2]).toBe("#e04040");
		const shadow = lightnessOf(ramp[0] ?? "#000000");
		const mid = lightnessOf(ramp[2] ?? "#000000");
		const highlight = lightnessOf(ramp[4] ?? "#000000");
		expect(shadow).toBeLessThan(mid);
		expect(highlight).toBeGreaterThan(mid);
	});

	it("supports linear hue shifts and quick shade stepping", () => {
		const ramp = generateColorRamp("#40a060", {
			...DEFAULT_COLOR_RAMP,
			mode: "linear",
			steps: 3,
			shadowHueShift: -30,
			highlightHueShift: 25,
		});
		expect(ramp).toHaveLength(3);
		expect(ramp[1]).toBe("#40a060");
		const darker = stepColorShade("#40a060", "shadow", DEFAULT_COLOR_RAMP);
		const lighter = stepColorShade("#40a060", "highlight", DEFAULT_COLOR_RAMP);
		expect(lightnessOf(darker)).toBeLessThan(lightnessOf("#40a060"));
		expect(lightnessOf(lighter)).toBeGreaterThan(lightnessOf("#40a060"));
	});
});
