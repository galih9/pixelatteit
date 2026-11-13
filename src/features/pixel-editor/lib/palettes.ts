import { normalizeHex } from "./color";

export type PalettePreset = {
	id: string;
	name: string;
	colors: Array<string>;
};

const PALETTE_NAME_OVERRIDES: Record<string, string> = {
	"1bit-monitor-glow": "1-Bit Monitor Glow",
	"2bit-demichrome": "2-Bit Demichrome",
	"31": "31 Colors",
	"ammo-8": "Ammo 8",
	citrink: "Citrink",
	cl8uds: "Cl8uds",
	eulbink: "Eulbink",
	"fantasy-24": "Fantasy 24",
	"ice-cream-gb": "Ice Cream GB",
	indecision: "Indecision",
	inkpink: "Inkpink",
	"moonlight-gb": "Moonlight GB",
	nyx8: "Nyx8",
	"pico-8": "PICO-8",
	pollen8: "Pollen8",
	"rust-gold-8": "Rust Gold 8",
	"sweetie-16": "Sweetie 16",
	waldgeist: "Waldgeist",
};

/** Parses a Lospec-style `.hex` file into normalized `#rrggbb` colors. */
export function parseHexPalette(raw: string): Array<string> {
	const seen = new Set<string>();
	const colors: Array<string> = [];
	for (const line of raw.split(/\r?\n/)) {
		const trimmed = line.trim().replace(/^#/, "");
		if (!trimmed || !/^[\da-fA-F]{6}([\da-fA-F]{2})?$/.test(trimmed)) {
			continue;
		}
		const hex = normalizeHex(trimmed);
		if (!seen.has(hex)) {
			seen.add(hex);
			colors.push(hex);
		}
	}
	return colors;
}

function formatPaletteName(id: string): string {
	const override = PALETTE_NAME_OVERRIDES[id];
	if (override) return override;
	return id
		.split("-")
		.map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : ""))
		.join(" ");
}

const rawModules = import.meta.glob<string>("../../../assets/palletes/*.hex", {
	query: "?raw",
	import: "default",
	eager: true,
});

export const BUILT_IN_PALETTES: Array<PalettePreset> = Object.entries(
	rawModules
)
	.map(([path, raw]) => {
		const fileName = path.split("/").pop() ?? "";
		const id = fileName.replace(/\.hex$/i, "");
		return {
			id,
			name: formatPaletteName(id),
			colors: parseHexPalette(raw),
		};
	})
	.filter((preset) => preset.colors.length > 0)
	.sort((a, b) => {
		if (a.id === "pico-8") return -1;
		if (b.id === "pico-8") return 1;
		return a.name.localeCompare(b.name);
	});

/** Returns the built-in preset whose colors match `palette`, if any. */
export function findMatchingPalette(
	palette: Array<string>
): PalettePreset | null {
	const normalized = palette.map(normalizeHex);
	for (const preset of BUILT_IN_PALETTES) {
		if (
			preset.colors.length === normalized.length &&
			preset.colors.every((color, index) => color === normalized[index])
		) {
			return preset;
		}
	}
	return null;
}
