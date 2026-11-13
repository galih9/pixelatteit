import { describe, expect, it } from "vitest";
import { encodeGif, lzwEncode } from "./gif";

/** Reference GIF LZW decoder, used to check the encoder round-trips. */
function lzwDecode(data: Uint8Array, minCodeSize: number): Array<number> {
	const clearCode = 1 << minCodeSize;
	const endCode = clearCode + 1;
	let codeSize = minCodeSize + 1;
	let dictionary: Array<Array<number>> = [];
	const reset = (): void => {
		dictionary = [];
		for (let index = 0; index < clearCode; index++) dictionary.push([index]);
		dictionary.push([], []);
		codeSize = minCodeSize + 1;
	};
	reset();
	const output: Array<number> = [];
	let previous: Array<number> | null = null;
	let bitPosition = 0;
	const totalBits = data.length * 8;
	while (bitPosition + codeSize <= totalBits) {
		let code = 0;
		for (let bit = 0; bit < codeSize; bit++) {
			const byte = data[(bitPosition + bit) >> 3] ?? 0;
			code |= ((byte >> ((bitPosition + bit) & 7)) & 1) << bit;
		}
		bitPosition += codeSize;
		if (code === clearCode) {
			reset();
			previous = null;
			continue;
		}
		if (code === endCode) break;
		let entry = dictionary[code];
		if (!entry && previous) entry = [...previous, previous[0] ?? 0];
		if (!entry) throw new Error(`bad code ${code}`);
		output.push(...entry);
		if (previous) {
			dictionary.push([...previous, entry[0] ?? 0]);
			if (dictionary.length >= 1 << codeSize && codeSize < 12) codeSize += 1;
		}
		previous = entry;
	}
	return output;
}

const packed = (r: number, g: number, b: number, a = 255): number =>
	((a << 24) | (b << 16) | (g << 8) | r) >>> 0;

describe("lzwEncode", () => {
	it("round-trips short and long inputs", () => {
		const inputs = [
			[0],
			[1, 1, 1, 1, 2, 3, 0, 0, 1],
			Array.from({ length: 20_000 }, (_, index) => (index * 7919) % 13),
			Array.from({ length: 50_000 }, (_, index) => (index >> 6) % 4),
		];
		for (const values of inputs) {
			const minCodeSize = 4;
			const encoded = lzwEncode(Uint8Array.from(values), minCodeSize);
			expect(lzwDecode(encoded, minCodeSize)).toEqual(values);
		}
	});

	it("handles 8-bit palettes that fill the code table", () => {
		const values = Array.from(
			{ length: 30_000 },
			(_, index) => (index * 2_654_435_761) % 256
		);
		const encoded = lzwEncode(Uint8Array.from(values), 8);
		expect(lzwDecode(encoded, 8)).toEqual(values);
	});
});

describe("encodeGif", () => {
	const red = packed(255, 0, 0);
	const blue = packed(0, 0, 255);
	const clear = packed(0, 0, 0, 0);

	it("writes a looping GIF89a with one image per frame", () => {
		const { bytes, colors, reduced } = encodeGif({
			width: 2,
			height: 2,
			frames: [
				{ pixels: Uint32Array.from([red, clear, clear, blue]), duration: 100 },
				{ pixels: Uint32Array.from([blue, red, red, clear]), duration: 250 },
			],
		});
		const text = String.fromCharCode(...bytes.subarray(0, 6));
		expect(text).toBe("GIF89a");
		expect(bytes[6]).toBe(2); // width
		expect(bytes[8]).toBe(2); // height
		expect(bytes[bytes.length - 1]).toBe(0x3b);
		expect(colors).toBe(2);
		expect(reduced).toBe(false);
		const ascii = String.fromCharCode(...bytes);
		expect(ascii).toContain("NETSCAPE2.0");
		expect(ascii.split(",\u0000\u0000\u0000\u0000").length - 1).toBe(2);
	});

	it("scales frames with nearest neighbour", () => {
		const { bytes } = encodeGif({
			width: 3,
			height: 1,
			scale: 4,
			frames: [{ pixels: Uint32Array.from([red, blue, red]), duration: 100 }],
		});
		expect(bytes[6]).toBe(12);
		expect(bytes[8]).toBe(4);
	});

	it("reduces art with too many colors", () => {
		const pixels = Uint32Array.from({ length: 600 }, (_, index) =>
			packed(index % 256, (index >> 8) * 90, 30)
		);
		const result = encodeGif({
			width: 30,
			height: 20,
			frames: [{ pixels, duration: 100 }],
		});
		expect(result.reduced).toBe(true);
		expect(result.colors).toBeLessThanOrEqual(256);
	});
});
