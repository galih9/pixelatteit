import { beforeEach, describe, expect, it } from "vitest";
import {
	colorToHex,
	parseColorInput,
	pixelEditorApi,
	unpackColor,
} from "./pixelEditorApi";

describe("pixelEditorApi", () => {
	beforeEach(() => {
		pixelEditorApi.newCanvas(8, 8);
		pixelEditorApi.clear();
	});

	describe("color parsing and unpacking", () => {
		it("parses hex strings", () => {
			const packedRed = parseColorInput("#ff0000");
			const info = unpackColor(packedRed);
			expect(info.hex).toBe("#ff0000");
			expect(info.red).toBe(255);
			expect(info.green).toBe(0);
			expect(info.blue).toBe(0);
			expect(info.alpha).toBe(255);
			expect(info.isTransparent).toBe(false);
		});

		it("parses rgb and rgba strings", () => {
			const packedGreen = parseColorInput("rgb(0, 255, 0)");
			expect(colorToHex(packedGreen)).toBe("#00ff00");

			const packedBlue = parseColorInput("rgba(0, 0, 255, 1)");
			expect(colorToHex(packedBlue)).toBe("#0000ff");
		});

		it("parses common named colors", () => {
			expect(colorToHex("black")).toBe("#000000");
			expect(colorToHex("white")).toBe("#ffffff");
			expect(colorToHex("yellow")).toBe("#ffff00");
			expect(parseColorInput("transparent")).toBe(0);
		});

		it("parses color objects", () => {
			const packed = parseColorInput({ red: 128, green: 64, blue: 32 });
			const info = unpackColor(packed);
			expect(info.red).toBe(128);
			expect(info.green).toBe(64);
			expect(info.blue).toBe(32);
			expect(info.alpha).toBe(255);
		});
	});

	describe("pixel mutations and reading", () => {
		it("sets and gets a single pixel", () => {
			expect(pixelEditorApi.setPixel(2, 3, "#ff0000")).toBe(true);
			const pixel = pixelEditorApi.getPixel(2, 3);
			expect(pixel?.hex).toBe("#ff0000");
			expect(pixel?.isTransparent).toBe(false);
			expect(pixelEditorApi.getPixelHex(2, 3)).toBe("#ff0000");

			// Out of bounds
			expect(pixelEditorApi.setPixel(99, 99, "#ff0000")).toBe(false);
			expect(pixelEditorApi.getPixel(99, 99)).toBeNull();
			expect(pixelEditorApi.getPixelHex(99, 99)).toBeNull();
		});

		it("batch sets multiple pixels in one undo step", () => {
			const initialCanUndo = pixelEditorApi.canUndo();
			const modified = pixelEditorApi.setPixels([
				{ x: 0, y: 0, color: "#ff0000" },
				{ x: 1, y: 1, color: "#00ff00" },
				{ x: 2, y: 2, color: "#0000ff" },
			]);

			expect(modified).toBe(3);
			expect(pixelEditorApi.getPixelHex(0, 0)).toBe("#ff0000");
			expect(pixelEditorApi.getPixelHex(1, 1)).toBe("#00ff00");
			expect(pixelEditorApi.getPixelHex(2, 2)).toBe("#0000ff");

			// Single undo reverts all 3 pixels
			pixelEditorApi.undo();
			expect(pixelEditorApi.getPixel(0, 0)?.isTransparent).toBe(true);
			expect(pixelEditorApi.getPixel(1, 1)?.isTransparent).toBe(true);
			expect(pixelEditorApi.getPixel(2, 2)?.isTransparent).toBe(true);
			expect(pixelEditorApi.canUndo()).toBe(initialCanUndo);

			// Redo restores all 3
			pixelEditorApi.redo();
			expect(pixelEditorApi.getPixelHex(0, 0)).toBe("#ff0000");
		});

		it("draws lines, rectangles, and circles", () => {
			pixelEditorApi.drawLine(0, 0, 3, 0, "#ff0000");
			for (let x = 0; x <= 3; x++) {
				expect(pixelEditorApi.getPixelHex(x, 0)).toBe("#ff0000");
			}

			pixelEditorApi.drawRect(4, 4, 3, 3, "#00ff00", { filled: true });
			for (let y = 4; y <= 6; y++) {
				for (let x = 4; x <= 6; x++) {
					expect(pixelEditorApi.getPixelHex(x, y)).toBe("#00ff00");
				}
			}

			pixelEditorApi.drawCircle(4, 4, 2, "#0000ff", { filled: true });
			expect(pixelEditorApi.getPixelHex(4, 4)).toBe("#0000ff");
		});

		it("supports flood fill", () => {
			pixelEditorApi.drawRect(0, 0, 4, 4, "#ff0000", { filled: false });
			// Fill inside (1, 1)
			const filled = pixelEditorApi.floodFill(1, 1, "#ffff00");
			expect(filled).toBe(true);
			expect(pixelEditorApi.getPixelHex(1, 1)).toBe("#ffff00");
			expect(pixelEditorApi.getPixelHex(2, 2)).toBe("#ffff00");
			// Border is still red
			expect(pixelEditorApi.getPixelHex(0, 0)).toBe("#ff0000");
		});

		it("loads and reads a 2D color grid", () => {
			const gridInput = [
				["#ff0000", "#00ff00"],
				["#0000ff", null],
			];
			pixelEditorApi.loadGrid(gridInput, 1, 1);

			expect(pixelEditorApi.getPixelHex(1, 1)).toBe("#ff0000");
			expect(pixelEditorApi.getPixelHex(2, 1)).toBe("#00ff00");
			expect(pixelEditorApi.getPixelHex(1, 2)).toBe("#0000ff");
			expect(pixelEditorApi.getPixel(2, 2)?.isTransparent).toBe(true);

			const grid = pixelEditorApi.getGrid();
			expect(grid.length).toBe(8);
			expect(grid[1]?.[1]).toBe("#ff0000");
			expect(grid[1]?.[2]).toBe("#00ff00");
			expect(grid[2]?.[1]).toBe("#0000ff");
			expect(grid[2]?.[2]).toBeNull();
		});

		it("loads and outputs ascii art", () => {
			const art = `
			.##.
			####
			`;
			const count = pixelEditorApi.loadAsciiArt(
				art,
				{ "#": "#ff0000", ".": null },
				2,
				2
			);
			expect(count).toBeGreaterThan(0);
			expect(pixelEditorApi.getPixelHex(3, 2)).toBe("#ff0000");
			expect(pixelEditorApi.getPixelHex(4, 2)).toBe("#ff0000");
			expect(pixelEditorApi.getPixel(2, 2)?.isTransparent).toBe(true);

			const ascii = pixelEditorApi.getAsciiArt({
				transparentChar: ".",
				opaqueChar: "#",
			});
			expect(typeof ascii).toBe("string");
			expect(ascii.includes("#")).toBe(true);
		});
	});

	describe("document and selection controls", () => {
		it("creates a new canvas and reports dimensions", () => {
			pixelEditorApi.newCanvas(16, 24);
			expect(pixelEditorApi.getDimensions()).toEqual({ width: 16, height: 24 });
			expect(pixelEditorApi.getSize()).toEqual({ width: 16, height: 24 });
		});

		it("manages selections", () => {
			pixelEditorApi.newCanvas(8, 8);
			pixelEditorApi.setSelectionRect(1, 1, 3, 3);
			const state = pixelEditorApi.getState();
			expect(state.selection).not.toBeNull();

			pixelEditorApi.deselect();
			expect(pixelEditorApi.getState().selection).toBeNull();
		});

		it("provides layer and frame inspection and controls", () => {
			pixelEditorApi.newCanvas(8, 8);
			const initialLayers = pixelEditorApi.getLayers();
			expect(initialLayers.length).toBeGreaterThanOrEqual(1);
			expect(pixelEditorApi.getActiveLayerIndex()).toBe(0);

			pixelEditorApi.addLayer();
			expect(pixelEditorApi.getLayers().length).toBe(initialLayers.length + 1);

			const initialFrames = pixelEditorApi.getFrames();
			expect(initialFrames.length).toBeGreaterThanOrEqual(1);
			expect(pixelEditorApi.getCurrentFrameIndex()).toBe(0);

			pixelEditorApi.addFrame();
			expect(pixelEditorApi.getFrames().length).toBe(initialFrames.length + 1);
		});

		it("controls animation playback and frame navigation", () => {
			pixelEditorApi.newCanvas(8, 8);
			pixelEditorApi.addFrame();
			pixelEditorApi.addFrame();
			expect(pixelEditorApi.getFrames().length).toBe(3);

			expect(pixelEditorApi.isPlaying()).toBe(false);
			pixelEditorApi.play();
			expect(pixelEditorApi.isPlaying()).toBe(true);
			pixelEditorApi.pause();
			expect(pixelEditorApi.isPlaying()).toBe(false);

			pixelEditorApi.setCurrentFrame(0);
			pixelEditorApi.nextFrame();
			expect(pixelEditorApi.getCurrentFrameIndex()).toBe(1);
			pixelEditorApi.prevFrame();
			expect(pixelEditorApi.getCurrentFrameIndex()).toBe(0);
		});

		it("manages animation frames, durations, and duplication", () => {
			pixelEditorApi.newCanvas(8, 8);
			pixelEditorApi.setPixel(0, 0, "#ff0000");

			pixelEditorApi.duplicateFrame();
			expect(pixelEditorApi.getFrames().length).toBe(2);
			expect(pixelEditorApi.getPixelHex(0, 0)).toBe("#ff0000");

			pixelEditorApi.setFrameDuration(0, 250);
			expect(pixelEditorApi.getFrames()[0]?.duration).toBe(250);

			pixelEditorApi.deleteFrame();
			expect(pixelEditorApi.getFrames().length).toBe(1);
		});

		it("creates, updates, and deletes animation tags", () => {
			pixelEditorApi.newCanvas(8, 8);
			pixelEditorApi.addFrame();
			pixelEditorApi.addFrame();

			const tag = pixelEditorApi.addTag(0, 1, { name: "walk" });
			expect(tag).not.toBeNull();
			expect(tag?.name).toBe("walk");
			expect(pixelEditorApi.getTags().length).toBe(1);

			if (tag) {
				pixelEditorApi.updateTag(tag.id, { name: "run" });
				expect(pixelEditorApi.getTags()[0]?.name).toBe("run");

				pixelEditorApi.setPlayTag(tag.id);
				expect(pixelEditorApi.getPlayTag()).toBe(tag.id);

				pixelEditorApi.deleteTag(tag.id);
				expect(pixelEditorApi.getTags().length).toBe(0);
				expect(pixelEditorApi.getPlayTag()).toBeNull();
			}
		});

		it("supports onion skinning and GIF export generation", () => {
			pixelEditorApi.newCanvas(8, 8);
			expect(pixelEditorApi.isOnionSkinEnabled()).toBe(false);
			pixelEditorApi.toggleOnionSkin();
			expect(pixelEditorApi.isOnionSkinEnabled()).toBe(true);

			pixelEditorApi.setOnionRange(2, 3);
			expect(pixelEditorApi.getOnionRange()).toEqual({ before: 2, after: 3 });

			pixelEditorApi.setPixel(0, 0, "#ff0000");
			pixelEditorApi.addFrame();
			pixelEditorApi.setPixel(1, 1, "#00ff00");

			// Frame pixel reading without switching active frame
			const frame0Buffer = pixelEditorApi.getFramePixels(0);
			expect(frame0Buffer.length).toBe(64);
			const frame0Grid = pixelEditorApi.getFrameGrid(0);
			expect(frame0Grid[0]?.[0]).toBe("#ff0000");

			// GIF data URL generation
			const gifUrl = pixelEditorApi.toGifDataURL({ scale: 1 });
			expect(gifUrl.startsWith("data:image/gif;base64,")).toBe(true);
		});

		it("builds sprite sheets from all frames", () => {
			pixelEditorApi.newCanvas(4, 4);
			pixelEditorApi.setPixel(0, 0, "#ff0000");
			pixelEditorApi.addFrame();
			pixelEditorApi.setPixel(1, 1, "#00ff00");
			pixelEditorApi.addFrame();

			const sheet = pixelEditorApi.getSpriteSheet({
				layout: "columns",
				columns: 2,
				scale: 2,
			});
			expect(sheet).not.toBeNull();
			expect(sheet?.width).toBe(16);
			expect(sheet?.height).toBe(16);
			expect(sheet?.pixels).toHaveLength(256);
			expect(sheet?.metadata.frames).toHaveLength(3);
			expect(sheet?.metadata.frames[1]?.frame).toEqual({
				x: 8,
				y: 0,
				w: 8,
				h: 8,
			});
		});
	});
});
