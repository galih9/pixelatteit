import type { FunctionComponent } from "../../../common/types";
import { TOOLS } from "../constants";
import { useEditorStore } from "../store/editorStore";
import { ToolIcon } from "./ToolIcon";
import { IconButton } from "./ui";

// Visual groups: drawing, shapes, selection, navigation
const GROUP_BREAKS = new Set(["line", "select-rect", "move"]);

export const Toolbar = (): FunctionComponent => {
	const tool = useEditorStore((state) => state.tool);
	const setTool = useEditorStore((state) => state.setTool);
	const primaryColor = useEditorStore((state) => state.primaryColor);
	const secondaryColor = useEditorStore((state) => state.secondaryColor);
	const swapColors = useEditorStore((state) => state.swapColors);

	return (
		<nav
			aria-label="Tools"
			className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-zinc-800 bg-zinc-900 py-2"
		>
			{TOOLS.map((info) => (
				<div key={info.id} className="flex flex-col items-center">
					{GROUP_BREAKS.has(info.id) && (
						<div className="my-1 h-px w-7 bg-zinc-700" />
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
				</div>
			))}
			<div className="mt-auto flex flex-col items-center gap-1 pt-2">
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
	);
};
