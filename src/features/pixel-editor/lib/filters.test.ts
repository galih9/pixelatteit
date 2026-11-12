import { describe, expect, it } from "vitest";
import { rgbaToPacked, TRANSPARENT } from "./color";
import {
	blurPixels,
	computeOutline,
	DEFAULT_OUTLINE,
	type OutlineOptions,
} from "./filters";
import { compositeLayers } from "./layers";
import { createPixels } from "./raster";
import { fontProblems, renderText } from "./text";

const RED = rgbaToPacked(255, 0, 0);
const BLUE = rgbaToPacked(0, 0, 255);
const BLACK = rgbaToPacked(0, 0, 0);

/** Builds a buffer from rows where "#" = red and "." = transparent. */
function art(rows: Array<string>): {
	data: ReturnType<typeof createPixels>;
	width: number;
	height: number;
} {
	const height = rows.length;
	const width = rows[0]?.length ?? 0;
	const data = createPixels(width, height);
	rows.forEach((row, y) => {
		for (let x = 0; x < width; x++)
			if (row[x] === "#") data[y * width + x] = RED;
	});
	return { data, width, height };
}

function show(data: Uint32Array, width: number): string {
	const rows: Array<string> = [];
	for (let y = 0; y < data.length / width; y++) {
		let row = "";
		for (let x = 0; x < width; x++) {
			row += data[y * width + x] === TRANSPARENT ? "." : "o";
		}
		rows.push(row);
	}
	return rows.join("\n");
}

const outline = (
	rows: Array<string>,
	options: Partial<OutlineOptions> = {}
): string => {
	const { data, width, height } = art(rows);
	return show(
		computeOutline(data, width, height, null, {
			...DEFAULT_OUTLINE,
			color: BLACK,
			...options,
		}),
		width
	);
};

describe("outline", () => {
	const dot = [".....", ".....", "..#..", ".....", "....."];

	it("clean corners skip diagonals", () => {
		expect(outline(dot)).toBe(
			[".....", "..o..", ".o.o.", "..o..", "....."].join("\n")
		);
	});

	it("square corners include diagonals", () => {
		expect(outline(dot, { corners: "sharp" })).toBe(
			[".....", ".ooo.", ".o.o.", ".ooo.", "....."].join("\n")
		);
	});

	it("thickness grows the outline", () => {
		expect(outline(dot, { thickness: 2, corners: "sharp" })).toBe(
			["ooooo", "ooooo", "oo.oo", "ooooo", "ooooo"].join("\n")
		);
	});

	it("inside placement recolors the edge only", () => {
		const block = [".....", ".###.", ".###.", ".###.", "....."];
		expect(outline(block, { placement: "inside" })).toBe(
			[".....", ".ooo.", ".o.o.", ".ooo.", "....."].join("\n")
		);
	});

	it("can skip holes", () => {
		const ring = ["#####", "#...#", "#...#", "#...#", "#####"];
		expect(outline(ring, { holes: false })).toBe(
			[".....", ".....", ".....", ".....", "....."].join("\n")
		);
		expect(outline(ring, { holes: true })).toContain("o");
	});

	it("ignores specks", () => {
		const rows = ["#......", ".......", "...###.", "...###.", "......."];
		const result = outline(rows, { ignoreSpecks: 1 });
		expect(result.split("\n")[0]?.[1]).toBe(".");
		expect(result.split("\n")[1]?.[4]).toBe("o");
	});
});

describe("layers", () => {
	it("blends with opacity", () => {
		const bottom = createPixels(1, 1);
		bottom[0] = BLUE;
		const top = createPixels(1, 1);
		top[0] = RED;
		const result = compositeLayers(
			[
				{ pixels: bottom, visible: true, opacity: 100 },
				{ pixels: top, visible: true, opacity: 50 },
			],
			1
		);
		const bytes = new Uint8Array(result.buffer);
		expect(bytes[0]).toBeGreaterThan(120);
		expect(bytes[0]).toBeLessThan(135);
		expect(bytes[2]).toBeGreaterThan(120);
		expect(bytes[3]).toBe(255);
	});

	it("skips hidden layers", () => {
		const bottom = createPixels(1, 1);
		bottom[0] = BLUE;
		const top = createPixels(1, 1);
		top[0] = RED;
		const result = compositeLayers(
			[
				{ pixels: bottom, visible: true, opacity: 100 },
				{ pixels: top, visible: false, opacity: 100 },
			],
			1
		);
		expect(result[0]).toBe(BLUE);
	});
});

describe("blur", () => {
	it("keeps transparency when asked", () => {
		const { data, width, height } = art([".....", ".###.", "....."]);
		data[7] = BLUE;
		const result = blurPixels(data, width, height, null, {
			radius: 1,
			strength: 100,
			preserveAlpha: true,
			palette: null,
		});
		expect(result[0]).toBe(TRANSPARENT);
		expect(result[7]).not.toBe(BLUE);
		expect(new Uint8Array(result.buffer)[7 * 4 + 3]).toBe(255);
	});

	it("can snap to a palette", () => {
		const { data, width, height } = art(["###"]);
		data[1] = BLUE;
		const result = blurPixels(data, width, height, null, {
			radius: 1,
			strength: 100,
			preserveAlpha: true,
			palette: [RED, BLUE],
		});
		for (const value of result) expect([RED, BLUE]).toContain(value);
	});
});

describe("pixel fonts", () => {
	it("has well-formed glyphs for all printable ASCII", () => {
		expect(fontProblems()).toEqual([]);
	});

	it("renders text in both pixel fonts", () => {
		for (const font of ["pixel-3x5", "pixel-5x7"] as const) {
			const bitmap = renderText("Hi!", {
				font,
				scale: 1,
				size: 12,
				bold: false,
				spacing: 1,
			});
			expect(bitmap.height).toBe(font === "pixel-3x5" ? 5 : 9);
			expect(bitmap.mask.includes(1)).toBe(true);
		}
	});

	it("scales pixel fonts", () => {
		const style = {
			font: "pixel-3x5",
			size: 12,
			bold: false,
			spacing: 1,
		} as const;
		const one = renderText("A", { ...style, scale: 1 });
		const two = renderText("A", { ...style, scale: 2 });
		expect(two.width).toBe(one.width * 2);
		expect(two.height).toBe(one.height * 2);
	});
});
