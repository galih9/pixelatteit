import { type CSSProperties, useId, useMemo, useRef, useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import type { FunctionComponent } from "../../../common/types";
import { DEFAULT_PALETTE } from "../constants";
import { generateColorRamp } from "../lib/color";
import { paletteFromCanvas } from "../lib/files";
import { BUILT_IN_PALETTES, findMatchingPalette } from "../lib/palettes";
import { useEditorStore } from "../store/editorStore";

type Slot = "primary" | "secondary";

const PRESET_ANCHOR = { anchorName: "--palette-preset-anchor" } as CSSProperties;
const PRESET_POPOVER_POS = {
	positionAnchor: "--palette-preset-anchor",
} as CSSProperties;

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
			className="swatch-preserve h-5 w-5 shrink-0 rounded border border-zinc-400"
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
	const [rampOpen, setRampOpen] = useState(true);
	const [rampOptionsOpen, setRampOptionsOpen] = useState(false);
	const popoverId = useId();
	const popoverReference = useRef<HTMLDivElement>(null);

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
	const colorRampOptions = useEditorStore((state) => state.colorRampOptions);
	const setColorRampOptions = useEditorStore(
		(state) => state.setColorRampOptions
	);
	const stepPrimaryShade = useEditorStore((state) => state.stepPrimaryShade);

	const color = slot === "primary" ? primaryColor : secondaryColor;
	const setColor = slot === "primary" ? setPrimaryColor : setSecondaryColor;
	const activePreset = useMemo(() => findMatchingPalette(palette), [palette]);
	const rampColors = useMemo(
		() => generateColorRamp(color, colorRampOptions),
		[color, colorRampOptions]
	);

	return (
		<section className="border-b border-zinc-800 p-3">
			<div className="mb-2 flex items-center justify-between">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
					Color
				</h2>
				<div className="flex gap-1">
					<button
						className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-700 hover:text-white"
						title="Step primary color one hue-shifted shade darker"
						type="button"
						onClick={() => {
							stepPrimaryShade("shadow");
						}}
					>
						− Shade
					</button>
					<button
						className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-700 hover:text-white"
						title="Step primary color one hue-shifted shade lighter"
						type="button"
						onClick={() => {
							stepPrimaryShade("highlight");
						}}
					>
						+ Light
					</button>
				</div>
			</div>
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

			{/* Hue-shifted color ramp */}
			<div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950/50 p-2">
				<div className="flex items-center justify-between gap-1">
					<button
						aria-expanded={rampOpen}
						className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-200"
						type="button"
						onClick={() => {
							setRampOpen((open) => !open);
						}}
					>
						<span>{rampOpen ? "▾" : "▸"} Color Ramp</span>
					</button>
					<div className="flex items-center gap-1.5 text-[10px]">
						<button
							aria-pressed={rampOptionsOpen}
							className="text-zinc-400 hover:text-white"
							title="Configure hue shift parameters"
							type="button"
							onClick={() => {
								setRampOptionsOpen((open) => !open);
							}}
						>
							Tune
						</button>
						<button
							className="text-sky-400 hover:text-sky-300"
							title="Append generated ramp shades to palette"
							type="button"
							onClick={() => {
								for (const rampColor of rampColors) {
									addPaletteColor(rampColor);
								}
							}}
						>
							+ Palette
						</button>
					</div>
				</div>

				{rampOpen && (
					<>
						<div className="mt-1.5 flex gap-1">
							{rampColors.map((swatch, index) => {
								const isCenter =
									index === Math.floor(rampColors.length / 2);
								return (
									<button
										key={`${index}-${swatch}`}
										aria-label={`Ramp shade ${swatch}`}
										style={{ background: swatch }}
										title={`${swatch} — left: primary, right: secondary`}
										type="button"
										className={`swatch-preserve relative h-5 flex-1 rounded-sm border transition-transform hover:scale-105 ${
											swatch === primaryColor
												? "border-white ring-1 ring-sky-400"
												: isCenter
													? "border-zinc-200"
													: "border-zinc-700"
										}`}
										onClick={() => {
											setPrimaryColor(swatch);
										}}
										onContextMenu={(event) => {
											event.preventDefault();
											setSecondaryColor(swatch);
										}}
									>
										{isCenter && (
											<span className="pointer-events-none absolute inset-x-0 -bottom-0.5 mx-auto block h-1 w-1 rounded-full bg-white shadow" />
										)}
									</button>
								);
							})}
						</div>

						{rampOptionsOpen && (
							<div className="mt-2 space-y-1.5 border-t border-zinc-800 pt-2 text-[11px] text-zinc-400">
								<div className="flex items-center justify-between gap-2">
									<span>Mode</span>
									<div className="flex gap-1">
										{(["smart", "linear"] as const).map((mode) => (
											<button
												key={mode}
												aria-pressed={colorRampOptions.mode === mode}
												type="button"
												className={`rounded px-1.5 py-0.5 text-[10px] capitalize ${
													colorRampOptions.mode === mode
														? "bg-sky-500 text-white"
														: "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
												}`}
												onClick={() => {
													setColorRampOptions({ mode });
												}}
											>
												{mode}
											</button>
										))}
									</div>
								</div>

								<label className="flex items-center justify-between gap-2">
									<span>Steps ({colorRampOptions.steps})</span>
									<input
										className="w-24 accent-sky-500"
										max={9}
										min={3}
										step={2}
										type="range"
										value={colorRampOptions.steps}
										onChange={(event) => {
											setColorRampOptions({
												steps: Number(event.target.value),
											});
										}}
									/>
								</label>

								<label className="flex items-center justify-between gap-2">
									<span>
										Shadow shift ({colorRampOptions.shadowHueShift}°)
									</span>
									<input
										className="w-24 accent-sky-500"
										max={90}
										min={-90}
										step={5}
										type="range"
										value={colorRampOptions.shadowHueShift}
										onChange={(event) => {
											setColorRampOptions({
												shadowHueShift: Number(event.target.value),
											});
										}}
									/>
								</label>

								<label className="flex items-center justify-between gap-2">
									<span>
										Light shift ({colorRampOptions.highlightHueShift}°)
									</span>
									<input
										className="w-24 accent-sky-500"
										max={90}
										min={-90}
										step={5}
										type="range"
										value={colorRampOptions.highlightHueShift}
										onChange={(event) => {
											setColorRampOptions({
												highlightHueShift: Number(event.target.value),
											});
										}}
									/>
								</label>

								<label className="flex items-center justify-between gap-2">
									<span>Saturation ({colorRampOptions.saturationBoost}%)</span>
									<input
										className="w-24 accent-sky-500"
										max={40}
										min={-20}
										step={5}
										type="range"
										value={colorRampOptions.saturationBoost}
										onChange={(event) => {
											setColorRampOptions({
												saturationBoost: Number(event.target.value),
											});
										}}
									/>
								</label>
							</div>
						)}
					</>
				)}
			</div>

			<div className="mt-3 mb-2 flex items-center justify-between gap-1">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
					Palette{" "}
					<span className="font-normal text-zinc-500">({palette.length})</span>
				</h2>
				<div className="flex items-center gap-2 text-[11px]">
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

			{/* Built-in palette selector */}
			<div className="mb-2">
				<button
					className="flex w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-1 text-left text-xs text-zinc-200 hover:bg-zinc-800"
					popoverTarget={popoverId}
					style={PRESET_ANCHOR}
					type="button"
				>
					<span className="truncate">
						{activePreset
							? activePreset.name
							: `Custom Palette (${palette.length})`}
					</span>
					<span className="ml-1 text-[10px] text-zinc-400">Presets ▾</span>
				</button>

				<div
					ref={popoverReference}
					className="editor-popover editor-scrollbar w-64 rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 text-xs text-zinc-200 shadow-2xl"
					id={popoverId}
					popover="auto"
					style={PRESET_POPOVER_POS}
				>
					<div className="mb-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
						Built-in Palettes ({BUILT_IN_PALETTES.length})
					</div>
					<div className="space-y-1">
						{BUILT_IN_PALETTES.map((preset) => {
							const isSelected = activePreset?.id === preset.id;
							return (
								<button
									key={preset.id}
									aria-pressed={isSelected}
									type="button"
									className={`flex w-full flex-col gap-1 rounded px-2 py-1.5 text-left transition-colors ${
										isSelected
											? "bg-sky-500/20 text-white ring-1 ring-sky-500/60"
											: "hover:bg-zinc-800"
									}`}
									onClick={() => {
										setPalette(preset.colors);
										popoverReference.current?.hidePopover();
									}}
								>
									<div className="flex w-full items-center justify-between gap-2">
										<span className="truncate font-medium">
											{isSelected ? "✓ " : ""}
											{preset.name}
										</span>
										<span className="shrink-0 text-[10px] text-zinc-400">
											{preset.colors.length}
										</span>
									</div>
									<div className="flex h-2 w-full overflow-hidden rounded-sm border border-zinc-700">
										{preset.colors.slice(0, 16).map((swatch) => (
											<span
												key={swatch}
												className="swatch-preserve flex-1"
												style={{ background: swatch }}
											/>
										))}
									</div>
								</button>
							);
						})}
					</div>
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
							className={`swatch-preserve block aspect-square w-full rounded-sm border ${
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
