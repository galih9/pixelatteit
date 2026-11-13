import type {
	HexOrientation,
	PixelBuffer,
	TileMapPattern,
	TileMapType,
} from "../types";

export const TILEMAP_SIZES: Array<number> = [2, 3, 4, 6, 8];

export type TileTransform = {
	flipX: boolean;
	flipY: boolean;
	/** Clockwise, applied after flipping. */
	rotation: 0 | 90 | 180 | 270;
};

export type TileMapConfig = {
	type: TileMapType;
	columns: number;
	rows: number;
	/** Top-down only; other map types always repeat the tile. */
	pattern: TileMapPattern;
	hexOrientation: HexOrientation;
	/**
	 * Isometric: height of the flat ground diamond at the bottom of the tile
	 * image. null = half the tile width (the common 2:1 isometric ratio).
	 */
	isoGroundHeight: number | null;
	tileWidth: number;
	tileHeight: number;
};

export type TilePlacement = {
	column: number;
	row: number;
	/** Top-left of the tile image, in tile pixels. */
	x: number;
	y: number;
	transform: TileTransform;
};

export type TileMapLayout = {
	/** Size of the whole map in tile pixels. */
	width: number;
	height: number;
	/** In drawing order (back to front). */
	tiles: Array<TilePlacement>;
};

export const IDENTITY_TRANSFORM: TileTransform = {
	flipX: false,
	flipY: false,
	rotation: 0,
};

/** The variation applied to the tile in cell (`column`, `row`). */
export function cellTransform(
	pattern: TileMapPattern,
	column: number,
	row: number,
	square: boolean
): TileTransform {
	if (pattern === "mirror") {
		return {
			flipX: column % 2 === 1,
			flipY: row % 2 === 1,
			rotation: 0,
		};
	}
	if (pattern === "rotate") {
		if (square) {
			const steps = (column + 2 * row) % 4;
			return {
				flipX: false,
				flipY: false,
				rotation: (steps * 90) as TileTransform["rotation"],
			};
		}
		return {
			flipX: false,
			flipY: false,
			rotation: (column + row) % 2 === 1 ? 180 : 0,
		};
	}
	return IDENTITY_TRANSFORM;
}

export function isoGroundHeight(config: TileMapConfig): number {
	const wanted = config.isoGroundHeight ?? Math.floor(config.tileWidth / 2);
	return Math.max(1, Math.min(config.tileHeight, Math.round(wanted)));
}

/** Places every tile of the map. */
export function computeTileMapLayout(config: TileMapConfig): TileMapLayout {
	const columns = Math.max(1, Math.round(config.columns));
	const rows = Math.max(1, Math.round(config.rows));
	const { tileWidth: tileW, tileHeight: tileH } = config;
	const square = tileW === tileH;
	const pattern = config.type === "top-down" ? config.pattern : "repeat";
	const tiles: Array<TilePlacement> = [];

	for (let row = 0; row < rows; row++) {
		for (let column = 0; column < columns; column++) {
			let x = 0;
			let y = 0;
			if (config.type === "top-down") {
				x = column * tileW;
				y = row * tileH;
			} else if (config.type === "isometric") {
				const halfW = tileW / 2;
				const halfD = isoGroundHeight(config) / 2;
				x = Math.round((column - row + (rows - 1)) * halfW);
				y = Math.round((column + row) * halfD);
			} else if (config.hexOrientation === "flat") {
				x = column * Math.round(tileW * 0.75);
				y = row * tileH + (column % 2 === 1 ? Math.round(tileH / 2) : 0);
			} else {
				x = column * tileW + (row % 2 === 1 ? Math.round(tileW / 2) : 0);
				y = row * Math.round(tileH * 0.75);
			}
			tiles.push({
				column,
				row,
				x,
				y,
				transform: cellTransform(pattern, column, row, square),
			});
		}
	}

	if (config.type !== "top-down") {
		// Back to front, so lower tiles overlap the ones behind them.
		tiles.sort((a, b) => a.y - b.y || a.x - b.x);
	}

	let width = 0;
	let height = 0;
	for (const tile of tiles) {
		width = Math.max(width, tile.x + tileW);
		height = Math.max(height, tile.y + tileH);
	}
	return { width, height, tiles };
}

/**
 * The outline of one map cell relative to the tile image's top-left, used for
 * the grid overlay. Closed polygon without repeating the first point.
 */
export function tileOutline(config: TileMapConfig): Array<[number, number]> {
	const w = config.tileWidth;
	const h = config.tileHeight;
	if (config.type === "isometric") {
		const ground = isoGroundHeight(config);
		const top = h - ground;
		return [
			[w / 2, top],
			[w, top + ground / 2],
			[w / 2, h],
			[0, top + ground / 2],
		];
	}
	if (config.type === "hexagonal") {
		if (config.hexOrientation === "flat") {
			return [
				[w / 4, 0],
				[(w * 3) / 4, 0],
				[w, h / 2],
				[(w * 3) / 4, h],
				[w / 4, h],
				[0, h / 2],
			];
		}
		return [
			[w / 2, 0],
			[w, h / 4],
			[w, (h * 3) / 4],
			[w / 2, h],
			[0, (h * 3) / 4],
			[0, h / 4],
		];
	}
	return [
		[0, 0],
		[w, 0],
		[w, h],
		[0, h],
	];
}

/** Integer zoom that makes the map fit in a box (never below 1). */
export function fitTileMapScale(
	layout: Pick<TileMapLayout, "width" | "height">,
	boxWidth: number,
	boxHeight: number
): number {
	if (layout.width <= 0 || layout.height <= 0) return 1;
	return Math.max(
		1,
		Math.floor(Math.min(boxWidth / layout.width, boxHeight / layout.height))
	);
}

/** Flips and rotates tile pixels exactly (no resampling). */
export function transformTilePixels(
	pixels: PixelBuffer,
	width: number,
	height: number,
	transform: TileTransform
): { pixels: PixelBuffer; width: number; height: number } {
	let current: PixelBuffer = pixels;
	if (transform.flipX || transform.flipY) {
		current = new Uint32Array(pixels.length);
		for (let y = 0; y < height; y++) {
			const sourceY = transform.flipY ? height - 1 - y : y;
			for (let x = 0; x < width; x++) {
				const sourceX = transform.flipX ? width - 1 - x : x;
				current[y * width + x] = pixels[sourceY * width + sourceX] ?? 0;
			}
		}
	}
	const { rotation } = transform;
	if (rotation === 0) return { pixels: current, width, height };
	const source = current;
	if (rotation === 180) {
		const output: PixelBuffer = new Uint32Array(source.length);
		for (let index = 0; index < source.length; index++) {
			output[index] = source[source.length - 1 - index] ?? 0;
		}
		return { pixels: output, width, height };
	}
	// 90° steps swap the dimensions.
	const output: PixelBuffer = new Uint32Array(source.length);
	for (let yNew = 0; yNew < width; yNew++) {
		for (let xNew = 0; xNew < height; xNew++) {
			output[yNew * height + xNew] =
				rotation === 90
					? (source[(height - 1 - xNew) * width + yNew] ?? 0)
					: (source[xNew * width + (width - 1 - yNew)] ?? 0);
		}
	}
	return { pixels: output, width: height, height: width };
}
