import type { Layer, PixelBuffer, ReferenceImageData } from "../types";
import { createPixels } from "./raster";

let nextLayerId = 1;

export function createLayer(
	width: number,
	height: number,
	name: string,
	pixels?: PixelBuffer
): Layer {
	const id = nextLayerId;
	nextLayerId += 1;
	return {
		id,
		name,
		visible: true,
		opacity: 100,
		pixels: pixels ?? createPixels(width, height),
		kind: "pixel",
		locked: false,
	};
}

export function createReferenceLayer(
	width: number,
	height: number,
	name: string,
	reference: ReferenceImageData,
	opacity = 55
): Layer {
	const id = nextLayerId;
	nextLayerId += 1;
	return {
		id,
		name,
		visible: true,
		opacity,
		pixels: createPixels(width, height),
		kind: "reference",
		locked: false,
		reference,
	};
}

/** Keeps generated ids unique after loading layers from a file. */
export function reserveLayerIds(layers: Array<Layer>): void {
	for (const layer of layers) {
		if (layer.id >= nextLayerId) nextLayerId = layer.id + 1;
	}
}

/** "Layer 3" style name that is not used yet. */
export function nextLayerName(layers: Array<Layer>, base = "Layer"): string {
	const used = new Set(layers.map((layer) => layer.name));
	for (let number = layers.length + 1; ; number++) {
		const candidate = `${base} ${number}`;
		if (!used.has(candidate)) return candidate;
	}
}

type CompositeInput = Pick<Layer, "pixels" | "visible" | "opacity" | "kind">;

/**
 * Flattens layers (bottom → top) with normal "source over" blending,
 * taking each layer's opacity into account. Hidden and reference layers are skipped.
 */
export function compositeLayers(
	layers: Array<CompositeInput>,
	pixelCount: number
): PixelBuffer {
	const visible = layers.filter(
		(layer) => layer.kind !== "reference" && layer.visible && layer.opacity > 0
	);
	const only = visible[0];
	if (visible.length === 1 && only && only.opacity >= 100) return only.pixels;

	const result = createPixels(pixelCount, 1);
	const out = new Uint8ClampedArray(result.buffer);
	const byteCount = pixelCount * 4;
	for (const layer of visible) {
		const source = new Uint8Array(
			layer.pixels.buffer,
			layer.pixels.byteOffset,
			layer.pixels.byteLength
		);
		const factor = Math.min(100, layer.opacity) / 100;
		for (let index = 0; index < byteCount; index += 4) {
			const sourceAlpha = ((source[index + 3] ?? 0) / 255) * factor;
			if (sourceAlpha <= 0) continue;
			const destinationAlpha = (out[index + 3] ?? 0) / 255;
			if (sourceAlpha >= 1 || destinationAlpha <= 0) {
				// Fast paths: fully covering pixel, or nothing underneath.
				out[index] = source[index] ?? 0;
				out[index + 1] = source[index + 1] ?? 0;
				out[index + 2] = source[index + 2] ?? 0;
				out[index + 3] = sourceAlpha * 255;
				continue;
			}
			const below = destinationAlpha * (1 - sourceAlpha);
			const alpha = sourceAlpha + below;
			for (let channel = 0; channel < 3; channel++) {
				out[index + channel] =
					((source[index + channel] ?? 0) * sourceAlpha +
						(out[index + channel] ?? 0) * below) /
					alpha;
			}
			out[index + 3] = alpha * 255;
		}
	}
	return result;
}
