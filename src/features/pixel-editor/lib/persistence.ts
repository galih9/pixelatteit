import { DEFAULT_PALETTE, MAX_CANVAS_SIZE } from "../constants";
import type {
	Frame,
	FrameTag,
	Layer,
	PixelBuffer,
	ReferenceImageData,
	TagDirection,
} from "../types";
import {
	celsOf,
	clampDuration,
	clampTags,
	createFrame,
	createTag,
} from "./animation";
import { normalizeHex } from "./color";
import {
	compositeLayers,
	createLayer,
	createReferenceLayer,
	reserveLayerIds,
} from "./layers";
import { decodePixels, encodePixels } from "./raster";

const AUTOSAVE_KEY = "pixel-editor:autosave:v1";
export const PROJECT_FORMAT = "pixel-editor-project";

export type DocumentData = {
	name: string;
	width: number;
	height: number;
	/** Bottom → top, with the current frame's up-to-date pixels. */
	layers: Array<Layer>;
	activeLayer: number;
	/** Every frame with up-to-date cels (keyed by the ids in `layers`). */
	frames: Array<Frame>;
	currentFrame: number;
	tags: Array<FrameTag>;
	palette: Array<string>;
	primaryColor: string;
	secondaryColor: string;
};

type SerializedLayer = {
	name: string;
	visible: boolean;
	opacity: number;
	/** base64 of raw RGBA bytes */
	pixels: string;
	kind?: "pixel" | "reference";
	locked?: boolean;
	reference?: ReferenceImageData;
};

type SerializedFrame = {
	duration: number;
	/** One entry per layer (same order): index into `cels`, or -1 = empty. */
	cels: Array<number>;
	/** Optional link group id per layer (0 or absent = unlinked). */
	linked?: Array<number>;
};

type SerializedTag = Omit<FrameTag, "id">;

type SerializedDocument = {
	format: typeof PROJECT_FORMAT;
	version: 1 | 2 | 3;
	name: string;
	width: number;
	height: number;
	/** base64 of raw RGBA bytes — the flattened image (all v1 files have it) */
	pixels: string;
	/** v2+ */
	layers?: Array<SerializedLayer>;
	activeLayer?: number;
	/** v3+: animation. `layers[].pixels` still holds the current frame. */
	frames?: Array<SerializedFrame>;
	/** v3+: pool of encoded cels (see `encodeCel`), shared between frames. */
	cels?: Array<string>;
	currentFrame?: number;
	tags?: Array<SerializedTag>;
	palette: Array<string>;
	primaryColor: string;
	secondaryColor: string;
};

/* -------------------------------------------------------------------------- */
/*                                Cel encoding                                */
/* -------------------------------------------------------------------------- */

const RLE_PREFIX = "r:";

/**
 * Pixel art is mostly runs of the same value, so cels are stored as
 * run-length pairs (count, packed RGBA) when that is smaller than raw bytes.
 * Raw cels are plain base64 like v2 layers.
 */
export function encodeCel(pixels: PixelBuffer): string {
	const runs: Array<number> = [];
	let index = 0;
	while (index < pixels.length) {
		const value = pixels[index] ?? 0;
		let end = index + 1;
		while (end < pixels.length && pixels[end] === value) end++;
		runs.push(end - index, value);
		index = end;
		if (runs.length >= pixels.length) break;
	}
	if (runs.length >= pixels.length) return encodePixels(pixels);
	return RLE_PREFIX + encodePixels(Uint32Array.from(runs));
}

export function decodeCel(
	encoded: string,
	pixelCount: number
): PixelBuffer | null {
	if (!encoded.startsWith(RLE_PREFIX)) return decodePixels(encoded, pixelCount);
	const body = encoded.slice(RLE_PREFIX.length);
	// The run list's length is unknown up front: base64 → bytes → pairs.
	const byteLength =
		Math.floor((body.length * 3) / 4) -
		(body.endsWith("==") ? 2 : body.endsWith("=") ? 1 : 0);
	if (byteLength % 8 !== 0) return null;
	const runs = decodePixels(body, byteLength / 4);
	if (!runs) return null;
	const pixels = new Uint32Array(pixelCount);
	let offset = 0;
	for (let index = 0; index < runs.length; index += 2) {
		const count = runs[index] ?? 0;
		if (count === 0 || offset + count > pixelCount) return null;
		pixels.fill(runs[index + 1] ?? 0, offset, offset + count);
		offset += count;
	}
	return offset === pixelCount ? pixels : null;
}

