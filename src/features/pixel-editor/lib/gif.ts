/**
 * A small animated GIF (GIF89a) encoder, written for pixel art:
 * no dithering, exact colors when the animation uses ≤ 255 colors
 * (one palette slot is kept for transparency), nearest-neighbour scaling.
 *
 * GIF has 1-bit transparency only: pixels with alpha < 128 become fully
 * transparent, everything else is fully opaque.
 */
import type { PixelBuffer } from "../types";

export type GifFrame = {
	pixels: PixelBuffer;
	/** Milliseconds. GIF stores 1/100 s, so this is rounded to 10 ms steps. */
	duration: number;
};

export type GifOptions = {
	width: number;
	height: number;
	frames: Array<GifFrame>;
	/** Integer upscale factor (1 = actual size). */
	scale?: number;
	/** 0 = loop forever (default), otherwise the number of repeats. */
	loop?: number;
};

const ALPHA_THRESHOLD = 128;

/** Packed RGBA (little-endian) → 0xRRGGBB. */
function rgbOf(value: number): number {
	return ((value & 0xff) << 16) | (value & 0xff_00) | ((value >>> 16) & 0xff);
}

const isOpaque = (value: number): boolean => value >>> 24 >= ALPHA_THRESHOLD;

/* -------------------------------------------------------------------------- */
/*                                  Palette                                   */
/* -------------------------------------------------------------------------- */

type ColorCount = { rgb: number; count: number };

/** Median cut down to `size` colors. Used only when there are too many. */
function medianCut(colors: Array<ColorCount>, size: number): Array<number> {
	type Box = Array<ColorCount>;
	const channel = (rgb: number, shift: number): number => (rgb >> shift) & 0xff;
	const widest = (box: Box): { shift: number; range: number } => {
		let best = { shift: 16, range: -1 };
		for (const shift of [16, 8, 0]) {
			let min = 255;
			let max = 0;
			for (const { rgb } of box) {
				const value = channel(rgb, shift);
				if (value < min) min = value;
				if (value > max) max = value;
			}
			if (max - min > best.range) best = { shift, range: max - min };
		}
		return best;
	};

	const boxes: Array<Box> = [colors];
	while (boxes.length < size) {
		// Split the box with the widest color range.
		let target = -1;
		let targetRange = 0;
		for (const [index, box] of boxes.entries()) {
			if (box.length < 2) continue;
			const { range } = widest(box);
			if (range > targetRange) {
				targetRange = range;
				target = index;
			}
		}
		const box = boxes[target];
		if (!box) break;
		const { shift } = widest(box);
		box.sort((a, b) => channel(a.rgb, shift) - channel(b.rgb, shift));
		// Split at the weighted median so busy colors get their own box.
		const total = box.reduce((sum, entry) => sum + entry.count, 0);
		let running = 0;
		let cut = 1;
		for (const [index, entry] of box.entries()) {
			running += entry.count;
			if (running >= total / 2) {
				cut = Math.max(1, Math.min(box.length - 1, index + 1));
				break;
			}
		}
		boxes.splice(target, 1, box.slice(0, cut), box.slice(cut));
	}

	return boxes.map((box) => {
		let r = 0;
		let g = 0;
		let b = 0;
		let total = 0;
		for (const { rgb, count } of box) {
			r += channel(rgb, 16) * count;
			g += channel(rgb, 8) * count;
			b += channel(rgb, 0) * count;
			total += count;
		}
		const average = (sum: number): number =>
			Math.round(sum / Math.max(1, total));
		return (average(r) << 16) | (average(g) << 8) | average(b);
	});
}

type Palette = {
	/** 0xRRGGBB per palette index, padded to a power of two. */
	table: Array<number>;
	/** Index used for transparent pixels, or -1 when nothing is transparent. */
	transparent: number;
	/** Packed RGBA → palette index. */
	indexOf: (value: number) => number;
	/** True when colors had to be reduced. */
	reduced: boolean;
	/** Real colors in the table (excluding transparency and padding). */
	count: number;
};

