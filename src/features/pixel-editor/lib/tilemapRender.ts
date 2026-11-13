import {
	computeTileMapLayout,
	type TileMapConfig,
	tileOutline,
	type TileTransform,
	transformTilePixels,
} from "./tilemap";

export type TileMapDrawOptions = {
	/** Integer zoom of the whole map. */
	scale: number;
	/** Outline every map cell. */
	showGrid: boolean;
};

const transformKey = (transform: TileTransform): string =>
	`${transform.flipX ? "x" : ""}${transform.flipY ? "y" : ""}${transform.rotation}`;

/**
 * Draws `source` (one tile) repeated as a map onto `canvas`. The tile size
 * comes from `source`; the rest from `config`.
 */
export function drawTileMap(
	canvas: HTMLCanvasElement,
	source: HTMLCanvasElement,
	config: Omit<TileMapConfig, "tileWidth" | "tileHeight">,
	options: TileMapDrawOptions
): { width: number; height: number } {
	const tileWidth = source.width;
	const tileHeight = source.height;
	const full: TileMapConfig = { ...config, tileWidth, tileHeight };
	const layout = computeTileMapLayout(full);
	const { scale } = options;
	canvas.width = Math.max(1, layout.width * scale);
	canvas.height = Math.max(1, layout.height * scale);
	const context = canvas.getContext("2d");
	const sourceContext = source.getContext("2d");
	if (!context || !sourceContext || tileWidth === 0 || tileHeight === 0) {
		return layout;
	}
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.imageSmoothingEnabled = false;

	const original = new Uint32Array(
		sourceContext.getImageData(0, 0, tileWidth, tileHeight).data.buffer
	);
	const variants = new Map<string, HTMLCanvasElement>();
	const variantFor = (transform: TileTransform): HTMLCanvasElement => {
		const key = transformKey(transform);
		const cached = variants.get(key);
		if (cached) return cached;
		const result = transformTilePixels(
			original,
			tileWidth,
			tileHeight,
			transform
		);
		const variant = document.createElement("canvas");
		variant.width = result.width;
		variant.height = result.height;
		variant
			.getContext("2d")
			?.putImageData(
				new ImageData(
					new Uint8ClampedArray(result.pixels.buffer),
					result.width,
					result.height
				),
				0,
				0
			);
		variants.set(key, variant);
		return variant;
	};

	for (const tile of layout.tiles) {
		const variant = variantFor(tile.transform);
		context.drawImage(
			variant,
			tile.x * scale,
			tile.y * scale,
			variant.width * scale,
			variant.height * scale
		);
	}

	if (options.showGrid) {
		const outline = tileOutline(full);
		context.lineWidth = 1;
		context.strokeStyle = "rgba(56, 189, 248, 0.85)";
		for (const tile of layout.tiles) {
			context.beginPath();
			outline.forEach(([pointX, pointY], index) => {
				const x = Math.round((tile.x + pointX) * scale) + 0.5;
				const y = Math.round((tile.y + pointY) * scale) + 0.5;
				if (index === 0) context.moveTo(x, y);
				else context.lineTo(x, y);
			});
			context.closePath();
			context.stroke();
		}
	}
	return layout;
}
