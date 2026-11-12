import { DEFAULT_PALETTE, MAX_CANVAS_SIZE } from "../constants";
import type { Layer } from "../types";
import { normalizeHex } from "./color";
import { compositeLayers, createLayer, reserveLayerIds } from "./layers";
import { decodePixels, encodePixels } from "./raster";

const AUTOSAVE_KEY = "pixel-editor:autosave:v1";
export const PROJECT_FORMAT = "pixel-editor-project";

export type DocumentData = {
	name: string;
	width: number;
	height: number;
	/** Bottom → top, every entry with up-to-date pixels. */
	layers: Array<Layer>;
	activeLayer: number;
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
};

type SerializedDocument = {
	format: typeof PROJECT_FORMAT;
	version: 1 | 2;
	name: string;
	width: number;
	height: number;
	/** base64 of raw RGBA bytes — the flattened image (all v1 files have it) */
	pixels: string;
	/** v2+ */
	layers?: Array<SerializedLayer>;
	activeLayer?: number;
	palette: Array<string>;
	primaryColor: string;
	secondaryColor: string;
};

export function serializeDocument(document: DocumentData): string {
	const serialized: SerializedDocument = {
		format: PROJECT_FORMAT,
		version: 2,
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
			pixels: encodePixels(layer.pixels),
		})),
		activeLayer: document.activeLayer,
		palette: document.palette,
		primaryColor: document.primaryColor,
		secondaryColor: document.secondaryColor,
	};
	return JSON.stringify(serialized);
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
		if (typeof entry !== "object" || typeof entry.pixels !== "string") {
			return null;
		}
		const pixels = decodePixels(entry.pixels, width * height);
		if (!pixels) return null;
		const layer = createLayer(
			width,
			height,
			typeof entry.name === "string" && entry.name
				? entry.name
				: `Layer ${index + 1}`,
			pixels
		);
		layer.visible = entry.visible !== false;
		layer.opacity =
			typeof entry.opacity === "number"
				? Math.max(0, Math.min(100, Math.round(entry.opacity)))
				: 100;
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