function buildPalette(frames: Array<GifFrame>): Palette {
	const counts = new Map<number, number>();
	let hasTransparent = false;
	for (const { pixels } of frames) {
		for (const value of pixels) {
			if (!isOpaque(value)) {
				hasTransparent = true;
				continue;
			}
			const rgb = rgbOf(value);
			counts.set(rgb, (counts.get(rgb) ?? 0) + 1);
		}
	}
	const maxColors = hasTransparent ? 255 : 256;
	const unique = [...counts.entries()].map(([rgb, count]) => ({ rgb, count }));
	const reduced = unique.length > maxColors;
	const colors = reduced
		? medianCut(unique, maxColors)
		: unique.map((entry) => entry.rgb);

	const lookup = new Map<number, number>();
	if (reduced) {
		// Map each original color to its nearest palette color.
		for (const { rgb } of unique) {
			let best = 0;
			let bestDistance = Infinity;
			for (const [index, candidate] of colors.entries()) {
				const dr = ((rgb >> 16) & 0xff) - ((candidate >> 16) & 0xff);
				const dg = ((rgb >> 8) & 0xff) - ((candidate >> 8) & 0xff);
				const db = (rgb & 0xff) - (candidate & 0xff);
				const distance = dr * dr * 2 + dg * dg * 4 + db * db * 3;
				if (distance < bestDistance) {
					bestDistance = distance;
					best = index;
				}
			}
			lookup.set(rgb, best);
		}
	} else {
		for (const [index, rgb] of colors.entries()) lookup.set(rgb, index);
	}

	const transparent = hasTransparent ? colors.length : -1;
	const used = colors.length + (hasTransparent ? 1 : 0);
	let size = 2;
	while (size < used) size *= 2;
	const table = [...colors];
	while (table.length < size) table.push(0);

	return {
		table,
		transparent,
		reduced,
		count: colors.length,
		indexOf: (value): number =>
			isOpaque(value) ? (lookup.get(rgbOf(value)) ?? 0) : transparent,
	};
}

/* -------------------------------------------------------------------------- */
/*                                    LZW                                     */
/* -------------------------------------------------------------------------- */

class ByteWriter {
	private bytes = new Uint8Array(4096);
	public length = 0;

	private ensure(extra: number): void {
		if (this.length + extra <= this.bytes.length) return;
		let size = this.bytes.length * 2;
		while (size < this.length + extra) size *= 2;
		const next = new Uint8Array(size);
		next.set(this.bytes.subarray(0, this.length));
		this.bytes = next;
	}

	public byte(value: number): void {
		this.ensure(1);
		this.bytes[this.length] = value & 0xff;
		this.length += 1;
	}

	public u16(value: number): void {
		this.byte(value);
		this.byte(value >> 8);
	}

	public ascii(text: string): void {
		for (let index = 0; index < text.length; index++) {
			this.byte(text.charCodeAt(index));
		}
	}

	public array(values: Uint8Array | Array<number>): void {
		this.ensure(values.length);
		this.bytes.set(values, this.length);
		this.length += values.length;
	}

	public result(): Uint8Array<ArrayBuffer> {
		return this.bytes.slice(0, this.length);
	}
}

/** LZW-compresses palette indices the way GIF expects (variable code size). */
export function lzwEncode(
	indices: Uint8Array,
	minCodeSize: number
): Uint8Array<ArrayBuffer> {
	const out = new ByteWriter();
	const clearCode = 1 << minCodeSize;
	const endCode = clearCode + 1;
	let codeSize = minCodeSize + 1;
	let nextCode = endCode + 1;
	const table = new Map<number, number>();
	let buffer = 0;
	let bits = 0;

	const emit = (code: number): void => {
		buffer |= code << bits;
		bits += codeSize;
		while (bits >= 8) {
			out.byte(buffer & 0xff);
			buffer >>>= 8;
			bits -= 8;
		}
	};

	emit(clearCode);
	if (indices.length === 0) {
		emit(endCode);
		if (bits > 0) out.byte(buffer & 0xff);
		return out.result();
	}

	let prefix = indices[0] ?? 0;
	for (let index = 1; index < indices.length; index++) {
		const symbol = indices[index] ?? 0;
		const key = (prefix << 8) | symbol;
		const code = table.get(key);
		if (code !== undefined) {
			prefix = code;
			continue;
		}
		emit(prefix);
		if (nextCode === 4096) {
			// Table full: start over.
			emit(clearCode);
			table.clear();
			codeSize = minCodeSize + 1;
			nextCode = endCode + 1;
		} else {
			if (nextCode >= 1 << codeSize) codeSize += 1;
			table.set(key, nextCode);
			nextCode += 1;
		}
		prefix = symbol;
	}
	emit(prefix);
	emit(endCode);
	if (bits > 0) out.byte(buffer & 0xff);
	return out.result();
}

