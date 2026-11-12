import type { TextFont, TextStyle } from "../types";

/* -------------------------------------------------------------------------- */
/*                                 Pixel fonts                                */
/* -------------------------------------------------------------------------- */

// Each glyph is a list of rows ("#" = ink) separated by "/".
// Glyphs can have different widths; rows of one glyph share the same width.

type Font = { height: number; glyphs: Record<string, string>; fold?: boolean };

const FONT_3X5: Font = {
	height: 5,
	fold: true, // lowercase uses the uppercase shapes
	glyphs: {
		A: ".#./#.#/###/#.#/#.#",
		B: "##./#.#/##./#.#/##.",
		C: ".##/#../#../#../.##",
		D: "##./#.#/#.#/#.#/##.",
		E: "###/#../##./#../###",
		F: "###/#../##./#../#..",
		G: ".##/#../#.#/#.#/.##",
		H: "#.#/#.#/###/#.#/#.#",
		I: "###/.#./.#./.#./###",
		J: "..#/..#/..#/#.#/.#.",
		K: "#.#/#.#/##./#.#/#.#",
		L: "#../#../#../#../###",
		M: "#...#/##.##/#.#.#/#...#/#...#",
		N: "#..#/##.#/#.##/#..#/#..#",
		O: "###/#.#/#.#/#.#/###",
		P: "##./#.#/##./#../#..",
		Q: ".#./#.#/#.#/##./.##",
		R: "##./#.#/##./#.#/#.#",
		S: ".##/#../.#./..#/##.",
		T: "###/.#./.#./.#./.#.",
		U: "#.#/#.#/#.#/#.#/###",
		V: "#.#/#.#/#.#/#.#/.#.",
		W: "#...#/#...#/#.#.#/##.##/#...#",
		X: "#.#/#.#/.#./#.#/#.#",
		Y: "#.#/#.#/.#./.#./.#.",
		Z: "###/..#/.#./#../###",
		"0": ".#./#.#/#.#/#.#/.#.",
		"1": ".#./##./.#./.#./###",
		"2": "##./..#/.#./#../###",
		"3": "##./..#/.#./..#/##.",
		"4": "#.#/#.#/###/..#/..#",
		"5": "###/#../##./..#/##.",
		"6": ".##/#../###/#.#/###",
		"7": "###/..#/.#./.#./.#.",
		"8": "###/#.#/###/#.#/###",
		"9": "###/#.#/###/..#/##.",
		" ": "../../../../..",
		"!": "#/#/#/./#",
		"?": "##./..#/.#./.../.#.",
		".": "././././#",
		",": "./././#/#",
		":": "./#/./#/.",
		";": "./#/./#/#",
		"'": "#/#/././.",
		'"': "#.#/#.#/.../.../...",
		"-": ".../.../###/.../...",
		"+": ".../.#./###/.#./...",
		"=": ".../###/.../###/...",
		_: ".../.../.../.../###",
		"/": "..#/..#/.#./#../#..",
		"\\": "#../#../.#./..#/..#",
		"(": ".#/#./#./#./.#",
		")": "#./.#/.#/.#/#.",
		"[": "##/#./#./#./##",
		"]": "##/.#/.#/.#/##",
		"{": ".##/.#./##./.#./.##",
		"}": "##./.#./.##/.#./##.",
		"<": "..#/.#./#../.#./..#",
		">": "#../.#./..#/.#./#..",
		"*": "#.#/.#./#.#/.../...",
		"#": "#.#/###/#.#/###/#.#",
		"%": "#.#/..#/.#./#../#.#",
		"&": ".#./#.#/.#./#.#/.##",
		"@": "###/#.#/#.#/#../.##",
		$: ".##/##./.#./.##/##.",
		"^": ".#./#.#/.../.../...",
		"~": "..../.#.#/#.#./..../....",
		"`": "#./.#/../../..",
		"|": "#/#/#/#/#",
	},
};

