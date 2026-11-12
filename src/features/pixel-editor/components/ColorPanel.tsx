import { useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import type { FunctionComponent } from "../../../common/types";
import { DEFAULT_PALETTE } from "../constants";
import { paletteFromCanvas } from "../lib/files";
import { useEditorStore } from "../store/editorStore";

type Slot = "primary" | "secondary";

const SlotButton = ({
	slot,
	color,
	active,
	onSelect,
}: {
	slot: Slot;
	color: string;
	active: boolean;
	onSelect: (slot: Slot) => void;
}): FunctionComponent => (
	<button
		aria-pressed={active}
		type="button"
		className={`flex flex-1 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
			active
				? "border-sky-500 bg-zinc-800"
				: "border-zinc-700 hover:bg-zinc-800"
		}`}
		onClick={() => {
			onSelect(slot);
		}}
	>
		<span
			className="h-5 w-5 shrink-0 rounded border border-zinc-500"
			style={{ background: color }}
		/>
		<span>
			<span className="block text-[10px] uppercase tracking-wide text-zinc-500">
				{slot === "primary" ? "Left" : "Right"}
			</span>
			<span className="font-mono text-zinc-200">{color}</span>
		</span>
	</button>
);

export const ColorPanel = (): FunctionComponent => {
	const [slot, setSlot] = useState<Slot>("primary");
	const primaryColor = useEditorStore((state) => state.primaryColor);
	const secondaryColor = useEditorStore((state) => state.secondaryColor);
	const setPrimaryColor = useEditorStore((state) => state.setPrimaryColor);
	const setSecondaryColor = useEditorStore((state) => state.setSecondaryColor);
	const swapColors = useEditorStore((state) => state.swapColors);
	const palette = useEditorStore((state) => state.palette);
	const addPaletteColor = useEditorStore((state) => state.addPaletteColor);
	const removePaletteColor = useEditorStore(
		(state) => state.removePaletteColor
	);
	const setPalette = useEditorStore((state) => state.setPalette);

	const color = slot === "primary" ? primaryColor : secondaryColor;
	const setColor = slot === "primary" ? setPrimaryColor : setSecondaryColor;

	return (
		<section className="border-b border-zinc-800 p-3">
			<h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
				Color
			</h2>
			<div className="mb-2 flex gap-1.5">
				<SlotButton
					active={slot === "primary"}
					color={primaryColor}
					slot="primary"
					onSelect={setSlot}
				/>
				<button
					className="px-1 text-zinc-400 hover:text-white"
					title="Swap (X)"
					type="button"
					onClick={swapColors}
				>
					⇄
				</button>
				<SlotButton
					active={slot === "secondary"}
					color={secondaryColor}
					slot="secondary"
					onSelect={setSlot}
				/>
			</div>

			<div className="pixel-color-picker">
				<HexColorPicker color={color} onChange={setColor} />
			</div>
			<div className="mt-2 flex gap-1.5">
				<HexColorInput
					prefixed
					aria-label="Hex color"
					className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-100 outline-none focus:border-sky-500"
					color={color}
					onChange={setColor}
				/>
				<button
					className="shrink-0 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs hover:bg-zinc-700"
					title="Add this color to the palette"
					type="button"
					onClick={() => {
						addPaletteColor(color);
					}}
				>
					+ Add
				</button>
			</div>

			<div className="mt-4 mb-2 flex items-center justify-between">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
					Palette{" "}
					<span className="font-normal text-zinc-600">({palette.length})</span>
				</h2>
				<div className="flex gap-2 text-[11px]">
					<button
						className="text-zinc-400 hover:text-white"
						title="Use the colors already on the canvas"
						type="button"
						onClick={paletteFromCanvas}
					>
						From canvas
					</button>
					<button
						className="text-zinc-400 hover:text-white"
						type="button"
						onClick={() => {
							setPalette(DEFAULT_PALETTE);
						}}
					>
						Reset
					</button>
				</div>
			</div>
			<div className="grid grid-cols-8 gap-1">
				{palette.map((swatch, index) => (
					<div key={swatch} className="group relative">
						<button
							aria-label={`Palette color ${swatch}`}
							style={{ background: swatch }}
							title={`${swatch} — left: primary, right: secondary`}
							type="button"
							className={`block aspect-square w-full rounded-sm border ${
								swatch === primaryColor
									? "border-white ring-1 ring-sky-400"
									: swatch === secondaryColor
										? "border-zinc-300"
										: "border-zinc-700"
							}`}
							onClick={() => {
								setPrimaryColor(swatch);
							}}
							onContextMenu={(event) => {
								event.preventDefault();
								setSecondaryColor(swatch);
							}}
						/>
						<button
							aria-label={`Remove ${swatch}`}
							className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-950 text-[9px] leading-none text-zinc-300 ring-1 ring-zinc-600 hover:bg-red-600 hover:text-white group-hover:flex"
							type="button"
							onClick={() => {
								removePaletteColor(index);
							}}
						>
							×
						</button>
					</div>
				))}
			</div>
		</section>
	);
};
