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
