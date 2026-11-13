import { describe, expect, it } from "vitest";
import type { FrameTag, SpriteSheetOptions } from "../types";
import {
	buildSheetMetadata,
	computeSheetLayout,
	DEFAULT_SPRITE_SHEET_OPTIONS,
	MAX_SHEET_SIDE,
	renderSheetPixels,
	scalePixelBuffer,
	sheetProblem,
} from "./spritesheet";

const options = (patch: Partial<SpriteSheetOptions>): SpriteSheetOptions => ({
	...DEFAULT_SPRITE_SHEET_OPTIONS,
	...patch,
});

const tag = (id: number, name: string, from: number, to: number): FrameTag => ({
	id,
	name,
	from,
	to,
	color: "#fff",
	direction: "forward",
});

describe("computeSheetLayout", () => {
	it("uses a fixed number of columns and derives the rows", () => {
		const layout = computeSheetLayout(
			10,
			[],
			16,
			16,
			options({ layout: "columns", columns: 4 })
		);
		expect(layout.columns).toBe(4);
		expect(layout.rows).toBe(3);
		expect(layout.width).toBe(64);
		expect(layout.height).toBe(48);
		expect(layout.cells).toHaveLength(10);
		expect(layout.cells[9]).toMatchObject({ frame: 9, column: 1, row: 2 });
	});

	it("uses a fixed number of rows and derives the columns", () => {
		const layout = computeSheetLayout(
			10,
			[],
			8,
			8,
			options({ layout: "rows", rows: 3 })
		);
		expect(layout.columns).toBe(4);
		expect(layout.rows).toBe(3);
		expect(layout.cells[4]).toMatchObject({ frame: 4, column: 0, row: 1 });
	});

	it("never creates empty rows when asking for too many rows", () => {
		const layout = computeSheetLayout(
			5,
			[],
			8,
			8,
			options({ layout: "rows", rows: 50 })
		);
		expect(layout.columns).toBe(1);
		expect(layout.rows).toBe(5);
	});

	it("makes a horizontal strip with one row", () => {
		const layout = computeSheetLayout(
			6,
			[],
			8,
			8,
			options({ layout: "rows", rows: 1 })
		);
		expect(layout.columns).toBe(6);
		expect(layout.rows).toBe(1);
	});

	it("supports a custom grid and reports frames that do not fit", () => {
		const layout = computeSheetLayout(
			10,
			[],
			8,
			8,
			options({ layout: "custom", columns: 3, rows: 3 })
		);
		expect(layout.columns).toBe(3);
		expect(layout.rows).toBe(3);
		expect(layout.cells).toHaveLength(9);
		expect(layout.skipped).toBe(1);
	});

	it("keeps a custom grid larger than the frame count", () => {
		const layout = computeSheetLayout(
			2,
			[],
			8,
			8,
			options({ layout: "custom", columns: 4, rows: 2 })
		);
		expect(layout.width).toBe(32);
		expect(layout.height).toBe(16);
		expect(layout.skipped).toBe(0);
	});

	it("puts every tag on its own row", () => {
		const tags = [tag(1, "idle", 0, 1), tag(2, "walk", 2, 5)];
		const layout = computeSheetLayout(
			8,
			tags,
			8,
			8,
			options({ layout: "tags", includeUntagged: false })
		);
		expect(layout.columns).toBe(4);
		expect(layout.rows).toBe(2);
		expect(layout.tagRows).toEqual([
			{ tagId: 1, name: "idle", row: 0 },
			{ tagId: 2, name: "walk", row: 1 },
		]);
		expect(layout.cells.map((cell) => cell.frame)).toEqual([0, 1, 2, 3, 4, 5]);
		expect(layout.cells[2]).toMatchObject({ row: 1, column: 0, tagId: 2 });
	});

	it("adds untagged frames as a last row when asked to", () => {
		const tags = [tag(1, "idle", 0, 1)];
		const layout = computeSheetLayout(
			5,
			tags,
			8,
			8,
			options({ layout: "tags", includeUntagged: true })
		);
		expect(layout.rows).toBe(2);
		expect(layout.columns).toBe(3);
		expect(layout.tagRows[1]).toEqual({
			tagId: null,
			name: "untagged",
			row: 1,
		});
	});

	it("lets overlapping tags share frames", () => {
		const tags = [tag(1, "a", 0, 2), tag(2, "b", 1, 3)];
		const layout = computeSheetLayout(
			4,
			tags,
			8,
			8,
			options({ layout: "tags", includeUntagged: false })
		);
		expect(layout.cells).toHaveLength(6);
	});

	it("clamps tags that reach past the last frame", () => {
		const layout = computeSheetLayout(
			3,
			[tag(1, "long", 0, 99)],
			8,
			8,
			options({ layout: "tags" })
		);
		expect(layout.cells).toHaveLength(3);
	});

	it("falls back to a single row when there are no tags", () => {
		const layout = computeSheetLayout(
			4,
			[],
			8,
			8,
			options({ layout: "tags", columns: 2 })
		);
		expect(layout.tagRows).toEqual([]);
		expect(layout.cells).toHaveLength(4);
	});

	it("adds padding between cells and a margin around the sheet", () => {
		const layout = computeSheetLayout(
			4,
			[],
			10,
			10,
			options({ layout: "columns", columns: 2, padding: 2, margin: 3 })
		);
		expect(layout.width).toBe(3 * 2 + 20 + 2);
		expect(layout.height).toBe(3 * 2 + 20 + 2);
		expect(layout.cells[0]).toMatchObject({ x: 3, y: 3 });
		expect(layout.cells[3]).toMatchObject({ x: 15, y: 15 });
	});
});

