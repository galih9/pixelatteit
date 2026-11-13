import { create } from "zustand";
import type { HexOrientation, TileMapPattern, TileMapType } from "../types";

type TilemapState = {
	/** The sidebar panel is expanded (and rendering). */
	panelOpen: boolean;
	type: TileMapType;
	/** The map is `size` × `size` tiles. */
	size: number;
	pattern: TileMapPattern;
	hexOrientation: HexOrientation;
	/** Isometric ground diamond height, null = half the tile width. */
	isoGroundHeight: number | null;
	showGrid: boolean;
	setPanelOpen: (open: boolean) => void;
	setType: (type: TileMapType) => void;
	setSize: (size: number) => void;
	setPattern: (pattern: TileMapPattern) => void;
	setHexOrientation: (orientation: HexOrientation) => void;
	setIsoGroundHeight: (height: number | null) => void;
	setShowGrid: (show: boolean) => void;
};

/** View settings for the tilemap preview; not part of the document. */
export const useTilemapStore = create<TilemapState>()((set) => ({
	panelOpen: false,
	type: "top-down",
	size: 3,
	pattern: "repeat",
	hexOrientation: "flat",
	isoGroundHeight: null,
	showGrid: false,
	setPanelOpen: (panelOpen): void => {
		set({ panelOpen });
	},
	setType: (type): void => {
		set({ type });
	},
	setSize: (size): void => {
		set({ size });
	},
	setPattern: (pattern): void => {
		set({ pattern });
	},
	setHexOrientation: (hexOrientation): void => {
		set({ hexOrientation });
	},
	setIsoGroundHeight: (isoGroundHeight): void => {
		set({ isoGroundHeight });
	},
	setShowGrid: (showGrid): void => {
		set({ showGrid });
	},
}));
