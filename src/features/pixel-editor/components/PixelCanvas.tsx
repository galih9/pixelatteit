import Konva from "konva";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	Group,
	Image as KonvaImage,
	Layer,
	Line,
	Rect,
	Shape,
	Stage,
} from "react-konva";
import type { FunctionComponent } from "../../../common/types";
import { MAJOR_GRID_STEP, PAINT_TOOLS } from "../constants";
import {
	hexToPacked,
	packedAlpha,
	packedToHex,
	TRANSPARENT,
} from "../lib/color";
import { publishFrame } from "../lib/liveView";
import {
	brushOrigin,
	constrainLine,
	constrainSquare,
	ellipsePoints,
	floodFill,
	linePoints,
	plot,
	polygonMask,
	rectanglePoints,
	rectMask,
	regionMask,
	restorePixel,
	selectionEdges,
	stamp,
	type PaintTarget,
} from "../lib/raster";
import {
	type EditorState,
	useEditorStore,
	visiblePixels,
} from "../store/editorStore";
import type { BrushShape, PixelBuffer, Point, SelectionMode } from "../types";

type ShapeTool = "line" | "rectangle" | "ellipse";

type Interaction =
	| {
			kind: "paint";
			color: number;
			base: PixelBuffer;
			target: PaintTarget;
			last: Point;
			stroke: Array<Point>;
			size: number;
			shape: BrushShape;
			pixelPerfect: boolean;
	  }
	| {
			kind: "shape";
			tool: ShapeTool;
			color: number;
			base: PixelBuffer;
			target: PaintTarget;
			start: Point;
			size: number;
			shape: BrushShape;
			filled: boolean;
	  }
	| {
			kind: "select-rect";
			start: Point;
			end: Point;
			mode: SelectionMode;
			moved: boolean;
	  }
	| { kind: "lasso"; points: Array<Point>; mode: SelectionMode }
	| { kind: "move"; start: Point; originX: number; originY: number }
	| {
			kind: "pan";
			clientX: number;
			clientY: number;
			panX: number;
			panY: number;
	  }
	| { kind: "pick"; primary: boolean };

type Preview =
	| { kind: "rect"; x: number; y: number; width: number; height: number }
	| { kind: "lasso"; points: Array<number> }
	| null;

const getState = (): EditorState => useEditorStore.getState();

function selectionMode(event: PointerEvent): SelectionMode {
	if (event.altKey || event.ctrlKey || event.metaKey) return "subtract";
	if (event.shiftKey) return "add";
	return "replace";
}

function clampPoint(point: Point, width: number, height: number): Point {
	return {
		x: Math.max(0, Math.min(width - 1, point.x)),
		y: Math.max(0, Math.min(height - 1, point.y)),
	};
}

function checkerCell(zoom: number): number {
	if (zoom >= 16) return 0.5;
	if (zoom >= 8) return 1;
	return Math.ceil(8 / zoom);
}

function paintPoint(
	interaction: Extract<Interaction, { kind: "paint" }>,
	point: Point
): void {
	const { target, color, stroke } = interaction;
	if (!interaction.pixelPerfect || interaction.size > 1) {
		stamp(target, point.x, point.y, interaction.size, interaction.shape, color);
		return;
	}
	// Pixel-perfect: drop the corner pixel of every "L" shape in the stroke.
	const previous = stroke[stroke.length - 1];
	if (previous?.x === point.x && previous.y === point.y) return;
	stroke.push(point);
	plot(target, point.x, point.y, color);
	const count = stroke.length;
	if (count < 3) return;
	const a = stroke[count - 3];
	const b = stroke[count - 2];
	const c = stroke[count - 1];
	if (!a || !b || !c) return;
	const diagonal = Math.abs(a.x - c.x) === 1 && Math.abs(a.y - c.y) === 1;
	const corner = (b.x === a.x || b.y === a.y) && (b.x === c.x || b.y === c.y);
	if (diagonal && corner) {
		restorePixel(target, interaction.base, b.x, b.y);
		stroke.splice(count - 2, 1);
	}
}

