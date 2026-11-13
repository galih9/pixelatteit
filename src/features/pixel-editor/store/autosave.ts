import { writeAutosave } from "../lib/persistence";
import { documentData, useEditorStore } from "./editorStore";

/** Saves the document to localStorage shortly after every change. */
export function startAutosave(): () => void {
	let timer: number | undefined;
	const unsubscribe = useEditorStore.subscribe((state, previous) => {
		const changed =
			state.pixels !== previous.pixels ||
			state.floating !== previous.floating ||
			state.layers !== previous.layers ||
			state.activeLayer !== previous.activeLayer ||
			state.frames !== previous.frames ||
			state.currentFrame !== previous.currentFrame ||
			state.tags !== previous.tags ||
			state.playing !== previous.playing ||
			state.palette !== previous.palette ||
			state.name !== previous.name ||
			state.primaryColor !== previous.primaryColor ||
			state.secondaryColor !== previous.secondaryColor;
		if (!changed) return;
		window.clearTimeout(timer);
		// Playback switches frames many times a second; save once it stops.
		if (state.playing) return;
		timer = window.setTimeout(() => {
			writeAutosave(documentData(useEditorStore.getState()));
		}, 400);
	});
	return (): void => {
		window.clearTimeout(timer);
		unsubscribe();
	};
}
