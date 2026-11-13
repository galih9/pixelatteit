import { describe, expect, it } from "vitest";
import {
	cellTransform,
	computeTileMapLayout,
	fitTileMapScale,
	IDENTITY_TRANSFORM,
	type TileMapConfig,
	tileOutline,
	transformTilePixels,
} from "./tilemap";

const config = (patch: Partial<TileMapConfig>): TileMapConfig => ({
	type: "top-down",
	columns: 3,
	rows: 3,
	pattern: "repeat",
	hexOrientation: "flat",
	isoGroundHeight: null,
	tileWidth: 16,
	tileHeight: 16,
	...patch,
});

describe("computeTileMapLayout", () => {
	it("tiles top-down maps on a square grid", () => {
		const layout = computeTileMapLayout(config({ columns: 3, rows: 2 }));
		expect(layout.width).toBe(48);
		expect(layout.height).toBe(32);
		expect(layout.tiles).toHaveLength(6);
		expect(layout.tiles[4]).toMatchObject({ column: 1, row: 1, x: 16, y: 16 });
	});

	it("places isometric tiles on a 2:1 diamond grid", () => {
		const layout = computeTileMapLayout(
			config({ type: "isometric", columns: 2, rows: 2, tileHeight: 16 })
		);
		// Ground diamond height defaults to half the width (8px).
		expect(layout.width).toBe(32);
		expect(layout.height).toBe(8 * 2 + (16 - 8));
		const positions = layout.tiles.map((tile) => [tile.x, tile.y]);
		expect(positions).toContainEqual([8, 0]); // back corner
		expect(positions).toContainEqual([0, 4]); // left
		expect(positions).toContainEqual([16, 4]); // right
		expect(positions).toContainEqual([8, 8]); // front
	});

	it("draws isometric tiles back to front", () => {
		const layout = computeTileMapLayout(
			config({ type: "isometric", columns: 3, rows: 3 })
		);
		for (let index = 1; index < layout.tiles.length; index++) {
			expect(layout.tiles[index]!.y).toBeGreaterThanOrEqual(
				layout.tiles[index - 1]!.y
			);
		}
	});

	it("respects a custom isometric ground height", () => {
		const layout = computeTileMapLayout(
			config({
				type: "isometric",
				columns: 1,
				rows: 2,
				tileWidth: 32,
				tileHeight: 24,
				isoGroundHeight: 12,
			})
		);
		expect(layout.tiles.map((tile) => tile.y)).toEqual([0, 6]);
	});

	it("offsets every other column for flat-top hexagons", () => {
		const layout = computeTileMapLayout(
			config({
				type: "hexagonal",
				hexOrientation: "flat",
				columns: 2,
				rows: 1,
				tileWidth: 16,
				tileHeight: 14,
			})
		);
		const [first, second] = layout.tiles;
		expect(first).toMatchObject({ x: 0, y: 0 });
		expect(second).toMatchObject({ x: 12, y: 7 });
		expect(layout.width).toBe(28);
		expect(layout.height).toBe(21);
	});

	it("offsets every other row for pointy-top hexagons", () => {
		const layout = computeTileMapLayout(
			config({
				type: "hexagonal",
				hexOrientation: "pointy",
				columns: 2,
				rows: 2,
				tileWidth: 14,
				tileHeight: 16,
			})
		);
		const secondRow = layout.tiles.filter((tile) => tile.row === 1);
		expect(secondRow[0]).toMatchObject({ x: 7, y: 12 });
		expect(secondRow[1]).toMatchObject({ x: 21, y: 12 });
		expect(layout.width).toBe(35);
		expect(layout.height).toBe(28);
	});

	it("only applies patterns to top-down maps", () => {
		const hex = computeTileMapLayout(
			config({ type: "hexagonal", pattern: "mirror" })
		);
		expect(
			hex.tiles.every((tile) => tile.transform === IDENTITY_TRANSFORM)
		).toBe(true);
		const flat = computeTileMapLayout(config({ pattern: "mirror" }));
		expect(flat.tiles[1]?.transform.flipX).toBe(true);
	});
});

describe("cellTransform", () => {
	it("mirrors alternating cells", () => {
		expect(cellTransform("mirror", 0, 0, true)).toMatchObject({
			flipX: false,
			flipY: false,
		});
		expect(cellTransform("mirror", 1, 1, true)).toMatchObject({
			flipX: true,
			flipY: true,
		});
	});

	it("rotates square tiles in 90 degree steps", () => {
		const rotations = [0, 1, 2, 3].map(
			(column) => cellTransform("rotate", column, 0, true).rotation
		);
		expect(rotations).toEqual([0, 90, 180, 270]);
	});

	it("only turns non-square tiles by 180 degrees", () => {
		const rotations = [0, 1, 2, 3].map(
			(column) => cellTransform("rotate", column, 0, false).rotation
		);
		expect(rotations).toEqual([0, 180, 0, 180]);
	});
});

describe("tileOutline", () => {
	it("is a rectangle for top-down, a diamond for isometric", () => {
		expect(tileOutline(config({}))).toHaveLength(4);
		expect(tileOutline(config({ type: "isometric" }))).toEqual([
			[8, 8],
			[16, 12],
			[8, 16],
			[0, 12],
		]);
	});

	it("has six corners for hexagons", () => {
		expect(tileOutline(config({ type: "hexagonal" }))).toHaveLength(6);
		expect(
			tileOutline(config({ type: "hexagonal", hexOrientation: "pointy" }))
		).toHaveLength(6);
	});
});

describe("fitTileMapScale", () => {
	it("zooms to the largest whole number that fits", () => {
		expect(fitTileMapScale({ width: 48, height: 48 }, 224, 224)).toBe(4);
		expect(fitTileMapScale({ width: 500, height: 500 }, 224, 224)).toBe(1);
	});
});

describe("transformTilePixels", () => {
	// 2 wide, 3 tall:
	// 1 2
	// 3 4
	// 5 6
	const pixels = new Uint32Array([1, 2, 3, 4, 5, 6]);

	it("flips horizontally and vertically", () => {
		expect([
			...transformTilePixels(pixels, 2, 3, {
				flipX: true,
				flipY: false,
				rotation: 0,
			}).pixels,
		]).toEqual([2, 1, 4, 3, 6, 5]);
		expect([
			...transformTilePixels(pixels, 2, 3, {
				flipX: false,
				flipY: true,
				rotation: 0,
			}).pixels,
		]).toEqual([5, 6, 3, 4, 1, 2]);
	});

	it("rotates clockwise by 90 degrees", () => {
		const result = transformTilePixels(pixels, 2, 3, {
			flipX: false,
			flipY: false,
			rotation: 90,
		});
		expect(result.width).toBe(3);
		expect(result.height).toBe(2);
		// 5 3 1
		// 6 4 2
		expect([...result.pixels]).toEqual([5, 3, 1, 6, 4, 2]);
	});

	it("rotates by 180 and 270 degrees", () => {
		expect([
			...transformTilePixels(pixels, 2, 3, {
				flipX: false,
				flipY: false,
				rotation: 180,
			}).pixels,
		]).toEqual([6, 5, 4, 3, 2, 1]);
		const result = transformTilePixels(pixels, 2, 3, {
			flipX: false,
			flipY: false,
			rotation: 270,
		});
		// 2 4 6
		// 1 3 5
		expect([...result.pixels]).toEqual([2, 4, 6, 1, 3, 5]);
	});
});
