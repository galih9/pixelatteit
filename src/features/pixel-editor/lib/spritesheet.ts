import type {
	Frame,
	FrameTag,
	PixelBuffer,
	SpriteSheetOptions,
} from "../types";

/** Largest side (in pixels) of an exported sprite sheet. */
export const MAX_SHEET_SIDE = 16_384;

export const MAX_SHEET_GRID = 256;

export const DEFAULT_SPRITE_SHEET_OPTIONS: SpriteSheetOptions = {
	layout: "columns",
	rows: 1,
	columns: 8,
	padding: 0,
	margin: 0,
	scale: 1,
	includeUntagged: true,
};

export type SheetCell = {
	/** Index of the animation frame drawn in this cell. */
	frame: number;
	column: number;
	row: number;
	/** Top-left of the cell on the sheet (unscaled pixels). */
	x: number;
	y: number;
	/** The tag this cell belongs to (`tags` layout), otherwise null. */
	tagId: number | null;
};

export type SheetLayout = {
	columns: number;
	rows: number;
	frameWidth: number;
	frameHeight: number;
	/** Sheet size in unscaled pixels. */
	width: number;
	height: number;
	cells: Array<SheetCell>;
	/** Frames that did not fit (only possible with the `custom` layout). */
	skipped: number;
	/** `tags` layout: which row holds which tag (`tagId` null = untagged). */
	tagRows: Array<{ tagId: number | null; name: string; row: number }>;
};

type SlotRow = Array<{ frame: number; tagId: number | null }>;

function clampInt(value: number, min: number, max: number): number {
	const rounded = Math.round(value);
	if (!Number.isFinite(rounded)) return min;
	return Math.max(min, Math.min(max, rounded));
}

function chunk(slots: SlotRow, size: number): Array<SlotRow> {
	const rows: Array<SlotRow> = [];
	for (let start = 0; start < slots.length; start += size) {
		rows.push(slots.slice(start, start + size));
	}
	return rows;
}

/**
 * Works out where each frame goes on the sheet. Pure, so the dialog can use it
 * for a live preview and the exporter for the real thing.
 */
export function computeSheetLayout(
	frameCount: number,
	tags: Array<FrameTag>,
	frameWidth: number,
	frameHeight: number,
	options: SpriteSheetOptions
): SheetLayout {
	const count = Math.max(0, frameCount);
	const padding = Math.max(0, Math.round(options.padding));
	const margin = Math.max(0, Math.round(options.margin));
	const all: SlotRow = Array.from({ length: count }, (_, frame) => ({
		frame,
		tagId: null,
	}));
	const tagRows: SheetLayout["tagRows"] = [];
	let slotRows: Array<SlotRow>;
	let columns: number;
	let rows: number;
	let skipped = 0;

	if (options.layout === "tags" && tags.length > 0) {
		slotRows = [];
		const covered = new Set<number>();
		for (const tag of tags) {
			const from = Math.max(0, tag.from);
			const to = Math.min(count - 1, tag.to);
			if (to < from) continue;
			const row: SlotRow = [];
			for (let frame = from; frame <= to; frame++) {
				row.push({ frame, tagId: tag.id });
				covered.add(frame);
			}
			tagRows.push({ tagId: tag.id, name: tag.name, row: slotRows.length });
			slotRows.push(row);
		}
		if (options.includeUntagged) {
			const rest = all
				.filter((slot) => !covered.has(slot.frame))
				.map((slot) => ({ ...slot }));
			if (rest.length > 0) {
				tagRows.push({
					tagId: null,
					name: "untagged",
					row: slotRows.length,
				});
				slotRows.push(rest);
			}
		}
		columns = Math.max(1, ...slotRows.map((row) => row.length));
		rows = Math.max(1, slotRows.length);
	} else if (options.layout === "rows") {
		const wanted = clampInt(options.rows, 1, Math.max(1, count));
		columns = Math.max(1, Math.ceil(count / wanted));
		slotRows = chunk(all, columns);
		rows = Math.max(1, slotRows.length);
	} else if (options.layout === "custom") {
		columns = clampInt(options.columns, 1, MAX_SHEET_GRID);
		rows = clampInt(options.rows, 1, MAX_SHEET_GRID);
		const capacity = columns * rows;
		skipped = Math.max(0, count - capacity);
		slotRows = chunk(all.slice(0, capacity), columns);
	} else {
		// "columns", and "tags" when there are no tags to split by.
		columns = clampInt(options.columns, 1, Math.max(1, count));
		slotRows = chunk(all, columns);
		rows = Math.max(1, slotRows.length);
	}

	const cells: Array<SheetCell> = [];
	slotRows.forEach((slots, row) => {
		slots.forEach((slot, column) => {
			cells.push({
				frame: slot.frame,
				column,
				row,
				x: margin + column * (frameWidth + padding),
				y: margin + row * (frameHeight + padding),
				tagId: slot.tagId,
			});
		});
	});

	return {
		columns,
		rows,
		frameWidth,
		frameHeight,
		width: margin * 2 + columns * frameWidth + (columns - 1) * padding,
		height: margin * 2 + rows * frameHeight + (rows - 1) * padding,
		cells,
		skipped,
		tagRows,
	};
}

