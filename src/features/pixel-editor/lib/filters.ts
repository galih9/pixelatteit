import type { PixelBuffer, SelectionMask } from "../types";
import { TRANSPARENT } from "./color";
import { createMask, createPixels } from "./raster";

// Pixel byte layout is always R,G,B,A in memory (see color.ts), so we read
// channels through a byte view of the same buffer.
function bytesOf(data: PixelBuffer): Uint8Array {
	return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

const scratch = new Uint8ClampedArray(4);
const scratchWord = new Uint32Array(scratch.buffer);

function pack(red: number, green: number, blue: number, alpha: number): number {
	scratch[0] = red;
	scratch[1] = green;
	scratch[2] = blue;
	scratch[3] = alpha;
	return scratchWord[0] ?? 0;
}

/* -------------------------------------------------------------------------- */
/*                                    Blur                                    */
/* -------------------------------------------------------------------------- */

export type BlurOptions = {
	/** Kernel radius in pixels (1 = 3×3). */
	radius: number;
	/** 0–100, how much of the blurred color replaces the original. */
	strength: number;
	/** Keep transparent pixels transparent and opaque pixels opaque. */
	preserveAlpha: boolean;
	/** When set, results are snapped to the nearest of these colors. */
	palette: Array<number> | null;
};

type Rgb = [number, number, number];

function paletteRgb(palette: Array<number>): Array<Rgb> {
	return palette.map((value) => {
		scratchWord[0] = value;
		return [scratch[0] ?? 0, scratch[1] ?? 0, scratch[2] ?? 0];
	});
}

function nearest(
	colors: Array<Rgb>,
	red: number,
	green: number,
	blue: number
): Rgb {
	let best: Rgb = [red, green, blue];
	let bestDistance = Infinity;
	for (const color of colors) {
		// "Redmean" weighting is a cheap, decent perceptual distance.
		const mean = (red + color[0]) / 2;
		const dr = red - color[0];
		const dg = green - color[1];
		const db = blue - color[2];
		const distance =
			(2 + mean / 256) * dr * dr +
			4 * dg * dg +
			(2 + (255 - mean) / 256) * db * db;
		if (distance < bestDistance) {
			bestDistance = distance;
			best = color;
		}
	}
	return best;
}

/** A blur that can be evaluated one pixel at a time (for the brush). */
export function createBlurSampler(
	base: PixelBuffer,
	width: number,
	height: number,
	options: BlurOptions
): (x: number, y: number) => number {
	const bytes = bytesOf(base);
	const radius = Math.max(1, Math.min(4, Math.round(options.radius)));
	const mix = Math.max(0, Math.min(100, options.strength)) / 100;
	const colors = options.palette ? paletteRgb(options.palette) : null;

	return (x: number, y: number): number => {
		const index = y * width + x;
		const offset = index * 4;
		const alpha = bytes[offset + 3] ?? 0;
		if (options.preserveAlpha && alpha === 0) return base[index] ?? TRANSPARENT;

		let red = 0;
		let green = 0;
		let blue = 0;
		let alphaSum = 0;
		let weightSum = 0;
		for (let dy = -radius; dy <= radius; dy++) {
			const sy = y + dy;
			if (sy < 0 || sy >= height) continue;
			for (let dx = -radius; dx <= radius; dx++) {
				const sx = x + dx;
				if (sx < 0 || sx >= width) continue;
				// Tent weights approximate a small gaussian.
				const weight =
					(radius + 1 - Math.abs(dx)) * (radius + 1 - Math.abs(dy));
				const sample = (sy * width + sx) * 4;
				const sampleAlpha = bytes[sample + 3] ?? 0;
				if (options.preserveAlpha && sampleAlpha === 0) continue;
				// Premultiplied so transparent neighbours don't darken edges.
				const w = weight * (sampleAlpha / 255);
				red += (bytes[sample] ?? 0) * w;
				green += (bytes[sample + 1] ?? 0) * w;
				blue += (bytes[sample + 2] ?? 0) * w;
				alphaSum += sampleAlpha * weight;
				weightSum += weight;
			}
		}
		if (weightSum === 0) return base[index] ?? TRANSPARENT;
		const coverage = alphaSum / 255; // == sum of w
		let blurredAlpha = options.preserveAlpha ? alpha : alphaSum / weightSum;
		let blurredRed = coverage > 0 ? red / coverage : 0;
		let blurredGreen = coverage > 0 ? green / coverage : 0;
		let blurredBlue = coverage > 0 ? blue / coverage : 0;

		// Blend with the original by strength.
		const originalAlpha = alpha;
		if (originalAlpha > 0) {
			blurredRed = (bytes[offset] ?? 0) * (1 - mix) + blurredRed * mix;
			blurredGreen = (bytes[offset + 1] ?? 0) * (1 - mix) + blurredGreen * mix;
			blurredBlue = (bytes[offset + 2] ?? 0) * (1 - mix) + blurredBlue * mix;
		}
		blurredAlpha = originalAlpha * (1 - mix) + blurredAlpha * mix;

		if (colors && colors.length > 0) {
			[blurredRed, blurredGreen, blurredBlue] = nearest(
				colors,
				blurredRed,
				blurredGreen,
				blurredBlue
			);
		}
		if (blurredAlpha < 1) return TRANSPARENT;
		return pack(blurredRed, blurredGreen, blurredBlue, blurredAlpha);
	};
}

/** Blurs the whole buffer (or only the masked pixels) in one pass. */
export function blurPixels(
	data: PixelBuffer,
	width: number,
	height: number,
	mask: SelectionMask | null,
	options: BlurOptions
): PixelBuffer {
	const sample = createBlurSampler(data, width, height, options);
	const result = data.slice();
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			if (mask && mask[index] !== 1) continue;
			result[index] = sample(x, y);
		}
	}
	return result;
}

