import { useEffect } from "react";
import { TOOLS } from "../constants";
import { openFile, saveProject } from "../lib/files";
import { useEditorStore } from "../store/editorStore";

const TOOL_KEYS = new Map(
	TOOLS.map((info) => [info.shortcut.toLowerCase(), info.id])
);

export function useShortcuts(): void {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent): void => {
			const target = event.target;
			if (
				target instanceof HTMLElement &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.tagName === "SELECT")
			) {
				return;
			}
			const state = useEditorStore.getState();
			if (state.dialog) return;
			const key = event.key.toLowerCase();
			const command = event.ctrlKey || event.metaKey;

			if (command) {
				let handled = true;
				if (key === "z" && event.shiftKey) state.redo();
				else if (key === "z") state.undo();
				else if (key === "y") state.redo();
				else if (key === "a") state.selectAll();
				else if (key === "d") state.deselect();
				else if (key === "i" && event.shiftKey) state.invertSelection();
				else if (key === "c") state.copy();
				else if (key === "x") state.cut();
				else if (key === "v") state.paste();
				else if (key === "s") saveProject();
				else if (key === "o") void openFile();
				else if (key === "e") state.openDialog("export");
				else handled = false;
				if (handled) event.preventDefault();
				return;
			}
			if (event.altKey) return;

			const step = event.shiftKey ? 8 : 1;
			switch (event.key) {
				case "ArrowLeft":
				case "ArrowRight":
				case "ArrowUp":
				case "ArrowDown": {
					if (!state.selection && !state.floating) return;
					event.preventDefault();
					const dx =
						event.key === "ArrowLeft"
							? -step
							: event.key === "ArrowRight"
								? step
								: 0;
					const dy =
						event.key === "ArrowUp"
							? -step
							: event.key === "ArrowDown"
								? step
								: 0;
					state.nudge(dx, dy);
					return;
				}
				case "Delete":
				case "Backspace": {
					event.preventDefault();
					state.deleteSelection();
					return;
				}
				case "Escape": {
					state.deselect();
					return;
				}
				case "Enter": {
					state.anchorFloating();
					return;
				}
				case "+":
				case "=": {
					state.zoomStep(1);
					return;
				}
				case "-":
				case "_": {
					state.zoomStep(-1);
					return;
				}
				case "0": {
					state.fitView();
					return;
				}
				case "[": {
					state.setBrushSize(state.brushSize - 1);
					return;
				}
				case "]": {
					state.setBrushSize(state.brushSize + 1);
					return;
				}
				case "#": {
					state.toggleGrid();
					return;
				}
				case "?": {
					state.openDialog("help");
					return;
				}
			}

			if (key === "x") {
				state.swapColors();
				return;
			}
			const tool = TOOL_KEYS.get(key);
			if (tool) state.setTool(tool);
		};
		window.addEventListener("keydown", onKeyDown);
		return (): void => {
			window.removeEventListener("keydown", onKeyDown);
		};
	}, []);
}