/** Sheet size after scaling. */
export function scaledSheetSize(
	layout: SheetLayout,
	scale: number
): { width: number; height: number } {
	return { width: layout.width * scale, height: layout.height * scale };
}

/** Why the sheet cannot be exported, or null when it is fine. */
export function sheetProblem(
	layout: SheetLayout,
	scale: number
): string | null {
	const { width, height } = scaledSheetSize(layout, scale);
	if (width > MAX_SHEET_SIDE || height > MAX_SHEET_SIDE) {
		return `The sheet would be ${width}×${height}px. The maximum side is ${MAX_SHEET_SIDE}px: lower the scale or change the layout.`;
	}
	return null;
}

/** Nearest-neighbour upscale by an integer factor. */
export function scalePixelBuffer(
	pixels: PixelBuffer,
	width: number,
	height: number,
	scale: number
): PixelBuffer {
	if (scale <= 1) return pixels;
	const outWidth = width * scale;
	const output: PixelBuffer = new Uint32Array(outWidth * height * scale);
	for (let y = 0; y < height; y++) {
		const firstRow = y * scale * outWidth;
		for (let x = 0; x < width; x++) {
			const value = pixels[y * width + x] ?? 0;
			const start = firstRow + x * scale;
			output.fill(value, start, start + scale);
		}
		for (let copy = 1; copy < scale; copy++) {
			output.copyWithin(
				firstRow + copy * outWidth,
				firstRow,
				firstRow + outWidth
			);
		}
	}
	return output;
}

/** Draws every cell of `layout` onto a transparent sheet (unscaled). */
export function renderSheetPixels(
	layout: SheetLayout,
	getFramePixels: (frame: number) => PixelBuffer
): PixelBuffer {
	const sheet: PixelBuffer = new Uint32Array(layout.width * layout.height);
	const { frameWidth, frameHeight } = layout;
	const cache = new Map<number, PixelBuffer>();
	for (const cell of layout.cells) {
		let pixels = cache.get(cell.frame);
		if (!pixels) {
			pixels = getFramePixels(cell.frame);
			cache.set(cell.frame, pixels);
		}
		for (let y = 0; y < frameHeight; y++) {
			const source = pixels.subarray(y * frameWidth, (y + 1) * frameWidth);
			sheet.set(source, (cell.y + y) * layout.width + cell.x);
		}
	}
	return sheet;
}

export type SpriteSheetMetadata = {
	meta: {
		app: string;
		image: string;
		size: { w: number; h: number };
		frameSize: { w: number; h: number };
		scale: number;
		layout: SpriteSheetOptions["layout"];
		columns: number;
		rows: number;
		padding: number;
		margin: number;
	};
	frames: Array<{
		/** Index of the animation frame. */
		index: number;
		/** Name of the tag this cell was placed for, if any. */
		tag: string | null;
		column: number;
		row: number;
		/** Position and size on the finished (scaled) image. */
		frame: { x: number; y: number; w: number; h: number };
		/** Milliseconds. */
		duration: number;
	}>;
	tags: Array<{
		name: string;
		from: number;
		to: number;
		direction: FrameTag["direction"];
		/** Row on the sheet, `tags` layout only. */
		row: number | null;
	}>;
};

/** Describes the sheet for game engines / tools (JSON next to the PNG). */
export function buildSheetMetadata(
	layout: SheetLayout,
	options: SpriteSheetOptions,
	frames: Array<Pick<Frame, "duration">>,
	tags: Array<FrameTag>,
	imageName: string
): SpriteSheetMetadata {
	const scale = options.scale;
	const tagNames = new Map(tags.map((tag) => [tag.id, tag.name]));
	return {
		meta: {
			app: "pixel-editor",
			image: imageName,
			size: { w: layout.width * scale, h: layout.height * scale },
			frameSize: {
				w: layout.frameWidth * scale,
				h: layout.frameHeight * scale,
			},
			scale,
			layout: options.layout,
			columns: layout.columns,
			rows: layout.rows,
			padding: Math.max(0, Math.round(options.padding)) * scale,
			margin: Math.max(0, Math.round(options.margin)) * scale,
		},
		frames: layout.cells.map((cell) => ({
			index: cell.frame,
			tag: cell.tagId === null ? null : (tagNames.get(cell.tagId) ?? null),
			column: cell.column,
			row: cell.row,
			frame: {
				x: cell.x * scale,
				y: cell.y * scale,
				w: layout.frameWidth * scale,
				h: layout.frameHeight * scale,
			},
			duration: frames[cell.frame]?.duration ?? 100,
		})),
		tags: tags.map((tag) => ({
			name: tag.name,
			from: tag.from,
			to: tag.to,
			direction: tag.direction,
			row: layout.tagRows.find((entry) => entry.tagId === tag.id)?.row ?? null,
		})),
	};
}
