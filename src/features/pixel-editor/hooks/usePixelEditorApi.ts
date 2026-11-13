import { useEffect } from "react";
import { pixelEditorApi } from "../lib/pixelEditorApi";
import type { PixelEditorApi } from "../types";

/**
 * React hook that exposes the PixelEditorApi on `window.pixelEditor`
 * and returns the API object for direct use in React components.
 */
export function usePixelEditorApi(): PixelEditorApi {
	useEffect(() => {
		if (typeof window !== "undefined") {
			window.pixelEditor = pixelEditorApi;
		}
		return (): void => {
			if (typeof window !== "undefined") {
				delete window.pixelEditor;
			}
		};
	}, []);

	return pixelEditorApi;
}