function isEmpty(pixels: PixelBuffer): boolean {
	for (const value of pixels) if (value >>> 24 !== 0) return false;
	return true;
}

/* -------------------------------------------------------------------------- */
/*                                 Serializing                                */
/* -------------------------------------------------------------------------- */

function serializeFrames(
	document: DocumentData
): Pick<SerializedDocument, "frames" | "cels"> {
	const pool: Array<string> = [];
	// Duplicated frames share pixel buffers, so they are stored once.
	const byBuffer = new Map<PixelBuffer, number>();
	const byText = new Map<string, number>();
	const frames = document.frames.map((frame) => {
		const linked = document.layers.map((layer) => frame.linked?.[layer.id] ?? 0);
		const hasLinked = linked.some((id) => id > 0);
		return {
			duration: frame.duration,
			cels: document.layers.map((layer) => {
				if (layer.kind === "reference") return -1;
				const pixels = frame.cels[layer.id];
				if (!pixels || isEmpty(pixels)) return -1;
				const known = byBuffer.get(pixels);
				if (known !== undefined) return known;
				const text = encodeCel(pixels);
				let index = byText.get(text);
				if (index === undefined) {
					index = pool.length;
					pool.push(text);
					byText.set(text, index);
				}
				byBuffer.set(pixels, index);
				return index;
			}),
			...(hasLinked ? { linked } : {}),
		};
	});
	return { frames, cels: pool };
}

export function serializeDocument(document: DocumentData): string {
	const serialized: SerializedDocument = {
		format: PROJECT_FORMAT,
		version: 3,
		name: document.name,
		width: document.width,
		height: document.height,
		pixels: encodePixels(
			compositeLayers(document.layers, document.width * document.height)
		),
		layers: document.layers.map((layer) => ({
			name: layer.name,
			visible: layer.visible,
			opacity: layer.opacity,
			pixels:
				layer.kind === "reference" ? "" : encodePixels(layer.pixels),
			...(layer.kind === "reference" ? { kind: "reference" } : {}),
			...(layer.locked ? { locked: true } : {}),
			...(layer.reference ? { reference: layer.reference } : {}),
		})),
		activeLayer: document.activeLayer,
		...serializeFrames(document),
		currentFrame: document.currentFrame,
		tags: document.tags.map((tag) => ({
			name: tag.name,
			from: tag.from,
			to: tag.to,
			color: tag.color,
			direction: tag.direction,
		})),
		palette: document.palette,
		primaryColor: document.primaryColor,
		secondaryColor: document.secondaryColor,
	};
	return JSON.stringify(serialized);
}

/* -------------------------------------------------------------------------- */
/*                                   Parsing                                  */
/* -------------------------------------------------------------------------- */

function parseFrames(
	raw: Partial<SerializedDocument>,
	layers: Array<Layer>,
	pixelCount: number
): Array<Frame> {
	if (!Array.isArray(raw.frames) || raw.frames.length === 0) {
		return [createFrame(celsOf(layers))];
	}
	const pool = Array.isArray(raw.cels) ? raw.cels : [];
	const decoded = new Map<number, PixelBuffer | null>();
	const celAt = (index: unknown): PixelBuffer | undefined => {
		if (typeof index !== "number" || index < 0) return undefined;
		if (!decoded.has(index)) {
			const text = pool[index];
			decoded.set(
				index,
				typeof text === "string" ? decodeCel(text, pixelCount) : null
			);
		}
		return decoded.get(index) ?? undefined;
	};
	return raw.frames.map((entry) => {
		const cels: Frame["cels"] = {};
		const linked: NonNullable<Frame["linked"]> = {};
		let hasLinked = false;
		const indices = Array.isArray(entry.cels) ? entry.cels : [];
		const linkIds = Array.isArray(entry.linked) ? entry.linked : [];
		for (const [position, layer] of layers.entries()) {
			if (layer.kind === "reference") continue;
			const pixels = celAt(indices[position]);
			if (pixels) cels[layer.id] = pixels;
			const linkId = linkIds[position];
			if (typeof linkId === "number" && linkId > 0) {
				linked[layer.id] = linkId;
				hasLinked = true;
			}
		}
		return createFrame(
			cels,
			typeof entry.duration === "number" ? clampDuration(entry.duration) : 100,
			hasLinked ? linked : undefined
		);
	});
}

const DIRECTIONS = new Set<TagDirection>(["forward", "reverse", "pingpong"]);

