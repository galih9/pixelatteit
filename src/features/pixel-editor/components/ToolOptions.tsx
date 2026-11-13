import { useEffect, useRef } from "react";
import type { FunctionComponent } from "../../../common/types";
import {
	BRUSH_SHAPES,
	DITHER_PATTERNS,
	MAX_BRUSH_SIZE,
	TOOLS,
} from "../constants";
import { importReferenceImage } from "../lib/files";
import { isPixelFont, TEXT_FONTS } from "../lib/text";
import { useEditorStore } from "../store/editorStore";
import type { DitherPattern, ReplaceScope, TextFont } from "../types";
import { Divider, TextButton, Toggle } from "./ui";

const BrushOptions = ({
	showPixelPerfect,
}: {
	showPixelPerfect: boolean;
}): FunctionComponent => {
	const brushSize = useEditorStore((state) => state.brushSize);
	const setBrushSize = useEditorStore((state) => state.setBrushSize);
	const brushShape = useEditorStore((state) => state.brushShape);
	const setBrushShape = useEditorStore((state) => state.setBrushShape);
	const customBrush = useEditorStore((state) => state.customBrush);
	const captureCustomBrush = useEditorStore(
		(state) => state.captureCustomBrush
	);
	const hasSelection = useEditorStore((state) => state.selection !== null);
	const openDialog = useEditorStore((state) => state.openDialog);
	const pixelPerfect = useEditorStore((state) => state.pixelPerfect);
	const togglePixelPerfect = useEditorStore(
		(state) => state.togglePixelPerfect
	);

	return (
		<>
			<label className="flex shrink-0 items-center gap-2 text-xs text-zinc-400">
				Size
				<input
					className="w-24 accent-sky-500"
					disabled={brushShape === "custom"}
					max={MAX_BRUSH_SIZE}
					min={1}
					type="range"
					value={brushSize}
					onChange={(event) => {
						setBrushSize(Number(event.target.value));
					}}
				/>
				<span className="w-10 tabular-nums text-zinc-200">
					{brushShape === "custom"
						? `${customBrush.width}×${customBrush.height}`
						: `${brushSize}px`}
				</span>
			</label>
			<div className="flex shrink-0 gap-1">
				{BRUSH_SHAPES.map((shape) => (
					<TextButton
						key={shape.id}
						active={brushShape === shape.id}
						title={shape.label}
						onClick={() => {
							setBrushShape(shape.id);
						}}
					>
						{shape.symbol}
					</TextButton>
				))}
				<TextButton
					title="Open custom brush editor"
					onClick={() => {
						openDialog("custom-brush");
					}}
				>
					Edit…
				</TextButton>
				{hasSelection && (
					<TextButton
						title="Capture current selection as custom brush"
						onClick={() => {
							captureCustomBrush();
						}}
					>
						From selection
					</TextButton>
				)}
			</div>
			{showPixelPerfect && brushSize === 1 && brushShape !== "custom" && (
				<Toggle
					checked={pixelPerfect}
					label="Pixel perfect"
					onChange={togglePixelPerfect}
				/>
			)}
		</>
	);
};

