import { create } from "zustand";
import {
	DEFAULT_CANVAS_SIZE,
	DEFAULT_PALETTE,
	MAX_BRUSH_SIZE,
	MAX_CANVAS_SIZE,
	MAX_HISTORY,
	MAX_LAYERS,
	MIN_CANVAS_SIZE,
	ZOOM_LEVELS,
} from "../constants";
import { hexToPacked, normalizeHex } from "../lib/color";
import {
	blurPixels,
	computeOutline,
	countOpaque,
	type OutlineOptions,
	overlayPixels,
} from "../lib/filters";
import { compositeLayers, createLayer, nextLayerName } from "../lib/layers";
import { type DocumentData, loadAutosave } from "../lib/persistence";
import { renderText } from "../lib/text";
import {
	combineMasks,
	compositeFloating,
	eraseMasked,
	extractClip,
	flipPixels,
	fullMask,
	invertMask,
	liftPixels,
	type PaintTarget,
	plot,
	maskIsEmpty,
	placeClip,
	resizePixels,
	shiftMask,
} from "../lib/raster";
import type {
	BrushShape,
	Clip,
	DialogKind,
	Floating,
	Layer,
	Notice,
	PixelBuffer,
	Point,
	ResizeAnchor,
	SelectionMask,
	SelectionMode,
	Snapshot,
	TextStyle,
	Tool,
} from "../types";

type DocumentState = {
	name: string;
	width: number;
	height: number;
	/** Pixels of the active layer (the live copy, see `Layer`). */
	pixels: PixelBuffer;
	/** Bottom → top. */
	layers: Array<Layer>;
	activeLayer: number;
	selection: SelectionMask | null;
	floating: Floating | null;
	undoStack: Array<Snapshot>;
	redoStack: Array<Snapshot>;
	clipboard: Clip | null;
};

type ToolState = {
	tool: Tool;
	primaryColor: string;
	secondaryColor: string;
	palette: Array<string>;
	brushSize: number;
	brushShape: BrushShape;
	pixelPerfect: boolean;
	shapeFilled: boolean;
	fillContiguous: boolean;
	symmetryX: boolean;
	symmetryY: boolean;
	blurStrength: number;
	blurRadius: number;
	blurPreserveAlpha: boolean;
	blurSnapPalette: boolean;
	textStyle: TextStyle;
	textValue: string;
	/** Top-left of the text being placed, null when not placing text. */
	textDraft: Point | null;
};

type ViewState = {
	zoom: number;
	panX: number;
	panY: number;
	viewportWidth: number;
	viewportHeight: number;
	showGrid: boolean;
	cursor: Point | null;
	dialog: DialogKind | null;
	notice: Notice | null;
};

