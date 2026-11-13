import type {
	Frame,
	FrameTag,
	Layer,
	PixelBuffer,
	TagDirection,
} from "../types";
import { compositeLayers } from "./layers";
import { createPixels } from "./raster";

export const DEFAULT_FRAME_DURATION = 100;
export const MIN_FRAME_DURATION = 10;
export const MAX_FRAME_DURATION = 10_000;

/** Colors offered for new tags (cycled). */
export const TAG_COLORS: Array<string> = [
	"#38bdf8",
	"#f472b6",
	"#facc15",
	"#4ade80",
	"#a78bfa",
	"#fb923c",
	"#f87171",
	"#2dd4bf",
];

let nextFrameId = 1;
let nextTagId = 1;

export function clampDuration(value: number): number {
	return Math.max(
		MIN_FRAME_DURATION,
		Math.min(MAX_FRAME_DURATION, Math.round(value) || DEFAULT_FRAME_DURATION)
	);
}

export function createFrame(
	cels: Frame["cels"] = {},
	duration = DEFAULT_FRAME_DURATION,
	linked?: Frame["linked"]
): Frame {
	const id = nextFrameId;
	nextFrameId += 1;
	return linked
		? { id, duration: clampDuration(duration), cels, linked }
		: { id, duration: clampDuration(duration), cels };
}

export function createTag(
	from: number,
	to: number,
	existing: Array<FrameTag>,
	name?: string
): FrameTag {
	const id = nextTagId;
	nextTagId += 1;
	const used = new Set(existing.map((tag) => tag.name));
	let fallback = "tag";
	for (let number = existing.length + 1; ; number++) {
		fallback = `tag ${number}`;
		if (!used.has(fallback)) break;
	}
	return {
		id,
		name: name?.trim() || fallback,
		from: Math.min(from, to),
		to: Math.max(from, to),
		color: TAG_COLORS[existing.length % TAG_COLORS.length] ?? "#38bdf8",
		direction: "forward",
	};
}

/** Layer pixels → the cels of a frame. */
export function celsOf(layers: Array<Layer>): Frame["cels"] {
	const cels: Frame["cels"] = {};
	for (const layer of layers) {
		if (layer.kind !== "reference") cels[layer.id] = layer.pixels;
	}
	return cels;
}

/** The layers (shared props) with the pixels of `frame`. */
export function layersForFrame(
	layers: Array<Layer>,
	frame: Frame | undefined,
	width: number,
	height: number
): Array<Layer> {
	return layers.map((layer) =>
		layer.kind === "reference"
			? layer
			: {
					...layer,
					pixels: frame?.cels[layer.id] ?? createPixels(width, height),
				}
	);
}

/** Applies `transform` to every cel of a frame. */
export function mapCels(
	cels: Frame["cels"],
	transform: (pixels: PixelBuffer) => PixelBuffer
): Frame["cels"] {
	const result: Frame["cels"] = {};
	for (const [key, pixels] of Object.entries(cels)) {
		if (pixels) result[Number(key)] = transform(pixels);
	}
	return result;
}

/** A copy of `cels` without the cel of layer `layerId`. */
export function withoutCel(
	cels: Frame["cels"],
	layerId: number
): Frame["cels"] {
	const result: Frame["cels"] = {};
	for (const [key, pixels] of Object.entries(cels)) {
		if (pixels && Number(key) !== layerId) result[Number(key)] = pixels;
	}
	return result;
}

/** A frame flattened: visible pixel layers composited with their opacity. */
export function compositeFrame(
	layers: Array<Pick<Layer, "id" | "visible" | "opacity" | "kind">>,
	frame: Pick<Frame, "cels"> | undefined,
	pixelCount: number
): PixelBuffer {
	const inputs = [];
	for (const layer of layers) {
		if (layer.kind === "reference") continue;
		const pixels = frame?.cels[layer.id];
		if (pixels) {
			inputs.push({ pixels, visible: layer.visible, opacity: layer.opacity });
		}
	}
	if (inputs.length === 0) return createPixels(pixelCount, 1);
	return compositeLayers(inputs, pixelCount);
}

/* -------------------------------------------------------------------------- */
/*                Keeping tags in place when frames change                    */
/* -------------------------------------------------------------------------- */

/**
 * A frame was inserted at `index`. Tags after it shift right; a tag that
 * contains the frame right before the insert point grows to include it
 * (so "add frame" at the end of a tag extends that tag).
 */
export function tagsAfterInsert(
	tags: Array<FrameTag>,
	index: number
): Array<FrameTag> {
	return tags.map((tag) => {
		const anchor = index - 1;
		if (anchor >= tag.from && anchor <= tag.to) {
			return { ...tag, to: tag.to + 1 };
		}
		if (tag.from >= index) {
			return { ...tag, from: tag.from + 1, to: tag.to + 1 };
		}
		return tag;
	});
}

/** The frame at `index` was removed. Tags that become empty are dropped. */
export function tagsAfterDelete(
	tags: Array<FrameTag>,
	index: number
): Array<FrameTag> {
	const result: Array<FrameTag> = [];
	for (const tag of tags) {
		if (tag.from === index && tag.to === index) continue;
		result.push({
			...tag,
			from: tag.from > index ? tag.from - 1 : tag.from,
			to: tag.to >= index ? tag.to - 1 : tag.to,
		});
	}
	return result;
}

