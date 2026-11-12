import { useEffect, useMemo } from "react";
import type { FunctionComponent } from "../../../common/types";
import { maskBounds } from "../lib/raster";
import { useEditorStore } from "../store/editorStore";

export const StatusBar = (): FunctionComponent => {
	const cursor = useEditorStore((state) => state.cursor);
	const width = useEditorStore((state) => state.width);
	const height = useEditorStore((state) => state.height);
	const zoom = useEditorStore((state) => state.zoom);
	const selection = useEditorStore((state) => state.selection);
	const floating = useEditorStore((state) => state.floating);
	const notice = useEditorStore((state) => state.notice);
	const clearNotice = useEditorStore((state) => state.clearNotice);

	const bounds = useMemo(
		() => (selection ? maskBounds(selection, width, height) : null),
		[selection, width, height]
	);

	useEffect(() => {
		if (!notice) return;
		const timer = window.setTimeout(clearNotice, 3500);
		return (): void => {
			window.clearTimeout(timer);
		};
	}, [notice, clearNotice]);

	return (
		<footer className="flex h-7 shrink-0 items-center gap-4 border-t border-zinc-800 bg-zinc-950 px-3 text-[11px] tabular-nums text-zinc-400">
			<span className="w-20">
				{cursor ? `x ${cursor.x}, y ${cursor.y}` : "—"}
			</span>
			<span>
				Canvas {width}×{height}
			</span>
			<span>Zoom {zoom}×</span>
			{bounds && (
				<span>
					Selection {bounds.width}×{bounds.height}
					{floating ? ` · moved ${floating.offsetX}, ${floating.offsetY}` : ""}
				</span>
			)}
			{notice && (
				<span className="ml-auto text-amber-300">{notice.message}</span>
			)}
			{!notice && (
				<span className="ml-auto text-zinc-600">
					Autosaved locally · works offline
				</span>
			)}
		</footer>
	);
};