type Actions = {
	// document
	commitPixels: (pixels: PixelBuffer, selection?: SelectionMask | null) => void;
	newCanvas: (width: number, height: number) => void;
	resizeCanvas: (width: number, height: number, anchor: ResizeAnchor) => void;
	loadDocument: (
		document: Partial<DocumentData> &
			Pick<DocumentData, "width" | "height"> & { pixels?: PixelBuffer }
	) => void;
	setName: (name: string) => void;
	undo: () => void;
	redo: () => void;
	flip: (axis: "horizontal" | "vertical") => void;
	// layers
	setActiveLayer: (index: number) => void;
	addLayer: () => void;
	duplicateLayer: () => void;
	deleteLayer: () => void;
	moveLayer: (direction: 1 | -1) => void;
	mergeDown: () => void;
	flattenImage: () => void;
	renameLayer: (index: number, name: string) => void;
	setLayerVisible: (index: number, visible: boolean) => void;
	soloLayer: (index: number) => void;
	setLayerOpacity: (index: number, opacity: number) => void;
	// filters
	blurLayer: () => void;
	applyOutline: (options: OutlineOptions, toNewLayer: boolean) => void;
	// text
	placeText: (point: Point) => void;
	setTextValue: (value: string) => void;
	setTextStyle: (style: Partial<TextStyle>) => void;
	commitText: () => void;
	cancelText: () => void;
	// selection
	setSelection: (mask: SelectionMask | null, mode?: SelectionMode) => void;
	selectAll: () => void;
	deselect: () => void;
	invertSelection: () => void;
	deleteSelection: () => void;
	liftSelection: () => void;
	setFloatingOffset: (offsetX: number, offsetY: number) => void;
	nudge: (dx: number, dy: number) => void;
	anchorFloating: () => void;
	copy: () => void;
	cut: () => void;
	paste: () => void;
	// tools
	setTool: (tool: Tool) => void;
	setPrimaryColor: (color: string) => void;
	setSecondaryColor: (color: string) => void;
	swapColors: () => void;
	setBrushSize: (size: number) => void;
	setBrushShape: (shape: BrushShape) => void;
	togglePixelPerfect: () => void;
	toggleShapeFilled: () => void;
	toggleFillContiguous: () => void;
	toggleSymmetryX: () => void;
	toggleSymmetryY: () => void;
	setBlurStrength: (value: number) => void;
	setBlurRadius: (value: number) => void;
	toggleBlurPreserveAlpha: () => void;
	toggleBlurSnapPalette: () => void;
	addPaletteColor: (color: string) => void;
	removePaletteColor: (index: number) => void;
	setPalette: (palette: Array<string>) => void;
	// view
	setViewport: (width: number, height: number) => void;
	fitView: () => void;
	zoomTo: (zoom: number, anchorX?: number, anchorY?: number) => void;
	zoomStep: (direction: 1 | -1, anchorX?: number, anchorY?: number) => void;
	setPan: (panX: number, panY: number) => void;
	toggleGrid: () => void;
	setCursor: (cursor: Point | null) => void;
	openDialog: (dialog: DialogKind | null) => void;
	showNotice: (message: string) => void;
	clearNotice: () => void;
};

export type EditorState = DocumentState & ToolState & ViewState & Actions;

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const clampSize = (value: number): number =>
	Math.max(MIN_CANVAS_SIZE, Math.min(MAX_CANVAS_SIZE, Math.round(value) || 1));

function snapshotOf(state: EditorState): Snapshot {
	// Pixel buffers are never mutated in place once they are in the store, so
	// a snapshot can keep references instead of copies.
	return {
		width: state.width,
		height: state.height,
		pixels: state.pixels,
		selection: state.selection,
		layers: state.layers,
		activeLayer: state.activeLayer,
	};
}

/** Every layer with its current pixels (the active one comes from `pixels`). */
export function syncedLayers(
	state: Pick<EditorState, "layers" | "activeLayer" | "pixels">
): Array<Layer> {
	return state.layers.map((layer, index) =>
		index === state.activeLayer && layer.pixels !== state.pixels
			? { ...layer, pixels: state.pixels }
			: layer
	);
}

/**
 * Restoring history should bring back pixels and layer structure, but not
 * undo plain visibility/opacity/name tweaks (those don't create history).
 */
function restoreLayers(
	snapshot: Array<Layer>,
	current: Array<Layer>
): Array<Layer> {
	return snapshot.map((layer) => {
		const live = current.find((candidate) => candidate.id === layer.id);
		return live
			? {
					...layer,
					name: live.name,
					visible: live.visible,
					opacity: live.opacity,
				}
			: layer;
	});
}

/** State patch that makes `layers` the document, `active` the active layer. */
function layersPatch(
	layers: Array<Layer>,
	active: number
): Pick<EditorState, "layers" | "activeLayer" | "pixels"> {
	const activeLayer = Math.max(0, Math.min(layers.length - 1, active));
	return {
		layers,
		activeLayer,
		pixels: layers[activeLayer]?.pixels ?? new Uint32Array(0),
	};
}

function textTarget(state: EditorState, data: PixelBuffer): PaintTarget {
	return {
		data,
		width: state.width,
		height: state.height,
		mask: state.selection,
		symmetryX: false,
		symmetryY: false,
	};
}

