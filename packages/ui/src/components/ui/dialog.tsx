"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export function DialogOverlay({
	className,
	...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			className={cn(
				"fixed inset-0 z-50 bg-[var(--dialog-effect-primary)] backdrop-blur-[var(--overlay-blur)]",
				className,
			)}
			{...props}
		/>
	);
}

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
	showClose?: boolean;
	overlayClassName?: string;
	placement?: "center" | "bottom-mobile";
};

export function DialogContent({
	className,
	children,
	showClose = true,
	overlayClassName,
	placement = "center",
	...props
}: DialogContentProps) {
	return (
		<DialogPortal>
			<DialogOverlay className={overlayClassName} />
			<DialogPrimitive.Content
				data-slot="dialog-content"
				className={cn(
					"fixed left-1/2 z-50 grid w-[var(--dialog-width)] -translate-x-1/2 gap-4 rounded-[var(--radius-lg)] border border-[var(--card-border,var(--border))] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-dialog)] outline-none md:p-8",
					placement === "center" && "top-1/2 -translate-y-1/2",
					placement === "bottom-mobile" &&
						"bottom-2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2",
					className,
				)}
				{...props}
			>
				{children}
				{showClose ? (
					<DialogPrimitive.Close
						className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-lg bg-[var(--dialog-surface-primary)] text-[var(--text-secondary)] transition duration-[var(--motion-duration-fast)] ease-site hover:bg-[var(--dialog-surface-secondary)] focus-visible:outline focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
						aria-label="Закрыть"
					>
						<X className="size-5" aria-hidden />
					</DialogPrimitive.Close>
				) : null}
			</DialogPrimitive.Content>
		</DialogPortal>
	);
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-header"
			className={cn("grid gap-2 text-center sm:text-left", className)}
			{...props}
		/>
	);
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn(
				"flex flex-col-reverse gap-3 sm:flex-row sm:justify-end",
				className,
			)}
			{...props}
		/>
	);
}

export function DialogTitle({
	className,
	...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn(
				"text-section-small font-semibold text-[var(--text-primary)]",
				className,
			)}
			{...props}
		/>
	);
}

export function DialogDescription({
	className,
	...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn(
				"text-body leading-step-copy text-[var(--dialog-content-primary)]",
				className,
			)}
			{...props}
		/>
	);
}
