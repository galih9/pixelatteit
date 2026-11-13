import { useRef, useState } from "react";
import type { FunctionComponent } from "../../../common/types";
import { useEditorStore } from "../store/editorStore";
import type { CustomBrush } from "../types";
import { Modal, TextButton } from "./ui";

const SIZES = [3, 5, 7, 9, 12, 16];

function resizeMask(
	brush: CustomBrush,
	newWidth: number,
	newHeight: number
): Uint8Array<ArrayBuffer> {
	const mask = new Uint8Array(newWidth * newHeight);
	const offsetX = Math.floor((newWidth - brush.width) / 2);
	const offsetY = Math.floor((newHeight - brush.height) / 2);
	for (let row = 0; row < brush.height; row++) {
		for (let column = 0; column < brush.width; column++) {
			const targetX = column + offsetX;
			const targetY = row + offsetY;
			if (
				targetX >= 0 &&
				targetX < newWidth &&
				targetY >= 0 &&
				targetY < newHeight
			) {
				mask[targetY * newWidth + targetX] =
					brush.mask[row * brush.width + column] ?? 0;
			}
		}
	}
	return mask;
}

function rotateBrush(brush: CustomBrush): CustomBrush {
	const nextWidth = brush.height;
	const nextHeight = brush.width;
	const mask = new Uint8Array(nextWidth * nextHeight);
	for (let row = 0; row < brush.height; row++) {
		for (let column = 0; column < brush.width; column++) {
			const targetX = brush.height - 1 - row;
			const targetY = column;
			mask[targetY * nextWidth + targetX] =
				brush.mask[row * brush.width + column] ?? 0;
		}
	}
	return { width: nextWidth, height: nextHeight, mask };
}

function flipBrushHorizontal(brush: CustomBrush): CustomBrush {
	const mask = new Uint8Array(brush.width * brush.height);
	for (let row = 0; row < brush.height; row++) {
		for (let column = 0; column < brush.width; column++) {
			mask[row * brush.width + (brush.width - 1 - column)] =
				brush.mask[row * brush.width + column] ?? 0;
		}
	}
	return { ...brush, mask };
}

function mapMask(
	mask: Uint8Array<ArrayBuffer>,
	mapper: (value: number) => 0 | 1
): Uint8Array<ArrayBuffer> {
	const next = new Uint8Array(mask.length);
	for (let index = 0; index < mask.length; index++) {
		next[index] = mapper(mask[index] ?? 0);
	}
	return next;
}

export const CustomBrushDialog = ({
	onClose,
}: {
	onClose: () => void;
}): FunctionComponent => {
	const currentBrush = useEditorStore((state) => state.customBrush);
	const selection = useEditorStore((state) => state.selection);
	const setCustomBrush = useEditorStore((state) => state.setCustomBrush);
	const captureCustomBrush = useEditorStore(
		(state) => state.captureCustomBrush
	);
	const [draft, setDraft] = useState<CustomBrush>(() => ({
		width: currentBrush.width,
		height: currentBrush.height,
		mask: new Uint8Array(currentBrush.mask),
	}));
	const paintModeReference = useRef<0 | 1 | null>(null);

	const setCell = (index: number, value: 0 | 1): void => {
		setDraft((previous) => {
			if ((previous.mask[index] ?? 0) === value) return previous;
			const nextMask = new Uint8Array(previous.mask);
			nextMask[index] = value;
			return { ...previous, mask: nextMask };
		});
	};

	const setGridSize = (size: number): void => {
		setDraft((previous) => ({
			width: size,
			height: size,
			mask: resizeMask(previous, size, size),
		}));
	};

	const cells = Array.from(draft.mask);

	return (
		<Modal
			title="Custom brush shape"
			footer={
				<>
					<TextButton onClick={onClose}>Cancel</TextButton>
					<TextButton
						variant="primary"
						onClick={() => {
							const hasAny = draft.mask.some((cell) => cell !== 0);
							if (!hasAny) {
								onClose();
								return;
							}
							setCustomBrush(draft);
							onClose();
						}}
					>
						Use brush
					</TextButton>
				</>
			}
			onClose={onClose}
		>
			<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
				<span className="text-xs text-zinc-400">
					Size ({draft.width}×{draft.height})
				</span>
				<div className="flex flex-wrap gap-1">
					{SIZES.map((size) => (
						<TextButton
							key={size}
							active={draft.width === size && draft.height === size}
							onClick={() => {
								setGridSize(size);
							}}
						>
							{size}×{size}
						</TextButton>
					))}
				</div>
			</div>

			<div
				className="mx-auto grid w-fit select-none gap-px rounded-md border border-zinc-700 bg-zinc-700 p-px"
				style={{
					gridTemplateColumns: `repeat(${draft.width}, minmax(0, 1fr))`,
				}}
				onPointerLeave={() => {
					paintModeReference.current = null;
				}}
				onPointerUp={() => {
					paintModeReference.current = null;
				}}
			>
				{cells.map((value, index) => {
					const active = value !== 0;
					const row = Math.floor(index / draft.width) + 1;
					const column = (index % draft.width) + 1;
					return (
						<button
							key={index}
							aria-label={`Brush cell ${column},${row}`}
							aria-pressed={active}
							type="button"
							className={`h-4 w-4 transition-colors ${
								active
									? "bg-sky-400 hover:bg-sky-300"
									: "bg-zinc-900 hover:bg-zinc-800"
							}`}
							onPointerDown={(event) => {
								event.preventDefault();
								const nextValue: 0 | 1 = active ? 0 : 1;
								paintModeReference.current = nextValue;
								setCell(index, nextValue);
							}}
							onPointerEnter={() => {
								if (paintModeReference.current !== null) {
									setCell(index, paintModeReference.current);
								}
							}}
						/>
					);
				})}
			</div>

			<div className="mt-3 flex flex-wrap items-center justify-between gap-1.5">
				<div className="flex flex-wrap gap-1">
					<TextButton
						onClick={() => {
							setDraft((previous) => ({
								...previous,
								mask: mapMask(previous.mask, () => 0),
							}));
						}}
					>
						Clear
					</TextButton>
					<TextButton
						onClick={() => {
							setDraft((previous) => ({
								...previous,
								mask: mapMask(previous.mask, (cell) => (cell !== 0 ? 0 : 1)),
							}));
						}}
					>
						Invert
					</TextButton>
					<TextButton
						onClick={() => {
							setDraft((previous) => flipBrushHorizontal(previous));
						}}
					>
						Flip H
					</TextButton>
					<TextButton
						onClick={() => {
							setDraft((previous) => rotateBrush(previous));
						}}
					>
						Rotate 90°
					</TextButton>
				</div>
				<TextButton
					disabled={!selection}
					title={
						selection
							? "Capture the current canvas selection as your custom brush"
							: "Make a selection on the canvas first"
					}
					onClick={() => {
						if (captureCustomBrush()) {
							const captured = useEditorStore.getState().customBrush;
							setDraft({
								width: captured.width,
								height: captured.height,
								mask: new Uint8Array(captured.mask),
							});
						}
					}}
				>
					From selection
				</TextButton>
			</div>
		</Modal>
	);
};
