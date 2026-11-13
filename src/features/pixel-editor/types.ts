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
	| "hand"
	| "text"
	| "blur"
	| "contour";

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

/**
 * One layer of the document. Layers are stored bottom → top.
 *
 * Note: for the *active* layer the live pixels are kept in
 * `EditorState.pixels`, so `layers[activeLayer].pixels` can be stale.
 * Use `syncedLayers()` from the store when you need every layer's pixels.
 */
export type Layer = {
	id: number;
	name: string;
	visible: boolean;
	/** 0–100 */
	opacity: number;
	pixels: PixelBuffer;
};

/**
 * One animation frame. Layers are shared by every frame; a frame only holds
 * the pixels ("cels") of each layer, keyed by layer id. A missing entry is an
 * empty (fully transparent) cel.
 *
 * Note: for the *current* frame the live pixels are kept in `EditorState.layers`
 * (and `pixels` for the active layer), so `frames[currentFrame].cels` can be
 * stale. Use `syncedFrames()` from the store when you need every frame.
 */
export type Frame = {
	id: number;
	/** How long the frame is shown, in milliseconds. */
	duration: number;
	cels: Partial<Record<number, PixelBuffer>>;
};

export type TagDirection = "forward" | "reverse" | "pingpong";

/** A named range of frames, e.g. "walk" = frames 0–5. Indices are inclusive. */
export type FrameTag = {
	id: number;
	name: string;
	from: number;
	to: number;
	color: string;
	direction: TagDirection;
};

export type Snapshot = {
	width: number;
	height: number;
	pixels: PixelBuffer;
	selection: SelectionMask | null;
	layers: Array<Layer>;
	activeLayer: number;
	frames: Array<Frame>;
	currentFrame: number;
	tags: Array<FrameTag>;
};

export type Clip = {
	x: number;
	y: number;
	width: number;
	height: number;
	pixels: PixelBuffer;
	mask: SelectionMask;
};

export type DialogKind = "new" | "export" | "help" | "outline";

export type ResizeAnchor = "center" | "top-left";

export type Notice = { id: number; message: string };

export type TextFont =
	| "pixel-3x5"
	| "pixel-5x7"
	| "sans-serif"
	| "serif"
	| "monospace";

export type TextStyle = {
	font: TextFont;
	/** Integer scale for pixel fonts. */
	scale: number;
	/** Pixel height for system fonts. */
	size: number;
	bold: boolean;
	/** Extra pixels between letters. */
	spacing: number;
};