/** Draws the text being placed onto a copy of `pixels`. */
export function withTextPreview(
	state: EditorState,
	pixels: PixelBuffer
): PixelBuffer {
	if (!state.textDraft || state.textValue === "") return pixels;
	const bitmap = renderText(state.textValue, state.textStyle);
	const target = textTarget(state, pixels.slice());
	const color = hexToPacked(state.primaryColor);
	const { x: originX, y: originY } = state.textDraft;
	for (let y = 0; y < bitmap.height; y++) {
		for (let x = 0; x < bitmap.width; x++) {
			if (bitmap.mask[y * bitmap.width + x] === 1) {
				plot(target, originX + x, originY + y, color);
			}
		}
	}
	return target.data;
}

function withHistory(
	state: EditorState
): Pick<EditorState, "undoStack" | "redoStack"> {
	return {
		undoStack: [
			...state.undoStack.slice(-(MAX_HISTORY - 1)),
			snapshotOf(state),
		],
		redoStack: [],
	};
}

/** The document as it looks once the floating selection is dropped in place. */
function resolveFloating(
	state: EditorState
): Pick<EditorState, "pixels" | "selection" | "floating" | "undoStack"> {
	const { floating } = state;
	if (!floating) {
		return {
			pixels: state.pixels,
			selection: state.selection,
			floating: null,
			undoStack: state.undoStack,
		};
	}
	const { lifted, mask, offsetX, offsetY } = floating;
	// A lift that never moved changes nothing, so forget its history entry.
	if (floating.source === "lift" && offsetX === 0 && offsetY === 0) {
		const previous = state.undoStack[state.undoStack.length - 1];
		return {
			pixels: previous?.pixels ?? state.pixels,
			selection: floating.temporary ? null : mask,
			floating: null,
			undoStack: state.undoStack.slice(0, -1),
		};
	}
	const pixels = compositeFloating(
		state.pixels,
		lifted,
		mask,
		state.width,
		state.height,
		offsetX,
		offsetY
	);
	const moved = shiftMask(mask, state.width, state.height, offsetX, offsetY);
	return {
		pixels,
		selection: floating.temporary || maskIsEmpty(moved) ? null : moved,
		floating: null,
		undoStack: state.undoStack,
	};
}

function fitZoom(
	width: number,
	height: number,
	viewportWidth: number,
	viewportHeight: number
): { zoom: number; panX: number; panY: number } {
	const available = Math.min(
		(viewportWidth * 0.85) / width,
		(viewportHeight * 0.85) / height
	);
	let zoom = ZOOM_LEVELS[0] ?? 1;
	for (const level of ZOOM_LEVELS) {
		if (level <= available) zoom = level;
	}
	return {
		zoom,
		panX: Math.round((viewportWidth - width * zoom) / 2),
		panY: Math.round((viewportHeight - height * zoom) / 2),
	};
}

const saved = loadAutosave();
let noticeId = 0;

const initialLayers = saved?.layers ?? [
	createLayer(DEFAULT_CANVAS_SIZE, DEFAULT_CANVAS_SIZE, "Layer 1"),
];
const initialActive = Math.min(
	saved?.activeLayer ?? initialLayers.length - 1,
	initialLayers.length - 1
);

/* -------------------------------------------------------------------------- */
/*                                    Store                                   */
/* -------------------------------------------------------------------------- */