function parseTags(
	raw: Partial<SerializedDocument>,
	frameCount: number
): Array<FrameTag> {
	if (!Array.isArray(raw.tags)) return [];
	const tags: Array<FrameTag> = [];
	for (const entry of raw.tags) {
		if (typeof entry !== "object") continue;
		const from = Number(entry.from);
		const to = Number(entry.to);
		if (!Number.isInteger(from) || !Number.isInteger(to)) continue;
		const tag = createTag(
			from,
			to,
			tags,
			typeof entry.name === "string" ? entry.name : undefined
		);
		if (typeof entry.color === "string") tag.color = normalizeHex(entry.color);
		if (DIRECTIONS.has(entry.direction)) tag.direction = entry.direction;
		tags.push(tag);
	}
	return clampTags(tags, frameCount);
}

function parseLayers(
	raw: Partial<SerializedDocument>,
	width: number,
	height: number
): Array<Layer> | null {
	if (!Array.isArray(raw.layers) || raw.layers.length === 0) {
		if (typeof raw.pixels !== "string") return null;
		const pixels = decodePixels(raw.pixels, width * height);
		return pixels ? [createLayer(width, height, "Layer 1", pixels)] : null;
	}
	const layers: Array<Layer> = [];
	for (const [index, entry] of raw.layers.entries()) {
		if (typeof entry !== "object") return null;
		const name =
			typeof entry.name === "string" && entry.name
				? entry.name
				: `Layer ${index + 1}`;
		if (entry.kind === "reference" && entry.reference) {
			const layer = createReferenceLayer(
				width,
				height,
				name,
				entry.reference,
				typeof entry.opacity === "number"
					? Math.max(0, Math.min(100, Math.round(entry.opacity)))
					: 55
			);
			layer.visible = entry.visible !== false;
			layer.locked = entry.locked === true;
			layers.push(layer);
			continue;
		}
		if (typeof entry.pixels !== "string") {
			return null;
		}
		const pixels = decodePixels(entry.pixels, width * height);
		if (!pixels) return null;
		const layer = createLayer(width, height, name, pixels);
		layer.visible = entry.visible !== false;
		layer.opacity =
			typeof entry.opacity === "number"
				? Math.max(0, Math.min(100, Math.round(entry.opacity)))
				: 100;
		layer.locked = entry.locked === true;
		layers.push(layer);
	}
	reserveLayerIds(layers);
	return layers;
}

function isValidSize(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isInteger(value) &&
		value >= 1 &&
		value <= MAX_CANVAS_SIZE
	);
}

export function parseDocument(text: string): DocumentData | null {
	try {
		const raw = JSON.parse(text) as Partial<SerializedDocument>;
		if (raw.format !== PROJECT_FORMAT) return null;
		if (!isValidSize(raw.width) || !isValidSize(raw.height)) return null;
		const layers = parseLayers(raw, raw.width, raw.height);
		if (!layers) return null;
		const activeLayer =
			typeof raw.activeLayer === "number" &&
			Number.isInteger(raw.activeLayer) &&
			raw.activeLayer >= 0 &&
			raw.activeLayer < layers.length
				? raw.activeLayer
				: layers.length - 1;
		const frames = parseFrames(raw, layers, raw.width * raw.height);
		const currentFrame =
			typeof raw.currentFrame === "number" &&
			Number.isInteger(raw.currentFrame) &&
			raw.currentFrame >= 0 &&
			raw.currentFrame < frames.length
				? raw.currentFrame
				: 0;
		const palette = Array.isArray(raw.palette)
			? raw.palette
					.filter((c): c is string => typeof c === "string")
					.map(normalizeHex)
			: DEFAULT_PALETTE;
		return {
			name: typeof raw.name === "string" && raw.name ? raw.name : "untitled",
			width: raw.width,
			height: raw.height,
			layers,
			activeLayer,
			frames,
			currentFrame,
			tags: parseTags(raw, frames.length),
			palette,
			primaryColor: normalizeHex(raw.primaryColor ?? "#000000"),
			secondaryColor: normalizeHex(raw.secondaryColor ?? "#ffffff"),
		};
	} catch {
		return null;
	}
}

export function loadAutosave(): DocumentData | null {
	try {
		const text = window.localStorage.getItem(AUTOSAVE_KEY);
		return text ? parseDocument(text) : null;
	} catch {
		return null;
	}
}

export function writeAutosave(document: DocumentData): void {
	try {
		window.localStorage.setItem(AUTOSAVE_KEY, serializeDocument(document));
	} catch {
		// Storage can be full or disabled (private mode); autosave is best-effort.
	}
}
