import {
	ArrowDownOnSquareStackIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	DocumentDuplicateIcon,
	EyeIcon,
	EyeSlashIcon,
	PlusIcon,
	Square3Stack3DIcon,
	TrashIcon,
} from "@heroicons/react/20/solid";
import { useEffect, useRef, useState } from "react";
import type { FunctionComponent } from "../../../common/types";
import { MAX_LAYERS } from "../constants";
import { useEditorStore } from "../store/editorStore";
import { IconButton } from "./ui";

const THUMB = 28;

const LayerThumbnail = ({ index }: { index: number }): FunctionComponent => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const width = useEditorStore((state) => state.width);
	const height = useEditorStore((state) => state.height);
	const pixels = useEditorStore((state) =>
		index === state.activeLayer ? state.pixels : state.layers[index]?.pixels
	);

	useEffect(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		if (!canvas || !context || !pixels || pixels.length !== width * height) {
			return;
		}
		canvas.width = width;
		canvas.height = height;
		context.putImageData(
			new ImageData(
				new Uint8ClampedArray(
					pixels.buffer,
					pixels.byteOffset,
					pixels.byteLength
				),
				width,
				height
			),
			0,
			0
		);
	}, [pixels, width, height]);

	const scale = THUMB / Math.max(width, height);
	return (
		<div
			className="preview-checker flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-zinc-700"
			style={{ width: THUMB + 2, height: THUMB + 2 }}
		>
			<canvas
				ref={canvasRef}
				style={{
					width: width * scale,
					height: height * scale,
					imageRendering: "pixelated",
				}}
			/>
		</div>
	);
};

const LayerRow = ({ index }: { index: number }): FunctionComponent => {
	const layer = useEditorStore((state) => state.layers[index]);
	const active = useEditorStore((state) => state.activeLayer === index);
	const setActiveLayer = useEditorStore((state) => state.setActiveLayer);
	const setLayerVisible = useEditorStore((state) => state.setLayerVisible);
	const soloLayer = useEditorStore((state) => state.soloLayer);
	const renameLayer = useEditorStore((state) => state.renameLayer);
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState("");

	if (!layer) return null;

	const finishRename = (save: boolean): void => {
		if (save) renameLayer(index, draft);
		setEditing(false);
	};

	return (
		<li
			className={`flex items-center gap-1.5 rounded-md border px-1 py-1 ${
				active
					? "border-sky-500/70 bg-sky-500/15"
					: "border-transparent hover:bg-zinc-800"
			}`}
		>
			<button
				aria-label={layer.visible ? "Hide layer" : "Show layer"}
				title="Show / hide (Alt+click: show only this layer)"
				type="button"
				className={`flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-zinc-700 ${
					layer.visible ? "text-zinc-200" : "text-zinc-600"
				}`}
				onClick={(event) => {
					if (event.altKey) soloLayer(index);
					else setLayerVisible(index, !layer.visible);
				}}
			>
				{layer.visible ? (
					<EyeIcon className="h-4 w-4" />
				) : (
					<EyeSlashIcon className="h-4 w-4" />
				)}
			</button>
			<button
				className="flex min-w-0 flex-1 items-center gap-2 text-left"
				title="Click to select · double-click to rename"
				type="button"
				onClick={() => {
					setActiveLayer(index);
				}}
				onDoubleClick={() => {
					setDraft(layer.name);
					setEditing(true);
				}}
			>
				<span className={layer.visible ? "" : "opacity-40"}>
					<LayerThumbnail index={index} />
				</span>
				{editing ? (
					<input
						autoFocus
						aria-label="Layer name"
						className="w-full min-w-0 rounded bg-zinc-800 px-1 py-0.5 text-xs text-zinc-100 outline-none ring-1 ring-sky-500"
						value={draft}
						onBlur={() => {
							finishRename(true);
						}}
						onChange={(event) => {
							setDraft(event.target.value);
						}}
						onClick={(event) => {
							event.stopPropagation();
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter") finishRename(true);
							if (event.key === "Escape") finishRename(false);
						}}
					/>
				) : (
					<span
						className={`truncate text-xs ${
							layer.visible ? "text-zinc-200" : "text-zinc-500"
						}`}
					>
						{layer.name}
					</span>
				)}
			</button>
			<span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-zinc-500">
				{layer.opacity}%
			</span>
		</li>
	);
};