const SymmetryOptions = (): FunctionComponent => {
	const width = useEditorStore((state) => state.width);
	const height = useEditorStore((state) => state.height);
	const symmetryX = useEditorStore((state) => state.symmetryX);
	const symmetryY = useEditorStore((state) => state.symmetryY);
	const symmetryXPos = useEditorStore((state) => state.symmetryXPos);
	const symmetryYPos = useEditorStore((state) => state.symmetryYPos);
	const symmetryDiagonal = useEditorStore((state) => state.symmetryDiagonal);
	const toggleSymmetryX = useEditorStore((state) => state.toggleSymmetryX);
	const toggleSymmetryY = useEditorStore((state) => state.toggleSymmetryY);
	const toggleSymmetryDiagonal = useEditorStore(
		(state) => state.toggleSymmetryDiagonal
	);
	const setSymmetryXPos = useEditorStore((state) => state.setSymmetryXPos);
	const setSymmetryYPos = useEditorStore((state) => state.setSymmetryYPos);
	const resetSymmetryAxes = useEditorStore((state) => state.resetSymmetryAxes);

	const axisX = symmetryXPos ?? width / 2;
	const axisY = symmetryYPos ?? height / 2;
	const hasCustomAxis = symmetryXPos !== null || symmetryYPos !== null;

	return (
		<>
			<Divider />
			<span className="shrink-0 text-xs text-zinc-400">Mirror</span>
			<Toggle
				checked={symmetryX}
				label="H"
				onChange={toggleSymmetryX}
			/>
			<Toggle checked={symmetryY} label="V" onChange={toggleSymmetryY} />
			<Toggle
				checked={symmetryDiagonal}
				label="4-way"
				onChange={toggleSymmetryDiagonal}
			/>
			{symmetryX && (
				<label className="flex shrink-0 items-center gap-1 text-[11px] text-zinc-400">
					X
					<input
						aria-label="Vertical mirror axis position"
						className="w-12 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-center tabular-nums text-zinc-100 outline-none focus:border-sky-500"
						max={width - 0.5}
						min={0.5}
						step={0.5}
						type="number"
						value={axisX}
						onChange={(event) => {
							setSymmetryXPos(Number(event.target.value));
						}}
					/>
				</label>
			)}
			{symmetryY && (
				<label className="flex shrink-0 items-center gap-1 text-[11px] text-zinc-400">
					Y
					<input
						aria-label="Horizontal mirror axis position"
						className="w-12 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-center tabular-nums text-zinc-100 outline-none focus:border-sky-500"
						max={height - 0.5}
						min={0.5}
						step={0.5}
						type="number"
						value={axisY}
						onChange={(event) => {
							setSymmetryYPos(Number(event.target.value));
						}}
					/>
				</label>
			)}
			{hasCustomAxis && (
				<TextButton title="Center symmetry axes" onClick={resetSymmetryAxes}>
					Center
				</TextButton>
			)}
		</>
	);
};

const SelectionActions = (): FunctionComponent => {
	const selectAll = useEditorStore((state) => state.selectAll);
	const deselect = useEditorStore((state) => state.deselect);
	const invertSelection = useEditorStore((state) => state.invertSelection);
	const hasSelection = useEditorStore((state) => state.selection !== null);
	return (
		<>
			<Divider />
			<TextButton title="Ctrl+A" onClick={selectAll}>
				Select all
			</TextButton>
			<TextButton
				disabled={!hasSelection}
				title="Ctrl+D / Esc"
				onClick={deselect}
			>
				Deselect
			</TextButton>
			<TextButton title="Ctrl+Shift+I" onClick={invertSelection}>
				Invert
			</TextButton>
		</>
	);
};

const Hint = ({ children }: { children: string }): FunctionComponent => (
	<span className="shrink-0 text-xs text-zinc-500">{children}</span>
);

const NumberSlider = ({
	label,
	value,
	min,
	max,
	suffix = "",
	width = "w-24",
	onChange,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	suffix?: string;
	width?: string;
	onChange: (value: number) => void;
}): FunctionComponent => (
	<label className="flex shrink-0 items-center gap-2 text-xs text-zinc-400">
		{label}
		<input
			className={`${width} accent-sky-500`}
			max={max}
			min={min}
			type="range"
			value={value}
			onChange={(event) => {
				onChange(Number(event.target.value));
			}}
		/>
		<span className="w-9 tabular-nums text-zinc-200">
			{value}
			{suffix}
		</span>
	</label>
);

const BlurOptions = (): FunctionComponent => {
	const strength = useEditorStore((state) => state.blurStrength);
	const setStrength = useEditorStore((state) => state.setBlurStrength);
	const radius = useEditorStore((state) => state.blurRadius);
	const setRadius = useEditorStore((state) => state.setBlurRadius);
	const preserveAlpha = useEditorStore((state) => state.blurPreserveAlpha);
	const togglePreserveAlpha = useEditorStore(
		(state) => state.toggleBlurPreserveAlpha
	);
	const snapPalette = useEditorStore((state) => state.blurSnapPalette);
	const toggleSnapPalette = useEditorStore(
		(state) => state.toggleBlurSnapPalette
	);
	const blurLayer = useEditorStore((state) => state.blurLayer);
	const hasSelection = useEditorStore((state) => state.selection !== null);
	return (
		<>
			<Divider />
			<NumberSlider
				label="Strength"
				max={100}
				min={5}
				suffix="%"
				value={strength}
				onChange={setStrength}
			/>
			<NumberSlider
				label="Radius"
				max={3}
				min={1}
				suffix="px"
				value={radius}
				width="w-14"
				onChange={setRadius}
			/>
			<Toggle
				checked={preserveAlpha}
				label="Keep transparency"
				onChange={togglePreserveAlpha}
			/>
			<Toggle
				checked={snapPalette}
				label="Snap to palette"
				onChange={toggleSnapPalette}
			/>
			<Divider />
			<TextButton
				title="Blur the whole active layer (or the selection) once"
				onClick={blurLayer}
			>
				{hasSelection ? "Blur selection" : "Blur layer"}
			</TextButton>
		</>
	);
};