describe("renderSheetPixels", () => {
	it("copies each frame into its cell", () => {
		const frames = [
			new Uint32Array([1, 2, 3, 4]),
			new Uint32Array([5, 6, 7, 8]),
		];
		const layout = computeSheetLayout(
			2,
			[],
			2,
			2,
			options({ layout: "columns", columns: 2, padding: 1 })
		);
		const sheet = renderSheetPixels(layout, (frame) => frames[frame]!);
		expect(layout.width).toBe(5);
		expect([...sheet]).toEqual([1, 2, 0, 5, 6, 3, 4, 0, 7, 8]);
	});
});

describe("scalePixelBuffer", () => {
	it("repeats pixels with nearest neighbour scaling", () => {
		const scaled = scalePixelBuffer(new Uint32Array([1, 2, 3, 4]), 2, 2, 2);
		expect([...scaled]).toEqual([
			1, 1, 2, 2, 1, 1, 2, 2, 3, 3, 4, 4, 3, 3, 4, 4,
		]);
	});

	it("returns the input untouched at 1x", () => {
		const pixels = new Uint32Array([1, 2]);
		expect(scalePixelBuffer(pixels, 2, 1, 1)).toBe(pixels);
	});
});

describe("sheetProblem", () => {
	it("flags sheets that exceed the maximum side", () => {
		const layout = computeSheetLayout(
			1,
			[],
			MAX_SHEET_SIDE,
			8,
			options({ layout: "columns", columns: 1 })
		);
		expect(sheetProblem(layout, 1)).toBeNull();
		expect(sheetProblem(layout, 2)).not.toBeNull();
	});
});

describe("buildSheetMetadata", () => {
	it("describes cells in final (scaled) coordinates", () => {
		const tags = [tag(1, "idle", 0, 1)];
		const sheetOptions = options({
			layout: "tags",
			includeUntagged: false,
			scale: 2,
			padding: 1,
		});
		const layout = computeSheetLayout(2, tags, 4, 4, sheetOptions);
		const metadata = buildSheetMetadata(
			layout,
			sheetOptions,
			[{ duration: 100 }, { duration: 250 }],
			tags,
			"hero-sheet.png"
		);
		expect(metadata.meta.image).toBe("hero-sheet.png");
		expect(metadata.meta.size).toEqual({ w: 18, h: 8 });
		expect(metadata.frames[1]).toMatchObject({
			index: 1,
			tag: "idle",
			frame: { x: 10, y: 0, w: 8, h: 8 },
			duration: 250,
		});
		expect(metadata.tags[0]).toMatchObject({ name: "idle", row: 0 });
	});
});