const FONT_5X7: Font = {
	height: 9, // 7 rows + 2 rows for descenders (g, j, p, q, y, comma)
	glyphs: {
		A: ".###./#...#/#...#/#####/#...#/#...#/#...#",
		B: "####./#...#/#...#/####./#...#/#...#/####.",
		C: ".###./#...#/#..../#..../#..../#...#/.###.",
		D: "####./#...#/#...#/#...#/#...#/#...#/####.",
		E: "#####/#..../#..../####./#..../#..../#####",
		F: "#####/#..../#..../####./#..../#..../#....",
		G: ".###./#...#/#..../#.###/#...#/#...#/.####",
		H: "#...#/#...#/#...#/#####/#...#/#...#/#...#",
		I: "###/.#./.#./.#./.#./.#./###",
		J: "..###/...#./...#./...#./...#./#..#./.##..",
		K: "#...#/#..#./#.#../##.../#.#../#..#./#...#",
		L: "#..../#..../#..../#..../#..../#..../#####",
		M: "#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#",
		N: "#...#/#...#/##..#/#.#.#/#..##/#...#/#...#",
		O: ".###./#...#/#...#/#...#/#...#/#...#/.###.",
		P: "####./#...#/#...#/####./#..../#..../#....",
		Q: ".###./#...#/#...#/#...#/#.#.#/#..#./.##.#",
		R: "####./#...#/#...#/####./#.#../#..#./#...#",
		S: ".####/#..../#..../.###./....#/....#/####.",
		T: "#####/..#../..#../..#../..#../..#../..#..",
		U: "#...#/#...#/#...#/#...#/#...#/#...#/.###.",
		V: "#...#/#...#/#...#/#...#/#...#/.#.#./..#..",
		W: "#...#/#...#/#...#/#.#.#/#.#.#/#.#.#/.#.#.",
		X: "#...#/#...#/.#.#./..#../.#.#./#...#/#...#",
		Y: "#...#/#...#/.#.#./..#../..#../..#../..#..",
		Z: "#####/....#/...#./..#../.#.../#..../#####",
		a: "...../...../.###./....#/.####/#...#/.####",
		b: "#..../#..../####./#...#/#...#/#...#/####.",
		c: "...../...../.###./#..../#..../#..../.###.",
		d: "....#/....#/.####/#...#/#...#/#...#/.####",
		e: "...../...../.###./#...#/#####/#..../.###.",
		f: "..##/.#../####/.#../.#../.#../.#..",
		g: "...../...../.####/#...#/#...#/#...#/.####/....#/.###.",
		h: "#..../#..../####./#...#/#...#/#...#/#...#",
		i: "#/./#/#/#/#/#",
		j: "..#/.../..#/..#/..#/..#/..#/#.#/.#.",
		k: "#.../#.../#..#/#.#./##../#.#./#..#",
		l: "#./#./#./#./#./#./.#",
		m: "...../...../##.#./#.#.#/#.#.#/#.#.#/#.#.#",
		n: "...../...../####./#...#/#...#/#...#/#...#",
		o: "...../...../.###./#...#/#...#/#...#/.###.",
		p: "...../...../####./#...#/#...#/#...#/####./#..../#....",
		q: "...../...../.####/#...#/#...#/#...#/.####/....#/....#",
		r: "..../..../#.##/##../#.../#.../#...",
		s: "...../...../.####/#..../.###./....#/####.",
		t: ".#../.#../####/.#../.#../.#../..##",
		u: "...../...../#...#/#...#/#...#/#...#/.####",
		v: "...../...../#...#/#...#/#...#/.#.#./..#..",
		w: "...../...../#...#/#...#/#.#.#/#.#.#/.#.#.",
		x: "...../...../#...#/.#.#./..#../.#.#./#...#",
		y: "...../...../#...#/#...#/#...#/#...#/.####/....#/.###.",
		z: "...../...../#####/...#./..#../.#.../#####",
		"0": ".###./#...#/#..##/#.#.#/##..#/#...#/.###.",
		"1": ".#./##./.#./.#./.#./.#./###",
		"2": ".###./#...#/....#/...#./..#../.#.../#####",
		"3": ".###./#...#/....#/..##./....#/#...#/.###.",
		"4": "...#./..##./.#.#./#..#./#####/...#./...#.",
		"5": "#####/#..../####./....#/....#/#...#/.###.",
		"6": "..##./.#.../#..../####./#...#/#...#/.###.",
		"7": "#####/....#/...#./..#../.#.../.#.../.#...",
		"8": ".###./#...#/#...#/.###./#...#/#...#/.###.",
		"9": ".###./#...#/#...#/.####/....#/...#./.##..",
		" ": ".../.../.../.../.../.../...",
		"!": "#/#/#/#/#/./#",
		"?": ".###./#...#/....#/...#./..#../...../..#..",
		".": "././././././#",
		",": "../../../../.#/.#/#.",
		":": "././#/././#/.",
		";": "../../.#/../../.#/#.",
		"'": "#/#/././././.",
		'"': "#.#/#.#/.../.../.../.../...",
		"-": "..../..../..../####/..../..../....",
		"+": "...../..#../..#../#####/..#../..#../.....",
		"=": "...../...../#####/...../#####/...../.....",
		_: "...../...../...../...../...../...../#####",
		"/": "....#/...#./...#./..#../.#.../.#.../#....",
		"\\": "#..../.#.../.#.../..#../...#./...#./....#",
		"(": "..#/.#./#../#../#../.#./..#",
		")": "#../.#./..#/..#/..#/.#./#..",
		"[": "###/#../#../#../#../#../###",
		"]": "###/..#/..#/..#/..#/..#/###",
		"{": ".##/.#./.#./#../.#./.#./.##",
		"}": "##./.#./.#./..#/.#./.#./##.",
		"<": "...#/..#./.#../#.../.#../..#./...#",
		">": "#.../.#../..#./...#/..#./.#../#...",
		"*": "...../#.#.#/.###./#####/.###./#.#.#/.....",
		"#": ".#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.",
		"%": "##.../##..#/...#./..#../.#.../#..##/...##",
		"&": ".##../#..#./#.#../.#.../#.#.#/#..#./.##.#",
		"@": ".###./#...#/#.###/#.#.#/#.###/#..../.###.",
		$: "..#../.####/#.#../.###./..#.#/####./..#..",
		"^": "..#../.#.#./#...#/...../...../...../.....",
		"~": "...../...../.#.../#.#.#/...#./...../.....",
		"`": "#./.#/../../../../..",
		"|": "#/#/#/#/#/#/#",
	},
};

