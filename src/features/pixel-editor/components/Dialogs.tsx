import { useState } from "react";
import type { FunctionComponent } from "../../../common/types";
import { EXPORT_SCALES, MAX_CANVAS_SIZE, SIZE_PRESETS } from "../constants";
import { exportPng } from "../lib/files";
import { useEditorStore } from "../store/editorStore";
import type { ResizeAnchor } from "../types";
import { OutlineDialog } from "./OutlineDialog";
import { Modal, TextButton } from "./ui";

const clampInput = (value: string): number =>
	Math.max(1, Math.min(MAX_CANVAS_SIZE, Math.round(Number(value)) || 1));

const NewCanvasDialog = ({
	onClose,
}: {
	onClose: () => void;
}): FunctionComponent => {
	const currentWidth = useEditorStore((state) => state.width);
	const currentHeight = useEditorStore((state) => state.height);
	const newCanvas = useEditorStore((state) => state.newCanvas);
	const resizeCanvas = useEditorStore((state) => state.resizeCanvas);
	const [width, setWidth] = useState(String(currentWidth));
	const [height, setHeight] = useState(String(currentHeight));
	const [anchor, setAnchor] = useState<ResizeAnchor>("center");

	const inputClass =
		"w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-100 outline-none focus:border-sky-500";

	return (
		<Modal
			title="Canvas size"
			footer={
				<>
					<TextButton onClick={onClose}>Cancel</TextButton>
					<TextButton
						title="Keep the drawing and change the canvas size"
						onClick={() => {
							resizeCanvas(clampInput(width), clampInput(height), anchor);
							onClose();
						}}
					>
						Resize current
					</TextButton>
					<TextButton
						variant="primary"
						onClick={() => {
							newCanvas(clampInput(width), clampInput(height));
							onClose();
						}}
					>
						Create new
					</TextButton>
				</>
			}
			onClose={onClose}
		>
			<p className="mb-2 text-xs text-zinc-400">Presets</p>
			<div className="mb-4 flex flex-wrap gap-1.5">
				{SIZE_PRESETS.map((size) => (
					<TextButton
						key={size}
						active={Number(width) === size && Number(height) === size}
						onClick={() => {
							setWidth(String(size));
							setHeight(String(size));
						}}
					>
						{size}×{size}
					</TextButton>
				))}
			</div>
			<div className="mb-4 flex items-center gap-3">
				<label className="flex items-center gap-2">
					W
					<input
						className={inputClass}
						max={MAX_CANVAS_SIZE}
						min={1}
						type="number"
						value={width}
						onChange={(event) => {
							setWidth(event.target.value);
						}}
					/>
				</label>
				<span className="text-zinc-500">×</span>
				<label className="flex items-center gap-2">
					H
					<input
						className={inputClass}
						max={MAX_CANVAS_SIZE}
						min={1}
						type="number"
						value={height}
						onChange={(event) => {
							setHeight(event.target.value);
						}}
					/>
				</label>
				<span className="text-xs text-zinc-500">max {MAX_CANVAS_SIZE}</span>
			</div>
			<label className="flex items-center gap-2 text-xs text-zinc-400">
				When resizing, keep the drawing at the
				<select
					className="rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-zinc-100"
					value={anchor}
					onChange={(event) => {
						setAnchor(event.target.value as ResizeAnchor);
					}}
				>
					<option value="center">center</option>
					<option value="top-left">top-left</option>
				</select>
			</label>
		</Modal>
	);
};

const ExportDialog = ({
	onClose,
}: {
	onClose: () => void;
}): FunctionComponent => {
	const width = useEditorStore((state) => state.width);
	const height = useEditorStore((state) => state.height);
	const name = useEditorStore((state) => state.name);
	const [scale, setScale] = useState(width <= 32 ? 8 : 4);
	const [fileName, setFileName] = useState(name);

	return (
		<Modal
			title="Export PNG"
			footer={
				<>
					<TextButton onClick={onClose}>Cancel</TextButton>
					<TextButton
						variant="primary"
						onClick={() => {
							exportPng(scale, fileName);
							onClose();
						}}
					>
						Download PNG
					</TextButton>
				</>
			}
			onClose={onClose}
		>
			<label className="mb-4 flex items-center gap-2">
				File name
				<input
					className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-100 outline-none focus:border-sky-500"
					value={fileName}
					onChange={(event) => {
						setFileName(event.target.value);
					}}
				/>
			</label>
			<p className="mb-2 text-xs text-zinc-400">
				Scale (nearest neighbour, stays crisp)
			</p>
			<div className="flex flex-wrap gap-1.5">
				{EXPORT_SCALES.map((option) => (
					<TextButton
						key={option}
						active={option === scale}
						onClick={() => {
							setScale(option);
						}}
					>
						{option}× · {width * option}×{height * option}
					</TextButton>
				))}
			</div>
		</Modal>
	);
};

const SHORTCUTS: Array<[string, string]> = [
	["B / E / G / I", "Pencil / Eraser / Fill / Eyedropper"],
	["L / U / O", "Line / Rectangle / Ellipse"],
	["M / Q / W", "Rect select / Lasso / Magic wand"],
	["D / R / T", "Contour / Blur brush / Text"],
	["V / H", "Move / Hand"],
	["Shift+N", "New layer"],
	["Shift+O", "Auto outline…"],
	["Enter / Esc (text)", "Apply / cancel text"],
	["Space + drag, middle drag", "Pan"],
	["Mouse wheel, + / -", "Zoom"],
	["0", "Fit to screen"],
	["[ / ]", "Brush size"],
	["X", "Swap colors"],
	["Right click", "Draw with secondary color"],
	["Alt + click", "Pick color while drawing"],
	["Ctrl+Z / Ctrl+Y", "Undo / Redo"],
	["Ctrl+A / Ctrl+D / Esc", "Select all / Deselect"],
	["Ctrl+C / X / V", "Copy / Cut / Paste"],
	["Delete", "Clear selection (on the active layer)"],
	["Arrows (Shift = 8px)", "Nudge selection"],
	["Enter", "Apply moved selection"],
	["#", "Toggle grid"],
	["Ctrl+S / Ctrl+O / Ctrl+E", "Save / Open / Export"],
];

const HelpDialog = ({
	onClose,
}: {
	onClose: () => void;
}): FunctionComponent => (
	<Modal
		footer={<TextButton onClick={onClose}>Close</TextButton>}
		title="Keyboard shortcuts"
		onClose={onClose}
	>
		<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
			{SHORTCUTS.map(([keys, action]) => (
				<div key={keys} className="contents">
					<dt className="font-mono text-zinc-200">{keys}</dt>
					<dd className="text-zinc-400">{action}</dd>
				</div>
			))}
		</dl>
	</Modal>
);

export const Dialogs = (): FunctionComponent => {
	const dialog = useEditorStore((state) => state.dialog);
	const openDialog = useEditorStore((state) => state.openDialog);
	const close = (): void => {
		openDialog(null);
	};
	if (dialog === "new") return <NewCanvasDialog onClose={close} />;
	if (dialog === "export") return <ExportDialog onClose={close} />;
	if (dialog === "help") return <HelpDialog onClose={close} />;
	if (dialog === "outline") return <OutlineDialog onClose={close} />;
	return null;
};
