import { create } from "zustand";
import {
	DEFAULT_CANVAS_SIZE,
	DEFAULT_PALETTE,
	MAX_BRUSH_SIZE,
	MAX_CANVAS_SIZE,
	MAX_HISTORY,
	MIN_CANVAS_SIZE,
	ZOOM_LEVELS,
} from "../constants";
import { normalizeHex } from "../lib/color";
import { type DocumentData, loadAutosave } from "../lib/persistence";
import {
	combineMasks,
	compositeFloating,
	createPixels,
	eraseMasked,
	extractClip,
	flipPixels,
	fullMask,
	invertMask,
	liftPixels,
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
	Notice,
	PixelBuffer,
	Point,
	ResizeAnchor,
	SelectionMask,
	SelectionMode,
	Snapshot,
	Tool,
} from "../types";

type DocumentState = {
	name: string;
	width: number;
	height: number;
	pixels: PixelBuffer;
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
			Pick<DocumentData, "width" | "height" | "pixels">
	) => void;
	setName: (name: string) => void;
	undo: () => void;
	redo: () => void;
	flip: (axis: "horizontal" | "vertical") => void;
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
	};
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

/* -------------------------------------------------------------------------- */
/*                                    Store                                   */
/* -------------------------------------------------------------------------- */

export const useEditorStore = create<EditorState>()((set, get) => ({
	name: saved?.name ?? "untitled",
	width: saved?.width ?? DEFAULT_CANVAS_SIZE,
	height: saved?.height ?? DEFAULT_CANVAS_SIZE,
	pixels:
		saved?.pixels ?? createPixels(DEFAULT_CANVAS_SIZE, DEFAULT_CANVAS_SIZE),
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
			pixels: createPixels(w, h),
			selection: null,
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
			pixels: resizePixels(
				state.pixels,
				state.width,
				state.height,
				w,
				h,
				anchor
			),
			selection: null,
		}));
		get().fitView();
	},

	loadDocument: (document): void => {
		get().anchorFloating();
		set((state) => ({
			...withHistory(state),
			name: document.name ?? state.name,
			width: document.width,
			height: document.height,
			pixels: document.pixels,
			selection: null,
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
		});
		if (resized) get().fitView();
	},

	flip: (axis): void => {
		get().anchorFloating();
		const state = get();
		const result = flipPixels(
			state.pixels,
			state.selection,
			state.width,
			state.height,
			axis
		);
		state.commitPixels(result.pixels, result.mask);
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
