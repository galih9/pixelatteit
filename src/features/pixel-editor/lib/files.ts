import { saveAs } from "file-saver";
import { MAX_CANVAS_SIZE } from "../constants";
import {
	documentData,
	flattenedPixels,
	framePixels,
	useEditorStore,
} from "../store/editorStore";
import type { PixelBuffer } from "../types";
import { sequenceFor } from "./animation";
import { packedToHex } from "./color";
import { encodeGif } from "./gif";
import { parseDocument, serializeDocument } from "./persistence";
import { uniqueOpaqueColors } from "./raster";

function safeName(name: string): string {
	return name.trim().replace(/[^\w\- ]+/g, "_") || "untitled";
}

function pickFile(accept: string): Promise<File | null> {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = accept;
		input.addEventListener("change", () => {
			resolve(input.files?.[0] ?? null);
		});
		input.addEventListener("cancel", () => {
			resolve(null);
		});
		input.click();
	});
}

function pixelsToCanvas(
	pixels: PixelBuffer,
	width: number,
	height: number,
	scale: number
): HTMLCanvasElement {
	const source = document.createElement("canvas");
	source.width = width;
	source.height = height;
	const sourceContext = source.getContext("2d");
	sourceContext?.putImageData(
		new ImageData(new Uint8ClampedArray(pixels.buffer.slice(0)), width, height),
		0,
		0
	);
	if (scale === 1) return source;
	const output = document.createElement("canvas");
	output.width = width * scale;
	output.height = height * scale;
	const context = output.getContext("2d");
	if (context) {
		context.imageSmoothingEnabled = false;
		context.drawImage(source, 0, 0, output.width, output.height);
	}
	return output;
}

export function exportPng(scale: number, fileName?: string): void {
	const state = useEditorStore.getState();
	const canvas = pixelsToCanvas(
		flattenedPixels(state),
		state.width,
		state.height,
		scale
	);
	canvas.toBlob((blob) => {
		if (!blob) return;
		const suffix = scale === 1 ? "" : `@${scale}x`;
		saveAs(blob, `${safeName(fileName ?? state.name)}${suffix}.png`);
	}, "image/png");
}

/**
 * Exports the animation as a looping GIF. `tagId` limits it to one tag
 * (played in the tag's direction); null exports every frame.
 */
export function exportGif(
	scale: number,
	tagId: number | null,
	fileName?: string
): void {
	const state = useEditorStore.getState();
	const tag = state.tags.find((candidate) => candidate.id === tagId) ?? null;
	const sequence = sequenceFor(tag, state.frames.length);
	const cache = new Map<number, PixelBuffer>();
	const frames = sequence.map((index) => {
		let pixels = cache.get(index);
		if (!pixels) {
			pixels = framePixels(state, index);
			cache.set(index, pixels);
		}
		return { pixels, duration: state.frames[index]?.duration ?? 100 };
	});
	const { bytes, reduced } = encodeGif({
		width: state.width,
		height: state.height,
		frames,
		scale,
	});
	const tagSuffix = tag ? `-${safeName(tag.name)}` : "";
	const scaleSuffix = scale === 1 ? "" : `@${scale}x`;
	saveAs(
		new Blob([bytes], { type: "image/gif" }),
		`${safeName(fileName ?? state.name)}${tagSuffix}${scaleSuffix}.gif`
	);
	if (reduced) {
		state.showNotice("GIF supports 256 colors: some colors were merged");
	}
}

export function saveProject(): void {
	const state = useEditorStore.getState();
	const text = serializeDocument(documentData(state));
	saveAs(
		new Blob([text], { type: "application/json" }),
		`${safeName(state.name)}.pixel.json`
	);
}

async function imageFileToPixels(
	file: File
): Promise<{ width: number; height: number; pixels: PixelBuffer } | string> {
	const bitmap = await createImageBitmap(file);
	const { width, height } = bitmap;
	if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
		bitmap.close();
		return `Image is ${width}×${height}. The maximum is ${MAX_CANVAS_SIZE}×${MAX_CANVAS_SIZE}.`;
	}
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d");
	if (!context) return "Could not read the image.";
	context.drawImage(bitmap, 0, 0);
	bitmap.close();
	const data = context.getImageData(0, 0, width, height).data;
	const pixels = new Uint32Array(width * height);
	new Uint8ClampedArray(pixels.buffer).set(data);
	return { width, height, pixels };
}

/** Opens a .pixel.json project or a PNG/GIF/etc. image. */
export async function openFile(): Promise<void> {
	const store = useEditorStore.getState();
	const file = await pickFile(
		".json,.pixel.json,image/png,image/gif,image/bmp,image/webp"
	);
	if (!file) return;
	const baseName = file.name.replace(/(\.pixel)?\.[^.]+$/, "");
	try {
		if (file.type.startsWith("image/")) {
			const result = await imageFileToPixels(file);
			if (typeof result === "string") {
				store.showNotice(result);
				return;
			}
			store.loadDocument({ ...result, name: baseName });
			store.showNotice(`Opened ${file.name}`);
			return;
		}
		const document = parseDocument(await file.text());
		if (!document) {
			store.showNotice("That file is not a valid pixel editor project.");
			return;
		}
		store.loadDocument(document);
		store.showNotice(`Opened ${file.name}`);
	} catch {
		store.showNotice(`Could not open ${file.name}`);
	}
}

export function paletteFromCanvas(): void {
	const state = useEditorStore.getState();
	const colors = uniqueOpaqueColors(flattenedPixels(state), 256).map(
		packedToHex
	);
	if (colors.length === 0) {
		state.showNotice("The canvas has no colors yet.");
		return;
	}
	state.setPalette(colors);
	state.showNotice(`Palette set to ${colors.length} colors from the canvas`);
}
