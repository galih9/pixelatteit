import { useEffect } from "react";
import type { FunctionComponent } from "../../common/types";
import { ColorPanel } from "./components/ColorPanel";
import { Dialogs } from "./components/Dialogs";
import { LayersPanel } from "./components/LayersPanel";
import { PixelCanvas } from "./components/PixelCanvas";
import { PreviewPanel } from "./components/PreviewPanel";
import { StatusBar } from "./components/StatusBar";
import { Timeline } from "./components/Timeline";
import { Toolbar } from "./components/Toolbar";
import { ToolOptions } from "./components/ToolOptions";
import { TopBar } from "./components/TopBar";
import { useShortcuts } from "./hooks/useShortcuts";
import { startAutosave } from "./store/autosave";
import "./pixel-editor.css";

export const PixelEditor = (): FunctionComponent => {
	useShortcuts();
	useEffect(() => startAutosave(), []);

	return (
		<div className="flex h-screen w-screen select-none flex-col overflow-hidden bg-zinc-900 text-zinc-200">
			<TopBar />
			<ToolOptions />
			<div className="flex min-h-0 flex-1">
				<Toolbar />
				<main className="canvas-backdrop relative min-w-0 flex-1">
					<PixelCanvas />
				</main>
				<aside className="w-64 shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-900">
					<ColorPanel />
					<LayersPanel />
					<PreviewPanel />
				</aside>
			</div>
			<Timeline />
			<StatusBar />
			<Dialogs />
		</div>
	);
};
