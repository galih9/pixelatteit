// The canvas renders strokes straight into an offscreen <canvas> without
// going through React. Other views (like the preview panel) subscribe here
// to mirror it live while a stroke is in progress.

type Listener = (source: HTMLCanvasElement) => void;

const listeners = new Set<Listener>();
let latest: HTMLCanvasElement | null = null;

export function publishFrame(source: HTMLCanvasElement): void {
	latest = source;
	for (const listener of listeners) listener(source);
}

export function subscribeFrames(listener: Listener): () => void {
	listeners.add(listener);
	if (latest) listener(latest);
	return (): void => {
		listeners.delete(listener);
	};
}
