import { useEffect, useRef } from "react";
import type { FunctionComponent } from "../../../common/types";
import { subscribeFrames } from "../lib/liveView";
import { useEditorStore } from "../store/editorStore";

const BOX = 176;

export const PreviewPanel = (): FunctionComponent => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const width = useEditorStore((state) => state.width);
	const height = useEditorStore((state) => state.height);
	const scale = Math.max(1, Math.floor(BOX / Math.max(width, height)));

	useEffect(() => {
		return subscribeFrames((source) => {
			const canvas = canvasRef.current;
			const context = canvas?.getContext("2d");
			if (!canvas || !context) return;
			if (canvas.width !== source.width || canvas.height !== source.height) {
				canvas.width = source.width;
				canvas.height = source.height;
			}
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.drawImage(source, 0, 0);
		});
	}, [width, height]);

	return (
		<section className="p-3">
			<h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
				Preview
			</h2>
			<div className="flex flex-wrap items-end gap-3">
				<div className="preview-checker flex items-center justify-center rounded border border-zinc-700 p-1">
					<canvas
						ref={canvasRef}
						style={{
							width: width * scale,
							height: height * scale,
							imageRendering: "pixelated",
						}}
					/>
				</div>
				{scale > 1 && (
					<div
						className="preview-checker rounded border border-zinc-700 p-1"
						title="Actual size"
					>
						<canvas
							ref={(element) => {
								if (!element) return;
								return subscribeFrames((source) => {
									const context = element.getContext("2d");
									if (!context) return;
									if (
										element.width !== source.width ||
										element.height !== source.height
									) {
										element.width = source.width;
										element.height = source.height;
									}
									context.clearRect(0, 0, element.width, element.height);
									context.drawImage(source, 0, 0);
								});
							}}
							style={{ width, height, imageRendering: "pixelated" }}
						/>
					</div>
				)}
			</div>
			<p className="mt-2 text-[11px] text-zinc-500">
				{width}×{height}px ·{" "}
				{scale > 1 ? `preview ${scale}× and 1×` : "actual size"}
			</p>
		</section>
	);
};