export const LayersPanel = (): FunctionComponent => {
	const count = useEditorStore((state) => state.layers.length);
	const activeLayer = useEditorStore((state) => state.activeLayer);
	const opacity = useEditorStore(
		(state) => state.layers[state.activeLayer]?.opacity ?? 100
	);
	const addLayer = useEditorStore((state) => state.addLayer);
	const duplicateLayer = useEditorStore((state) => state.duplicateLayer);
	const deleteLayer = useEditorStore((state) => state.deleteLayer);
	const moveLayer = useEditorStore((state) => state.moveLayer);
	const mergeDown = useEditorStore((state) => state.mergeDown);
	const flattenImage = useEditorStore((state) => state.flattenImage);
	const setLayerOpacity = useEditorStore((state) => state.setLayerOpacity);

	const small = "h-7 w-7";
	const icon = "h-4 w-4";
	// Top layer is listed first.
	const order = Array.from(
		{ length: count },
		(_, position) => count - 1 - position
	);

	return (
		<section className="border-b border-zinc-800 p-3">
			<div className="mb-2 flex items-center justify-between">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
					Layers <span className="font-normal text-zinc-600">({count})</span>
				</h2>
				<div className="flex">
					<IconButton
						className={small}
						disabled={count >= MAX_LAYERS}
						label="New layer (Shift+N)"
						onClick={addLayer}
					>
						<PlusIcon className={icon} />
					</IconButton>
					<IconButton
						className={small}
						disabled={count >= MAX_LAYERS}
						label="Duplicate layer"
						onClick={duplicateLayer}
					>
						<DocumentDuplicateIcon className={icon} />
					</IconButton>
					<IconButton
						className={small}
						disabled={count <= 1}
						label="Delete layer"
						onClick={deleteLayer}
					>
						<TrashIcon className={icon} />
					</IconButton>
				</div>
			</div>

			<ul className="editor-scrollbar flex max-h-56 flex-col gap-0.5 overflow-y-auto">
				{order.map((index) => (
					<LayerRow key={index} index={index} />
				))}
			</ul>

			<label className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
				Opacity
				<input
					aria-label="Layer opacity"
					className="min-w-0 flex-1 accent-sky-500"
					max={100}
					min={0}
					type="range"
					value={opacity}
					onChange={(event) => {
						setLayerOpacity(activeLayer, Number(event.target.value));
					}}
				/>
				<input
					aria-label="Layer opacity percent"
					className="w-14 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-right text-xs tabular-nums text-zinc-100 outline-none focus:border-sky-500"
					max={100}
					min={0}
					type="number"
					value={opacity}
					onChange={(event) => {
						setLayerOpacity(activeLayer, Number(event.target.value) || 0);
					}}
				/>
			</label>

			<div className="mt-2 flex items-center gap-0.5">
				<IconButton
					className={small}
					disabled={activeLayer >= count - 1}
					label="Move layer up"
					onClick={() => {
						moveLayer(1);
					}}
				>
					<ChevronUpIcon className={icon} />
				</IconButton>
				<IconButton
					className={small}
					disabled={activeLayer <= 0}
					label="Move layer down"
					onClick={() => {
						moveLayer(-1);
					}}
				>
					<ChevronDownIcon className={icon} />
				</IconButton>
				<IconButton
					className={small}
					disabled={activeLayer <= 0}
					label="Merge down"
					onClick={mergeDown}
				>
					<ArrowDownOnSquareStackIcon className={icon} />
				</IconButton>
				<IconButton
					className={small}
					disabled={count <= 1}
					label="Flatten all layers"
					onClick={flattenImage}
				>
					<Square3Stack3DIcon className={icon} />
				</IconButton>
				<span className="ml-auto text-[10px] text-zinc-600">
					Alt+click 👁 = solo
				</span>
			</div>
		</section>
	);
};
