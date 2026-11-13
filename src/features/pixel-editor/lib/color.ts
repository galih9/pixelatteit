import type { ColorRampOptions } from "../types";

// A 4-byte scratch buffer lets us pack/unpack colors without caring about
// the platform's endianness: the bytes are always R,G,B,A in memory, which is
// exactly what ImageData expects.
const scratchBytes = new Uint8ClampedArray(4);
const scratchWord = new Uint32Array(scratchBytes.buffer);

export const TRANSPARENT = 0;

export function rgbaToPacked(
	red: number,
	green: number,
	blue: number,
	alpha = 255
): number {
	scratchBytes[0] = red;
	scratchBytes[1] = green;
	scratchBytes[2] = blue;
	scratchBytes[3] = alpha;
	return scratchWord[0] ?? 0;
}

export function normalizeHex(hex: string): string {
	let clean = hex.trim().replace(/^#/, "").toLowerCase();
	if (clean.length === 3 || clean.length === 4) {
		clean = [...clean].map((character) => character + character).join("");
	}
	if (!/^[\da-f]{6}([\da-f]{2})?$/.test(clean)) {
		return "#000000";
	}
	return `#${clean.slice(0, 6)}`;
}

export function hexToPacked(hex: string): number {
	const clean = normalizeHex(hex).slice(1);
	return rgbaToPacked(
		Number.parseInt(clean.slice(0, 2), 16),
		Number.parseInt(clean.slice(2, 4), 16),
		Number.parseInt(clean.slice(4, 6), 16),
		255
	);
}

export function packedAlpha(value: number): number {
	scratchWord[0] = value;
	return scratchBytes[3] ?? 0;
}

export function packedToHex(value: number): string {
	scratchWord[0] = value;
	const channels = [scratchBytes[0], scratchBytes[1], scratchBytes[2]];
	return `#${channels
		.map((channel) => (channel ?? 0).toString(16).padStart(2, "0"))
		.join("")}`;
}

export function hexToRgb(hex: string): [number, number, number] {
	const clean = normalizeHex(hex).slice(1);
	return [
		Number.parseInt(clean.slice(0, 2), 16),
		Number.parseInt(clean.slice(2, 4), 16),
		Number.parseInt(clean.slice(4, 6), 16),
	];
}

export function rgbToHex(red: number, green: number, blue: number): string {
	const clamp = (value: number): number =>
		Math.max(0, Math.min(255, Math.round(value)));
	return `#${[clamp(red), clamp(green), clamp(blue)]
		.map((channel) => channel.toString(16).padStart(2, "0"))
		.join("")}`;
}

/** Converts 0–255 RGB to HSL (hue 0–360, saturation 0–100, lightness 0–100). */
export function rgbToHsl(
	red: number,
	green: number,
	blue: number
): [number, number, number] {
	const r = red / 255;
	const g = green / 255;
	const b = blue / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const lightness = (max + min) / 2;
	if (max === min) return [0, 0, lightness * 100];
	const delta = max - min;
	const saturation =
		lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
	let hue = 0;
	if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
	else if (max === g) hue = (b - r) / delta + 2;
	else hue = (r - g) / delta + 4;
	return [hue * 60, saturation * 100, lightness * 100];
}

/** Converts HSL (hue 0–360, saturation 0–100, lightness 0–100) to 0–255 RGB. */
export function hslToRgb(
	hue: number,
	saturation: number,
	lightness: number
): [number, number, number] {
	const h = (((hue % 360) + 360) % 360) / 360;
	const s = Math.max(0, Math.min(100, saturation)) / 100;
	const l = Math.max(0, Math.min(100, lightness)) / 100;
	if (s === 0) {
		const gray = Math.round(l * 255);
		return [gray, gray, gray];
	}
	const hueToRgb = (p: number, q: number, tInput: number): number => {
		let t = tInput;
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	return [
		Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
		Math.round(hueToRgb(p, q, h) * 255),
		Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
	];
}

/** Signed shortest angular distance from `from` to `to` in [-180, 180]. */
function shortestHueDelta(from: number, to: number): number {
	return ((to - from + 540) % 360) - 180;
}

const COOL_SHADOW_HUE = 248;
const WARM_HIGHLIGHT_HUE = 54;

/**
 * Generates a pixel-art color ramp centered on `baseHex`.
 * Darker shadow steps sit before the center; lighter highlight steps follow it.
 */
export function generateColorRamp(
	baseHex: string,
	options: ColorRampOptions
): Array<string> {
	const steps = Math.max(3, Math.min(11, Math.round(options.steps) | 1));
	const half = Math.floor(steps / 2);
	const [red, green, blue] = hexToRgb(baseHex);
	const [baseH, baseS, baseL] = rgbToHsl(red, green, blue);
	const spread = Math.max(10, Math.min(100, options.lightnessSpread)) / 100;

	const colors: Array<string> = [];
	for (let index = 0; index < steps; index++) {
		const offset = index - half;
		if (offset === 0) {
			colors.push(normalizeHex(baseHex));
			continue;
		}
		const t = Math.abs(offset) / half; // 0..1 away from base
		const isShadow = offset < 0;

		let nextHue: number;
		if (options.mode === "smart") {
			const targetHue = isShadow ? COOL_SHADOW_HUE : WARM_HIGHLIGHT_HUE;
			const maxShift = isShadow
				? Math.abs(options.shadowHueShift)
				: Math.abs(options.highlightHueShift);
			const delta = shortestHueDelta(baseH, targetHue);
			const clamped = Math.sign(delta) * Math.min(Math.abs(delta), maxShift);
			nextHue = baseH + clamped * t;
		} else {
			const shift = isShadow
				? options.shadowHueShift
				: options.highlightHueShift;
			nextHue = baseH + shift * t;
		}

		const targetLightness = isShadow
			? Math.max(4, baseL * (1 - 0.82 * spread))
			: Math.min(97, baseL + (100 - baseL) * 0.85 * spread);
		const nextLightness = baseL + (targetLightness - baseL) * t;

		// Shadows often gain saturation; extreme highlights stay clean without chalkiness.
		const satDelta = isShadow
			? options.saturationBoost * t
			: options.saturationBoost * 0.35 * t;
		const nextSaturation =
			baseS < 2 ? baseS : Math.max(4, Math.min(100, baseS + satDelta));

		const [nr, ng, nb] = hslToRgb(nextHue, nextSaturation, nextLightness);
		colors.push(rgbToHex(nr, ng, nb));
	}
	return colors;
}

/** Steps a color 1 shade darker (shadow) or lighter (highlight) using ramp rules. */
export function stepColorShade(
	hex: string,
	direction: "shadow" | "highlight",
	options: ColorRampOptions
): string {
	const ramp = generateColorRamp(hex, options);
	const center = Math.floor(ramp.length / 2);
	const targetIndex = direction === "shadow" ? center - 1 : center + 1;
	return ramp[targetIndex] ?? normalizeHex(hex);
}

/** Squared Euclidean RGB distance between two packed RGBA values. */
export function colorDistanceSquared(a: number, b: number): number {
	scratchWord[0] = a;
	const ar = scratchBytes[0] ?? 0;
	const ag = scratchBytes[1] ?? 0;
	const ab = scratchBytes[2] ?? 0;
	scratchWord[0] = b;
	const br = scratchBytes[0] ?? 0;
	const bg = scratchBytes[1] ?? 0;
	const bb = scratchBytes[2] ?? 0;
	const dr = ar - br;
	const dg = ag - bg;
	const db = ab - bb;
	return dr * dr + dg * dg + db * db;
}