/* -------------------------------------------------------------------------- */
/*                                  Outline                                   */
/* -------------------------------------------------------------------------- */

export type OutlineCorners = "sharp" | "round" | "cut";

export type OutlineOptions = {
	/** Outline width in pixels ("boldness"). */
	thickness: number;
	/**
	 * sharp = includes diagonals (square), cut = no diagonal corners
	 * (classic 1px pixel-art outline), round = circular for thick outlines.
	 */
	corners: OutlineCorners;
	/** outside = grow around the shape, inside = recolor the shape's edge. */
	placement: "outside" | "inside";
	/** Also outline transparent holes inside the shape. */
	holes: boolean;
	/** "solid" uses `color`; "shade" uses a darker version of the art itself. */
	colorMode: "solid" | "shade";
	color: number;
	/** 0–100, how much darker the shade is. */
	shade: number;
	/** 1–255, pixels at least this opaque count as part of the shape. */
	alphaThreshold: number;
	/** Islands of this many pixels or fewer are not outlined (0 = keep all). */
	ignoreSpecks: number;
};

export const DEFAULT_OUTLINE: OutlineOptions = {
	thickness: 1,
	corners: "cut",
	placement: "outside",
	holes: true,
	colorMode: "solid",
	color: pack(0, 0, 0, 255),
	shade: 55,
	alphaThreshold: 128,
	ignoreSpecks: 0,
};

type Offset = { dx: number; dy: number; distance: number };
const offsetCache = new Map<string, Array<Offset>>();

function outlineOffsets(
	thickness: number,
	corners: OutlineCorners
): Array<Offset> {
	const key = `${thickness}:${corners}`;
	const cached = offsetCache.get(key);
	if (cached) return cached;
	const offsets: Array<Offset> = [];
	const roundLimit = (thickness + 0.5) ** 2;
	for (let dy = -thickness; dy <= thickness; dy++) {
		for (let dx = -thickness; dx <= thickness; dx++) {
			if (dx === 0 && dy === 0) continue;
			if (corners === "cut" && Math.abs(dx) + Math.abs(dy) > thickness)
				continue;
			if (corners === "round" && dx * dx + dy * dy > roundLimit) continue;
			offsets.push({ dx, dy, distance: dx * dx + dy * dy });
		}
	}
	// Nearest first, so the first hit decides the shade color.
	offsets.sort((a, b) => a.distance - b.distance);
	offsetCache.set(key, offsets);
	return offsets;
}

function shadeOf(bytes: Uint8Array, index: number, amount: number): number {
	const keep = 1 - Math.max(0, Math.min(100, amount)) / 100;
	const offset = index * 4;
	const red = bytes[offset] ?? 0;
	const green = bytes[offset + 1] ?? 0;
	const blue = bytes[offset + 2] ?? 0;
	// Darken and nudge toward blue/purple, a common pixel-art shading trick.
	return pack(
		red * keep * 0.95,
		green * keep * 0.95,
		Math.min(255, blue * keep + 18 * (1 - keep)),
		255
	);
}

