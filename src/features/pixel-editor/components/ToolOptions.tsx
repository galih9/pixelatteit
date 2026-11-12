import type { FunctionComponent } from "../../../common/types";
import { MAX_BRUSH_SIZE, TOOLS } from "../constants";
import { useEditorStore } from "../store/editorStore";
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
	<span className="text-xs text-zinc-500">{children}</span>
);

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
