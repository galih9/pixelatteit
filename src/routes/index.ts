import { createFileRoute } from "@tanstack/react-router";
import { Editor } from "../pages/Editor";

export const Route = createFileRoute("/")({
	component: Editor,
});
