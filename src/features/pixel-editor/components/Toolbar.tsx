import {
	Fragment,
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	useState,
} from "react";
import type { FunctionComponent } from "../../../common/types";
import { TOOLS } from "../constants";
import { useEditorStore } from "../store/editorStore";
import { ToolIcon } from "./ToolIcon";
import { IconButton } from "./ui";

// Visual groups: drawing, shapes, selection, navigation
const GROUP_BREAKS = new Set(["line", "select-rect", "move"]);

const DEFAULT_TOOLBAR_WIDTH = 52;
const MIN_TOOLBAR_WIDTH = 48;
const MAX_TOOLBAR_WIDTH = 220;
const KEYBOARD_RESIZE_STEP = 12;

const clampToolbarWidth = (value: number): number =>
	Math.min(MAX_TOOLBAR_WIDTH, Math.max(MIN_TOOLBAR_WIDTH, Math.round(value)));

export const Toolbar = (): FunctionComponent => {
	const tool = useEditorStore((state) => state.tool);
	const setTool = useEditorStore((state) => state.setTool);
	const primaryColor = useEditorStore((state) => state.primaryColor);
	const secondaryColor = useEditorStore((state) => state.secondaryColor);
	const swapColors = useEditorStore((state) => state.swapColors);

	const [width, setWidth] = useState(DEFAULT_TOOLBAR_WIDTH);
	const [isResizing, setIsResizing] = useState(false);

	const handleResizePointerDown = (
		event: ReactPointerEvent<HTMLDivElement>,
	): void => {
		event.preventDefault();
		const startX = event.clientX;
		const startWidth = width;
		setIsResizing(true);

		const onPointerMove = (moveEvent: PointerEvent): void => {
			setWidth(clampToolbarWidth(startWidth + (moveEvent.clientX - startX)));
		};

		const onPointerUp = (): void => {
			setIsResizing(false);
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
			window.removeEventListener("pointercancel", onPointerUp);
		};

		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
		window.addEventListener("pointercancel", onPointerUp);
	};

	const handleResizeKeyDown = (
		event: ReactKeyboardEvent<HTMLDivElement>,
	): void => {
		if (event.key === "ArrowRight") {
			event.preventDefault();
			setWidth((current) => clampToolbarWidth(current + KEYBOARD_RESIZE_STEP));
		} else if (event.key === "ArrowLeft") {
			event.preventDefault();
			setWidth((current) => clampToolbarWidth(current - KEYBOARD_RESIZE_STEP));
		} else if (event.key === "Home") {
			event.preventDefault();
			setWidth(DEFAULT_TOOLBAR_WIDTH);
		}
	};

	return (
		<div className="flex shrink-0 bg-zinc-900">
			<nav
				aria-label="Tools"
				className="editor-scrollbar flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-1 py-2"
				style={{ width }}
			>
				<div className="grid grid-cols-[repeat(auto-fill,36px)] justify-center gap-1">
					{TOOLS.map((info) => (
						<Fragment key={info.id}>
							{GROUP_BREAKS.has(info.id) && (
								<div className="col-span-full my-1 h-px bg-zinc-700" />
							)}
							<IconButton
								active={tool === info.id}
								className="h-9 w-9"
								label={`${info.label} (${info.shortcut})`}
								onClick={() => {
									setTool(info.id);
								}}
							>
								<ToolIcon className="h-5 w-5" tool={info.id} />
							</IconButton>
						</Fragment>
					))}
				</div>
				<div className="mt-auto flex flex-col items-center gap-1 pt-3">
					<div className="relative h-9 w-9">
						<div
							className="absolute bottom-0 right-0 h-6 w-6 rounded border border-zinc-500"
							style={{ background: secondaryColor }}
							title="Secondary color (right click)"
						/>
						<div
							className="absolute left-0 top-0 h-6 w-6 rounded border border-zinc-300 shadow"
							style={{ background: primaryColor }}
							title="Primary color (left click)"
						/>
					</div>
					<button
						className="text-[10px] text-zinc-400 hover:text-white"
						title="Swap colors (X)"
						type="button"
						onClick={swapColors}
					>
						⇄ swap
					</button>
				</div>
			</nav>
			<div
				aria-label="Resize toolbar"
				aria-orientation="vertical"
				aria-valuemax={MAX_TOOLBAR_WIDTH}
				aria-valuemin={MIN_TOOLBAR_WIDTH}
				aria-valuenow={width}
				role="separator"
				tabIndex={0}
				title="Drag to resize toolbar (double-click to reset)"
				className={`group relative w-1.5 shrink-0 cursor-col-resize touch-none select-none transition-colors hover:bg-sky-500/35 focus-visible:bg-sky-500/50 focus-visible:outline-none ${
					isResizing ? "bg-sky-500/50" : ""
				}`}
				onKeyDown={handleResizeKeyDown}
				onPointerDown={handleResizePointerDown}
				onDoubleClick={() => {
					setWidth(DEFAULT_TOOLBAR_WIDTH);
				}}
			>
				<div
					className={`pointer-events-none absolute inset-y-0 left-0 w-px transition-colors group-hover:bg-sky-400 group-focus-visible:bg-sky-400 ${
						isResizing ? "bg-sky-400" : "bg-zinc-800"
					}`}
				/>
			</div>
		</div>
	);
};
