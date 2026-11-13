import {
	BackwardIcon,
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ChevronUpIcon,
	DocumentDuplicateIcon,
	FilmIcon,
	ForwardIcon,
	PauseIcon,
	PlayIcon,
	PlusIcon,
	Square2StackIcon,
	TagIcon,
	TrashIcon,
} from "@heroicons/react/20/solid";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FunctionComponent } from "../../../common/types";
import { MAX_FRAMES } from "../constants";
import {
	compositeFrame,
	isEmptyCel,
	sequenceDuration,
	sequenceFor,
	TAG_COLORS,
	tagsAt,
} from "../lib/animation";
import { subscribeFrames } from "../lib/liveView";
import { useEditorStore } from "../store/editorStore";
import type { FrameTag, PixelBuffer, TagDirection } from "../types";
import { Divider, IconButton, Modal, TextButton } from "./ui";

const COLUMN = 34;
const THUMB = 26;
const ROW = 20;
const NAMES = 132;
const TAG_LANE = 16;

const getState = useEditorStore.getState;

type Range = { from: number; to: number };

/* -------------------------------------------------------------------------- */
/*                                  Playback                                  */
/* -------------------------------------------------------------------------- */

/** Steps through frames while `playing` is on, honouring tag direction. */
function usePlayback(): void {
	const playing = useEditorStore((state) => state.playing);
	const playTag = useEditorStore((state) => state.playTag);
	const frameCount = useEditorStore((state) => state.frames.length);
	const tags = useEditorStore((state) => state.tags);

	useEffect(() => {
		if (!playing) return;
		const tag = tags.find((candidate) => candidate.id === playTag) ?? null;
		const sequence = sequenceFor(tag, frameCount);
		if (sequence.length < 2) {
			getState().showNotice("The loop needs at least 2 frames to play");
			getState().setPlaying(false);
			return;
		}
		let position = sequence.indexOf(getState().currentFrame);
		if (position < 0) {
			position = 0;
			getState().setCurrentFrame(sequence[0] ?? 0);
		}
		let timer = 0;
		const schedule = (): void => {
			const state = getState();
			const duration = state.frames[state.currentFrame]?.duration ?? 100;
			timer = window.setTimeout(() => {
				position = (position + 1) % sequence.length;
				getState().setCurrentFrame(sequence[position] ?? 0);
				schedule();
			}, duration);
		};
		schedule();
		return (): void => {
			window.clearTimeout(timer);
		};
	}, [playing, playTag, frameCount, tags]);
}

/* -------------------------------------------------------------------------- */
/*                                 Thumbnails                                 */
/* -------------------------------------------------------------------------- */

/** Changes only when a layer's id / visibility / opacity changes. */
const layerPropsKey = (state: ReturnType<typeof getState>): string =>
	state.layers
		.map((layer) => `${layer.id}:${layer.visible ? 1 : 0}:${layer.opacity}`)
		.join(",");

