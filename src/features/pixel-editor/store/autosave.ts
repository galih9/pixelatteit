import { writeAutosave } from "../lib/persistence";
import { useEditorStore, visiblePixels } from "./editorStore";

/** Saves the document to localStorage shortly after every change. */
export function startAutosave(): () => void {
	let timer: number | undefined;
	const unsubscribe = useEditorStore.subscribe((state, previous) => {
		const changed =
			state.pixels !== previous.pixels ||
			state.floating !== previous.floating ||
			state.palette !== previous.palette ||
			state.name !== previous.name ||
			state.primaryColor !== previous.primaryColor ||
			state.secondaryColor !== previous.secondaryColor;
		if (!changed) return;
		window.clearTimeout(timer);
		timer = window.setTimeout(() => {
			const current = useEditorStore.getState();
			writeAutosave({
				name: current.name,
				width: current.width,
				height: current.height,
				pixels: visiblePixels(current),
				palette: current.palette,
				primaryColor: current.primaryColor,
				secondaryColor: current.secondaryColor,
			});
		}, 400);
	});
	return (): void => {
		window.clearTimeout(timer);
		unsubscribe();
	};
}
