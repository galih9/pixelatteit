export type Tool =
	| "pencil"
	| "eraser"
	| "fill"
	| "eyedropper"
	| "line"
	| "rectangle"
	| "ellipse"
	| "select-rect"
	| "lasso"
	| "wand"
	| "move"
	| "hand";

export type BrushShape = "square" | "circle";

/** One packed RGBA value per pixel (byte order R,G,B,A in memory). */
export type PixelBuffer = Uint32Array<ArrayBuffer>;

/** 1 = selected, 0 = not selected. One entry per pixel. */
export type SelectionMask = Uint8Array<ArrayBuffer>;

export type Point = { x: number; y: number };

export type SelectionMode = "replace" | "add" | "subtract";

export type Floating = {
	lifted: PixelBuffer;
	mask: SelectionMask;
	offsetX: number;
	offsetY: number;
	/** "lift" = moved out of the canvas, "paste" = came from the clipboard */
	source: "lift" | "paste";
	/** true when there was no selection before lifting (whole canvas move) */
	temporary: boolean;
};

export type Snapshot = {
	width: number;
	height: number;
	pixels: PixelBuffer;
	selection: SelectionMask | null;
};

export type Clip = {
	x: number;
	y: number;
	width: number;
	height: number;
	pixels: PixelBuffer;
	mask: SelectionMask;
};

export type DialogKind = "new" | "export" | "help";

export type ResizeAnchor = "center" | "top-left";

export type Notice = { id: number; message: string };