const TextOptions = (): FunctionComponent => {
	const inputRef = useRef<HTMLInputElement>(null);
	const textValue = useEditorStore((state) => state.textValue);
	const setTextValue = useEditorStore((state) => state.setTextValue);
	const style = useEditorStore((state) => state.textStyle);
	const setStyle = useEditorStore((state) => state.setTextStyle);
	const draft = useEditorStore((state) => state.textDraft);
	const commitText = useEditorStore((state) => state.commitText);
	const cancelText = useEditorStore((state) => state.cancelText);
	const pixelFont = isPixelFont(style.font);

	const placed = draft !== null;
	useEffect(() => {
		if (!placed) return;
		const frame = window.requestAnimationFrame(() => {
			inputRef.current?.focus();
		});
		return (): void => {
			window.cancelAnimationFrame(frame);
		};
	}, [placed, draft]);

	return (
		<>
			<input
				ref={inputRef}
				aria-label="Text"
				className="h-7 w-44 shrink-0 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-sky-500"
				placeholder={placed ? "Type your text…" : "Click the canvas first"}
				value={textValue}
				onChange={(event) => {
					setTextValue(event.target.value);
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						commitText();
					}
					if (event.key === "Escape") {
						event.preventDefault();
						cancelText();
						inputRef.current?.blur();
					}
				}}
			/>
			<select
				aria-label="Font"
				className="h-7 shrink-0 rounded-md border border-zinc-700 bg-zinc-800 px-1.5 text-xs text-zinc-100"
				value={style.font}
				onChange={(event) => {
					setStyle({ font: event.target.value as TextFont });
				}}
			>
				{TEXT_FONTS.map((font) => (
					<option key={font.id} value={font.id}>
						{font.label}
					</option>
				))}
			</select>
			{pixelFont ? (
				<NumberSlider
					label="Scale"
					max={4}
					min={1}
					suffix="×"
					value={style.scale}
					width="w-16"
					onChange={(scale) => {
						setStyle({ scale });
					}}
				/>
			) : (
				<>
					<NumberSlider
						label="Size"
						max={48}
						min={6}
						suffix="px"
						value={style.size}
						onChange={(size) => {
							setStyle({ size });
						}}
					/>
					<Toggle
						checked={style.bold}
						label="Bold"
						onChange={() => {
							setStyle({ bold: !style.bold });
						}}
					/>
				</>
			)}
			<NumberSlider
				label="Spacing"
				max={4}
				min={0}
				suffix="px"
				value={style.spacing}
				width="w-14"
				onChange={(spacing) => {
					setStyle({ spacing });
				}}
			/>
			<Divider />
			<TextButton
				disabled={!placed || textValue === ""}
				title="Enter"
				variant="primary"
				onClick={commitText}
			>
				Apply
			</TextButton>
			<TextButton disabled={!placed} title="Esc" onClick={cancelText}>
				Cancel
			</TextButton>
			<Hint>Uses the left color · drag the box to move it</Hint>
		</>
	);
};

const DitherOptions = (): FunctionComponent => {
	const ditherPattern = useEditorStore((state) => state.ditherPattern);
	const setDitherPattern = useEditorStore((state) => state.setDitherPattern);
	const ditherDensity = useEditorStore((state) => state.ditherDensity);
	const setDitherDensity = useEditorStore((state) => state.setDitherDensity);
	const ditherTwoColor = useEditorStore((state) => state.ditherTwoColor);
	const toggleDitherTwoColor = useEditorStore(
		(state) => state.toggleDitherTwoColor
	);

	return (
		<>
			<Divider />
			<label className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-400">
				Pattern
				<select
					className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-xs text-zinc-100 outline-none focus:border-sky-500"
					value={ditherPattern}
					onChange={(event) => {
						setDitherPattern(event.target.value as DitherPattern);
					}}
				>
					{DITHER_PATTERNS.map((pattern) => (
						<option key={pattern.id} value={pattern.id}>
							{pattern.label}
						</option>
					))}
				</select>
			</label>
			<NumberSlider
				label="Density"
				max={100}
				min={5}
				suffix="%"
				value={ditherDensity}
				width="w-20"
				onChange={setDitherDensity}
			/>
			<Toggle
				checked={ditherTwoColor}
				label="2-color"
				onChange={toggleDitherTwoColor}
			/>
		</>
	);
};

