import { DEFAULT_PALETTE, MAX_CANVAS_SIZE } from "../constants";
import type { PixelBuffer } from "../types";
import { normalizeHex } from "./color";
import { decodePixels, encodePixels } from "./raster";

const AUTOSAVE_KEY = "pixel-editor:autosave:v1";
export const PROJECT_FORMAT = "pixel-editor-project";

export type DocumentData = {
	name: string;
	width: number;
	height: number;
	pixels: PixelBuffer;
	palette: Array<string>;
	primaryColor: string;
	secondaryColor: string;
};

type SerializedDocument = {
	format: typeof PROJECT_FORMAT;
	version: 1;
	name: string;
	width: number;
	height: number;
	/** base64 of raw RGBA bytes */
	pixels: string;
	palette: Array<string>;
	primaryColor: string;
	secondaryColor: string;
};

export function serializeDocument(document: DocumentData): string {
	const serialized: SerializedDocument = {
		format: PROJECT_FORMAT,
		version: 1,
		name: document.name,
		width: document.width,
		height: document.height,
		pixels: encodePixels(document.pixels),
		palette: document.palette,
		primaryColor: document.primaryColor,
		secondaryColor: document.secondaryColor,
	};
	return JSON.stringify(serialized);
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
		if (typeof raw.pixels !== "string") return null;
		const pixels = decodePixels(raw.pixels, raw.width * raw.height);
		if (!pixels) return null;
		const palette = Array.isArray(raw.palette)
			? raw.palette
					.filter((c): c is string => typeof c === "string")
					.map(normalizeHex)
			: DEFAULT_PALETTE;
		return {
			name: typeof raw.name === "string" && raw.name ? raw.name : "untitled",
			width: raw.width,
			height: raw.height,
			pixels,
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
