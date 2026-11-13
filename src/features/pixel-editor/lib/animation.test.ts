import { describe, expect, it } from "vitest";
import type { FrameTag } from "../types";
import {
	clampTags,
	moveItem,
	playSequence,
	sequenceFor,
	tagsAfterDelete,
	tagsAfterInsert,
	tagsAt,
} from "./animation";

const tag = (from: number, to: number, id = 1): FrameTag => ({
	id,
	name: `t${id}`,
	from,
	to,
	color: "#fff",
	direction: "forward",
});

describe("playSequence", () => {
	it("plays forward, reverse and ping-pong", () => {
		expect(playSequence(2, 5, "forward")).toEqual([2, 3, 4, 5]);
		expect(playSequence(2, 5, "reverse")).toEqual([5, 4, 3, 2]);
		expect(playSequence(0, 3, "pingpong")).toEqual([0, 1, 2, 3, 2, 1]);
		expect(playSequence(0, 1, "pingpong")).toEqual([0, 1]);
	});

	it("uses every frame without a tag and clamps tags to the frame count", () => {
		expect(sequenceFor(null, 3)).toEqual([0, 1, 2]);
		expect(sequenceFor(tag(1, 9), 4)).toEqual([1, 2, 3]);
	});
});

describe("tags follow frame edits", () => {
	it("grows a tag when a frame is added at its end", () => {
		expect(tagsAfterInsert([tag(0, 2)], 3)).toEqual([tag(0, 3)]);
	});

	it("shifts tags that start after the new frame", () => {
		expect(tagsAfterInsert([tag(3, 4)], 1)).toEqual([tag(4, 5)]);
		// Inserting right before a tag (after an untagged frame) shifts it.
		expect(tagsAfterInsert([tag(2, 3)], 2)).toEqual([tag(3, 4)]);
	});

	it("shrinks, shifts or drops tags when a frame is deleted", () => {
		expect(tagsAfterDelete([tag(0, 3)], 1)).toEqual([tag(0, 2)]);
		expect(tagsAfterDelete([tag(2, 4)], 0)).toEqual([tag(1, 3)]);
		expect(tagsAfterDelete([tag(2, 2)], 2)).toEqual([]);
		expect(tagsAfterDelete([tag(0, 1)], 5)).toEqual([tag(0, 1)]);
	});

	it("clamps tags to the remaining frames", () => {
		expect(clampTags([tag(1, 8), tag(5, 6, 2)], 3)).toEqual([tag(1, 2)]);
	});

	it("finds the innermost tag first", () => {
		const outer = tag(0, 7, 1);
		const inner = tag(2, 3, 2);
		expect(tagsAt([outer, inner], 2)).toEqual([inner, outer]);
		expect(tagsAt([outer, inner], 6)).toEqual([outer]);
	});
});

describe("moveItem", () => {
	it("moves without mutating", () => {
		const items = ["a", "b", "c", "d"];
		expect(moveItem(items, 0, 2)).toEqual(["b", "c", "a", "d"]);
		expect(moveItem(items, 3, 0)).toEqual(["d", "a", "b", "c"]);
		expect(items).toEqual(["a", "b", "c", "d"]);
	});
});