const PIXEL_FONTS: Partial<Record<TextFont, Font>> = {
	"pixel-3x5": FONT_3X5,
	"pixel-5x7": FONT_5X7,
};

export const TEXT_FONTS: Array<{ id: TextFont; label: string }> = [
	{ id: "pixel-3x5", label: "Pixel 3×5 (tiny)" },
	{ id: "pixel-5x7", label: "Pixel 5×7" },
	{ id: "sans-serif", label: "Sans-serif" },
	{ id: "serif", label: "Serif" },
	{ id: "monospace", label: "Monospace" },
];

export function isPixelFont(font: TextFont): boolean {
	return font in PIXEL_FONTS;
}

type Glyph = { width: number; rows: Array<string> };
const glyphCache = new Map<string, Glyph>();

function glyphFor(font: Font, character: string): Glyph {
	const key = `${font.height}:${character}`;
	const cached = glyphCache.get(key);
	if (cached) return cached;
	const lookup = font.fold ? character.toUpperCase() : character;
	const source = font.glyphs[lookup] ?? font.glyphs["?"] ?? "#";
	const rows = source.split("/");
	const glyph = { width: Math.max(...rows.map((row) => row.length)), rows };
	glyphCache.set(key, glyph);
	return glyph;
}

/* -------------------------------------------------------------------------- */
/*                                  Rendering                                 */
/* -------------------------------------------------------------------------- */

/** Text rasterized to a 1-bit coverage mask. */
export type TextBitmap = { width: number; height: number; mask: Uint8Array };