/** Removes islands (8-connected) with at most `maxSize` pixels. */
function dropSpecks(
	solid: Uint8Array,
	width: number,
	height: number,
	maxSize: number
): void {
	const seen = new Uint8Array(solid.length);
	const stack: Array<number> = [];
	const island: Array<number> = [];
	for (let start = 0; start < solid.length; start++) {
		if (solid[start] !== 1 || seen[start] === 1) continue;
		island.length = 0;
		stack.push(start);
		seen[start] = 1;
		while (stack.length > 0) {
			const index = stack.pop() ?? 0;
			island.push(index);
			const x = index % width;
			const y = (index - x) / width;
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					const nx = x + dx;
					const ny = y + dy;
					if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
					const next = ny * width + nx;
					if (solid[next] !== 1 || seen[next] === 1) continue;
					seen[next] = 1;
					stack.push(next);
				}
			}
		}
		if (island.length <= maxSize) {
			for (const index of island) solid[index] = 0;
		}
	}
}

/** Empty pixels reachable from the canvas border (4-connected). */
function exteriorOf(
	empty: Uint8Array,
	width: number,
	height: number
): Uint8Array {
	const outside = new Uint8Array(empty.length);
	const stack: Array<number> = [];
	const push = (index: number): void => {
		if (empty[index] === 1 && outside[index] !== 1) {
			outside[index] = 1;
			stack.push(index);
		}
	};
	for (let x = 0; x < width; x++) {
		push(x);
		push((height - 1) * width + x);
	}
	for (let y = 0; y < height; y++) {
		push(y * width);
		push(y * width + width - 1);
	}
	while (stack.length > 0) {
		const index = stack.pop() ?? 0;
		const x = index % width;
		if (x > 0) push(index - 1);
		if (x < width - 1) push(index + 1);
		if (index >= width) push(index - width);
		if (index < empty.length - width) push(index + width);
	}
	return outside;
}

/**
 * Computes outline pixels for `data`. The result only contains the outline
 * (everything else is transparent), so it can be merged or put on a layer.
 * When `mask` is set, only the selected part of the art gets outlined.
 */
export function computeOutline(
	data: PixelBuffer,
	width: number,
	height: number,
	mask: SelectionMask | null,
	options: OutlineOptions
): PixelBuffer {
	const bytes = bytesOf(data);
	const count = width * height;
	const threshold = Math.max(
		1,
		Math.min(255, Math.round(options.alphaThreshold))
	);
	const solid = createMask(width, height);
	const empty = createMask(width, height);
	for (let index = 0; index < count; index++) {
		const opaque = (bytes[index * 4 + 3] ?? 0) >= threshold;
		if (!opaque) empty[index] = 1;
		else if (!mask || mask[index] === 1) solid[index] = 1;
	}
	if (options.ignoreSpecks > 0) {
		dropSpecks(solid, width, height, Math.round(options.ignoreSpecks));
	}
	const eligibleEmpty = options.holes
		? empty
		: exteriorOf(empty, width, height);
	const offsets = outlineOffsets(
		Math.max(1, Math.min(8, Math.round(options.thickness))),
		options.corners
	);
	const result = createPixels(width, height);
	const solidColor = options.color;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = y * width + x;
			const outside = options.placement === "outside";
			if (outside ? eligibleEmpty[index] !== 1 : solid[index] !== 1) continue;
			for (const { dx, dy } of offsets) {
				const nx = x + dx;
				const ny = y + dy;
				if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
				const neighbor = ny * width + nx;
				const hit = outside
					? solid[neighbor] === 1
					: eligibleEmpty[neighbor] === 1;
				if (!hit) continue;
				result[index] =
					options.colorMode === "solid"
						? solidColor
						: shadeOf(bytes, outside ? neighbor : index, options.shade);
				break;
			}
		}
	}
	return result;
}

/** Draws non-transparent pixels of `top` over `base`. */
export function overlayPixels(
	base: PixelBuffer,
	top: PixelBuffer
): PixelBuffer {
	const result = base.slice();
	for (let index = 0; index < result.length; index++) {
		const value = top[index] ?? TRANSPARENT;
		if (value !== TRANSPARENT) result[index] = value;
	}
	return result;
}

export function countOpaque(data: PixelBuffer): number {
	let total = 0;
	for (const value of data) if (value !== TRANSPARENT) total += 1;
	return total;
}