function drawShape(
	interaction: Extract<Interaction, { kind: "shape" }>,
	rawEnd: Point,
	constrain: boolean
): void {
	const { start, target } = interaction;
	target.data.set(interaction.base);
	let end = rawEnd;
	if (constrain) {
		end =
			interaction.tool === "line"
				? constrainLine(start, rawEnd)
				: constrainSquare(start, rawEnd);
	}
	let outline: Array<Point>;
	let fill: Array<Point> = [];
	if (interaction.tool === "line") {
		outline = linePoints(start.x, start.y, end.x, end.y);
	} else {
		const points =
			interaction.tool === "rectangle"
				? rectanglePoints(start.x, start.y, end.x, end.y, interaction.filled)
				: ellipsePoints(start.x, start.y, end.x, end.y, interaction.filled);
		outline = points.outline;
		fill = points.fill;
	}
	for (const point of fill) plot(target, point.x, point.y, interaction.color);
	for (const point of outline) {
		stamp(
			target,
			point.x,
			point.y,
			interaction.size,
			interaction.shape,
			interaction.color
		);
	}
}

export const PixelCanvas = (): FunctionComponent => {
	const containerRef = useRef<HTMLDivElement>(null);
	const imageLayerRef = useRef<Konva.Layer>(null);
	const overlayLayerRef = useRef<Konva.Layer>(null);
	const antsOffsetRef = useRef(0);
	const [bufferCanvas] = useState(() => document.createElement("canvas"));
	const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
	const [hover, setHover] = useState<Point | null>(null);
	const [preview, setPreview] = useState<Preview>(null);
	const [spaceHeld, setSpaceHeld] = useState(false);
	const [isPanning, setIsPanning] = useState(false);

	const width = useEditorStore((state) => state.width);
	const height = useEditorStore((state) => state.height);
	const zoom = useEditorStore((state) => state.zoom);
	const panX = useEditorStore((state) => state.panX);
	const panY = useEditorStore((state) => state.panY);
	const showGrid = useEditorStore((state) => state.showGrid);
	const tool = useEditorStore((state) => state.tool);
	const brushSize = useEditorStore((state) => state.brushSize);
	const selection = useEditorStore((state) => state.selection);
	const floating = useEditorStore((state) => state.floating);
	const symmetryX = useEditorStore((state) => state.symmetryX);
	const symmetryY = useEditorStore((state) => state.symmetryY);

	/* --------------------------- pixel rendering -------------------------- */

	useEffect(() => {
		const draw = (data: PixelBuffer, w: number, h: number): void => {
			if (bufferCanvas.width !== w || bufferCanvas.height !== h) {
				bufferCanvas.width = w;
				bufferCanvas.height = h;
			}
			const context = bufferCanvas.getContext("2d");
			if (!context) return;
			context.putImageData(
				new ImageData(
					new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
					w,
					h
				),
				0,
				0
			);
			imageLayerRef.current?.batchDraw();
			publishFrame(bufferCanvas);
		};
		const drawState = (state: EditorState): void => {
			draw(visiblePixels(state), state.width, state.height);
		};
		drawState(getState());
		// Strokes in progress call `draw` directly through this event.
		const onLiveDraw = (event: Event): void => {
			const detail = (event as CustomEvent<PixelBuffer>).detail;
			const state = getState();
			draw(detail, state.width, state.height);
		};
		const container = containerRef.current;
		container?.addEventListener("pixel-live-draw", onLiveDraw);
		const unsubscribe = useEditorStore.subscribe((state, previous) => {
			if (
				state.pixels !== previous.pixels ||
				state.floating !== previous.floating ||
				state.width !== previous.width ||
				state.height !== previous.height
			) {
				drawState(state);
			}
		});
		return (): void => {
			unsubscribe();
			container?.removeEventListener("pixel-live-draw", onLiveDraw);
		};
	}, [bufferCanvas]);

	/* ------------------------------ viewport ------------------------------ */

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const observer = new ResizeObserver(([entry]) => {
			if (!entry) return;
			const w = Math.floor(entry.contentRect.width);
			const h = Math.floor(entry.contentRect.height);
			setStageSize({ width: w, height: h });
			getState().setViewport(w, h);
		});
		observer.observe(container);
		return (): void => {
			observer.disconnect();
		};
	}, []);

	/* ------------------------------ marching ants ------------------------- */

	const edges = useMemo(
		() => (selection ? selectionEdges(selection, width, height) : []),
		[selection, width, height]
	);

	useEffect(() => {
		const layer = overlayLayerRef.current;
		if (edges.length === 0 || !layer) return;
		let lastTick = 0;
		const animation = new Konva.Animation((frame) => {
			if (!frame || frame.time - lastTick < 90) return false;
			lastTick = frame.time;
			antsOffsetRef.current = (antsOffsetRef.current + 1) % 8;
			return true;
		}, layer);
		animation.start();
		return (): void => {
			animation.stop();
		};
	}, [edges]);

	/* ------------------------------ keyboard ------------------------------ */

	useEffect(() => {
		const isTyping = (event: KeyboardEvent): boolean =>
			event.target instanceof HTMLElement &&
			(event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA");
		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.code === "Space" && !isTyping(event)) {
				event.preventDefault();
				setSpaceHeld(true);
			}
		};
		const onKeyUp = (event: KeyboardEvent): void => {
			if (event.code === "Space") setSpaceHeld(false);
		};
		const onBlur = (): void => {
			setSpaceHeld(false);
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		window.addEventListener("blur", onBlur);
		return (): void => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			window.removeEventListener("blur", onBlur);
		};
	}, []);

	/* ------------------------------- pointer ------------------------------ */

	const spaceHeldRef = useRef(false);
	useEffect(() => {
		spaceHeldRef.current = spaceHeld;
	}, [spaceHeld]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		let interaction: Interaction | null = null;
		let lastPaintPoint: Point | null = null;
		let wheelAccumulator = 0;

		const liveDraw = (data: PixelBuffer): void => {
			container.dispatchEvent(
				new CustomEvent("pixel-live-draw", { detail: data })
			);
		};

		const toDocument = (event: { clientX: number; clientY: number }): Point => {
			const bounds = container.getBoundingClientRect();
			const { zoom: z, panX: x, panY: y } = getState();
			return {
				x: (event.clientX - bounds.left - x) / z,
				y: (event.clientY - bounds.top - y) / z,
			};
		};

		const toPixel = (point: Point): Point => ({
			x: Math.floor(point.x),
			y: Math.floor(point.y),
		});

		const pick = (pixel: Point, primary: boolean): void => {
			const state = getState();
			if (
				pixel.x < 0 ||
				pixel.y < 0 ||
				pixel.x >= state.width ||
				pixel.y >= state.height
			)
				return;
			const value =
				visiblePixels(state)[pixel.y * state.width + pixel.x] ?? TRANSPARENT;
			if (packedAlpha(value) === 0) return;
			const hex = packedToHex(value);
			if (primary) state.setPrimaryColor(hex);
			else state.setSecondaryColor(hex);
		};

		const makeTarget = (state: EditorState): PaintTarget => ({
			data: state.pixels.slice(),
			width: state.width,
			height: state.height,
			mask: state.selection,
			symmetryX: state.symmetryX,
			symmetryY: state.symmetryY,
		});

		const onPointerDown = (event: PointerEvent): void => {
			if (interaction) return;
			const startState = getState();
			const point = toDocument(event);
			const pixel = toPixel(point);

			const wantsPan =
				event.button === 1 ||
				spaceHeldRef.current ||
				startState.tool === "hand";
			if (wantsPan) {
				event.preventDefault();
				container.setPointerCapture(event.pointerId);
				interaction = {
					kind: "pan",
					clientX: event.clientX,
					clientY: event.clientY,
					panX: startState.panX,
					panY: startState.panY,
				};
				setIsPanning(true);
				return;
			}
			if (event.button !== 0 && event.button !== 2) return;
			container.setPointerCapture(event.pointerId);
			const primary = event.button === 0;
			let activeTool = startState.tool;
			if (event.altKey && PAINT_TOOLS.has(activeTool))
				activeTool = "eyedropper";

			if (activeTool !== "move") startState.anchorFloating();
			const state = getState();
			const colorHex = primary ? state.primaryColor : state.secondaryColor;
			const drawsPixels = PAINT_TOOLS.has(activeTool) || activeTool === "fill";
			const inside =
				pixel.x >= 0 &&
				pixel.y >= 0 &&
				pixel.x < state.width &&
				pixel.y < state.height;
			if (
				drawsPixels &&
				inside &&
				state.selection &&
				state.selection[pixel.y * state.width + pixel.x] !== 1
			) {
				state.showNotice(
					"Drawing is limited to the selection · press Esc to deselect"
				);
			}
			const color =
				activeTool === "eraser" ? TRANSPARENT : hexToPacked(colorHex);

			switch (activeTool) {
				case "pencil":
				case "eraser": {
					const target = makeTarget(state);
					const paint: Extract<Interaction, { kind: "paint" }> = {
						kind: "paint",
						color,
						base: state.pixels,
						target,
						last: pixel,
						stroke: [],
						size: state.brushSize,
						shape: state.brushShape,
						pixelPerfect: state.pixelPerfect,
					};
					if (event.shiftKey && lastPaintPoint) {
						for (const linePoint of linePoints(
							lastPaintPoint.x,
							lastPaintPoint.y,
							pixel.x,
							pixel.y
						)) {
							paintPoint(paint, linePoint);
						}
					} else {
						paintPoint(paint, pixel);
					}
					interaction = paint;
					liveDraw(target.data);
					break;
				}
				case "line":
				case "rectangle":
				case "ellipse": {
					const shapeInteraction: Extract<Interaction, { kind: "shape" }> = {
						kind: "shape",
						tool: activeTool,
						color,
						base: state.pixels,
						target: makeTarget(state),
						start: pixel,
						size: state.brushSize,
						shape: state.brushShape,
						filled: state.shapeFilled,
					};
					drawShape(shapeInteraction, pixel, event.shiftKey);
					interaction = shapeInteraction;
					liveDraw(shapeInteraction.target.data);
					break;
				}
				case "fill": {
					const data = state.pixels.slice();
					const changed = floodFill(
						data,
						state.width,
						state.height,
						pixel.x,
						pixel.y,
						color,
						state.fillContiguous,
						state.selection
					);
					if (changed) state.commitPixels(data);
					break;
				}
				case "eyedropper": {
					pick(pixel, primary);
					interaction = { kind: "pick", primary };
					break;
				}
				case "wand": {
					if (
						pixel.x < 0 ||
						pixel.y < 0 ||
						pixel.x >= state.width ||
						pixel.y >= state.height
					) {
						if (selectionMode(event) === "replace") state.deselect();
						break;
					}
					const mask = regionMask(
						visiblePixels(state),
						state.width,
						state.height,
						pixel.x,
						pixel.y,
						state.fillContiguous,
						null
					);
					state.setSelection(mask, selectionMode(event));
					break;
				}
				case "select-rect": {
					const start = clampPoint(pixel, state.width, state.height);
					interaction = {
						kind: "select-rect",
						start,
						end: start,
						mode: selectionMode(event),
						moved: false,
					};
					setPreview({
						kind: "rect",
						x: start.x,
						y: start.y,
						width: 1,
						height: 1,
					});
					break;
				}
				case "lasso": {
					interaction = {
						kind: "lasso",
						points: [point],
						mode: selectionMode(event),
					};
					setPreview({ kind: "lasso", points: [point.x, point.y] });
					break;
				}
				case "move": {
					if (!state.floating) state.liftSelection();
					const { floating: lifted } = getState();
					interaction = {
						kind: "move",
						start: point,
						originX: lifted?.offsetX ?? 0,
						originY: lifted?.offsetY ?? 0,
					};
					break;
				}
				case "hand": {
					break;
				}
			}
		};

		const onPointerMove = (event: PointerEvent): void => {
			const point = toDocument(event);
			const pixel = toPixel(point);
			const state = getState();
			const inside =
				pixel.x >= 0 &&
				pixel.y >= 0 &&
				pixel.x < state.width &&
				pixel.y < state.height;
			state.setCursor(inside ? pixel : null);
			setHover((current) => {
				if (!inside) return null;
				return current?.x === pixel.x && current.y === pixel.y
					? current
					: pixel;
			});
			if (!interaction) return;

			switch (interaction.kind) {
				case "paint": {
					const { last } = interaction;
					if (last.x === pixel.x && last.y === pixel.y) return;
					const points = linePoints(last.x, last.y, pixel.x, pixel.y).slice(1);
					for (const linePoint of points) paintPoint(interaction, linePoint);
					interaction.last = pixel;
					liveDraw(interaction.target.data);
					break;
				}
				case "shape": {
					drawShape(interaction, pixel, event.shiftKey);
					liveDraw(interaction.target.data);
					break;
				}
				case "pick": {
					pick(pixel, interaction.primary);
					break;
				}
				case "select-rect": {
					let end = clampPoint(pixel, state.width, state.height);
					if (event.shiftKey && interaction.mode !== "add") {
						end = clampPoint(
							constrainSquare(interaction.start, end),
							state.width,
							state.height
						);
					}
					if (end.x !== interaction.start.x || end.y !== interaction.start.y)
						interaction.moved = true;
					interaction.end = end;
					const { start } = interaction;
					setPreview({
						kind: "rect",
						x: Math.min(start.x, end.x),
						y: Math.min(start.y, end.y),
						width: Math.abs(end.x - start.x) + 1,
						height: Math.abs(end.y - start.y) + 1,
					});
					break;
				}
				case "lasso": {
					const previous = interaction.points[interaction.points.length - 1];
					if (
						previous &&
						Math.hypot(previous.x - point.x, previous.y - point.y) < 0.25
					)
						return;
					interaction.points.push(point);
					setPreview({
						kind: "lasso",
						points: interaction.points.flatMap((p) => [p.x, p.y]),
					});
					break;
				}
				case "move": {
					state.setFloatingOffset(
						interaction.originX + Math.round(point.x - interaction.start.x),
						interaction.originY + Math.round(point.y - interaction.start.y)
					);
					break;
				}
				case "pan": {
					state.setPan(
						interaction.panX + event.clientX - interaction.clientX,
						interaction.panY + event.clientY - interaction.clientY
					);
					break;
				}
			}
		};

		const finish = (event: PointerEvent): void => {
			if (container.hasPointerCapture(event.pointerId)) {
				container.releasePointerCapture(event.pointerId);
			}
			const current = interaction;
			interaction = null;
			if (!current) return;
			const state = getState();
			switch (current.kind) {
				case "paint": {
					lastPaintPoint = current.last;
					state.commitPixels(current.target.data);
					break;
				}
				case "shape": {
					state.commitPixels(current.target.data);
					break;
				}
				case "select-rect": {
					setPreview(null);
					if (!current.moved) {
						if (current.mode === "replace") state.deselect();
						break;
					}
					const { start, end } = current;
					state.setSelection(
						rectMask(state.width, state.height, start.x, start.y, end.x, end.y),
						current.mode
					);
					break;
				}
				case "lasso": {
					setPreview(null);
					if (current.points.length < 3) {
						if (current.mode === "replace") state.deselect();
						break;
					}
					const mask = polygonMask(state.width, state.height, current.points);
					state.setSelection(mask, current.mode);
					break;
				}
				case "pan": {
					setIsPanning(false);
					break;
				}
				case "move":
				case "pick": {
					break;
				}
			}
		};

		const onPointerLeave = (): void => {
			if (!interaction) {
				setHover(null);
				getState().setCursor(null);
			}
		};

		const onWheel = (event: WheelEvent): void => {
			event.preventDefault();
			const state = getState();
			if (event.shiftKey) {
				state.setPan(state.panX - event.deltaY, state.panY);
				return;
			}
			wheelAccumulator += event.deltaY;
			if (Math.abs(wheelAccumulator) < 40) return;
			const bounds = container.getBoundingClientRect();
			state.zoomStep(
				wheelAccumulator < 0 ? 1 : -1,
				event.clientX - bounds.left,
				event.clientY - bounds.top
			);
			wheelAccumulator = 0;
		};

		const onContextMenu = (event: Event): void => {
			event.preventDefault();
		};

		container.addEventListener("pointerdown", onPointerDown);
		container.addEventListener("pointermove", onPointerMove);
		container.addEventListener("pointerup", finish);
		container.addEventListener("pointercancel", finish);
		container.addEventListener("pointerleave", onPointerLeave);
		container.addEventListener("wheel", onWheel, { passive: false });
		container.addEventListener("contextmenu", onContextMenu);
		return (): void => {
			container.removeEventListener("pointerdown", onPointerDown);
			container.removeEventListener("pointermove", onPointerMove);
			container.removeEventListener("pointerup", finish);
			container.removeEventListener("pointercancel", finish);
			container.removeEventListener("pointerleave", onPointerLeave);
			container.removeEventListener("wheel", onWheel);
			container.removeEventListener("contextmenu", onContextMenu);
		};
	}, []);

	/* ------------------------------- render ------------------------------- */

	const footprint = PAINT_TOOLS.has(tool) ? brushSize : 1;
	const showFootprint =
		hover !== null && tool !== "hand" && tool !== "move" && !spaceHeld;
	const cell = checkerCell(zoom);

	let cursor = "crosshair";
	if (isPanning) cursor = "grabbing";
	else if (spaceHeld || tool === "hand") cursor = "grab";
	else if (tool === "move") cursor = "move";

	return (
		<div
			ref={containerRef}
			className="absolute inset-0 overflow-hidden touch-none"
			style={{ cursor }}
		>
			<Stage
				height={stageSize.height}
				listening={false}
				width={stageSize.width}
			>
				<Layer
					ref={imageLayerRef}
					imageSmoothingEnabled={false}
					listening={false}
				>
					<Group scaleX={zoom} scaleY={zoom} x={panX} y={panY}>
						<Shape
							perfectDrawEnabled={false}
							sceneFunc={(context) => {
								context.setAttr("fillStyle", "#a1a1aa");
								context.fillRect(0, 0, width, height);
								context.setAttr("fillStyle", "#d4d4d8");
								for (let y = 0, row = 0; y < height; y += cell, row++) {
									for (let x = 0, column = 0; x < width; x += cell, column++) {
										if ((row + column) % 2 !== 0) continue;
										context.fillRect(
											x,
											y,
											Math.min(cell, width - x),
											Math.min(cell, height - y)
										);
									}
								}
							}}
						/>
						<KonvaImage height={height} image={bufferCanvas} width={width} />
					</Group>
				</Layer>
				<Layer ref={overlayLayerRef} listening={false}>
					<Group scaleX={zoom} scaleY={zoom} x={panX} y={panY}>
						{showGrid && zoom >= 2 && (
							<Shape
								perfectDrawEnabled={false}
								sceneFunc={(context) => {
									const half = 0.5 / zoom;
									const drawLines = (step: number, color: string): void => {
										context.beginPath();
										for (let x = step; x < width; x += step) {
											context.moveTo(x + half, 0);
											context.lineTo(x + half, height);
										}
										for (let y = step; y < height; y += step) {
											context.moveTo(0, y + half);
											context.lineTo(width, y + half);
										}
										context.setAttr("lineWidth", 1 / zoom);
										context.setAttr("strokeStyle", color);
										context.stroke();
									};
									// Per-pixel lines only when pixels are big enough to see them.
									if (zoom >= 6) drawLines(1, "rgba(113,113,122,0.45)");
									if (width > MAJOR_GRID_STEP || height > MAJOR_GRID_STEP) {
										drawLines(MAJOR_GRID_STEP, "rgba(96,165,250,0.5)");
									}
								}}
							/>
						)}
						<Rect
							height={height}
							stroke="#52525b"
							strokeScaleEnabled={false}
							strokeWidth={1}
							width={width}
						/>
						{symmetryX && (
							<Line
								dash={[4, 4]}
								points={[width / 2, 0, width / 2, height]}
								stroke="#f472b6"
								strokeScaleEnabled={false}
								strokeWidth={1}
							/>
						)}
						{symmetryY && (
							<Line
								dash={[4, 4]}
								points={[0, height / 2, width, height / 2]}
								stroke="#f472b6"
								strokeScaleEnabled={false}
								strokeWidth={1}
							/>
						)}
						{edges.length > 0 && (
							<Group x={floating?.offsetX ?? 0} y={floating?.offsetY ?? 0}>
								<Shape
									perfectDrawEnabled={false}
									sceneFunc={(context) => {
										const half = 0.5 / zoom;
										context.beginPath();
										for (let index = 0; index < edges.length; index += 4) {
											context.moveTo(
												(edges[index] ?? 0) + half,
												(edges[index + 1] ?? 0) + half
											);
											context.lineTo(
												(edges[index + 2] ?? 0) + half,
												(edges[index + 3] ?? 0) + half
											);
										}
										context.setAttr("lineWidth", 1 / zoom);
										context.setLineDash([]);
										context.setAttr("strokeStyle", "#ffffff");
										context.stroke();
										context.setLineDash([4 / zoom, 4 / zoom]);
										context.setAttr(
											"lineDashOffset",
											-antsOffsetRef.current / zoom
										);
										context.setAttr("strokeStyle", "#000000");
										context.stroke();
										context.setLineDash([]);
									}}
								/>
							</Group>
						)}
						{preview?.kind === "rect" && (
							<Rect
								dash={[4, 4]}
								height={preview.height}
								stroke="#ffffff"
								strokeScaleEnabled={false}
								strokeWidth={1}
								width={preview.width}
								x={preview.x}
								y={preview.y}
							/>
						)}
						{preview?.kind === "lasso" && (
							<Line
								closed
								dash={[4, 4]}
								points={preview.points}
								stroke="#ffffff"
								strokeScaleEnabled={false}
								strokeWidth={1}
							/>
						)}
						{showFootprint && (
							<>
								<Rect
									height={footprint}
									stroke="#000000"
									strokeScaleEnabled={false}
									strokeWidth={1}
									width={footprint}
									x={brushOrigin(hover.x, footprint)}
									y={brushOrigin(hover.y, footprint)}
								/>
								<Rect
									dash={[3, 3]}
									height={footprint}
									stroke="#ffffff"
									strokeScaleEnabled={false}
									strokeWidth={1}
									width={footprint}
									x={brushOrigin(hover.x, footprint)}
									y={brushOrigin(hover.y, footprint)}
								/>
							</>
						)}
					</Group>
				</Layer>
			</Stage>
		</div>
	);
};
