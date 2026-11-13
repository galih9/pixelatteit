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

export type ColorRgba = {
	red: number;
	green: number;
	blue: number;
	alpha?: number;
};

export type ColorInput =
	| string
	| number
	| ColorRgba
	| { r: number; g: number; b: number; a?: number };

export type PixelInfo = {
	red: number;
	green: number;
	blue: number;
	alpha: number;
	hex: string;
	rgbaString: string;
	isTransparent: boolean;
	packed: number;
};

export type DrawLineOptions = {
	size?: number;
	shape?: BrushShape;
};

export type DrawRectOptions = {
	filled?: boolean;
	size?: number;
};

export type DrawCircleOptions = {
	filled?: boolean;
};

export type FloodFillOptions = {
	contiguous?: boolean;
};

export type ExportImageOptions = {
	scale?: number;
	composite?: boolean;
};

export type LayerInfo = {
	id: number;
	name: string;
	visible: boolean;
	opacity: number;
	isActive: boolean;
};

export type FrameInfo = {
	id: number;
	duration: number;
	isCurrent: boolean;
};

export type PaintTargetMeta = {
	data: PixelBuffer;
	width: number;
	height: number;
	mask: SelectionMask | null;
	symmetryX: boolean;
	symmetryY: boolean;
};

export type PixelEditorApi<TState = unknown> = {
	// Dimension & pixel reading
	getDimensions: () => { width: number; height: number };
	getSize: () => { width: number; height: number };
	getPixel: (
		x: number,
		y: number,
		options?: { layerIndex?: number; composite?: boolean }
	) => PixelInfo | null;
	getPixelHex: (
		x: number,
		y: number,
		options?: { layerIndex?: number; composite?: boolean }
	) => string | null;
	getPixels: (options?: {
		layerIndex?: number;
		composite?: boolean;
	}) => PixelBuffer;
	getGrid: (options?: {
		layerIndex?: number;
		composite?: boolean;
	}) => Array<Array<string | null>>;
	getAsciiArt: (options?: {
		composite?: boolean;
		transparentChar?: string;
		opaqueChar?: string;
	}) => string;
	toDataURL: (options?: ExportImageOptions) => string;

	// Pixel mutation
	setPixel: (x: number, y: number, color: ColorInput) => boolean;
	setPixels: (
		pixels: Array<{ x: number; y: number; color: ColorInput }>
	) => number;
	drawLine: (
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		color: ColorInput,
		options?: DrawLineOptions
	) => number;
	drawRect: (
		x: number,
		y: number,
		width: number,
		height: number,
		color: ColorInput,
		options?: DrawRectOptions
	) => number;
	drawCircle: (
		centerX: number,
		centerY: number,
		radius: number,
		color: ColorInput,
		options?: DrawCircleOptions
	) => number;
	floodFill: (
		x: number,
		y: number,
		color: ColorInput,
		options?: FloodFillOptions
	) => boolean;
	clear: (color?: ColorInput) => void;
	loadGrid: (
		grid: Array<Array<ColorInput | null | undefined>>,
		originX?: number,
		originY?: number
	) => number;
	loadAsciiArt: (
		art: string,
		paletteMap: Record<string, ColorInput | null | undefined>,
		originX?: number,
		originY?: number
	) => number;
	loadPixels: (data: PixelBuffer | ArrayLike<number>) => void;
	mutatePixels: (
		mutator: (
			pixels: PixelBuffer,
			meta: { width: number; height: number; target: PaintTargetMeta }
		) => boolean | void
	) => boolean;

	// Document & canvas controls
	newCanvas: (width: number, height: number) => void;
	resizeCanvas: (
		width: number,
		height: number,
		anchor?: ResizeAnchor
	) => void;
	undo: () => void;
	redo: () => void;
	canUndo: () => boolean;
	canRedo: () => boolean;

	// Layers & Frames
	getLayers: () => Array<LayerInfo>;
	getActiveLayerIndex: () => number;
	setActiveLayer: (index: number) => void;
	addLayer: () => void;
	deleteLayer: () => void;
	getFrames: () => Array<FrameInfo>;
	getCurrentFrameIndex: () => number;
	setCurrentFrame: (index: number) => void;
	addFrame: () => void;
	duplicateFrame: () => void;
	deleteFrame: () => void;
	moveFrame: (from: number, to: number) => void;
	setFrameDuration: (index: number, duration: number) => void;
	setFramesDuration: (from: number, to: number, duration: number) => void;
	nextFrame: () => void;
	previousFrame: () => void;
	prevFrame: () => void;

	// Animation playback & tags
	play: () => void;
	pause: () => void;
	togglePlaying: () => void;
	isPlaying: () => boolean;
	setPlayTag: (id: number | null) => void;
	getPlayTag: () => number | null;
	getTags: () => Array<FrameTag>;
	addTag: (
		from: number,
		to: number,
		options?: Partial<Omit<FrameTag, "id">>
	) => FrameTag | null;
	updateTag: (id: number, patch: Partial<Omit<FrameTag, "id">>) => void;
	deleteTag: (id: number) => void;

	// Onion skinning
	toggleOnionSkin: () => void;
	isOnionSkinEnabled: () => boolean;
	setOnionRange: (before: number, after: number) => void;
	getOnionRange: () => { before: number; after: number };

	// Animation rendering & export
	getFramePixels: (frameIndex: number) => PixelBuffer;
	getFrameGrid: (frameIndex: number) => Array<Array<string | null>>;
	toGifDataURL: (options?: {
		scale?: number;
		tagId?: number | null;
	}) => string;
	exportGif: (options?: {
		scale?: number;
		tagId?: number | null;
		fileName?: string;
	}) => void;

	// Tools & Colors
	getTool: () => Tool;
	setTool: (tool: Tool) => void;
	getColors: () => {
		primaryColor: string;
		secondaryColor: string;
		palette: Array<string>;
	};
	setPrimaryColor: (color: ColorInput) => void;
	setSecondaryColor: (color: ColorInput) => void;
	setPalette: (palette: Array<string>) => void;

	// Selection
	selectAll: () => void;
	deselect: () => void;
	setSelectionRect: (
		x: number,
		y: number,
		width: number,
		height: number
	) => void;
	deleteSelection: () => void;

	// View & UI
	fitView: () => void;
	showNotice: (message: string) => void;

	// Direct store access
	getState: () => TState;
	subscribe: (
		listener: (state: TState, previous: TState) => void
	) => () => void;
};