const ReplaceOptions = (): FunctionComponent => {
	const replaceFromColor = useEditorStore((state) => state.replaceFromColor);
	const setReplaceFromColor = useEditorStore(
		(state) => state.setReplaceFromColor
	);
	const replaceTolerance = useEditorStore((state) => state.replaceTolerance);
	const setReplaceTolerance = useEditorStore(
		(state) => state.setReplaceTolerance
	);
	const replaceScope = useEditorStore((state) => state.replaceScope);
	const setReplaceScope = useEditorStore((state) => state.setReplaceScope);
	const primaryColor = useEditorStore((state) => state.primaryColor);
	const replaceColor = useEditorStore((state) => state.replaceColor);
	const hasSelection = useEditorStore((state) => state.selection !== null);

	return (
		<>
			<div className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-400">
				<span>From</span>
				{replaceFromColor ? (
					<button
						className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-200 hover:border-zinc-500"
						title="Click to clear source color"
						type="button"
						onClick={() => {
							setReplaceFromColor(null);
						}}
					>
						<span
							className="swatch-preserve h-3 w-3 rounded-sm border border-zinc-500"
							style={{ background: replaceFromColor }}
						/>
						{replaceFromColor}
					</button>
				) : (
					<span className="rounded border border-dashed border-zinc-700 px-1.5 py-0.5 text-[11px] text-zinc-500">
						Click canvas
					</span>
				)}
				<span>→</span>
				<span
					className="swatch-preserve h-4 w-4 rounded-sm border border-zinc-400"
					style={{ background: primaryColor }}
					title={`Replace with ${primaryColor}`}
				/>
			</div>
			<Divider />
			<NumberSlider
				label="Tolerance"
				max={100}
				min={0}
				value={replaceTolerance}
				width="w-20"
				onChange={setReplaceTolerance}
			/>
			<label className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-400">
				Scope
				<select
					className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-xs text-zinc-100 outline-none focus:border-sky-500"
					value={replaceScope}
					onChange={(event) => {
						setReplaceScope(event.target.value as ReplaceScope);
					}}
				>
					<option value="layer">Active layer</option>
					<option value="all-layers">All layers</option>
					<option value="all-frames">All frames</option>
				</select>
			</label>
			<TextButton
				disabled={!replaceFromColor}
				variant="primary"
				onClick={() => {
					if (replaceFromColor) {
						replaceColor(replaceFromColor, primaryColor);
					}
				}}
			>
				{hasSelection ? "Replace in selection" : "Replace all"}
			</TextButton>
			<Hint>Click canvas color to replace it</Hint>
		</>
	);
};

const ReferenceOptions = (): FunctionComponent => {
	const activeLayerIndex = useEditorStore((state) => state.activeLayer);
	const activeLayer = useEditorStore(
		(state) => state.layers[state.activeLayer]
	);
	const updateReferenceLayer = useEditorStore(
		(state) => state.updateReferenceLayer
	);
	const fitReferenceLayer = useEditorStore((state) => state.fitReferenceLayer);
	const setLayerOpacity = useEditorStore((state) => state.setLayerOpacity);

	if (!activeLayer || activeLayer.kind !== "reference" || !activeLayer.reference) {
		return null;
	}
	const reference = activeLayer.reference;
	const scalePercent = Math.round(
		(reference.width / Math.max(1, reference.naturalWidth)) * 100
	);

	return (
		<>
			<Divider />
			<span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
				Reference
			</span>
			<NumberSlider
				label="Opacity"
				max={100}
				min={10}
				suffix="%"
				value={activeLayer.opacity}
				width="w-16"
				onChange={(value) => {
					setLayerOpacity(activeLayerIndex, value);
				}}
			/>
			<NumberSlider
				label="Scale"
				max={200}
				min={2}
				suffix="%"
				value={scalePercent}
				width="w-20"
				onChange={(value) => {
					const ratio = value / 100;
					updateReferenceLayer(activeLayerIndex, {
						width: reference.naturalWidth * ratio,
						height: reference.naturalHeight * ratio,
					});
				}}
			/>
			<Toggle
				checked={reference.smooth}
				label="Smooth"
				onChange={() => {
					updateReferenceLayer(activeLayerIndex, { smooth: !reference.smooth });
				}}
			/>
			<TextButton
				onClick={() => {
					fitReferenceLayer(activeLayerIndex);
				}}
			>
				Fit
			</TextButton>
			<TextButton
				onClick={() => {
					void importReferenceImage(activeLayerIndex);
				}}
			>
				Replace image…
			</TextButton>
		</>
	);
};