/** Keeps every tag inside 0…frameCount-1 (drops tags fully outside). */
export function clampTags(
	tags: Array<FrameTag>,
	frameCount: number
): Array<FrameTag> {
	const last = frameCount - 1;
	return tags
		.filter((tag) => tag.from <= last)
		.map((tag) => ({ ...tag, to: Math.min(tag.to, last) }));
}

/** Moves an item in a copy of `items` from one index to another. */
export function moveItem<T>(
	items: Array<T>,
	from: number,
	to: number
): Array<T> {
	const result = items.slice();
	const [moved] = result.splice(from, 1);
	if (moved === undefined) return items;
	result.splice(to, 0, moved);
	return result;
}

/* -------------------------------------------------------------------------- */
/*                                  Playback                                  */
/* -------------------------------------------------------------------------- */

/** Frame indices in play order for a range and direction (one loop). */
export function playSequence(
	from: number,
	to: number,
	direction: TagDirection
): Array<number> {
	const forward: Array<number> = [];
	for (let index = from; index <= to; index++) forward.push(index);
	if (direction === "reverse") return forward.reverse();
	if (direction === "pingpong" && forward.length > 2) {
		return [...forward, ...forward.slice(1, -1).reverse()];
	}
	return forward;
}

/** Play order for a tag, or every frame when `tag` is null. */
export function sequenceFor(
	tag: FrameTag | null | undefined,
	frameCount: number
): Array<number> {
	if (!tag) return playSequence(0, frameCount - 1, "forward");
	const to = Math.min(tag.to, frameCount - 1);
	return playSequence(Math.min(tag.from, to), to, tag.direction);
}

/** Tags that contain `frame`, innermost (shortest) first. */
export function tagsAt(tags: Array<FrameTag>, frame: number): Array<FrameTag> {
	return tags
		.filter((tag) => frame >= tag.from && frame <= tag.to)
		.sort((a, b) => a.to - a.from - (b.to - b.from));
}

/** Total length of a play sequence in milliseconds. */
export function sequenceDuration(
	sequence: Array<number>,
	frames: Array<Pick<Frame, "duration">>
): number {
	return sequence.reduce(
		(total, index) => total + (frames[index]?.duration ?? 0),
		0
	);
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const emptyCache = new WeakMap<PixelBuffer, boolean>();

/** True when the buffer has no visible pixel. Cached per buffer. */
export function isEmptyCel(pixels: PixelBuffer | undefined): boolean {
	if (!pixels) return true;
	const cached = emptyCache.get(pixels);
	if (cached !== undefined) return cached;
	let empty = true;
	for (const value of pixels) {
		// Alpha is the top byte of the packed value (little-endian RGBA).
		if (value >>> 24 !== 0) {
			empty = false;
			break;
		}
	}
	emptyCache.set(pixels, empty);
	return empty;
}

/* -------------------------------------------------------------------------- */
/*                                 Onion skin                                 */
/* -------------------------------------------------------------------------- */

const ONION_BEFORE_TINT = [255, 64, 96];
const ONION_AFTER_TINT = [56, 160, 255];

/**
 * Neighbouring frames, tinted (red = before, blue = after) and faded with
 * distance, flattened into one image to show behind the current frame.
 * Returns null when there is nothing to show.
 */
export function onionSkinPixels(
	layers: Array<Pick<Layer, "id" | "visible" | "opacity" | "kind">>,
	frames: Array<Frame>,
	current: number,
	before: number,
	after: number,
	pixelCount: number
): PixelBuffer | null {
	const entries: Array<{
		index: number;
		tint: Array<number>;
		strength: number;
	}> = [];
	// Farthest first, so the nearest frames end up on top.
	for (let distance = Math.max(before, after); distance >= 1; distance--) {
		const strength = 0.55 / distance;
		if (distance <= before && current - distance >= 0) {
			entries.push({
				index: current - distance,
				tint: ONION_BEFORE_TINT,
				strength,
			});
		}
		if (distance <= after && current + distance < frames.length) {
			entries.push({
				index: current + distance,
				tint: ONION_AFTER_TINT,
				strength,
			});
		}
	}
	if (entries.length === 0) return null;

	const result = createPixels(pixelCount, 1);
	const out = new Uint8ClampedArray(result.buffer);
	for (const { index, tint, strength } of entries) {
		const source = compositeFrame(layers, frames[index], pixelCount);
		const bytes = new Uint8Array(
			source.buffer,
			source.byteOffset,
			source.byteLength
		);
		for (let offset = 0; offset < pixelCount * 4; offset += 4) {
			const alpha = ((bytes[offset + 3] ?? 0) / 255) * strength;
			if (alpha <= 0) continue;
			const below = ((out[offset + 3] ?? 0) / 255) * (1 - alpha);
			const total = alpha + below;
			for (let channel = 0; channel < 3; channel++) {
				const tinted =
					(bytes[offset + channel] ?? 0) * 0.35 + (tint[channel] ?? 0) * 0.65;
				out[offset + channel] =
					(tinted * alpha + (out[offset + channel] ?? 0) * below) / total;
			}
			out[offset + 3] = total * 255;
		}
	}
	return result;
}