/* -------------------------------------------------------------------------- */
/*                                   Encoder                                  */
/* -------------------------------------------------------------------------- */

function scaledIndices(
	pixels: PixelBuffer,
	width: number,
	height: number,
	scale: number,
	indexOf: (value: number) => number
): Uint8Array {
	const outWidth = width * scale;
	const result = new Uint8Array(outWidth * height * scale);
	for (let y = 0; y < height; y++) {
		const row = new Uint8Array(outWidth);
		for (let x = 0; x < width; x++) {
			const index = indexOf(pixels[y * width + x] ?? 0);
			row.fill(index, x * scale, x * scale + scale);
		}
		for (let repeat = 0; repeat < scale; repeat++) {
			result.set(row, (y * scale + repeat) * outWidth);
		}
	}
	return result;
}

export type GifResult = {
	bytes: Uint8Array<ArrayBuffer>;
	/** Number of colors in the file (excluding the transparent slot). */
	colors: number;
	/** True when the art had more colors than a GIF can hold. */
	reduced: boolean;
};

export function encodeGif(options: GifOptions): GifResult {
	const { width, height, frames } = options;
	const scale = Math.max(1, Math.round(options.scale ?? 1));
	const loop = Math.max(0, Math.round(options.loop ?? 0));
	const outWidth = width * scale;
	const outHeight = height * scale;
	const palette = buildPalette(frames);
	const tableBits = Math.log2(palette.table.length);
	const minCodeSize = Math.max(2, tableBits);
	const hasTransparent = palette.transparent >= 0;

	const out = new ByteWriter();
	out.ascii("GIF89a");
	// Logical screen descriptor, with a global color table.
	out.u16(outWidth);
	out.u16(outHeight);
	out.byte(0x80 | ((tableBits - 1) << 4) | (tableBits - 1));
	out.byte(hasTransparent ? palette.transparent : 0);
	out.byte(0);
	for (const rgb of palette.table) {
		out.byte(rgb >> 16);
		out.byte(rgb >> 8);
		out.byte(rgb);
	}

	if (frames.length > 1) {
		// NETSCAPE2.0 application extension: loop count.
		out.array([0x21, 0xff, 0x0b]);
		out.ascii("NETSCAPE2.0");
		out.array([0x03, 0x01]);
		out.u16(loop);
		out.byte(0);
	}

	for (const frame of frames) {
		// Graphic control extension. Disposal 2 ("restore to background")
		// clears each frame so transparent areas don't show the previous one.
		const disposal = hasTransparent ? 2 : 1;
		out.array([0x21, 0xf9, 0x04]);
		out.byte((disposal << 2) | (hasTransparent ? 1 : 0));
		// Browsers treat delays under 20 ms as 100 ms, so 20 ms is the floor.
		out.u16(Math.max(2, Math.round(frame.duration / 10)));
		out.byte(hasTransparent ? palette.transparent : 0);
		out.byte(0);

		// Image descriptor: full-size frame, no local color table.
		out.byte(0x2c);
		out.u16(0);
		out.u16(0);
		out.u16(outWidth);
		out.u16(outHeight);
		out.byte(0);

		const data = lzwEncode(
			scaledIndices(frame.pixels, width, height, scale, palette.indexOf),
			minCodeSize
		);
		out.byte(minCodeSize);
		for (let offset = 0; offset < data.length; offset += 255) {
			const block = data.subarray(offset, offset + 255);
			out.byte(block.length);
			out.array(block);
		}
		out.byte(0);
	}

	out.byte(0x3b);
	return {
		bytes: out.result(),
		colors: palette.count,
		reduced: palette.reduced,
	};
}
