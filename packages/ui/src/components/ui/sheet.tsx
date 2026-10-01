"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

export function SheetOverlay({
	className,
	...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="sheet-overlay"
			className={cn(
				"fixed inset-0 z-50 bg-[var(--sheet-effect-primary)] backdrop-blur-[var(--overlay-blur)]",
				className,
			)}
			{...props}
		/>
	);
}

const sheetVariants = cva(
	"fixed z-50 grid gap-4 bg-[var(--surface-card)] p-6 shadow-[var(--sheet-shadow-primary)] transition duration-[var(--motion-duration-standard)] ease-site-balanced sm:p-8",
	{
		variants: {
			side: {
				top: "inset-x-0 top-0 border-b border-[var(--border)]",
				bottom: "inset-x-0 bottom-0 border-t border-[var(--border)]",
				left: "inset-y-0 left-0 h-full w-[var(--container-overlay)] border-r border-[var(--border)]",
				right:
					"inset-y-0 right-0 h-full w-[var(--container-overlay)] border-l border-[var(--border)]",
			},
		},
		defaultVariants: {
			side: "right",
		},
	},
);

export function SheetContent({
	side = "right",
	className,
	children,
	showClose = true,
	...props
}: ComponentProps<typeof DialogPrimitive.Content> &
	VariantProps<typeof sheetVariants> & { showClose?: boolean }) {
	return (
		<SheetPortal>
			<SheetOverlay />
			<DialogPrimitive.Content
				data-slot="sheet-content"
				className={cn(sheetVariants({ side }), className)}
				{...props}
			>
				{children}
				{showClose ? (
					<DialogPrimitive.Close
						className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-lg bg-[var(--sheet-surface-primary)] text-[var(--text-secondary)] transition duration-[var(--motion-duration-fast)] ease-site hover:bg-[var(--sheet-surface-secondary)] focus-visible:outline focus-visible:outline-[length:var(--focus-ring-width)] focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
						aria-label="Закрыть"
					>
						<X className="size-5" aria-hidden />
					</DialogPrimitive.Close>
				) : null}
			</DialogPrimitive.Content>
		</SheetPortal>
	);
}

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-header"
			className={cn("grid gap-2 text-left", className)}
			{...props}
		/>
	);
}

export function SheetFooter({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn("mt-auto flex flex-col gap-3", className)}
			{...props}
		/>
	);
}

export function SheetTitle({
	className,
	...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="sheet-title"
			className={cn(
				"text-heading-small font-semibold text-[var(--text-primary)]",
				className,
			)}
			{...props}
		/>
	);
}

export function SheetDescription({
	className,
	...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="sheet-description"
			className={cn(
				"text-body leading-step-copy text-[var(--sheet-content-primary)]",
				className,
			)}
			{...props}
		/>
	);
}
