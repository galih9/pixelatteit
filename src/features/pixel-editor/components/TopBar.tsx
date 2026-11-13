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
	PhotoIcon,
	QuestionMarkCircleIcon,
	SparklesIcon,
	Squares2X2Icon,
} from "@heroicons/react/20/solid";
import type { FunctionComponent } from "../../../common/types";
import { openFile, saveProject } from "../lib/files";
import { useEditorStore } from "../store/editorStore";
import { Divider, IconButton } from "./ui";

export const TopBar = (): FunctionComponent => {
	const name = useEditorStore((state) => state.name);
	const setName = useEditorStore((state) => state.setName);
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
