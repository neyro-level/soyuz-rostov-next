"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/utils";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
	className,
	...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
	return (
		<AccordionPrimitive.Item
			data-slot="accordion-item"
			className={cn("border-b border-[var(--border)]", className)}
			{...props}
		/>
	);
}

export function AccordionTrigger({
	className,
	children,
	trailing,
	...props
}: ComponentProps<typeof AccordionPrimitive.Trigger> & {
	trailing?: ReactNode;
}) {
	return (
		<AccordionPrimitive.Header className="flex">
			<AccordionPrimitive.Trigger
				data-slot="accordion-trigger"
				className={cn(
					"group/accordion flex flex-1 items-center justify-between gap-4 py-4 text-left text-body font-semibold text-[var(--text-primary)] transition duration-[var(--motion-duration-fast)] ease-site hover:text-[var(--accent)]",
					className,
				)}
				{...props}
			>
				{children}
				{trailing ?? (
					<ChevronDown
						className="size-4 shrink-0 transition duration-[var(--motion-duration-fast)] ease-site group-data-[state=open]/accordion:rotate-180"
						aria-hidden
					/>
				)}
			</AccordionPrimitive.Trigger>
		</AccordionPrimitive.Header>
	);
}

export function AccordionContent({
	className,
	children,
	...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
	return (
		<AccordionPrimitive.Content
			data-slot="accordion-content"
			className="overflow-hidden text-body text-[var(--accordion-content-primary)]"
			{...props}
		>
			<div className={cn("pb-4 pt-0 leading-step-copy", className)}>
				{children}
			</div>
		</AccordionPrimitive.Content>
	);
}