export const useEditorStore = create<EditorState>()((set, get) => ({
	name: saved?.name ?? "untitled",
	width: saved?.width ?? DEFAULT_CANVAS_SIZE,
	height: saved?.height ?? DEFAULT_CANVAS_SIZE,
	...layersPatch(initialLayers, initialActive),
	selection: null,
	floating: null,
	undoStack: [],
	redoStack: [],
	clipboard: null,

	tool: "pencil",
	primaryColor: saved?.primaryColor ?? "#000000",
	secondaryColor: saved?.secondaryColor ?? "#fff1e8",
	palette: saved?.palette ?? DEFAULT_PALETTE,
	brushSize: 1,
	brushShape: "square",
	pixelPerfect: false,
	shapeFilled: false,
	fillContiguous: true,
	symmetryX: false,
	symmetryY: false,
	blurStrength: 60,
	blurRadius: 1,
	blurPreserveAlpha: true,
	blurSnapPalette: false,
	textStyle: {
		font: "pixel-5x7",
		scale: 1,
		size: 12,
		bold: false,
		spacing: 1,
	},
	textValue: "",
	textDraft: null,

	zoom: 16,
	panX: 0,
	panY: 0,
	viewportWidth: 0,
	viewportHeight: 0,
	showGrid: true,
	cursor: null,
	dialog: null,
	notice: null,

	/* ------------------------------- document ------------------------------ */

	commitPixels: (pixels, selection): void => {
		set((state) => ({
			...withHistory(state),
			pixels,
			...(selection === undefined ? {} : { selection }),
		}));
	},

	newCanvas: (width, height): void => {
		get().anchorFloating();
		const w = clampSize(width);
		const h = clampSize(height);
		set((state) => ({
			...withHistory(state),
			name: "untitled",
			width: w,
			height: h,
			...layersPatch([createLayer(w, h, "Layer 1")], 0),
			selection: null,
			textDraft: null,
		}));
		get().fitView();
	},

	resizeCanvas: (width, height, anchor): void => {
		get().anchorFloating();
		const w = clampSize(width);
		const h = clampSize(height);
		set((state) => ({
			...withHistory(state),
			width: w,
			height: h,
			...layersPatch(
				syncedLayers(state).map((layer) => ({
					...layer,
					pixels: resizePixels(
						layer.pixels,
						state.width,
						state.height,
						w,
						h,
						anchor
					),
				})),
				state.activeLayer
			),
			selection: null,
			textDraft: null,
		}));
		get().fitView();
	},

	loadDocument: (document): void => {
		get().anchorFloating();
		const layers = document.layers ?? [
			createLayer(document.width, document.height, "Layer 1", document.pixels),
		];
		set((state) => ({
			...withHistory(state),
			name: document.name ?? state.name,
			width: document.width,
			height: document.height,
			...layersPatch(layers, document.activeLayer ?? layers.length - 1),
			selection: null,
			textDraft: null,
			palette: document.palette ?? state.palette,
			primaryColor: document.primaryColor ?? state.primaryColor,
			secondaryColor: document.secondaryColor ?? state.secondaryColor,
		}));
		get().fitView();
	},

	setName: (name): void => {
		set({ name });
	},

	undo: (): void => {
		if (get().textDraft) {
			get().cancelText();
			return;
		}
		get().anchorFloating();
		const state = get();
		const previous = state.undoStack[state.undoStack.length - 1];
		if (!previous) return;
		const resized =
			previous.width !== state.width || previous.height !== state.height;
		set({
			undoStack: state.undoStack.slice(0, -1),
			redoStack: [...state.redoStack, snapshotOf(state)],
			...previous,
			layers: restoreLayers(previous.layers, state.layers),
			textDraft: null,
		});
		if (resized) get().fitView();
	},

	redo: (): void => {
		get().anchorFloating();
		const state = get();
		const next = state.redoStack[state.redoStack.length - 1];
		if (!next) return;
		const resized = next.width !== state.width || next.height !== state.height;
		set({
			redoStack: state.redoStack.slice(0, -1),
			undoStack: [...state.undoStack, snapshotOf(state)],
			...next,
			layers: restoreLayers(next.layers, state.layers),
			textDraft: null,
		});
		if (resized) get().fitView();
	},

	flip: (axis): void => {
		get().anchorFloating();
		const state = get();
		if (!state.selection && state.layers.length > 1) {
			// No selection: flip the whole image, every layer.
			const layers = syncedLayers(state).map((layer) => ({
				...layer,
				pixels: flipPixels(layer.pixels, null, state.width, state.height, axis)
					.pixels,
			}));
			set({ ...withHistory(state), ...layersPatch(layers, state.activeLayer) });
			return;
		}
		const result = flipPixels(
			state.pixels,
			state.selection,
			state.width,
			state.height,
			axis
		);
		state.commitPixels(result.pixels, result.mask);
	},

	/* -------------------------------- layers ------------------------------- */

	setActiveLayer: (index): void => {
		const state = get();
		if (index === state.activeLayer || !state.layers[index]) return;
		state.commitText();
		get().anchorFloating();
		const current = get();
		set(layersPatch(syncedLayers(current), index));
	},

	addLayer: (): void => {
		get().commitText();
		get().anchorFloating();
		const state = get();
		if (state.layers.length >= MAX_LAYERS) {
			state.showNotice(`You can have up to ${MAX_LAYERS} layers`);
			return;
		}
		const layers = syncedLayers(state);
		const layer = createLayer(state.width, state.height, nextLayerName(layers));
		const position = state.activeLayer + 1;
		layers.splice(position, 0, layer);
		set({ ...withHistory(state), ...layersPatch(layers, position) });
	},

	duplicateLayer: (): void => {
		get().commitText();
		get().anchorFloating();
		const state = get();
		if (state.layers.length >= MAX_LAYERS) {
			state.showNotice(`You can have up to ${MAX_LAYERS} layers`);
			return;
		}
		const layers = syncedLayers(state);
		const source = layers[state.activeLayer];
		if (!source) return;
		const copy = createLayer(
			state.width,
			state.height,
			`${source.name} copy`,
			source.pixels.slice()
		);
		copy.visible = source.visible;
		copy.opacity = source.opacity;
		const position = state.activeLayer + 1;
		layers.splice(position, 0, copy);
		set({ ...withHistory(state), ...layersPatch(layers, position) });
	},

	deleteLayer: (): void => {
		get().cancelText();
		get().anchorFloating();
		const state = get();
		if (state.layers.length <= 1) {
			state.showNotice("A drawing needs at least one layer");
			return;
		}
		const layers = syncedLayers(state).filter(
			(_, index) => index !== state.activeLayer
		);
		set({
			...withHistory(state),
			...layersPatch(layers, state.activeLayer - 1),
			selection: null,
		});
	},

	moveLayer: (direction): void => {
		get().commitText();
		get().anchorFloating();
		const state = get();
		const target = state.activeLayer + direction;
		if (target < 0 || target >= state.layers.length) return;
		const layers = syncedLayers(state);
		const [moved] = layers.splice(state.activeLayer, 1);
		if (!moved) return;
		layers.splice(target, 0, moved);
		set({ ...withHistory(state), ...layersPatch(layers, target) });
	},

	mergeDown: (): void => {
		get().commitText();
		get().anchorFloating();
		const state = get();
		const index = state.activeLayer;
		if (index === 0) {
			state.showNotice("There is no layer below to merge into");
			return;
		}
		const layers = syncedLayers(state);
		const top = layers[index];
		const bottom = layers[index - 1];
		if (!top || !bottom) return;
		// Hidden layers merge as if visible: the user asked for it explicitly.
		// The top layer's opacity gets baked in; the bottom keeps its own.
		const merged = compositeLayers(
			[
				{ ...bottom, visible: true, opacity: 100 },
				{ ...top, visible: true },
			],
			state.width * state.height
		);
		layers.splice(index - 1, 2, { ...bottom, pixels: merged });
		set({ ...withHistory(state), ...layersPatch(layers, index - 1) });
	},

	flattenImage: (): void => {
		get().commitText();
		get().anchorFloating();
		const state = get();
		if (state.layers.length <= 1) return;
		const flat = compositeLayers(
			syncedLayers(state),
			state.width * state.height
		);
		const layer = createLayer(state.width, state.height, "Layer 1", flat);
		set({ ...withHistory(state), ...layersPatch([layer], 0) });
	},

	renameLayer: (index, name): void => {
		const trimmed = name.trim();
		set((state) => ({
			layers: state.layers.map((layer, position) =>
				position === index && trimmed ? { ...layer, name: trimmed } : layer
			),
		}));
	},

	setLayerVisible: (index, visible): void => {
		set((state) => ({
			layers: state.layers.map((layer, position) =>
				position === index ? { ...layer, visible } : layer
			),
		}));
	},

	soloLayer: (index): void => {
		set((state) => {
			const alreadySolo = state.layers.every(
				(layer, position) => layer.visible === (position === index)
			);
			return {
				layers: state.layers.map((layer, position) => ({
					...layer,
					visible: alreadySolo ? true : position === index,
				})),
			};
		});
	},

	setLayerOpacity: (index, opacity): void => {
		const value = Math.max(0, Math.min(100, Math.round(opacity)));
		set((state) => ({
			layers: state.layers.map((layer, position) =>
				position === index ? { ...layer, opacity: value } : layer
			),
		}));
	},

	/* ------------------------------- filters ------------------------------- */

	blurLayer: (): void => {
		get().anchorFloating();
		const state = get();
		const result = blurPixels(
			state.pixels,
			state.width,
			state.height,
			state.selection,
			{
				radius: state.blurRadius,
				strength: state.blurStrength,
				preserveAlpha: state.blurPreserveAlpha,
				palette: state.blurSnapPalette
					? state.palette.map((hex) => hexToPacked(hex))
					: null,
			}
		);
		state.commitPixels(result);
	},

	applyOutline: (options, toNewLayer): void => {
		get().commitText();
		get().anchorFloating();
		const state = get();
		const outline = computeOutline(
			state.pixels,
			state.width,
			state.height,
			state.selection,
			options
		);
		if (countOpaque(outline) === 0) {
			state.showNotice("Nothing to outline on this layer");
			return;
		}
		if (!toNewLayer || state.layers.length >= MAX_LAYERS) {
			state.commitPixels(overlayPixels(state.pixels, outline));
			return;
		}
		const layers = syncedLayers(state);
		const active = layers[state.activeLayer];
		const layer = createLayer(
			state.width,
			state.height,
			`${active?.name ?? "Layer"} outline`,
			outline
		);
		// Outside outlines sit under the art, inside outlines on top of it.
		const position =
			options.placement === "outside"
				? state.activeLayer
				: state.activeLayer + 1;
		layers.splice(position, 0, layer);
		// Stay on the art layer so you can keep drawing.
		const artIndex =
			position <= state.activeLayer ? state.activeLayer + 1 : state.activeLayer;
		set({ ...withHistory(state), ...layersPatch(layers, artIndex) });
	},

	/* --------------------------------- text -------------------------------- */

	placeText: (point): void => {
		set({ textDraft: { x: point.x, y: point.y } });
	},

	setTextValue: (textValue): void => {
		set({ textValue });
	},

	setTextStyle: (style): void => {
		set((state) => ({ textStyle: { ...state.textStyle, ...style } }));
	},

	commitText: (): void => {
		const state = get();
		if (!state.textDraft) return;
		if (state.textValue === "") {
			set({ textDraft: null });
			return;
		}
		const pixels = withTextPreview(state, state.pixels);
		set({ ...withHistory(state), pixels, textDraft: null, textValue: "" });
	},

	cancelText: (): void => {
		if (get().textDraft) set({ textDraft: null });
	},

	/* ------------------------------ selection ------------------------------ */

	setSelection: (mask, mode = "replace"): void => {
		get().anchorFloating();
		set((state) => ({
			selection: mask ? combineMasks(state.selection, mask, mode) : null,
		}));
	},

	selectAll: (): void => {
		const { width, height } = get();
		get().setSelection(fullMask(width, height));
	},

	deselect: (): void => {
		get().setSelection(null);
	},

	invertSelection: (): void => {
		get().anchorFloating();
		set((state) => ({
			selection: invertMask(state.selection, state.width * state.height),
		}));
	},

	deleteSelection: (): void => {
		const state = get();
		if (state.floating) {
			// The pixels underneath are already cleared, just drop the floating part.
			set({ floating: null, selection: null });
			return;
		}
		if (!state.selection) return;
		state.commitPixels(eraseMasked(state.pixels, state.selection));
	},

	liftSelection: (): void => {
		const state = get();
		if (state.floating) return;
		const temporary = state.selection === null;
		const mask = state.selection ?? fullMask(state.width, state.height);
		const { base, lifted } = liftPixels(state.pixels, mask);
		set({
			...withHistory(state),
			pixels: base,
			selection: mask,
			floating: {
				lifted,
				mask,
				offsetX: 0,
				offsetY: 0,
				source: "lift",
				temporary,
			},
		});
	},

	setFloatingOffset: (offsetX, offsetY): void => {
		const { floating } = get();
		if (!floating) return;
		if (floating.offsetX === offsetX && floating.offsetY === offsetY) return;
		set({ floating: { ...floating, offsetX, offsetY } });
	},

	nudge: (dx, dy): void => {
		const state = get();
		if (!state.floating) {
			if (!state.selection) return;
			state.liftSelection();
		}
		const { floating } = get();
		if (!floating) return;
		get().setFloatingOffset(floating.offsetX + dx, floating.offsetY + dy);
	},

	anchorFloating: (): void => {
		const state = get();
		if (!state.floating) return;
		set(resolveFloating(state));
	},

	copy: (): void => {
		get().anchorFloating();
		const state = get();
		if (!state.selection) {
			state.showNotice("Select something to copy first");
			return;
		}
		const clip = extractClip(
			state.pixels,
			state.selection,
			state.width,
			state.height
		);
		set({ clipboard: clip });
	},

	cut: (): void => {
		get().copy();
		get().deleteSelection();
	},

	paste: (): void => {
		get().anchorFloating();
		const state = get();
		if (!state.clipboard) return;
		const { lifted, mask } = placeClip(
			state.clipboard,
			state.width,
			state.height
		);
		if (maskIsEmpty(mask)) return;
		set({
			...withHistory(state),
			selection: mask,
			floating: {
				lifted,
				mask,
				offsetX: 0,
				offsetY: 0,
				source: "paste",
				temporary: false,
			},
			tool: "move",
		});
	},

	/* -------------------------------- tools -------------------------------- */

	setTool: (tool): void => {
		if (tool !== "move") get().anchorFloating();
		if (tool !== "text") get().commitText();
		set({ tool });
	},

	setPrimaryColor: (color): void => {
		set({ primaryColor: normalizeHex(color) });
	},

	setSecondaryColor: (color): void => {
		set({ secondaryColor: normalizeHex(color) });
	},

	swapColors: (): void => {
		set((state) => ({
			primaryColor: state.secondaryColor,
			secondaryColor: state.primaryColor,
		}));
	},

	setBrushSize: (size): void => {
		set({ brushSize: Math.max(1, Math.min(MAX_BRUSH_SIZE, Math.round(size))) });
	},

	setBrushShape: (brushShape): void => {
		set({ brushShape });
	},

	togglePixelPerfect: (): void => {
		set((state) => ({ pixelPerfect: !state.pixelPerfect }));
	},

	toggleShapeFilled: (): void => {
		set((state) => ({ shapeFilled: !state.shapeFilled }));
	},

	toggleFillContiguous: (): void => {
		set((state) => ({ fillContiguous: !state.fillContiguous }));
	},

	toggleSymmetryX: (): void => {
		set((state) => ({ symmetryX: !state.symmetryX }));
	},

	toggleSymmetryY: (): void => {
		set((state) => ({ symmetryY: !state.symmetryY }));
	},

	setBlurStrength: (value): void => {
		set({ blurStrength: Math.max(5, Math.min(100, Math.round(value))) });
	},

	setBlurRadius: (value): void => {
		set({ blurRadius: Math.max(1, Math.min(3, Math.round(value))) });
	},

	toggleBlurPreserveAlpha: (): void => {
		set((state) => ({ blurPreserveAlpha: !state.blurPreserveAlpha }));
	},

	toggleBlurSnapPalette: (): void => {
		set((state) => ({ blurSnapPalette: !state.blurSnapPalette }));
	},

	addPaletteColor: (color): void => {
		const hex = normalizeHex(color);
		set((state) =>
			state.palette.includes(hex) ? {} : { palette: [...state.palette, hex] }
		);
	},

	removePaletteColor: (index): void => {
		set((state) => ({
			palette: state.palette.filter((_, position) => position !== index),
		}));
	},

	setPalette: (palette): void => {
		set({ palette: [...new Set(palette.map(normalizeHex))] });
	},

	/* --------------------------------- view -------------------------------- */

	setViewport: (viewportWidth, viewportHeight): void => {
		const first = get().viewportWidth === 0;
		set({ viewportWidth, viewportHeight });
		if (first) get().fitView();
	},

	fitView: (): void => {
		const state = get();
		if (state.viewportWidth === 0) return;
		set(
			fitZoom(
				state.width,
				state.height,
				state.viewportWidth,
				state.viewportHeight
			)
		);
	},

	zoomTo: (zoom, anchorX, anchorY): void => {
		const state = get();
		const x = anchorX ?? state.viewportWidth / 2;
		const y = anchorY ?? state.viewportHeight / 2;
		const documentX = (x - state.panX) / state.zoom;
		const documentY = (y - state.panY) / state.zoom;
		set({
			zoom,
			panX: Math.round(x - documentX * zoom),
			panY: Math.round(y - documentY * zoom),
		});
	},

	zoomStep: (direction, anchorX, anchorY): void => {
		const { zoom } = get();
		const next =
			direction > 0
				? ZOOM_LEVELS.find((level) => level > zoom)
				: [...ZOOM_LEVELS].reverse().find((level) => level < zoom);
		if (next !== undefined) get().zoomTo(next, anchorX, anchorY);
	},

	setPan: (panX, panY): void => {
		set({ panX: Math.round(panX), panY: Math.round(panY) });
	},

	toggleGrid: (): void => {
		set((state) => ({ showGrid: !state.showGrid }));
	},

	setCursor: (cursor): void => {
		const current = get().cursor;
		if (current?.x === cursor?.x && current?.y === cursor?.y) return;
		set({ cursor });
	},

	openDialog: (dialog): void => {
		set({ dialog });
	},

	showNotice: (message): void => {
		noticeId += 1;
		set({ notice: { id: noticeId, message } });
	},

	clearNotice: (): void => {
		set({ notice: null });
	},
}));

/** Pixels as currently visible, including a floating selection. */
export function visiblePixels(state: EditorState): PixelBuffer {
	const { floating } = state;
	if (!floating) return state.pixels;
	return compositeFloating(
		state.pixels,
		floating.lifted,
		floating.mask,
		state.width,
		state.height,
		floating.offsetX,
		floating.offsetY
	);
}

/**
 * The full image as shown on screen: all visible layers flattened, with
 * `active` (defaults to the active layer incl. floating selection) used for
 * the active layer.
 */
export function compositeView(
	state: EditorState,
	active: PixelBuffer = visiblePixels(state)
): PixelBuffer {
	return compositeLayers(
		state.layers.map((layer, index) =>
			index === state.activeLayer ? { ...layer, pixels: active } : layer
		),
		state.width * state.height
	);
}

/** Visible layers flattened (what gets exported). */
export function flattenedPixels(state: EditorState): PixelBuffer {
	return compositeView(state);
}

/** Every layer with up-to-date pixels, floating selection dropped in. */
export function documentLayers(state: EditorState): Array<Layer> {
	const active = visiblePixels(state);
	return state.layers.map((layer, index) =>
		index === state.activeLayer ? { ...layer, pixels: active } : layer
	);
}