export const ToolOptions = (): FunctionComponent => {
	const tool = useEditorStore((state) => state.tool);
	const activeLayer = useEditorStore(
		(state) => state.layers[state.activeLayer]
	);
	const shapeFilled = useEditorStore((state) => state.shapeFilled);
	const toggleShapeFilled = useEditorStore((state) => state.toggleShapeFilled);
	const fillContiguous = useEditorStore((state) => state.fillContiguous);
	const toggleFillContiguous = useEditorStore(
		(state) => state.toggleFillContiguous
	);
	const flip = useEditorStore((state) => state.flip);
	const label = TOOLS.find((info) => info.id === tool)?.label ?? "";

	let content: React.ReactNode = null;
	switch (tool) {
		case "pencil":
		case "eraser": {
			content = (
				<>
					<BrushOptions showPixelPerfect />
					<SymmetryOptions />
					<Hint>Shift+click: line from last point · Alt: pick color</Hint>
				</>
			);
			break;
		}
		case "dither": {
			content = (
				<>
					<BrushOptions showPixelPerfect={false} />
					<DitherOptions />
					<SymmetryOptions />
					<Hint>Left: primary · Right: swap · World-aligned pattern</Hint>
				</>
			);
			break;
		}
		case "line":
		case "rectangle":
		case "ellipse": {
			content = (
				<>
					<BrushOptions showPixelPerfect={false} />
					{tool !== "line" && (
						<Toggle
							checked={shapeFilled}
							label="Filled"
							onChange={toggleShapeFilled}
						/>
					)}
					<SymmetryOptions />
					<Hint>
						{tool === "line"
							? "Shift: snap angle"
							: "Shift: perfect square/circle"}
					</Hint>
				</>
			);
			break;
		}
		case "contour": {
			content = (
				<>
					<BrushOptions showPixelPerfect={false} />
					<SymmetryOptions />
					<Hint>Draw around a shape · it fills when you let go</Hint>
				</>
			);
			break;
		}
		case "blur": {
			content = (
				<>
					<BrushOptions showPixelPerfect={false} />
					<BlurOptions />
					<SymmetryOptions />
					<Hint>Each stroke blurs once · stroke again for more</Hint>
				</>
			);
			break;
		}
		case "text": {
			content = <TextOptions />;
			break;
		}
		case "fill": {
			content = (
				<>
					<Toggle
						checked={fillContiguous}
						label="Contiguous"
						onChange={toggleFillContiguous}
					/>
					<SymmetryOptions />
					<Hint>Off = replace that color everywhere</Hint>
				</>
			);
			break;
		}
		case "replace": {
			content = <ReplaceOptions />;
			break;
		}
		case "wand": {
			content = (
				<>
					<Toggle
						checked={fillContiguous}
						label="Contiguous"
						onChange={toggleFillContiguous}
					/>
					<Hint>Shift: add · Alt/Ctrl: subtract</Hint>
					<SelectionActions />
				</>
			);
			break;
		}
		case "select-rect":
		case "lasso": {
			content = (
				<>
					<Hint>Shift: add · Alt/Ctrl: subtract · Click: deselect</Hint>
					<SelectionActions />
				</>
			);
			break;
		}
		case "move": {
			content = (
				<>
					<Hint>Drag or use arrow keys (Shift = 8px) · Enter: apply</Hint>
					<Divider />
					<TextButton
						onClick={() => {
							flip("horizontal");
						}}
					>
						Flip H
					</TextButton>
					<TextButton
						onClick={() => {
							flip("vertical");
						}}
					>
						Flip V
					</TextButton>
				</>
			);
			break;
		}
		case "eyedropper": {
			content = <Hint>Left click: primary · Right click: secondary</Hint>;
			break;
		}
		case "hand": {
			content = (
				<Hint>Drag to pan · Tip: hold Space or middle mouse with any tool</Hint>
			);
			break;
		}
	}

	return (
		<div className="flex h-10 shrink-0 items-center gap-3 overflow-x-auto border-b border-zinc-800 bg-zinc-900/80 px-3">
			<span className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-400">
				{label}
			</span>
			{content}
			{activeLayer?.kind === "reference" && <ReferenceOptions />}
		</div>
	);
};
