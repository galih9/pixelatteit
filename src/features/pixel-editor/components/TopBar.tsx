import { type CSSProperties, useId } from "react";
import {
	ArrowDownTrayIcon,
	ArrowsPointingInIcon,
	ArrowsRightLeftIcon,
	ArrowsUpDownIcon,
	ArrowUturnLeftIcon,
	ArrowUturnRightIcon,
	DocumentPlusIcon,
	FolderOpenIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
	MapIcon,
	PhotoIcon,
	QuestionMarkCircleIcon,
	SparklesIcon,
	Squares2X2Icon,
	TableCellsIcon,
} from "@heroicons/react/20/solid";
import type { FunctionComponent } from "../../../common/types";
import { openFile, saveProject } from "../lib/files";
import { useEditorStore } from "../store/editorStore";
import { Divider, IconButton, TextButton, Toggle } from "./ui";

const SYMMETRY_ANCHOR = { anchorName: "--symmetry-anchor" } as CSSProperties;
const SYMMETRY_POPOVER_POS = {
	positionAnchor: "--symmetry-anchor",
} as CSSProperties;

export const TopBar = (): FunctionComponent => {
	const symmetryPopoverId = useId();
	const name = useEditorStore((state) => state.name);
	const setName = useEditorStore((state) => state.setName);
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
	const canUndo = useEditorStore(
		(state) => state.undoStack.length > 0 || state.floating !== null
	);
	const canRedo = useEditorStore((state) => state.redoStack.length > 0);
	const undo = useEditorStore((state) => state.undo);
	const redo = useEditorStore((state) => state.redo);
	const flip = useEditorStore((state) => state.flip);
	const showGrid = useEditorStore((state) => state.showGrid);
	const toggleGrid = useEditorStore((state) => state.toggleGrid);
	const zoom = useEditorStore((state) => state.zoom);
	const zoomStep = useEditorStore((state) => state.zoomStep);
	const fitView = useEditorStore((state) => state.fitView);
	const openDialog = useEditorStore((state) => state.openDialog);

	const iconClass = "h-8 w-8";
	const svgClass = "h-[18px] w-[18px]";

	return (
		<header className="flex h-11 shrink-0 items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-2">
			<div className="mr-2 flex items-center gap-2 pl-1">
				<div className="grid h-5 w-5 grid-cols-2 grid-rows-2 overflow-hidden rounded-sm">
					<span className="bg-pink-500" />
					<span className="bg-sky-400" />
					<span className="bg-amber-300" />
					<span className="bg-emerald-400" />
				</div>
				<input
					aria-label="Project name"
					className="w-36 rounded bg-transparent px-1.5 py-0.5 text-sm font-medium text-zinc-100 outline-none hover:bg-zinc-800 focus:bg-zinc-800"
					value={name}
					onChange={(event) => {
						setName(event.target.value);
					}}
				/>
			</div>

			<IconButton
				className={iconClass}
				label="New / resize canvas"
				onClick={() => {
					openDialog("new");
				}}
			>
				<DocumentPlusIcon className={svgClass} />
			</IconButton>
			<IconButton
				className={iconClass}
				label="Open project or image (Ctrl+O)"
				onClick={() => {
					void openFile();
				}}
			>
				<FolderOpenIcon className={svgClass} />
			</IconButton>
			<IconButton
				className={iconClass}
				label="Save project (Ctrl+S)"
				onClick={saveProject}
			>
				<ArrowDownTrayIcon className={svgClass} />
			</IconButton>
			<IconButton
				className={iconClass}
				label="Export PNG / GIF (Ctrl+E)"
				onClick={() => {
					openDialog("export");
				}}
			>
				<PhotoIcon className={svgClass} />
			</IconButton>
			<IconButton
				className={iconClass}
				label="Export sprite sheet (Ctrl+Shift+E)"
				onClick={() => {
					openDialog("spritesheet");
				}}
			>
				<TableCellsIcon className={svgClass} />
			</IconButton>

			<Divider />

			<IconButton
				className={iconClass}
				disabled={!canUndo}
				label="Undo (Ctrl+Z)"
				onClick={undo}
			>
				<ArrowUturnLeftIcon className={svgClass} />
			</IconButton>
			<IconButton
				className={iconClass}
				disabled={!canRedo}
				label="Redo (Ctrl+Y)"
				onClick={redo}
			>
				<ArrowUturnRightIcon className={svgClass} />
			</IconButton>

			<Divider />

			<IconButton
				className={iconClass}
				label="Flip horizontal (selection or canvas)"
				onClick={() => {
					flip("horizontal");
				}}
			>
				<ArrowsRightLeftIcon className={svgClass} />
			</IconButton>
			<IconButton
				className={iconClass}
				label="Flip vertical (selection or canvas)"
				onClick={() => {
					flip("vertical");
				}}
			>
				<ArrowsUpDownIcon className={svgClass} />
			</IconButton>
			<IconButton
				className={iconClass}
				label="Auto outline… (Shift+O)"
				onClick={() => {
					openDialog("outline");
				}}
			>
				<SparklesIcon className={svgClass} />
			</IconButton>
			<IconButton
				active={showGrid}
				className={iconClass}
				label="Toggle grid (#)"
				onClick={toggleGrid}
			>
				<Squares2X2Icon className={svgClass} />
			</IconButton>
			<IconButton
				className={iconClass}
				label="Tilemap preview (Shift+T)"
				onClick={() => {
					openDialog("tilemap");
				}}
			>
				<MapIcon className={svgClass} />
			</IconButton>

			<button
				popoverTarget={symmetryPopoverId}
				style={SYMMETRY_ANCHOR}
				title="Configure symmetry / mirror axes"
				type="button"
				className={`ml-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
					symmetryX || symmetryY || symmetryDiagonal
						? "bg-sky-500/25 text-sky-200 ring-1 ring-sky-500/60"
						: "text-zinc-300 hover:bg-zinc-800 hover:text-white"
				}`}
			>
				Symmetry ▾
			</button>

			<div
				className="editor-popover w-64 rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs text-zinc-200 shadow-2xl"
				id={symmetryPopoverId}
				popover="auto"
				style={SYMMETRY_POPOVER_POS}
			>
				<div className="mb-2 flex items-center justify-between">
					<span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
						Symmetry Axes
					</span>
					<TextButton onClick={resetSymmetryAxes}>Reset center</TextButton>
				</div>
				<div className="space-y-2">
					<Toggle
						checked={symmetryX}
						label="Mirror Horizontal (Vertical line)"
						onChange={toggleSymmetryX}
					/>
					<Toggle
						checked={symmetryY}
						label="Mirror Vertical (Horizontal line)"
						onChange={toggleSymmetryY}
					/>
					<Toggle
						checked={symmetryDiagonal}
						label="Diagonal / 4-way reflection"
						onChange={toggleSymmetryDiagonal}
					/>
					<div className="grid grid-cols-2 gap-2 border-t border-zinc-800 pt-2">
						<label className="text-[11px] text-zinc-400">
							X axis
							<input
								className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 tabular-nums text-zinc-100 outline-none focus:border-sky-500"
								max={width - 0.5}
								min={0.5}
								step={0.5}
								type="number"
								value={symmetryXPos ?? width / 2}
								onChange={(event) => {
									setSymmetryXPos(Number(event.target.value));
								}}
							/>
						</label>
						<label className="text-[11px] text-zinc-400">
							Y axis
							<input
								className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 tabular-nums text-zinc-100 outline-none focus:border-sky-500"
								max={height - 0.5}
								min={0.5}
								step={0.5}
								type="number"
								value={symmetryYPos ?? height / 2}
								onChange={(event) => {
									setSymmetryYPos(Number(event.target.value));
								}}
							/>
						</label>
					</div>
				</div>
			</div>

			<div className="ml-auto flex items-center gap-1">
				<IconButton
					className={iconClass}
					label="Zoom out (-)"
					onClick={() => {
						zoomStep(-1);
					}}
				>
					<MagnifyingGlassMinusIcon className={svgClass} />
				</IconButton>
				<span className="w-14 text-center text-xs tabular-nums text-zinc-300">
					{zoom * 100}%
				</span>
				<IconButton
					className={iconClass}
					label="Zoom in (+)"
					onClick={() => {
						zoomStep(1);
					}}
				>
					<MagnifyingGlassPlusIcon className={svgClass} />
				</IconButton>
				<IconButton
					className={iconClass}
					label="Fit to screen (0)"
					onClick={fitView}
				>
					<ArrowsPointingInIcon className={svgClass} />
				</IconButton>
				<Divider />
				<IconButton
					className={iconClass}
					label="Keyboard shortcuts (?)"
					onClick={() => {
						openDialog("help");
					}}
				>
					<QuestionMarkCircleIcon className={svgClass} />
				</IconButton>
			</div>
		</header>
	);
};