const FrameThumb = ({ index }: { index: number }): FunctionComponent => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const width = useEditorStore((state) => state.width);
	const height = useEditorStore((state) => state.height);
	const isCurrent = useEditorStore((state) => state.currentFrame === index);
	const frame = useEditorStore((state) => state.frames[index]);
	const layersKey = useEditorStore(layerPropsKey);

	useEffect(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		if (!canvas || !context) return;
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}
		if (isCurrent) {
			// The frame being edited mirrors the canvas, strokes included.
			return subscribeFrames((source) => {
				context.clearRect(0, 0, width, height);
				context.drawImage(source, 0, 0);
			});
		}
		const pixels: PixelBuffer = compositeFrame(
			getState().layers,
			frame,
			width * height
		);
		context.putImageData(
			new ImageData(new Uint8ClampedArray(pixels.buffer), width, height),
			0,
			0
		);
		return undefined;
	}, [isCurrent, frame, layersKey, width, height]);

	const scale = THUMB / Math.max(width, height);
	return (
		<div
			className="preview-checker flex items-center justify-center overflow-hidden rounded-sm"
			style={{ width: THUMB, height: THUMB }}
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

/* -------------------------------------------------------------------------- */
/*                                 Tag editor                                 */
/* -------------------------------------------------------------------------- */

const DIRECTIONS: Array<[TagDirection, string]> = [
	["forward", "Forward →"],
	["reverse", "Reverse ←"],
	["pingpong", "Ping-pong ↔"],
];

const TagDialog = ({
	tag,
	onClose,
}: {
	tag: FrameTag;
	onClose: () => void;
}): FunctionComponent => {
	const frameCount = useEditorStore((state) => state.frames.length);
	const updateTag = useEditorStore((state) => state.updateTag);
	const deleteTag = useEditorStore((state) => state.deleteTag);
	const [name, setName] = useState(tag.name);
	const [from, setFrom] = useState(String(tag.from + 1));
	const [to, setTo] = useState(String(tag.to + 1));
	const [color, setColor] = useState(tag.color);
	const [direction, setDirection] = useState(tag.direction);

	const save = (): void => {
		updateTag(tag.id, {
			name,
			from: (Number(from) || 1) - 1,
			to: (Number(to) || 1) - 1,
			color,
			direction,
		});
		onClose();
	};
	const inputClass =
		"rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-100 outline-none focus:border-sky-500";

	return (
		<Modal
			title="Tag"
			footer={
				<>
					<TextButton
						onClick={() => {
							deleteTag(tag.id);
							onClose();
						}}
					>
						Delete tag
					</TextButton>
					<span className="flex-1" />
					<TextButton onClick={onClose}>Cancel</TextButton>
					<TextButton variant="primary" onClick={save}>
						Save
					</TextButton>
				</>
			}
			onClose={onClose}
		>
			<div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-3">
				<span className="text-xs text-zinc-400">Name</span>
				<input
					autoFocus
					className={inputClass}
					value={name}
					onChange={(event) => {
						setName(event.target.value);
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter") save();
					}}
				/>
				<span className="text-xs text-zinc-400">Frames</span>
				<div className="flex items-center gap-2">
					<input
						aria-label="First frame"
						className={`${inputClass} w-20`}
						max={frameCount}
						min={1}
						type="number"
						value={from}
						onChange={(event) => {
							setFrom(event.target.value);
						}}
					/>
					<span className="text-zinc-500">to</span>
					<input
						aria-label="Last frame"
						className={`${inputClass} w-20`}
						max={frameCount}
						min={1}
						type="number"
						value={to}
						onChange={(event) => {
							setTo(event.target.value);
						}}
					/>
					<span className="text-xs text-zinc-500">of {frameCount}</span>
				</div>
				<span className="text-xs text-zinc-400">Direction</span>
				<div className="flex gap-1.5">
					{DIRECTIONS.map(([value, label]) => (
						<TextButton
							key={value}
							active={direction === value}
							onClick={() => {
								setDirection(value);
							}}
						>
							{label}
						</TextButton>
					))}
				</div>
				<span className="text-xs text-zinc-400">Color</span>
				<div className="flex items-center gap-1.5">
					{TAG_COLORS.map((swatch) => (
						<button
							key={swatch}
							aria-label={`Tag color ${swatch}`}
							style={{ backgroundColor: swatch }}
							type="button"
							className={`h-5 w-5 rounded ${
								swatch === color ? "ring-2 ring-white" : ""
							}`}
							onClick={() => {
								setColor(swatch);
							}}
						/>
					))}
					<input
						aria-label="Custom tag color"
						className="h-6 w-8 cursor-pointer rounded border border-zinc-700 bg-transparent"
						type="color"
						value={color}
						onChange={(event) => {
							setColor(event.target.value);
						}}
					/>
				</div>
			</div>
		</Modal>
	);
};

/* -------------------------------------------------------------------------- */
/*                                  Tag lane                                  */
/* -------------------------------------------------------------------------- */

/** Stacks overlapping tags into lanes. */
function laneTags(tags: Array<FrameTag>): Array<Array<FrameTag>> {
	const lanes: Array<Array<FrameTag>> = [];
	const sorted = [...tags].sort((a, b) => a.from - b.from || b.to - a.to);
	for (const tag of sorted) {
		const lane = lanes.find((candidate) =>
			candidate.every((other) => tag.from > other.to || tag.to < other.from)
		);
		if (lane) lane.push(tag);
		else lanes.push([tag]);
	}
	return lanes;
}

const TagLanes = ({
	onSelectRange,
	onEdit,
}: {
	onSelectRange: (range: Range) => void;
	onEdit: (tag: FrameTag) => void;
}): FunctionComponent => {
	const tags = useEditorStore((state) => state.tags);
	const playTag = useEditorStore((state) => state.playTag);
	const lanes = useMemo(() => laneTags(tags), [tags]);

	if (lanes.length === 0) {
		return (
			<div
				className="flex items-center whitespace-nowrap px-1 text-[10px] text-zinc-600"
				style={{ height: TAG_LANE }}
			>
				Shift+click frames, then press <TagIcon className="mx-1 h-3 w-3" />
				to tag an animation
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-px">
			{lanes.map((lane, laneIndex) => (
				<div key={laneIndex} className="relative" style={{ height: TAG_LANE }}>
					{lane.map((tag) => (
						<button
							key={tag.id}
							title={`${tag.name} · frames ${tag.from + 1}–${tag.to + 1} · click to select, double-click to edit`}
							type="button"
							className={`absolute top-0 flex h-full items-center gap-1 overflow-hidden whitespace-nowrap rounded-sm px-1 text-left text-[10px] font-semibold text-zinc-950 ${
								playTag === tag.id ? "ring-1 ring-white" : ""
							}`}
							style={{
								left: tag.from * COLUMN + 1,
								width: (tag.to - tag.from + 1) * COLUMN - 2,
								backgroundColor: tag.color,
							}}
							onClick={() => {
								onSelectRange({ from: tag.from, to: tag.to });
								getState().setCurrentFrame(tag.from);
							}}
							onDoubleClick={() => {
								onEdit(tag);
							}}
						>
							{tag.direction === "reverse" && "←"}
							{tag.direction === "pingpong" && "↔"}
							<span className="truncate">{tag.name}</span>
						</button>
					))}
				</div>
			))}
		</div>
	);
};

/* -------------------------------------------------------------------------- */
/*                                 Frame grid                                 */
/* -------------------------------------------------------------------------- */

const CelCell = ({
	layerIndex,
	frameIndex,
}: {
	layerIndex: number;
	frameIndex: number;
}): FunctionComponent => {
	const empty = useEditorStore((state) => {
		const layer = state.layers[layerIndex];
		if (!layer) return true;
		if (frameIndex === state.currentFrame) {
			return isEmptyCel(
				layerIndex === state.activeLayer ? state.pixels : layer.pixels
			);
		}
		return isEmptyCel(state.frames[frameIndex]?.cels[layer.id]);
	});
	const isActive = useEditorStore(
		(state) =>
			state.currentFrame === frameIndex && state.activeLayer === layerIndex
	);
	const selectCel = useEditorStore((state) => state.selectCel);

	return (
		<button
			aria-label={`Layer ${layerIndex + 1}, frame ${frameIndex + 1}`}
			style={{ width: COLUMN, height: ROW }}
			type="button"
			className={`flex shrink-0 items-center justify-center border-r border-zinc-800/80 ${
				isActive ? "bg-sky-500/30" : "hover:bg-zinc-700/60"
			}`}
			onClick={() => {
				selectCel(layerIndex, frameIndex);
			}}
		>
			<span
				className={`h-2 w-2 rounded-full ${
					empty ? "border border-zinc-600" : "bg-zinc-300"
				}`}
			/>
		</button>
	);
};

const FrameHeader = ({
	index,
	inRange,
	onClick,
	onDropFrame,
}: {
	index: number;
	inRange: boolean;
	onClick: (index: number, shift: boolean) => void;
	onDropFrame: (from: number, to: number) => void;
}): FunctionComponent => {
	const isCurrent = useEditorStore((state) => state.currentFrame === index);
	const duration = useEditorStore(
		(state) => state.frames[index]?.duration ?? 100
	);
	const [dropTarget, setDropTarget] = useState(false);

	return (
		<button
			draggable
			style={{ width: COLUMN }}
			title={`Frame ${index + 1} · ${duration} ms · drag to reorder, Shift+click to select a range`}
			type="button"
			className={`relative flex shrink-0 flex-col items-center gap-0.5 border-r border-zinc-800 pb-0.5 pt-1 ${
				isCurrent
					? "bg-sky-500/25"
					: inRange
						? "bg-sky-500/10"
						: "hover:bg-zinc-800"
			} ${dropTarget ? "outline outline-2 -outline-offset-2 outline-sky-400" : ""}`}
			onClick={(event) => {
				onClick(index, event.shiftKey);
			}}
			onDragLeave={() => {
				setDropTarget(false);
			}}
			onDragOver={(event) => {
				if (!event.dataTransfer.types.includes("application/x-pixel-frame")) {
					return;
				}
				event.preventDefault();
				event.dataTransfer.dropEffect = "move";
				setDropTarget(true);
			}}
			onDragStart={(event) => {
				event.dataTransfer.setData("application/x-pixel-frame", String(index));
				event.dataTransfer.effectAllowed = "move";
			}}
			onDrop={(event) => {
				event.preventDefault();
				setDropTarget(false);
				const from = Number(
					event.dataTransfer.getData("application/x-pixel-frame")
				);
				if (Number.isInteger(from)) onDropFrame(from, index);
			}}
		>
			<FrameThumb index={index} />
			<span
				className={`text-[10px] tabular-nums leading-none ${
					isCurrent ? "font-semibold text-sky-300" : "text-zinc-400"
				}`}
			>
				{index + 1}
			</span>
		</button>
	);
};

/* -------------------------------------------------------------------------- */
/*                                  Timeline                                  */
/* -------------------------------------------------------------------------- */

export const Timeline = (): FunctionComponent => {
	usePlayback();
	const frameCount = useEditorStore((state) => state.frames.length);
	const layerCount = useEditorStore((state) => state.layers.length);
	const layerNames = useEditorStore((state) =>
		state.layers
			.map((layer) => `${layer.visible ? "" : "!"}${layer.name}`)
			.join("\n")
	);
	const activeLayer = useEditorStore((state) => state.activeLayer);
	const currentFrame = useEditorStore((state) => state.currentFrame);
	const frames = useEditorStore((state) => state.frames);
	const tags = useEditorStore((state) => state.tags);
	const playing = useEditorStore((state) => state.playing);
	const playTag = useEditorStore((state) => state.playTag);
	const onionSkin = useEditorStore((state) => state.onionSkin);
	const onionBefore = useEditorStore((state) => state.onionBefore);
	const onionAfter = useEditorStore((state) => state.onionAfter);
	const store = useEditorStore.getState();

	const [collapsed, setCollapsed] = useState(false);
	const [range, setRange] = useState<Range>({ from: 0, to: 0 });
	const [anchor, setAnchor] = useState(0);
	const [editing, setEditing] = useState<FrameTag | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);

	// Moving outside the selected range (keys, playback, clicks) resets it.
	if (currentFrame < range.from || currentFrame > range.to) {
		setRange({ from: currentFrame, to: currentFrame });
		setAnchor(currentFrame);
	} else if (range.to >= frameCount) {
		setRange({
			from: Math.min(range.from, frameCount - 1),
			to: frameCount - 1,
		});
	}

	// Keep the current frame in view (e.g. while playing).
	useEffect(() => {
		const scroller = scrollRef.current;
		if (!scroller) return;
		const left = currentFrame * COLUMN;
		const visible = scroller.clientWidth - NAMES;
		if (left < scroller.scrollLeft) {
			scroller.scrollLeft = left;
		} else if (left + COLUMN > scroller.scrollLeft + visible) {
			scroller.scrollLeft = left + COLUMN - visible;
		}
	}, [currentFrame]);

	const names = layerNames.split("\n");
	// Top layer is listed first, like the layers panel.
	const order = Array.from(
		{ length: layerCount },
		(_, position) => layerCount - 1 - position
	);
	const rangeSize = range.to - range.from + 1;
	const current = frames[currentFrame];
	const loopTag = tags.find((tag) => tag.id === playTag) ?? null;
	const loopLength = sequenceDuration(sequenceFor(loopTag, frameCount), frames);
	const currentTags = tagsAt(tags, currentFrame);

	const onHeaderClick = (index: number, shift: boolean): void => {
		if (shift) {
			setRange({ from: Math.min(anchor, index), to: Math.max(anchor, index) });
		} else {
			setAnchor(index);
			setRange({ from: index, to: index });
		}
		store.setCurrentFrame(index);
	};

	const small = "h-7 w-7";
	const icon = "h-4 w-4";

	return (
		<section className="shrink-0 border-t border-zinc-800 bg-zinc-950/60">
			{/* ----------------------------- toolbar ----------------------------- */}
			<div className="flex h-9 items-center gap-1 overflow-x-auto px-2">
				<IconButton
					className={small}
					label={collapsed ? "Show timeline" : "Hide timeline"}
					onClick={() => {
						setCollapsed(!collapsed);
					}}
				>
					{collapsed ? (
						<ChevronUpIcon className={icon} />
					) : (
						<ChevronDownIcon className={icon} />
					)}
				</IconButton>
				<FilmIcon className="h-4 w-4 shrink-0 text-zinc-500" />
				<span className="mr-1 shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-400">
					Frames
				</span>
				<span className="mr-1 shrink-0 text-xs tabular-nums text-zinc-500">
					{currentFrame + 1}/{frameCount}
				</span>

				<Divider />
				<IconButton
					className={small}
					label="First frame (Home)"
					onClick={() => {
						store.setCurrentFrame(loopTag?.from ?? 0);
					}}
				>
					<BackwardIcon className={icon} />
				</IconButton>
				<IconButton
					className={small}
					label="Previous frame (, or ←)"
					onClick={() => {
						store.setCurrentFrame((currentFrame - 1 + frameCount) % frameCount);
					}}
				>
					<ChevronLeftIcon className={icon} />
				</IconButton>
				<IconButton
					active={playing}
					className={small}
					disabled={frameCount < 2}
					label={playing ? "Pause (Enter)" : "Play (Enter)"}
					onClick={store.togglePlaying}
				>
					{playing ? (
						<PauseIcon className={icon} />
					) : (
						<PlayIcon className={icon} />
					)}
				</IconButton>
				<IconButton
					className={small}
					label="Next frame (. or →)"
					onClick={() => {
						store.setCurrentFrame((currentFrame + 1) % frameCount);
					}}
				>
					<ChevronRightIcon className={icon} />
				</IconButton>
				<IconButton
					className={small}
					label="Last frame (End)"
					onClick={() => {
						store.setCurrentFrame(loopTag?.to ?? frameCount - 1);
					}}
				>
					<ForwardIcon className={icon} />
				</IconButton>
				<label className="ml-1 flex shrink-0 items-center gap-1.5 text-xs text-zinc-400">
					Loop
					<select
						className="max-w-32 rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-100"
						title="What Play loops over"
						value={playTag ?? ""}
						onChange={(event) => {
							store.setPlayTag(
								event.target.value === "" ? null : Number(event.target.value)
							);
						}}
					>
						<option value="">All frames</option>
						{tags.map((tag) => (
							<option key={tag.id} value={tag.id}>
								{tag.name}
							</option>
						))}
					</select>
				</label>
				<span
					className="shrink-0 text-[10px] tabular-nums text-zinc-600"
					title="Length of one loop"
				>
					{(loopLength / 1000).toFixed(2)}s
				</span>

				<Divider />
				<IconButton
					className={small}
					disabled={frameCount >= MAX_FRAMES}
					label="New empty frame (Alt+Shift+N)"
					onClick={store.addFrame}
				>
					<PlusIcon className={icon} />
				</IconButton>
				<IconButton
					className={small}
					disabled={frameCount >= MAX_FRAMES}
					label="Duplicate frame (Alt+N)"
					onClick={store.duplicateFrame}
				>
					<DocumentDuplicateIcon className={icon} />
				</IconButton>
				<IconButton
					className={small}
					disabled={frameCount <= 1}
					label="Delete frame"
					onClick={store.deleteFrame}
				>
					<TrashIcon className={icon} />
				</IconButton>
				<IconButton
					className={small}
					label={
						rangeSize > 1
							? `Tag frames ${range.from + 1}–${range.to + 1}`
							: `Tag frame ${currentFrame + 1} (Shift+click frames to tag a range)`
					}
					onClick={() => {
						store.addTag(range.from, range.to);
					}}
				>
					<TagIcon className={icon} />
				</IconButton>

				<Divider />
				<label
					className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-400"
					title={
						rangeSize > 1
							? `Sets the duration of frames ${range.from + 1}–${range.to + 1}`
							: "How long this frame is shown"
					}
				>
					{rangeSize > 1 ? `${rangeSize} frames` : "Duration"}
					<input
						key={`${current?.id ?? 0}-${current?.duration ?? 0}-${rangeSize}`}
						aria-label="Frame duration in milliseconds"
						className="w-16 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-right text-xs tabular-nums text-zinc-100 outline-none focus:border-sky-500"
						defaultValue={current?.duration ?? 100}
						max={10_000}
						min={10}
						step={10}
						type="number"
						onBlur={(event) => {
							store.setFramesDuration(
								range.from,
								range.to,
								Number(event.target.value)
							);
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter") event.currentTarget.blur();
						}}
					/>
					ms
				</label>
				<TextButton
					title="Use this frame's duration for every frame"
					onClick={() => {
						store.setFramesDuration(
							0,
							frameCount - 1,
							current?.duration ?? 100
						);
						store.showNotice(
							`Every frame is now ${current?.duration ?? 100} ms`
						);
					}}
				>
					All
				</TextButton>

				<Divider />
				<IconButton
					active={onionSkin}
					className={small}
					label="Onion skin (K)"
					onClick={store.toggleOnionSkin}
				>
					<Square2StackIcon className={icon} />
				</IconButton>
				{onionSkin && (
					<span className="flex shrink-0 items-center gap-1 text-[10px] text-zinc-400">
						<input
							aria-label="Onion skin frames before"
							className="w-9 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-right tabular-nums text-rose-300"
							max={5}
							min={0}
							title="Frames before (red)"
							type="number"
							value={onionBefore}
							onChange={(event) => {
								store.setOnionRange(Number(event.target.value), onionAfter);
							}}
						/>
						<input
							aria-label="Onion skin frames after"
							className="w-9 rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 text-right tabular-nums text-sky-300"
							max={5}
							min={0}
							title="Frames after (blue)"
							type="number"
							value={onionAfter}
							onChange={(event) => {
								store.setOnionRange(onionBefore, Number(event.target.value));
							}}
						/>
					</span>
				)}

				{currentTags.length > 0 && (
					<span className="ml-auto flex shrink-0 items-center gap-1 pl-2 text-[10px] text-zinc-500">
						in
						{currentTags.map((tag) => (
							<span
								key={tag.id}
								className="rounded-sm px-1 font-semibold text-zinc-950"
								style={{ backgroundColor: tag.color }}
							>
								{tag.name}
							</span>
						))}
					</span>
				)}
			</div>

			{/* ------------------------------- grid ------------------------------ */}
			{!collapsed && (
				<div
					ref={scrollRef}
					className="max-h-52 overflow-auto border-t border-zinc-800"
				>
					<div style={{ width: NAMES + frameCount * COLUMN }}>
						<div className="sticky top-0 z-10 flex bg-zinc-950">
							<div
								className="sticky left-0 z-10 flex shrink-0 flex-col justify-between border-r border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-600"
								style={{ width: NAMES }}
							>
								<span>Tags</span>
								<span>Layers ↓ · Frames →</span>
							</div>
							<div className="flex flex-col">
								<div className="py-0.5">
									<TagLanes
										onEdit={setEditing}
										onSelectRange={(next) => {
											setAnchor(next.from);
											setRange(next);
										}}
									/>
								</div>
								<div className="flex border-b border-zinc-800">
									{frames.map((frame, index) => (
										<FrameHeader
											key={frame.id}
											inRange={index >= range.from && index <= range.to}
											index={index}
											onClick={onHeaderClick}
											onDropFrame={store.moveFrame}
										/>
									))}
								</div>
							</div>
						</div>
						{order.map((layerIndex) => {
							const raw = names[layerIndex] ?? "";
							const hidden = raw.startsWith("!");
							return (
								<div
									key={layerIndex}
									className={`flex border-b border-zinc-800/80 ${
										layerIndex === activeLayer ? "bg-zinc-800/50" : ""
									}`}
								>
									<button
										style={{ width: NAMES, height: ROW }}
										title="Select layer"
										type="button"
										className={`sticky left-0 z-[5] shrink-0 truncate border-r border-zinc-800 bg-zinc-950 px-2 text-left text-[11px] ${
											layerIndex === activeLayer
												? "text-sky-300"
												: hidden
													? "text-zinc-600"
													: "text-zinc-300"
										}`}
										onClick={() => {
											store.setActiveLayer(layerIndex);
										}}
									>
										{hidden ? raw.slice(1) : raw}
									</button>
									{frames.map((frame, frameIndex) => (
										<CelCell
											key={frame.id}
											frameIndex={frameIndex}
											layerIndex={layerIndex}
										/>
									))}
								</div>
							);
						})}
					</div>
				</div>
			)}
			{editing && (
				<TagDialog
					tag={editing}
					onClose={() => {
						setEditing(null);
					}}
				/>
			)}
		</section>
	);
};