function renderPixelFont(
	text: string,
	font: Font,
	scale: number,
	spacing: number
): TextBitmap {
	const characters = [...text];
	const glyphs = characters.map((character) => glyphFor(font, character));
	const advance = glyphs.reduce(
		(total, glyph) => total + glyph.width + spacing,
		0
	);
	const width = Math.max(
		1,
		(advance - (glyphs.length > 0 ? spacing : 0)) * scale
	);
	const height = font.height * scale;
	const mask = new Uint8Array(width * height);
	let cursor = 0;
	for (const glyph of glyphs) {
		glyph.rows.forEach((row, rowIndex) => {
			for (let column = 0; column < row.length; column++) {
				if (row[column] !== "#") continue;
				for (let dy = 0; dy < scale; dy++) {
					for (let dx = 0; dx < scale; dx++) {
						const x = (cursor + column) * scale + dx;
						const y = rowIndex * scale + dy;
						if (x < width && y < height) mask[y * width + x] = 1;
					}
				}
			}
		});
		cursor += glyph.width + spacing;
	}
	return { width, height, mask };
}

let measureCanvas: HTMLCanvasElement | null = null;

function renderSystemFont(text: string, style: TextStyle): TextBitmap {
	measureCanvas ??= document.createElement("canvas");
	const context = measureCanvas.getContext("2d", { willReadFrequently: true });
	const size = Math.max(4, Math.round(style.size));
	const height = Math.ceil(size * 1.25);
	if (!context) return { width: 1, height, mask: new Uint8Array(height) };
	const fontString = `${style.bold ? "bold " : ""}${size}px ${style.font}`;
	const setup = (): void => {
		context.font = fontString;
		context.textBaseline = "top";
		if ("letterSpacing" in context) {
			context.letterSpacing = `${style.spacing}px`;
		}
	};
	setup();
	const width = Math.max(1, Math.ceil(context.measureText(text).width) + 1);
	measureCanvas.width = width;
	measureCanvas.height = height;
	setup(); // resizing a canvas resets its context state
	context.clearRect(0, 0, width, height);
	context.fillStyle = "#000";
	context.fillText(text, 0, Math.round(size * 0.1));
	const data = context.getImageData(0, 0, width, height).data;
	const mask = new Uint8Array(width * height);
	// Hard threshold keeps the result crisp (no anti-aliasing).
	for (let index = 0; index < mask.length; index++) {
		if ((data[index * 4 + 3] ?? 0) >= 128) mask[index] = 1;
	}
	return { width, height, mask };
}

export function renderText(text: string, style: TextStyle): TextBitmap {
	const pixelFont = PIXEL_FONTS[style.font];
	if (pixelFont) {
		return renderPixelFont(
			text,
			pixelFont,
			Math.max(1, Math.round(style.scale)),
			Math.max(0, Math.round(style.spacing))
		);
	}
	return renderSystemFont(text, style);
}

/** Lists malformed glyphs (uneven rows or wrong height). Used by tests. */
export function fontProblems(): Array<string> {
	const problems: Array<string> = [];
	for (const [name, font] of Object.entries(PIXEL_FONTS)) {
		for (const [character, source] of Object.entries(font.glyphs)) {
			const rows = source.split("/");
			const widths = new Set(rows.map((row) => row.length));
			const capHeight = font.height === 9 ? 7 : font.height;
			if (widths.size !== 1)
				problems.push(`${name} "${character}": uneven rows`);
			if (rows.length !== capHeight && rows.length !== font.height) {
				problems.push(`${name} "${character}": ${rows.length} rows`);
			}
			if (/[^#.]/.test(source.replace(/\//g, ""))) {
				problems.push(`${name} "${character}": bad characters`);
			}
		}
		for (let code = 32; code < 127; code++) {
			const character = String.fromCharCode(code);
			const lookup = font.fold ? character.toUpperCase() : character;
			if (!(lookup in font.glyphs))
				problems.push(`${name} missing "${character}"`);
		}
	}
	return problems;
}
