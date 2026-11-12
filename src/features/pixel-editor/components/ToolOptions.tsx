import { useEffect, useRef } from "react";
import type { FunctionComponent } from "../../../common/types";
import { MAX_BRUSH_SIZE, TOOLS } from "../constants";
import { isPixelFont, TEXT_FONTS } from "../lib/text";
import { useEditorStore } from "../store/editorStore";
import type { TextFont } from "../types";
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
	const pixelPerfect = useEditorStore((state) => state.pixelPerfect);
	const togglePixelPerfect = useEditorStore(
		(state) => state.togglePixelPerfect
	);

	return (
		<>
			<label className="flex items-center gap-2 text-xs text-zinc-400">
				Size
				<input
					className="w-28 accent-sky-500"
					max={MAX_BRUSH_SIZE}
					min={1}
					type="range"
					value={brushSize}
					onChange={(event) => {
						setBrushSize(Number(event.target.value));
					}}
				/>
				<span className="w-8 tabular-nums text-zinc-200">{brushSize}px</span>
			</label>
			<div className="flex gap-1">
				<TextButton
					active={brushShape === "square"}
					onClick={() => {
						setBrushShape("square");
					}}
				>
					■ Square
				</TextButton>
				<TextButton
					active={brushShape === "circle"}
					onClick={() => {
						setBrushShape("circle");
					}}
				>
					● Round
				</TextButton>
			</div>
			{showPixelPerfect && brushSize === 1 && (
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
	const symmetryX = useEditorStore((state) => state.symmetryX);
	const symmetryY = useEditorStore((state) => state.symmetryY);
	const toggleSymmetryX = useEditorStore((state) => state.toggleSymmetryX);
	const toggleSymmetryY = useEditorStore((state) => state.toggleSymmetryY);
	return (
		<>
			<Divider />
			<span className="text-xs text-zinc-400">Mirror</span>
			<Toggle
				checked={symmetryX}
				label="Horizontal"
				onChange={toggleSymmetryX}
			/>
			<Toggle checked={symmetryY} label="Vertical" onChange={toggleSymmetryY} />
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

export const ToolOptions = (): FunctionComponent => {
	const tool = useEditorStore((state) => state.tool);
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
					<Hint>Off = replace that color everywhere</Hint>
				</>
			);
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
		</div>
	);
};
