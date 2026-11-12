import type { Tool } from "./types";

export const MAX_CANVAS_SIZE = 128;
export const MIN_CANVAS_SIZE = 1;
export const DEFAULT_CANVAS_SIZE = 32;
export const SIZE_PRESETS: Array<number> = [8, 16, 24, 32, 48, 64, 128];

/** Integer zoom levels keep every art pixel the same size on screen. */
export const ZOOM_LEVELS: Array<number> = [
	1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80,
	96,
];

export const MAX_HISTORY = 100;
export const MAX_BRUSH_SIZE = 16;
/** Stronger grid line every N pixels. */
export const MAJOR_GRID_STEP = 8;
export const EXPORT_SCALES: Array<number> = [1, 2, 4, 8, 16, 32];

/** PICO-8 palette */
export const DEFAULT_PALETTE: Array<string> = [
	"#000000",
	"#1d2b53",
	"#7e2553",
	"#008751",
	"#ab5236",
	"#5f574f",
	"#c2c3c7",
	"#fff1e8",
	"#ff004d",
	"#ffa300",
	"#ffec27",
	"#00e436",
	"#29adff",
	"#83769c",
	"#ff77a8",
	"#ffccaa",
];

export type ToolInfo = { id: Tool; label: string; shortcut: string };

export const TOOLS: Array<ToolInfo> = [
	{ id: "pencil", label: "Pencil", shortcut: "B" },
	{ id: "eraser", label: "Eraser", shortcut: "E" },
	{ id: "fill", label: "Fill bucket", shortcut: "G" },
	{ id: "eyedropper", label: "Eyedropper", shortcut: "I" },
	{ id: "line", label: "Line", shortcut: "L" },
	{ id: "rectangle", label: "Rectangle", shortcut: "U" },
	{ id: "ellipse", label: "Ellipse", shortcut: "O" },
	{ id: "select-rect", label: "Rectangle select", shortcut: "M" },
	{ id: "lasso", label: "Lasso select", shortcut: "Q" },
	{ id: "wand", label: "Magic wand", shortcut: "W" },
	{ id: "move", label: "Move", shortcut: "V" },
	{ id: "hand", label: "Hand (pan)", shortcut: "H" },
];

export const PAINT_TOOLS: ReadonlySet<Tool> = new Set<Tool>([
	"pencil",
	"eraser",
	"line",
	"rectangle",
	"ellipse",
]);
