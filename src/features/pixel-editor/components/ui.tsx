import { type ReactNode, useEffect, useId, useRef } from "react";
import type { FunctionComponent } from "../../../common/types";

type IconButtonProps = {
	label: string;
	active?: boolean;
	disabled?: boolean;
	className?: string;
	children: ReactNode;
	onClick: () => void;
};

export const IconButton = ({
	label,
	active = false,
	disabled = false,
	className = "",
	children,
	onClick,
}: IconButtonProps): FunctionComponent => (
	<button
		aria-label={label}
		aria-pressed={active}
		disabled={disabled}
		title={label}
		type="button"
		className={`flex items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
			active
				? "bg-sky-500/90 text-white"
				: "text-zinc-300 hover:bg-zinc-700 hover:text-white"
		} ${className}`}
		onClick={onClick}
	>
		{children}
	</button>
);

type TextButtonProps = {
	children: ReactNode;
	title?: string;
	active?: boolean;
	variant?: "default" | "primary";
	disabled?: boolean;
	onClick: () => void;
};

export const TextButton = ({
	children,
	title,
	active = false,
	variant = "default",
	disabled = false,
	onClick,
}: TextButtonProps): FunctionComponent => {
	let style = "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border-zinc-700";
	if (variant === "primary")
		style = "bg-sky-600 text-white hover:bg-sky-500 border-sky-500";
	if (active) style = "bg-sky-500/90 text-white border-sky-400";
	return (
		<button
			className={`h-7 shrink-0 whitespace-nowrap rounded-md border px-2.5 text-xs font-medium transition-colors disabled:opacity-40 ${style}`}
			disabled={disabled}
			title={title}
			type="button"
			onClick={onClick}
		>
			{children}
		</button>
	);
};

type ToggleProps = { label: string; checked: boolean; onChange: () => void };

export const Toggle = ({
	label,
	checked,
	onChange,
}: ToggleProps): FunctionComponent => (
	<label className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-zinc-300">
		<input
			checked={checked}
			className="h-3.5 w-3.5 accent-sky-500"
			type="checkbox"
			onChange={onChange}
		/>
		{label}
	</label>
);

type ModalProps = {
	title: string;
	wide?: boolean;
	children: ReactNode;
	footer: ReactNode;
	onClose: () => void;
};

export const Modal = ({
	title,
	wide = false,
	children,
	footer,
	onClose,
}: ModalProps): FunctionComponent => {
	const dialogReference = useRef<HTMLDialogElement>(null);
	const pointerStartedOnBackdrop = useRef(false);
	const headingId = useId();

	useEffect(() => {
		const dialog = dialogReference.current;
		if (!dialog) return;
		if (!dialog.open) {
			dialog.showModal();
		}
		return (): void => {
			if (dialog.open) {
				dialog.returnValue = "";
				dialog.close();
			}
		};
	}, []);

	return (
		<dialog
			ref={dialogReference}
			aria-labelledby={headingId}
			className={`editor-modal w-full rounded-xl border border-zinc-700 bg-zinc-900 p-0 text-zinc-100 shadow-2xl ${
				wide ? "max-w-2xl" : "max-w-md"
			}`}
			onCancel={(event): void => {
				event.preventDefault();
				onClose();
			}}
			onClick={(event): void => {
				if (
					event.target === dialogReference.current &&
					pointerStartedOnBackdrop.current
				) {
					onClose();
				}
				pointerStartedOnBackdrop.current = false;
			}}
			onPointerDown={(event): void => {
				pointerStartedOnBackdrop.current =
					event.target === dialogReference.current;
			}}
		>
			<div className="border-b border-zinc-800 px-5 py-3">
				<h2 className="text-sm font-semibold text-zinc-100" id={headingId}>
					{title}
				</h2>
			</div>
			<div className="px-5 py-4 text-sm text-zinc-300">{children}</div>
			<div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-3">
				{footer}
			</div>
		</dialog>
	);
};

export const Divider = (): FunctionComponent => (
	<div className="mx-1 h-5 w-px shrink-0 bg-zinc-700" />
);
