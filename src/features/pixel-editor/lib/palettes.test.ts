import { describe, expect, it } from "vitest";
import {
	BUILT_IN_PALETTES,
	findMatchingPalette,
	parseHexPalette,
} from "./palettes";

describe("built-in palettes", () => {
	it("loads all 18 hex palettes from assets/palletes with PICO-8 first", () => {
		expect(BUILT_IN_PALETTES).toHaveLength(18);
		expect(BUILT_IN_PALETTES[0]?.id).toBe("pico-8");
		expect(BUILT_IN_PALETTES[0]?.colors).toHaveLength(16);
		for (const palette of BUILT_IN_PALETTES) {
			expect(palette.name.length).toBeGreaterThan(0);
			expect(palette.colors.length).toBeGreaterThan(0);
			for (const hex of palette.colors) {
				expect(hex).toMatch(/^#[0-9a-f]{6}$/);
			}
		}
	});

	it("parses deduplicated hex lines with CRLF/LF and ignores invalid rows", () => {
		expect(
			parseHexPalette("FF0000\r\n#ff0000\n00ff00\nnot-a-color\n  #0000FF \r\n")
		).toEqual(["#ff0000", "#00ff00", "#0000ff"]);
	});

	it("matches an existing palette preset case-insensitively", () => {
		const pico = BUILT_IN_PALETTES[0];
		expect(pico).toBeDefined();
		const upper = pico?.colors.map((color) => color.toUpperCase()) ?? [];
		expect(findMatchingPalette(upper)?.id).toBe("pico-8");
		expect(findMatchingPalette(["#123456"])).toBeNull();
	});
});
